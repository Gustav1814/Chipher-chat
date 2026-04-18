# CipherChat: Secure E2E Messaging

CipherChat is a full-stack, real-time messaging application that prioritizes privacy. It implements strict End-to-End (E2E) encryption in the browser using the Web Crypto API, meaning the backend server only ever handles encrypted ciphertext. 

The application features a modern, ultra-refined dark theme with glassmorphism UI principles, built using React 19 and Tailwind CSS.

## Features

### 🔒 Security & Privacy
- **True End-to-End Encryption**: powered by the native `Web Crypto API` (ECDH P-256 for key agreement, AES-256-GCM for message encryption).
- **Forward Secrecy**: A new ephemeral ECDH key pair is generated for every single message.
- **Key Verification**: Cryptographic fingerprinting allows you to verify contacts out-of-band to prevent MITM attacks.
- **Replay Protection**: Cryptographically robust unique message identifiers.
- **Zero-Knowledge Backend**: Passwords are bcrypt-hashed, private keys never leave the local device, and the server cannot decrypt messages.

### 💬 Real-Time Messaging & UI
- **Real-Time Data**: Instant message delivery and delivery status indicators powered by `Socket.IO`.
- **Friends & Discovery**: Integrated user discovery and friend request system.
- **Rich Media**: Support for secure end-to-end encrypted image and file attachments.
- **Modern UI**: Stunning glassmorphism interface, custom scrollbars, gradient text accents, and polished CSS animations.

## Tech Stack

**Frontend (`apps/web`)**
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Socket.IO-client
- Web Crypto API (Native browser cryptography)
- IndexedDB (Local chat history)

**Backend (`apps/server`)**
- Node.js
- Express
- Socket.IO
- better-sqlite3 (Persistent database)
- bcrypt (Password hashing)
- helmet-like security middleware

## Project Structure

This repository is configured as a monorepo containing both the frontend and backend applications:

```text
├── apps/
│   ├── web/        # React frontend application
│   └── server/     # Node.js + Express + Socket.IO backend
├── docs/           # Specifications and project proposals
└── README.md       # Project documentation
```

## Getting Started

### Prerequisites
- Node.js v18 or higher
- npm or yarn

### 1. Setup the Backend
The backend requires no external services to run, as it utilizes a local SQLite database that is automatically generated.

```bash
cd apps/server
npm install

# Start the server (default port is 3000, but we suggest 3080 to avoid Vite conflicts)
PORT=3080 npm start
```

### 2. Setup the Frontend
In a new terminal window, initialize and start the frontend application.

```bash
cd apps/web
npm install

# Tell Vite to proxy API requests to our backend running on 3080
VITE_API_URL=http://localhost:3080 npm run dev
```

The application will be accessible at `http://localhost:3000`. 
*Note: End-to-End encryption relies on the Web Crypto API, which requires a secure context. It will function correctly on `http://localhost`, but production deployments MUST use HTTPS.*

## Deployment

The application is configured to support "Same-Origin Deployment" for maximum simplicity and zero CORS issues. 

1. **Build the frontend**:
   ```bash
   cd apps/web
   npm run build
   ```
2. **Move build to server**:
   Copy the contents of `apps/web/dist` directly into `apps/server/client`.
3. **Deploy the backend**:
   Deploy the `apps/server` directory to any Node.js hosting provider (Railway, Render, Fly.io, Heroku, etc.). The server is configured to automatically serve the static React files from the `client` directory alongside the API and WebSocket connections.

See `apps/server/DEPLOY.md` for specific platform instructions.

## Documentation

For an in-depth explanation of the cryptographic protocols and security guarantees implemented in this codebase, refer to:`apps/server/SECURITY.md`.
