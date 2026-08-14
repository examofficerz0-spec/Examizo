'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
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
  Check,
  X,
  Lock,
  Sparkles,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  Image as ImageIcon,
} from 'lucide-react';

interface StudentHeaderProps {
  userName?: string;
  onBack?: () => void;
  hideNav?: boolean;
}

interface ProfileItem {
  id: string;
  name: string;
  email: string;
  accountEmail: string;
  lockedCourseId?: string | null;
  lockedCourseName?: string | null;
  isActive: boolean;
  isPrimary: boolean;
  xp_total: number;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({ userName: propsUserName, onBack, hideNav }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>(propsUserName || '');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentCourseName, setCurrentCourseName] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [textSize, setTextSize] = useState<number>(100);

  // Netflix-style Multi-Profile State
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationMenu, setShowNotificationMenu] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
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

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profile/list');
      if (res.status === 401) {
        try {
          sessionStorage.clear();
          localStorage.removeItem('examizo_is_sub_profile');
        } catch (e) {}
        window.location.replace('/login');
        return;
      }
      const data = await res.json();
      if (data.profiles && Array.isArray(data.profiles)) {
        const validProfiles = data.profiles.filter((p: any) => p.name !== 'Deleted User');
        if (validProfiles.length === 0) {
          try {
            sessionStorage.clear();
            localStorage.removeItem('examizo_is_sub_profile');
          } catch (e) {}
          window.location.replace('/login');
          return;
        }
        setProfiles(validProfiles);
        const active = validProfiles.find((p: ProfileItem) => p.isActive);
        if (active) {
          if (active.name === 'Deleted User') {
            window.location.replace('/login');
            return;
          }
          setUserName(active.name);
          setCurrentUserEmail(active.accountEmail || active.email);
          setCurrentCourseName(active.lockedCourseName || null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profiles:', e);
    }
  };

  useEffect(() => {
    fetchProfiles();

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

  useEffect(() => {
    if (propsUserName) {
      setUserName(propsUserName);
    }

    fetch('/api/auth/me')
      .then((res) => {
        if (res.status === 401) {
          try {
            sessionStorage.clear();
            localStorage.removeItem('examizo_is_sub_profile');
          } catch (e) {}
          window.location.replace('/login');
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (!data || !data.authenticated || !data.user || data.user.status === 'Deleted' || data.user.name === 'Deleted User') {
          try {
            sessionStorage.clear();
            localStorage.removeItem('examizo_is_sub_profile');
          } catch (e) {}
          window.location.replace('/login');
          return;
        }
        setUserName(data.user.name);
        setCurrentUserEmail(data.user.email);
        if (data.user.lockedCourse?.name) {
          setCurrentCourseName(data.user.lockedCourse.name);
        }
      })
      .catch(console.error);
  }, [propsUserName]);

  const displayName = userName || 'Student';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    try {
      sessionStorage.clear();
      localStorage.removeItem('examizo_is_sub_profile');
    } catch (e) {}
    window.location.replace('/login');
  };

  const handleSwitchProfile = async (profile: ProfileItem) => {
    if (profile.isActive) return;

    try {
      const res = await fetch('/api/profile/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id }),
      });

      const data = await res.json();
      if (data.success) {
        setShowProfileMenu(false);
        // If the target profile has NO locked course, redirect to course selection!
        if (!data.profile?.lockedCourseId) {
          window.location.href = '/course-selection';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      console.error('Failed to switch profile:', err);
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

  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await fetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create new profile');
      } else {
        setShowAddProfileModal(false);
        setNewProfileName('');
        // NEW PROFILE HAS NO COURSE LOCKED YET -> REDIRECT DIRECTLY TO /course-selection!
        window.location.href = '/course-selection';
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
    { label: 'Daily Practice', href: '/practice', icon: HelpCircle },
    { label: 'Resources', href: '/resources', icon: Folder },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { label: 'Gallery', href: '/gallery', icon: ImageIcon },
  ];

  const profileColors = ['bg-[#044B3B]', 'bg-[#0F766E]', 'bg-[#15803D]', 'bg-[#1e293b]'];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/65 dark:bg-slate-900/65 backdrop-blur-2xl backdrop-saturate-180 px-4 sm:px-10 shadow-sm shadow-slate-900/5 transition-all w-full h-16 flex items-center">
        <div className="w-full flex items-center justify-between h-16 relative">
          
          {/* Far Left: Brand Logo + Back Button */}
          <div className="flex items-center gap-4">
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

            <Link href="/dashboard" prefetch={true} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5 fill-current stroke-[1.5]" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Examizo
              </span>
            </Link>
          </div>

          {/* Center Navigation Bar */}
          {!hideNav && (
            <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2 h-full">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={true}
                    className={`px-4 h-full text-xs font-bold flex items-center gap-2 transition-all relative border-b-2 ${
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
          <div className="flex items-center gap-2.5">
            {/* Text Size Increaser */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
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

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Notification Bell Button & Dropdown */}
            <div className="relative">
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
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-50 animate-fade-in">
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
                              <Sparkles className="w-4 h-4" />
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

            {/* Netflix-Style Profile Dropdown Pill */}
            <div className="relative">
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

              {/* Dropdown — Netflix Style Multi-Profile Switcher */}
              <div
                className={`absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50
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
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold tracking-wider uppercase">
                        ✓ Active Profile
                      </span>
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

                {/* Netflix-Style Switch Profile Section */}
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
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full ${avatarBg} text-white font-black flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                            {prof.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{prof.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {prof.lockedCourseName ? `Course: ${prof.lockedCourseName}` : '⚠️ Needs Course Lock'}
                            </p>
                          </div>
                        </div>

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

                  {/* Add New Profile Button (Netflix Style Limit 4) */}
                  {profiles.length < 4 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNewProfileName('');
                        setCreateError('');
                        setShowAddProfileModal(true);
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
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-blue-500" /> Profile Settings
                  </Link>
                  <button
                    onClick={handleLogout}
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

      {/* Persistent Top Height Spacer */}
      <div className="h-16 w-full shrink-0" aria-hidden="true" />

      {/* Netflix-Style Inline Modal: Add New Profile */}
      {showAddProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Create New User Profile</h3>
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
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProfileSubmit} className="space-y-4 text-xs font-medium">
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-extrabold">Profile Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Ram, Student 2, JEE Prep 2026"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400 leading-normal pt-1">
                  💡 Creating this profile will immediately take you to the <strong>Course Selection Menu</strong> to lock the target course for this new profile.
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
                  disabled={createLoading || !newProfileName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {createLoading ? 'Creating Profile...' : 'Create Profile & Select Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
