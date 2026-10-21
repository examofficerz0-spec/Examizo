'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, LifeBuoy } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console or error reporting service
    console.error('[Examizo App Error]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center font-sans px-4 sm:px-8 py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-md w-full mx-auto text-center space-y-6 relative z-10 animate-fade-in">
        {/* Error Shield Glow */}
        <div className="relative inline-block">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-xl shadow-rose-500/20 mx-auto ring-8 ring-rose-500/10 dark:ring-rose-500/20">
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-white stroke-[1.75]" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 inline-flex items-center gap-1.5 shadow-2xs">
            <LifeBuoy className="w-3.5 h-3.5" /> Portal Error Handler
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Something went sideways
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            We encountered an unexpected issue while loading this page or session. Your examination data and account records are secure.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>

        {/* Error Code & Reference */}
        {error?.digest && (
          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-4">
            Error Signature: {error.digest}
          </p>
        )}
      </main>
    </div>
  );
}
