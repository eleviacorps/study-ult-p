"use client";

const DB_NAME = "studyult-cache";
const DB_VERSION = 2;
const STORE_NAME = "cache";
const META_STORE = "meta";
const MAX_CACHE_ENTRIES = 100;
const MAX_CACHE_SIZE_MB = 50;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        const meta = db.createObjectStore(META_STORE, { keyPath: "key" });
        meta.createIndex("lastAccessed", "lastAccessed", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function touchMeta(key: string) {
  try {
    const db = await openDB();
    const tx = db.transaction(META_STORE, "readwrite");
    const store = tx.objectStore(META_STORE);
    store.put({ key, lastAccessed: Date.now() });
    tx.commit();
    db.close();
  } catch {}
}

async function evictIfNeeded() {
  try {
    const db = await openDB();
    const countTx = db.transaction(STORE_NAME, "readonly");
    const countReq = countTx.objectStore(STORE_NAME).count();
    const count = await new Promise<number>((resolve) => {
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    });
    countTx.commit();
    db.close();

    if (count <= MAX_CACHE_ENTRIES) return;

    const metaDb = await openDB();
    const metaTx = metaDb.transaction(META_STORE, "readonly");
    const index = metaTx.objectStore(META_STORE).index("lastAccessed");
    const allMeta = await new Promise<{ key: string; lastAccessed: number }[]>((resolve) => {
      const req = index.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    metaTx.commit();
    metaDb.close();

    allMeta.sort((a, b) => a.lastAccessed - b.lastAccessed);

    const toEvict = allMeta.slice(0, Math.max(1, Math.floor(count - MAX_CACHE_ENTRIES * 0.8)));
    for (const entry of toEvict) {
      await idbRemove(entry.key);
    }
  } catch {}
}

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  staleAt?: number;
  expiresAt?: number;
  version?: string;
  metadata?: Record<string, unknown>;
};

export async function idbGet<T>(key: string, options: { allowExpired?: boolean; version?: string } = {}): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDB();
    const result = await new Promise<CacheEntry<T> | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) {
          resolve(null);
        } else if (options.version && entry.version !== options.version) {
          resolve(null);
        } else if (!options.allowExpired && entry.expiresAt && Date.now() > entry.expiresAt) {
          resolve(null);
        } else {
          resolve(entry);
        }
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (result) touchMeta(key).catch(() => {});
    return result;
  } catch {
    return null;
  }
}

export async function idbSet<T>(
  key: string,
  data: T,
  options: { ttlMs?: number; staleMs?: number; version?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const now = Date.now();
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        staleAt: options.staleMs ? now + options.staleMs : undefined,
        expiresAt: options.ttlMs ? now + options.ttlMs : undefined,
        version: options.version,
        metadata: options.metadata,
      };
      const req = store.put(entry, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
    await Promise.all([
      touchMeta(key),
      evictIfNeeded(),
    ]);
  } catch {
    // IndexedDB unavailable
  }
}

export function isCacheStale(entry: CacheEntry<unknown>): boolean {
  return !!entry.staleAt && Date.now() > entry.staleAt;
}

export async function idbRemove(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.objectStore(META_STORE).delete(key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable
  }
}

export async function idbClear(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.objectStore(META_STORE).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable
  }
}

export async function idbEntries(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    const count = await new Promise<number>((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}
