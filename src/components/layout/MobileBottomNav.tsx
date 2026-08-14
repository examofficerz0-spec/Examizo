'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, HelpCircle, FileText, Trophy, Folder } from 'lucide-react';

const tabs = [
  { label: 'Home',      href: '/dashboard',  icon: Home },
  { label: 'Tests',     href: '/mock-tests', icon: FileText },
  { label: 'Practice',  href: '/practice',   icon: HelpCircle, isFab: true },
  { label: 'Ranks',     href: '/leaderboard',icon: Trophy },
  { label: 'Resources', href: '/resources',  icon: Folder },
];

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const [inSession, setInSession] = useState(false);

  // Watch for data-in-session attribute set by practice/DPP pages during active sessions
  useEffect(() => {
    const check = () => setInSession(document.body.hasAttribute('data-in-session'));
    check(); // initial check

    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-in-session'] });
    return () => observer.disconnect();
  }, []);

  // Hide on auth / course-selection / landing / gallery / privacy / terms pages
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/course-selection' ||
    pathname === '/' ||
    pathname === '/gallery' ||
    pathname === '/privacy' ||
    pathname === '/terms'
  ) {
    return null;
  }

  // Hide during active mock test session (dynamic /mock-tests/[id] route)
  if (pathname.startsWith('/mock-tests/') && pathname !== '/mock-tests') {
    return null;
  }

  // Hide during active practice / DPP session (signalled via body attribute)
  if (inSession) {
    return null;
  }

  // Determine active tab index for sliding indicator animation
  const activeIndex = tabs.findIndex(({ href }) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  );

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50
        bg-white/65 dark:bg-slate-900/65 backdrop-blur-2xl backdrop-saturate-180
        border-t border-slate-200/50 dark:border-slate-800/60
        shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.40)]
        px-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="relative grid grid-cols-5 items-center h-14">
        {/* Animated Sliding Background Pill for tabs */}
        {activeIndex !== -1 && activeIndex !== 2 && (
          <div
            className="absolute top-1 bottom-1 rounded-2xl bg-blue-50 dark:bg-blue-950/60 transition-all duration-300 ease-out pointer-events-none"
            style={{
              width: '20%',
              left: `${activeIndex * 20}%`,
            }}
          />
        )}

        {tabs.map(({ label, href, icon: Icon, isFab }, index) => {
          const isActive = activeIndex === index;

          if (isFab) {
            return (
              <div key={href} className="relative flex justify-center items-center h-full">
                <Link
                  href={href}
                  className="absolute -top-5 flex flex-col items-center group"
                >
                  {/* Completely Round Floating Action Button */}
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center
                      shadow-lg shadow-blue-500/35 border-4 border-slate-50 dark:border-slate-950
                      transition-all duration-300 ease-out active:scale-90 group-hover:scale-105
                      ${
                        isActive
                          ? 'bg-blue-600 scale-105 shadow-blue-600/50 ring-4 ring-blue-500/20'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                  >
                    <Icon
                      className={`w-6 h-6 text-white transition-transform duration-300 ${
                        isActive ? 'scale-110' : ''
                      }`}
                      strokeWidth={2.2}
                    />
                  </span>
                  <span
                    className={`text-[10px] font-extrabold mt-1 transition-colors duration-200 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="relative z-10 flex flex-col items-center justify-center h-full py-1 transition-all duration-200 active:scale-95 select-none"
            >
              <Icon
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 scale-110'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-bold mt-0.5 transition-colors duration-200 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
