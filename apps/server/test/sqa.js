/**
 * Complete SQA: Signup (multiple users), Login, Logout, Users, Public Key, Messaging.
 * Run: npm test (spawns server on port 3099 with test DB, then runs all tests)
 * Run against existing app: npm run test:live (or BASE_URL=http://localhost:3000 npm test)
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const assert = require('node:assert');
const { test, describe, before, after } = require('node:test');

const liveMode = process.argv.includes('--live');
const BASE_URL = process.env.BASE_URL || (liveMode ? 'http://localhost:3000' : 'http://localhost:3099');
const TEST_PORT = 3099;
const TEST_DB_DIR = path.join(__dirname, '..', 'data');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test.db');
let serverProcess = null;

function waitForPort(port, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error('Port timeout'));
        setTimeout(tryConnect, 100);
      });
      socket.connect(port, '127.0.0.1');
    };
    tryConnect();
  });
}

async function startTestServer() {
  if (process.env.BASE_URL || liveMode) return;
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  try {
    fs.unlinkSync(TEST_DB_PATH);
  } catch (_) {}
  serverProcess = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(TEST_PORT), DB_PATH: TEST_DB_PATH, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.on('data', (d) => process.stdout.write(d));
  serverProcess.stderr.on('data', (d) => process.stderr.write(d));
  await waitForPort(TEST_PORT);
}

function stopTestServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

async function api(method, path, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE_URL + path, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {}
  return { status: res.status, data };
}

describe('SQA: Secure Chat Application', { concurrency: 1 }, () => {
  before(async () => {
    await startTestServer();
  });

  after(() => {
    stopTestServer();
  });

  describe('1. Sign up (multiple users)', () => {
    test('Register user alice returns 201 and username', async () => {
      const { status, data } = await api('POST', '/api/register', { username: 'alice', password: 'alice123' });
      assert.strictEqual(status, 201);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.username, 'alice');
      assert.ok(data.userId);
    });

    test('Register user bob returns 201', async () => {
      const { status, data } = await api('POST', '/api/register', { username: 'bob', password: 'bob456' });
      assert.strictEqual(status, 201);
      assert.strictEqual(data.username, 'bob');
    });

    test('Register user charlie returns 201', async () => {
      const { status } = await api('POST', '/api/register', { username: 'charlie', password: 'charlie789' });
      assert.strictEqual(status, 201);
    });

    test('Register duplicate username returns 409', async () => {
      const { status, data } = await api('POST', '/api/register', { username: 'alice', password: 'other' });
      assert.strictEqual(status, 409);
      assert.strictEqual(data.error, 'Username taken');
    });

    test('Register with short username returns 400', async () => {
      const { status } = await api('POST', '/api/register', { username: 'a', password: 'pass' });
      assert.strictEqual(status, 400);
    });

    test('Register without password returns 400', async () => {
      const { status } = await api('POST', '/api/register', { username: 'dave' });
      assert.strictEqual(status, 400);
    });

    test('Register without username returns 400', async () => {
      const { status } = await api('POST', '/api/register', { password: 'pass' });
      assert.strictEqual(status, 400);
    });

    test('Register normalizes username to lowercase', async () => {
      const { status, data } = await api('POST', '/api/register', { username: 'Eve', password: 'eve111' });
      assert.strictEqual(status, 201);
      assert.strictEqual(data.username, 'eve');
    });
  });

  describe('2. Login', () => {
    test('Login with correct credentials returns 200 and token', async () => {
      const { status, data } = await api('POST', '/api/login', { username: 'alice', password: 'alice123' });
      assert.strictEqual(status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.username, 'alice');
      assert.ok(data.token);
      assert.ok(data.userId);
    });

    test('Login with wrong password returns 401', async () => {
      const { status, data } = await api('POST', '/api/login', { username: 'alice', password: 'wrong' });
      assert.strictEqual(status, 401);
      assert.strictEqual(data.error, 'Invalid credentials');
    });

    test('Login with non-existent user returns 401', async () => {
      const { status } = await api('POST', '/api/login', { username: 'nobody', password: 'x' });
      assert.strictEqual(status, 401);
    });

    test('Login without password returns 400', async () => {
      const { status } = await api('POST', '/api/login', { username: 'alice' });
      assert.strictEqual(status, 400);
    });

    test('Login normalizes username to lowercase', async () => {
      const { status, data } = await api('POST', '/api/login', { username: 'Alice', password: 'alice123' });
      assert.strictEqual(status, 200);
      assert.strictEqual(data.username, 'alice');
    });
  });

  describe('3. List users', () => {
    test('GET /api/users returns all users with hasPublicKey', async () => {
      const { status, data } = await api('GET', '/api/users');
      assert.strictEqual(status, 200);
      assert.ok(Array.isArray(data.users));
      assert.ok(data.users.length >= 4);
      const usernames = data.users.map((u) => u.username);
      assert.ok(usernames.includes('alice'));
      assert.ok(usernames.includes('bob'));
      data.users.forEach((u) => {
        assert.ok(typeof u.username === 'string');
        assert.ok(typeof u.userId === 'string');
        assert.ok(typeof u.hasPublicKey === 'boolean');
      });
    });
  });

  describe('4. Public key', () => {
    let aliceToken;
    let bobToken;

    test('Set public key with valid token returns 200', async () => {
      const login = await api('POST', '/api/login', { username: 'alice', password: 'alice123' });
      aliceToken = login.data.token;
      const { status } = await api('POST', '/api/me/publicKey', { publicKey: 'YWxpY2VQdWJsaWNLZXk=' }, aliceToken);
      assert.strictEqual(status, 200);
    });

    test('Set public key without token returns 401', async () => {
      const { status } = await api('POST', '/api/me/publicKey', { publicKey: 'b2JQdWJsaWNLZXk=' });
      assert.strictEqual(status, 401);
    });

    test('Set public key without body returns 400', async () => {
      const { status } = await api('POST', '/api/me/publicKey', {}, aliceToken);
      assert.strictEqual(status, 400);
    });

    test('Get public key for user who set it returns 200 and key', async () => {
      const { status, data } = await api('GET', '/api/users/alice/publicKey');
      assert.strictEqual(status, 200);
      assert.strictEqual(data.username, 'alice');
      assert.strictEqual(data.publicKey, 'YWxpY2VQdWJsaWNLZXk=');
    });

    test('Get public key for user who did not set returns 404', async () => {
      const { status } = await api('GET', '/api/users/bob/publicKey');
      assert.strictEqual(status, 404);
    });

    test('Get public key for non-existent user returns 404', async () => {
      const { status } = await api('GET', '/api/users/nonexistent/publicKey');
      assert.strictEqual(status, 404);
    });

    test('Bob sets public key then get returns it', async () => {
      const login = await api('POST', '/api/login', { username: 'bob', password: 'bob456' });
      bobToken = login.data.token;
      await api('POST', '/api/me/publicKey', { publicKey: 'Ym9iUHVibGljS2V5' }, bobToken);
      const { status, data } = await api('GET', '/api/users/bob/publicKey');
      assert.strictEqual(status, 200);
      assert.strictEqual(data.publicKey, 'Ym9iUHVibGljS2V5');
    });
  });

  describe('5. Logout', () => {
    test('Logout with valid token returns 200', async () => {
      const login = await api('POST', '/api/login', { username: 'charlie', password: 'charlie789' });
      const { status } = await api('POST', '/api/logout', null, login.data.token);
      assert.strictEqual(status, 200);
    });

    test('Logout without token returns 401', async () => {
      const { status } = await api('POST', '/api/logout');
      assert.strictEqual(status, 401);
    });
  });

  describe('5b. Friend requests', () => {
    test('Alice sends friend request to Bob returns 201', async () => {
      const aliceLogin = await api('POST', '/api/login', { username: 'alice', password: 'alice123' });
      const { status, data } = await api('POST', '/api/friend-requests', { toUsername: 'bob' }, aliceLogin.data.token);
      assert.strictEqual(status, 201);
      assert.strictEqual(data.from_username, 'alice');
      assert.strictEqual(data.to_username, 'bob');
      assert.strictEqual(data.status, 'pending');
    });

    test('Bob accepts friend request returns 200', async () => {
      const bobLogin = await api('POST', '/api/login', { username: 'bob', password: 'bob456' });
      const { status } = await api('POST', '/api/friend-requests/accept', { fromUsername: 'alice' }, bobLogin.data.token);
      assert.strictEqual(status, 200);
    });

    test('GET /api/users with auth includes relationship', async () => {
      const aliceLogin = await api('POST', '/api/login', { username: 'alice', password: 'alice123' });
      const { status, data } = await api('GET', '/api/users', null, aliceLogin.data.token);
      assert.strictEqual(status, 200);
      const bobUser = (data.users || []).find((u) => u.username === 'bob');
      assert.ok(bobUser);
      assert.strictEqual(bobUser.relationship, 'friend');
    });
  });

  describe('6. Messaging (Socket.IO)', () => {
    test('Two users connect, one sends message, other receives it', async () => {
      const { io } = require('socket.io-client');
      const aliceLogin = await api('POST', '/api/login', { username: 'alice', password: 'alice123' });
      const bobLogin = await api('POST', '/api/login', { username: 'bob', password: 'bob456' });

      const aliceToken = aliceLogin.data.token;
      const bobToken = bobLogin.data.token;

      const baseUrl = BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '');
      const socketUrl = BASE_URL.startsWith('http') ? new URL(BASE_URL).origin : BASE_URL;

      const aliceSocket = io(socketUrl, { transports: ['websocket'], forceNew: true });
      const bobSocket = io(socketUrl, { transports: ['websocket'], forceNew: true });

      const aliceAuthed = new Promise((resolve, reject) => {
        aliceSocket.on('auth_ok', (d) => resolve(d));
        aliceSocket.on('auth_fail', (e) => reject(new Error(e.error)));
      });
      const bobAuthed = new Promise((resolve, reject) => {
        bobSocket.on('auth_ok', (d) => resolve(d));
        bobSocket.on('auth_fail', (e) => reject(new Error(e.error)));
      });

      aliceSocket.connect();
      bobSocket.connect();
      aliceSocket.emit('auth', { token: aliceToken });
      bobSocket.emit('auth', { token: bobToken });

      await Promise.all([aliceAuthed, bobAuthed]);

      const received = new Promise((resolve) => {
        bobSocket.on('message', (msg) => resolve(msg));
      });

      aliceSocket.emit('message', {
        to: 'bob',
        ciphertext: 'dGVzdEVuY3J5cHRlZA==',
        iv: 'aW52ZWN0b3IxMjM=',
        ephemeralPublicKey: 'c29tZUtleQ==',
        messageId: 'test-msg-001',
      });

      const msg = await Promise.race([
        received,
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout waiting for message')), 3000)),
      ]);

      assert.strictEqual(msg.from, 'alice');
      assert.strictEqual(msg.to, 'bob');
      assert.strictEqual(msg.ciphertext, 'dGVzdEVuY3J5cHRlZA==');
      assert.strictEqual(msg.messageId, 'test-msg-001');

      aliceSocket.close();
      bobSocket.close();
    });

    test('Unauthenticated socket cannot send messages (no auth)', async () => {
      const { io } = require('socket.io-client');
      const socketUrl = BASE_URL.startsWith('http') ? new URL(BASE_URL).origin : BASE_URL;
      const socket = io(socketUrl, { transports: ['websocket'], forceNew: true });
      socket.connect();

      const authFail = new Promise((resolve) => socket.on('auth_fail', resolve));
      socket.emit('auth', { token: 'invalid-token' });
      await authFail;
      socket.close();
    });
  });

  describe('7. Root (API-only)', () => {
    test('GET / returns 404 when no static client is deployed', async () => {
      const res = await fetch(BASE_URL + '/');
      assert.strictEqual(res.status, 404);
      const text = await res.text();
      assert.ok(text.includes('Secure Chat') || text.includes('API'));
    });
  });
});
