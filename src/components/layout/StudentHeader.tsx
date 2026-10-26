'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { clearAllClientUserCaches } from '@/lib/clientCache';
import { setSwrCache } from '@/lib/swrCache';
import { SignOutConfirmModal } from '../common/SignOutConfirmModal';
import {
  Home,
  FileText,
  HelpCircle,
  Folder,
  Trophy,
  ChevronDown,
  Menu,
  LogOut,
  User,
  BookOpen,
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Smartphone,
  Check,
  X,
  Lock,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Calendar,
  History,
} from 'lucide-react';
import { DigiLockerModal, getDigiLockerStatus, isCompetitiveCourse } from '@/components/ui/DigiLockerModal';
import {
  CurriculumPickerModal,
  SelectedCurriculumResult,
} from '@/components/curriculum/CurriculumPickerModal';
import { ProfileSwitchOverlay, ProfileSwitchTarget } from '@/components/common/ProfileSwitchOverlay';

interface StudentHeaderProps {
  userName?: string;
  onBack?: () => void;
  hideNav?: boolean;
}

interface ProfileItem {
  id: string;
  name: string;
  fullName?: string;
  nickname?: string | null;
  dob?: string | null;
  displayName?: string;
  email: string;
  accountEmail: string;
  lockedCourseId?: string | null;
  lockedCourseName?: string | null;
  isActive: boolean;
  isPrimary: boolean;
  hasPin?: boolean;
  avatarColor?: string;
  xp_total: number;
  digilocker_verified?: boolean;
  digilockerProfile?: any;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({ userName: propsUserName, onBack, hideNav }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>(propsUserName || '');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentCourseName, setCurrentCourseName] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const [isDigiLockerVerified, setIsDigiLockerVerified] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return getDigiLockerStatus();
    }
    return false;
  });
  const [verifiedDigiProfile, setVerifiedDigiProfile] = useState<any>(null);
  const [showDigiLockerModal, setShowDigiLockerModal] = useState<boolean>(false);

  const [textSize, setTextSize] = useState<number>(100);

  // Multi-Profile State
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [showCurriculumPickerModal, setShowCurriculumPickerModal] = useState(false);
  const [selectedCurriculumForNewProfile, setSelectedCurriculumForNewProfile] = useState<SelectedCurriculumResult | null>(null);
  const [newProfileFullName, setNewProfileFullName] = useState('');
  const [newProfileNickname, setNewProfileNickname] = useState('');
  const [newProfileDob, setNewProfileDob] = useState('');
  const [newProfilePin, setNewProfilePin] = useState('');
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [selectedCourseForNewProfile, setSelectedCourseForNewProfile] = useState<string>('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Profile PIN Prompt Modal State (when switching to a PIN-protected profile)
  const [profilePinPrompt, setProfilePinPrompt] = useState<ProfileItem | null>(null);
  const [pinInputValue, setPinInputValue] = useState('');
  const [pinPromptError, setPinPromptError] = useState('');
  const [pinPromptLoading, setPinPromptLoading] = useState(false);

  // Profile Switching Smooth Transition State
  const [switchingTarget, setSwitchingTarget] = useState<ProfileSwitchTarget | null>(null);
  const [switchDestination, setSwitchDestination] = useState<string>('/dashboard');

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationMenu, setShowNotificationMenu] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.status === 401 || res.status === 403) {
        clearAllClientUserCaches();
        window.location.replace('/login?session_expired=1');
        return;
      }
      const data = await res.json();
      if (data && data.deleted) {
        clearAllClientUserCaches();
        window.location.replace('/login?session_expired=1');
        return;
      }
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside, true);
    document.addEventListener('click', handleClickOutside, true);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close menus on route navigation
  useEffect(() => {
    setShowProfileMenu(false);
    setShowNotificationMenu(false);
  }, [pathname]);

  const handleMarkAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { notificationId: id } : { markAll: true }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearReadNotifications = async (clearId?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clearId ? { clearId } : { clearRead: true }),
      });
      fetchNotifications();
    } catch (e) {
      console.error('Error clearing read notifications:', e);
    }
  };

  const redirectToLogin = (reason?: string) => {
    clearAllClientUserCaches();
    if (pathname !== '/login') {
      router.replace(reason ? `/login?error=${encodeURIComponent(reason)}` : '/login');
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profile/list', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        return;
      }
      const data = await res.json();
      if (data.profiles && Array.isArray(data.profiles)) {
        const validProfiles = data.profiles.filter((p: any) => p.name !== 'Deleted User');
        if (validProfiles.length > 0) {
          setProfiles(validProfiles);
          const active = validProfiles.find((p: ProfileItem) => p.isActive) || validProfiles[0];
          if (active) {
            if (active.name === 'Deleted User') {
              redirectToLogin();
              return;
            }
            setUserName(active.name);
            setCurrentUserEmail(active.accountEmail || active.email);
            setCurrentCourseName(active.lockedCourseName || null);
            if (active.lockedCourseName && typeof window !== 'undefined') {
              localStorage.setItem('examizo_cached_course_name', active.lockedCourseName);
              localStorage.setItem('examizo_is_competitive', isCompetitiveCourse(active.lockedCourseName) ? 'true' : 'false');
            }
            if (active.digilocker_verified || active.digilockerProfile?.verified) {
              setIsDigiLockerVerified(true);
              if (active.digilockerProfile) {
                setVerifiedDigiProfile(active.digilockerProfile);
              }
              if (typeof window !== 'undefined') {
                localStorage.setItem('examizo_digilocker_verified', 'true');
              }
            } else {
              setIsDigiLockerVerified(false);
              setVerifiedDigiProfile(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('examizo_digilocker_verified');
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch profiles:', e);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        const errData = await res.json().catch(() => null);
        if (errData && (errData.authenticated === false || errData.error?.includes('suspended'))) {
          redirectToLogin(errData.error?.includes('suspended') ? 'Your account has been suspended by administration' : undefined);
        }
        return null;
      }
      if (res.ok) {
        const data = await res.json();
        const status = String(data?.user?.status || '').toLowerCase();
        if (status === 'suspended' || status === 'deleted' || data?.user?.name === 'Deleted User') {
          redirectToLogin(status === 'suspended' ? 'Your account has been suspended by administration' : undefined);
          return null;
        }
        if (data?.user) {
          setUserName(data.user.name);
          setCurrentUserEmail(data.user.email);
          if (data.user.digilocker_verified || data.user.digilockerProfile?.verified) {
            setIsDigiLockerVerified(true);
            if (data.user.digilockerProfile) {
              setVerifiedDigiProfile(data.user.digilockerProfile);
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem('examizo_digilocker_verified', 'true');
            }
          }
          if (data.user.lockedCourse?.name) {
            const cName = data.user.lockedCourse.name;
            setCurrentCourseName(cName);
            if (typeof window !== 'undefined') {
              localStorage.setItem('examizo_cached_course_name', cName);
              localStorage.setItem('examizo_is_competitive', isCompetitiveCourse(data.user.lockedCourse || cName) ? 'true' : 'false');
            }
          }
        }
        return data;
      }
    } catch (e) {
      console.warn('[StudentHeader] Auth check warning:', e);
    }
  };

  useEffect(() => {
    fetchProfiles();

    // Check for ?digilocker=success in URL query after returning from DigiLocker Gateway
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dlParam = urlParams.get('digilocker');
      if (dlParam === 'success') {
        fetch('/api/digilocker/sync', { method: 'POST' })
          .then((res) => res.json())
          .then((syncData) => {
            if (syncData && syncData.verified) {
              setIsDigiLockerVerified(true);
              setVerifiedDigiProfile(syncData.profile);
              localStorage.setItem('examizo_digilocker_verified', 'true');
              window.dispatchEvent(new Event('digilocker_status_change'));
              fetchProfiles();
            }
          })
          .catch(console.error);

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // Also check DigiLocker status endpoint directly
    fetch('/api/digilocker/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.verified) {
          setIsDigiLockerVerified(true);
          if (data.profile) {
            setVerifiedDigiProfile(data.profile);
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('examizo_digilocker_verified', 'true');
          }
        } else {
          setIsDigiLockerVerified(false);
          setVerifiedDigiProfile(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('examizo_digilocker_verified');
          }
        }
      })
      .catch(() => {});

    try {
      const saved = localStorage.getItem('exammaster_text_scale');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 80 && parsed <= 130) {
          setTextSize(parsed);
          document.documentElement.style.fontSize = `${(parsed / 100) * 16}px`;
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleStatusChange = () => {
      setIsDigiLockerVerified(getDigiLockerStatus());
    };
    handleStatusChange();
    window.addEventListener('storage', handleStatusChange);
    window.addEventListener('digilocker_status_change', handleStatusChange);
    return () => {
      window.removeEventListener('storage', handleStatusChange);
      window.removeEventListener('digilocker_status_change', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (propsUserName) {
      setUserName(propsUserName);
    }

    checkAuthStatus();
  }, [propsUserName]);

  const changeTextSize = (delta: number) => {
    setTextSize((prev) => {
      const next = Math.min(130, Math.max(80, prev + delta));
      try {
        localStorage.setItem('exammaster_text_scale', String(next));
        document.documentElement.style.fontSize = `${(next / 100) * 16}px`;
      } catch (e) {}
      return next;
    });
  };

  const displayName = userName || 'Student';

  const handleLogout = async () => {
    setIsSigningOut(true);
    clearAllClientUserCaches();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/login';
  };

  const handleSwitchProfile = async (profile: ProfileItem, pinToUse?: string) => {
    if (profile.isActive) return;

    if (profile.hasPin && !pinToUse) {
      setProfilePinPrompt(profile);
      setPinInputValue('');
      setPinPromptError('');
      setShowProfileMenu(false);
      return;
    }

    try {
      setPinPromptLoading(true);
      clearAllClientUserCaches();
      const res = await fetch('/api/profile/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, pin: pinToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinPromptError(data.error || 'Incorrect PIN');
        return;
      }

      if (data.success) {
        setShowProfileMenu(false);
        setProfilePinPrompt(null);

        const destination = !data.profile?.lockedCourseId
          ? '/course-selection'
          : '/dashboard';
        setSwitchDestination(destination);

        const profIdx = profiles.findIndex((p) => p.id === profile.id);
        const avatarBg =
          profIdx >= 0 ? profileColors[profIdx % profileColors.length] : undefined;

        // Current active profile as 'from' source
        const currentActive = profiles.find((p) => p.isActive);
        const currentActiveIdx = profiles.findIndex((p) => p.isActive);
        const fromAvatarBg =
          currentActiveIdx >= 0 ? profileColors[currentActiveIdx % profileColors.length] : undefined;

        setSwitchingTarget({
          name: profile.name,
          fullName: profile.fullName || undefined,
          nickname: profile.nickname || undefined,
          avatarBg,
          lockedCourseName: data.profile?.lockedCourseName || profile.lockedCourseName || undefined,
          isVerified: Boolean(profile.digilocker_verified || profile.digilockerProfile?.verified),
          from: currentActive
            ? {
                name: currentActive.name,
                fullName: currentActive.fullName || undefined,
                nickname: currentActive.nickname || undefined,
                avatarBg: fromAvatarBg,
                lockedCourseName: currentActive.lockedCourseName || currentCourseName || undefined,
                isVerified: Boolean(
                  currentActive.digilocker_verified || currentActive.digilockerProfile?.verified
                ),
              }
            : undefined,
        });

        // BACKGROUND DASHBOARD PREFETCH: Immediately load dashboard data behind the switch overlay
        try {
          sessionStorage.setItem('examizo_just_switched_profile', 'true');
        } catch (_) {}

        fetch('/api/dashboard', { cache: 'no-store' })
          .then((r) => r.json())
          .then((dashData) => {
            if (dashData && dashData.user) {
              const newCache = {
                user: dashData.user || null,
                mockTests: Array.isArray(dashData.mockTests) ? dashData.mockTests : [],
                mockTestHistory: Array.isArray(dashData.mockTestHistory) ? dashData.mockTestHistory : [],
                leaderboard: Array.isArray(dashData.topLeaderboard) ? dashData.topLeaderboard : [],
                levelInfo: dashData.levelInfo || null,
                incorrectLog: Array.isArray(dashData.incorrectLog) ? dashData.incorrectLog : [],
              };
              setSwrCache('dashboard_cache', newCache, dashData.user?.email);
              try {
                sessionStorage.setItem('examizo_fresh_switched_cache', JSON.stringify(newCache));
              } catch (_) {}

              // Live update subscribers and refresh header profile badge
              window.dispatchEvent(
                new CustomEvent('examizo:profile-switched', {
                  detail: { profile: data.profile, dashData },
                })
              );
              fetchProfiles();
            }
          })
          .catch((err) => {
            console.warn('[StudentHeader] Background dashboard fetch:', err);
          });
      }
    } catch (err) {
      setPinPromptError('Failed to switch profile');
    } finally {
      setPinPromptLoading(false);
    }
  };

  const handleDeleteProfile = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this profile?')) return;

    try {
      const res = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (res.ok) {
        fetchProfiles();
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  const openAddProfileModal = () => {
    setNewProfileFullName('');
    setNewProfileNickname('');
    setNewProfileDob('');
    setNewProfilePin('');
    setSelectedCourseForNewProfile('');
    setSelectedCurriculumForNewProfile(null);
    setCreateError('');
    setShowAddProfileModal(true);
    fetch('/api/courses')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.courses)) {
          setAvailableCourses(data.courses);
        }
      })
      .catch(console.error);
  };

  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileFullName.trim()) {
      setCreateError('Please enter the full name.');
      return;
    }
    if (!newProfileDob.trim()) {
      setCreateError('Please enter the date of birth (DOB).');
      return;
    }
    const finalCourseId = selectedCurriculumForNewProfile?.courseId || selectedCourseForNewProfile;
    if (!finalCourseId) {
      setCreateError('Please choose a target course curriculum track.');
      return;
    }

    if (newProfilePin && !/^\d{4}$/.test(newProfilePin.trim())) {
      setCreateError('Profile PIN must be exactly 4 numeric digits (e.g. 1234)');
      return;
    }

    setCreateError('');
    setCreateLoading(true);

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
          courseData: selectedCurriculumForNewProfile,
          pin: newProfilePin.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create new profile');
      } else {
        setShowAddProfileModal(false);
        setNewProfileFullName('');
        setNewProfileNickname('');
        setNewProfileDob('');
        setNewProfilePin('');
        setSelectedCourseForNewProfile('');
        // Sub-profile is registered with course locked -> reload or go directly to dashboard!
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setCreateError('Failed to create profile');
    } finally {
      setCreateLoading(false);
    }
  };

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Mock Tests', href: '/mock-tests', icon: FileText },
    { label: 'History', href: '/history', icon: History },
    { label: 'Daily Practice', href: '/practice', icon: HelpCircle },
    { label: 'Resources', href: '/resources', icon: Folder },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ];

  const profileColors = ['bg-[#044B3B]', 'bg-[#0F766E]', 'bg-[#15803D]', 'bg-[#1e293b]'];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl backdrop-saturate-180 px-4 sm:px-10 shadow-sm shadow-slate-900/5 transition-all w-full pt-[env(safe-area-inset-top,0px)] h-[calc(4rem+env(safe-area-inset-top,0px))] flex items-center">
        <div className="w-full flex items-center justify-between h-16 relative">
          
          {/* Far Left: Brand Logo + Back Button */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center shadow-xs group cursor-pointer"
                title="Back"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            <Link href="/dashboard" prefetch={true} className="flex items-center shrink-0">
              <Logo size={48} />
            </Link>
          </div>

          {/* Center Navigation Bar */}
          {!hideNav && (
            <nav className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-1 flex-1 mx-2 xl:mx-6 h-full min-w-0">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={true}
                    className={`px-2.5 xl:px-4 h-full text-xs font-bold flex items-center gap-1.5 xl:gap-2 transition-all relative border-b-2 cursor-pointer shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-extrabold'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Far Right Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Text Size Increaser */}
            <div className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                onClick={() => changeTextSize(-5)}
                disabled={textSize <= 80}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[11px] font-black border border-slate-200/60 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Decrease Text Size (A-)"
              >
                A-
              </button>
              <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 px-1 font-mono min-w-[32px] text-center select-none">
                {textSize}%
              </span>
              <button
                type="button"
                onClick={() => changeTextSize(5)}
                disabled={textSize >= 130}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[11px] font-black border border-slate-200/60 dark:border-slate-700 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Increase Text Size (A+)"
              >
                A+
              </button>
            </div>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 hidden xl:block" />

            {/* Notification Bell Button & Dropdown */}
            <div className="relative" ref={notificationMenuRef}>
              <button
                type="button"
                onClick={() => {
                  fetchNotifications();
                  setShowNotificationMenu(!showNotificationMenu);
                  setShowProfileMenu(false);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center relative transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] min-w-[18px] text-center border-2 border-white dark:border-slate-900 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Menu Dropdown */}
              {showNotificationMenu && (
                <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-50 animate-dropdown">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Notifications ({notifications.length})
                      </h4>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {notifications.some((n) => n.isRead) && (
                        <button
                          type="button"
                          onClick={() => handleClearReadNotifications()}
                          className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                          title="Clear all read notifications"
                        >
                          <Trash2 className="w-3 h-3" /> Clear Read
                        </button>
                      )}
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead()}
                          className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                          <Bell className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No notifications yet</p>
                        <p className="text-[10px] text-slate-400">You're all caught up with your updates!</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                          className={`p-4 transition-colors flex items-start gap-3 cursor-pointer group ${
                            notif.isRead
                              ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              : 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            notif.type === 'alert' || notif.type === 'warning'
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                              : notif.type === 'success'
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                          }`}>
                            {notif.type === 'alert' || notif.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : notif.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className={`text-xs ${notif.isRead ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-black text-slate-900 dark:text-white'}`}>
                                {notif.title}
                              </h5>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                                )}
                                {notif.isRead && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClearReadNotifications(notif.id);
                                    }}
                                    className="p-1 text-slate-300 group-hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                                    title="Clear notification"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                              {notif.created_at ? new Date(notif.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Profile Dropdown Pill */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => {
                  fetchProfiles();
                  setShowProfileMenu(!showProfileMenu);
                }}
                className="flex items-center gap-1.5 sm:gap-2 p-1 pr-1.5 sm:pr-2.5 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 transition-all border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline-block text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                  {displayName}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown — Multi-Profile Switcher */}
              <div
                className={`absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50
                  transition-all duration-200 ease-out origin-top-right
                  ${
                    showProfileMenu
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
              >
                {/* Active Profile Header Info */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{currentUserEmail || 'Active Student Account'}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold tracking-wider uppercase">
                        ✓ Active Profile
                      </span>
                      {isCompetitiveCourse(currentCourseName) && (
                        isDigiLockerVerified ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowProfileMenu(false);
                              setShowDigiLockerModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group"
                            title="DigiLocker KYC Verified - Click to view official KYC details"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span>Verified</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowProfileMenu(false);
                              window.location.href = '/api/digilocker/authorize';
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-sky-950/50 text-slate-600 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer group"
                            title="Click to directly verify student profile with DigiLocker"
                          >
                            <ShieldCheck className="w-3 h-3 text-slate-400 group-hover:text-sky-500 transition-colors" />
                            <span>Verify</span>
                          </button>
                        )
                      )}
                      {currentCourseName ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[9px] font-extrabold truncate max-w-[110px]">
                          {currentCourseName}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold">
                          No Course Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Switch Profile Section */}
                <div className="p-2 space-y-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" /> Switch Profile
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      {profiles.length}/4
                    </span>
                  </div>

                  {profiles.map((prof, idx) => {
                    const avatarBg = profileColors[idx % profileColors.length];
                    const isProfVerified = Boolean(prof.digilocker_verified || prof.digilockerProfile?.verified);
                    return (
                      <div
                        key={prof.id}
                        onClick={() => handleSwitchProfile(prof)}
                        className={`group flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                          prof.isActive
                            ? 'bg-blue-50/70 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        {(() => {
                          const pDisplayName = (prof.nickname && prof.nickname.trim()) ? prof.nickname.trim() : (prof.fullName || prof.name);
                          return (
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-full ${avatarBg} text-white font-black flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                                {pDisplayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-slate-900 dark:text-white text-[11px] truncate flex items-center gap-1">
                                    {pDisplayName}
                                    {prof.hasPin && <Lock className="w-2.5 h-2.5 text-amber-500 inline shrink-0" />}
                                  </p>
                                  {isCompetitiveCourse(prof.lockedCourseName) && (
                                    isProfVerified ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowProfileMenu(false);
                                          if (prof.digilockerProfile || verifiedDigiProfile) {
                                            setVerifiedDigiProfile(prof.digilockerProfile || verifiedDigiProfile);
                                          }
                                          setShowDigiLockerModal(true);
                                        }}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[8px] font-black uppercase cursor-pointer transition-all active:scale-95 shadow-2xs"
                                        title="DigiLocker Verified - Click to view official KYC details"
                                      >
                                        <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Verified</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowProfileMenu(false);
                                          window.location.href = '/api/digilocker/authorize';
                                        }}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-sky-950 text-slate-500 hover:text-sky-700 dark:text-slate-400 dark:hover:text-sky-300 border border-slate-200 dark:border-slate-700 text-[8px] font-bold uppercase cursor-pointer transition-all active:scale-95 shadow-2xs"
                                        title="Click to directly verify profile with DigiLocker"
                                      >
                                        <ShieldCheck className="w-2.5 h-2.5 text-slate-400 hover:text-sky-600" />
                                        <span>Verify</span>
                                      </button>
                                    )
                                  )}
                                </div>
                                {prof.nickname && prof.fullName && prof.nickname !== prof.fullName ? (
                                  <p className="text-[10px] text-slate-400 font-medium truncate">
                                    {prof.fullName}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-slate-400 font-medium truncate">
                                    {prof.lockedCourseName ? `Course: ${prof.lockedCourseName}` : '⚠️ Needs Course Lock'}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {prof.isActive ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                Switch
                              </span>
                              {!prof.isPrimary && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteProfile(e, prof.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete profile"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Profile Button (Multi-Profile Limit 4) */}
                  {profiles.length < 4 ? (
                    <button
                      type="button"
                      onClick={() => {
                        openAddProfileModal();
                        setShowProfileMenu(false);
                      }}
                      className="w-full mt-1 flex items-center justify-center gap-2 p-2 rounded-xl border border-dashed border-blue-300 dark:border-blue-800/80 bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add New Profile ({profiles.length}/4)
                    </button>
                  ) : (
                    <div className="p-2 mt-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[10px] font-medium text-amber-800 dark:text-amber-300 text-center">
                      🔒 Maximum 4 profiles per account reached. Remove a profile to create a new one.
                    </div>
                  )}
                </div>

                <div className="p-1">
                  <Link
                    href="/profiles"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" /> Switch Profile Screen
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <History className="w-4 h-4 text-blue-500" /> Exam Attempts &amp; History
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-blue-500" /> Profile Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      window.dispatchEvent(new CustomEvent('open-pwa-install'));
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-500" /> Install App / Shortcut
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSignOutModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Persistent Top Height Spacer matching safe-area header */}
      <div className="h-[calc(4rem+env(safe-area-inset-top,0px))] w-full shrink-0" aria-hidden="true" />

      {/* Inline Modal: Add New Profile */}
      {showAddProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Create New Sub-Profile</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Select curriculum course to register this profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-900 dark:text-rose-200 text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProfileSubmit} className="space-y-4 text-xs font-medium">
              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-extrabold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Full Name *
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Student's legal / academic name</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProfileFullName}
                  onChange={(e) => setNewProfileFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
                />
              </div>

              {/* Nickname (Optional) Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 dark:text-slate-300 font-extrabold">Nickname (Optional)</label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Shown on Profile Selection</span>
                </div>
                <input
                  type="text"
                  value={newProfileNickname}
                  onChange={(e) => setNewProfileNickname(e.target.value)}
                  placeholder="Your nickname (optional)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400">
                  💡 If not provided, your full name will be listed on the profile screen.
                </p>
              </div>

              {/* Date of Birth (DOB) Field */}
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-extrabold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400">
                  🔒 Saved permanently in your student database record.
                </p>
              </div>

              {/* Target Course Curriculum Track */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 dark:text-slate-300 font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Target Curriculum Track *
                  </label>
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                    Interactive Setup
                  </span>
                </div>

                {selectedCurriculumForNewProfile ? (
                  <div className="p-3.5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
                        {selectedCurriculumForNewProfile.category === 'School Exams' ? '🏫' : '🚀'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                            {selectedCurriculumForNewProfile.category === 'School Exams' ? selectedCurriculumForNewProfile.board : 'Competitive'}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {selectedCurriculumForNewProfile.classGrade || selectedCurriculumForNewProfile.targetYear}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5">
                          {selectedCurriculumForNewProfile.courseName}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {selectedCurriculumForNewProfile.subjects.join(' • ')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCurriculumPickerModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
                    >
                      Change ✏️
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCurriculumPickerModal(true)}
                    className="w-full p-3.5 rounded-2xl border-2 border-dashed border-blue-400 dark:border-blue-500/50 hover:border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        🎯
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                          Choose Curriculum Track
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                            Interactive Track
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          School (Board &amp; Class) or Competitive (Exam &amp; Year)
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-blue-500 group-hover:to-indigo-500 text-white font-black text-xs shadow-xs">
                      Pick Goal 🚀
                    </span>
                  </button>
                )}
                <p className="text-[10px] text-slate-400 leading-normal pt-1">
                  🔒 The profile will only be registered once the target course curriculum is selected.
                </p>
              </div>

              {/* 4-Digit Profile PIN Field */}
              <div className="space-y-1.5 pt-1">
                <label className="text-slate-700 dark:text-slate-300 font-extrabold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Profile Security PIN (4 digits - Optional)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newProfilePin}
                  onChange={(e) => setNewProfilePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234 (Leave blank if not needed)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-mono tracking-widest font-bold"
                />
                <p className="text-[10px] text-slate-400">
                  🔒 If set, this 4-digit PIN will be required whenever anyone switches to this profile.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProfileModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newProfileFullName.trim() || !newProfileDob.trim() || (!selectedCourseForNewProfile && !selectedCurriculumForNewProfile)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {createLoading ? 'Registering...' : 'Create & Lock Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Curriculum Wizard Modal for Header */}
      {showCurriculumPickerModal && (
        <CurriculumPickerModal
          isOpen={showCurriculumPickerModal}
          onClose={() => setShowCurriculumPickerModal(false)}
          availableCourses={availableCourses}
          onSelectCurriculum={(result) => {
            setSelectedCurriculumForNewProfile(result);
            setSelectedCourseForNewProfile(result.courseId);
          }}
        />
      )}

      {/* PIN Prompt Modal for Header switching */}
      {profilePinPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[80] animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-300 dark:border-amber-800/80">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Profile Locked</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter 4-digit PIN for <strong>{profilePinPrompt.name}</strong>
              </p>
            </div>

            {pinPromptError && (
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-bold">
                {pinPromptError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pinInputValue.length === 4) {
                  handleSwitchProfile(profilePinPrompt, pinInputValue);
                }
              }}
              className="space-y-4"
            >
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={pinInputValue}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPinInputValue(val);
                  setPinPromptError('');
                  if (val.length === 4) {
                    handleSwitchProfile(profilePinPrompt, val);
                  }
                }}
                placeholder="••••"
                className="w-full text-center text-2xl font-mono tracking-[0.5em] py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl text-slate-900 dark:text-white outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProfilePinPrompt(null)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinPromptLoading || pinInputValue.length !== 4}
                  className="flex-1 py-2 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40"
                >
                  {pinPromptLoading ? 'Verifying...' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global DigiLocker Verification Modal */}
      <DigiLockerModal
        isOpen={showDigiLockerModal}
        onClose={() => setShowDigiLockerModal(false)}
        onSuccess={() => {
          setIsDigiLockerVerified(true);
          fetchProfiles();
        }}
        studentName={
          verifiedDigiProfile?.digilocker_name ||
          verifiedDigiProfile?.name ||
          profiles.find((p) => p.isPrimary)?.fullName ||
          profiles.find((p) => p.isPrimary)?.name ||
          'Ahmad Shajee Zubairy'
        }
        courseName={currentCourseName || undefined}
        verifiedProfile={verifiedDigiProfile}
      />

      {/* Global Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleLogout}
        isSigningOut={isSigningOut}
      />

      {/* Smooth Profile Switch Transition Overlay */}
      <ProfileSwitchOverlay
        target={switchingTarget}
        onComplete={() => {
          setSwitchingTarget(null);
          if (pathname === switchDestination) {
            // Already on /dashboard: seamless in-place transition with no page reload!
            window.dispatchEvent(new Event('examizo:profile-switched-complete'));
          } else {
            router.push(switchDestination);
          }
        }}
        durationMs={1450}
      />
    </>
  );
};
