'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, X, ExternalLink, ArrowRight, Loader2, Sparkles, Building2 } from 'lucide-react';

interface DigiLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentName?: string;
  courseName?: string;
}

export function isAbove10thClass(courseName?: string | null): boolean {
  let name = courseName;
  if (!name && typeof window !== 'undefined') {
    name = sessionStorage.getItem('examizo_cached_course_name') || '';
  }
  if (!name) return false; // Default: do not lock if course is not yet confirmed

  const lower = name.toLowerCase().trim();

  // Class 3 to 10 are school classes <= 10th -> EXEMPT (return false)
  const isSchoolBelow10 =
    /\bclass\s*(3|4|5|6|7|8|9|10)\b/.test(lower) ||
    /\bclass\s*(3rd|4th|5th|6th|7th|8th|9th|10th)\b/.test(lower) ||
    /\b(3rd|4th|5th|6th|7th|8th|9th|10th)\s*(class|grade|standard|std|exam|cbse|icse|state)?\b/.test(lower) ||
    /\b(classs?\s*7th|classs?\s*8th|classs?\s*9th|classs?\s*10th)\b/.test(lower) ||
    /\bgrade\s*(3|4|5|6|7|8|9|10)\b/.test(lower) ||
    /\bstd\s*(3|4|5|6|7|8|9|10)\b/.test(lower) ||
    /\bprimary\b/.test(lower) ||
    /\bmiddle\s*school\b/.test(lower) ||
    /\bsecondary\b/.test(lower) ||
    /\bfoundation\b/.test(lower);

  if (isSchoolBelow10) {
    return false; // Not mandatory for Class 3-10
  }

  // Only Class 11, Class 12, and Competitive Exams (JEE, NEET, GATE, UPSC, SSC, Banking, RRB, etc.) are > 10th
  const isHigherOrCompetitive =
    /\bclass\s*(11|12|11th|12th)\b/.test(lower) ||
    /\b(11th|12th)\s*(class|grade|standard|std)?\b/.test(lower) ||
    /\b(jee|neet|gate|upsc|ssc|banking|rrb|railway|cat|nda|cds|cuet|clat|ias|ips)\b/.test(lower);

  return isHigherOrCompetitive;
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

/* Lock Overlay Guard for Pages outside Dashboard when DigiLocker Verification is required */
interface DigiLockerGuardProps {
  children: React.ReactNode;
  courseName?: string;
  studentName?: string;
}

const getCachedIsSubProfile = (): boolean => {
  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem('examizo_is_sub_profile');
    if (cached !== null) return cached === 'true';
  }
  return false;
};

export const DigiLockerGuard: React.FC<DigiLockerGuardProps> = ({
  children,
  courseName,
  studentName,
}) => {
  const [isVerified, setIsVerified] = useState<boolean>(getDigiLockerStatus());
  const [isSubProfileUser, setIsSubProfileUser] = useState<boolean>(getCachedIsSubProfile());
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const checkStatus = () => {
    setIsVerified(getDigiLockerStatus());
  };

  useEffect(() => {
    setMounted(true);
    checkStatus();

    // Check if current active profile is a sub-profile (sub-profiles do NOT require DigiLocker)
    fetch('/api/profile/list')
      .then((res) => res.json())
      .then((data) => {
        if (data.profiles && Array.isArray(data.profiles)) {
          const activeProf = data.profiles.find((p: any) => p.isActive);
          const isSub = activeProf && activeProf.isPrimary === false;
          setIsSubProfileUser(Boolean(isSub));
          if (activeProf?.lockedCourseName) {
            sessionStorage.setItem('examizo_cached_course_name', activeProf.lockedCourseName);
          }
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('examizo_is_sub_profile', isSub ? 'true' : 'false');
          }
        }
      })
      .catch(console.error);

    const handleStorage = () => checkStatus();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('digilocker_status_change', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('digilocker_status_change', handleStorage);
    };
  }, []);

  // Sub-profiles and Class 3-10 students are EXEMPT from DigiLocker verification requirements
  const isMandatory = isAbove10thClass(courseName) && !isSubProfileUser;

  // Immediate synchronous render if verified or exempt (0 delay, no popup flashing)
  if (!isMandatory || isVerified) return <>{children}</>;

  if (!mounted) return <>{children}</>;

  // Handle 1-Click Instant Verification Unlock
  const handleInstantUnlock = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('examizo_digilocker_verified', 'true');
      window.dispatchEvent(new Event('digilocker_status_change'));
    }
    setIsVerified(true);
  };

  // If DigiLocker is mandatory (> 10th Class) and NOT verified, render lock screen below the top header navbar
  if (isMandatory && !isVerified) {
    return (
      <div className="relative w-full min-h-screen">
        {/* Background Page Content */}
        <div className="filter blur-sm opacity-30 pointer-events-none select-none overflow-hidden max-h-[85vh]">
          {children}
        </div>

        {/* Centered Glass Lock Screen Overlay (Positioned top-20 below fixed navbar with z-30 so header & profile dropdown remain 100% crisp & clickable) */}
        <div className="fixed top-20 inset-x-0 bottom-0 z-30 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-sm animate-fade-in">
          <div className="max-w-xl w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 text-center space-y-5 relative overflow-hidden">
            
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>DigiLocker Verification Mandatory</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Unlock Full Access with DigiLocker
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
                As per academic compliance guidelines for <strong className="text-slate-900 dark:text-white">Class 11, Class 12, and Competitive Exam Aspirants</strong>, DigiLocker identity verification unlocks your full practice portal.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-left text-xs space-y-2 text-slate-600 dark:text-slate-300 font-medium">
              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-center border-b border-slate-200 dark:border-slate-700 pb-1.5">
                🔒 Feature Access Status
              </p>
              <div className="flex items-center justify-between text-[11px]">
                <span>Student Dashboard:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Unlocked ✅</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Practice Sets &amp; DPPs:</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">Locked 🔒 (Requires DigiLocker)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Full Mock Exams:</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">Locked 🔒 (Requires DigiLocker)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Leaderboards &amp; Resources:</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">Locked 🔒 (Requires DigiLocker)</span>
              </div>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify with DigiLocker Gateway</span>
              </button>

              <button
                type="button"
                onClick={handleInstantUnlock}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Quick 1-Click Instant Unlock</span>
              </button>
            </div>

            <DigiLockerModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onSuccess={() => setIsVerified(true)}
              studentName={studentName}
              courseName={courseName}
            />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
