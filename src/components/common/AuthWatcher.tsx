'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { clearAllClientUserCaches } from '@/lib/clientCache';

const PUBLIC_PATHS = ['/login', '/register', '/', '/privacy', '/terms'];

export function AuthWatcher() {
  const pathname = usePathname();
  const isPurgingRef = useRef(false);

  useEffect(() => {
    // Do not run on unauthenticated public routes
    if (PUBLIC_PATHS.includes(pathname)) {
      return;
    }

    let isMounted = true;

    const purgeAndRedirect = async (reason?: string) => {
      if (isPurgingRef.current) return;
      isPurgingRef.current = true;

      console.warn(`[AuthWatcher] Session terminated: ${reason || 'User deleted or unauthorized'}. Purging student data and logging out.`);
      
      // 1. Wipe all local client caches and storage
      clearAllClientUserCaches();

      // 2. Terminate server session cookie
      try {
        await fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {});
      } catch (_) {}

      // 3. Instant client-side redirect to login without requiring reload
      window.location.replace('/login?session_expired=1');
    };

    let failedAttempts = 0;

    const verifySession = async () => {
      if (isPurgingRef.current || !isMounted) return;

      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        });

        if (!isMounted || isPurgingRef.current) return;

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          const data = await res.json().catch(() => null);
          // If explicitly flagged as deleted or suspended, purge immediately
          if (data && (data.deleted === true || data.error?.includes('suspended'))) {
            await purgeAndRedirect(`HTTP_${res.status}_${data.error || 'deleted'}`);
            return;
          }

          failedAttempts++;
          if (failedAttempts >= 2) {
            await purgeAndRedirect(`HTTP_${res.status}`);
          }
          return;
        }

        const data = await res.json().catch(() => null);
        if (!isMounted || isPurgingRef.current) return;

        if (data && data.deleted === true) {
          await purgeAndRedirect(data.error || 'account_deleted');
          return;
        }

        if (data && data.authenticated === true) {
          failedAttempts = 0;
        }
      } catch (err) {
        // Transient network blip; do not log out
      }
    };

    // Initial check
    verifySession();

    // Regular active heartbeat every 4 seconds
    const interval = setInterval(verifySession, 4000);

    // Also check instantly when the window/tab gains focus
    const handleFocus = () => {
      verifySession();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname]);

  return null;
}
