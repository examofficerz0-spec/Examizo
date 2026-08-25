'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Cloud, Loader2, Sparkles, X } from 'lucide-react';

interface DigiLockerWarmupModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorizeUrl?: string;
}

export const DigiLockerWarmupModal: React.FC<DigiLockerWarmupModalProps> = ({
  isOpen,
  onClose,
  authorizeUrl = '/api/digilocker/authorize',
}) => {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(20);
  const [statusText, setStatusText] = useState('Waking up secure verification gateway...');

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setProgress(20);
      setStatusText('Waking up secure verification gateway...');
      return;
    }

    let isMounted = true;

    // Pre-warm gateway
    try {
      fetch('https://medizoserver.vercel.app/api/health', { method: 'GET', mode: 'no-cors' }).catch(() => {});
    } catch (e) {}

    // Step 1: Initial warmup (0ms - 900ms)
    setStep(1);
    setProgress(30);
    setStatusText('Waking up secure verification gateway...');

    const t1 = setTimeout(() => {
      if (!isMounted) return;
      setStep(2);
      setProgress(65);
      setStatusText('Establishing 256-bit SSL handshake with DigiLocker...');
    }, 900);

    // Step 2: Verification prep (900ms - 2000ms)
    const t2 = setTimeout(() => {
      if (!isMounted) return;
      setStep(3);
      setProgress(90);
      setStatusText('Preparing Govt. of India MeriPehchaan portal...');
    }, 2000);

    // Step 3: Final redirect (3000ms)
    const t3 = setTimeout(() => {
      if (!isMounted) return;
      setProgress(100);
      setStatusText('Connecting to DigiLocker now...');
      setTimeout(() => {
        window.location.href = authorizeUrl;
      }, 400);
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, authorizeUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#0B1315] border border-emerald-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(0,200,150,0.25)] p-6 sm:p-8 text-center overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Icon with Pulsing Halo */}
        <div className="relative w-24 h-24 mx-auto mb-6 mt-2 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
          <div className="absolute inset-1 rounded-full bg-emerald-500/30 animate-pulse" />
          <div className="relative z-10 w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 shadow-[0_0_25px_rgba(0,200,150,0.6)] flex items-center justify-center">
            {step === 3 ? (
              <CheckCircle2 className="w-9 h-9 text-slate-950 stroke-[2.5]" />
            ) : step === 2 ? (
              <ShieldCheck className="w-9 h-9 text-slate-950 stroke-[2.5]" />
            ) : (
              <Cloud className="w-9 h-9 text-slate-950 stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-slate-100 tracking-tight mb-1.5">
          Connecting to <span className="text-emerald-400">DigiLocker</span>
        </h2>

        {/* Dynamic Status Text */}
        <p className="text-xs font-medium text-slate-300 min-h-[36px] flex items-center justify-center px-4 leading-relaxed mb-6">
          {statusText}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2.5 mb-6 overflow-hidden p-0.5 border border-white/10">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(0,200,150,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Security Trust Badges */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Official MeriPehchaan 256-bit Encrypted Portal</span>
        </div>
      </div>
    </div>
  );
};

export default DigiLockerWarmupModal;
