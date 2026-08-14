'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { StudentHeader } from './StudentHeader';
import { useHeader } from '@/context/HeaderContext';

export const GlobalHeader: React.FC = () => {
  const pathname = usePathname();
  const { onBack, hideNav } = useHeader();

  // Hide top header on auth, course-selection, landing page, gallery, and active mock test execution
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/course-selection' ||
    pathname === '/' ||
    pathname === '/gallery' ||
    (pathname.startsWith('/mock-tests/') && pathname !== '/mock-tests')
  ) {
    return null;
  }

  return <StudentHeader onBack={onBack} hideNav={hideNav} />;
};
