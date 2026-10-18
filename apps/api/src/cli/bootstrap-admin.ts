import 'reflect-metadata';
import { input, password } from '@inquirer/prompts';
import AppDataSource from '../database/data-source';
import { createInitialAdmin, validateInitialAdminInput } from './admin-bootstrap';

async function bootstrap(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Admin bootstrap requires an interactive terminal so the password can be entered securely.');
  }

  const username = await input({
    message: 'Admin username',
    validate(value) {
      try {
        validateInitialAdminInput(value, 'temporary-valid-password');
        return true;
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid username.';
      }
    },
  });
  const adminPassword = await password({
    message: 'Admin password (hidden; minimum 12 bytes)',
    mask: '*',
    validate(value) {
      try {
        validateInitialAdminInput(username, value);
        return true;
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid password.';
      }
    },
  });
  const confirmation = await password({ message: 'Confirm admin password', mask: '*' });
  if (adminPassword !== confirmation) throw new Error('Password confirmation did not match.');

  await AppDataSource.initialize();
  try {
    const admin = await createInitialAdmin(AppDataSource, username, adminPassword);
    console.log(`Initial Admin account created for username "${admin.username}".`);
  } finally {
    await AppDataSource.destroy();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Admin bootstrap failed.');
  process.exitCode = 1;
});
