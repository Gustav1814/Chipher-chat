# Secure Chat — End-to-End Encrypted

Real-time chat with E2E encryption. Messages are encrypted on your device; the server only relays ciphertext.

## Features

- User registration & login (bcrypt)
- Friend requests (send, accept, decline) — chat only with accepted friends
- ECDH P-256 key pair generated in browser; public key registered on sign-in
- E2E encryption (ECDH + AES-GCM, ephemeral keys per message)
- One-to-one chat, message history, avatars

## Run locally

```bash
npm install
npm start
```

By default the server runs on **port 3000**. For local development with the **apps/web** React frontend, set **`PORT=3080`** so the frontend (Vite on port 3000) can proxy API and Socket.IO to the backend. Then open **http://localhost:3000** in the browser; register users, add friends, then chat.

**API-only:** This backend has no built-in frontend. Use the **CipherChat** app in **`apps/web`** as the client.

## Project structure (this package)

```
apps/server/
├── server.js       # Express + Socket.IO, auth, friend API, message relay
├── db.js           # SQLite: users, friend_requests, public keys, avatars
├── package.json
├── data/           # chat.db — persistent SQLite DB (created on first run, gitignored)
├── public/         # Empty — API-only; use apps/web as frontend
├── client/         # Optional: copy apps/web/dist here to serve React app from same server
├── test/
│   └── sqa.js      # Full SQA: signup, login, friends, messaging (uses port 3099)
├── README.md
├── DEPLOY.md
└── SECURITY.md
```

## Database (persistent)

All data is stored in **`data/chat.db`** (SQLite on disk). It **persists across sessions**: when you stop the server and start it again, users, friend relationships, public keys, and avatars are still there. The `data/` folder and `chat.db` file are created automatically the first time you run the server. Override the path with env **`DB_PATH`**.

**Note:** The server does not store message content—only encrypted ciphertext is relayed in real time. Chat history is kept in each client (browser) for the current session; the DB stores user accounts and who is friends with whom.

## Env (optional)

| Variable   | Default           | Description        |
|------------|-------------------|--------------------|
| `PORT`     | `3000`            | Server port (use `3080` when running `apps/web` dev so Vite proxy works) |
| `HOST`     | `0.0.0.0`         | Bind address       |
| `DB_PATH`  | `./data/chat.db`  | SQLite file path   |
| `CORS_ORIGIN` | —              | If frontend on another domain |

## Tests

- **`npm test`** — Starts server on **port 3099** with a test DB, runs full SQA, then exits.
- **`npm run test:live`** — Runs tests against an already running app (default `http://localhost:3000`; set `BASE_URL` if your backend is on another port, e.g. 3080).

## Deploy live

See **[DEPLOY.md](DEPLOY.md)** for step-by-step deployment (Railway, Render, Fly.io): API-only or with the React frontend in `apps/web` served from the same server.

## React frontend (`apps/web`)

The **`apps/web`** package is the React (Vite) frontend. **Local dev:** run this backend with `PORT=3080`, then in `apps/web` run `npm run dev` — the app proxies `/api` and `/socket.io` to the backend. **Production:** build `apps/web` and copy `dist/` into `apps/server/client/` so the same server can serve the React app. See DEPLOY.md.
