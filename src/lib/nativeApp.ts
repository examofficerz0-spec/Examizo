'use client';

/**
 * Examizo Native Mobile App Bridge & Fast-Path Session Utility
 * 
 * Provides seamless coordination between Capacitor Native Android container
 * and Next.js web application for zero-flicker cold boots, local caching,
 * and splash screen control.
 */

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return /ExamizoApp|Capacitor/i.test(navigator.userAgent) || Boolean((window as any).Capacitor);
}

/**
 * Checks if the student has an active local session flag or populated dashboard cache.
 * Executes synchronously in 0ms without network roundtrips.
 */
export function hasSavedSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem('examizo_logged_in') === 'true') {
      return true;
    }
    const rawCache = localStorage.getItem('__SWR_dashboard_cache__');
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (parsed?.data?.user) {
        return true;
      }
    }
  } catch (_) {}
  return false;
}

/**
 * Stores local session indicators upon successful authentication or profile switch.
 */
export function markSessionActive(email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('examizo_logged_in', 'true');
    localStorage.setItem('examizo_last_active', Date.now().toString());
    if (email) {
      localStorage.setItem('examizo_user_email', email.toLowerCase().trim());
    }
  } catch (_) {}
}

/**
 * Clears local session indicators upon sign-out or session revocation.
 */
export function markSessionEnded(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('examizo_logged_in');
    localStorage.removeItem('examizo_user_email');
    localStorage.removeItem('examizo_last_active');
  } catch (_) {}
}

/**
 * Smoothly dismisses the native Android/iOS splash screen once the web view
 * has mounted the target view (e.g. Dashboard, Profile switcher, or Login).
 */
export async function hideNativeSplashScreen(fadeOutDuration = 300): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (isNativeApp()) {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide({ fadeOutDuration });
    }
  } catch (_) {
    // Graceful fallback for non-native browsers
  }
}
