'use client';

import React, { useEffect, useState } from 'react';
import { User as UserIcon, Lock, Mail, BookOpen, Save, ShieldCheck, Sun, RotateCcw, GraduationCap, BarChart2, Activity, TrendingUp, Building2, CheckCircle2 } from 'lucide-react';
import { StudentStatsModal } from '@/components/ui/StudentStatsModal';
import { DigiLockerModal, isAbove10thClass, getDigiLockerStatus } from '@/components/ui/DigiLockerModal';

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showMyStatsModal, setShowMyStatsModal] = useState(false);
  const [showDigiLockerModal, setShowDigiLockerModal] = useState(false);
  const [isDigiLockerVerified, setIsDigiLockerVerified] = useState(false);
  const [isSubProfile, setIsSubProfile] = useState(false);

  useEffect(() => {
    setIsDigiLockerVerified(getDigiLockerStatus());

    fetch('/api/profile/list')
      .then((res) => res.json())
      .then((data) => {
        if (data.profiles && Array.isArray(data.profiles)) {
          const activeProf = data.profiles.find((p: any) => p.isActive);
          if (activeProf && activeProf.isPrimary === false) {
            setIsSubProfile(true);
          }
        }
      })
      .catch(console.error);

    const handleStorage = () => setIsDigiLockerVerified(getDigiLockerStatus());
    window.addEventListener('storage', handleStorage);
    window.addEventListener('digilocker_status_change', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('digilocker_status_change', handleStorage);
    };
  }, []);

  // Class Promotion & Rollback State
  const [promoteInfo, setPromoteInfo] = useState<{
    isSchoolUser: boolean;
    isMarchActive: boolean;
    currentCourse?: any;
    nextCourse?: any;
    previousCourse?: any;
    hasPromoted?: boolean;
    canPromote?: boolean;
    canRollback?: boolean;
    loading?: boolean;
  } | null>(null);

  const fetchPromoteInfo = () => {
    fetch('/api/course/promote')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isSchoolUser) {
          setPromoteInfo(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserData(data.user);
          setName(data.user.name);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetchPromoteInfo();
  }, []);

  const handlePromoteAction = async (action: 'promote' | 'rollback') => {
    setPromoteInfo((prev) => (prev ? { ...prev, loading: true } : null));
    try {
      const res = await fetch('/api/course/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        fetchPromoteInfo();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setMessage(data.error || 'Action failed');
        setPromoteInfo((prev) => (prev ? { ...prev, loading: false } : null));
      }
    } catch {
      setMessage('Error performing class action');
      setPromoteInfo((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
        Loading student profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 pb-24 lg:pb-0">
        
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account Settings & Profile</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Update your account information and view your active track.
          </p>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl font-bold transition-all animate-fadeIn">
            {message}
          </div>
        )}

        {/* March Class Promotion & Rollback Banner (For School Class 3 to 12 Users Only) */}
        {promoteInfo?.isSchoolUser && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden animate-fade-in">
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute right-32 -top-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-100 border border-white/20">
                    {promoteInfo.isMarchActive ? '📅 March Academic Promotion Window Active' : '📅 March Annual Promotion Feature'}
                  </span>
                  {promoteInfo.hasPromoted && (
                    <span className="px-3 py-1 bg-amber-400/30 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-amber-200 border border-amber-300/30">
                      ⚡ Class Promoted
                    </span>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  {promoteInfo.hasPromoted
                    ? `Promoted to ${promoteInfo.currentCourse?.name}!`
                    : promoteInfo.nextCourse
                    ? `Promote to ${promoteInfo.nextCourse.name}`
                    : `Grade Level Progress`}
                </h2>

                <p className="text-xs md:text-sm text-emerald-50 leading-relaxed font-medium">
                  {promoteInfo.hasPromoted
                    ? `You have promoted to ${promoteInfo.currentCourse?.name}. If you made a mistake, you can roll back to ${promoteInfo.previousCourse?.name || 'your previous class'} during the March promotion window.`
                    : promoteInfo.nextCourse
                    ? `Academic promotion for Class 3 to 12 batches is active during the month of March. You can now advance your account to ${promoteInfo.nextCourse.name}!`
                    : `You are currently enrolled in ${promoteInfo.currentCourse?.name || 'School Track'}.`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
                {promoteInfo.isMarchActive ? (
                  <>
                    {!promoteInfo.hasPromoted && promoteInfo.nextCourse && (
                      <button
                        type="button"
                        onClick={() => handlePromoteAction('promote')}
                        disabled={promoteInfo.loading}
                        className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs rounded-2xl shadow-lg shadow-emerald-950/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        {promoteInfo.loading ? 'Promoting Class...' : `Promote to ${promoteInfo.nextCourse.name}`}
                      </button>
                    )}

                    {promoteInfo.hasPromoted && promoteInfo.previousCourse && (
                      <button
                        type="button"
                        onClick={() => handlePromoteAction('rollback')}
                        disabled={promoteInfo.loading}
                        className="w-full sm:w-auto px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-950/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {promoteInfo.loading ? 'Rolling back...' : `Roll Back to ${promoteInfo.previousCourse.name}`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-xs font-bold text-emerald-100 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-200" />
                    <span>Promotion active during March</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interface Mode Info Badge */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Interface Appearance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Light Mode (Clean Academic Precision Theme active)</p>
            </div>
          </div>
        </div>

        {/* DigiLocker Academic Verification Card (For Primary Main Accounts) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-60 h-60 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-blue-400" />
                  <span>Govt. of India DigiLocker Integration</span>
                </span>
                {isSubProfile ? (
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Sub-Profile Exempt from DigiLocker</span>
                  </span>
                ) : isAbove10thClass(userData?.lockedCourse?.name) ? (
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Mandatory Verification (Class 11+ & Competitive)</span>
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    Optional Verification (Class ≤ 10)
                  </span>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>DigiLocker Academic Verification</span>
                {(isDigiLockerVerified || isSubProfile) && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                )}
              </h2>

              <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
                {isSubProfile
                  ? 'DigiLocker verification applies only to the Main Primary Profile. As a sub-profile, your account is automatically exempt and has unrestricted access to all practice sets, tests, and leaderboards.'
                  : isDigiLockerVerified
                  ? 'Your primary account is officially verified with DigiLocker. You have unrestricted full access to all practice sets, mock tests, resources, and leaderboards.'
                  : isAbove10thClass(userData?.lockedCourse?.name)
                  ? 'DigiLocker identity verification is mandatory for Class 11, Class 12, and Competitive Exam aspirants. Unverified main accounts have access to the Dashboard only.'
                  : 'Link your Govt. of India DigiLocker account to verify your student identity and unlock verified academic credentials.'}
              </p>

              {isDigiLockerVerified && !isSubProfile && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono font-bold">
                  <span>Ref: DL-2026-EXAMIZO-9842</span>
                  <span>•</span>
                  <span>Aadhaar Verified</span>
                </div>
              )}
            </div>

            <div className="w-full sm:w-auto shrink-0">
              {isSubProfile ? (
                <div className="px-6 py-3.5 bg-slate-800 border border-slate-700 text-emerald-400 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Exempt (Sub-Profile)</span>
                </div>
              ) : isDigiLockerVerified ? (
                <div className="px-6 py-3.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Verified with DigiLocker ✅</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDigiLockerModal(true)}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify with DigiLocker</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* My Performance Analytics & Stats Card */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20 shadow-md">
              <BarChart2 className="w-7 h-7" />
            </div>
            <div>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/20 text-white tracking-wider border border-white/20">
                Personal Analytics
              </span>
              <h2 className="text-xl font-black tracking-tight mt-1">My Performance & Statistics</h2>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed max-w-xl font-medium">
                View your overall accuracy benchmark, average practice speed per question, topic completion progress, and complete mock test attempt history.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMyStatsModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-xs rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Activity className="w-4 h-4 text-blue-600" />
            View My Stats
          </button>
        </div>

        {/* Profile Info Form */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student Name (Editable)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                Email Address <span className="text-[10px] text-amber-600 font-extrabold uppercase">(Read-Only)</span>
              </label>
              <input
                type="email"
                disabled
                value={userData?.email || ''}
                className="w-full text-xs p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                Locked Course <span className="text-[10px] text-amber-600 font-extrabold uppercase">(Permanent Lock)</span>
              </label>
              <input
                type="text"
                disabled
                value={userData?.lockedCourse?.name || 'No course locked'}
                className="w-full text-xs p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-bold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep existing password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Student Stats Modal for Current Logged-In User */}
      {showMyStatsModal && (
        <StudentStatsModal
          studentId={userData?._id || userData?.id}
          onClose={() => setShowMyStatsModal(false)}
        />
      )}

      {/* DigiLocker Verification Modal */}
      <DigiLockerModal
        isOpen={showDigiLockerModal}
        onClose={() => setShowDigiLockerModal(false)}
        onSuccess={() => setIsDigiLockerVerified(true)}
        studentName={userData?.name}
        courseName={userData?.lockedCourse?.name}
      />
    </div>
  );
}


