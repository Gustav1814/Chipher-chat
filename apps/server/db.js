/**
 * SQLite database layer for users and sessions.
 * Uses persistent storage so data survives server restarts.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : path.join(__dirname, 'data');
const DB_FILE = process.env.DB_PATH || path.join(DB_DIR, 'chat.db');

let db = null;

function getDb() {
  if (db) return db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      public_key TEXT,
      auth_token TEXT,
      token_created_at TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_auth_token ON users(auth_token);
  `);
  try {
    database.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);
  } catch (_) {}
  try {
    database.exec(`ALTER TABLE users ADD COLUMN display_name TEXT`);
  } catch (_) {}
  try {
    database.exec(`ALTER TABLE users ADD COLUMN status TEXT`);
  } catch (_) {}
  try {
    database.exec(`ALTER TABLE users ADD COLUMN public_key TEXT`);
  } catch (_) {}
  database.exec(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      from_username TEXT NOT NULL,
      to_username TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (from_username, to_username),
      CHECK (from_username != to_username),
      CHECK (status IN ('pending', 'accepted'))
    );
    CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_username);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_username);
  `);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createUser(username, passwordHash) {
  const database = getDb();
  const id = generateId();
  const stmt = database.prepare(
    'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)'
  );
  try {
    stmt.run(id, username, passwordHash);
    return { id, username };
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return null;
    throw e;
  }
}

function getUserByUsername(username) {
  const database = getDb();
  const row = database.prepare(
    'SELECT id, username, password_hash, public_key FROM users WHERE username = ?'
  ).get(username);
  return row || null;
}

function setAuthToken(username, token) {
  const database = getDb();
  database.prepare(
    "UPDATE users SET auth_token = ?, token_created_at = datetime('now') WHERE username = ?"
  ).run(token || null, username);
}

function clearAuthToken(username) {
  setAuthToken(username, null);
}

function getUsernameByToken(token) {
  if (!token) return null;
  const database = getDb();
  const row = database.prepare(
    'SELECT username FROM users WHERE auth_token = ?'
  ).get(token);
  return row ? row.username : null;
}

function setPublicKey(username, publicKey) {
  const database = getDb();
  const result = database.prepare(
    'UPDATE users SET public_key = ? WHERE username = ?'
  ).run(publicKey, username);
  return result.changes > 0;
}

function getPublicKey(username) {
  const database = getDb();
  const row = database.prepare(
    'SELECT public_key FROM users WHERE username = ?'
  ).get(username);
  return row && row.public_key ? row.public_key : null;
}

function setAvatar(username, avatarBase64) {
  const database = getDb();
  const result = database.prepare(
    'UPDATE users SET avatar = ? WHERE username = ?'
  ).run(avatarBase64 || null, username);
  return result.changes > 0;
}

function getAvatar(username) {
  const database = getDb();
  const row = database.prepare(
    'SELECT avatar FROM users WHERE username = ?'
  ).get(username);
  return row && row.avatar ? row.avatar : null;
}

function getProfile(username) {
  const database = getDb();
  const row = database.prepare(
    'SELECT username, display_name, status, avatar FROM users WHERE username = ?'
  ).get((username || '').trim().toLowerCase());
  if (!row) return null;
  return {
    username: row.username,
    displayName: row.display_name || row.username,
    status: row.status || '',
    hasAvatar: !!row.avatar,
  };
}

function updateProfile(username, { displayName, status }) {
  const database = getDb();
  const u = (username || '').trim().toLowerCase();
  if (displayName !== undefined) {
    database.prepare('UPDATE users SET display_name = ? WHERE username = ?').run(
      typeof displayName === 'string' ? displayName.trim() || null : null,
      u
    );
  }
  if (status !== undefined) {
    database.prepare('UPDATE users SET status = ? WHERE username = ?').run(
      typeof status === 'string' ? status.trim().slice(0, 200) : null,
      u
    );
  }
  return getProfile(u);
}

function listUsers() {
  const database = getDb();
  const rows = database.prepare(
    'SELECT id, username, display_name, status, public_key, avatar FROM users ORDER BY username'
  ).all();
  return rows.map((r) => ({
    username: r.username,
    userId: r.id,
    displayName: r.display_name || r.username,
    status: r.status || '',
    hasPublicKey: !!r.public_key,
    hasAvatar: !!r.avatar,
  }));
}

// ----- Friend requests -----
function sendFriendRequest(fromUsername, toUsername) {
  const database = getDb();
  const from = (fromUsername || '').trim().toLowerCase();
  const to = (toUsername || '').trim().toLowerCase();
  if (!from || !to || from === to) return null;
  try {
    database.prepare(
      'INSERT INTO friend_requests (from_username, to_username, status) VALUES (?, ?, ?)'
    ).run(from, to, 'pending');
    return { from_username: from, to_username: to, status: 'pending' };
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return null; // already exists
    throw e;
  }
}

function acceptFriendRequest(fromUsername, toUsername) {
  const database = getDb();
  const from = (fromUsername || '').trim().toLowerCase();
  const to = (toUsername || '').trim().toLowerCase();
  const result = database.prepare(
    "UPDATE friend_requests SET status = 'accepted' WHERE from_username = ? AND to_username = ? AND status = 'pending'"
  ).run(from, to);
  return result.changes > 0;
}

function declineOrCancelRequest(fromUsername, toUsername) {
  const database = getDb();
  const from = (fromUsername || '').trim().toLowerCase();
  const to = (toUsername || '').trim().toLowerCase();
  const result = database.prepare(
    'DELETE FROM friend_requests WHERE (from_username = ? AND to_username = ?) OR (from_username = ? AND to_username = ?)'
  ).run(from, to, to, from);
  return result.changes > 0;
}

function getFriendRequestStatus(fromUsername, toUsername) {
  const database = getDb();
  const from = (fromUsername || '').trim().toLowerCase();
  const to = (toUsername || '').trim().toLowerCase();
  const row = database.prepare(
    'SELECT status FROM friend_requests WHERE from_username = ? AND to_username = ?'
  ).get(from, to);
  return row ? row.status : null;
}

function areFriends(usernameA, usernameB) {
  const a = (usernameA || '').trim().toLowerCase();
  const b = (usernameB || '').trim().toLowerCase();
  if (!a || !b || a === b) return false;
  const database = getDb();
  const row = database.prepare(
    'SELECT 1 FROM friend_requests WHERE ((from_username = ? AND to_username = ?) OR (from_username = ? AND to_username = ?)) AND status = ?'
  ).get(a, b, b, a, 'accepted');
  return !!row;
}

function getFriendsOf(username) {
  const database = getDb();
  const u = (username || '').trim().toLowerCase();
  const rows = database.prepare(
    "SELECT from_username AS other FROM friend_requests WHERE to_username = ? AND status = 'accepted' " +
    "UNION ALL " +
    "SELECT to_username AS other FROM friend_requests WHERE from_username = ? AND status = 'accepted'"
  ).all(u, u);
  return rows.map((r) => r.other);
}

function getPendingSent(username) {
  const database = getDb();
  const u = (username || '').trim().toLowerCase();
  return database.prepare(
    "SELECT to_username AS other FROM friend_requests WHERE from_username = ? AND status = 'pending'"
  ).all(u).map((r) => r.other);
}

function getPendingReceived(username) {
  const database = getDb();
  const u = (username || '').trim().toLowerCase();
  return database.prepare(
    "SELECT from_username AS other FROM friend_requests WHERE to_username = ? AND status = 'pending'"
  ).all(u).map((r) => r.other);
}

function getRelationship(me, other) {
  if ((me || '').trim().toLowerCase() === (other || '').trim().toLowerCase()) return null;
  const status = getFriendRequestStatus(me, other);
  const statusReverse = getFriendRequestStatus(other, me);
  if (status === 'accepted' || statusReverse === 'accepted') return 'friend';
  if (status === 'pending') return 'pending_sent';
  if (statusReverse === 'pending') return 'pending_received';
  return 'none';
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  createUser,
  getUserByUsername,
  setAuthToken,
  clearAuthToken,
  getUsernameByToken,
  setPublicKey,
  getPublicKey,
  setAvatar,
  getAvatar,
  getProfile,
  updateProfile,
  listUsers,
  generateId,
  close,
  sendFriendRequest,
  acceptFriendRequest,
  declineOrCancelRequest,
  getFriendRequestStatus,
  areFriends,
  getFriendsOf,
  getPendingSent,
  getPendingReceived,
  getRelationship,
};
