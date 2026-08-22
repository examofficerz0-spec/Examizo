'use client';

import React from 'react';
import { Logo } from '@/components/common/Logo';
import { ShieldCheck, Lock, Sparkles } from 'lucide-react';

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  inline?: boolean;
  minHeight?: string;
}

export function PageLoader({
  title = 'Loading Examination Portal',
  subtitle = 'Syncing real-time records and curriculum data...',
  badgeText = 'Examizo Cloud System',
  inline = false,
  minHeight,
}: PageLoaderProps) {
  if (inline) {
    return (
      <div className={`w-full flex flex-col items-center justify-center p-8 text-center select-none ${minHeight || 'min-h-[260px]'}`}>
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 dark:bg-purple-500/10 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 dark:border-t-purple-500 border-r-blue-400 dark:border-r-purple-300 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-indigo-500 dark:border-b-blue-400 border-l-indigo-300 animate-[spin_1.5s_linear_infinite_reverse]" />
          <div className="relative z-10 p-1.5 bg-white dark:bg-[#181622] rounded-xl shadow-xs border border-slate-100 dark:border-[#242033]">
            <Logo size={24} showText={false} />
          </div>
        </div>
        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
        <div className="w-36 h-1 bg-slate-100 dark:bg-[#181622] rounded-full overflow-hidden relative mt-3 border border-slate-200/50 dark:border-[#242033]">
          <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-purple-600 dark:to-blue-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden font-sans">
      {/* Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 dark:bg-purple-600/20 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-600/10 dark:bg-purple-800/15 blur-[100px] pointer-events-none rounded-full" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm w-full p-8 sm:p-10 rounded-3xl bg-white/90 dark:bg-[#0D0D12]/90 backdrop-blur-xl border border-slate-200/90 dark:border-[#242033] shadow-xl dark:shadow-2xl animate-fade-in">
        
        {/* Glowing Animated Spinner / Logo Center */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 dark:bg-purple-500/10 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 dark:border-t-purple-500 border-r-blue-400 dark:border-r-purple-300 animate-spin" />
          <div className="absolute inset-2.5 rounded-full border-2 border-transparent border-b-indigo-500 dark:border-b-blue-400 border-l-indigo-300 dark:border-l-blue-200 animate-[spin_2s_linear_infinite_reverse]" />
          <div className="relative z-10 p-2.5 bg-white dark:bg-[#181622] rounded-2xl shadow-sm border border-slate-100 dark:border-[#242033]">
            <Logo size={34} showText={false} />
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-1.5">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-1.5 bg-slate-100 dark:bg-[#181622] rounded-full overflow-hidden relative border border-slate-200/50 dark:border-[#242033]">
            <div className="absolute top-0 bottom-0 left-0 w-2/5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-purple-600 dark:via-blue-500 dark:to-purple-600 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>{badgeText}</span>
            <span className="text-blue-600 dark:text-purple-400 font-mono">Syncing...</span>
          </div>
        </div>

        {/* Security & Feature Badges */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#181622] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#242033] inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Fast Sync
          </span>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#181622] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#242033] inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-500" /> Active Session
          </span>
        </div>

      </div>
    </div>
  );
}
