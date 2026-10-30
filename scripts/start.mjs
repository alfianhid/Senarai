// Starts the production server from the standalone build.
// `next start` cannot serve `output: 'standalone'`, and the standalone folder
// does not include .next/static or public, so those are copied first.
// Usage: npm start   (after `npm run build`)
import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const standalone = join(root, '.next', 'standalone');

if (!existsSync(join(standalone, 'server.js'))) {
  console.error('No standalone build found. Run `npm run build` first.');
  process.exit(1);
}

const copies = [
  [join(root, '.next', 'static'), join(standalone, '.next', 'static')],
  [join(root, 'public'), join(standalone, 'public')],
  [join(root, 'data'), join(standalone, 'data')],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) continue;
  cpSync(from, to, { recursive: true });
  console.log(`copied ${from.replace(root, '.')} -> ${to.replace(root, '.')}`);
}

const port = process.env.PORT ?? '3000';
console.log(`starting standalone server on http://localhost:${port}`);

const child = spawn(process.execPath, ['server.js'], {
  cwd: standalone,
  stdio: 'inherit',
  env: { ...process.env, PORT: port, HOSTNAME: process.env.HOSTNAME ?? '127.0.0.1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
