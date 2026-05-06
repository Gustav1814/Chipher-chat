/**
 * Copy apps/web/dist → apps/server/client for same-origin production deploy.
 * Cross-platform (Node 18+). Run after `npm run build` in apps/web.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'apps', 'web', 'dist');
const client = path.join(root, 'apps', 'server', 'client');

if (!fs.existsSync(dist)) {
  console.error('Missing apps/web/dist. Run: cd apps/web && npm ci && npm run build');
  process.exit(1);
}

fs.rmSync(client, { recursive: true, force: true });
fs.mkdirSync(client, { recursive: true });

function copyRecursive(src, dest) {
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      copyRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

copyRecursive(dist, client);
console.log('Staged frontend → apps/server/client');
