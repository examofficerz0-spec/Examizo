'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Trophy,
  Zap,
  Clock,
  BookOpen,
  FileCheck,
  Target,
  Award,
  CheckCircle2,
  Lock,
  Activity,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface StudentStatsModalProps {
  studentId: string | null;
  onClose: () => void;
}

export const StudentStatsModal: React.FC<StudentStatsModalProps> = ({ studentId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;

    const fetchStats = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/student-stats/${studentId}`);
        const result = await res.json();
        if (res.ok && result.student) {
          setData(result);
        } else {
          setError(result.error || 'Failed to load student statistics');
        }
      } catch (err: any) {
        setError('Error fetching analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [studentId]);

  if (!studentId) return null;

  const getSpeedCategory = (seconds: number) => {
    if (!seconds || seconds <= 0) return { text: 'No Tests Taken', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
    if (seconds <= 30) return { text: 'Rapid Solver', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' };
    if (seconds <= 60) return { text: 'Optimal Pacing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' };
    return { text: 'Methodical Pace', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header Bar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              {data?.student?.name ? data.student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                {data?.student?.name || 'Student Analytics'}
                {data?.student?.rank && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                    <Trophy className="w-3 h-3 text-amber-500" /> Rank #{data.student.rank}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-blue-500" /> {data?.student?.lockedCourseName || 'Batch Course'}
                </span>
                <span>•</span>
                <span>{data?.student?.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Loading student statistics...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl text-center text-xs font-bold border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          ) : (
            <>
              {/* Top Banner Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">XP Standing</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {(data.student.xpTotal || 0).toLocaleString()} <span className="text-xs font-bold text-blue-600">XP</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Batch Leaderboard</p>
                </div>

                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                    <FileCheck className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Mock Tests</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {data.stats.mockTestsAttempted} <span className="text-xs font-bold text-emerald-600">Tests</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Completed Full Exams</p>
                </div>

                <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-2xl">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Modules Done</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {data.stats.moduleCompletionPercentage}%
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    {data.stats.modulesCompletedCount} / {data.stats.totalModulesInCourse} Modules
                  </p>
                </div>

                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Avg Speed</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {data.stats.avgTimePerQuestionSeconds > 0 ? (
                      <>
                        {data.stats.avgTimePerQuestionSeconds}s <span className="text-xs font-bold text-amber-600">/ Q</span>
                      </>
                    ) : (
                      <span className="text-slate-400 font-extrabold">N/A</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Time per question</p>
                </div>
              </div>

              {/* Detailed Section 1: Course Module Completion Tracker */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Course Module Completion Progress
                    </h4>
                  </div>
                  <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                    {data.stats.modulesCompletedCount} of {data.stats.totalModulesInCourse} Modules ({data.stats.moduleCompletionPercentage}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, data.stats.moduleCompletionPercentage)}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Tracks topic-wise practice sets and DPP modules completed by {data.student.name} in <strong>{data.student.lockedCourseName}</strong> with a pass score of 50%+ .
                </p>
              </div>

              {/* Detailed Section 2: Question Time & Speed Analysis */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Pacing & Time Per Question Statistics
                    </h4>
                  </div>
                  {(() => {
                    const spd = getSpeedCategory(data.stats.avgTimePerQuestionSeconds);
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${spd.color}`}>
                        ⚡ {spd.text}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Average Answer Time</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {data.stats.avgTimePerQuestionSeconds > 0 ? `${data.stats.avgTimePerQuestionSeconds} sec` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Total Tests Attempted</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{data.stats.totalAttempts} Sets</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">Accuracy Benchmark</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{data.stats.overallAccuracyPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Detailed Section 3: Mock Test Attempt History */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Full Mock Examinations History ({data.stats.mockTestHistory.length})
                  </h4>
                </div>

                {data.stats.mockTestHistory.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500">No full-length mock tests attempted yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {data.stats.mockTestHistory.map((test: any) => (
                      <div key={test.id} className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white">{test.title}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {new Date(test.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {test.timeSpentMinutes} mins duration
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`font-black text-sm ${Number(test.score) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {test.score} / {test.totalMarks}
                            </span>
                            <span className="block text-[10px] font-bold text-slate-500">
                              {test.percentage}% Score
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            test.percentage >= 70
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : Number(test.score) < 0
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {test.percentage >= 70 ? 'Passed' : Number(test.score) < 0 ? 'Negative' : 'Completed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
