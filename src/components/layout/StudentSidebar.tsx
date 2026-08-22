'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '../common/Logo';
import { LayoutDashboard, FileText, HelpCircle, Trophy, LogOut, Award, X } from 'lucide-react';
import { clearAllClientUserCaches } from '@/lib/clientCache';

interface StudentSidebarProps {
  courseName?: string;
  progressPercent?: number;
  xpTotal?: number;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  courseName: propsCourseName,
  progressPercent: propsProgress,
  xpTotal: propsXp,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [courseName, setCourseName] = useState<string>(propsCourseName || '');
  const [progressPercent, setProgressPercent] = useState<number>(propsProgress !== undefined ? propsProgress : 0);
  const [xpTotal, setXpTotal] = useState<number>(propsXp !== undefined ? propsXp : 0);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener('toggleStudentSidebar', handleToggle);
    window.addEventListener('closeStudentSidebar', handleClose);
    return () => {
      window.removeEventListener('toggleStudentSidebar', handleToggle);
      window.removeEventListener('closeStudentSidebar', handleClose);
    };
  }, []);

  useEffect(() => {
    const fetchFreshDashboard = () => {
      fetch('/api/dashboard')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            if (data.user.lockedCourse?.name) {
              setCourseName(data.user.lockedCourse.name);
            }
            if (data.user.progressPercent !== undefined) {
              setProgressPercent(data.user.progressPercent);
            }
            if (data.user.xp_total !== undefined) {
              setXpTotal(data.user.xp_total);
            }
          }
        })
        .catch(console.error);
    };

    fetchFreshDashboard();

    window.addEventListener('xpUpdated', fetchFreshDashboard);
    return () => window.removeEventListener('xpUpdated', fetchFreshDashboard);
  }, [propsCourseName, propsProgress, propsXp]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Daily Practice Paper', href: '/practice', icon: HelpCircle },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ];

  const handleLogout = async () => {
    clearAllClientUserCaches();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/login';
  };

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      <div className="p-5">
        <div className="flex justify-between items-center mb-6">
          <Logo />
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Locked Course Widget */}
        <div className="mb-6 p-3.5 bg-slate-50 dark:bg-[#0B1626] border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#064E3B] text-white flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                {courseName || 'Selected Course'}
              </h4>
              <p className="text-[10px] text-slate-500 font-bold">{progressPercent}% Completed</p>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#10B981] h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#044B3B] text-white dark:bg-[#10B981] dark:text-slate-950 font-black shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-slate-950' : 'text-slate-500 dark:text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {/* XP Badge */}
        <div className="p-3 bg-[#DCFCE7] dark:bg-[#0B1C16] border border-[#BBF7D0] dark:border-[#064E3B] rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-slate-950 flex items-center justify-center font-black shrink-0">
            <Award className="w-4 h-4 text-white dark:text-slate-950" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#064E3B] dark:text-[#34D399] block tracking-tight">TOTAL EXPERIENCE</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{xpTotal.toLocaleString()} XP</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="flex items-center gap-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors w-full px-3.5 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
        <SidebarContent />
      </aside>

      {/* Mobile Slide-Over Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-slate-900 h-full shadow-2xl z-50 flex flex-col justify-between select-none animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
