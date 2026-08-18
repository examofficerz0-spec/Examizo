'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { User as UserIcon, Mail, Lock, LogIn, ArrowRight, Quote, Eye, EyeOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { clearAllClientUserCaches } from '@/lib/clientCache';

interface AuthViewProps {
  initialMode?: 'signin' | 'register';
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'signin' }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>(initialMode);

  // Common Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);

  // Forgot Password Modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showNewResetPassword, setShowNewResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      window.location.href = '/';
    };

    window.addEventListener('popstate', handlePopState);
    
    // Check URL error parameter (e.g. from eviction/suspension redirect)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      if (errorParam) {
        if (errorParam === 'suspended' || errorParam.toLowerCase().includes('suspended')) {
          setError('Your account is suspended. Please contact support to restore access.');
        } else {
          setError(decodeURIComponent(errorParam));
        }
      }
    }

    // Route prefetching for zero-latency post-login transitions
    try {
      router.prefetch('/dashboard');
      router.prefetch('/course-selection');
      router.prefetch('/leaderboard');
    } catch (e) {}

    return () => window.removeEventListener('popstate', handlePopState);
  }, [router]);

  const handleTabSwitch = (mode: 'signin' | 'register') => {
    if (mode === activeTab) return;
    setError('');
    setActiveTab(mode);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', mode === 'signin' ? '/login' : '/register');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    clearAllClientUserCaches();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid email or password');
      } else {
        clearAllClientUserCaches();
        if (typeof window !== 'undefined' && data.user) {
          try {
            const savedStr = localStorage.getItem('exammaster_saved_accounts');
            let saved = savedStr ? JSON.parse(savedStr) : [];
            if (!Array.isArray(saved)) saved = [];
            const userEmail = data.user.email || email;
            const userName = data.user.name || userEmail.split('@')[0];
            const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600'];
            
            saved = saved.filter((a: any) => a.email.toLowerCase() !== userEmail.toLowerCase());
            saved.unshift({
              id: data.user.id || userEmail,
              email: userEmail,
              name: userName,
              avatarColor: colors[saved.length % colors.length] || 'bg-blue-600',
              lastLogin: new Date().toISOString(),
            });
            if (saved.length > 4) saved = saved.slice(0, 4);
            localStorage.setItem('exammaster_saved_accounts', JSON.stringify(saved));
          } catch (e) {}
        }

        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const joinCode = urlParams?.get('joinCode');

        if (joinCode) {
          router.push(`/leaderboard?joinCode=${encodeURIComponent(joinCode)}`);
        } else if (!data.user.lockedCourseId) {
          router.push('/course-selection');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    clearAllClientUserCaches();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        clearAllClientUserCaches();
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const joinCode = urlParams?.get('joinCode');
        const joinHostId = urlParams?.get('joinHostId');

        if (!data.user.lockedCourseId) {
          if (joinCode) {
            router.push(`/course-selection?joinCode=${encodeURIComponent(joinCode)}`);
          } else if (joinHostId) {
            router.push(`/course-selection?joinHostId=${encodeURIComponent(joinHostId)}`);
          } else {
            router.push('/course-selection');
          }
        } else if (joinCode) {
          router.push(`/leaderboard?joinCode=${encodeURIComponent(joinCode)}`);
        } else if (joinHostId) {
          router.push(`/leaderboard?joinHostId=${encodeURIComponent(joinHostId)}`);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  // Redirect to Google OAuth directly (ultimate fallback)
  const redirectToGoogleOAuth = (clientId: string) => {
    if (typeof window === 'undefined') return;
    const redirectUri = window.location.origin + window.location.pathname;
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&prompt=select_account` +
      `&state=${encodeURIComponent(window.location.search || '')}`;
    window.location.href = url;
  };

  // Process the Google auth payload (email/name or credential) via our backend
  const processGoogleAuth = async (payload: { email?: string; name?: string; credential?: string }) => {
    setError('');
    setGoogleAuthLoading(true);
    clearAllClientUserCaches();
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        clearAllClientUserCaches();
        if (typeof window !== 'undefined') {
          try {
            const savedStr = localStorage.getItem('exammaster_saved_accounts');
            let saved = savedStr ? JSON.parse(savedStr) : [];
            if (!Array.isArray(saved)) saved = [];
            const userEmail = data.user.email || payload.email || '';
            const userName = data.user.name || payload.name || userEmail.split('@')[0];
            const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600'];

            saved = saved.filter((a: any) => a.email?.toLowerCase() !== userEmail.toLowerCase());
            saved.unshift({
              id: data.user.id || userEmail,
              email: userEmail,
              name: userName,
              avatarColor: colors[saved.length % colors.length] || 'bg-blue-600',
              lastLogin: new Date().toISOString(),
            });
            if (saved.length > 4) saved = saved.slice(0, 4);
            localStorage.setItem('exammaster_saved_accounts', JSON.stringify(saved));
          } catch (e) {}
        }

        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const joinCode = urlParams?.get('joinCode');
        const joinHostId = urlParams?.get('joinHostId');

        if (!data.user.lockedCourseId) {
          if (joinCode) {
            router.push(`/course-selection?joinCode=${encodeURIComponent(joinCode)}`);
          } else if (joinHostId) {
            router.push(`/course-selection?joinHostId=${encodeURIComponent(joinHostId)}`);
          } else {
            router.push('/course-selection');
          }
        } else if (joinCode) {
          router.push(`/leaderboard?joinCode=${encodeURIComponent(joinCode)}`);
        } else if (joinHostId) {
          router.push(`/leaderboard?joinHostId=${encodeURIComponent(joinHostId)}`);
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Google authentication failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during Google sign-in. Please try again.');
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  // Fetch user info from Google using access_token, then call processGoogleAuth
  const fetchGoogleUserAndAuth = async (accessToken: string) => {
    setGoogleAuthLoading(true);
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await res.json();
      if (userInfo.email) {
        await processGoogleAuth({
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
        });
      } else {
        setError('Could not retrieve your Google account email.');
        setGoogleAuthLoading(false);
      }
    } catch {
      setError('Failed to get account info from Google.');
      setGoogleAuthLoading(false);
    }
  };

  // Load Google Identity Services SDK and handle redirect callbacks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Handle Google OAuth redirect callback (hash tokens from implicit flow)
    const hash = window.location.hash.substring(1);
    if (hash && (hash.includes('access_token') || hash.includes('id_token'))) {
      const params = new URLSearchParams(hash);
      const idToken = params.get('id_token');
      const accessToken = params.get('access_token');

      // Clean URL hash immediately
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      if (idToken) {
        processGoogleAuth({ credential: idToken });
        return;
      } else if (accessToken) {
        fetchGoogleUserAndAuth(accessToken);
        return;
      }
    }

    // 2. Load Google Identity Services SDK
    const scriptId = 'google-gsi-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleGoogleAuth = () => {
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '342748712178-h3b3ab5teiqcc0trkrhkql8o7ols4gk1.apps.googleusercontent.com';

    setError('');
    setGoogleAuthLoading(true);

    const google = typeof window !== 'undefined' ? (window as any).google : null;

    // ── Strategy 1: GIS OAuth2 Token Popup (called synchronously on click = no popup block) ──
    if (google?.accounts?.oauth2) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              if (tokenResponse.error === 'popup_closed_by_user') {
                setGoogleAuthLoading(false);
                return;
              }
              // Access denied or config error — try redirect
              console.warn('Google OAuth callback error:', tokenResponse.error);
              redirectToGoogleOAuth(clientId);
              return;
            }
            if (tokenResponse.access_token) {
              await fetchGoogleUserAndAuth(tokenResponse.access_token);
            } else {
              setGoogleAuthLoading(false);
            }
          },
          error_callback: (err: any) => {
            // Popup was BLOCKED by browser — fall back to redirect
            console.warn('Google popup blocked, redirecting:', err);
            redirectToGoogleOAuth(clientId);
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });

        // Safety timeout: if nothing happens in 120s, reset loading state
        setTimeout(() => {
          setGoogleAuthLoading((prev: boolean) => {
            if (prev) {
              setError('Google sign-in timed out. Please try again.');
              return false;
            }
            return prev;
          });
        }, 120000);
        return;
      } catch (err) {
        console.warn('initTokenClient failed:', err);
      }
    }

    // ── Strategy 2: Google One Tap / Sign In With Google (FedCM-based) ──
    if (google?.accounts?.id) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              await processGoogleAuth({ credential: response.credential });
            } else {
              setGoogleAuthLoading(false);
            }
          },
          cancel_on_tap_outside: false,
        });

        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // One Tap failed — fall back to redirect
            redirectToGoogleOAuth(clientId);
          }
          // If displayed, user will interact with it and callback fires
        });
        return;
      } catch (err) {
        console.warn('Google One Tap failed:', err);
      }
    }

    // ── Strategy 3: Direct Google OAuth2 Redirect (works everywhere) ──
    redirectToGoogleOAuth(clientId);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newResetPassword !== confirmResetPassword) {
      setResetStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    setResetLoading(true);
    setResetStatus(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, newPassword: newResetPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetStatus({ type: 'success', message: 'Password updated successfully! You can now log in.' });
        setTimeout(() => {
          setEmail(resetEmail);
          setShowForgotModal(false);
        }, 1500);
      } else {
        setResetStatus({ type: 'error', message: data.error || 'Password reset failed' });
      }
    } catch (err: any) {
      setResetStatus({ type: 'error', message: 'Network error resetting password' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 font-sans text-slate-900 dark:text-slate-100 select-none bg-slate-100 dark:bg-slate-950">
      {/* Left Hero Image Column */}
      <div className="hidden lg:block lg:col-span-7 relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url('/study_hero_bg.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/60 via-slate-900/30 to-slate-950/50" />

        {/* Glassmorphic Quote Card */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="bg-white/20 dark:bg-slate-900/50 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-3xl p-10 max-w-md shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-slate-800/40 backdrop-blur-md text-white flex items-center justify-center mx-auto border border-white/30">
              <Quote className="w-6 h-6 fill-white text-white" />
            </div>
            <p className="text-lg font-black text-white leading-relaxed tracking-tight drop-shadow-md">
              "Examizo — where every practice set sharpens your edge and every mock test brings you closer to the top."
            </p>
            <div className="w-12 h-1 bg-blue-400 rounded-full mx-auto" />
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-8 left-8 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
          <span className="w-2 h-2 rounded-full bg-white/40" />
          <span className="w-2 h-2 rounded-full bg-white/40" />
        </div>
      </div>

      {/* Right Form Panel — High-Intensity Deep Drop Shadow */}
      <div className="lg:col-span-5 xl:col-span-5 relative z-10 flex flex-col justify-between
        bg-white dark:bg-slate-900
        p-6 sm:p-10 lg:p-12
        shadow-[-20px_0_60px_0_rgba(0,0,0,0.40),-40px_0_100px_0_rgba(0,0,0,0.30),-4px_0_16px_0_rgba(0,0,0,0.25)]
        dark:shadow-[-20px_0_60px_0_rgba(0,0,0,0.85),-40px_0_100px_0_rgba(0,0,0,0.75),-4px_0_16px_0_rgba(0,0,0,0.60)]">
        <div>
          {/* Top Logo & Back to Home Link */}
          <div className="pt-2 flex items-center justify-between">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
              }}
              className="cursor-pointer"
            >
              <Logo size={40} subtitle="ACADEMIC PRECISION" />
            </Link>
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
              }}
              className="text-xs font-extrabold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>← Back to Home</span>
            </Link>
          </div>

          <div className="mt-8 sm:mt-10 w-full max-w-lg mx-auto space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white transition-all duration-200">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {activeTab === 'signin'
                  ? 'Access your dashboard and continue your academic journey.'
                  : 'Create your account to lock your exam course and start practice sets.'}
              </p>
            </div>

            {/* Sliding Pill Navigation Bar */}
            <div className="relative flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner max-w-xs select-none">
              <button
                type="button"
                onClick={() => handleTabSwitch('signin')}
                className={`flex-1 py-2 text-center text-xs font-black transition-colors z-10 cursor-pointer ${
                  activeTab === 'signin'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('register')}
                className={`flex-1 py-2 text-center text-xs font-black transition-colors z-10 cursor-pointer ${
                  activeTab === 'register'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
              {/* Sliding Pill Background Knob */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200/80 dark:border-slate-700 transition-all duration-300 ease-out transform-gpu ${
                  activeTab === 'signin' ? 'left-1' : 'left-[calc(50%)]'
                }`}
              />
            </div>

            {error && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold shadow-xs flex items-start gap-2.5 transition-all animate-fadeIn ${
                  error.toLowerCase().includes('suspended')
                    ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                }`}
              >
                {error.toLowerCase().includes('suspended') ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="leading-relaxed">{error}</p>
                  {error.toLowerCase().includes('suspended') && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                      Need help?{' '}
                      <a
                        href="mailto:support@examizo.com?subject=Account%20Suspension%20Inquiry"
                        className="underline hover:text-amber-900 dark:hover:text-white font-bold"
                      >
                        Contact Support (support@examizo.com)
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Form Content */}
            <div className="transition-opacity duration-200 ease-in-out">
              {activeTab === 'signin' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-sm focus:shadow-md focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all"
                        placeholder="name@institution.edu"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setResetStatus(null);
                          setShowForgotModal(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 text-xs bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-sm focus:shadow-md focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="rememberMe" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer">
                      Stay signed in for 30 days
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                    <LogIn className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-sm focus:shadow-md focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all"
                        placeholder="e.g. S. Roy"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-sm focus:shadow-md focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all"
                        placeholder="student@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-sm focus:shadow-md focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-sm focus:shadow-md focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/15 text-slate-900 dark:text-white font-medium placeholder-slate-400 transition-all"
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {loading ? 'Creating Account...' : 'Complete Registration'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 shrink-0">
                Or continue with
              </span>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              disabled={googleAuthLoading}
              onClick={handleGoogleAuth}
              className="w-full py-3 px-4 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>
                {googleAuthLoading
                  ? 'Connecting to Google...'
                  : activeTab === 'signin'
                  ? 'Sign in with Google'
                  : 'Sign up with Google'}
              </span>
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {activeTab === 'signin' ? "Don't have an account? " : 'Already registered? '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch(activeTab === 'signin' ? 'register' : 'signin')}
                  className="font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {activeTab === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* FORGOT PASSWORD MODAL */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Reset Account Password</h3>
                <p className="text-xs text-slate-500">
                  Enter your registered account email and set a new password.
                </p>
              </div>

              {resetStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    resetStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {resetStatus.message}
                </div>
              )}

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                    placeholder="student@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewResetPassword(!showNewResetPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNewResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmResetPassword ? 'text' : 'password'}
                      required
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {resetLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 mt-6 text-[11px] text-slate-400 font-semibold flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span>© 2026 Examizo. All rights reserved.</span>
          <div className="flex gap-3">
            <a href="#" className="hover:underline">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:underline">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
};
