'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History,
  ArrowRight,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Sparkles,
  Trophy,
  Target,
  X,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { getSwrCache, setSwrCache, subscribeSwrCache } from '@/lib/swrCache';
import { PageLoader } from '@/components/common/PageLoader';
import { DigiLockerGuard } from '@/components/ui/DigiLockerModal';

export default function MockTestHistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [incorrectLog, setIncorrectLog] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'completed' | 'negative'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'score_desc' | 'accuracy_desc'>('date_desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Mistakes Modal / Drawer State
  const [activeMistakeTest, setActiveMistakeTest] = useState<{
    testId: string;
    testTitle: string;
    items: any[];
  } | null>(null);
  const [openExplanationIds, setOpenExplanationIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    const cached = getSwrCache<any>('dashboard_cache');
    if (cached) {
      if (Array.isArray(cached.mockTestHistory)) setHistoryList(cached.mockTestHistory);
      if (Array.isArray(cached.incorrectLog)) setIncorrectLog(cached.incorrectLog);
      if (cached.user) setUserData(cached.user);
      setLoading(false);
    }

    const unsubscribe = subscribeSwrCache<any>('dashboard_cache', (fresh) => {
      if (fresh) {
        if (Array.isArray(fresh.mockTestHistory)) setHistoryList(fresh.mockTestHistory);
        if (Array.isArray(fresh.incorrectLog)) setIncorrectLog(fresh.incorrectLog);
        if (fresh.user) setUserData(fresh.user);
        setLoading(false);
      }
    });

    fetch('/api/dashboard', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.mockTestHistory)) setHistoryList(data.mockTestHistory);
        if (Array.isArray(data.incorrectLog)) setIncorrectLog(data.incorrectLog);
        if (data.user) setUserData(data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => unsubscribe();
  }, []);

  // Filtered & Sorted History
  const filteredHistory = useMemo(() => {
    let list = [...historyList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) =>
        (item.title || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'passed') {
      list = list.filter((item) => (item.percentage || 0) >= 60);
    } else if (statusFilter === 'completed') {
      list = list.filter((item) => (item.percentage || 0) < 60 && Number(item.score || 0) >= 0);
    } else if (statusFilter === 'negative') {
      list = list.filter((item) => Number(item.score || 0) < 0);
    }

    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      }
      if (sortBy === 'score_desc') {
        return Number(b.score || 0) - Number(a.score || 0);
      }
      if (sortBy === 'accuracy_desc') {
        return Number(b.accuracy || 0) - Number(a.accuracy || 0);
      }
      return 0;
    });

    return list;
  }, [historyList, searchQuery, statusFilter, sortBy]);

  // Aggregate Performance Metrics
  const stats = useMemo(() => {
    const total = historyList.length;
    if (total === 0) {
      return { total: 0, avgAccuracy: 0, highestScore: 0, totalMinutes: 0, passCount: 0 };
    }
    const sumAccuracy = historyList.reduce((acc, curr) => acc + Number(curr.accuracy || 0), 0);
    const highestScore = Math.max(...historyList.map((i) => Number(i.score || 0)));
    const totalMinutes = historyList.reduce((acc, curr) => acc + Number(curr.timeSpentMinutes || 1), 0);
    const passCount = historyList.filter((i) => (i.percentage || 0) >= 60).length;

    return {
      total,
      avgAccuracy: Math.round(sumAccuracy / total),
      highestScore: highestScore === -Infinity ? 0 : highestScore,
      totalMinutes,
      passCount,
    };
  }, [historyList]);

  // Helper to find mistakes for a given test
  const getMistakesForTest = (testId: string, testTitle: string) => {
    if (!Array.isArray(incorrectLog)) return [];
    return incorrectLog.filter((item) => {
      if (!item) return false;
      if (testId && item.test_id && String(item.test_id) === String(testId)) return true;
      if (testTitle && item.test_title && item.test_title.trim().toLowerCase() === testTitle.trim().toLowerCase()) return true;
      return false;
    });
  };

  const handleOpenMistakes = (testId: string, testTitle: string) => {
    const testMistakes = getMistakesForTest(testId, testTitle);
    setActiveMistakeTest({
      testId,
      testTitle,
      items: testMistakes,
    });
  };

  if (!mounted || (loading && historyList.length === 0)) {
    return (
      <PageLoader
        title="Loading Examination History"
        subtitle="Retrieving your test attempts, question logs, and accuracy benchmarks..."
        badgeText="Examizo Analytics"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <DigiLockerGuard>
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6 flex-1 animate-page-in pb-24 lg:pb-12">
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/mock-tests" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Mock Tests
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 dark:text-slate-200 font-extrabold">Attempt History</span>
          </nav>

          {/* ─── Top Header Card (Matching User Screenshot Layout) ─── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      Mock Examination Attempts &amp; History
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {historyList.length} Attempt{historyList.length === 1 ? '' : 's'} Logged
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Track your scores, completion accuracy, time benchmarks, and test performance history.
                  </p>
                </div>
              </div>

              <Link
                href="/mock-tests"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
              >
                Take a mock test <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ─── Performance Summary Metrics Bar ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Attempts</span>
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate block">
                  {stats.total} Tests
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Avg Accuracy</span>
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 truncate block">
                  {stats.avgAccuracy}%
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Peak Score</span>
                <span className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 truncate block">
                  {stats.highestScore} Marks
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Time Invested</span>
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate block">
                  {stats.totalMinutes} Mins
                </span>
              </div>
            </div>
          </div>

          {/* ─── Controls: Search, Status Filter & View Toggle ─── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by mock test paper name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills, Sort & View Mode Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({historyList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('passed')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'passed'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Passed
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Completed
                </button>
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="score_desc">Highest Score</option>
                <option value="accuracy_desc">Highest Accuracy</option>
              </select>

              {/* View Switcher Toggle (Table vs Cards) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Tabular View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  title="Card View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Main Content: Tabular Format & Mobile Responsive Cards ─── */}
          {filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ClipboardList className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {historyList.length === 0 ? 'No Mock Test Attempts Yet' : 'No Matching Test Attempts'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {historyList.length === 0
                    ? 'Complete full-length mock examinations to log your score progress, speed records, and question answer audits.'
                    : 'Try clearing your search query or switching status filters to view previous attempts.'}
                </p>
              </div>
              <Link
                href="/mock-tests"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Browse Mock Tests</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : viewMode === 'table' ? (
            /* ─── TABULAR VIEW (Responsive with Horizontal Scroll Protection & Tablet Tuning) ─── */
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Responsive Scrollable Container */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[760px] md:min-w-[840px]">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                      <th className="py-3.5 px-4 sm:px-6">Mock Examination Paper</th>
                      <th className="py-3.5 px-4">Date &amp; Duration</th>
                      <th className="py-3.5 px-4 min-w-[170px]">Score Achieved</th>
                      <th className="py-3.5 px-4">Accuracy</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-semibold">
                    {filteredHistory.map((item, idx) => {
                      const isPassed = (item.percentage || 0) >= 60;
                      const isNegative = Number(item.score || 0) < 0;
                      const mistakes = getMistakesForTest(item.test_id, item.title);

                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Column 1: Test Paper Title + Try Badge */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="space-y-1">
                              <h4 className="font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 max-w-sm sm:max-w-md">
                                {item.title}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
                                  Attempt #{item.tryNumber || idx + 1}
                                </span>
                                {item.totalQuestions ? (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    • {item.totalQuestions} Questions
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Date & Duration */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {new Date(item.date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{item.timeSpentMinutes || 1} min duration</span>
                              </div>
                            </div>
                          </td>

                          {/* Column 3: Score Achieved + Progress Bar */}
                          <td className="py-4 px-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-black">
                                <span className="text-slate-800 dark:text-slate-200 font-mono">
                                  <strong className={isNegative ? 'text-rose-600 dark:text-rose-400' : isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}>
                                    {item.score}
                                  </strong> / {item.totalMarks}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold ml-2">
                                  ({item.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isPassed
                                      ? 'bg-emerald-500'
                                      : isNegative
                                      ? 'bg-rose-500'
                                      : 'bg-blue-600'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, item.percentage || 0))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Column 4: Accuracy */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                              <Target className="w-3.5 h-3.5 text-blue-500" />
                              {item.accuracy || 0}%
                            </span>
                          </td>

                          {/* Column 5: Status Badge */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                                isPassed
                                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                                  : isNegative
                                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                                  : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                              }`}
                            >
                              Completed
                            </span>
                          </td>

                          {/* Column 6: Actions (View Result & Mistakes) */}
                          <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              {item.test_id ? (
                                <Link
                                  href={`/mock-tests/${item.test_id}?viewResult=true`}
                                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-extrabold text-xs transition-colors inline-flex items-center gap-1 border border-blue-200/60 dark:border-blue-900/40"
                                >
                                  <span>View Result</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">Logged</span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenMistakes(item.test_id, item.title)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-extrabold text-xs transition-colors inline-flex items-center gap-1.5 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer active:scale-95"
                                title="Review incorrect questions from this attempt"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span>Mistakes</span>
                                {mistakes.length > 0 && (
                                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ml-0.5">
                                    {mistakes.length}
                                  </span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tablet & Mobile Table Helper Footnote */}
              <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Showing {filteredHistory.length} of {historyList.length} total attempts</span>
                <span className="hidden sm:inline">Tip: Scroll horizontally on smaller screens to review all metrics</span>
              </div>
            </div>
          ) : (
            /* ─── CARD VIEW (Alternative Grid Layout matching screenshot) ─── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((item, idx) => {
                const isPassed = (item.percentage || 0) >= 60;
                const isNegative = Number(item.score || 0) < 0;
                const mistakes = getMistakesForTest(item.test_id, item.title);

                return (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                  >
                    <div>
                      {/* Top Row: Title + Completed Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 border bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900">
                          Completed
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span>{item.timeSpentMinutes || 1} min duration</span>
                      </div>
                    </div>

                    {/* Middle: Performance Bar */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Score Achieved</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          <strong className={isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}>
                            {item.score}
                          </strong> / {item.totalMarks}
                          <span className="ml-1 text-[10px] text-slate-400 font-bold">({item.percentage}%)</span>
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPassed ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage || 0))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                        <span>Accuracy: <strong className="text-slate-800 dark:text-slate-200">{item.accuracy || 0}%</strong></span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-black text-[9px] uppercase ${
                            isPassed
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isPassed ? 'Passed' : 'Completed'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      {item.test_id ? (
                        <Link
                          href={`/mock-tests/${item.test_id}?viewResult=true`}
                          className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>View Result</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Completed</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenMistakes(item.test_id, item.title)}
                        className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        <span>Mistakes</span>
                        {mistakes.length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-[9px] font-black flex items-center justify-center">
                            {mistakes.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </DigiLockerGuard>

      {/* ─── Mistakes Review Modal ─── */}
      {activeMistakeTest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-modal-in">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                      Mistake Review: {activeMistakeTest.testTitle}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {activeMistakeTest.items.length} incorrect question{activeMistakeTest.items.length === 1 ? '' : 's'} logged in audit system
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveMistakeTest(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {activeMistakeTest.items.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Zero Mistakes Logged</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      All submitted answers for this examination set were answered correctly, or this test was submitted without incorrect recorded penalties.
                    </p>
                  </div>
                </div>
              ) : (
                activeMistakeTest.items.map((qItem, qIdx) => {
                  const qKey = qItem._id || `mistake-${qIdx}`;
                  const isExpOpen = Boolean(openExplanationIds[qKey]);

                  return (
                    <div
                      key={qKey}
                      className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900/60 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 shrink-0">
                          Question #{qIdx + 1}
                        </span>
                        {qItem.topic_tag && (
                          <span className="text-[10px] font-bold text-slate-400 truncate">
                            {qItem.topic_tag}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                        {qItem.question_text || 'Assessment Question'}
                      </p>

                      {qItem.diagram_image_url && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qItem.diagram_image_url}
                            alt="Question Diagram"
                            className="max-h-48 mx-auto object-contain rounded-lg"
                          />
                        </div>
                      )}

                      {/* Answer Key Comparison Box */}
                      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Correct Answer: Option {qItem.correct_option !== undefined ? String.fromCharCode(65 + Number(qItem.correct_option)) : 'Key'}</span>
                        </div>
                        {qItem.selected_option !== undefined && (
                          <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>Your Choice: Option {String.fromCharCode(65 + Number(qItem.selected_option))}</span>
                          </div>
                        )}
                      </div>

                      {/* Explanation */}
                      {(qItem.explanation || qItem.detailed_explanation) && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenExplanationIds((prev) => ({
                                ...prev,
                                [qKey]: !prev[qKey],
                              }))
                            }
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-between w-full cursor-pointer py-1"
                          >
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{isExpOpen ? 'Hide Solution Explanation' : 'View Solution Explanation'}</span>
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpOpen ? 'rotate-180' : 'rotate-0'
                              }`}
                            />
                          </button>

                          {isExpOpen && (
                            <div className="mt-2.5 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed animate-fade-in font-normal">
                              {qItem.explanation || qItem.detailed_explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/40 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setActiveMistakeTest(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
