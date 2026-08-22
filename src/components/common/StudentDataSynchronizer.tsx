'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { prefetchAllStudentData } from '@/lib/swrCache';

const PUBLIC_PATHS = ['/login', '/register', '/', '/privacy', '/terms'];

export function StudentDataSynchronizer() {
  const pathname = usePathname();

  useEffect(() => {
    // Only synchronize for logged in student application pages
    if (PUBLIC_PATHS.includes(pathname)) {
      return;
    }

    let isMounted = true;

    // 1. Instant concurrent prefetch of ALL student portal data on initial app load
    prefetchAllStudentData(true);

    // 2. Periodic background silent revalidation every 10 seconds to keep live data fresh
    const interval = setInterval(() => {
      if (isMounted && document.visibilityState === 'visible') {
        prefetchAllStudentData(false);
      }
    }, 10000);

    // 3. Instant revalidation when student switches back to the tab/window
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        prefetchAllStudentData(false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, [pathname]);

  return null;
}
