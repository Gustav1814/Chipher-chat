# CipherChat — React frontend for secure E2E chat

Secure end-to-end encrypted chat. No AI or external APIs.

## Run (with `apps/server` backend)

1. **Start backend** (from repo root or `apps/server`):
   ```bash
   cd ../server
   npm start
   ```
   Use another port if needed: `PORT=3080 npm start`

2. **Optional:** In this folder create `.env` if backend is not on 3080:
   ```
   VITE_API_URL=http://localhost:3080
   ```

3. **Start frontend**:
   ```bash
   npm run dev
   ```
   Open the URL shown. Dev server proxies `/api` and `/socket.io` to the backend.

## Features

- Sign up / Sign in (username + password)
- Add friends (send request, accept/decline)
- Chat only with accepted friends
- E2E encryption (keys on sign-in; ephemeral keys per message)
- Verification fingerprints in the right panel
