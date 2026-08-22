'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

const TAB_ORDER: Record<string, number> = {
  '/dashboard': 0,
  '/mock-tests': 1,
  '/practice': 2,
  '/resources': 3,
  '/leaderboard': 4,
};

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [animClass, setAnimClass] = useState('animate-page-in');
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current || (typeof window !== 'undefined' ? sessionStorage.getItem('ez_student_last_tab') : null);

    let prevIndex = -1;
    let currIndex = -1;

    for (const [route, idx] of Object.entries(TAB_ORDER)) {
      if (prev && (prev === route || (route !== '/dashboard' && prev.startsWith(route)))) {
        prevIndex = idx;
      }
      if (pathname === route || (route !== '/dashboard' && pathname.startsWith(route))) {
        currIndex = idx;
      }
    }

    if (prevIndex !== -1 && currIndex !== -1 && prevIndex !== currIndex) {
      if (currIndex > prevIndex) {
        // Moving right in navbar (e.g. Dashboard -> Mock Tests) -> enters smoothly from right
        setAnimClass('animate-tab-slide-right');
      } else {
        // Moving left in navbar (e.g. Mock Tests -> Dashboard) -> enters smoothly from left
        setAnimClass('animate-tab-slide-left');
      }
    } else {
      setAnimClass('animate-page-in');
    }

    prevPathRef.current = pathname;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ez_student_last_tab', pathname);
    }
  }, [pathname]);

  return <div className={`w-full min-h-full ${animClass}`}>{children}</div>;
}
