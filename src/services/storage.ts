// IndexedDB 加密存储：业务数据仅在内存中保持明文，落库统一使用 AES-256-GCM。

const PREFIX = 'island.v1.';
const DB_NAME = 'bozen-secure-v1';
const DATA_STORE = 'encrypted-data';
const META_STORE = 'crypto-meta';
const AES_KEY_ID = 'aes-256-key';
const CLEANUP_VERSION_KEY = 'migration.daily-cleanup-2026-07-17';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const cache = new Map<string, unknown>();

interface EncryptedRecord {
  key: string;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore(DATA_STORE, { keyPath: 'key' });
      db.createObjectStore(META_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getEncryptionKey(db: IDBDatabase): Promise<CryptoKey> {
  const tx = db.transaction(META_STORE, 'readwrite');
  const store = tx.objectStore(META_STORE);
  const existing = await request(store.get(AES_KEY_ID)) as CryptoKey | undefined;
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  store.put(key, AES_KEY_ID);
  return key;
}

let dbPromise: Promise<IDBDatabase> | undefined;
let keyPromise: Promise<CryptoKey> | undefined;
let writeQueue: Promise<void> = Promise.resolve();

function db(): Promise<IDBDatabase> {
  return dbPromise ??= openDb();
}

function aesKey(): Promise<CryptoKey> {
  return keyPromise ??= db().then(getEncryptionKey);
}

async function persist(key: string, value: unknown): Promise<void> {
  writeQueue = writeQueue.then(() => persistNow(key, value), () => persistNow(key, value));
  return writeQueue;
}

async function persistNow(key: string, value: unknown): Promise<void> {
  const [database, encryptionKey] = await Promise.all([db(), aesKey()]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, plaintext);
  database.transaction(DATA_STORE, 'readwrite').objectStore(DATA_STORE).put({ key, iv: iv.buffer as ArrayBuffer, ciphertext } satisfies EncryptedRecord);
}

async function removePersisted(key: string): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const database = await db();
    database.transaction(DATA_STORE, 'readwrite').objectStore(DATA_STORE).delete(key);
  });
  return writeQueue;
}

/** 启动时解密全部数据到内存，并迁移旧版 localStorage 明文数据。 */
export async function initializeStorage(): Promise<void> {
  const [database, encryptionKey] = await Promise.all([db(), aesKey()]);
  const records = await request(database.transaction(DATA_STORE).objectStore(DATA_STORE).getAll()) as EncryptedRecord[];
  for (const record of records) {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv }, encryptionKey, record.ciphertext);
    cache.set(record.key, JSON.parse(decoder.decode(plaintext)) as unknown);
  }

  const legacyKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => key !== null && key.startsWith(PREFIX));
  for (const fullKey of legacyKeys) {
    const key = fullKey.slice(PREFIX.length);
    const raw = localStorage.getItem(fullKey);
    if (raw !== null && !cache.has(key)) {
      let value: unknown = raw;
      try { value = JSON.parse(raw) as unknown; } catch { /* 兼容旧字符串 */ }
      cache.set(key, value);
      await persist(key, value);
    }
    localStorage.removeItem(fullKey);
  }

  const legacyPin = cache.get('parent.pin');
  if (typeof legacyPin === 'string' && !cache.has('parent.pinHash')) {
    const hash = await sha256(legacyPin);
    cache.set('parent.pinHash', hash);
    await persist('parent.pinHash', hash);
    cache.delete('parent.pin');
    await removePersisted('parent.pin');
  }
}

/** 一次性清理旧任务数据，并让日常配置回到当前种子清单。 */
export function runDailyCleanupMigration(): void {
  if (cache.has(CLEANUP_VERSION_KEY)) return;
  for (const [key, value] of cache) {
    if (key.includes('.habits.done.') || key === 'habits.custom') {
      storage.remove(key);
    } else if (key.includes('.tasks.byDay.') && Array.isArray(value)) {
      storage.set(key, value.filter((task: { status?: string; completedAt?: number }) =>
        task.completedAt == null && task.status !== 'awaiting_review' && task.status !== 'approved'));
    }
  }
  const templates = storage.get<Array<{ once?: boolean }>>('templates.custom', []);
  storage.set('templates.custom', templates.filter((template) => template.once === true));
  storage.set(CLEANUP_VERSION_KEY, true);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    return cache.has(key) ? cache.get(key) as T : fallback;
  },
  set<T>(key: string, value: T): void {
    cache.set(key, value);
    void persist(key, value);
  },
  remove(key: string): void {
    cache.delete(key);
    void removePersisted(key);
  },
  clearAll(): void {
    cache.clear();
    writeQueue = writeQueue.then(async () => {
      const database = await db();
      database.transaction(DATA_STORE, 'readwrite').objectStore(DATA_STORE).clear();
    });
  },
  entries(prefix = ''): Array<[string, unknown]> {
    return Array.from(cache.entries()).filter(([key]) => key.startsWith(prefix));
  },
};
