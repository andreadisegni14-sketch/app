// Local web server for the organizer.
//   - Serves the browser UI (public/) and the shared planning modules (lib/).
//   - Exposes GET /api/developer-token, signed with your MusicKit key.
// It listens on 127.0.0.1 only and never handles Apple ID credentials:
// sign-in happens on Apple's own MusicKit consent page.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDeveloperToken } from './lib/developer-token.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
loadDotEnv(join(ROOT, '.env'));

const PORT = Number(process.env.PORT ?? 3000);
const HOST = '127.0.0.1';
const ORIGIN = `http://localhost:${PORT}`;
const { APPLE_TEAM_ID, APPLE_KEY_ID } = process.env;
const KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};
// Only these directories are served; .env, the key and server code are not.
const STATIC_DIRS = { '/lib/': join(ROOT, 'lib'), '/': join(ROOT, 'public') };

let cached = null;
function developerToken() {
  if (cached && cached.expiresAt - Date.now() > 10 * 60_000) return cached;
  const missing = ['APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY_PATH'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing ${missing.join(', ')} in .env (see README)`);
  const privateKey = readFileSync(resolve(ROOT, KEY_PATH), 'utf8');
  cached = createDeveloperToken({
    teamId: APPLE_TEAM_ID,
    keyId: APPLE_KEY_ID,
    privateKey,
    origins: [ORIGIN, `http://127.0.0.1:${PORT}`],
  });
  return cached;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  try {
    if (req.method !== 'GET') return send(res, 405, 'text/plain', 'Method not allowed');

    if (url.pathname === '/api/developer-token') {
      const { token, expiresAt } = developerToken();
      return send(res, 200, MIME['.json'], JSON.stringify({ token, expiresAt }), { 'Cache-Control': 'no-store' });
    }

    const prefix = url.pathname.startsWith('/lib/') ? '/lib/' : '/';
    const base = STATIC_DIRS[prefix];
    const rel = url.pathname.slice(prefix.length) || 'index.html';
    const file = normalize(join(base, decodeURIComponent(rel)));
    if (!file.startsWith(base + sep)) return send(res, 403, 'text/plain', 'Forbidden');
    const type = MIME[extname(file)];
    if (!type || !existsSync(file)) return send(res, 404, 'text/plain', 'Not found');
    return send(res, 200, type, await readFile(file));
  } catch (e) {
    console.error(e);
    return send(res, 500, MIME['.json'], JSON.stringify({ error: e.message }));
  }
});

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers,
  });
  res.end(body);
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

server.listen(PORT, HOST, () => {
  console.log(`Apple Music Genre Organizer running at ${ORIGIN}`);
  try {
    developerToken();
    console.log('Developer token OK.');
  } catch (e) {
    console.warn(`⚠  ${e.message}`);
  }
});
