# Deploy Secure Chat live

This backend is **API-only** (no built-in frontend in `public/`). You can either deploy the API alone and use the **`apps/web`** React app on a separate URL, or build `apps/web` and serve it from the same server (same URL, no CORS).

---

## Option 1: Deploy API-only

Deploy just the backend. Users will need the **`apps/web`** frontend elsewhere: either build and host it on Vercel/Netlify (see "Two separate deployments" below) or copy `apps/web/dist/` into `client/` and use Option 2.

### Railway

1. Go to [railway.app](https://railway.app), sign in, **New Project** → **Deploy from GitHub repo** (or upload).
2. Root directory: set to `apps/server` if your repository root is the monorepo root.
3. **Variables:** add `NODE_ENV=production`. Railway sets `PORT` automatically.
4. **Build:** leave empty or `npm install`.
5. **Start:** `npm start`.
6. Deploy. Railway gives a URL like `https://your-app.up.railway.app`. With API-only, that URL serves the API; use the `apps/web` frontend elsewhere or use Option 2 to serve it from the same server.

**Persistent data:** Railway can use a volume for `data/`. Add a volume and set mount path to `data` (or set `DB_PATH` to a path inside the volume). Otherwise the SQLite file may be ephemeral and reset on redeploy.

### Render

1. Go to [render.com](https://render.com), **New** → **Web Service**.
2. Connect your repo. Root directory: `apps/server` if needed.
3. **Build command:** `npm install`
4. **Start command:** `npm start`
5. **Environment:** `NODE_ENV=production`. Render sets `PORT`.
6. Deploy. You get a URL like `https://your-app.onrender.com`. With API-only, that URL serves the API; use `apps/web` elsewhere or Option 2 to serve it from the same server.

**Persistent data:** On free tier the disk is often ephemeral. For a persistent DB you can use a **Render Disk** (paid) and set `DB_PATH` to a path on that disk, or use another hosted DB later.

### Fly.io

```bash
cd apps/server
fly launch
# set NODE_ENV=production in secrets
fly volumes create chat_data --size 1
# mount at /data and set DB_PATH=/data/chat.db
fly deploy
```

---

## Option 2: Deploy with React frontend (`apps/web`)

Same backend, but the browser loads the React app. Build the React app so it talks to the **same origin** (no `VITE_API_URL`), then serve that build from the Node server.

### Step 1: Build React app

From the **repository root**:

```bash
cd apps/web
npm install
npm run build
```

This creates `apps/web/dist/` with `index.html` and assets. **Do not** set `VITE_API_URL` so the app uses the same URL as the server (e.g. `/api`, `/socket.io`).

### Step 2: Copy build into backend

```bash
# From repository root
cp -r apps/web/dist/* apps/server/client/
```

On Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path apps\server\client
Copy-Item -Path apps\web\dist\* -Destination apps\server\client\ -Recurse
```

So `apps/server/client/` contains `index.html` and an `assets/` folder.

### Step 3: Deploy the backend

Deploy **`apps/server`** to Railway, Render, or Fly.io as in Option 1. The server will serve the React app from `client/` when that folder exists, so users see the CipherChat UI at the same URL.

---

## Checklist for any deployment

- **HTTPS:** Required in production for Web Crypto in the browser. Railway/Render/Fly terminate TLS for you.
- **NODE_ENV=production**
- **PORT:** Let the platform set it (they inject `PORT`).
- **Database:** Use a volume or persistent disk and set **`DB_PATH`** to a path on that volume; otherwise SQLite may reset on redeploy.
- **CORS:** The server does **not** use `Access-Control-Allow-Origin: *` together with credentials. For **same hostname** (React static + API on one URL), leave **`CORS_ORIGIN`** unset — allowed origins are inferred from `Origin` vs `Host` / `X-Forwarded-Host`. For **split** UI and API, set **`CORS_ORIGIN`** to the exact frontend origin(s), comma-separated (e.g. `https://app.vercel.app`).

---

## Two separate deployments (backend + frontend)

You can also run backend and frontend on different hosts (e.g. backend on Railway, frontend on Vercel):

1. Deploy **`apps/server`** and note the URL, e.g. `https://api.your-app.com`.
2. In **`apps/web`**, set `VITE_API_URL=https://api.your-app.com` and build: `npm run build`.
3. Deploy the `apps/web/dist/` folder to Vercel or Netlify (static site).
4. On the backend, set **CORS**: `CORS_ORIGIN=https://your-frontend.vercel.app` so the browser allows API and Socket.IO requests.

This works, but same-origin (Option 2) is simpler and avoids CORS/WebSocket quirks.
