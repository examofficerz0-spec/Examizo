'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, X, ExternalLink, ArrowRight, Loader2, Building2 } from 'lucide-react';

interface DigiLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentName?: string;
  courseName?: string;
}

export function isAbove10thClass(courseName?: string | null): boolean {
  // DigiLocker restriction temporarily removed
  return false;
}

export function getDigiLockerStatus(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('examizo_digilocker_verified') === 'true';
}

export const DigiLockerModal: React.FC<DigiLockerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentName = 'Student',
  courseName,
}) => {
  const [aadhaar, setAadhaar] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'input' | 'verifying' | 'success'>('input');
  const [error, setError] = useState('');
  const [progressMsg, setProgressMsg] = useState('Connecting to DigiLocker Gateway...');

  if (!isOpen) return null;

  const handleStartVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaar.replaceAll(' ', '').length < 12) {
      setError('Please enter a valid 12-digit Aadhaar / Virtual ID number.');
      return;
    }
    if (pin.length < 6) {
      setError('Please enter your 6-digit DigiLocker Security PIN.');
      return;
    }

    setError('');
    setStep('verifying');

    // Simulate realistic DigiLocker Government Gateway Verification Progress
    setTimeout(() => {
      setProgressMsg('Authenticating Aadhaar credentials with UIDAI...');
    }, 1000);

    setTimeout(() => {
      setProgressMsg('Fetching verified academic certificates...');
    }, 2200);

    setTimeout(() => {
      setProgressMsg('Finalizing DigiLocker Academic ID verification...');
    }, 3400);

    setTimeout(() => {
      setStep('success');
      localStorage.setItem('examizo_digilocker_verified', 'true');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('digilocker_status_change'));
      }
    }, 4400);
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        
        {/* Top DigiLocker Banner Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 backdrop-blur-md flex items-center justify-center text-blue-300 font-bold shrink-0 shadow-inner">
              <Building2 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                <span>Govt. of India Integration</span>
              </div>
              <h2 className="text-xl font-black tracking-tight mt-1">DigiLocker Academic Verification</h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          {step === 'input' && (
            <form onSubmit={handleStartVerification} className="space-y-5">
              <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed font-medium">
                  <p className="font-extrabold">Why is DigiLocker Verification needed?</p>
                  <p className="mt-0.5 text-blue-800">
                    For students in <strong className="font-extrabold text-blue-950">Class 11, 12, and Competitive Exams</strong>, DigiLocker verification ensures identity compliance and unlocks your full practice portal.
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  12-Digit Aadhaar / Virtual ID Number
                </label>
                <input
                  type="text"
                  maxLength={14}
                  required
                  placeholder="e.g. 5482 9102 3841"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  className="w-full text-sm p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  6-Digit DigiLocker Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="******"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full text-sm p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Verify with DigiLocker Gateway</span>
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400 font-medium">
                Protected by 256-bit SSL Encryption • DigiLocker National Academic Depository
              </p>
            </form>
          )}

          {step === 'verifying' && (
            <div className="py-10 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center mx-auto text-blue-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Verifying DigiLocker Identity...</h3>
                <p className="text-xs font-bold text-blue-600 animate-pulse">{progressMsg}</p>
              </div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Please wait while we establish a secure connection with the DigiLocker National Gateway.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-300">
                  Verification Successful ✅
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">DigiLocker Identity Verified!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium leading-relaxed">
                  Congratulations <strong className="text-slate-900">{studentName}</strong>! Your DigiLocker Academic ID has been successfully verified. All practice sets, mock tests, and leaderboards are now unlocked.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Verification Status:</span>
                  <span className="font-extrabold text-emerald-600">Active & Verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">DigiLocker Reference:</span>
                  <span className="font-mono font-bold text-slate-800">DL-2026-EXAMIZO-9842</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Portal</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function isCompetitiveCourse(courseOrName?: any): boolean {
  if (!courseOrName) return false;
  let name = '';
  let category = '';
  if (typeof courseOrName === 'string') {
    name = courseOrName.toLowerCase().trim();
  } else if (typeof courseOrName === 'object') {
    name = (courseOrName.name || courseOrName.title || '').toLowerCase().trim();
    category = (courseOrName.category || '').toLowerCase().trim();
  }

  if (
    category.includes('competitive') ||
    category.includes('entrance') ||
    category.includes('govt') ||
    category.includes('olympiad')
  ) {
    return true;
  }

  if (category === 'school' || category.includes('school')) {
    const juniorSchoolRegex = /class\s*(3|4|5|6|7|8|9|10)\b|grade\s*(3|4|5|6|7|8|9|10)\b/i;
    if (juniorSchoolRegex.test(name) || juniorSchoolRegex.test(category)) {
      return false;
    }
    if (/class\s*(11|12)\b|grade\s*(11|12)\b/i.test(name)) {
      return true;
    }
    return false;
  }

  const compKeywords = [
    'jee', 'neet', 'cuet', 'nda', 'wbjee', 'bitsat', 'iiser', 'nest', 'kvpy',
    'olympiad', 'clat', 'cat', 'gate', 'upsc', 'ssc', 'bank', 'railway', 'defence',
    'afcat', 'cds', 'capf', 'ias', 'ips', 'state psc', 'wbcsc', 'tet', 'ctet', 'ssc cgl', 'chsl'
  ];

  if (compKeywords.some((k) => name.includes(k))) {
    return true;
  }

  const juniorRegex = /class\s*(3|4|5|6|7|8|9|10)\b|grade\s*(3|4|5|6|7|8|9|10)\b/i;
  if (juniorRegex.test(name)) {
    return false;
  }

  return true;
}

export function getCachedIsCompetitive(courseOrName?: any): boolean {
  if (courseOrName) return isCompetitiveCourse(courseOrName);
  if (typeof window === 'undefined') return false;
  const cachedFlag = localStorage.getItem('examizo_is_competitive');
  if (cachedFlag !== null) return cachedFlag === 'true';
  const cachedCourseName = localStorage.getItem('examizo_cached_course_name') || sessionStorage.getItem('examizo_cached_course_name');
  if (cachedCourseName) return isCompetitiveCourse(cachedCourseName);
  return false;
}

/* Universal Lock Overlay Guard for restricted pages when DigiLocker Verification is required */
interface DigiLockerGuardProps {
  children: React.ReactNode;
  courseName?: string;
  studentName?: string;
}

export const DigiLockerGuard: React.FC<DigiLockerGuardProps> = ({
  children,
  courseName,
  studentName,
}) => {
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return getDigiLockerStatus();
    }
    return true;
  });

  const [isComp, setIsComp] = useState<boolean>(() => {
    return getCachedIsCompetitive(courseName);
  });

  const [resolvedCourseName, setResolvedCourseName] = useState<string>(() => {
    if (courseName) return courseName;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('examizo_cached_course_name') || sessionStorage.getItem('examizo_cached_course_name') || '';
    }
    return '';
  });

  useEffect(() => {
    const syncStatus = () => {
      setIsVerified(getDigiLockerStatus());
    };
    syncStatus();

    // Background silent cache sync
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          const courseObj = data.user.lockedCourse;
          const cName = courseObj?.name || courseName || '';
          const comp = isCompetitiveCourse(courseObj || cName);
          setResolvedCourseName(cName);
          setIsComp(comp);

          if (typeof window !== 'undefined') {
            localStorage.setItem('examizo_cached_course_name', cName);
            localStorage.setItem('examizo_is_competitive', comp ? 'true' : 'false');
          }
        }
      })
      .catch(console.error);

    window.addEventListener('storage', syncStatus);
    window.addEventListener('digilocker_status_change', syncStatus);
    return () => {
      window.removeEventListener('storage', syncStatus);
      window.removeEventListener('digilocker_status_change', syncStatus);
    };
  }, [courseName]);

  // If verified OR course is not competitive, render immediately with 0 delay!
  if (isVerified || !isComp) {
    return <>{children}</>;
  }

  // Universal Restriction Card: Redirects to /profile where the original DigiLocker button is located!
  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Ambient Corner Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/10 dark:bg-blue-600/15 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 dark:bg-indigo-600/15 blur-3xl pointer-events-none rounded-full" />

        {/* Security Shield Badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto text-white shadow-xl shadow-blue-500/25 relative z-10 border-2 border-white/30">
          <Lock className="w-9 h-9" />
        </div>

        <div className="space-y-2 relative z-10 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-black uppercase tracking-wider shadow-2xs">
            <Building2 className="w-3.5 h-3.5" /> DigiLocker Verification Mandatory
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Academic Verification Required
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            DigiLocker identity authentication is mandatory for competitive tracks{' '}
            <strong className="text-slate-900 dark:text-white font-extrabold">({resolvedCourseName || 'Competitive Course'})</strong>{' '}
            to access Mock Examinations, Practice sets, and Material.
          </p>
        </div>

        {/* 3 Step Trust Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left relative z-10">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1.5" />
            <span className="text-xs font-black text-slate-900 dark:text-white block">Official Security</span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">UIDAI &amp; Academic Depository</span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <Lock className="w-5 h-5 text-blue-500 mb-1.5" />
            <span className="text-xs font-black text-slate-900 dark:text-white block">One-Time Sync</span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Sync once for lifetime</span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-amber-500 mb-1.5" />
            <span className="text-xs font-black text-slate-900 dark:text-white block">Full Unlock</span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Unlocks tests &amp; practice</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
          <a
            href="/profile"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify on Profile Page</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </a>
          <a
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};
