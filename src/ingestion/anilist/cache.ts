import type { AniListMedia } from "./types.js";

/**
 * IndexedDB-backed cache for full AniList `Media` objects, keyed by AniList
 * id, with a 7-day TTL and a basic size cap so long-lived sessions don't
 * grow unbounded.
 *
 * ENVIRONMENT NOTE: this runs in two contexts —
 *  - In the browser (the real deployment target), `indexedDB` is used
 *    directly.
 *  - In Vitest (Node), `indexedDB` is `undefined`, so this falls back to a
 *    correct, in-memory `Map`-based implementation with identical TTL/
 *    eviction semantics. This keeps unit tests fast and dependency-free
 *    while still exercising the real caching logic (TTL expiry, eviction
 *    order) rather than skipping it. The in-memory fallback is intentionally
 *    NOT persistent across process restarts — only the real IndexedDB path
 *    is, which is fine since the in-memory path only exists for tests /
 *    non-browser environments.
 */

const DB_NAME = "sequitur-anilist-cache";
const STORE_NAME = "media";
const DB_VERSION = 1;

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 500;

interface CacheEntry {
  anilistId: number;
  media: AniListMedia;
  cachedAt: number;
}

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

// --- In-memory fallback (used when `indexedDB` is unavailable) ---

const memoryStore = new Map<number, CacheEntry>();

function memoryGet(anilistId: number): CacheEntry | null {
  return memoryStore.get(anilistId) ?? null;
}

function memorySet(entry: CacheEntry): void {
  // Re-inserting moves the key to the end of Map's iteration order, which
  // we rely on below to treat "oldest inserted" as an eviction proxy.
  memoryStore.delete(entry.anilistId);
  memoryStore.set(entry.anilistId, entry);
  evictMemoryIfOverCap();
}

function evictMemoryIfOverCap(): void {
  while (memoryStore.size > MAX_ENTRIES) {
    let oldestKey: number | null = null;
    let oldestAt = Infinity;
    for (const entry of memoryStore.values()) {
      if (entry.cachedAt < oldestAt) {
        oldestAt = entry.cachedAt;
        oldestKey = entry.anilistId;
      }
    }
    if (oldestKey === null) break;
    memoryStore.delete(oldestKey);
  }
}

/** Test-only helper to reset the in-memory fallback between test cases. */
export function __resetMemoryCacheForTests(): void {
  memoryStore.clear();
}

// --- IndexedDB-backed implementation ---

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "anilistId" });
        store.createIndex("cachedAt", "cachedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB cache."));
  });
  return dbPromise;
}

async function idbGet(anilistId: number): Promise<CacheEntry | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(anilistId);
    request.onsuccess = () => resolve((request.result as CacheEntry | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed."));
  });
}

async function idbSet(entry: CacheEntry): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed."));
  });
  await idbEvictIfOverCap();
}

async function idbEvictIfOverCap(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      const overBy = countRequest.result - MAX_ENTRIES;
      if (overBy <= 0) return;
      const index = store.index("cachedAt");
      let deleted = 0;
      const cursorRequest = index.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || deleted >= overBy) return;
        cursor.delete();
        deleted += 1;
        cursor.continue();
      };
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB eviction failed."));
  });
}

// --- Public API ---

/** Returns the cached `AniListMedia` for `anilistId`, or `null` on a miss/stale entry. */
export async function getCached(anilistId: number): Promise<AniListMedia | null> {
  const entry = hasIndexedDB() ? await idbGet(anilistId) : memoryGet(anilistId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) return null;
  return entry.media;
}

/** Caches `media` under `anilistId`, evicting the oldest entries beyond the size cap. */
export async function setCached(anilistId: number, media: AniListMedia): Promise<void> {
  const entry: CacheEntry = { anilistId, media, cachedAt: Date.now() };
  if (hasIndexedDB()) {
    await idbSet(entry);
  } else {
    memorySet(entry);
  }
}
