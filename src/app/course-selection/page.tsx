'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { BookOpen, ShieldAlert, CheckCircle2, Lock, Trophy, GraduationCap } from 'lucide-react';

export default function CourseSelectionPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'competitive' | 'school'>('all');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState<string>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((meData) => {
        if (!meData || !meData.authenticated) {
          router.push('/login');
          return;
        }
        if (meData.user?.lockedCourse) {
          const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const joinCode = urlParams?.get('joinCode');
          const joinHostId = urlParams?.get('joinHostId');
          if (joinCode) {
            router.push(`/leaderboard?joinCode=${encodeURIComponent(joinCode)}`);
          } else if (joinHostId) {
            router.push(`/leaderboard?joinHostId=${encodeURIComponent(joinHostId)}`);
          } else {
            router.push('/dashboard');
          }
          return;
        }
        return fetch('/api/courses', { cache: 'no-store' })
          .then((res) => res.json())
          .then((data) => {
            const active = (data.courses || []).filter((c: any) => c.is_active !== false && String(c.is_active) !== 'false');
            setCourses(active);
            if (active.length > 0) setSelectedCourseId(String(active[0]._id));
          });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const handleConfirmLock = async () => {
    if (!selectedCourseId) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/course/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to lock course selection');
        setShowConfirmModal(false);
      } else {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const joinCode = urlParams?.get('joinCode');
        const joinHostId = urlParams?.get('joinHostId');
        if (joinCode) {
          router.push(`/leaderboard?joinCode=${encodeURIComponent(joinCode)}`);
        } else if (joinHostId) {
          router.push(`/leaderboard?joinHostId=${encodeURIComponent(joinHostId)}`);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An error occurred');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => String(c._id) === String(selectedCourseId));

  const isSchoolCategory = (c: any) => {
    const cat = String(c?.category || '').toLowerCase().trim();
    const name = String(c?.name || '').toLowerCase().trim();
    const str = `${cat} ${name}`;
    return str.includes('school') || str.includes('class') || str.includes('3-12') || str.includes('6-12') || str.includes('board') || str.includes('grade');
  };

  const schoolCourses = courses.filter((c) => isSchoolCategory(c));
  const competitiveCourses = courses.filter((c) => !isSchoolCategory(c));

  const availableBoards = Array.from(
    new Set(schoolCourses.map((c) => c.board || 'CBSE').filter(Boolean))
  );

  const filteredSchoolCourses = schoolCourses.filter((c) => {
    if (selectedBoardFilter === 'all') return true;
    return (c.board || 'CBSE').toLowerCase() === selectedBoardFilter.toLowerCase();
  });

  const displayedCourses =
    activeTab === 'competitive'
      ? competitiveCourses
      : activeTab === 'school'
      ? filteredSchoolCourses
      : courses;

  useEffect(() => {
    if (displayedCourses.length > 0) {
      const existsInTab = displayedCourses.some((c) => String(c._id) === String(selectedCourseId));
      if (!existsInTab) {
        setSelectedCourseId(String(displayedCourses[0]._id));
      }
    }
  }, [activeTab, displayedCourses, selectedCourseId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-sm">
        <div className="text-center mb-8">
          <Logo size={44} className="justify-center mb-4" subtitle="MANDATORY COURSE LOCKING" />
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            Select Your Preparation Track
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto mt-2">
            Choose your target track from our <strong className="text-slate-700 dark:text-slate-300">Competitive Exams</strong> or <strong className="text-slate-700 dark:text-slate-300">School Exams (Class 3-12)</strong> catalog. Once confirmed, this selection will be permanently locked.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        {/* Category Navigation Tabs with Smooth Sliding Background Pill */}
        <div className="relative flex justify-center items-center p-1.5 mb-8 bg-slate-100 rounded-2xl max-w-md mx-auto select-none">
          {/* Animated Sliding Background Pill */}
          <div
            className={`absolute top-1.5 bottom-1.5 rounded-xl shadow-xs transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              activeTab === 'all' ? 'bg-blue-600' : activeTab === 'competitive' ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
            style={{
              width: 'calc(33.333% - 4px)',
              left: activeTab === 'all' ? '6px' : activeTab === 'competitive' ? 'calc(33.333% + 2px)' : 'calc(66.666% - 2px)',
            }}
          />

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`relative z-10 flex-1 py-2 px-3 text-xs transition-colors duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'all'
                ? 'text-white font-black'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            All Track ({courses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('competitive')}
            className={`relative z-10 flex-1 py-2 px-3 text-xs transition-colors duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'competitive'
                ? 'text-white font-black'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Competitive ({competitiveCourses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`relative z-10 flex-1 py-2 px-3 text-xs transition-colors duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'school'
                ? 'text-white font-black'
                : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> School ({schoolCourses.length})
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Fetching available courses...</div>
        ) : displayedCourses.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl mb-8">
            <BookOpen className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Courses Available in this Category</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Please check other categories or ask an administrator to add courses in the Admin Portal (Port 3001).
            </p>
          </div>
        ) : (
          <div className="space-y-8 mb-8">
            {/* Competitive Section if viewing all or competitive tab */}
            {(activeTab === 'all' || activeTab === 'competitive') && competitiveCourses.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Competitive Entrance Exams
                    </h2>
                    <p className="text-[11px] text-slate-500">JEE Mains & Advanced, NEET Medical Entrance, and National Exams</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {competitiveCourses.map((course) => {
                    const isSelected = String(selectedCourseId) === String(course._id);
                    return (
                      <div
                        key={String(course._id)}
                        onClick={() => setSelectedCourseId(String(course._id))}
                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/40 dark:border-amber-500 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-amber-300 dark:hover:border-amber-800'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                              <Trophy className="w-3 h-3" /> Competitive
                            </span>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{course.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">{course.description}</p>
                        </div>

                        <div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(course.subjects || ['Physics', 'Chemistry', 'Mathematics']).map((s: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                {s}
                              </span>
                            ))}
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Marking: +{course.marking_scheme?.marks_per_correct || 4} / -{course.marking_scheme?.penalty_per_incorrect || 1}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* School Exams Section if viewing all or school tab */}
            {(activeTab === 'all' || activeTab === 'school') && schoolCourses.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                        School Exams (Class 3 to 12)
                      </h2>
                      <p className="text-[11px] text-slate-500">Board exam prep, grade-wise science & maths tracks (Class 3 - 12)</p>
                    </div>
                  </div>

                  {/* Board Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSelectedBoardFilter('all')}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                        selectedBoardFilter === 'all'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All Boards
                    </button>
                    {availableBoards.map((bName) => (
                      <button
                        key={bName}
                        type="button"
                        onClick={() => setSelectedBoardFilter(bName)}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
                          selectedBoardFilter.toLowerCase() === bName.toLowerCase()
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {bName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSchoolCourses.map((course) => {
                    const isSelected = String(selectedCourseId) === String(course._id);
                    return (
                      <div
                        key={String(course._id)}
                        onClick={() => setSelectedCourseId(String(course._id))}
                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-emerald-300 dark:hover:border-emerald-800'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" /> Class 3 - 12
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                                🏫 {course.board || 'CBSE'}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{course.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{course.description}</p>

                          {course.curriculum && (
                            <div className="p-2 mb-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
                              <span className="font-extrabold uppercase text-[10px] block text-emerald-700 dark:text-emerald-400 mb-0.5">Syllabus Track:</span>
                              {course.curriculum}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {(course.subjects || ['Science', 'Mathematics']).map((s: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                {s}
                              </span>
                            ))}
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Marking: +{course.marking_scheme?.marks_per_correct || 1} / -{course.marking_scheme?.penalty_per_incorrect || 0}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-6">
          <button
            disabled={!selectedCourseId || loading || courses.length === 0}
            onClick={() => setShowConfirmModal(true)}
            type="button"
            className="px-8 py-3 bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" /> Confirm & Permanently Lock Selected Course
          </button>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Warning: Course selection cannot be edited from your profile after confirmation (RULE-01).
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-lg text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">Confirm Permanent Lock</h3>
            <p className="text-xs text-slate-500 mb-4">
              You are selecting <strong className="text-slate-900 dark:text-white">{selectedCourse.name}</strong> ({selectedCourse.category || 'Competitive Exams'}). All your practice sets, mock tests, and leaderboard rankings will be permanently scoped to this course.
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs font-semibold mb-6">
              This choice is irreversible and cannot be changed later.
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmLock}
                className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Locking...' : 'Yes, Confirm & Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
