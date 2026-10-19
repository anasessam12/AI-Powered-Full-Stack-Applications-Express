const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const args = process.argv.slice(2);
const project = args[0] === 'api' ? args.shift() : null;
const nxCli = resolve(__dirname, '../node_modules/nx/dist/bin/nx.js');
const nodeOptions = [process.env.NODE_OPTIONS, '--experimental-vm-modules'].filter(Boolean).join(' ');
const nxArgs = project ? ['test', project, ...args] : ['run-many', '-t', 'test', ...args];
const result = spawnSync(process.execPath, [nxCli, ...nxArgs], {
  stdio: 'inherit',
  // Keep ignored developer .env values out of tests unless explicitly exported in the shell.
  env: { ...process.env, NODE_OPTIONS: nodeOptions, DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH || resolve(__dirname, 'test.env') },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
