# Local testing (chat)

1. **Start the backend** (must run before the frontend):
   ```bash
   cd apps/server
   set PORT=3000
   node server.js
   ```
   If 3000 is in use, pick another port (e.g. 3080) and in `apps/web` create a `.env` with:
   ```
   VITE_API_URL=http://localhost:3080
   ```

2. **Start the frontend**:
   ```bash
   cd apps/web
   npm run dev
   ```
   Open the URL shown (e.g. http://localhost:3003).

3. **Test chat** (after wiping DB you need new users):
   - Register **User A** (e.g. `alice`), sign in.
   - Open a second browser (or incognito), register **User B** (e.g. `bob`), sign in.
   - From **User A**: go to **Contacts**, find **bob**, click Add friend (or accept if request already exists).
   - From **User B**: go to **Contacts**, accept **alice**’s friend request if needed.
   - From either: open **Chats**, select the other user, type a message and send.

Backend runs on port 3000 by default. The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3000`, so you don’t need `VITE_API_URL` if the backend is on 3000.
