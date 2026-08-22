// Universal Stale-While-Revalidate (SWR) cache engine for instant 0ms rendering with real-time background sync

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userEmail?: string;
}

const memoryStore: Record<string, CacheEntry<any>> = {};
const subscribers: Map<string, Set<(data: any) => void>> = new Map();

// Cross-context Broadcast Channel for instant live synchronization across tabs and portals
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('examizo_live_sync_channel');
    broadcastChannel.onmessage = (event) => {
      const { type, key, data } = event.data || {};
      if (type === 'SWR_UPDATE' && key && data !== undefined) {
        setSwrCache(key, data, undefined, false);
      } else if (type === 'TRIGGER_PREFETCH') {
        prefetchAllStudentData();
      }
    };
  } catch (_) {}
}

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
 * Updates cache in memory and persistent storage, notifying active listeners and broadcasting updates.
 */
export function setSwrCache<T = any>(key: string, data: T, userEmail?: string, broadcast = true): void {
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

  // Notify local subscribers
  const keySubs = subscribers.get(key);
  if (keySubs) {
    keySubs.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[SWR] Error notifying listener for ${key}:`, err);
      }
    });
  }

  // Broadcast to other tabs/windows
  if (broadcast && broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'SWR_UPDATE', key, data });
    } catch (_) {}
  }
}

/**
 * Subscribes to real-time SWR cache updates for a given key.
 * Returns an unsubscribe function.
 */
export function subscribeSwrCache<T = any>(key: string, callback: (data: T) => void): () => void {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  const subs = subscribers.get(key)!;
  subs.add(callback);

  // Return unsubscribe cleanup function
  return () => {
    subs.delete(callback);
    if (subs.size === 0) {
      subscribers.delete(key);
    }
  };
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

let isPrefetching = false;
let lastPrefetchTime = 0;

/**
 * Concurrently prefetches and caches ALL student portal module data in the background.
 * Loads Dashboard, Mock Tests, Practice Sets, Weekly DPP, Leaderboard, Gallery, and Courses simultaneously.
 */
export async function prefetchAllStudentData(force = false): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  // Throttle prefetch to at most once every 3 seconds unless forced
  if (isPrefetching || (!force && now - lastPrefetchTime < 3000)) {
    return;
  }

  isPrefetching = true;
  lastPrefetchTime = now;

  try {
    await Promise.allSettled([
      // 1. Dashboard data
      fetch('/api/dashboard', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error) {
            const cacheObj = {
              user: data.user || null,
              mockTests: Array.isArray(data.mockTests) ? data.mockTests : [],
              leaderboard: Array.isArray(data.topLeaderboard) ? data.topLeaderboard : [],
              incorrectLog: Array.isArray(data.incorrectLog) ? data.incorrectLog : [],
            };
            setSwrCache('dashboard_cache', cacheObj, data.user?.email);
          }
        })
        .catch(() => {}),

      // 2. Mock Tests
      fetch('/api/mock-tests', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.tests)) {
            setSwrCache('mock_tests', data.tests);
          }
        })
        .catch(() => {}),

      // 3. Practice Sets & Weekly DPP
      Promise.all([
        fetch('/api/practice', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/weekly-dpp', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]).then(([pData, dppData]) => {
        if (pData && !pData.error) {
          const newWeeklyDpp = dppData?.weeklyDpps && dppData.weeklyDpps.length > 0 ? dppData.weeklyDpps[0] : null;
          const cacheObj = {
            questions: pData.questions || [],
            topicCounts: pData.topicCounts || {},
            courseName: pData.courseName || '',
            courseSubjects: pData.courseSubjects || [],
            completedTopics: pData.completedTopics || [],
            userAttempts: pData.userAttempts || [],
            publishedWeeklyDpp: newWeeklyDpp,
          };
          setSwrCache('practice_cache', cacheObj);
        }
      }).catch(() => {}),

      // 4. Leaderboard
      fetch('/api/leaderboard', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error) {
            setSwrCache('leaderboard_cache', data);
          }
        })
        .catch(() => {}),

      // 5. Gallery
      fetch('/api/gallery', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.success && Array.isArray(data.gallery)) {
            setSwrCache('student_gallery_cache', data.gallery);
          }
        })
        .catch(() => {}),

      // 6. Courses
      fetch('/api/courses', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.courses)) {
            setSwrCache('courses_cache', data.courses);
          }
        })
        .catch(() => {}),
    ]);
  } finally {
    isPrefetching = false;
  }
}
