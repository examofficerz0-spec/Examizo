'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, Check, ArrowRight } from 'lucide-react';

export interface ProfileSwitchItem {
  id?: string;
  name: string;
  fullName?: string;
  nickname?: string;
  avatarBg?: string;
  lockedCourseName?: string;
  isVerified?: boolean;
}

export interface ProfileSwitchTarget extends ProfileSwitchItem {
  from?: ProfileSwitchItem;
}

interface ProfileSwitchOverlayProps {
  target: ProfileSwitchTarget | null;
  onComplete?: () => void;
  durationMs?: number;
}

export const ProfileSwitchOverlay: React.FC<ProfileSwitchOverlayProps> = ({
  target,
  onComplete,
  durationMs = 1450,
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'enter' | 'loading' | 'exit'>('enter');
  const [statusText, setStatusText] = useState('Authenticating student profile...');

  const isDifferentProfile = Boolean(
    target &&
      target.from &&
      (target.id && target.from.id
        ? target.id !== target.from.id
        : ((target.nickname || target.fullName || target.name || '').trim().toLowerCase() !==
          (target.from.nickname || target.from.fullName || target.from.name || '').trim().toLowerCase()))
  );

  useEffect(() => {
    if (!target) {
      setProgress(0);
      setStage('enter');
      return;
    }

    const toName = (target.nickname && target.nickname.trim()) || target.name;

    // Phase 1: Mount & start progress immediately
    const startTimer = setTimeout(() => {
      setProgress(25);
      setStage('loading');
      setStatusText(
        isDifferentProfile && target.from
          ? `Connecting from ${target.from.nickname || target.from.name}...`
          : `Opening ${toName}'s workspace...`
      );
    }, 60);

    // Phase 2: Progress to mid-way and update status
    const midTimer = setTimeout(() => {
      setProgress(72);
      setStatusText(
        target.lockedCourseName
          ? `Loading ${target.lockedCourseName} in background...`
          : 'Syncing curriculum progress & mock tests...'
      );
    }, durationMs * 0.36);

    // Phase 3: Progress to 100% and ready
    const readyTimer = setTimeout(() => {
      setProgress(100);
      setStatusText(`Workspace ready! Welcome back, ${toName}!`);
    }, durationMs * 0.72);

    // Phase 4: Soft exit animation before navigation
    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, durationMs - 220);

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
  }, [target, isDifferentProfile, durationMs, onComplete]);

  if (!target) return null;

  const toDisplayName =
    target.nickname && target.nickname.trim()
      ? target.nickname.trim()
      : target.fullName || target.name;
  const toInitial = toDisplayName.charAt(0).toUpperCase();
  const toAvatarBg =
    target.avatarBg || 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600';

  const fromProfile = target.from;
  const fromDisplayName = fromProfile
    ? (fromProfile.nickname && fromProfile.nickname.trim()
        ? fromProfile.nickname.trim()
        : fromProfile.fullName || fromProfile.name)
    : null;
  const fromInitial = fromDisplayName ? fromDisplayName.charAt(0).toUpperCase() : null;
  const fromAvatarBg =
    fromProfile?.avatarBg || 'bg-gradient-to-tr from-slate-500 to-slate-700';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isDifferentProfile ? `Switching profile to ${toDisplayName}` : `Loading profile ${toDisplayName}`}
      className={`fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto select-none overflow-hidden transition-all duration-300 ${
        stage === 'exit'
          ? 'opacity-0 scale-102 backdrop-blur-2xl'
          : 'opacity-100 backdrop-blur-xl'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(241, 245, 249, 0.88) 0%, rgba(226, 232, 240, 0.94) 70%, rgba(203, 213, 225, 0.96) 100%)',
      }}
    >
      {/* Ambient background glowing orbs in light pastel hues */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-400/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-[360px] h-[360px] bg-indigo-300/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-emerald-300/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Light Mode Showcase Card */}
      <div
        className={`relative flex flex-col items-center max-w-md w-full mx-4 p-7 sm:p-9 rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.18)] text-center transition-all duration-300 transform ${
          stage === 'exit' ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Subtle top shine */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

        {/* Mode Pill Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-extrabold uppercase tracking-wider mb-4 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          {isDifferentProfile ? 'Switching Profile' : 'Loading Profile'}
        </div>

        {/* Visual Presentation: Two Profiles for switch, Single for same profile */}
        {isDifferentProfile && fromProfile ? (
          <div className="flex items-center justify-center gap-3 sm:gap-6 w-full mb-6 px-1">
            {/* FROM PROFILE */}
            <div className="flex flex-col items-center max-w-[125px] sm:max-w-[145px] text-center min-w-0">
              <div className="relative mb-2">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-slate-100 border-2 border-slate-200 p-0.5 shadow-xs">
                  <div
                    className={`w-full h-full rounded-full ${fromAvatarBg} text-white font-black text-2xl flex items-center justify-center shadow-inner opacity-75`}
                  >
                    {fromInitial}
                  </div>
                </div>
                <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-extrabold uppercase tracking-wider border border-slate-300/80">
                  From
                </span>
              </div>
              <p className="font-bold text-slate-700 text-xs sm:text-sm truncate w-full mt-1">
                {fromDisplayName}
              </p>
              <span className="text-[10px] text-slate-400 font-semibold truncate w-full mt-0.5">
                {fromProfile.lockedCourseName || 'Current Track'}
              </span>
            </div>

            {/* CONNECTING ARROW & GLOW PULSE */}
            <div className="flex flex-col items-center justify-center shrink-0 px-1">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 border border-blue-200/90 text-blue-600 shadow-sm">
                <ArrowRight className="w-5 h-5 animate-pulse stroke-[2.5]" />
              </div>
              <span className="text-[9.5px] font-extrabold text-blue-600 mt-1 uppercase tracking-wider">
                Switching
              </span>
            </div>

            {/* TO PROFILE */}
            <div className="flex flex-col items-center max-w-[125px] sm:max-w-[145px] text-center min-w-0">
              <div className="relative mb-2">
                {/* Radiant animated glow halo */}
                <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-emerald-400 opacity-70 blur-md animate-pulse" />
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 via-indigo-400 to-emerald-400 shadow-md">
                  <div
                    className={`w-full h-full rounded-full ${toAvatarBg} text-white font-black text-2xl flex items-center justify-center shadow-inner relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />
                    <span className="relative z-10 drop-shadow-sm">{toInitial}</span>

                    {target.isVerified && (
                      <div
                        className="absolute bottom-0 right-0 p-0.5 rounded-full bg-emerald-500 text-white shadow border border-white"
                        title="DigiLocker Verified"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
                <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-xs">
                  To
                </span>
                {/* Sparkle top right */}
                <div
                  className="absolute -top-1.5 -right-1.5 text-amber-400 animate-spin"
                  style={{ animationDuration: '6s' }}
                >
                  <Sparkles className="w-4 h-4 fill-amber-400/40" />
                </div>
              </div>
              <p className="font-extrabold text-slate-900 text-xs sm:text-sm truncate w-full mt-1">
                {toDisplayName}
              </p>
              <span className="text-[10px] text-blue-600 font-bold truncate w-full mt-0.5">
                {target.lockedCourseName || 'Target Track'}
              </span>
            </div>
          </div>
        ) : (
          /* Single Profile Showcase (Same profile or direct entry) */
          <div className="relative mb-5 mt-1">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-emerald-400 opacity-55 blur-lg animate-pulse" />
            <div className="relative p-1 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-400 to-emerald-400 shadow-xl">
              <div
                className={`w-22 h-22 sm:w-24 sm:h-24 rounded-full ${toAvatarBg} text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-inner relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />
                <span className="relative z-10 drop-shadow-md">{toInitial}</span>
                {target.isVerified && (
                  <div
                    className="absolute bottom-1 right-1 p-1 rounded-full bg-emerald-600 text-white shadow-md border-2 border-white"
                    title="DigiLocker Verified"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
            <div
              className="absolute -top-1.5 -right-1.5 text-amber-400 animate-spin"
              style={{ animationDuration: '6s' }}
            >
              <Sparkles className="w-5 h-5 fill-amber-400/50" />
            </div>
          </div>
        )}

        {/* Narrative Heading */}
        {isDifferentProfile ? (
          <>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1 truncate max-w-[340px]">
              Switching to <span className="text-blue-600">{toDisplayName}</span>
            </h2>
            <p className="text-xs font-semibold text-slate-500 mb-5 max-w-[320px]">
              Switching from <strong className="text-slate-800">{fromDisplayName}</strong> to{' '}
              <strong className="text-blue-600">{toDisplayName}</strong>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1.5 truncate max-w-[340px]">
              {toDisplayName}
            </h2>
            <div className="mb-5 flex items-center justify-center">
              {target.lockedCourseName ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/80 shadow-2xs">
                  📚 {target.lockedCourseName}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500">
                  Preparing student workspace...
                </span>
              )}
            </div>
          </>
        )}

        {/* Progress Bar Track */}
        <div className="w-full max-w-[260px] h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/90 shadow-inner mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.35)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Status Text */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 h-5">
          {progress === 100 ? (
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold animate-in fade-in">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Workspace ready
            </span>
          ) : (
            <span className="text-slate-500 transition-opacity duration-200">
              {statusText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSwitchOverlay;
