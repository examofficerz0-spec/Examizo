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
  ArrowRight,
  TrendingUp,
  Play,
  BookOpen,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  FileText,
  Lock,
  Zap,
  RotateCcw,
  Check,
  Sparkles,
  History,
  Clock,
  FileCheck,
  Bookmark,
} from 'lucide-react';

import { BookmarkedQuestionsModal } from '@/components/ui/BookmarkedQuestionsModal';
import { getSavedBookmarks } from '@/lib/bookmarks';
import { clearAllClientUserCaches } from '@/lib/clientCache';
import { getSwrCache, setSwrCache, subscribeSwrCache } from '@/lib/swrCache';
import { hideNativeSplashScreen } from '@/lib/nativeApp';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [mockTestHistory, setMockTestHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [levelInfo, setLevelInfo] = useState<{
    levelId?: string;
    levelLabel?: string;
    levelCategory?: 'school_class' | 'competitive_course';
    headline?: string;
    badgeText?: string;
    totalStudentsInLevel?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useEffect(() => {
    const updateBookmarks = () => {
      setBookmarkCount(getSavedBookmarks(userData?._id || userData?.id).length);
    };
    updateBookmarks();
    window.addEventListener('examizo:bookmarks-updated', updateBookmarks);
    return () => window.removeEventListener('examizo:bookmarks-updated', updateBookmarks);
  }, [userData]);

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
    setMounted(true);
    const cached = getSwrCache<any>('dashboard_cache');
    if (cached) {
      if (cached.user) setUserData(cached.user);
      if (Array.isArray(cached.mockTests)) setMockTests(cached.mockTests);
      if (Array.isArray(cached.mockTestHistory)) setMockTestHistory(cached.mockTestHistory);
      if (Array.isArray(cached.leaderboard)) setLeaderboard(cached.leaderboard);
      if (cached.levelInfo) setLevelInfo(cached.levelInfo);
      setLoading(false);
      hideNativeSplashScreen();
    }

    // Live reactive subscription to dashboard data
    const unsubscribe = subscribeSwrCache<any>('dashboard_cache', (fresh) => {
      if (fresh) {
        if (fresh.user) setUserData(fresh.user);
        if (Array.isArray(fresh.mockTests)) setMockTests(fresh.mockTests);
        if (Array.isArray(fresh.mockTestHistory)) setMockTestHistory(fresh.mockTestHistory);
        if (Array.isArray(fresh.leaderboard)) setLeaderboard(fresh.leaderboard);
        if (fresh.levelInfo) setLevelInfo(fresh.levelInfo);
        setLoading(false);
      }
    });

    fetchPromoteInfo();

    // Check for DigiLocker redirect return
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dlParam = urlParams.get('digilocker');
      const dlMsg = urlParams.get('message');
      if (dlParam === 'success') {
        showToast('DigiLocker identity verified successfully! All academic features unlocked.');
        localStorage.setItem('examizo_digilocker_verified', 'true');
        fetch('/api/digilocker/sync', { method: 'POST' })
          .then((r) => r.json())
          .then((syncData) => {
            if (syncData?.verified) {
              window.dispatchEvent(new Event('digilocker_status_change'));
              window.dispatchEvent(new Event('storage'));
            }
          })
          .catch(console.error);

        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (dlParam === 'error') {
        showToast(`DigiLocker verification failed: ${dlMsg || 'Authorization cancelled'}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => unsubscribe();
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
          mockTests: Array.isArray(data.mockTests) ? data.mockTests : [],
          mockTestHistory: Array.isArray(data.mockTestHistory) ? data.mockTestHistory : [],
          leaderboard: Array.isArray(data.topLeaderboard) ? data.topLeaderboard : [],
          levelInfo: data.levelInfo || null,
          incorrectLog: Array.isArray(data.incorrectLog) ? data.incorrectLog : [],
        };
        setSwrCache('dashboard_cache', newCache, data.user?.email);

        if (data.user) setUserData(data.user);
        if (Array.isArray(data.mockTests)) setMockTests(data.mockTests);
        if (Array.isArray(data.mockTestHistory)) setMockTestHistory(data.mockTestHistory);
        if (Array.isArray(data.topLeaderboard)) setLeaderboard(data.topLeaderboard);
        if (data.levelInfo) setLevelInfo(data.levelInfo);
      })
      .catch((err) => {
        console.error('[Dashboard] Fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
        hideNativeSplashScreen();
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const courseName = userData?.lockedCourse?.name || 'Selected Course';
  const xpTotal = Number(userData?.xp_total) || 0;
  const studentRank = Number(userData?.rank) || 1;
  const displayName = userData?.name || 'Student';

  if (!mounted || (loading && !userData)) {
    return (
      <PageLoader
        title="Loading Student Dashboard"
        subtitle="Syncing curriculum progress, performance metrics, and live analytics..."
        badgeText="Examizo Edge Engine"
      />
    );
  }

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

          {/* Action Cards: Bookmarks & XP Balance */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Bookmarked Questions Quick Revision Button */}
            <button
              type="button"
              onClick={() => setShowBookmarksModal(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl p-3.5 px-5 flex items-center gap-3.5 shadow-xs transition-all cursor-pointer group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bookmark className="w-5 h-5 fill-purple-600 dark:fill-purple-400 stroke-none" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Saved Questions</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {bookmarkCount} <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">for Revision</span>
                </span>
              </div>
            </button>

            {/* XP Balance Badge Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 px-5 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Star className="w-5 h-5 fill-current stroke-[1]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL XP BALANCE</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">{xpTotal.toLocaleString()} XP</span>
              </div>
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
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {levelInfo?.levelLabel ? `${levelInfo.levelLabel} Standings` : 'Cohort Leaderboard'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400">
                          {levelInfo?.levelCategory === 'school_class' ? 'Class-Level Peers Only' : 'Course Track Peers Only'}
                        </p>
                      </div>
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
                          YOUR {levelInfo?.levelLabel ? levelInfo.levelLabel.toUpperCase() : 'COHORT'} RANK
                        </span>
                        <span className="text-4xl font-black tracking-tight text-white mt-1 block">
                          #{studentRank || '—'}
                        </span>
                      </div>

                      <div className="text-right max-w-[170px]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-200/80 block">
                          {levelInfo?.levelCategory === 'school_class' ? 'ACADEMIC CLASS' : 'COHORT TRACK'}
                        </span>
                        <span className="text-xs font-bold text-purple-100 truncate block mt-1" title={levelInfo?.headline || courseName}>
                          {levelInfo?.levelLabel || courseName}
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
                                {st.rank || idx + 1}
                              </span>
                              <span className="text-slate-800 dark:text-slate-200">{st.name}</span>
                            </div>
                            <span className="text-slate-400 font-extrabold">{(st.xp !== undefined ? st.xp : st.xp_total) || 0} XP</span>
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

        {/* Mock Examination Attempts & History Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Link
              href="/history"
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Mock Examination Attempts &amp; History
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {mockTestHistory.length} Attempt{mockTestHistory.length === 1 ? '' : 's'} Logged
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Track your scores, completion accuracy, time benchmarks, and test performance history.
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                href="/mock-tests"
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1"
              >
                Take a mock test <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <History className="w-3.5 h-3.5" />
                <span>View History Table</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
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


      </main>


      {/* Bookmarked Questions Revision Modal */}
      <BookmarkedQuestionsModal
        isOpen={showBookmarksModal}
        onClose={() => setShowBookmarksModal(false)}
        studentId={userData?._id || userData?.id}
      />
    </div>
  );
}
