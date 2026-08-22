// Centralized client-side cache manager to prevent cross-account data leakage

export function clearAllClientUserCaches(deletedEmail?: string) {
  if (typeof window === 'undefined') return;
  try {
    delete (window as any).__DASHBOARD_CACHE__;
    delete (window as any).__PRACTICE_CACHE__;
    delete (window as any).__MOCK_TESTS_CACHE__;
    delete (window as any).__LEADERBOARD_CACHE__;
    delete (window as any).__RESOURCES_CACHE__;
    delete (window as any).__GALLERY_CACHE__;
    delete (window as any).__USER_PROFILE_CACHE__;
    delete (window as any).__AUTH_USER__;
    
    // Clear user session storage items
    try {
      sessionStorage.clear();
    } catch (_) {}

    // Clean user-specific localStorage items while preserving theme
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('exammaster_theme')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });

      // Also clean saved accounts if deletedEmail was given
      if (deletedEmail) {
        const savedStr = localStorage.getItem('exammaster_saved_accounts');
        if (savedStr) {
          try {
            const accounts = JSON.parse(savedStr);
            if (Array.isArray(accounts)) {
              const filtered = accounts.filter((a: any) => (a.email || '').toLowerCase() !== deletedEmail.toLowerCase());
              localStorage.setItem('exammaster_saved_accounts', JSON.stringify(filtered));
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Clear client-accessible cookies
    try {
      document.cookie = 'student_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    } catch (_) {}
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
