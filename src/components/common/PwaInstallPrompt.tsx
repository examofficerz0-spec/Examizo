'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Smartphone,
  Sparkles,
  ExternalLink,
  Laptop,
  Tablet,
  Check,
  ArrowDown,
  ArrowUpRight,
  Info
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type DevicePlatform = 'ios' | 'ipad' | 'mac' | 'android' | 'desktop-chrome' | 'other';

function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent || '';
  const platform = (window.navigator as any).platform || '';
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;

  // 1. iPhone or iPod
  if (/iPhone|iPod/.test(ua)) {
    return 'ios';
  }

  // 2. iPad (classic UA with /iPad/ or iPadOS 13+ with platform 'MacIntel' & multitouch)
  if (/iPad/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1)) {
    return 'ipad';
  }

  // 3. Mac Safari (macOS Sonoma / Safari 17+ supports Add to Dock)
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) || platform.startsWith('Mac');
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPR|DuckDuckGo/i.test(ua);
  if (isMac && isSafari) {
    return 'mac';
  }

  // 4. Android
  if (/Android/i.test(ua)) {
    return 'android';
  }

  // 5. Desktop Chrome / Edge
  if (/Chrome|Edg|Brave/i.test(ua)) {
    return 'desktop-chrome';
  }

  if (isSafari) {
    return 'ios';
  }

  return 'other';
}

export const PwaInstallPrompt: React.FC = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<DevicePlatform>('other');
  const [activeTab, setActiveTab] = useState<'apple' | 'android'>('apple');
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Register Service Worker for PWA Criteria
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.warn('[PWA] SW registration info:', err);
        });
    }

    // 2. Check if already installed / running standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(Boolean(isStandaloneMode));
    if (isStandaloneMode) return;

    // 3. Detect Platform
    const detected = detectDevicePlatform();
    setPlatform(detected);
    if (detected === 'android' || detected === 'desktop-chrome') {
      setActiveTab('android');
    } else {
      setActiveTab('apple');
    }

    // 4. Capture Chrome / Android install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user previously dismissed recently
      const dismissedUntil = localStorage.getItem('examizo_pwa_dismissed_until');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        setShowPromptBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. App Installed Listener
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPromptBanner(false);
      setShowInstallModal(false);
      setInstalledSuccessfully(true);
      setTimeout(() => setInstalledSuccessfully(false), 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Custom trigger event so any button in app can open install modal
    const handleCustomOpen = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        // Direct guide modal for Safari, iOS, Mac, or browsers without prompt event
        setShowInstallModal(true);
      }
    };

    window.addEventListener('open-pwa-install', handleCustomOpen);

    // Show prompt banner after brief delay on Apple devices if not dismissed
    if (detected === 'ios' || detected === 'ipad' || detected === 'mac') {
      const dismissedUntil = localStorage.getItem('examizo_pwa_dismissed_until');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        const timer = setTimeout(() => {
          setShowPromptBanner(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleCustomOpen);
    };
  }, []);

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (!showInstallModal) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [showInstallModal]);

  // Hide during active mock test session
  if (pathname.startsWith('/mock-tests/') && pathname !== '/mock-tests') {
    return null;
  }

  // Hide if already running standalone
  if (isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPromptBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  const handleDismiss = () => {
    setShowPromptBanner(false);
    // Dismiss for 2 days
    try {
      localStorage.setItem('examizo_pwa_dismissed_until', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
    } catch (_) {}
  };

  const isAppleDevice = platform === 'ios' || platform === 'ipad' || platform === 'mac';

  return (
    <>
      {/* ─── Bottom Floating Install Banner ─── */}
      {showPromptBanner && (
        <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-[#0B192C]/95 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-blue-500/30 backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Smartphone className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-white">Install Examizo App</span>
                <span className="px-1.5 py-0.2 bg-blue-500/30 border border-blue-400/40 rounded text-[9px] font-bold text-blue-200">
                  {isAppleDevice ? 'Safari / Apple' : 'Fast PWA'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {isAppleDevice
                  ? 'Add Examizo to your Home Screen / Dock for full-screen mock tests without browser bars.'
                  : 'Install on Chrome / Android for lightning fast access, home screen shortcut, and offline mock tests.'}
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-lg shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {deferredPrompt ? (
                    <>
                      <Download className="w-3.5 h-3.5" /> Install Now
                    </>
                  ) : (
                    <>
                      <Share className="w-3.5 h-3.5" /> {isAppleDevice ? 'How to Add' : 'Install Guide'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Not now
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-md text-xs cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Multi-Platform Installation Guide Modal (Portaled) ─── */}
      {showInstallModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-2xl animate-fade-in font-sans overflow-x-hidden overflow-y-auto"
          style={{
            WebkitBackdropFilter: 'blur(24px)',
            backdropFilter: 'blur(24px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInstallModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 max-h-[92dvh] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer z-10"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2.5 shadow-inner">
                {platform === 'mac' ? (
                  <Laptop className="w-6 h-6" />
                ) : platform === 'ipad' ? (
                  <Tablet className="w-6 h-6" />
                ) : (
                  <Smartphone className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Add Examizo to Your Device
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Take mock tests in full screen portrait without browser tabs or address bars.
              </p>
            </div>

            {/* Platform Toggle Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-4 border border-slate-200/80 dark:border-slate-700/60 select-none">
              <button
                type="button"
                onClick={() => setActiveTab('apple')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'apple'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>🍏 Safari / Apple</span>
                {isAppleDevice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>🤖 Android &amp; Chrome</span>
                {!isAppleDevice && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>

            {/* Step-by-Step Instructions Container */}
            <div className="overflow-y-auto overflow-x-hidden flex-1 space-y-3 pr-0.5">
              {activeTab === 'apple' ? (
                <>
                  {/* Safari / Apple Notice Card */}
                  <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-sky-950 dark:text-sky-200 leading-snug font-medium">
                      <strong className="block font-bold">Why Safari has no 1-click install button:</strong>
                      Apple WebKit requires manual confirmation through Safari's native Share menu for privacy &amp; security.
                    </div>
                  </div>

                  {platform === 'mac' ? (
                    /* macOS Safari (Sonoma 14+ / Safari 17+) */
                    <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          1
                        </span>
                        <p className="pt-0.5 leading-snug">
                          In Safari's top menu bar, click <strong className="text-blue-600 dark:text-blue-400 font-extrabold">File</strong> &gt; <strong className="text-slate-900 dark:text-white font-extrabold">'Add to Dock...'</strong> (or click the <strong className="text-blue-600 dark:text-blue-400">Share</strong> icon <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> in the toolbar).
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          2
                        </span>
                        <p className="pt-0.5 leading-snug">
                          Keep the app name as <strong className="text-slate-900 dark:text-white font-bold">'Examizo'</strong> and click the blue <strong className="text-blue-600 dark:text-blue-400 font-extrabold">'Add'</strong> button.
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          3
                        </span>
                        <p className="pt-0.5 leading-snug">
                          Examizo will appear directly in your <strong className="text-slate-900 dark:text-white font-bold">Mac Dock &amp; Launchpad</strong>, opening in its own clean standalone app window!
                        </p>
                      </div>
                    </div>
                  ) : platform === 'ipad' ? (
                    /* iPadOS Safari */
                    <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          1
                        </span>
                        <p className="pt-0.5 leading-snug">
                          Look at the <strong className="text-blue-600 dark:text-blue-400 font-bold">top-right toolbar</strong> of Safari and tap the <strong className="text-blue-600 dark:text-blue-400 font-extrabold">Share</strong> icon <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />.
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          2
                        </span>
                        <p className="pt-0.5 leading-snug">
                          In the dropdown menu, tap <strong className="text-slate-900 dark:text-white font-extrabold">'Add to Home Screen'</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700 dark:text-slate-300" />.
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          3
                        </span>
                        <p className="pt-0.5 leading-snug">
                          Tap <strong className="text-blue-600 dark:text-blue-400 font-extrabold">'Add'</strong> in the top-right corner. The Examizo icon is now ready on your iPad Home Screen!
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* iPhone Safari */
                    <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          1
                        </span>
                        <p className="pt-0.5 leading-snug">
                          Tap the <strong className="text-blue-600 dark:text-blue-400 font-extrabold">Share</strong> icon <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at the <strong className="text-slate-900 dark:text-white font-bold">bottom</strong> of Safari.
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          2
                        </span>
                        <p className="pt-0.5 leading-snug">
                          Scroll down the share sheet and tap <strong className="text-slate-900 dark:text-white font-extrabold">'Add to Home Screen'</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700 dark:text-slate-300" />.
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          3
                        </span>
                        <p className="pt-0.5 leading-snug">
                          Tap <strong className="text-blue-600 dark:text-blue-400 font-extrabold">'Add'</strong> in the top-right corner. Examizo will launch in full screen with zero browser bars!
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Android & Chrome Instructions */
                <div className="space-y-3">
                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={async () => {
                        await deferredPrompt.prompt();
                        const choice = await deferredPrompt.userChoice;
                        if (choice.outcome === 'accepted') {
                          setShowInstallModal(false);
                          setShowPromptBanner(false);
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Examizo Now (1-Tap)</span>
                    </button>
                  )}

                  <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <p className="pt-0.5 leading-snug">
                        In Chrome or Edge, tap the <strong className="text-slate-900 dark:text-white font-bold">⋮ (3 dots)</strong> menu in the top-right corner (or look for the <strong className="text-blue-600 dark:text-blue-400 font-bold">Install ⊕</strong> icon in the address bar).
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <p className="pt-0.5 leading-snug">
                        Select <strong className="text-blue-600 dark:text-blue-400 font-extrabold">'Install app'</strong> or <strong className="text-blue-600 dark:text-blue-400 font-extrabold">'Add to Home screen'</strong>.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        3
                      </span>
                      <p className="pt-0.5 leading-snug">
                        Confirm installation to launch Examizo as a standalone app with offline support.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Dismiss Button */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowInstallModal(false);
                  setShowPromptBanner(false);
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success Notification */}
      {installedSuccessfully && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs font-bold">Examizo installed successfully to Home Screen!</span>
        </div>
      )}
    </>
  );
};
