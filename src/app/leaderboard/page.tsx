'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentStatsModal } from '@/components/ui/StudentStatsModal';
import { DigiLockerGuard } from '@/components/ui/DigiLockerModal';
import {
  Trophy, Star, Crown, Lock, Zap, ArrowRight, Users, Check, Copy, Trash2, X, Swords, Share2, Sparkles, BarChart2, Eye
} from 'lucide-react';

const getInitialLeaderboardCache = () => {
  if (typeof window !== 'undefined' && (window as any).__LEADERBOARD_CACHE__) {
    return (window as any).__LEADERBOARD_CACHE__;
  }
  return null;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const initialCache = getInitialLeaderboardCache();
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  const [selectedStudentStatsId, setSelectedStudentStatsId] = useState<string | null>(null);
  
  // Global Leaderboard State
  const [leaderboard, setLeaderboard] = useState<any[]>(initialCache?.leaderboard || []);
  const [userRank, setUserRank] = useState<any>(initialCache?.userRank || null);
  const [loadingGlobal, setLoadingGlobal] = useState(!initialCache);

  // Friends Leaderboard State
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Pending Join Requests for Host User
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Incoming Join Link Invite Modal State
  const [joinModalInfo, setJoinModalInfo] = useState<{
    show: boolean;
    hostName: string;
    joinCode: string;
    status: 'can_request' | 'pending' | 'already_friends' | 'self';
    sending?: boolean;
  } | null>(null);

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch Global Leaderboard
  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          const cacheObj = {
            leaderboard: data.leaderboard || [],
            userRank: data.userRank || null,
          };
          if (typeof window !== 'undefined') {
            (window as any).__LEADERBOARD_CACHE__ = cacheObj;
          }
          setLeaderboard(data.leaderboard || []);
          setUserRank(data.userRank || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingGlobal(false));
  }, []);

  // Fetch Friends Leaderboard & Pending Requests & Invite Code
  const fetchFriendsLeaderboard = () => {
    setLoadingFriends(true);
    fetch('/api/leaderboard/friends')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setFriendsList(data.friendsLeaderboard || []);
          setPendingRequests(data.pendingRequests || []);
          if (data.inviteCode) setInviteCode(data.inviteCode);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFriends(false));
  };

  useEffect(() => {
    fetchFriendsLeaderboard();
  }, [activeTab]);

  // Check URL joinCode search parameter on mount (handles incoming invite link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('joinCode');
    if (!code) return;

    fetch(`/api/leaderboard/friends/request?joinCode=${encodeURIComponent(code)}`)
      .then((res) => {
        if (res.status === 401) {
          router.push(`/register?joinCode=${encodeURIComponent(code)}`);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || data.error) return;
        if (data.status === 'unauthenticated') {
          router.push(`/register?joinCode=${encodeURIComponent(code)}`);
          return;
        }
        if (data.status === 'self') return; // User opened their own link

        setJoinModalInfo({
          show: true,
          hostName: data.hostUser?.name || 'a fellow student',
          joinCode: code,
          status: data.status,
        });
      })
      .catch(console.error);
  }, []);

  // Poll join request status while modal is open and status is 'pending'
  useEffect(() => {
    if (!joinModalInfo?.show || joinModalInfo.status !== 'pending' || !joinModalInfo.joinCode) return;

    const interval = setInterval(() => {
      fetch(`/api/leaderboard/friends/request?joinCode=${encodeURIComponent(joinModalInfo.joinCode)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.status === 'already_friends') {
            setJoinModalInfo((prev) => (prev ? { ...prev, status: 'already_friends' } : null));
            showToast(`🎉 ${data.hostUser?.name || 'Host'} accepted your join request!`);
            fetchFriendsLeaderboard();
          }
        })
        .catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, [joinModalInfo?.show, joinModalInfo?.status, joinModalInfo?.joinCode]);

  // Send Join Request Handler
  const handleSendJoinRequest = async () => {
    if (!joinModalInfo?.joinCode) return;
    setJoinModalInfo((prev) => (prev ? { ...prev, sending: true } : null));
    try {
      const res = await fetch('/api/leaderboard/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinModalInfo.joinCode }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Join request sent!');
        setJoinModalInfo((prev) => (prev ? { ...prev, status: 'pending', sending: false } : null));
      } else {
        showToast(data.error || 'Failed to send join request');
        setJoinModalInfo((prev) => (prev ? { ...prev, sending: false } : null));
      }
    } catch {
      showToast('Error sending join request');
      setJoinModalInfo((prev) => (prev ? { ...prev, sending: false } : null));
    }
  };

  // Accept or Decline Join Request Action Handler for Host
  const handleRequestAction = async (requesterId: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch('/api/leaderboard/friends/request/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || (action === 'accept' ? 'Accepted request!' : 'Declined request'));
        fetchFriendsLeaderboard();
      } else {
        showToast(data.error || 'Action failed');
      }
    } catch {
      showToast('Failed to perform action');
    }
  };

  // Remove Friend Handler
  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from your custom friends leaderboard?`)) return;
    try {
      const res = await fetch(`/api/leaderboard/friends?friendId=${friendId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(`Removed ${name} from friends`);
        fetchFriendsLeaderboard();
      }
    } catch {
      showToast('Failed to remove friend');
    }
  };

  // Helper to get current shareable URL
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/leaderboard?joinCode=${inviteCode || 'INVITE'}`;
  };

  const shareText = `Join me on Examizo Leaderboard! Compete together, track XP, and climb standings:`;

  // Robust Copy helper with fallback
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  // Copy Shareable Invite Link Button Action
  const handleCopyInviteLink = () => {
    const link = getShareUrl();
    copyToClipboard(link);
    setCopiedLink(true);
    showToast('📋 Friend invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Native Web Share Action
  const handleNativeShare = async () => {
    const link = getShareUrl();
    const shareData = {
      title: 'Examizo Leaderboard',
      text: shareText,
      url: link,
    };
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share(shareData);
        showToast('Shared successfully!');
      } catch {
        // User cancelled or failed, fallback to copy link
        handleCopyInviteLink();
      }
    } else {
      handleCopyInviteLink();
    }
  };

  // Challenge Friend Action
  const handleChallengeFriend = (friendName: string) => {
    const challengeMsg = `Hey ${friendName}! I challenge you to compete on Examizo! Check my XP on our custom leaderboard: ${getShareUrl()}`;
    copyToClipboard(challengeMsg);
    showToast(`⚔️ Challenge link copied for ${friendName}! Send it to them now.`);
  };

  // Leaderboard is locked when the current user has 0 XP
  const isLocked = !loadingGlobal && userRank !== null && (userRank.xp_total === 0 || !userRank.xp_total);

  return (
    <DigiLockerGuard>
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {toastMessage}
        </div>
      )}

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 animate-page-in pb-24 lg:pb-0">

        {/* Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-200 dark:border-amber-900/50">
                <Trophy className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Leaderboard &amp; Student Standings
                </h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Track live course rankings or compete with your study buddies in your custom friends arena!
                </p>
              </div>
            </div>
          </div>

          {/* Action CTA: Share Invite Link Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share Invite Link
            </button>
          </div>
        </div>

        {/* Pinned Own Rank Card (Only visible when unlocked) */}
        {!isLocked && userRank && (
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-blue-900/40 p-6 text-slate-900 dark:text-white shadow-xs">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
                  #{userRank.rank}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    YOUR OFFICIAL COURSE RANKING
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{userRank.name}</h3>
                </div>
              </div>

              <div className="px-6 py-3 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-2xl font-black text-xl flex items-center gap-2 border border-blue-200/80 dark:border-blue-900">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                {userRank.xp_total?.toLocaleString() || 0} XP
              </div>
            </div>
          </div>
        )}

        {/* Locked Overlay Screen (When Student has 0 XP) */}
        {isLocked ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-200/80 dark:border-amber-900/60 p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xl my-6 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800 shadow-md">
              <Lock className="w-10 h-10 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 tracking-wider border border-amber-200 dark:border-amber-800">
                Leaderboard Locked • 0 XP Earned
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Earn Your First XP to Unlock Standings!
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                You currently have 0 XP. Complete your first practice set or mock test to earn XP, unlock your official course ranking, and compare performance stats with other students!
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/practice')}
                className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" /> Start Daily Practice
              </button>
              <button
                type="button"
                onClick={() => router.push('/mock-tests')}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Take A Mock Test <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs Switcher */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('global')}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'global'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Course Standings (Global)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('friends')}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'friends'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                Custom Friends Arena
              </button>
            </div>

            {/* TAB 1: GLOBAL LEADERBOARD */}
            {activeTab === 'global' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                {loadingGlobal ? (
                  <div className="py-20 text-center text-xs font-bold text-slate-400">Loading standings...</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4 pl-6 w-20 text-center">Rank</th>
                        <th className="p-4">Student Name</th>
                        <th className="p-4 text-center">Total XP</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                      {leaderboard.map((item) => {
                        const isSelf = item.isSelf || item.isCurrentUser;
                        const studentId = item.id || item.user_id || item._id;

                        return (
                          <tr
                            key={studentId || item.rank}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              isSelf ? 'bg-blue-50/40 dark:bg-blue-950/20 font-bold' : ''
                            }`}
                          >
                            <td className="p-4 pl-6 text-center font-black">
                              {item.rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                                  <Crown className="w-4 h-4 fill-amber-500" />
                                </span>
                              ) : item.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  <Crown className="w-4 h-4 text-slate-400" />
                                </span>
                              ) : item.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-900/10 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                                  <Crown className="w-4 h-4 text-amber-700" />
                                </span>
                              ) : (
                                `#${item.rank}`
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {!isSelf ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentStatsId(studentId)}
                                    className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                                    title="Click to view student performance statistics"
                                  >
                                    <span>{item.name}</span>
                                    <BarChart2 className="w-3.5 h-3.5 text-blue-500 opacity-60 hover:opacity-100" />
                                  </button>
                                ) : (
                                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{item.name}</span>
                                  </span>
                                )}
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                                    YOU
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center font-extrabold text-slate-900 dark:text-white">
                              <span className="inline-flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                {item.xp_total?.toLocaleString() || 0} XP
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-right">
                              {!isSelf ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentStatsId(studentId)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] rounded-xl transition-all border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <BarChart2 className="w-3.5 h-3.5" /> View Stats
                                </button>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 italic">
                                  Your Account (View on Profile)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

        {/* TAB 2: CUSTOM FRIENDS ARENA */}
        {activeTab === 'friends' && (
          <div className="space-y-6">
            
            {/* Pending Join Requests Section for Host User */}
            {pendingRequests.length > 0 && (
              <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 space-y-3 shadow-xs animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Pending Arena Join Requests ({pendingRequests.length})
                  </h4>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Students requesting to join your custom arena
                  </span>
                </div>

                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.requesterId}
                      className="bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          {req.name}
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                            {req.xp_total || 0} XP
                          </span>
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium">{req.email}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleRequestAction(req.requesterId, 'accept')}
                          className="flex-1 sm:flex-none px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestAction(req.requesterId, 'decline')}
                          className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Custom Friends Arena Standings
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Compare progress, track XP, and challenge your study partners.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Invite Link
                </button>
              </div>

              {loadingFriends ? (
                <div className="py-16 text-center text-xs font-bold text-slate-400">Loading custom friends arena...</div>
              ) : friendsList.length <= 1 ? (
                /* Empty Friends Arena State */
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900">
                    <Users className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div className="max-w-md">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Your Custom Arena is empty!
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Share your invite link with friends or classmates so they can join your custom arena, compare scores, and compete together!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" /> Share Invite Link
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4 pl-6 w-20 text-center">Arena Rank</th>
                      <th className="p-4">Student Name</th>
                      <th className="p-4 text-center">Total XP</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                    {friendsList.map((friend) => {
                      const friendId = friend.id || friend.user_id || friend._id;
                      return (
                        <tr
                          key={friendId}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            friend.isCurrentUser ? 'bg-blue-50/40 dark:bg-blue-950/20 font-bold' : ''
                          }`}
                        >
                          <td className="p-4 pl-6 text-center font-black">
                            #{friend.arenaRank}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {!friend.isCurrentUser ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentStatsId(friendId)}
                                  className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                                  title="Click to view student performance statistics"
                                >
                                  <span>{friend.name}</span>
                                  <BarChart2 className="w-3.5 h-3.5 text-blue-500 opacity-60 hover:opacity-100" />
                                </button>
                              ) : (
                                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{friend.name}</span>
                                </span>
                              )}
                              {friend.isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center font-extrabold text-slate-900 dark:text-white">
                            <span className="inline-flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              {friend.xp_total?.toLocaleString() || 0} XP
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {!friend.isCurrentUser ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentStatsId(friendId)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] rounded-xl transition-all border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <BarChart2 className="w-3.5 h-3.5" /> View Stats
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleChallengeFriend(friend.name)}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60 rounded-xl font-bold text-[11px] transition-colors flex items-center gap-1 border border-amber-200 dark:border-amber-900 cursor-pointer"
                                >
                                  <Swords className="w-3.5 h-3.5" /> Challenge
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFriend(friend.id, friend.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 italic">
                                Your Account (View on Profile)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </>
    )}

  </main>

      {/* Incoming Join Request Modal for Recipient */}
      {joinModalInfo?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-900">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 tracking-wider">
                Arena Invitation
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Join <span className="text-blue-600 dark:text-blue-400">{joinModalInfo.hostName}</span>'s Arena?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Send a request to join their custom arena leaderboard to compete together and track XP rankings!
              </p>
            </div>

            {joinModalInfo.status === 'already_friends' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-900 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Request Accepted! You are now competing in <strong>{joinModalInfo.hostName}</strong>'s custom arena!</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('friends');
                    setJoinModalInfo(null);
                    fetchFriendsLeaderboard();
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" /> View Custom Arena Standings
                </button>
              </div>
            ) : joinModalInfo.status === 'pending' ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-900 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-spin shrink-0" />
                <span>Your join request is pending approval by <strong>{joinModalInfo.hostName}</strong>.</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSendJoinRequest}
                disabled={joinModalInfo.sending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                {joinModalInfo.sending ? 'Sending Request...' : 'Send Request to Join Arena'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setJoinModalInfo(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Share Invite Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Share Invite Link</h3>
                  <p className="text-[11px] text-slate-500">Invite friends to your custom arena standings</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Copy Link Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Shareable Arena Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteCode ? getShareUrl() : 'Loading link...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Social Share Options */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Share directly via
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + getShareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    copyToClipboard(getShareUrl());
                    showToast('Opening WhatsApp... Link copied!');
                  }}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] font-bold text-xs border border-[#25D366]/30 transition-all active:scale-95 cursor-pointer no-underline"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001L2 22l5.14-1.336a9.972 9.972 0 0 0 4.869 1.267h.004c5.507 0 9.99-4.478 9.99-9.985 0-2.667-1.04-5.174-2.927-7.06A9.923 9.923 0 0 0 12.012 2zm0 18.312h-.003a8.31 8.31 0 0 1-4.24-1.166l-.305-.181-3.149.819.839-3.056-.198-.314A8.283 8.283 0 0 1 3.69 11.98c0-4.583 3.734-8.312 8.322-8.312 2.22 0 4.309.866 5.879 2.438a8.272 8.272 0 0 1 2.433 5.878c0 4.584-3.734 8.314-8.312 8.314zm4.562-6.223c-.25-.125-1.482-.731-1.712-.814-.23-.083-.397-.125-.564.125-.167.25-.647.814-.793.98-.146.167-.292.188-.542.063a6.868 6.868 0 0 1-2.011-1.242 7.58 7.58 0 0 1-1.392-1.734c-.146-.25-.015-.386.11-.51.112-.11.25-.292.375-.438.125-.146.167-.25.25-.417.083-.167.042-.313-.021-.438-.063-.125-.563-1.356-.772-1.856-.203-.487-.41-.421-.564-.429l-.48-.008c-.167 0-.438.063-.667.313s-.876.856-.876 2.086c0 1.23.897 2.418 1.022 2.585.125.167 1.764 2.695 4.274 3.777.597.257 1.064.41 1.427.526.6.19 1.146.163 1.577.099.481-.072 1.482-.605 1.69-1.189.208-.584.208-1.084.146-1.189-.063-.105-.23-.167-.48-.292z"/>
                  </svg>
                  WhatsApp
                </a>

                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getShareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    copyToClipboard(getShareUrl());
                    showToast('Opening X (Twitter)... Link copied!');
                  }}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all active:scale-95 cursor-pointer no-underline"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X (Twitter)
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    copyToClipboard(getShareUrl());
                    showToast('Opening Telegram... Link copied!');
                  }}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] font-bold text-xs border border-[#0088cc]/30 transition-all active:scale-95 cursor-pointer no-underline"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  Telegram
                </a>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    copyToClipboard(getShareUrl());
                    showToast('Opening LinkedIn... Link copied!');
                  }}
                  className="flex items-center justify-center gap-2.5 p-3 rounded-2xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 text-[#0A66C2] dark:text-[#388ee7] font-bold text-xs border border-[#0A66C2]/30 transition-all active:scale-95 cursor-pointer no-underline"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.75a1.47 1.47 0 1 0 0 2.94 1.47 1.47 0 0 0 0-2.94z"/>
                  </svg>
                  LinkedIn
                </a>
              </div>

              {/* Native Web Share option */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full mt-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-blue-500" />
                More Share Apps...
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Done
            </button>

          </div>
        </div>
      )}

      {/* Student Performance Statistics Modal */}
      {selectedStudentStatsId && (
        <StudentStatsModal
          studentId={selectedStudentStatsId}
          onClose={() => setSelectedStudentStatsId(null)}
        />
      )}
    </div>
    </DigiLockerGuard>
  );
}
