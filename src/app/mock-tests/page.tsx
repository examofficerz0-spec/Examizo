'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentHeader } from '@/components/layout/StudentHeader';
import Link from 'next/link';
import { FileText, PlayCircle, AlertTriangle, ShieldAlert, RotateCcw, X, BookOpen, ArrowRight } from 'lucide-react';
import { DigiLockerGuard } from '@/components/ui/DigiLockerModal';
import { getClientUserCache, setClientUserCache } from '@/lib/clientCache';

export default function MockTestsListPage() {
  const router = useRouter();
  const initialCache = getClientUserCache('__MOCK_TESTS_CACHE__');
  const hasValidCache = Boolean(initialCache && Array.isArray(initialCache) && initialCache.length > 0);
  const [tests, setTests] = useState<any[]>(hasValidCache ? initialCache : []);
  const [loading, setLoading] = useState<boolean>(!hasValidCache);
  const [filterType, setFilterType] = useState<'all' | 'full' | 'sectional'>('all');

  // Pre-test warning modal state
  const [pendingTestId, setPendingTestId] = useState<string | null>(null);
  const [showPreTestModal, setShowPreTestModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    fetch('/api/mock-tests', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.tests) ? data.tests : [];
        if (list.length > 0) {
          setClientUserCache('__MOCK_TESTS_CACHE__', list);
        }
        setTests(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredTests = tests.filter((t) => {
    if (filterType === 'all') return true;
    return (t.type || 'full') === filterType;
  });

  const handleStartTest = (testId: string) => {
    setPendingTestId(testId);
    setSelectedLang('en');
    setShowPreTestModal(true);
  };

  const handleConfirmStartTest = () => {
    if (pendingTestId) {
      setShowPreTestModal(false);
      router.push(`/mock-tests/${pendingTestId}?lang=${selectedLang}`);
    }
  };

  const handleCancelModal = () => {
    setShowPreTestModal(false);
    setPendingTestId(null);
  };

  return (
    <DigiLockerGuard>
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 animate-page-in pb-24 lg:pb-0">
        
        {/* Page Banner Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Mock Examinations &amp; Assessment Papers
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Timed exam simulation with automated scoring, question palette, and XP cutoff bonuses.
            </p>
          </div>

          {/* Filter Pills with Smooth Sliding Background Pill */}
          <div className="relative flex items-center bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs select-none">
            {/* Animated Sliding Background Pill */}
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-blue-600 shadow-xs transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                width: 'calc(33.333% - 3px)',
                left: filterType === 'all' ? '4px' : filterType === 'full' ? 'calc(33.333% + 1.5px)' : 'calc(66.666% - 1px)',
              }}
            />

            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`relative z-10 px-3 py-1.5 text-xs transition-colors duration-200 flex-1 text-center ${
                filterType === 'all'
                  ? 'text-white font-black'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              All Tests
            </button>
            <button
              type="button"
              onClick={() => setFilterType('full')}
              className={`relative z-10 px-3 py-1.5 text-xs transition-colors duration-200 flex-1 text-center ${
                filterType === 'full'
                  ? 'text-white font-black'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              Full Mocks
            </button>
            <button
              type="button"
              onClick={() => setFilterType('sectional')}
              className={`relative z-10 px-3 py-1.5 text-xs transition-colors duration-200 flex-1 text-center ${
                filterType === 'sectional'
                  ? 'text-white font-black'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              Sectional
            </button>
          </div>
        </div>

        {/* Mock Test Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 h-56 animate-pulse space-y-4 shadow-xs">
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            ))
          ) : filteredTests.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No Mock Tests Available For This Track</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Looking for full-length papers in a different subject or haven&apos;t chosen your class curriculum yet?
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/course-selection"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <BookOpen className="w-4 h-4" /> Continue Course Selection <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            filteredTests.map((testItem) => {
              const testId = testItem._id || testItem.id;
              return (
                <div
                  key={testId}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                        {testItem.type || 'Full Mock'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        ⏱ {testItem.duration_minutes || 60} Mins
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {testItem.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-medium">
                        {testItem.description || 'Full-length examination simulation for course assessment.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-bold text-slate-500">
                      <span>{testItem.questions_count || testItem.question_ids?.length || 0} Questions</span>
                      <span className="mx-1">•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-black">+{testItem.cutoff_bonus_xp || 100} XP Bonus</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartTest(testId)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 group-hover:scale-105 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" /> Start
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

      {/* ─── Pre-Test Entry Warning Modal ─── */}
      {showPreTestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl relative overflow-hidden flex flex-col mb-16 sm:mb-0"
            style={{ maxHeight: 'calc(90vh - 4rem)' }}>

            <button
              type="button"
              onClick={handleCancelModal}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="overflow-y-auto flex-1 px-5 pb-2 pt-3 sm:px-8 sm:pt-6 space-y-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 tracking-wider">
                    Exam Security Notice
                  </span>
                  <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white mt-1.5 leading-tight">
                    Before You Begin
                  </h2>
                </div>
              </div>

              {/* Language Preference Option */}
              <div className="bg-blue-50/70 dark:bg-blue-950/40 rounded-xl p-3 border border-blue-200/80 dark:border-blue-900/50 text-left space-y-2">
                <label className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                  Select Language Preference:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLang('en')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      selectedLang === 'en'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🌐 English (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLang('hi')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                      selectedLang === 'hi'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🇮🇳 Hindi (हिंदी)
                  </button>
                </div>
              </div>

              {/* Security Rules list */}
              <div className="text-left space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    <span className="font-black text-rose-600 dark:text-rose-400">Once you enter the test</span>, you cannot return before completing it.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    <span className="font-black text-slate-900 dark:text-white">3-strike rule</span> — back presses or window focus loss auto-submit after <span className="text-rose-600 dark:text-rose-400 font-black">3 violations</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-3 h-3" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    <span className="font-black text-slate-900 dark:text-white">Landscape required</span> on mobile — rotate device before starting.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-5 sm:px-8 py-4 sm:pb-6 shrink-0 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelModal}
                className="flex-1 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartTest}
                className="flex-1 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                I Understand, Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DigiLockerGuard>
  );
}
