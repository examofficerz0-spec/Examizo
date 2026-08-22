'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StudentHeader } from '@/components/layout/StudentHeader';
import { PageLoader } from '@/components/common/PageLoader';
import {
  Star,
  ClipboardList,
  Trophy,
  Target,
  Award,
  ArrowRight,
  TrendingUp,
  Play,
  BookOpen,
  AlertCircle,
  X,
  ChevronDown,
  Search,
  Maximize2,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  Zap,
  RotateCcw,
} from 'lucide-react';

import { clearAllClientUserCaches } from '@/lib/clientCache';
import { getSwrCache, setSwrCache } from '@/lib/swrCache';

export default function StudentDashboardPage() {
  const router = useRouter();
  const initialCache = getSwrCache<any>('dashboard_cache');
  const [userData, setUserData] = useState<any>(initialCache?.user || null);
  const [mockTests, setMockTests] = useState<any[]>(initialCache?.mockTests || []);
  const [leaderboard, setLeaderboard] = useState<any[]>(initialCache?.leaderboard || []);
  const [incorrectLog, setIncorrectLog] = useState<any[]>(initialCache?.incorrectLog || []);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [openDetailedExplanation, setOpenDetailedExplanation] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(!initialCache);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Class Promotion & Rollback State
  const [promoteInfo, setPromoteInfo] = useState<{
    isSchoolUser: boolean;
    isMarchActive: boolean;
    currentCourse?: any;
    nextCourse?: any;
    previousCourse?: any;
    hasPromoted?: boolean;
    canPromote?: boolean;
    canRollback?: boolean;
    loading?: boolean;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPromoteInfo = () => {
    fetch('/api/course/promote')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isSchoolUser) {
          setPromoteInfo(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchPromoteInfo();
  }, []);

  const handlePromoteAction = async (action: 'promote' | 'rollback') => {
    setPromoteInfo((prev) => (prev ? { ...prev, loading: true } : null));
    try {
      const res = await fetch('/api/course/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        fetchPromoteInfo();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        showToast(data.error || 'Action failed');
        setPromoteInfo((prev) => (prev ? { ...prev, loading: false } : null));
      }
    } catch {
      showToast('Error performing class action');
      setPromoteInfo((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/dashboard', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          clearAllClientUserCaches();
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || !isMounted) return;
        if (data.error === 'Unauthorized' || data.error?.includes('suspended') || data.error?.includes('deleted')) {
          clearAllClientUserCaches();
          window.location.href = '/login';
          return;
        }
        if (data.needsCourseSelection) {
          router.push('/course-selection');
          return;
        }

        const newCache = {
          user: data.user || null,
          mockTests: data.mockTests || [],
          leaderboard: data.topLeaderboard || [],
          incorrectLog: data.incorrectLog || [],
        };
        setSwrCache('dashboard_cache', newCache, data.user?.email);

        if (data.user) setUserData(data.user);
        if (data.mockTests) setMockTests(data.mockTests);
        if (data.topLeaderboard) setLeaderboard(data.topLeaderboard);
        if (data.incorrectLog) setIncorrectLog(data.incorrectLog);
      })
      .catch((err) => {
        console.error('[Dashboard] Fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <PageLoader
        title="Loading Student Dashboard"
        subtitle="Syncing curriculum progress, performance metrics, and live analytics..."
        badgeText="Examizo Edge Engine"
      />
    );
  }

  const courseName = userData?.lockedCourse?.name || 'Selected Course';
  const xpTotal = userData?.xp_total || 0;
  const studentRank = userData?.rank || 1;
  const displayName = userData?.name || 'Student';

  const filteredLogItems = incorrectLog.filter((item) => {
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      (item.question_text || '').toLowerCase().includes(q) ||
      (item.topic_tag || '').toLowerCase().includes(q) ||
      (item.explanation || '').toLowerCase().includes(q)
    );
  });

  const hasNoCourse = !userData?.lockedCourse?.id && !userData?.lockedCourse?.name && !userData?.locked_course_id;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Main Page Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 animate-page-in pb-24 lg:pb-0">
        
        {/* Top Welcome Header & XP Balance Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, <span className="text-blue-600 dark:text-blue-400">{displayName}!</span> 👋
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {hasNoCourse ? (
                <span>You haven&apos;t chosen an active course track yet.</span>
              ) : (
                <span>You&apos;re making steady progress in <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{courseName}</strong>.</span>
              )}
            </p>
          </div>

          {/* XP Balance Badge Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 px-6 flex items-center gap-4 shadow-xs">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Star className="w-5 h-5 fill-current stroke-[1]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL XP BALANCE</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{xpTotal.toLocaleString()} XP</span>
            </div>
          </div>
        </div>


        {/* Row 1: Available Mock Examinations & Course Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Row 1 Left: Available Mock Examinations */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ClipboardList className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Available Mock Examinations</h3>
              </div>

              <Link
                href="/mock-tests"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all tests <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Test Content / Empty State */}
            {mockTests.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center my-auto min-h-[180px] space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No mock examinations published yet</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Log into Admin Portal to create a paper!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 my-auto">
                {mockTests.slice(0, 2).map((test, idx) => (
                  <Link
                    key={test._id || idx}
                    href="/mock-tests"
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {test.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Duration: {test.duration_minutes} mins | Cutoff: {test.cutoff_marks} Marks
                      </p>
                    </div>

                    <span
                      className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0"
                    >
                      View Paper <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Row 1 Right: Course Leaderboard */}
          {(() => {
            const isLeaderboardLocked = !userData || (userData.xp_total || 0) === 0;
            return (
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div className={isLeaderboardLocked ? "blur-md pointer-events-none select-none transition-all duration-500" : ""}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
                        <Trophy className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Course Leaderboard</h3>
                    </div>

                    <Link
                      href="/leaderboard"
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Full rank list <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Deep Purple Gradient Rank Banner Card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-[#220E3D] to-purple-950 p-5 text-white border border-purple-800/50 shadow-md">
                    {/* Subtle wave SVG overlay background */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="white" />
                      </svg>
                    </div>

                    <div className="relative z-10 flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-200/80 block">
                          YOUR CURRENT RANK
                        </span>
                        <span className="text-4xl font-black tracking-tight text-white mt-1 block">
                          #{studentRank}
                        </span>
                      </div>

                      <div className="text-right max-w-[140px]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-200/80 block">
                          TRACK
                        </span>
                        <span className="text-xs font-bold text-purple-100 truncate block mt-1">
                          {courseName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard Entries / Empty Note */}
                  <div className="mt-4 text-center">
                    {leaderboard.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium py-2">No leaderboard records yet.</p>
                    ) : (
                      <div className="space-y-2 text-left">
                        {leaderboard.slice(0, 2).map((st, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-slate-800 dark:text-slate-200">{st.name}</span>
                            </div>
                            <span className="text-slate-400 font-extrabold">{st.xp_total || 0} XP</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lock Overlay for 0 XP */}
                {isLeaderboardLocked && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-2.5">
                      <Lock className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">Leaderboard Locked</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium max-w-[220px] mb-3.5 leading-tight">
                      Earn your first XP in practice sets to unlock your rank &amp; standings!
                    </p>
                    <Link
                      href="/practice"
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Unlock Now
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Row 2: Incorrect Questions Audit Log Window Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Mistake Log & Incorrect Answers Audit</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                    {incorrectLog.length} Question{incorrectLog.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Review questions answered incorrectly in practice sets to analyze mistakes and study explanations.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" /> Expand Log Window
            </button>
          </div>

          {/* Quick Preview List inside the Dashboard Card */}
          {incorrectLog.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No incorrect questions logged yet!</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Great job! As you attempt practice sets, any incorrect answers will be logged here for revision.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incorrectLog.slice(0, 2).map((item, idx) => (
                <div
                  key={item._id || idx}
                  onClick={() => setShowLogModal(true)}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-rose-300 dark:hover:border-rose-800 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      {item.topic_tag || 'Practice Question'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold group-hover:text-rose-600 transition-colors">
                      Click to view breakdown ↗
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-relaxed">
                    {item.question_text}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold pt-1">
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" /> Selected: {item.options?.[item.userSelectedOption] || `Option ${item.userSelectedOption + 1}`}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Correct: {item.options?.[item.correctOption] || `Option ${item.correctOption + 1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Topic Practice Sets Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Topic Practice Sets</h3>
            </div>

            <Link
              href="/practice"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Explore question bank <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Interactive Topic Practice Soft Purple Banner */}
          <div className="bg-gradient-to-r from-purple-50/80 via-purple-50/60 to-purple-100/80 dark:from-purple-950/60 dark:via-[#1D0C33] dark:to-purple-950/60 border border-purple-100 dark:border-purple-800/50 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Interactive Topic Practice</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  Practice questions topic-by-topic and earn <strong className="text-blue-600 dark:text-blue-400 font-bold">+27 XP</strong> for every correct answer!
                </p>
              </div>
            </div>

            <Link
              href="/practice"
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all shrink-0"
            >
              Start Practice <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Row 4: Total Experience Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">TOTAL EXPERIENCE</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{xpTotal} XP</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Keep practicing to level up your skills!
            </p>
          </div>
        </div>

      </main>

      {/* SEPARATE POPUP LOG WINDOW MODAL */}
      {showLogModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Window Header */}
            <div className="p-5 px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Mistake Log & Incorrect Answers Audit
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold">
                      {filteredLogItems.length} {filteredLogItems.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Detailed explanation log window for reviewing your mistakes.</p>
                </div>
              </div>

              {/* Cross Close Button (X) */}
              <button
                onClick={() => setShowLogModal(false)}
                type="button"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Close Window"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search incorrect questions by keyword or topic..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Question Log Items List */}
              {filteredLogItems.length === 0 ? (
                <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No matching incorrect questions found</p>
                  <p className="text-[11px] text-slate-400">Try clearing your search query or attempting more practice sets.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLogItems.map((item: any, idx: number) => {
                    const qId = item._id || `log-${idx}`;
                    const isDetailedOpen = Boolean(openDetailedExplanation[qId]);
                    return (
                      <div
                        key={qId}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-4 shadow-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.topic_tag || 'Practice Question'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Logged Question #{idx + 1}
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                          {item.question_text}
                        </h4>

                        {/* Options Comparison */}
                        {Array.isArray(item.options) && item.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                            {item.options.map((opt: string, optIdx: number) => {
                              const isSelected = item.userSelectedOption === optIdx;
                              const isCorrect = item.correctOption === optIdx;

                              let style = 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
                              if (isCorrect) {
                                style = 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 font-bold';
                              } else if (isSelected) {
                                style = 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 font-bold';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-3 rounded-xl border flex items-center justify-between ${style}`}
                                >
                                  <span>{opt}</span>
                                  {isCorrect && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-black uppercase">
                                      ✓ Correct Answer
                                    </span>
                                  )}
                                  {isSelected && !isCorrect && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100 font-black uppercase">
                                      ✗ Your Selection
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Normal Explanation */}
                        {item.explanation && (
                          <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block">Explanation:</span>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{item.explanation}</p>

                            {/* Detailed Step-by-Step Explanation Dropdown */}
                            {item.detailed_explanation && (
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenDetailedExplanation((prev) => ({
                                      ...prev,
                                      [qId]: !prev[qId],
                                    }))
                                  }
                                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer py-1 transition-colors"
                                >
                                  <span>📘 View Detailed Step-by-Step Explanation</span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-300 ${
                                      isDetailedOpen ? 'rotate-180' : 'rotate-0'
                                    }`}
                                  />
                                </button>
                                <div
                                  className={`grid transition-all duration-300 ease-in-out ${
                                    isDetailedOpen
                                      ? 'grid-rows-[1fr] opacity-100 mt-2'
                                      : 'grid-rows-[0fr] opacity-0 mt-0 overflow-hidden'
                                  }`}
                                >
                                  <div className="overflow-hidden">
                                    <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-pre-line pt-1 leading-relaxed bg-slate-100/60 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                      {item.detailed_explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
