# Deploy CipherChat on Railway

I can’t sign in to Railway or GitHub for you, but the repo includes a root **`railway.toml`** so a deploy is mostly point-and-click.

## One-time setup

1. Push this repo to **GitHub** (or GitLab) if it isn’t already.
2. Open [railway.app](https://railway.app) → sign in → **New Project** → **Deploy from GitHub repo** → pick this repo.
3. Railway should detect **`railway.toml`** at the repo root (leave the service root as the **repository root**, not `apps/server` only).
4. Under the service → **Variables**, add:
   - `NODE_ENV` = `production`
   - **Optional:** `CORS_ORIGIN` = your frontend URL(s), comma-separated, only if the UI is **not** served from the same Railway hostname (same-origin deploy can leave this unset).
5. **Optional but strongly recommended (SQLite):**  
   - **Settings** → **Volumes** → add a volume, mount path e.g. **`/data`**.  
   - Add variable: **`DB_PATH`** = **`/data/chat.db`**  
   Without this, user data may disappear when the service redeploys.

## Deploy

- Trigger a deploy (push to the connected branch or **Deploy** in the dashboard).
- Open the generated **HTTPS** URL — the UI and API share the same origin (Web Crypto works).

## CLI (optional)

```bash
npm i -g @railway/cli
railway login
railway link
railway up
```

## Troubleshooting

- **Vite build fails at `bundleAndLoadConfigFile`:** The repo pins Node **20** via root `nixpacks.toml` (`NIXPACKS_NODE_VERSION`). `vite.config.ts` uses `import.meta.url` for `__dirname` so the config loads correctly under ESM on Linux.
- **Docker log `UndefinedVar: $NIXPACKS_PATH`:** Harmless BuildKit noise from the builder; it does not stop the build if the Nixpacks steps complete.
- **Build fails on `better-sqlite3`:** Nixpacks should compile native addons on Node 20; check full deploy logs for compile errors.
- **Blank page:** Confirm the build copied `apps/web/dist` → `apps/server/client` (see `railway.toml` `buildCommand`).
- **Sockets / CORS:** Same-origin deploy uses host-matched origins. Split deploys need `CORS_ORIGIN` set to the exact frontend origin(s).
