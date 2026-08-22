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
  // DigiLocker restriction temporarily removed - all features unlocked
  return true;
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
}) => {
  // DigiLocker restriction temporarily removed
  return <>{children}</>;
};
