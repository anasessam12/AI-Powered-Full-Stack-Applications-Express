const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const args = process.argv.slice(2);
const project = args[0] === 'api' ? args.shift() : null;
const nxCli = resolve(__dirname, '../node_modules/nx/dist/bin/nx.js');
const nodeOptions = [process.env.NODE_OPTIONS, '--experimental-vm-modules'].filter(Boolean).join(' ');
const nxArgs = project ? ['test', project, ...args] : ['run-many', '-t', 'test', ...args];
const result = spawnSync(process.execPath, [nxCli, ...nxArgs], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
