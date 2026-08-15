// Centralized client-side cache manager to prevent cross-account data leakage

export function clearAllClientUserCaches() {
  if (typeof window === 'undefined') return;
  try {
    delete (window as any).__DASHBOARD_CACHE__;
    delete (window as any).__PRACTICE_CACHE__;
    delete (window as any).__MOCK_TESTS_CACHE__;
    delete (window as any).__LEADERBOARD_CACHE__;
    delete (window as any).__RESOURCES_CACHE__;
    
    // Clear user session storage items
    sessionStorage.removeItem('examizo_cached_course_name');
    sessionStorage.removeItem('examizo_is_sub_profile');
    sessionStorage.removeItem('exammaster_cached_user');
    sessionStorage.clear();
  } catch (e) {
    console.warn('[clientCache] Clear error:', e);
  }
}

export function getClientUserCache<T = any>(key: string, currentEmail?: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = (window as any)[key];
    if (!raw) return null;

    // If cache contains a user tag, verify it matches the current user email
    if (currentEmail && raw.userEmail && raw.userEmail.toLowerCase() !== currentEmail.toLowerCase()) {
      delete (window as any)[key];
      return null;
    }

    return raw.data !== undefined ? raw.data : raw;
  } catch (e) {
    return null;
  }
}

export function setClientUserCache(key: string, data: any, userEmail?: string) {
  if (typeof window === 'undefined') return;
  try {
    (window as any)[key] = {
      data,
      userEmail: userEmail ? userEmail.toLowerCase() : '',
      timestamp: Date.now(),
    };
  } catch (e) {}
}
