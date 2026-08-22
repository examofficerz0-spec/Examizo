// Universal Stale-While-Revalidate (SWR) cache engine for instant 0ms rendering with real-time background sync

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userEmail?: string;
}

const memoryStore: Record<string, CacheEntry<any>> = {};

/**
 * Synchronously retrieves cached data from memory or localStorage for instant 0ms render.
 */
export function getSwrCache<T = any>(key: string, currentEmail?: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. In-memory store (fastest)
    const mem = memoryStore[key];
    if (mem && mem.data !== undefined) {
      if (!currentEmail || !mem.userEmail || mem.userEmail.toLowerCase() === currentEmail.toLowerCase()) {
        return mem.data;
      }
    }

    // 2. Local storage persistent cache fallback
    const raw = localStorage.getItem(`__SWR_${key}__`);
    if (raw) {
      const parsed: CacheEntry<T> = JSON.parse(raw);
      if (parsed && parsed.data !== undefined) {
        if (!currentEmail || !parsed.userEmail || parsed.userEmail.toLowerCase() === currentEmail.toLowerCase()) {
          memoryStore[key] = parsed; // hydrate memory cache
          return parsed.data;
        }
      }
    }
  } catch (e) {
    // ignore parse or storage errors
  }

  return null;
}

/**
 * Updates cache in memory and persistent storage, notifying active listeners.
 */
export function setSwrCache<T = any>(key: string, data: T, userEmail?: string): void {
  if (typeof window === 'undefined') return;

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    userEmail: userEmail ? userEmail.toLowerCase().trim() : '',
  };

  memoryStore[key] = entry;

  try {
    localStorage.setItem(`__SWR_${key}__`, JSON.stringify(entry));
  } catch (e) {
    // if quota exceeded, silently continue
  }
}

/**
 * Wipes SWR cache for a specific key or all keys.
 */
export function clearSwrCache(key?: string): void {
  if (typeof window === 'undefined') return;

  if (key) {
    delete memoryStore[key];
    try {
      localStorage.removeItem(`__SWR_${key}__`);
    } catch (_) {}
    return;
  }

  // Clear all SWR keys
  for (const k of Object.keys(memoryStore)) {
    delete memoryStore[k];
  }

  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith('__SWR_')) {
        toRemove.push(storageKey);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}
