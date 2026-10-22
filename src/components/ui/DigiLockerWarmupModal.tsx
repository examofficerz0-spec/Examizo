'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(20);
  const [statusText, setStatusText] = useState('Waking up secure verification gateway...');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scrolling while warmup modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-2xl animate-fade-in font-sans overflow-x-hidden overflow-y-auto"
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        backdropFilter: 'blur(24px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md bg-[#0B1315] border border-emerald-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(0,200,150,0.25)] p-5 sm:p-7 text-center overflow-hidden max-h-[92dvh] overflow-y-auto overflow-x-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-6 mt-1 sm:mt-2 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
          <div className="absolute inset-1 rounded-full bg-emerald-500/30 animate-pulse" />
          <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500 text-slate-950 shadow-[0_0_25px_rgba(0,200,150,0.6)] flex items-center justify-center">
            {step === 3 ? (
              <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-slate-950 stroke-[2.5]" />
            ) : step === 2 ? (
              <ShieldCheck className="w-8 h-8 sm:w-9 sm:h-9 text-slate-950 stroke-[2.5]" />
            ) : (
              <Cloud className="w-8 h-8 sm:w-9 sm:h-9 text-slate-950 stroke-[2.5]" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight mb-1.5">
          Connecting to <span className="text-emerald-400">DigiLocker</span>
        </h2>

        {/* Dynamic Status Text */}
        <p className="text-xs font-medium text-slate-300 min-h-[32px] sm:min-h-[36px] flex items-center justify-center px-3 sm:px-4 leading-relaxed mb-5 sm:mb-6">
          {statusText}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2.5 mb-5 sm:mb-6 overflow-hidden p-0.5 border border-white/10">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(0,200,150,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Security Trust Badges */}
        <div className="pt-3.5 sm:pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-semibold text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Official MeriPehchaan 256-bit Encrypted Portal</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DigiLockerWarmupModal;
