/**
 * Secure Chat Application - Backend
 * Handles auth, user/public-key storage (SQLite), and relay of encrypted messages (ciphertext only).
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
app.set('trust proxy', 1);

// CORS: never combine Access-Control-Allow-Origin: * with Allow-Credentials: true (browsers reject it).
// - Dev: any localhost / 127.0.0.1 origin (Vite on :3000, API on :3080).
// - Prod + CORS_ORIGIN: comma-separated exact origins (split frontend + API).
// - Prod without CORS_ORIGIN: same-origin monolith — echo Origin only if it matches Host / X-Forwarded-Host.
const isProd = process.env.NODE_ENV === 'production';
const prodCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isDevLocalhostOrigin(origin) {
  if (!origin) return false;
  return (
    /^https?:\/\/localhost(:\d+)?$/i.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)
  );
}

function originMatchesDeploymentHost(origin, req) {
  try {
    const oHost = new URL(origin).host.toLowerCase();
    const raw = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
    const reqHost = raw.split(',')[0].trim().toLowerCase();
    if (!reqHost || !oHost) return false;
    return oHost === reqHost;
  } catch {
    return false;
  }
}

function corsAllowOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  if (!isProd) {
    return isDevLocalhostOrigin(origin) ? origin : null;
  }
  if (prodCorsOrigins.length) {
    return prodCorsOrigins.includes(origin) ? origin : null;
  }
  return originMatchesDeploymentHost(origin, req) ? origin : null;
}

app.use((req, res, next) => {
  const allow = corsAllowOrigin(req);
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  allowRequest: (req, callback) => {
    const origin = req.headers.origin || '';
    if (!origin) return callback(null, true);
    let ok = false;
    if (!isProd) ok = isDevLocalhostOrigin(origin);
    else if (prodCorsOrigins.length) ok = prodCorsOrigins.includes(origin);
    else ok = originMatchesDeploymentHost(origin, req);
    callback(null, ok);
  },
  cors: { origin: true, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check for deployment platforms
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve frontend build from client/ if it exists (same-origin deployment)
const clientDir = path.join(__dirname, 'client');
const fs = require('fs');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
}

// In-memory only for active socket connections
const userSockets = new Map(); // username -> Set of socket ids
const socketToUser = new Map(); // socketId -> username

const SALT_ROUNDS = 10;

// ----- REST API -----

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const u = username.trim().toLowerCase();
    if (u.length < 2) return res.status(400).json({ error: 'Username too short' });
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.createUser(u, passwordHash);
    if (!result) return res.status(409).json({ error: 'Username taken' });
    res.status(201).json({ success: true, username: result.username, userId: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const u = username.trim().toLowerCase();
    const user = db.getUserByUsername(u);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = db.generateId();
    db.setAuthToken(u, token);
    res.json({ success: true, username: u, token, userId: user.id });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout (clear server-side token)
app.post('/api/logout', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const username = db.getUsernameByToken(token);
  if (username) db.clearAuthToken(username);
  res.json({ success: true });
});

// Auth helper for routes that need current user
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const username = token ? db.getUsernameByToken(token) : null;
  if (!username) return res.status(401).json({ error: 'Unauthorized' });
  req.username = username;
  next();
}

// List users (for discovery). If Authorization present, include relationship for each user.
app.get('/api/users', (req, res) => {
  const list = db.listUsers();
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const me = token ? db.getUsernameByToken(token) : null;
  const users = list.map((u) => {
    const out = { username: u.username, userId: u.userId, displayName: u.displayName || u.username, status: u.status || '', hasPublicKey: !!u.hasPublicKey, hasAvatar: !!u.hasAvatar };
    if (me && me !== u.username) out.relationship = db.getRelationship(me, u.username);
    out.online = userSockets.has(u.username);
    return out;
  });
  res.json({ users });
});

// Get one user's public key (no auth required – public keys are public for E2E)
app.get('/api/users/:username/publicKey', (req, res) => {
  const u = (req.params.username || '').trim().toLowerCase();
  const user = db.getUserByUsername(u);
  if (!user) {
    if (!isProd) console.log('[publicKey] GET', u, '-> user not found');
    return res.status(404).json({ error: 'User not found' });
  }
  const publicKey = db.getPublicKey(u);
  if (!publicKey) {
    if (!isProd) console.log('[publicKey] GET', u, '-> key not set');
    return res.status(404).json({ error: 'Public key not set' });
  }
  if (!isProd) console.log('[publicKey] GET', u, '-> ok');
  res.json({ username: u, publicKey });
});

// Get current user's profile
app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const username = db.getUsernameByToken(token);
  if (!username) return res.status(401).json({ error: 'Unauthorized' });
  const profile = db.getProfile(username);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

// Update current user's profile (displayName, status)
app.patch('/api/me', (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const username = db.getUsernameByToken(token);
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const displayName = body.displayName !== undefined ? body.displayName : undefined;
    const status = body.status !== undefined ? body.status : undefined;
    const updated = db.updateProfile(username, { displayName, status });
    if (!updated) return res.status(500).json({ error: 'Update failed' });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Profile update failed' });
  }
});

// Get another user's public profile (display name, username, status)
app.get('/api/users/:username/profile', (req, res) => {
  const u = (req.params.username || '').trim().toLowerCase();
  if (!u) return res.status(400).json({ error: 'Username required' });
  const user = db.getUserByUsername(u);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const profile = db.getProfile(u);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ username: profile.username, displayName: profile.displayName, status: profile.status, hasAvatar: profile.hasAvatar });
});

// Set current user's public key (requires auth via header)
app.post('/api/me/publicKey', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const username = db.getUsernameByToken(token);
  if (!username) return res.status(401).json({ error: 'Unauthorized' });
  const { publicKey } = req.body || {};
  if (!publicKey || typeof publicKey !== 'string') return res.status(400).json({ error: 'publicKey required' });
  db.setPublicKey(username, publicKey);
  if (!isProd) console.log('[publicKey] POST set for', username);
  res.json({ success: true });
});

// Set current user's avatar (base64 image)
app.post('/api/me/avatar', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const username = db.getUsernameByToken(token);
  if (!username) return res.status(401).json({ error: 'Unauthorized' });
  const { avatar } = req.body || {};
  if (avatar !== null && (typeof avatar !== 'string' || avatar.length > 500000)) return res.status(400).json({ error: 'Avatar must be base64 string under ~375KB' });
  db.setAvatar(username, avatar || null);
  res.json({ success: true });
});

// ----- Friend requests -----
app.post('/api/friend-requests', requireAuth, (req, res) => {
  const from = req.username;
  const to = (req.body && req.body.toUsername || '').trim().toLowerCase();
  if (!to) return res.status(400).json({ error: 'toUsername required' });
  if (from === to) return res.status(400).json({ error: 'Cannot send request to yourself' });
  if (!db.getUserByUsername(to)) return res.status(404).json({ error: 'User not found' });
  const existing = db.getFriendRequestStatus(from, to) || db.getFriendRequestStatus(to, from);
  if (existing === 'accepted') return res.status(409).json({ error: 'Already friends' });
  if (existing === 'pending') return res.status(409).json({ error: 'Request already sent or received' });
  const row = db.sendFriendRequest(from, to);
  if (!row) return res.status(409).json({ error: 'Request already exists' });
  res.status(201).json({ success: true, from_username: row.from_username, to_username: row.to_username, status: row.status });
});

app.get('/api/friend-requests', requireAuth, (req, res) => {
  const me = req.username;
  const pendingSent = db.getPendingSent(me);
  const pendingReceived = db.getPendingReceived(me);
  res.json({ pendingSent, pendingReceived });
});

app.post('/api/friend-requests/accept', requireAuth, (req, res) => {
  const me = req.username;
  const from = (req.body && req.body.fromUsername || '').trim().toLowerCase();
  if (!from) return res.status(400).json({ error: 'fromUsername required' });
  const ok = db.acceptFriendRequest(from, me);
  if (!ok) return res.status(404).json({ error: 'No pending request from that user' });
  res.json({ success: true });
});

app.delete('/api/friend-requests/:username', requireAuth, (req, res) => {
  const me = req.username;
  const other = (req.params.username || '').trim().toLowerCase();
  if (!other) return res.status(400).json({ error: 'username required' });
  db.declineOrCancelRequest(me, other);
  db.declineOrCancelRequest(other, me);
  res.json({ success: true });
});

app.get('/api/friends', requireAuth, (req, res) => {
  const friends = db.getFriendsOf(req.username);
  res.json({ friends });
});

// Debug: which users have public keys (dev only, no auth)
app.get('/api/debug/keys', (req, res) => {
  if (isProd) return res.status(404).send('Not found');
  const users = db.listUsers();
  const keys = {};
  users.forEach((u) => { keys[u.username] = !!u.hasPublicKey; });
  res.json({ keys });
});

// Get user's avatar
app.get('/api/users/:username/avatar', (req, res) => {
  const u = (req.params.username || '').trim().toLowerCase();
  const user = db.getUserByUsername(u);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const avatar = db.getAvatar(u);
  if (!avatar) return res.status(404).json({ error: 'Avatar not set' });
  res.json({ username: u, avatar });
});

// ----- Socket.IO -----

io.on('connection', (socket) => {
  socket.on('auth', (data) => {
    const token = data && data.token;
    const username = db.getUsernameByToken(token);
    if (!username) {
      socket.emit('auth_fail', { error: 'Invalid token' });
      return;
    }
    if (data && typeof data.publicKey === 'string' && data.publicKey.trim()) {
      db.setPublicKey(username, data.publicKey.trim());
      if (!isProd) console.log('[publicKey] socket auth set for', username);
    }
    socket.username = username;
    socketToUser.set(socket.id, username);
    if (!userSockets.has(username)) userSockets.set(username, new Set());
    userSockets.get(username).add(socket.id);
    socket.emit('auth_ok', { username });
    broadcastOnlineList();
  });

  socket.on('typing', (data) => {
    const from = socketToUser.get(socket.id);
    if (!from) return;
    const to = (data && data.to || '').trim().toLowerCase();
    if (!to || !db.areFriends(from, to)) return;
    const toSockets = userSockets.get(to);
    if (toSockets) toSockets.forEach((sid) => io.to(sid).emit('typing', { from, typing: !!data.typing }));
  });

  socket.on('message', (payload) => {
    const from = socketToUser.get(socket.id);
    if (!from) return;
    const { to, ciphertext, iv, senderPublicKey, ephemeralPublicKey, messageId } = payload || {};
    if (!to || !ciphertext) return;
    const toUser = (to || '').trim().toLowerCase();
    if (!db.areFriends(from, toUser)) return; // only allow messaging friends
    const toSockets = userSockets.get(toUser);
    if (toSockets) {
      const msg = {
        from,
        to: toUser,
        ciphertext,
        iv: iv || null,
        senderPublicKey: senderPublicKey || null,
        ephemeralPublicKey: ephemeralPublicKey || null,
        messageId: messageId || null,
        at: Date.now(),
      };
      toSockets.forEach((sid) => io.to(sid).emit('message', msg));
    }
  });

  socket.on('disconnect', () => {
    const u = socketToUser.get(socket.id);
    socketToUser.delete(socket.id);
    if (u && userSockets.has(u)) {
      userSockets.get(u).delete(socket.id);
      if (userSockets.get(u).size === 0) userSockets.delete(u);
    }
    broadcastOnlineList();
  });
});

function broadcastOnlineList() {
  const list = Array.from(userSockets.keys());
  io.emit('online_list', list);
}

// SPA fallback: serve index.html for non-API routes if client/ exists, otherwise 404
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  const indexPath = path.join(__dirname, 'client', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Secure Chat API only. Use the CipherChat frontend to connect.');
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Ensure DB is initialized before listening
db.getDb();

server.listen(PORT, HOST, () => {
  console.log(`Secure Chat server running on ${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  console.log(`Database: ${process.env.DB_PATH || path.join(__dirname, 'data', 'chat.db')}`);
});
