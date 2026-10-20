'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone, Sparkles, ExternalLink } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker for PWA Criteria
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Registered successfully
        })
        .catch((err) => {
          console.warn('SW registration info:', err);
        });
    }

    // 2. Check if already installed / running standalone
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
      return Boolean(isStandaloneMode);
    };

    const alreadyStandalone = checkStandalone();
    if (alreadyStandalone) return;

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafariBrowser = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);
    setIsIOS(isIOSDevice && isSafariBrowser);

    // 4. Capture Chrome / Android install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user previously dismissed today
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
      setShowIOSModal(false);
      setInstalledSuccessfully(true);
      setTimeout(() => setInstalledSuccessfully(false), 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Custom trigger event so any button in app can open install modal
    const handleCustomOpen = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else if (isIOSDevice) {
        setShowIOSModal(true);
      } else {
        // Fallback for browsers that already installed or don't support prompt
        setShowPromptBanner(true);
      }
    };

    window.addEventListener('open-pwa-install', handleCustomOpen);

    // Show prompt banner after brief delay on iOS if not dismissed
    if (isIOSDevice && isSafariBrowser) {
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
  }, [deferredPrompt]);

  // Hide during active mock test session
  if (pathname.startsWith('/mock-tests/') && pathname !== '/mock-tests') {
    return null;
  }

  // Hide if already running standalone or not eligible
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
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General instructions for desktop/mobile Chrome
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setShowPromptBanner(false);
    // Dismiss for 2 days
    try {
      localStorage.setItem('examizo_pwa_dismissed_until', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
    } catch (_) {}
  };

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
                  Fast Shortcut
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {isIOS
                  ? 'Add Examizo to your iPhone/iPad Home Screen for 1-tap launch & full screen mock tests.'
                  : 'Install on Chrome for lightning fast access, home screen shortcut, and offline mock tests.'}
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black rounded-lg shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isIOS ? (
                    <>
                      <Share className="w-3.5 h-3.5" /> Add to Home Screen
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Install Now
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

      {/* ─── iOS Safari / General Add to Home Screen Guide Modal ─── */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isIOS ? 'Install on iPhone / iPad' : 'Add Shortcut to Device'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Take mock tests in full screen portrait without browser tabs or address bars.
              </p>
            </div>

            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p className="pt-0.5">
                      Tap the <strong className="text-blue-600 dark:text-blue-400 font-extrabold">Share</strong> icon{' '}
                      <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> at the bottom of Safari.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p className="pt-0.5">
                      Scroll down and tap{' '}
                      <strong className="text-slate-900 dark:text-white font-extrabold">
                        'Add to Home Screen'
                      </strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-700 dark:text-slate-300" />.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p className="pt-0.5">
                      Tap <strong className="text-blue-600 dark:text-blue-400 font-extrabold">Add</strong> in the
                      top-right corner. Examizo icon will appear on your home screen!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p className="pt-0.5">
                      In Chrome, tap the <strong className="text-slate-900 dark:text-white font-bold">⋮ (3 dots)</strong> menu in the top-right corner.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p className="pt-0.5">
                      Select <strong className="text-blue-600 dark:text-blue-400 font-extrabold">'Install app'</strong> or <strong className="text-blue-600 dark:text-blue-400 font-extrabold">'Add to Home screen'</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p className="pt-0.5">
                      Confirm installation to launch Examizo as a standalone app on your device.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowIOSModal(false);
                  setShowPromptBanner(false);
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
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
