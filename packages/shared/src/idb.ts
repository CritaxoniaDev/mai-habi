/**
 * A very small IndexedDB helper.
 *
 * The editor only needs key/value semantics over three stores, so a dependency
 * on a wrapper library would cost more than it saves.
 */

const DB_NAME = 'mai-habi';
const DB_VERSION = 1;

export const STORE_PROJECTS = 'projects';
export const STORE_FILES = 'files';
export const STORE_KV = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'projectId' });
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab.'));
  });

  return dbPromise;
}

function run<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = action(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
      }),
  );
}

export function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return run<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function idbGetAll<T>(store: string): Promise<T[]> {
  return run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbPut<T>(store: string, value: T): Promise<IDBValidKey> {
  return run<IDBValidKey>(store, 'readwrite', (s) => s.put(value as unknown as object));
}

export function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  return run<undefined>(store, 'readwrite', (s) => s.delete(key)).then(() => undefined);
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await idbGet<{ key: string; value: T }>(STORE_KV, key);
  return row?.value;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await idbPut(STORE_KV, { key, value });
}
