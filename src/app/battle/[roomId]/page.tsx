'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Swords, Trophy, Star, Clock, Zap, ArrowRight, ChevronRight,
  Shield, Timer, CheckCircle2, XCircle, Crown, ArrowLeft, RotateCcw, Wifi
} from 'lucide-react';

const TOTAL_QUESTIONS = 5;
const QUESTION_TIMEOUT_MS = 15000;

export default function BattlePage() {
  const router = useRouter();
  const { roomId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isChallenger, setIsChallenger] = useState(false);
  const [myRole, setMyRole] = useState<'challenger' | 'opponent'>('challenger');

  // Answers tracking
  const [challengerAnswers, setChallengerAnswers] = useState<Record<string, any>>({});
  const [opponentAnswers, setOpponentAnswers] = useState<Record<string, any>>({});
  const [iAnsweredCurrent, setIAnsweredCurrent] = useState(false);
  const [theyAnsweredCurrent, setTheyAnsweredCurrent] = useState(false);
  const [bothAnsweredCurrent, setBothAnsweredCurrent] = useState(false);

  // UI states
  const [phase, setPhase] = useState<'lobby' | 'countdown' | 'battle' | 'reveal' | 'results'>('lobby');
  const [countdownNum, setCountdownNum] = useState(3);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [battleResults, setBattleResults] = useState<any>(null);
  const [revealData, setRevealData] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [sendingReady, setSendingReady] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMEOUT_MS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Confetti particles
  const [showConfetti, setShowConfetti] = useState(false);

  // ── Fetch room state ──
  const fetchRoomState = useCallback(async () => {
    try {
      const res = await fetch(`/api/battle/${roomId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load battle room');
        setLoading(false);
        return;
      }
      const data = await res.json();

      setRoom(data.room);
      setQuestions(data.questions || []);
      setIsChallenger(data.isChallenger);
      setMyRole(data.myRole);
      setChallengerAnswers(data.challengerAnswers || {});
      setOpponentAnswers(data.opponentAnswers || {});
      setIAnsweredCurrent(data.iAnsweredCurrent);
      setTheyAnsweredCurrent(data.theyAnsweredCurrent);
      setBothAnsweredCurrent(data.bothAnsweredCurrent);
      setLoading(false);

      // Determine phase
      if (data.room.status === 'completed') {
        setPhase('results');
      } else if (data.room.status === 'in_progress') {
        if (phase === 'lobby' || phase === 'countdown') {
          // Transition to countdown then battle
          if (phase === 'lobby') {
            setPhase('countdown');
          }
        }
        // Check if both answered current — show reveal
        if (data.bothAnsweredCurrent && phase === 'battle') {
          setPhase('reveal');
        }
      } else if (data.room.status === 'expired') {
        setError('This battle has expired');
      }
    } catch {
      setError('Failed to connect to battle server');
      setLoading(false);
    }
  }, [roomId, phase]);

  // Initial load
  useEffect(() => {
    fetchRoomState();
  }, []);

  // Heartbeat to keep online
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat' }),
      }).catch(() => {});
    };
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 30000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, []);

  // Keyboard shortcuts: 1-4 to answer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'battle' || iAnsweredCurrent || submittingAnswer) return;
      const key = e.key;
      if (['1', '2', '3', '4'].includes(key)) {
        const idx = parseInt(key) - 1;
        if (idx < (questions[currentQ] ? (typeof questions[currentQ].options_json === 'string' ? JSON.parse(questions[currentQ].options_json) : questions[currentQ].options_json || []).length : 0)) {
          handleSubmitAnswer(idx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, iAnsweredCurrent, submittingAnswer, currentQ, questions]);

  // Polling for room state
  useEffect(() => {
    if (phase === 'results') return;

    const interval = phase === 'battle' || phase === 'reveal' ? 1000 : 2000;
    pollRef.current = setInterval(fetchRoomState, interval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, fetchRoomState]);

  // ── Mark Ready ──
  const handleReady = async () => {
    setSendingReady(true);
    try {
      await fetch(`/api/battle/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ready' }),
      });
      setIsReady(true);
      await fetchRoomState();
    } catch {
      // ignore
    } finally {
      setSendingReady(false);
    }
  };

  // ── Countdown Logic ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdownNum(3);

    const timer = setInterval(() => {
      setCountdownNum(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('battle');
          setCurrentQ(room?.currentQuestion || 0);
          setQuestionStartTime(Date.now());
          setTimeLeft(QUESTION_TIMEOUT_MS);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // ── Question Timer ──
  useEffect(() => {
    if (phase !== 'battle') return;
    setTimeLeft(QUESTION_TIMEOUT_MS);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          // Auto-submit timeout
          if (!iAnsweredCurrent && !submittingAnswer) {
            handleSubmitAnswer(-1); // -1 = no answer
          }
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentQ]);

  // ── Both answered: trigger reveal phase ──
  useEffect(() => {
    if (room?.status === 'in_progress' && bothAnsweredCurrent && phase === 'battle') {
      setPhase('reveal');
      if (timerRef.current) clearInterval(timerRef.current);

      // Build reveal data
      const qIdx = String(currentQ);
      const q = questions[currentQ];
      const cAns = challengerAnswers[qIdx];
      const oAns = opponentAnswers[qIdx];

      setRevealData({
        question: q,
        challengerAnswer: cAns?.answer,
        opponentAnswer: oAns?.answer,
        challengerTime: cAns?.time_ms || QUESTION_TIMEOUT_MS,
        opponentTime: oAns?.time_ms || QUESTION_TIMEOUT_MS,
        correctOption: q?.correct_option,
      });

      // Auto-advance after 3 seconds
      setTimeout(() => {
        const nextQ = currentQ + 1;
        if (nextQ >= (questions.length || TOTAL_QUESTIONS)) {
          // Game should be completed — results will come from next poll
          fetchRoomState();
        } else {
          setCurrentQ(nextQ);
          setSelectedAnswer(null);
          setIAnsweredCurrent(false);
          setTheyAnsweredCurrent(false);
          setBothAnsweredCurrent(false);
          setRevealData(null);
          setQuestionStartTime(Date.now());
          setPhase('battle');
        }
      }, 3000);
    }
  }, [bothAnsweredCurrent, phase]);

  // ── Check for game completion ──
  useEffect(() => {
    if (room?.status === 'completed' && phase !== 'results') {
      setPhase('results');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [room?.status]);

  // ── Submit Answer ──
  const handleSubmitAnswer = async (answerIdx: number) => {
    if (submittingAnswer || iAnsweredCurrent) return;
    setSubmittingAnswer(true);
    setSelectedAnswer(answerIdx);
    const timeMs = Date.now() - questionStartTime;

    try {
      await fetch(`/api/battle/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          questionIndex: currentQ,
          answer: answerIdx,
          timeMs,
        }),
      });
      setIAnsweredCurrent(true);
      // Immediately poll for opponent's answer
      await fetchRoomState();
    } catch {
      // ignore
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // ── Derived values ──
  const myName = isChallenger ? room?.challengerName : room?.opponentName;
  const theirName = isChallenger ? room?.opponentName : room?.challengerName;
  const myReady = isChallenger ? room?.challengerReady : room?.opponentReady;
  const theirReady = isChallenger ? room?.opponentReady : room?.challengerReady;
  const myScore = isChallenger ? room?.challengerScore : room?.opponentScore;
  const theirScore = isChallenger ? room?.opponentScore : room?.challengerScore;
  const iWon = room?.winnerId === (isChallenger ? room?.challengerId : room?.opponentId);
  const isDraw = room?.status === 'completed' && !room?.winnerId;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4 animate-pulse">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
            <Swords className="w-10 h-10 text-white" />
          </div>
          <p className="text-white font-black text-lg">Loading Battle Arena...</p>
          <p className="text-slate-400 text-xs">Connecting to room</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-white font-black text-xl">{error}</h2>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            Back to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE: LOBBY
  // ═══════════════════════════════════════
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          {/* Title */}
          <div className="text-center mb-12 space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-wider border border-amber-500/30">
              <Swords className="w-3.5 h-3.5" /> 1v1 Quiz Battle
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Battle Arena</h1>
          </div>

          {/* VS Split Screen */}
          <div className="w-full max-w-3xl flex flex-col md:flex-row items-center gap-6 md:gap-0">
            {/* Player 1 (Me) */}
            <div className={`flex-1 w-full md:w-auto p-8 rounded-3xl md:rounded-r-none border-2 transition-all duration-500 ${
              myReady || isReady
                ? 'bg-blue-600/20 border-blue-500 shadow-2xl shadow-blue-500/20'
                : 'bg-slate-900 border-slate-700'
            }`}>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto text-3xl font-black shadow-xl">
                  {myName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">You</p>
                  <h3 className="text-lg font-black">{myName || 'Player 1'}</h3>
                </div>
                {(myReady || isReady) ? (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" /> READY!
                  </div>
                ) : (
                  <button
                    onClick={handleReady}
                    disabled={sendingReady}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {sendingReady ? 'Readying...' : "I'm Ready!"}
                  </button>
                )}
              </div>
            </div>

            {/* VS Badge */}
            <div className="relative z-10 -my-3 md:my-0 md:-mx-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-amber-500/40 rotate-3 hover:rotate-0 transition-transform">
                VS
              </div>
            </div>

            {/* Player 2 (Opponent) */}
            <div className={`flex-1 w-full md:w-auto p-8 rounded-3xl md:rounded-l-none border-2 transition-all duration-500 ${
              theirReady
                ? 'bg-orange-600/20 border-orange-500 shadow-2xl shadow-orange-500/20'
                : 'bg-slate-900 border-slate-700'
            }`}>
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto text-3xl font-black shadow-xl">
                  {theirName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Opponent</p>
                  <h3 className="text-lg font-black">{theirName || 'Waiting...'}</h3>
                </div>
                {theirReady ? (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" /> READY!
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
                    <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> Waiting...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-slate-500 text-xs mt-8 text-center max-w-md">
            Both players must click "Ready" to start. The battle consists of {TOTAL_QUESTIONS} rapid-fire questions. Answer fast — speed gives bonus points!
          </p>

          {/* Back button */}
          <button
            onClick={() => router.push('/leaderboard')}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE: COUNTDOWN
  // ═══════════════════════════════════════
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div
            key={countdownNum}
            className="text-9xl font-black animate-bounce"
            style={{
              background: countdownNum === 3 ? 'linear-gradient(to bottom, #f59e0b, #d97706)' :
                         countdownNum === 2 ? 'linear-gradient(to bottom, #3b82f6, #2563eb)' :
                         'linear-gradient(to bottom, #10b981, #059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
            }}
          >
            {countdownNum === 0 ? 'GO!' : countdownNum}
          </div>
          <p className="text-slate-400 text-sm font-bold mt-4 animate-pulse">
            {countdownNum > 0 ? 'Get Ready...' : 'Battle Starting!'}
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE: RESULTS
  // ═══════════════════════════════════════
  if (phase === 'results') {
    const winnerName = room?.winnerId === room?.challengerId ? room?.challengerName : room?.opponentName;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
        {/* Confetti */}
        {showConfetti && (
          <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-5%',
                  backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#ec4899'][Math.floor(Math.random() * 6)],
                  animation: `confettiFall ${2 + Math.random() * 3}s ease-in forwards`,
                  animationDelay: `${Math.random() * 2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          {/* Result Header */}
          <div className="text-center space-y-4 mb-8">
            {isDraw ? (
              <>
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30 animate-bounce">
                  <Swords className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-black">It's a Draw!</h1>
                <p className="text-amber-400 font-bold text-sm">Both warriors fought equally!</p>
              </>
            ) : iWon ? (
              <>
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/40 animate-bounce">
                  <Trophy className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  You Won! 🏆
                </h1>
                <p className="text-emerald-400 font-bold text-sm">Brilliant performance, champion!</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center mx-auto shadow-xl">
                  <Shield className="w-12 h-12 text-slate-400" />
                </div>
                <h1 className="text-4xl font-black text-slate-300">Defeated</h1>
                <p className="text-slate-500 font-bold text-sm">{winnerName} won this round. Challenge again!</p>
              </>
            )}
          </div>

          {/* Score Cards */}
          <div className="flex items-center gap-8 mb-8">
            <div className={`text-center p-6 rounded-2xl border-2 ${iWon ? 'border-amber-500 bg-amber-500/10' : isDraw ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 bg-slate-900'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">You</p>
              <p className="text-3xl font-black">{myScore || 0}</p>
              <p className="text-xs text-slate-500 font-bold">points</p>
            </div>

            <div className="text-2xl font-black text-slate-600">vs</div>

            <div className={`text-center p-6 rounded-2xl border-2 ${!iWon && !isDraw ? 'border-amber-500 bg-amber-500/10' : isDraw ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 bg-slate-900'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">{theirName}</p>
              <p className="text-3xl font-black">{theirScore || 0}</p>
              <p className="text-xs text-slate-500 font-bold">points</p>
            </div>
          </div>

          {/* XP Earned */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 font-black text-sm border border-emerald-500/30 mb-8">
            <Star className="w-5 h-5 fill-emerald-400" />
            +{iWon ? 50 : isDraw ? 30 : 15} XP Earned!
          </div>

          {/* Per-question breakdown */}
          <div className="w-full max-w-lg space-y-2 mb-8">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Question Breakdown</h4>
            {questions.map((q, idx) => {
              const cAns = challengerAnswers[String(idx)];
              const oAns = opponentAnswers[String(idx)];
              const cCorrect = cAns?.answer === q.correct_option;
              const oCorrect = oAns?.answer === q.correct_option;
              const myAns = isChallenger ? cAns : oAns;
              const theirAns = isChallenger ? oAns : cAns;
              const myCorrect = isChallenger ? cCorrect : oCorrect;
              const theirCorrect = isChallenger ? oCorrect : cCorrect;

              return (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-xs font-black text-slate-500 w-6">Q{idx + 1}</span>
                  <div className="flex-1 flex items-center gap-2">
                    {/* My result */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${myCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {myCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {myAns?.time_ms ? `${(myAns.time_ms / 1000).toFixed(1)}s` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-slate-600 font-bold">vs</span>
                    {/* Their result */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${theirCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {theirCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {theirAns?.time_ms ? `${(theirAns.time_ms / 1000).toFixed(1)}s` : 'N/A'}
                    </div>
                  </div>
                  {/* Speed crown */}
                  {myCorrect && theirCorrect && myAns?.time_ms < theirAns?.time_ms && (
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  )}
                  {theirCorrect && myCorrect && theirAns?.time_ms < myAns?.time_ms && (
                    <Zap className="w-4 h-4 text-orange-400 fill-orange-400" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/leaderboard')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Leaderboard
            </button>
            <button
              onClick={async () => {
                const opponentId = isChallenger ? room?.opponentId : room?.challengerId;
                const res = await fetch('/api/battle', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'create', opponentId }),
                });
                const data = await res.json();
                if (data.roomId) {
                  router.push(`/battle/${data.roomId}`);
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm rounded-xl shadow-xl shadow-amber-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Rematch!
            </button>
          </div>
        </div>

        {/* CSS for confetti */}
        <style jsx>{`
          @keyframes confettiFall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // PHASE: BATTLE + REVEAL
  // ═══════════════════════════════════════
  const currentQuestion = questions[currentQ];
  const options = currentQuestion ? (
    typeof currentQuestion.options_json === 'string'
      ? JSON.parse(currentQuestion.options_json)
      : currentQuestion.options_json || []
  ) : [];

  const timerPercent = (timeLeft / QUESTION_TIMEOUT_MS) * 100;
  const timerColor = timerPercent > 50 ? 'bg-emerald-500' : timerPercent > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-3xl rounded-full" />
      </div>

      {/* Top Bar */}
      <div className="relative z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        {/* Timer Bar */}
        <div className="h-1 bg-slate-800 w-full">
          <div
            className={`h-full ${timerColor} transition-all duration-100 ease-linear`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          {/* My Score */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-black">
              {myName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase">You</p>
              <p className="text-sm font-black">{myScore || 0} pts</p>
            </div>
          </div>

          {/* Question Counter */}
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Question</p>
            <p className="text-lg font-black">
              <span className="text-white">{currentQ + 1}</span>
              <span className="text-slate-600">/{questions.length || TOTAL_QUESTIONS}</span>
            </p>
          </div>

          {/* Opponent Score */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-orange-400 uppercase">{theirName}</p>
              <p className="text-sm font-black">{theirScore || 0} pts</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-sm font-black">
              {theirName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
        {phase === 'reveal' && revealData ? (
          // ── REVEAL PHASE ──
          <div className="w-full max-w-2xl space-y-6 animate-fade-in">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Answer Revealed</p>
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-700">
                <p className="text-sm font-bold text-slate-300 leading-relaxed">{revealData.question?.question_text}</p>
              </div>
            </div>

            {/* Options with reveal */}
            <div className="grid gap-3">
              {options.map((opt: string, idx: number) => {
                const isCorrect = idx === revealData.correctOption;
                const myPick = isChallenger ? revealData.challengerAnswer === idx : revealData.opponentAnswer === idx;
                const theirPick = isChallenger ? revealData.opponentAnswer === idx : revealData.challengerAnswer === idx;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                        : (myPick || theirPick)
                          ? 'border-red-500/60 bg-red-500/10'
                          : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 text-sm font-bold text-slate-200">{opt}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {myPick && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500/30 text-blue-300">YOU</span>
                      )}
                      {theirPick && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-orange-500/30 text-orange-300">{theirName?.split(' ')[0]}</span>
                      )}
                      {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Speed comparison */}
            <div className="flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Timer className="w-3.5 h-3.5" />
                You: {((isChallenger ? revealData.challengerTime : revealData.opponentTime) / 1000).toFixed(1)}s
              </div>
              <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                <Timer className="w-3.5 h-3.5" />
                {theirName}: {((isChallenger ? revealData.opponentTime : revealData.challengerTime) / 1000).toFixed(1)}s
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 font-bold animate-pulse">
              Next question in a moment...
            </p>
          </div>
        ) : (
          // ── BATTLE PHASE ──
          <div className="w-full max-w-2xl space-y-6">
            {/* Question Card */}
            <div
              key={`q-${currentQ}`}
              className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-slate-700 shadow-2xl"
              style={{
                animation: 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {currentQuestion?.topic_tag && (
                <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider mb-4 border border-blue-500/30">
                  {currentQuestion.topic_tag}
                </span>
              )}
              <p className="text-base md:text-lg font-bold text-white leading-relaxed">
                {currentQuestion?.question_text || 'Loading question...'}
              </p>
            </div>

            {/* Answer Options */}
            <div className="grid gap-3">
              {options.map((opt: string, idx: number) => {
                const isSelected = selectedAnswer === idx;
                const isLocked = iAnsweredCurrent;

                return (
                  <button
                    key={idx}
                    onClick={() => !isLocked && handleSubmitAnswer(idx)}
                    disabled={isLocked || submittingAnswer}
                    className={`w-full p-4 md:p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/20 shadow-lg shadow-blue-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800/80'
                    }`}
                    style={{
                      animation: `slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)`,
                      animationDelay: `${0.1 + idx * 0.08}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 text-sm font-bold text-slate-200">{opt}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 animate-bounce" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Waiting for opponent indicator */}
            {iAnsweredCurrent && !theyAnsweredCurrent && (
              <div className="text-center py-4 animate-pulse">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/10 text-amber-400 font-bold text-xs border border-amber-500/20">
                  <Clock className="w-4 h-4 animate-spin" style={{ animationDuration: '2s' }} />
                  Waiting for {theirName} to answer...
                </div>
              </div>
            )}

            {/* Timer display */}
            <div className="text-center">
              <span className={`text-sm font-black ${timerPercent > 50 ? 'text-slate-500' : timerPercent > 25 ? 'text-amber-400' : 'text-red-400 animate-pulse'}`}>
                {(timeLeft / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts info */}
      <div className="hidden md:flex items-center justify-center gap-4 py-3 border-t border-slate-800 text-[10px] text-slate-600 font-bold relative z-10">
        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">1</kbd>-<kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">4</kbd> to answer</span>
      </div>

      {/* Inline CSS for animations */}
      <style jsx>{`
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(24px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
