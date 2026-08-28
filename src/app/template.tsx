'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const TAB_ORDER: Record<string, number> = {
  '/': -1,
  '/dashboard': 0,
  '/mock-tests': 1,
  '/practice': 2,
  '/resources': 3,
  '/leaderboard': 4,
  '/profile': 5,
  '/course-selection': 6,
};

let previousGlobalPath: string | null = null;

function getTabAnimation(currentPath: string, prevPath: string | null): string {
  if (!prevPath || prevPath === currentPath) {
    return 'animate-page-enter';
  }

  let prevIndex = -1;
  let currIndex = -1;

  for (const [route, idx] of Object.entries(TAB_ORDER)) {
    if (prevPath === route || (route !== '/' && route !== '/dashboard' && prevPath.startsWith(route))) {
      prevIndex = idx;
    }
    if (currentPath === route || (route !== '/' && route !== '/dashboard' && currentPath.startsWith(route))) {
      currIndex = idx;
    }
  }

  if (prevIndex !== -1 && currIndex !== -1 && prevIndex !== currIndex) {
    return currIndex > prevIndex ? 'animate-tab-slide-right' : 'animate-tab-slide-left';
  }

  return 'animate-page-enter';
}

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Compute animation synchronously on mount so the first painted frame is animated
  const [animClass] = useState(() => {
    const prev =
      previousGlobalPath ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('ez_student_last_path') : null);
    return getTabAnimation(pathname, prev);
  });

  useEffect(() => {
    previousGlobalPath = pathname;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ez_student_last_path', pathname);
    }
  }, [pathname]);

  return (
    <div key={pathname} className={`w-full min-h-full ${animClass}`}>
      {/* Sleek top micro-glow bar for instant screen switch feedback */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 z-50 pointer-events-none animate-screen-switch-bar shadow-[0_1px_8px_rgba(59,130,246,0.5)]" />
      {children}
    </div>
  );
}
