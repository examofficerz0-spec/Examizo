'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentHeader } from '@/components/layout/StudentHeader';
import Link from 'next/link';
import { FileText, PlayCircle, AlertTriangle, ShieldAlert, RotateCcw, X, BookOpen, ArrowRight, Zap, Lock, History } from 'lucide-react';
import { getSwrCache, setSwrCache, subscribeSwrCache } from '@/lib/swrCache';
import { DigiLockerGuard } from '@/components/ui/DigiLockerModal';

export default function MockTestsListPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'all' | 'full' | 'sectional'>('all');
  const [activeSessions, setActiveSessions] = useState<Record<string, any>>({});

  // Pre-test warning modal state
  const [pendingTestId, setPendingTestId] = useState<string | null>(null);
  const [showPreTestModal, setShowPreTestModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi'>('en');
  const [isRetakePending, setIsRetakePending] = useState(false);

  const checkLocalSessions = (testList: any[]) => {
    if (typeof window === 'undefined') return;
    const sessionMap: Record<string, any> = {};
    (testList || []).forEach((t) => {
      const tId = t._id || t.id;
      if (t.active_session && t.active_session.hasActiveSession) {
        sessionMap[tId] = t.active_session;
        return;
      }
      try {
        const raw = localStorage.getItem(`examizo_mock_session_${tId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.isExamStarted && !parsed.isSubmitted && Number(parsed.timeLeft || 0) > 5) {
            sessionMap[tId] = {
              hasActiveSession: true,
              timeLeftSeconds: parsed.timeLeft,
              resumeCount: parsed.resumeCount || 1,
              focusStrikes: parsed.focusStrikes || 0,
            };
          }
        }
      } catch (_) {}
    });
    setActiveSessions(sessionMap);
  };

  useEffect(() => {
    setMounted(true);
    const cached = getSwrCache<any[]>('mock_tests');
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setTests(cached);
      setLoading(false);
      checkLocalSessions(cached);
    }

    // Live reactive subscription to mock tests cache
    const unsubscribe = subscribeSwrCache<any[]>('mock_tests', (updatedTests) => {
      if (Array.isArray(updatedTests)) {
        setTests(updatedTests);
        setLoading(false);
        checkLocalSessions(updatedTests);
      }
    });

    fetch('/api/mock-tests', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.tests) ? data.tests : [];
        setSwrCache('mock_tests', list);
        setTests(list);
        checkLocalSessions(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => unsubscribe();
  }, []);

  const filteredTests = tests.filter((t) => {
    if (filterType === 'all') return true;
    return (t.type || 'full') === filterType;
  });

  const handleStartTest = (testId: string) => {
    setPendingTestId(testId);
    setSelectedLang('en');
    setIsRetakePending(false);
    setShowPreTestModal(true);
  };

  const handleStartRetake = (testId: string) => {
    setPendingTestId(testId);
    setSelectedLang('en');
    setIsRetakePending(true);
    setShowPreTestModal(true);
  };

  const handleConfirmStartTest = () => {
    if (pendingTestId) {
      setShowPreTestModal(false);
      if (isRetakePending) {
        try {
          sessionStorage.removeItem(`mock_result_${pendingTestId}`);
          localStorage.removeItem(`examizo_mock_session_${pendingTestId}`);
        } catch (_) {}
        router.push(`/mock-tests/${pendingTestId}?lang=${selectedLang}&retake=true`);
      } else {
        router.push(`/mock-tests/${pendingTestId}?lang=${selectedLang}`);
      }
      setIsRetakePending(false);
    }
  };

  const handleCancelModal = () => {
    setShowPreTestModal(false);
    setPendingTestId(null);
    setIsRetakePending(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <DigiLockerGuard>
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

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Pills with Smooth Sliding Background Pill */}
            <div className="relative flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs select-none">
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
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
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
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
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
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                }`}
              >
                Sectional
              </button>
            </div>

            <Link
              href="/history"
              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Attempt History</span>
            </Link>
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
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No Mock Tests Available For This Track</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Full-length mock test papers for your enrolled curriculum are being curated by the examination cell. Please check back shortly.
                </p>
              </div>
            </div>
          ) : (
            filteredTests.map((testItem) => {
              const testId = testItem._id || testItem.id;
              const sessionInfo = activeSessions[testId];
              const inProgress = Boolean(sessionInfo?.hasActiveSession);
              const attemptsUsed = Number(testItem.attempts_count || 0);
              const isMaxed = attemptsUsed >= 3;

              return (
                <div
                  key={testId}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-xs transition-all flex flex-col justify-between space-y-4 group ${
                    inProgress
                      ? 'border-amber-400 dark:border-amber-600/70 shadow-amber-500/10 ring-1 ring-amber-400/30'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                          {testItem.type || 'Full Mock'}
                        </span>
                        {inProgress ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" /> Active Session • Resumes {sessionInfo?.resumeCount || 1}/3 • Strikes {sessionInfo?.focusStrikes || 0}/3
                          </span>
                        ) : testItem.is_attempted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            ✓ Completed • Score: {testItem.highest_score} Marks
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Unattempted
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-400 shrink-0">
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

                    {inProgress ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/mock-tests/${testId}?resume=true`)}
                        className="px-4 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 group-hover:scale-105 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25"
                      >
                        <Zap className="w-4 h-4" /> Resume Test ({sessionInfo?.resumesRemaining !== undefined ? `${sessionInfo.resumesRemaining} left` : 'Active'})
                      </button>
                    ) : testItem.is_attempted ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => router.push(`/mock-tests/${testId}?viewResult=true`)}
                          className="px-3 py-2 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="View your previous test score and question review"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Result</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartRetake(testId)}
                          className="px-3.5 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 active:scale-95"
                          title="Retake this test for practice. Results saved in SQL records, but leaderboard XP is not added."
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Retake</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartTest(testId)}
                        className="px-4 py-2 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 group-hover:scale-105 cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                      >
                        <PlayCircle className="w-4 h-4" /> Start
                      </button>
                    )}
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
                <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                  isRetakePending
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                }`}>
                  {isRetakePending ? <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" /> : <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />}
                </div>
                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                    isRetakePending
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}>
                    {isRetakePending ? 'Practice Retake Mode' : 'Exam Security Notice'}
                  </span>
                  <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white mt-1.5 leading-tight">
                    {isRetakePending ? 'Retake For Practice' : 'Exam Lockdown & Proctoring Rules'}
                  </h2>
                </div>
              </div>

              {isRetakePending && (
                <div className="bg-blue-50/90 dark:bg-blue-950/50 p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 text-left space-y-1">
                  <span className="text-[11px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                    🎯 Practice Mode Notice
                  </span>
                  <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-snug">
                    Your questions, answers, accuracy, and mistake logs will be safely saved in database SQL records. <strong>Leaderboard XP points will not be increased</strong> for retakes to ensure competitive rankings remain fair.
                  </p>
                </div>
              )}

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

              {/* Exam Lockdown & Proctoring Rules list */}
              <div className="text-left space-y-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Exam Lockdown &amp; Proctoring Rules
                  </span>
                </div>

                <div className="space-y-2 pt-1 text-[11px] sm:text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-black text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-snug">
                      <strong className="text-slate-900 dark:text-white">Max 3 Resumes Allowed:</strong> If you accidentally close the browser, log out, or lose power, you can resume this test at most <strong>3 times</strong>. Upon attempting a 4th re-entry, the test is automatically submitted.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-black text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-snug">
                      <strong className="text-slate-900 dark:text-white">Screen Focus Lockdown (3 Strikes):</strong> Switching browser tabs, minimizing the screen, or clicking outside triggers a proctor strike. You receive at most <strong>3 focus strikes</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="p-1 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 font-black text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-snug">
                      <strong className="text-rose-600 dark:text-rose-400">Strict Auto-Submit Rule:</strong> <em>Whichever limit fills first (3 resumes OR 3 focus strikes)</em>, the test <strong>automatically terminates and submits</strong> immediately to the SQL database.
                    </p>
                  </div>
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
                className="flex-1 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isRetakePending ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Start Practice Retake</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>I Understand, Start</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </DigiLockerGuard>
    </div>
  );
}
