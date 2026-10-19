const { constants } = require('node:fs');
const { copyFile, access } = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

function defaultCommandRunner(command, args, rootDir) {
  return spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
}

async function ensureLocalEnvironment(rootDir) {
  const envPath = join(rootDir, '.env');
  try {
    await access(envPath);
    return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const templatePath = join(rootDir, '.env.example');
  try {
    await copyFile(templatePath, envPath, constants.COPYFILE_EXCL);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}

async function runLocalSetup({ rootDir = process.cwd(), runCommand = defaultCommandRunner } = {}) {
  const copied = await ensureLocalEnvironment(rootDir);
  console.log(copied ? 'Created ignored .env from .env.example.' : 'Using existing local .env.');

  const commands = [
    ['docker', ['compose', 'up', '-d', 'postgres']],
    ['npm', ['run', 'db:create']],
    ['npm', ['run', 'db:migrate']],
    ['npm', ['run', 'db:seed:local']],
  ];

  for (const [command, args] of commands) {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const result = runCommand(command, args, rootDir);
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Local setup stopped after command failed: ${command} ${args.join(' ')}`);
  }
}

module.exports = { ensureLocalEnvironment, runLocalSetup };

if (require.main === module) {
  runLocalSetup().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Local database setup failed.');
    process.exitCode = 1;
  });
}
