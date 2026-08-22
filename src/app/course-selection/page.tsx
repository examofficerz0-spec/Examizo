'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { BookOpen, ShieldAlert, CheckCircle2, Lock, Trophy, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const compScrollRef = useRef<HTMLDivElement>(null);
  const schoolScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.85;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    // 1. Fetch courses immediately
    fetch('/api/courses', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const active = (data.courses || [])
          .filter((c: any) => c.is_active !== false && String(c.is_active) !== 'false')
          .map((c: any) => ({
            ...c,
            _id: String(c._id || c.id),
            id: String(c.id || c._id),
          }));
        setCourses(active);
        if (active.length > 0) setSelectedCourseId(String(active[0]._id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // 2. Verify Auth State and redirect if course is already locked
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((meData) => {
        if (meData && meData.authenticated === false) {
          router.push('/login');
          return;
        }
        if (meData.user?.lockedCourse || meData.user?.lockedCourseId || meData.user?.locked_course_id) {
          const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const joinCode = urlParams?.get('joinCode');
          const joinHostId = urlParams?.get('joinHostId');
          if (joinCode) {
            window.location.href = `/leaderboard?joinCode=${encodeURIComponent(joinCode)}`;
          } else if (joinHostId) {
            window.location.href = `/leaderboard?joinHostId=${encodeURIComponent(joinHostId)}`;
          } else {
            window.location.href = '/dashboard';
          }
          return;
        }
      })
      .catch(console.error);
  }, [router]);

  const handleConfirmLock = async () => {
    if (!selectedCourseId) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/courses/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: selectedCourseId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to lock course');
        setShowConfirmModal(false);
      } else {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const joinCode = urlParams?.get('joinCode');
        const joinHostId = urlParams?.get('joinHostId');
        if (joinCode) {
          window.location.href = `/leaderboard?joinCode=${encodeURIComponent(joinCode)}`;
        } else if (joinHostId) {
          window.location.href = `/leaderboard?joinHostId=${encodeURIComponent(joinHostId)}`;
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      setError('A network error occurred while locking your course');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => String(c._id) === String(selectedCourseId));

  // Category classification
  const isSchoolExam = (c: any) => {
    const cat = (c.category || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    return (
      cat.includes('school') ||
      cat.includes('class') ||
      cat.includes('cbse') ||
      cat.includes('icse') ||
      name.includes('class') ||
      name.includes('cbse') ||
      name.includes('grade')
    );
  };

  const competitiveCourses = courses.filter((c) => !isSchoolExam(c));
  const schoolCourses = courses.filter((c) => isSchoolExam(c));

  // Extract distinct boards for School Exams filter
  const availableBoards = Array.from(
    new Set(
      schoolCourses
        .map((c) => (c.board && c.board !== 'N/A' && c.board.trim() ? c.board.trim() : 'CBSE'))
        .filter(Boolean)
    )
  );

  const filteredSchoolCourses = schoolCourses.filter((c) => {
    if (selectedBoardFilter === 'all') return true;
    const board = (c.board || 'CBSE').toLowerCase();
    return board === selectedBoardFilter.toLowerCase();
  });

  const displayedCourses =
    activeTab === 'all'
      ? [...competitiveCourses, ...filteredSchoolCourses]
      : activeTab === 'competitive'
      ? competitiveCourses
      : filteredSchoolCourses;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>

        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="px-3 py-1 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300 font-bold text-xs rounded-full uppercase tracking-wider mb-3 inline-block">
            Step 1 of 1: Academic Track Selection
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
            Select &amp; Lock Your Target Exam Course
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose your academic syllabus track below. Once confirmed, your question bank, mock examinations, and peer leaderboard will be tailored to this track.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Category Tabs Header */}
        <div className="flex justify-center items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            All Tracks ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('competitive')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'competitive'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Competitive ({competitiveCourses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'school'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> School ({schoolCourses.length})
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-bold">Fetching available courses...</div>
        ) : displayedCourses.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl mb-8">
            <BookOpen className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Courses Available in this Category</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Please check other categories or ask an administrator to add courses in the Admin Portal.
            </p>
          </div>
        ) : (
          <div className="space-y-8 mb-8">
            {/* Competitive Section (Horizontal 3-card carousel) */}
            {(activeTab === 'all' || activeTab === 'competitive') && competitiveCourses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                        Competitive Entrance Exams
                      </h2>
                      <p className="text-[11px] text-slate-500">JEE Mains &amp; Advanced, NEET Medical Entrance, and National Exams</p>
                    </div>
                  </div>

                  {competitiveCourses.length > 3 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleScroll(compScrollRef, 'left')}
                        className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 hover:border-amber-300 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                        title="Scroll Left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScroll(compScrollRef, 'right')}
                        className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 hover:border-amber-300 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                        title="Scroll Right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Single-row Horizontal Scroll Container */}
                <div
                  ref={compScrollRef}
                  className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
                >
                  {competitiveCourses.map((course) => {
                    const isSelected = String(selectedCourseId) === String(course._id);
                    return (
                      <div
                        key={String(course._id)}
                        onClick={() => setSelectedCourseId(String(course._id))}
                        className={`flex-shrink-0 w-[88%] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-11px)] snap-start cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
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
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{course.description}</p>
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

            {/* School Exams Section (Horizontal 3-card carousel) */}
            {(activeTab === 'all' || activeTab === 'school') && schoolCourses.length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                        School Exams (Class 3 to 12)
                      </h2>
                      <p className="text-[11px] text-slate-500">Board exam prep, grade-wise science &amp; maths tracks (Class 3 - 12)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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

                    {filteredSchoolCourses.length > 3 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleScroll(schoolScrollRef, 'left')}
                          className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                          title="Scroll Left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScroll(schoolScrollRef, 'right')}
                          className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                          title="Scroll Right"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Single-row Horizontal Scroll Container */}
                <div
                  ref={schoolScrollRef}
                  className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
                >
                  {filteredSchoolCourses.map((course) => {
                    const isSelected = String(selectedCourseId) === String(course._id);
                    return (
                      <div
                        key={String(course._id)}
                        onClick={() => setSelectedCourseId(String(course._id))}
                        className={`flex-shrink-0 w-[88%] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-11px)] snap-start cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
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
            className="px-8 py-3 bg-brand-800 hover:bg-brand-900 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-4 h-4" /> Confirm &amp; Permanently Lock Selected Course
          </button>
          <p className="text-[11px] text-slate-500 font-medium">
            Permanent Lock Active: Course cannot be altered once confirmed.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center mb-2">
              Lock Course: {selectedCourse?.name}?
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-6 leading-relaxed">
              Once you lock this course track, your dashboard will strictly load questions and mock examinations for{' '}
              <strong>{selectedCourse?.name}</strong>.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-100"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmLock}
                className="flex-1 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1"
              >
                {submitting ? 'Locking...' : 'Yes, Lock Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
