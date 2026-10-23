'use client';

import React from 'react';
import { AuthView } from '@/components/auth/AuthView';

/**
 * Root Application Entry:
 * Direct Login Screen without unnecessary landing/welcome page.
 * If user is authenticated, AuthWatcher / AuthView redirects them directly to /dashboard.
 */
export default function RootHomePage() {
  return <AuthView initialMode="signin" />;
}
