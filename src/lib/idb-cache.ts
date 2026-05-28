"use client";

const DB_NAME = "studyult-cache";
const DB_VERSION = 1;
const STORE_NAME = "cache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
    return new Promise((resolve, reject) => {
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
        db.close();
      };
      req.onerror = () => {
        reject(req.error);
        db.close();
      };
    });
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
    return new Promise((resolve, reject) => {
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
      req.onsuccess = () => {
        resolve();
        db.close();
      };
      req.onerror = () => {
        reject(req.error);
        db.close();
      };
    });
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
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => {
        resolve();
        db.close();
      };
      req.onerror = () => {
        reject(req.error);
        db.close();
      };
    });
  } catch {
    // IndexedDB unavailable
  }
}

export async function idbClear(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => {
        resolve();
        db.close();
      };
      req.onerror = () => {
        reject(req.error);
        db.close();
      };
    });
  } catch {
    // IndexedDB unavailable
  }
}
