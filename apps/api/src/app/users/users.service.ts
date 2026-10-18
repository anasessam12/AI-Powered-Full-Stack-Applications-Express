import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserContract } from '@customer-support/api-contract';
import { User, UserRole } from '../../database/entities/user.entity';
import { hashPassword } from '../../security/password-hasher';
import { validatePassword, validateUsername } from '../../security/username';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ADMIN_MUTATION_LOCK = 'customer-support-active-admin-safety';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('AdminAudit');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async list(): Promise<UserContract[]> {
    const users = await this.users.find({ order: { normalizedUsername: 'ASC' } });
    return users.map((user) => this.toSafeUser(user));
  }

  async create(dto: CreateUserDto, actorUserId: string): Promise<UserContract> {
    const normalizedUsername = validateUsername(dto.username);
    validatePassword(dto.password);
    const user = this.users.create({
      username: dto.username.trim(),
      normalizedUsername,
      passwordHash: await hashPassword(dto.password),
      role: dto.role,
      isActive: true,
    });

    try {
      const created = await this.users.save(user);
      this.audit('admin.user.created', actorUserId, created.id, { role: created.role });
      return this.toSafeUser(created);
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('A user with that username already exists.');
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actorUserId: string): Promise<UserContract> {
    if (dto.role === undefined && dto.isActive === undefined) {
      throw new ConflictException('At least one of role or isActive must be provided.');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [ADMIN_MUTATION_LOCK]);
      const repository = manager.getRepository(User);
      const user = await repository.findOneBy({ id });
      if (!user) throw new NotFoundException('User not found.');

      const willRemoveActiveAdmin =
        user.role === UserRole.ADMIN &&
        user.isActive &&
        ((dto.role !== undefined && dto.role !== UserRole.ADMIN) || dto.isActive === false);
      if (willRemoveActiveAdmin) {
        const activeAdmins = await repository.countBy({ role: UserRole.ADMIN, isActive: true });
        if (activeAdmins <= 1) throw new ConflictException('At least one active Admin account must remain.');
      }

      if (dto.role !== undefined) user.role = dto.role;
      if (dto.isActive !== undefined) user.isActive = dto.isActive;
      const updated = await repository.save(user);
      this.audit('admin.user.updated', actorUserId, updated.id, {
        roleChanged: dto.role !== undefined,
        activationChanged: dto.isActive !== undefined,
      });
      return this.toSafeUser(updated);
    });
  }

  private toSafeUser(user: User): UserContract {
    return {
      id: user.id,
      username: user.username,
      normalizedUsername: user.normalizedUsername,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private isUniqueViolation(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }

  private audit(event: string, actorUserId: string, targetUserId: string, detail: Record<string, unknown>): void {
    this.logger.log(JSON.stringify({ event, actorUserId, targetUserId, ...detail }));
  }
}
