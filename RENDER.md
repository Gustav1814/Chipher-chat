# Deploy CipherChat on Render (fast)

Same idea as Railway: **one Web Service** builds the React app, copies it into `apps/server/client`, runs Node. **One HTTPS URL** = UI + `/api` + WebSockets.

## 5-minute dashboard flow

1. Go to [render.com](https://render.com) → sign in → **New +** → **Web Service**.
2. **Connect** your GitHub repo (`Chipher-chat` or whatever has this code) → authorize if asked.
3. Fill the form:

| Field | Value |
|--------|--------|
| **Name** | `cipherchat` (any) |
| **Region** | Closest to you |
| **Branch** | `main` |
| **Root directory** | *(leave empty)* — repo root |
| **Runtime** | **Node** |
| **Build Command** | `npm run render:build` **or** `yarn install && yarn build` **or** `npm install && npm run build` |
| **Start Command** | `npm start` *(from repo root — do not use `node app.js`)* |
| **Instance type** | **Free** (ok to try) |

**Important:** Render’s Express quickstart sets **Build** to **`yarn`** only. That does **not** run **`yarn build`**, so the server is never installed and logs still show `Running build command 'yarn'...`. Either paste **`npm run render:build`** as the build command, or keep **`yarn`**-style tooling but use **`yarn install && yarn build`** (root `package.json` defines **`build`** → **`render:build`**).

Set **Start** to **`npm start`**, not **`node app.js`** (there is no root `app.js`; the wrong start command can fail fast with **exit 127**).

Repo root includes **`.node-version`** so Node stays on **20.x** (unbounded `>=20` in `engines` alone can resolve to **Node 26** on Render).

4. **Environment** → **Add environment variable**:
   - `NODE_ENV` = `production`
   - Optional: `NODE_VERSION` = `20` (helps `better-sqlite3` build)

5. **Advanced** (optional but recommended):
   - **Health Check Path** → `/api/health`

6. **Create Web Service** → wait for deploy → open the **`*.onrender.com`** URL.

## SQLite (important)

- **Free** instances have an **ephemeral** disk: **users/chats reset** when the service restarts or redeploys.
- To **keep** the database: upgrade to a **paid** plan and add a **Render Disk**, mount e.g. `/data`, then set:
  - `DB_PATH` = `/data/chat.db`

## If the build fails

- Open **Logs** → check for `better-sqlite3` compile errors → set `NODE_VERSION` to `20` and redeploy.
- Ensure **Root directory** is empty (build runs from monorepo root).

## Optional: Blueprint

If you connect the repo with a root **`render.yaml`**, Render can create/update the service from that file (see repo `render.yaml`).
