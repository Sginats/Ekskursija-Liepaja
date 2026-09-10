import { existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const roots = [['root', '.'], ['client', 'client'], ['game', 'game']];

for (const [name, cwd] of roots) {
  const result = spawnSync(npm, ['install'], { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`Dependency installation failed in ${name}.`);
    process.exit(result.status || 1);
  }
}

if (!existsSync('game/.env.local') && existsSync('game/.env.example')) {
  copyFileSync('game/.env.example', 'game/.env.local');
  console.log('Created game/.env.local from the example. Fill in deployment values locally.');
}

console.log('Setup complete. Run npm run dev for Node and npm --prefix game run dev for the game.');
