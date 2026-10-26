'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, Check } from 'lucide-react';

export interface ProfileSwitchTarget {
  name: string;
  fullName?: string;
  nickname?: string;
  avatarBg?: string;
  lockedCourseName?: string;
  isVerified?: boolean;
}

interface ProfileSwitchOverlayProps {
  target: ProfileSwitchTarget | null;
  onComplete?: () => void;
  durationMs?: number;
}

export const ProfileSwitchOverlay: React.FC<ProfileSwitchOverlayProps> = ({
  target,
  onComplete,
  durationMs = 1350,
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'enter' | 'loading' | 'exit'>('enter');
  const [statusText, setStatusText] = useState('Authenticating student profile...');

  useEffect(() => {
    if (!target) {
      setProgress(0);
      setStage('enter');
      return;
    }

    // Phase 1: Mount & start progress immediately
    const startTimer = setTimeout(() => {
      setProgress(15);
      setStage('loading');
    }, 50);

    // Phase 2: Progress to mid-way and update status
    const midTimer = setTimeout(() => {
      setProgress(68);
      setStatusText(
        target.lockedCourseName
          ? `Preparing ${target.lockedCourseName}...`
          : 'Syncing mock tests & practice logs...'
      );
    }, durationMs * 0.35);

    // Phase 3: Progress to 100% and ready
    const readyTimer = setTimeout(() => {
      setProgress(100);
      setStatusText('Welcome back! Launching workspace...');
    }, durationMs * 0.75);

    // Phase 4: Soft exit animation before navigation
    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, durationMs - 250);

    // Phase 5: Complete & navigate
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, durationMs);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(midTimer);
      clearTimeout(readyTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [target, durationMs, onComplete]);

  if (!target) return null;

  const displayName =
    target.nickname && target.nickname.trim()
      ? target.nickname.trim()
      : target.fullName || target.name;
  const initial = displayName.charAt(0).toUpperCase();
  const avatarBg =
    target.avatarBg || 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Switching profile to ${displayName}`}
      className={`fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto select-none overflow-hidden transition-all duration-300 ${
        stage === 'exit' ? 'opacity-0 scale-102 backdrop-blur-3xl' : 'opacity-100 backdrop-blur-2xl'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(30, 58, 138, 0.40) 0%, rgba(15, 23, 42, 0.94) 60%, rgba(2, 6, 23, 0.98) 100%)',
      }}
    >
      {/* Ambient background glowing orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-[350px] h-[350px] bg-purple-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Showcase Glass Card */}
      <div
        className={`relative flex flex-col items-center max-w-sm w-full mx-5 p-8 sm:p-9 rounded-3xl bg-slate-900/80 border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-center transition-all duration-300 transform ${
          stage === 'exit' ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Subtle top shine */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

        {/* Avatar Showcase with Halo & Sparkles */}
        <div className="relative mb-6">
          {/* Animated Glow Halo */}
          <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-emerald-400 opacity-75 blur-md animate-pulse" />

          {/* Conic rotating border ring */}
          <div className="relative p-1 rounded-full bg-gradient-to-tr from-blue-400 via-indigo-300 to-emerald-300 shadow-2xl">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full ${avatarBg} text-white font-black text-4xl sm:text-5xl flex items-center justify-center shadow-inner relative overflow-hidden`}
            >
              {/* Internal specular lustre sweep */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />
              <span className="relative z-10 drop-shadow-md">{initial}</span>

              {/* Verified Badge */}
              {target.isVerified && (
                <div
                  className="absolute bottom-1 right-1 p-1 rounded-full bg-emerald-600 text-white shadow-md border-2 border-slate-900"
                  title="DigiLocker Verified Profile"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>

          {/* Sparkle star top-right */}
          <div className="absolute -top-1.5 -right-1.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }}>
            <Sparkles className="w-5 h-5 fill-amber-300/40" />
          </div>
        </div>

        {/* Mode Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[10.5px] font-extrabold uppercase tracking-widest mb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          Switching Profile
        </div>

        {/* Target Profile Display Name */}
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm mb-1 truncate max-w-[280px]">
          {displayName}
        </h2>

        {/* Secondary Name or Course pill */}
        {target.lockedCourseName ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300/90 bg-white/5 border border-white/10 px-3 py-0.5 rounded-full mb-5 max-w-[280px] truncate">
            <span>📚 {target.lockedCourseName}</span>
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-400 mb-5">
            {target.fullName && target.nickname ? target.fullName : 'Academic Profile'}
          </p>
        )}

        {/* Progress Bar Track */}
        <div className="w-full max-w-[240px] h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(59,130,246,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Status Text */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-300 h-5">
          {progress === 100 ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> Workspace ready
            </span>
          ) : (
            <span className="text-slate-400 transition-opacity duration-200">
              {statusText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSwitchOverlay;
