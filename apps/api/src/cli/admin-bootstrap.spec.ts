import { DataSource, EntityManager } from 'typeorm';
import * as argon2 from 'argon2';
import { User, UserRole } from '../database/entities/user.entity';
import { createInitialAdmin, normalizeUsername, validateInitialAdminInput } from './admin-bootstrap';

describe('initial Admin bootstrap', () => {
  it('normalizes username and stores only an adaptive hash in a serialized transaction', async () => {
    const admin = { id: 'user-id' } as User;
    const query = jest.fn();
    const findOneBy = jest.fn().mockResolvedValue(null);
    const create = jest.fn((value: Partial<User>) => value as User);
    const save = jest.fn().mockResolvedValue(admin);
    const manager = {
      query,
      getRepository: jest.fn().mockReturnValue({ findOneBy, create, save }),
    } as unknown as EntityManager;
    const transaction = jest.fn(async (callback: (value: EntityManager) => Promise<User>) => callback(manager));
    const dataSource = { transaction } as unknown as DataSource;
    const hashPassword = jest.fn().mockResolvedValue('$argon2id$encoded-hash');

    await expect(createInitialAdmin(dataSource, '  Support.Admin ', 'a-long-unique-password', hashPassword)).resolves.toBe(admin);

    expect(normalizeUsername('  Support.Admin ')).toBe('support.admin');
    expect(query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock(hashtext($1))', [
      'customer-support-initial-admin-bootstrap',
    ]);
    expect(hashPassword).toHaveBeenCalledWith('a-long-unique-password');
    expect(create).toHaveBeenCalledWith({
      username: 'Support.Admin',
      normalizedUsername: 'support.admin',
      passwordHash: '$argon2id$encoded-hash',
      role: UserRole.ADMIN,
      isActive: true,
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('refuses a second Admin before hashing or saving credentials', async () => {
    const hashPassword = jest.fn();
    const save = jest.fn();
    const manager = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        findOneBy: jest.fn().mockResolvedValue({ id: 'existing-admin' }),
        create: jest.fn(),
        save,
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (callback: (value: EntityManager) => Promise<User>) => callback(manager)),
    } as unknown as DataSource;

    await expect(createInitialAdmin(dataSource, 'second.admin', 'a-long-unique-password', hashPassword)).rejects.toThrow(
      'An Admin account already exists',
    );
    expect(hashPassword).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects weak passwords and unsupported usernames', () => {
    expect(() => validateInitialAdminInput('ok.user', 'short')).toThrow('Password must contain');
    expect(() => validateInitialAdminInput('../bad', 'a-long-unique-password')).toThrow('Username must be');
  });

  it('uses Argon2id when no test hasher is supplied', async () => {
    const createdUsers: User[] = [];
    const manager = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue({
        findOneBy: jest.fn().mockResolvedValue(null),
        create: jest.fn((value: User) => value),
        save: jest.fn(async (user: User) => {
          createdUsers.push(user);
          return user;
        }),
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (callback: (value: EntityManager) => Promise<User>) => callback(manager)),
    } as unknown as DataSource;

    await createInitialAdmin(dataSource, 'hash.test', 'another-long-password');

    expect(createdUsers[0].passwordHash).toMatch(/^\$argon2id\$/);
    await expect(argon2.verify(createdUsers[0].passwordHash, 'another-long-password')).resolves.toBe(true);
    await expect(argon2.verify(createdUsers[0].passwordHash, 'wrong-password')).resolves.toBe(false);
  });
});
