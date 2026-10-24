'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';
import { clearAllClientUserCaches } from '@/lib/clientCache';
import { hideNativeSplashScreen } from '@/lib/nativeApp';
import {
  CurriculumPickerModal,
  SelectedCurriculumResult,
} from '@/components/curriculum/CurriculumPickerModal';

export default function CourseSelectionPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        hideNativeSplashScreen();
      });

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
        if (meData?.user?.lockedCourse || meData?.user?.lockedCourseId || meData?.user?.locked_course_id) {
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

  const handleWizardSelect = async (result: SelectedCurriculumResult) => {
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/courses/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: result.courseId,
          courseData: result,
        }),
      });

      // Synchronize secondary route
      fetch('/api/course/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: result.courseId }),
      }).catch(() => {});

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to lock course');
      } else {
        clearAllClientUserCaches();
        try {
          const savedStr = localStorage.getItem('exammaster_saved_accounts');
          if (savedStr) {
            const saved = JSON.parse(savedStr);
            if (Array.isArray(saved) && saved.length > 0) {
              saved.forEach((acc: any) => {
                acc.lockedCourseId = result.courseId;
              });
              localStorage.setItem('exammaster_saved_accounts', JSON.stringify(saved));
            }
          }
        } catch (_) {}

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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-3xl w-full mx-auto">
        {/* Brand Header */}
        <div className="flex justify-center mb-5">
          <Logo />
        </div>

        {/* Section Heading - Pure Light Mode */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-black uppercase tracking-wider mb-2.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Interactive Curriculum Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Choose Your Academic Syllabus Track 🎯
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Personalize your study path in a few quick taps. Your daily practice, mock examinations, and leaderboards will be tailored to this track.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5 shadow-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <PageLoader
            inline
            title="Loading Syllabus Options"
            subtitle="Fetching curriculum tracks from the examination server..."
            minHeight="min-h-[300px]"
          />
        ) : (
          <div className="w-full flex justify-center">
            {/* Inline Curriculum Wizard */}
            <CurriculumPickerModal
              inline={true}
              availableCourses={courses}
              onSelectCurriculum={handleWizardSelect}
              isSubmitting={submitting}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400 font-semibold border-t border-slate-200/60 max-w-3xl mx-auto w-full mt-8">
        © 2026 Examizo. All rights reserved. • Built for Student Excellence
      </footer>
    </div>
  );
}
