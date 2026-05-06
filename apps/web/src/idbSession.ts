/**
 * Persists ECDH key pair in IndexedDB so a full page reload can restore E2E session
 * without forcing logout. Cleared on explicit logout only.
 */

const DB_NAME = 'CipherChatSession';
const STORE = 'cryptoSession';
const VERSION = 1;

interface Row {
  id: string;
  username: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
}

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
  });
}

export async function saveKeySession(username: string, pair: CryptoKeyPair): Promise<void> {
  const subtle = crypto.subtle;
  const publicJwk = (await subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  const privateJwk = (await subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
  const u = username.trim().toLowerCase();
  const row: Row = { id: 'current', username: u, publicJwk, privateJwk };
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadKeySession(expectedUsername: string): Promise<CryptoKeyPair | null> {
  const u = expectedUsername.trim().toLowerCase();
  const db = await open();
  const row = await new Promise<Row | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('current');
    req.onsuccess = () => resolve(req.result as Row | undefined);
    req.onerror = () => reject(req.error);
  });
  if (!row || row.username !== u) return null;
  const subtle = crypto.subtle;
  try {
    const publicKey = await subtle.importKey(
      'jwk',
      row.publicJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
    const privateKey = await subtle.importKey(
      'jwk',
      row.privateJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits', 'deriveKey'],
    );
    return { publicKey, privateKey };
  } catch {
    return null;
  }
}

export async function clearKeySession(): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete('current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}
