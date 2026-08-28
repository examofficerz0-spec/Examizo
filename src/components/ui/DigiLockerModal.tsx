'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  ArrowRight,
  Loader2,
  Building2,
  User,
  Calendar,
  CreditCard,
  Hash
} from 'lucide-react';
import { DigiLockerWarmupModal } from './DigiLockerWarmupModal';

interface DigiLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentName?: string;
  courseName?: string;
  verifiedProfile?: any;
}

export function isAbove10thClass(courseName?: string | null): boolean {
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
  verifiedProfile,
}) => {
  const [showWarmup, setShowWarmup] = useState(false);
  const [profileData, setProfileData] = useState<any>(verifiedProfile || null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingStatus(true);
      fetch('/api/digilocker/status')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.verified) {
            setIsVerified(true);
            setProfileData(data.profile);
            localStorage.setItem('examizo_digilocker_verified', 'true');
          } else {
            setIsVerified(false);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingStatus(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartLiveVerification = () => {
    setShowWarmup(true);
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 max-h-[92dvh] flex flex-col">
          {/* Top DigiLocker Banner Header */}
          <div className="bg-gradient-to-r from-[#072448] via-[#0b3c68] to-[#144272] p-4 sm:p-6 text-white relative shrink-0">
            <button
              onClick={onClose}
              type="button"
              className="absolute top-3.5 right-3.5 p-2 text-slate-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pr-8 sm:pr-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 backdrop-blur-md flex items-center justify-center text-sky-300 font-bold shrink-0 shadow-inner">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-sky-300" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-sky-300" />
                  <span>Govt. of India Integration</span>
                </div>
                <h2 className="text-base sm:text-xl font-black tracking-tight mt-0.5">DigiLocker Academic Verification</h2>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {loadingStatus ? (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Checking DigiLocker verification records...</p>
              </div>
            ) : isVerified ? (
              /* Verified Profile Details Card */
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-300">
                    Verified with MeriPehchaan ✓
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Identity KYC Verified</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    National Academic Depository & UIDAI identity verified.
                  </p>
                </div>

                {/* Profile Key-Value Grid */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" /> Verified Name
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {profileData?.name || studentName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Date of Birth & Age
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {profileData?.formattedDob || profileData?.dob || 'On Record'}{' '}
                      {profileData?.age ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-[11px] ml-1">
                          {profileData.age} yrs
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {profileData?.gender && (
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <span className="text-slate-500 font-semibold">Gender</span>
                      <span className="font-bold text-slate-800">{profileData.gender}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Masked Aadhaar
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {profileData?.maskedAadhaar || 'Verified via Aadhaar'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-purple-600" /> DigiLocker Ref / ID
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 truncate max-w-[200px]">
                      {profileData?.digilockerid || profileData?.referenceKey || 'DL-PKCE-VERIFIED'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Close & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Unverified: Initiate Live Gateway Verification */
              <div className="space-y-6">
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-sky-950 leading-relaxed font-medium">
                    <p className="font-extrabold">Official Govt. of India DigiLocker Portal</p>
                    <p className="mt-1 text-sky-800">
                      Verify your student identity securely using your registered Aadhaar / Mobile number with the DigiLocker MeriPehchaan Gateway.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Click Verify with DigiLocker</span>
                      <span className="text-[11px] text-slate-500 font-medium">Redirects to official MeriPehchaan authentication</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Authenticate with 6-Digit PIN or OTP</span>
                      <span className="text-[11px] text-slate-500 font-medium">Secured by 256-bit SSL encryption</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Instant Verification & Unlock</span>
                      <span className="text-[11px] text-slate-500 font-medium">Verified Name & Age saved directly to account</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartLiveVerification}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-5 h-5 text-sky-200" />
                    <span>Proceed to DigiLocker Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-400 font-medium">
                  Protected by 256-bit SSL Encryption • DigiLocker National Academic Depository
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated Warmup Connecting Modal */}
      <DigiLockerWarmupModal
        isOpen={showWarmup}
        onClose={() => setShowWarmup(false)}
        authorizeUrl="/api/digilocker/authorize"
      />
    </>
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

  // 1. School Section: Class 11 & Class 12 (Mandatory DigiLocker)
  const isSeniorSchool =
    /\b(class|grade|standard|std)\s*(11|12|xi|xii)\b/i.test(name) ||
    /\b(11th|12th)\b/i.test(name) ||
    /\b(class\s*11|class\s*12|class\s*xi|class\s*xii)\b/i.test(category);

  if (isSeniorSchool) {
    return true;
  }

  // 2. School Section: Class 3 to Class 10 (Exempt from DigiLocker)
  const isJuniorSchool =
    /\b(class|grade|standard|std)\s*(3|4|5|6|7|8|9|10|iii|iv|v|vi|vii|viii|ix|x)\b/i.test(name) ||
    /\b(3rd|4th|5th|6th|7th|8th|9th|10th)\b/i.test(name) ||
    /\b(class\s*(3|4|5|6|7|8|9|10)|grade\s*(3|4|5|6|7|8|9|10))\b/i.test(category);

  if (isJuniorSchool) {
    return false;
  }

  // 3. Other School Category classes (e.g. primary/kindergarten)
  if (category === 'school' || category.includes('school')) {
    return false;
  }

  // 4. Competitive / Entrance / Govt / Olympiad Categories
  if (
    category.includes('competitive') ||
    category.includes('entrance') ||
    category.includes('govt') ||
    category.includes('olympiad')
  ) {
    return true;
  }

  // 5. Competitive Exam Name Keywords
  const compKeywords = [
    'jee', 'neet', 'cuet', 'nda', 'wbjee', 'bitsat', 'iiser', 'nest', 'kvpy',
    'olympiad', 'clat', 'cat', 'gate', 'upsc', 'ssc', 'bank', 'railway', 'defence',
    'afcat', 'cds', 'capf', 'ias', 'ips', 'state psc', 'wbcsc', 'tet', 'ctet', 'ssc cgl', 'chsl'
  ];

  if (compKeywords.some((k) => name.includes(k))) {
    return true;
  }

  // Default: treat other professional/entrance tracks as restricted
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
