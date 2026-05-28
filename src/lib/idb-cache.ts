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
};

export async function idbGet<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result || null);
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

export async function idbSet<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
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
