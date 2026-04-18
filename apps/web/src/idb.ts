/**
 * IndexedDB persistence for chat history (client-side only).
 */

const DB_NAME = 'SecureChatHistory';
const STORE = 'conversations';
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB not available'));
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, VERSION);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE, { keyPath: 'convId' });
    };
  });
}

function convId(me: string, other: string): string {
  return [me, other].filter(Boolean).sort().join('_');
}

export interface StoredMessage {
  text: string;
  attachment?: { type: string; name?: string; data?: string; mime?: string };
  at: number;
  own: boolean;
  replyTo?: { id: string; text: string };
}

export async function getMessages(me: string, other: string): Promise<StoredMessage[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(convId(me, other));
    req.onsuccess = () => resolve((req.result?.messages as StoredMessage[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function addMessage(me: string, other: string, msg: StoredMessage): Promise<void> {
  const db = await open();
  const cid = convId(me, other);
  const existing = await getMessages(me, other);
  existing.push(msg);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ convId: cid, messages: existing });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
