'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderDown,
  Sparkles,
  BookOpen,
  ArrowRight,
  Clock,
  Layers,
  GraduationCap
} from 'lucide-react';

export default function ResourcesListPage() {
  return (
    <div className="min-h-[85vh] bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center font-sans px-4 sm:px-8 py-12">
      <main className="max-w-xl w-full mx-auto text-center space-y-6 animate-fade-in">
        
        {/* Glowing Icon Card */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#0B192C] via-blue-700 to-indigo-600 dark:from-blue-600 dark:to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/25 mx-auto ring-8 ring-blue-500/10 dark:ring-blue-500/20">
            <FolderDown className="w-12 h-12 text-white stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 border-2 border-white dark:border-black">
            <Sparkles className="w-2.5 h-2.5" /> Coming Soon
          </div>
        </div>

        {/* Content Title & Subtitle */}
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 inline-flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5" /> Under Active Preparation
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Resource Library &amp; PDF Books
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Curated course E-books, high-yield formula cheat sheets, lecture notes, and downloadable revision materials are currently being prepared.
          </p>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-left">
          <div className="bg-white dark:bg-[#0D0D12] border border-slate-200/80 dark:border-[#242033] p-3.5 rounded-2xl shadow-xs space-y-1.5">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">PDF E-Books</h4>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2">Standard course textbooks &amp; theory notes.</p>
          </div>
          <div className="bg-white dark:bg-[#0D0D12] border border-slate-200/80 dark:border-[#242033] p-3.5 rounded-2xl shadow-xs space-y-1.5">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Formula Sheets</h4>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2">Quick recall equation sheets &amp; summaries.</p>
          </div>
          <div className="bg-white dark:bg-[#0D0D12] border border-slate-200/80 dark:border-[#242033] p-3.5 rounded-2xl shadow-xs space-y-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Study Modules</h4>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2">Topic-wise practice booklets &amp; manuals.</p>
          </div>
        </div>

        {/* Quick Nav Action */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#0B192C] hover:bg-[#060E18] dark:bg-blue-600 dark:hover:bg-blue-500 shadow-md shadow-slate-900/10 dark:shadow-blue-600/20 transition-all cursor-pointer"
          >
            Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/mock-tests"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181622] border border-slate-200 dark:border-[#242033] transition-all cursor-pointer"
          >
            Take Mock Tests
          </Link>
        </div>

      </main>
    </div>
  );
}
