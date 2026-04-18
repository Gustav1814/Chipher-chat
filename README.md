# Secure Chat (end-to-end encrypted)

Monorepo for the Secure Chat project: a React client and a Node.js API that relays ciphertext only.

## Repository layout

| Path | Description |
|------|-------------|
| `apps/web` | CipherChat — React 19, Vite, TypeScript, Tailwind (frontend) |
| `apps/server` | Express, Socket.IO, SQLite — auth, friends, message relay (backend) |
| `docs/proposals` | Project proposal (Markdown) |
| `docs/scripts` | Helper scripts (e.g. generating the proposal `.docx`) |

## Run locally

1. **Backend** (start first; use port **3080** if the Vite dev server uses **3000**):

   ```bash
   cd apps/server
   npm install
   set PORT=3080
   npm start
   ```

2. **Frontend**:

   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

Open the URL Vite prints (e.g. http://localhost:3000). The dev server proxies `/api` and `/socket.io` to the backend.

More detail: `apps/web/README.md`, `apps/web/LOCAL_TESTING.md`, and `apps/server/README.md`.
