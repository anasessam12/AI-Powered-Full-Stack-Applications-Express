import * as argon2 from 'argon2';
import { DataSource, EntityManager } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';

const ADMIN_BOOTSTRAP_LOCK = 'customer-support-initial-admin-bootstrap';

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateInitialAdminInput(username: string, password: string): string {
  const normalizedUsername = normalizeUsername(username);
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalizedUsername)) {
    throw new Error('Username must be 3–64 characters: letters, numbers, dot, underscore, or hyphen.');
  }
  if (Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 1024) {
    throw new Error('Password must contain between 12 and 1024 UTF-8 bytes.');
  }
  return normalizedUsername;
}

export async function createInitialAdmin(
  dataSource: DataSource,
  username: string,
  password: string,
  hashPassword = (value: string) =>
    argon2.hash(value, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
    }),
): Promise<User> {
  const normalizedUsername = validateInitialAdminInput(username, password);

  return dataSource.transaction(async (manager: EntityManager) => {
    // Serialize concurrent first-run commands before checking for an existing Admin.
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [ADMIN_BOOTSTRAP_LOCK]);
    const users = manager.getRepository(User);
    const existingAdmin = await users.findOneBy({ role: UserRole.ADMIN });
    if (existingAdmin) {
      throw new Error('An Admin account already exists; initial Admin bootstrap is one-time only.');
    }

    const admin = users.create({
      username: username.trim(),
      normalizedUsername,
      passwordHash: await hashPassword(password),
      role: UserRole.ADMIN,
      isActive: true,
    });
    return users.save(admin);
  });
}
