<div align="center">

# CipherChat

**Privacy-first, end-to-end encrypted messaging** — cryptography runs entirely in the browser; the server only ever relays ciphertext.

[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Highlights

| | |
| :--- | :--- |
| **Zero-knowledge server** | Passwords hashed with bcrypt; message bodies are opaque ciphertext. |
| **Web Crypto E2E** | ECDH P-256 key agreement, AES-256-GCM, per-message ephemeral keys (forward secrecy). |
| **Real-time** | Socket.IO for live delivery, typing, and presence. |
| **Modern UI** | Dark glass aesthetic, refined motion, emoji composer, team-aware accents. |
| **Session persistence** | Auth token + encryption keys stored locally so **reload keeps you signed in**; **logout clears** server session and local keys. |
| **Profile photos** | Avatars load from the API after login and session restore so your **PFP stays consistent** across sign-in. |

---

## Architecture

```text
apps/
├── web/      # React 19 · Vite · Tailwind — Web Crypto + IndexedDB (history + session keys)
└── server/   # Express · Socket.IO · better-sqlite3 — users, friends, key directory, relay
```

---

## Quick start (development)

**Backend** (pick a port that is not your Vite port):

```bash
cd apps/server
npm install
PORT=3080 npm start
```

**Frontend**:

```bash
cd apps/web
npm install
VITE_API_URL=http://localhost:3080 npm run dev
```

Open the Vite URL (e.g. `http://localhost:3000`). Web Crypto requires a **secure context** — `localhost` is allowed; **production must use HTTPS**.

---

## Production build (same origin)

From the **repository root**:

```bash
npm install
npm run build:production
cd apps/server && npm install && NODE_ENV=production npm start
```

This builds the SPA, copies `apps/web/dist` → `apps/server/client`, and serves UI + `/api` + `/socket.io` from one process.

**Checklist:** `NODE_ENV=production`, platform-managed `PORT`, persistent **`DB_PATH`** for SQLite (volume/disk), HTTPS at the edge. Split UI/API hosts need **`CORS_ORIGIN`** on the server and **`VITE_API_URL`** at build time for the web app. See `apps/server/DEPLOY.md` and `RAILWAY.md`.

---

## Security notes

- Verify contact fingerprints out-of-band when threat models require it — see `apps/server/SECURITY.md`.
- Session keys live in **IndexedDB** on the device so reload does not break E2E; treat the device as trusted for key material.
- Explicit **logout** invalidates the server token and wipes local session storage.

---

## Repository

Public mirror: [github.com/Gustav1814/Chipher-chat](https://github.com/Gustav1814/Chipher-chat)

---

<div align="center">

**Made by Zeerak**

</div>
