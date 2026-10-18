import { DataSource, EntityManager } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { hashPassword } from '../security/password-hasher';
import { validatePassword, validateUsername } from '../security/username';

export { normalizeUsername } from '../security/username';

const ADMIN_BOOTSTRAP_LOCK = 'customer-support-initial-admin-bootstrap';

export function validateInitialAdminInput(username: string, password: string): string {
  const normalizedUsername = validateUsername(username);
  validatePassword(password);
  return normalizedUsername;
}

export async function createInitialAdmin(
  dataSource: DataSource,
  username: string,
  password: string,
  passwordHasher = hashPassword,
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
      passwordHash: await passwordHasher(password),
      role: UserRole.ADMIN,
      isActive: true,
    });
    return users.save(admin);
  });
}
