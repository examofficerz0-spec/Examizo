'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import {
  Lock,
  Plus,
  Trash2,
  KeyRound,
  Check,
  ShieldCheck,
  Edit2,
  X,
  LogOut,
  ArrowRight,
  Sparkles,
  BookOpen,
  Calendar,
  User,
} from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';
import { clearAllClientUserCaches } from '@/lib/clientCache';
import {
  CurriculumPickerModal,
  SelectedCurriculumResult,
} from '@/components/curriculum/CurriculumPickerModal';

interface ProfileItem {
  id: string;
  name: string;
  fullName?: string;
  nickname?: string | null;
  dob?: string | null;
  email: string;
  accountEmail: string;
  lockedCourseId: string | null;
  lockedCourseName: string | null;
  isActive: boolean;
  isPrimary: boolean;
  hasPin: boolean;
  avatarColor?: string;
  xp_total?: number;
}

const AVATAR_PALETTES = [
  'from-blue-600 to-indigo-700',
  'from-emerald-500 to-teal-700',
  'from-purple-600 to-violet-800',
  'from-amber-500 to-orange-600',
];

export default function NetflixProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);

  // PIN Verification Modal State
  const [selectedProfileForPin, setSelectedProfileForPin] = useState<ProfileItem | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Create Sub-Profile Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCurriculumPickerModal, setShowCurriculumPickerModal] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState<SelectedCurriculumResult | null>(null);
  const [newProfileFullName, setNewProfileFullName] = useState('');
  const [newProfileNickname, setNewProfileNickname] = useState('');
  const [newProfileDob, setNewProfileDob] = useState('');
  const [newProfileCourseId, setNewProfileCourseId] = useState('');
  const [newProfilePin, setNewProfilePin] = useState('');
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Set/Change PIN Modal State (in Manage Mode)
  const [pinModalProfile, setPinModalProfile] = useState<ProfileItem | null>(null);
  const [managePinInput, setManagePinInput] = useState('');
  const [managePinError, setManagePinError] = useState('');
  const [managePinLoading, setManagePinLoading] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profile/list', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Fetch courses when create modal opens
  const openCreateModal = () => {
    setNewProfileFullName('');
    setNewProfileNickname('');
    setNewProfileDob('');
    setNewProfileCourseId('');
    setSelectedCurriculum(null);
    setNewProfilePin('');
    setCreateError('');
    setShowCreateModal(true);
    fetch('/api/courses')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.courses)) {
          const active = data.courses.filter((c: any) => c.is_active !== false);
          setAvailableCourses(active);
        }
      })
      .catch(console.error);
  };

  // Direct Profile Selection / Prompt for PIN
  const handleSelectProfile = (profile: ProfileItem) => {
    if (isManaging) return;

    if (profile.hasPin) {
      setSelectedProfileForPin(profile);
      setPinDigits(['', '', '', '']);
      setPinError('');
      setTimeout(() => {
        pinInputRefs[0].current?.focus();
      }, 100);
      return;
    }

    // Direct switch if no PIN
    executeSwitch(profile.id);
  };

  const executeSwitch = async (profileId: string, pin?: string) => {
    setPinSubmitting(true);
    setPinError('');
    try {
      clearAllClientUserCaches();
      const res = await fetch('/api/profile/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPinError(data.error || 'Incorrect PIN');
        setPinDigits(['', '', '', '']);
        pinInputRefs[0].current?.focus();
      } else {
        clearAllClientUserCaches();
        // Redirect to course selection if not locked, otherwise dashboard
        if (!data.profile?.lockedCourseId) {
          window.location.href = '/course-selection';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      setPinError('Network error while switching profiles');
    } finally {
      setPinSubmitting(false);
    }
  };

  // Handle PIN input change (4 digits auto-advancing)
  const handlePinDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const updated = [...pinDigits];
    updated[index] = char;
    setPinDigits(updated);
    setPinError('');

    if (char && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }

    // Auto submit upon 4th digit entered
    if (char && index === 3) {
      const fullPin = updated.join('');
      if (fullPin.length === 4 && selectedProfileForPin) {
        executeSwitch(selectedProfileForPin.id, fullPin);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  // Handle Sub-Profile Creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileFullName.trim()) {
      setCreateError('Full name is required');
      return;
    }
    if (!newProfileDob.trim()) {
      setCreateError('Date of birth (DOB) is required');
      return;
    }
    const finalCourseId = selectedCurriculum?.courseId || newProfileCourseId;
    if (!finalCourseId) {
      setCreateError('Target course curriculum track is required. Please choose your School or Competitive track.');
      return;
    }
    if (newProfilePin && !/^\d{4}$/.test(newProfilePin.trim())) {
      setCreateError('Profile PIN must be exactly 4 numeric digits');
      return;
    }

    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newProfileFullName.trim(),
          name: newProfileFullName.trim(),
          nickname: newProfileNickname.trim() || null,
          dob: newProfileDob.trim(),
          courseId: finalCourseId,
          courseData: selectedCurriculum,
          pin: newProfilePin.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create profile');
      } else {
        setShowCreateModal(false);
        clearAllClientUserCaches();
        window.location.href = '/dashboard';
      }
    } catch {
      setCreateError('Failed to create profile');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Setting / Updating PIN in Manage Mode
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModalProfile) return;
    if (managePinInput && !/^\d{4}$/.test(managePinInput.trim())) {
      setManagePinError('PIN must be exactly 4 numeric digits');
      return;
    }

    setManagePinLoading(true);
    setManagePinError('');
    try {
      const res = await fetch('/api/profile/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: pinModalProfile.id,
          pin: managePinInput.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setManagePinError(data.error || 'Failed to update PIN');
      } else {
        setPinModalProfile(null);
        fetchProfiles();
      }
    } catch {
      setManagePinError('Failed to update PIN');
    } finally {
      setManagePinLoading(false);
    }
  };

  // Delete Sub-Profile
  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to remove this profile? All test attempts under this profile will be permanently removed.')) return;
    try {
      const res = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (res.ok) {
        fetchProfiles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    clearAllClientUserCaches();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <PageLoader inline title="Loading Student Profiles" subtitle="Syncing multi-profile academic roster..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Logo size={42} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Center Netflix "Who's Studying?" Container */}
      <main className="relative z-10 flex flex-col items-center justify-center my-auto py-12 max-w-5xl mx-auto w-full text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="w-3.5 h-3.5" /> Multi-Profile Academic Hub
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
          Who is studying today?
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-12 font-medium">
          Select your personal profile below to enter your custom examination workspace.
        </p>

        {/* Profile Tiles Grid */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 max-w-4xl w-full mb-12">
          {profiles.map((profile, idx) => {
            const gradientBg = AVATAR_PALETTES[idx % AVATAR_PALETTES.length];
            const displayName = profile.nickname && profile.nickname.trim() ? profile.nickname.trim() : (profile.fullName || profile.name);
            const initialLetter = displayName.charAt(0).toUpperCase();

            return (
              <div
                key={profile.id}
                className="group flex flex-col items-center cursor-pointer relative"
                onClick={() => handleSelectProfile(profile)}
              >
                {/* Profile Avatar Tile */}
                <div
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br ${gradientBg} flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-xl transition-all duration-300 relative overflow-hidden ${
                    isManaging
                      ? 'ring-4 ring-slate-700 opacity-90'
                      : 'group-hover:scale-108 group-hover:ring-4 group-hover:ring-white group-hover:shadow-2xl group-active:scale-98'
                  }`}
                >
                  <span>{initialLetter}</span>

                  {/* Lock Indicator badge */}
                  {profile.hasPin && (
                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-slate-950/80 backdrop-blur-xs text-amber-400 flex items-center justify-center border border-amber-400/40 shadow-xs">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}

                  {/* Active Indicator */}
                  {profile.isActive && !isManaging && (
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                      <Check className="w-2.5 h-2.5" /> Current
                    </div>
                  )}

                  {/* Manage Overlay Mode */}
                  {isManaging && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinModalProfile(profile);
                          setManagePinInput('');
                          setManagePinError('');
                        }}
                        className="px-2.5 py-1 bg-white text-slate-950 rounded-lg text-[11px] font-extrabold flex items-center gap-1 hover:bg-slate-200 transition-all cursor-pointer shadow-xs"
                      >
                        <KeyRound className="w-3 h-3 text-blue-600" />
                        {profile.hasPin ? 'Change PIN' : 'Set PIN'}
                      </button>

                      {!profile.isPrimary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProfile(profile.id);
                          }}
                          className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Name (Nickname if provided, else Full Name) & Course Label */}
                <span className="mt-3.5 text-sm sm:text-base font-extrabold text-slate-300 group-hover:text-white transition-colors truncate max-w-[140px]">
                  {displayName}
                </span>

                {profile.nickname && profile.fullName && profile.nickname !== profile.fullName && (
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
                    {profile.fullName}
                  </span>
                )}

                {profile.lockedCourseName && (
                  <span className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 group-hover:text-blue-400 group-hover:border-blue-900/60 transition-colors truncate max-w-[140px]">
                    {profile.lockedCourseName}
                  </span>
                )}
              </div>
            );
          })}

          {/* Add Profile Card (Netflix Plus tile, max 4) */}
          {profiles.length < 4 && !isManaging && (
            <div
              onClick={openCreateModal}
              className="group flex flex-col items-center cursor-pointer"
            >
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-400 text-slate-500 hover:text-white flex items-center justify-center transition-all duration-300 group-hover:scale-108 group-active:scale-98">
                <Plus className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <span className="mt-3.5 text-sm sm:text-base font-extrabold text-slate-400 group-hover:text-white transition-colors">
                Add Profile
              </span>
              <span className="mt-1 text-[10px] font-medium text-slate-600">
                {profiles.length}/4 Profiles
              </span>
            </div>
          )}
        </div>

        {/* Bottom Actions: Manage Profiles Toggle */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsManaging(!isManaging)}
            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold tracking-wider uppercase transition-all cursor-pointer border ${
              isManaging
                ? 'bg-white text-slate-950 border-white hover:bg-slate-200 shadow-lg'
                : 'bg-transparent text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
            }`}
          >
            {isManaging ? 'Done Managing' : 'Manage Profiles'}
          </button>

          {!isManaging && (
            <button
              type="button"
              onClick={() => {
                const currentActive = profiles.find((p) => p.isActive);
                if (currentActive?.hasPin) {
                  handleSelectProfile(currentActive);
                } else {
                  window.location.href = '/dashboard';
                }
              }}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold tracking-wider bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              Enter Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-10 text-center text-xs text-slate-600 pb-2">
        Protected student profiles &copy; {new Date().getFullYear()} Examizo Precision Learning
      </footer>

      {/* ── MODAL 1: 4-Digit PIN Unlock Dialog (Netflix Style) ── */}
      {selectedProfileForPin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div
            className={`bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative transition-transform ${
              isShaking ? 'animate-shake' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => setSelectedProfileForPin(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">
              Profile Lock Active
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Enter your 4-digit security PIN to access{' '}
              <strong className="text-white">{selectedProfileForPin.name}</strong>
            </p>

            {pinError && (
              <div className="p-2.5 mb-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold animate-in fade-in">
                {pinError}
              </div>
            )}

            {/* 4 Digit Boxes */}
            <div className="flex justify-center items-center gap-3 mb-6">
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={pinInputRefs[idx]}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  autoFocus={idx === 0}
                  disabled={pinSubmitting}
                  onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  className="w-14 h-16 text-center text-2xl font-black bg-slate-950 border-2 border-slate-700 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 rounded-2xl text-white outline-none transition-all shadow-inner"
                />
              ))}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedProfileForPin(null)}
                className="flex-1 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pinSubmitting || pinDigits.join('').length !== 4}
                onClick={() => {
                  if (selectedProfileForPin) {
                    executeSwitch(selectedProfileForPin.id, pinDigits.join(''));
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all disabled:opacity-40 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                {pinSubmitting ? 'Verifying...' : 'Unlock & Enter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Create Sub-Profile with 4-Digit PIN ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Create New Sub-Profile</h3>
                <p className="text-xs text-slate-400">Add an independent study track for this account</p>
              </div>
            </div>

            {createError && (
              <div className="p-3 mb-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-medium">
              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-extrabold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Full Name *
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Legal / Academic name</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProfileFullName}
                  onChange={(e) => setNewProfileFullName(e.target.value)}
                  placeholder="e.g. Ahmad Faraz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-xs"
                />
              </div>

              {/* Nickname (Optional) Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-extrabold">Nickname (Optional)</label>
                  <span className="text-[10px] text-blue-400 font-semibold">Shown on Netflix Screen</span>
                </div>
                <input
                  type="text"
                  value={newProfileNickname}
                  onChange={(e) => setNewProfileNickname(e.target.value)}
                  placeholder="e.g. Ahmad, Sonu, Champ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  💡 If not provided, your full name will be listed on the profile screen.
                </p>
              </div>

              {/* Date of Birth (DOB) Field */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-extrabold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    Date of Birth (DOB) *
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Student record</span>
                </label>
                <input
                  type="date"
                  required
                  suppressHydrationWarning
                  max={new Date().toISOString().split('T')[0]}
                  min="1950-01-01"
                  value={newProfileDob}
                  onChange={(e) => setNewProfileDob(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-xs"
                  style={{ colorScheme: 'dark' }}
                />
                <p className="text-[11px] text-slate-400">
                  🔒 Saved permanently in your student database record.
                </p>
              </div>

              {/* Target Course Curriculum Track (Duolingo Style Popup Trigger) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Target Curriculum Track *
                  </label>
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                    Interactive Setup
                  </span>
                </div>

                {selectedCurriculum ? (
                  <div className="p-3.5 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 flex items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                        {selectedCurriculum.category === 'School Exams' ? '🏫' : '🚀'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {selectedCurriculum.category === 'School Exams' ? selectedCurriculum.board : 'Competitive'}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {selectedCurriculum.classGrade || selectedCurriculum.targetYear}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-white truncate mt-1">
                          {selectedCurriculum.courseName}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {selectedCurriculum.subjects.join(' • ')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCurriculumPickerModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold shrink-0 transition-colors border border-slate-700 cursor-pointer"
                    >
                      Change ✏️
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCurriculumPickerModal(true)}
                    className="w-full p-4 rounded-2xl border-2 border-dashed border-blue-500/50 hover:border-blue-400 bg-gradient-to-r from-blue-950/30 to-indigo-950/30 hover:bg-blue-950/50 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group shadow-sm active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-inner">
                        🎯
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                          Choose Curriculum Track
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                            Duolingo Style
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          School (Board &amp; Class) or Competitive (Exam &amp; Year)
                        </p>
                      </div>
                    </div>
                    <span className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-blue-500 group-hover:to-indigo-500 text-white font-black text-xs shadow-md">
                      Pick Goal 🚀
                    </span>
                  </button>
                )}
                <p className="text-[10px] text-slate-400">
                  🎯 Tailors question bank, mock test patterns, and syllabus benchmarks for this student.
                </p>
              </div>

              {/* 4-Digit Security PIN */}
              <div className="space-y-1.5 pt-1">
                <label className="text-slate-300 font-extrabold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Profile Security PIN (4 digits - Optional)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newProfilePin}
                  onChange={(e) => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234 (Leave blank if not needed)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-mono tracking-widest text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  🔒 If set, this 4-digit PIN will be asked whenever anyone attempts to access this profile.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newProfileFullName.trim() || !newProfileDob.trim() || (!newProfileCourseId && !selectedCurriculum)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  {createLoading ? 'Registering...' : 'Create & Lock Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duolingo-style Curriculum Wizard Modal */}
      {showCurriculumPickerModal && (
        <CurriculumPickerModal
          isOpen={showCurriculumPickerModal}
          onClose={() => setShowCurriculumPickerModal(false)}
          availableCourses={availableCourses}
          onSelectCurriculum={(result) => {
            setSelectedCurriculum(result);
            setNewProfileCourseId(result.courseId);
          }}
        />
      )}

      {/* ── MODAL 3: Manage PIN Dialog (Set/Remove/Change) ── */}
      {pinModalProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => setPinModalProfile(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-white mb-1">
              {pinModalProfile.hasPin ? 'Update Security PIN' : 'Set 4-Digit Security PIN'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Profile: <strong className="text-white">{pinModalProfile.name}</strong>
            </p>

            {managePinError && (
              <div className="p-2.5 mb-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold">
                {managePinError}
              </div>
            )}

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-slate-300 text-xs font-extrabold">
                  {pinModalProfile.hasPin ? 'New 4-Digit PIN (or clear to remove)' : '4-Digit PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  value={managePinInput}
                  onChange={(e) => setManagePinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-white text-center text-lg font-mono tracking-widest focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalProfile(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={managePinLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer disabled:opacity-40"
                >
                  {managePinLoading ? 'Saving...' : managePinInput ? 'Save PIN' : 'Remove PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
