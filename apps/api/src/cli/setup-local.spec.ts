import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The API-project test exercises a root-level workspace orchestration script.
// eslint-disable-next-line @nx/enforce-module-boundaries
const { runLocalSetup } = require('../../../../scripts/database/setup-local.cjs') as {
  runLocalSetup(options: { rootDir: string; runCommand: (command: string, args: string[]) => { status: number } }): Promise<void>;
};

describe('local database setup orchestration', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'team-workspace-setup-'));
    await writeFile(join(rootDir, '.env.example'), 'DATABASE_URL=template\n');
  });

  afterEach(async () => rm(rootDir, { recursive: true, force: true }));

  it('does not overwrite an existing local environment file', async () => {
    await writeFile(join(rootDir, '.env'), 'DATABASE_URL=existing\n');
    await runLocalSetup({ rootDir, runCommand: () => ({ status: 0 }) });
    await expect(readFile(join(rootDir, '.env'), 'utf8')).resolves.toBe('DATABASE_URL=existing\n');
  });

  it('copies the environment template when no local file exists', async () => {
    await runLocalSetup({ rootDir, runCommand: () => ({ status: 0 }) });
    await expect(readFile(join(rootDir, '.env'), 'utf8')).resolves.toBe('DATABASE_URL=template\n');
  });

  it('stops the setup sequence on the first database command failure', async () => {
    const commands: string[] = [];
    await expect(runLocalSetup({
      rootDir,
      runCommand(command, args) {
        commands.push(`${command} ${args.join(' ')}`);
        return { status: commands.length === 2 ? 1 : 0 };
      },
    })).rejects.toThrow(/db:create/);
    expect(commands).toEqual(['docker compose up -d postgres', 'npm run db:create']);
  });

  it.each([
    [3, 'db:migrate'],
    [4, 'db:seed:local'],
  ])('stops at %s when %s fails', async (failedIndex, failedCommand) => {
    const commands: string[] = [];
    await expect(runLocalSetup({
      rootDir,
      runCommand(command, args) {
        commands.push(`${command} ${args.join(' ')}`);
        return { status: commands.length === failedIndex ? 1 : 0 };
      },
    })).rejects.toThrow(failedCommand);
    expect(commands).toHaveLength(failedIndex);
  });
});
