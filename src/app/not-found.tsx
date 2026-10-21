import React from 'react';
import Link from 'next/link';
import { Compass, Home, BookOpen, FileText, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center font-sans px-4 sm:px-8 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-md w-full mx-auto text-center space-y-6 relative z-10 animate-fade-in">
        {/* Floating 404 Badge */}
        <div className="relative inline-block">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/25 mx-auto ring-8 ring-blue-500/10 dark:ring-blue-500/20">
            <Compass className="w-12 h-12 sm:w-14 sm:h-14 text-white stroke-[1.75] animate-pulse" />
          </div>
          <span className="absolute -bottom-2 right-1/2 translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-md">
            404 Error
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2 pt-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            The page, assessment, or resource you are looking for has been moved, archived, or does not exist.
          </p>
        </div>

        {/* Navigation Quick Shortcuts */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-left">
          <Link
            href="/dashboard"
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Home className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                Dashboard
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              Return to your home screen
            </p>
          </Link>

          <Link
            href="/mock-tests"
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                Mock Tests
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              Active test examination papers
            </p>
          </Link>
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
          >
            Go to Student Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
