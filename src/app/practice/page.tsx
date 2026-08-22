'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useHeader } from '@/context/HeaderContext';
import { HindiTranslateButton } from '@/components/common/HindiTranslateButton';
import { QuestionDiagram } from '@/components/ui/QuestionDiagram';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  RefreshCw,
  BookOpen,
  ChevronRight,
  Folder,
  Layers,
  ArrowLeft,
  FileText,
  Clock,
  Zap,
  Brain,
  ShieldCheck,
  ChevronLeft,
  ChevronDown,
  PlayCircle,
  Calendar,
  RotateCcw,
} from 'lucide-react';

import { getSwrCache, setSwrCache } from '@/lib/swrCache';
import {
  cleanQuestionText,
  normalizeQuestionSignature,
  deduplicateQuestions,
} from '@/lib/questionDeduplicator';

const calculateWeeklyCountdown = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const diff = Math.max(0, nextMonday.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds };
};

const WeeklyCountdownBadge: React.FC = React.memo(() => {
  const [countdown, setCountdown] = useState(calculateWeeklyCountdown);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calculateWeeklyCountdown());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 flex items-center gap-1">
      <Clock className="w-3 h-3 text-amber-600" />
      Next Reshuffle: {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
    </span>
  );
});

export default function PracticeSetsPage() {
  const initialCache = getSwrCache<any>('practice_cache');
  const [questions, setQuestions] = useState<any[]>(initialCache?.questions || []);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>(initialCache?.topicCounts || {});
  const [courseName, setCourseName] = useState<string>(initialCache?.courseName || '');
  const [courseSubjects, setCourseSubjects] = useState<string[]>(initialCache?.courseSubjects || []);
  const [completedTopics, setCompletedTopics] = useState<string[]>(initialCache?.completedTopics || []);
  const [publishedWeeklyDpp, setPublishedWeeklyDpp] = useState<any | null>(initialCache?.publishedWeeklyDpp || null);
  const [userAttempts, setUserAttempts] = useState<any[]>(initialCache?.userAttempts || []);
  const [loading, setLoading] = useState(!initialCache);

  // Hierarchy Navigation State
  const [currentLevel, setCurrentLevel] = useState<'subjects' | 'topics' | 'questions'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'all'>('hierarchy');
  const [isWeeklySession, setIsWeeklySession] = useState(false);

  // Mode Selection Modal State
  const [showModeModal, setShowModeModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'practice' | 'quiz'>('practice');

  // Active Mock-Test Style Session State
  const [activeSession, setActiveSession] = useState<'practice' | 'quiz' | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number | null>>({});
  const [userTextAnswers, setUserTextAnswers] = useState<Record<string, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});
  const [openDetailedExplanation, setOpenDetailedExplanation] = useState<Record<string, boolean>>({});
  const [questionTimers, setQuestionTimers] = useState<Record<string, number>>({});

  // Timer State (Stopwatch for Practice, Countdown for Quiz)
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Submission Result & Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sessionQuestions, setSessionQuestions] = useState<any[]>([]);

  // Hindi Translation State (per question, keyed by question _id)
  const [hindiTranslations, setHindiTranslations] = useState<Record<string, { question: string; options: string[] } | null>>({});

  const handleTranslated = useCallback((qId: string, texts: string[]) => {
    setHindiTranslations((prev) => ({
      ...prev,
      [qId]: { question: texts[0] || '', options: texts.slice(1) },
    }));
  }, []);

  const handleResetTranslation = useCallback((qId: string) => {
    setHindiTranslations((prev) => ({ ...prev, [qId]: null }));
  }, []);

  const fetchQuestions = async () => {
    if (!initialCache) {
      setLoading(true);
    }
    try {
      const [res, dppRes] = await Promise.all([
        fetch('/api/practice', { cache: 'no-store' }),
        fetch('/api/weekly-dpp', { cache: 'no-store' }),
      ]);
      const data = await res.json();
      const dppData = await dppRes.json();

      const newWeeklyDpp = dppData.weeklyDpps && dppData.weeklyDpps.length > 0 ? dppData.weeklyDpps[0] : null;

      const cacheObj = {
        questions: data.questions || [],
        topicCounts: data.topicCounts || {},
        courseName: data.courseName || '',
        courseSubjects: data.courseSubjects || [],
        completedTopics: data.completedTopics || [],
        userAttempts: data.userAttempts || [],
        publishedWeeklyDpp: newWeeklyDpp,
      };

      setSwrCache('practice_cache', cacheObj);

      const dedupedQuestions = deduplicateQuestions(data.questions || []);
      setQuestions(dedupedQuestions);
      setTopicCounts(data.topicCounts || {});
      if (data.completedTopics) setCompletedTopics(data.completedTopics);
      if (data.userAttempts) setUserAttempts(data.userAttempts);
      if (data.courseName) setCourseName(data.courseName);
      if (data.courseSubjects && data.courseSubjects.length > 0) {
        setCourseSubjects(data.courseSubjects);
      }
      setPublishedWeeklyDpp(newWeeklyDpp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Timer Effect (Global Session Timer + Per-Question Timer for Practice Mode)
  useEffect(() => {
    if (!activeSession || submittedResult) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (activeSession === 'quiz') {
          if (prev <= 1) {
            clearInterval(interval);
            handleFinalSubmit('auto');
            return 0;
          }
          return prev - 1;
        } else {
          return prev + 1; // Practice Mode forward total stopwatch
        }
      });

      const activeQ = sessionQuestions[currentIdx];
      if (activeSession === 'practice' && activeQ?._id) {
        const qId = activeQ._id;
        if (!checkedQuestions[qId]) {
          setQuestionTimers((prev) => ({
            ...prev,
            [qId]: (prev[qId] || 0) + 1,
          }));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, submittedResult, currentIdx, sessionQuestions, checkedQuestions]);

  // Signal to MobileBottomNav to hide itself during active sessions
  useEffect(() => {
    if (activeSession && !submittedResult) {
      document.body.setAttribute('data-in-session', 'true');
    } else {
      document.body.removeAttribute('data-in-session');
    }
    return () => document.body.removeAttribute('data-in-session');
  }, [activeSession, submittedResult]);

  // Live Countdown Timer to Next Reshuffle (Every Monday 00:00:00)
  const { setOnBack, setHideNav } = useHeader();

  useEffect(() => {
    setHideNav(Boolean(activeSession));
    setOnBack(currentLevel !== 'subjects' || Boolean(activeSession) ? handleHeaderBack : undefined);

    return () => {
      setHideNav(false);
      setOnBack(undefined);
    };
  }, [activeSession, currentLevel, submittedResult]);

  // Weekly Shuffling Helpers
  const getWeekNumber = () => {
    const d = new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const getWeekNumberForDate = (date: Date) => {
    const d = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  };

  const isWeeklyAttemptedThisWeek = useMemo(() => {
    const currentWeek = getWeekNumber();
    const currentYear = new Date().getFullYear();

    return userAttempts.some((att) => {
      const isWeeklyType = att.type === 'weekly' || (att.topic_tag || '').toLowerCase().includes('weekly') || (att.topic_tag || '').toLowerCase().includes('revision test');
      if (!isWeeklyType) return false;
      const attDate = new Date(att.created_at || att.started_at || Date.now());
      return getWeekNumberForDate(attDate) === currentWeek && attDate.getFullYear() === currentYear;
    });
  }, [userAttempts]);

  const getCurrentWeekLabel = () => {
    const d = new Date();
    return `Week ${getWeekNumber()}, ${d.getFullYear()}`;
  };

  const shuffleArrayWithSeed = (array: any[], seed: number) => {
    const arr = [...array];
    let m = arr.length, t, i;
    let currentSeed = seed;
    while (m) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      i = Math.floor((currentSeed / 233280) * m--);
      t = arr[m];
      arr[m] = arr[i];
      arr[i] = t;
    }
    return arr;
  };

  const getWeeklyQuestions = useCallback(() => {
    if (publishedWeeklyDpp) {
      if (Array.isArray(publishedWeeklyDpp.questions) && publishedWeeklyDpp.questions.length > 0) {
        const validObjects = publishedWeeklyDpp.questions.filter(
          (q: any) => typeof q === 'object' && q !== null && Boolean(q.question_text)
        );
        if (validObjects.length > 0) return validObjects;
      }
      if (publishedWeeklyDpp.question_ids && publishedWeeklyDpp.question_ids.length > 0) {
        const qList = questions.filter((q) =>
          publishedWeeklyDpp.question_ids.some((id: any) => String(id?._id || id) === String(q._id))
        );
        if (qList.length > 0) return qList;
      }
    }
    // Dynamic Weekly DPP from Course Question Bank
    return questions;
  }, [publishedWeeklyDpp, questions]);

  // Weekly DPP Smart Shuffling Algorithm (Weekly Monday Reshuffle)
  // 1. Shuffles from questions belonging to the enrolled course.
  // 2. Priority Order:
  //    a) Questions student got WRONG previously (repeat continuously until student solves it correctly)
  //    b) Questions student has NOT attempted yet (fresh questions from the course bank)
  //    c) Questions student got CORRECT (only if needed to fill up to 10)
  // 3. Seeded by (weekNumber + year * 100) so questions stay fixed Mon 00:00 to Sun 23:59:59
  // 4. Automatically reshuffles every Monday at 00:00:00 when week number changes!
  const getCourseWeeklyDPPSet = (candidateQs: any[], seed: number): any[] => {
    if (!candidateQs || candidateQs.length === 0) return [];

    const uniqueCandidates = deduplicateQuestions(candidateQs);
    if (uniqueCandidates.length === 0) return [];

    const sortedAttempts = [...userAttempts].sort(
      (a, b) => new Date(a.created_at || a.started_at || 0).getTime() - new Date(b.created_at || b.started_at || 0).getTime()
    );

    const idAttemptMap: Record<string, boolean> = {};
    const sigAttemptMap: Record<string, boolean> = {};

    sortedAttempts.forEach((att) => {
      if (Array.isArray(att.responses)) {
        att.responses.forEach((resp: any) => {
          if (resp.question_id) {
            const qId = String(resp.question_id);
            const isCorrect = Boolean(resp.is_correct);
            idAttemptMap[qId] = isCorrect;

            const matchedQ = questions.find((q) => String(q._id || q.id) === qId);
            if (matchedQ?.question_text) {
              const sig = normalizeQuestionSignature(cleanQuestionText(matchedQ.question_text));
              if (sig) sigAttemptMap[sig] = isCorrect;
            }
          }
        });
      }
    });

    const getQuestionStatus = (q: any): 'wrong' | 'unattempted' | 'correct' => {
      const qId = String(q?._id || q?.id || '');
      const sig = normalizeQuestionSignature(cleanQuestionText(q?.question_text || ''));

      if (qId && idAttemptMap[qId] !== undefined) {
        return idAttemptMap[qId] ? 'correct' : 'wrong';
      }
      if (sig && sigAttemptMap[sig] !== undefined) {
        return sigAttemptMap[sig] ? 'correct' : 'wrong';
      }
      return 'unattempted';
    };

    const wrongQs = uniqueCandidates.filter((q) => getQuestionStatus(q) === 'wrong');
    const unattemptedQs = uniqueCandidates.filter((q) => getQuestionStatus(q) === 'unattempted');
    const correctQs = uniqueCandidates.filter((q) => getQuestionStatus(q) === 'correct');

    const seededShuffle = (arr: any[], customSeed: number) => {
      const copy = [...arr];
      let m = copy.length, t, i;
      let s = customSeed;
      while (m) {
        s = (s * 9301 + 49297) % 233280;
        i = Math.floor((s / 233280) * m--);
        t = copy[m];
        copy[m] = copy[i];
        copy[i] = t;
      }
      return copy;
    };

    // Priority 1: Wrong questions repeat continuously until mastered
    const selectedWrong = seededShuffle(wrongQs, seed);

    // Priority 2: Fresh unattempted questions
    const remainingNeeded = Math.max(0, 10 - selectedWrong.length);
    const selectedUnattempted = seededShuffle(unattemptedQs, seed + 100).slice(0, remainingNeeded);

    // Priority 3: Correct questions only if needed to fill up to 10
    const stillNeeded = Math.max(0, 10 - (selectedWrong.length + selectedUnattempted.length));
    const selectedCorrect = stillNeeded > 0 ? seededShuffle(correctQs, seed + 200).slice(0, stillNeeded) : [];

    const orderedPool = [
      ...selectedWrong,
      ...selectedUnattempted,
      ...selectedCorrect,
    ];

    return deduplicateQuestions(orderedPool).slice(0, 10);
  };

  const hasCourseWeeklyDpp = useMemo(() => {
    const rawWeeklyQs = getWeeklyQuestions();
    return rawWeeklyQs.length > 0;
  }, [getWeeklyQuestions]);

  const weeklySmartSet = useMemo(() => {
    const rawWeeklyQs = getWeeklyQuestions();
    if (!rawWeeklyQs || rawWeeklyQs.length === 0) return [];
    const seed = getWeekNumber() + new Date().getFullYear() * 100;
    return getCourseWeeklyDPPSet(rawWeeklyQs, seed);
  }, [getWeeklyQuestions, userAttempts, questions]);

  // Smart 10-Question Selection Algorithm for Daily Practice Sets
  // Rules:
  // 1. Max 10 questions per set
  // 2. No question repeats within a set (strict deduplication by ID and text)
  // 3. Questions that the student got CORRECT do NOT repeat unless all questions in the topic have been completed
  // 4. Questions that the student got WRONG repeat first until the student solves them correctly
  const getSmartPracticeSet = (rawCandidateQs: any[]): any[] => {
    if (!rawCandidateQs || rawCandidateQs.length === 0) return [];

    // 1. Deduplicate candidate questions
    const uniqueCandidates = deduplicateQuestions(rawCandidateQs);
    if (uniqueCandidates.length === 0) return [];

    // 2. Build attempt history map
    const sortedAttempts = [...userAttempts].sort(
      (a, b) => new Date(a.created_at || a.started_at || 0).getTime() - new Date(b.created_at || b.started_at || 0).getTime()
    );

    const idAttemptMap: Record<string, boolean> = {};
    const sigAttemptMap: Record<string, boolean> = {};

    sortedAttempts.forEach((att) => {
      if (Array.isArray(att.responses)) {
        att.responses.forEach((resp: any) => {
          if (resp.question_id) {
            const qId = String(resp.question_id);
            const isCorrect = Boolean(resp.is_correct);
            idAttemptMap[qId] = isCorrect;

            const matchedQ = questions.find((q) => String(q._id || q.id) === qId);
            if (matchedQ?.question_text) {
              const sig = normalizeQuestionSignature(cleanQuestionText(matchedQ.question_text));
              if (sig) sigAttemptMap[sig] = isCorrect;
            }
          }
        });
      }
    });

    const getQuestionStatus = (q: any): 'wrong' | 'unattempted' | 'correct' => {
      const qId = String(q?._id || q?.id || '');
      const sig = normalizeQuestionSignature(cleanQuestionText(q?.question_text || ''));

      if (qId && idAttemptMap[qId] !== undefined) {
        return idAttemptMap[qId] ? 'correct' : 'wrong';
      }
      if (sig && sigAttemptMap[sig] !== undefined) {
        return sigAttemptMap[sig] ? 'correct' : 'wrong';
      }
      return 'unattempted';
    };

    const wrongQs = uniqueCandidates.filter((q) => getQuestionStatus(q) === 'wrong');
    const unattemptedQs = uniqueCandidates.filter((q) => getQuestionStatus(q) === 'unattempted');
    const correctQs = uniqueCandidates.filter((q) => getQuestionStatus(q) === 'correct');

    const randomShuffle = (arr: any[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    // Priority 1: Wrongly answered questions repeat so student can master them
    const selectedWrong = randomShuffle(wrongQs);

    // Priority 2: Fresh unattempted questions from the topic
    const remainingNeededFor10 = Math.max(0, 10 - selectedWrong.length);
    const selectedUnattempted = randomShuffle(unattemptedQs).slice(0, remainingNeededFor10);

    // Priority 3: Only if (wrong + unattempted) < 10, fill remaining slots with previously correct questions
    const stillNeeded = Math.max(0, 10 - (selectedWrong.length + selectedUnattempted.length));
    const selectedCorrect = stillNeeded > 0 ? randomShuffle(correctQs).slice(0, stillNeeded) : [];

    const orderedPool = [
      ...selectedWrong,
      ...selectedUnattempted,
      ...selectedCorrect,
    ];

    return deduplicateQuestions(orderedPool).slice(0, 10);
  };

  const handleOpenWeeklyChallenge = () => {
    const rawWeeklyQs = getWeeklyQuestions();
    if (rawWeeklyQs.length === 0) {
      alert('Weekly DPP for your course track is coming soon. Please check back shortly!');
      return;
    }

    // Deterministically shuffle with seed = weekNumber + year * 100 (never reshuffles until next Monday at 00:00)
    const seed = getWeekNumber() + new Date().getFullYear() * 100;
    const smartWeeklySet = getCourseWeeklyDPPSet(rawWeeklyQs, seed);
    setSessionQuestions(smartWeeklySet);

    const testTitle = publishedWeeklyDpp?.title || `${getCurrentWeekLabel()} - Weekly DPP Paper`;
    const testDurationSecs = publishedWeeklyDpp?.duration_minutes
      ? publishedWeeklyDpp.duration_minutes * 60
      : Math.max(300, smartWeeklySet.length * 60);

    setIsWeeklySession(true);
    setSelectedSubject('Weekly DPP');
    setSelectedTopic(testTitle);
    setSelectedMode('quiz');
    setShowModeModal(false);
    setActiveSession('quiz');
    setCurrentLevel('questions');
    setCurrentIdx(0);
    setUserAnswers({});
    setCheckedQuestions({});
    setSubmittedResult(null);

    setTimerSeconds(testDurationSecs);
  };

  const handleOpenTopic = (tName: string) => {
    setIsWeeklySession(false);
    setSelectedTopic(tName);
    setShowModeModal(true);
  };

  const handleStartSession = (mode: 'practice' | 'quiz') => {
    setSelectedMode(mode);
    setShowModeModal(false);

    let smartSet: any[] = [];
    if (isWeeklySession) {
      const rawWeeklyQs = getWeeklyQuestions();
      const seed = getWeekNumber() + new Date().getFullYear() * 100;
      smartSet = getCourseWeeklyDPPSet(rawWeeklyQs, seed);
    } else {
      let rawList: any[] = [];
      if (selectedTopic && topicModulesMap[selectedTopic] && topicModulesMap[selectedTopic].length > 0) {
        rawList = topicModulesMap[selectedTopic];
      } else if (selectedTopic) {
        rawList = questions.filter((q) => (q.topic_tag || '').toLowerCase().includes(selectedTopic.toLowerCase()));
      } else if (selectedSubject) {
        rawList = activeSubjectQuestions;
      } else {
        rawList = questions;
      }
      smartSet = getSmartPracticeSet(rawList);
    }

    setSessionQuestions(smartSet);

    setActiveSession(mode);
    setCurrentLevel('questions');
    setCurrentIdx(0);
    setUserAnswers({});
    setCheckedQuestions({});
    setQuestionTimers({});
    setSubmittedResult(null);

    if (mode === 'quiz') {
      const totalSecs = publishedWeeklyDpp?.duration_minutes && isWeeklySession
        ? publishedWeeklyDpp.duration_minutes * 60
        : Math.max(300, smartSet.length * 60);
      setTimerSeconds(totalSecs);
    } else {
      setTimerSeconds(0);
    }
  };

  const handleSelectOption = (qId: string, optIdx: number) => {
    if (submittedResult) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleCheckSingleQuestion = (qId: string) => {
    if (userAnswers[qId] === undefined || userAnswers[qId] === null) return;
    setCheckedQuestions((prev) => ({ ...prev, [qId]: true }));
  };

  const handleFinalSubmit = async (submissionType: 'manual' | 'auto' = 'manual') => {
    const answersArray = Object.entries(userAnswers)
      .filter(([_, opt]) => opt !== null)
      .map(([qId, optIdx]) => ({
        questionId: qId,
        selectedOption: optIdx,
      }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersArray,
          topicTag: selectedTopic ? `${selectedSubject} - ${selectedTopic}` : selectedSubject || 'All Topics',
          type: isWeeklySession ? 'weekly' : 'practice',
          timeSpentSeconds: timerSeconds,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmittedResult({
          ...data,
          totalQuestions: data.totalQuestions || filteredQuestions.length,
          mode: activeSession,
          timeSpent: timerSeconds,
        });
        setShowConfirmModal(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('xpUpdated'));
        }
        fetchQuestions();
      } else {
        alert(data.error || 'Submission failed. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error submitting test: ' + (err?.message || 'Network error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Protect active session from accidental page unload
  useEffect(() => {
    if (!activeSession || submittedResult) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active test session in progress. Leaving will discard all your answers.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeSession, submittedResult]);

  const handleResetSession = () => {
    setIsWeeklySession(false);
    setActiveSession(null);
    setSessionQuestions([]);
    setUserAnswers({});
    setCheckedQuestions({});
    setSubmittedResult(null);
    setCurrentLevel('topics');
    fetchQuestions();
  };

  const handleHeaderBack = () => {
    if (activeSession && !submittedResult) {
      setShowLeaveModal(true);
    } else if (activeSession) {
      handleResetSession();
    } else if (currentLevel === 'questions') {
      setCurrentLevel('topics');
      setSelectedTopic('');
    } else if (currentLevel === 'topics') {
      setCurrentLevel('subjects');
      setSelectedSubject('');
    }
  };

  const isGkGsName = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;
    const s = str.toLowerCase().trim();
    return (
      s === 'gk/gs' ||
      s === 'gk / gs' ||
      s === 'gk-gs' ||
      s === 'gk gs' ||
      s === 'gk' ||
      s === 'gs' ||
      s.includes('general knowledge') ||
      s.includes('general studies') ||
      s.includes('general awareness')
    );
  };

  const doesQuestionMatchSubject = (q: any, targetSubject: string, allSubjects: string[]): boolean => {
    if (!q || !targetSubject) return false;

    const sLower = targetSubject.toLowerCase().trim();
    const qSub = (q.subject || '').toString().trim();
    const qSubLower = qSub.toLowerCase();
    const tag = (q.topic_tag || '').toString().trim();
    const tagLower = tag.toLowerCase();

    // 0. Direct match on q.subject field
    if (qSubLower && !/^\d+$/.test(qSubLower)) {
      if (qSubLower === sLower) return true;
    }

    // 1. Exact Subject prefix in topic_tag (format: "Subject - Topic", "Subject — Topic", "Subject: Topic")
    if (tagLower) {
      if (tagLower === sLower) return true;
      if (tagLower.startsWith(sLower + ' -') || tagLower.startsWith(sLower + ' —') || tagLower.startsWith(sLower + ':') || tagLower.startsWith(sLower + '.')) return true;
      const firstPart = tagLower.split(/[\-\—\:\.]/)[0].trim();
      if (firstPart === sLower) return true;
    }

    // 2. GK / GS check (only for courses with GK/GS subjects)
    const isGkGsTarget = isGkGsName(sLower);
    if (isGkGsTarget) {
      const gkKeywords = [
        'general knowledge', 'environment', 'general science', 'indian economy',
        'world geography', 'indian geography', 'indian history', 'indian polity',
        'history', 'geography', 'polity', 'economy', 'economics', 'ecology',
        'static gk', 'constitution', 'civics', 'ancient india', 'medieval india',
        'modern india', 'freedom movement', 'gk', 'gs'
      ];
      if (gkKeywords.some((k) => tagLower.startsWith(k) || qSubLower === k)) return true;
    }

    // 3. Generic "Science" fallback ONLY when course does not have separate Physics/Chemistry/Biology subjects
    const isSingleScienceSubject = sLower === 'science' && !allSubjects.some((s) => ['physics', 'chemistry', 'biology'].includes(s.toLowerCase()));
    if (isSingleScienceSubject) {
      const scienceKeywords = ['science', 'physics', 'chemistry', 'biology', 'botany', 'zoology'];
      if (scienceKeywords.some((k) => tagLower.startsWith(k) || qSubLower === k)) return true;
    }

    return false;
  };

  // Derive Subject & Topic questions
  const subjectQuestionMap: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    courseSubjects.forEach((s) => {
      map[s] = deduplicateQuestions(questions.filter((q) => doesQuestionMatchSubject(q, s, courseSubjects)));
    });
    return map;
  }, [courseSubjects, questions]);

  const activeSubjectQuestions = useMemo(() => {
    if (!selectedSubject) return [];
    return deduplicateQuestions(questions.filter((q) => doesQuestionMatchSubject(q, selectedSubject, courseSubjects)));
  }, [selectedSubject, courseSubjects, questions]);

  const getCleanTopicTitle = (rawTopicTag: string, currentSubject: string): string => {
    if (!rawTopicTag || typeof rawTopicTag !== 'string') return 'General Practice Set';

    let tag = rawTopicTag.trim();

    // Check GK/GS canonical module names
    const isCurrentGkGs = /^(?:gk\/?gs|gk|gs|general\s*(?:knowledge|studies|awareness))/i.test(currentSubject || '');
    if (isCurrentGkGs) {
      const cleanGkTag = tag.replace(/^(?:gk\/?gs|gk|gs|general\s*studies)\s*[\-\:\.]\s*/i, '').trim();
      const gkModules = [
        { match: /^(?:general\s*knowledge|static\s*gk|gk)/i, name: 'General Knowledge' },
        { match: /^(?:environment(?:al\s*(?:studies|science))?|ecology)/i, name: 'Environment' },
        { match: /^(?:general\s*science|science)/i, name: 'General Science' },
        { match: /^(?:indian\s*economy|economy|economics)/i, name: 'Indian Economy' },
        { match: /^(?:world\s*geography)/i, name: 'World Geography' },
        { match: /^(?:indian\s*geography|geography)/i, name: 'Indian Geography' },
        { match: /^(?:indian\s*history|ancient\s*india|medieval\s*india|modern\s*india|freedom\s*movement|history)/i, name: 'Indian History' },
        { match: /^(?:indian\s*polity|polity|constitution|civics)/i, name: 'Indian Polity' },
      ];
      for (const mod of gkModules) {
        if (mod.match.test(cleanGkTag) || mod.match.test(cleanGkTag.split('-')[0].trim())) {
          return mod.name;
        }
      }
    }

    // 1. Remove subject prefix if present (e.g. "Physics - Kinematics" -> "Kinematics", "Chemistry - Thermodynamics" -> "Thermodynamics")
    const knownSubjectPrefixes = ['chemistry', 'physics', 'mathematics', 'math', 'arithmatics', 'arithmetic', 'advance arithmatic', 'reasoning', 'current affairs', 'current affirs', 'biology', 'science', 'social studies'];
    for (const subPrefix of knownSubjectPrefixes) {
      if (tag.toLowerCase().startsWith(subPrefix)) {
        const remaining = tag.slice(subPrefix.length).trim();
        if (remaining.startsWith('-') || remaining.startsWith(':') || remaining.startsWith('.')) {
          tag = remaining.slice(1).trim();
          break;
        }
      }
    }
    if (currentSubject && tag.toLowerCase().startsWith(currentSubject.toLowerCase())) {
      const remaining = tag.slice(currentSubject.length).trim();
      if (remaining.startsWith('-') || remaining.startsWith(':') || remaining.startsWith('.')) {
        tag = remaining.slice(1).trim();
      }
    }

    // 2. Strip leading question numbers/prefixes (e.g. "80 - Environmental Chemistry" -> "Environmental Chemistry", "Q1. Kinematics" -> "Kinematics", "1 - Vectors" -> "Vectors")
    tag = tag.replace(/^(?:q(?:uestion)?[\s\.\:]*)?\d+[\s\.\:\-]+\s*/i, '').trim();

    // 3. Strip any residual leading hyphens/colons
    tag = tag.replace(/^[\-\:]+\s*/, '').trim();

    // 4. If tag is empty or purely numeric (e.g. "80" or "1"), fallback to General Practice Set
    if (!tag || /^\d+$/.test(tag)) {
      return 'General Practice Set';
    }

    return tag.charAt(0).toUpperCase() + tag.slice(1);
  };

  const getNormalizedOptions = (q: any): string[] => {
    if (!q) return [];
    const isMcq = !q.question_type || q.question_type === 'MCQ';
    let opts = Array.isArray(q.options)
      ? q.options.map((o: any) => String(o || '').trim()).filter(Boolean)
      : [];

    if (isMcq || opts.length > 0) {
      if (opts.length === 0) {
        opts = ['Option A', 'Option B', 'Option C', 'Option D'];
      } else if (opts.length === 1) {
        opts.push('Option B', 'Option C', 'Option D');
      } else if (opts.length === 2) {
        opts.push('Option C', 'Option D');
      } else if (opts.length === 3) {
        opts.push('Option D');
      } else if (opts.length > 4) {
        opts = opts.slice(0, 4);
      }
    }
    return opts;
  };

  const topicModulesMap: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {};
    activeSubjectQuestions.forEach((q) => {
      const tName = getCleanTopicTitle(q.topic_tag || q.topic, selectedSubject);
      if (!map[tName]) map[tName] = [];
      map[tName].push(q);
    });
    Object.keys(map).forEach((k) => {
      map[k] = deduplicateQuestions(map[k]);
    });
    return map;
  }, [activeSubjectQuestions, selectedSubject]);

  const filteredQuestions = useMemo(() => {
    const list = activeSession && sessionQuestions.length > 0
      ? sessionQuestions
      : isWeeklySession
      ? getWeeklyQuestions()
      : selectedTopic && topicModulesMap[selectedTopic]
      ? topicModulesMap[selectedTopic]
      : selectedTopic
      ? activeSubjectQuestions.filter((q) => (q.topic_tag || '').toLowerCase().includes(selectedTopic.toLowerCase()))
      : selectedSubject
      ? activeSubjectQuestions
      : questions;
    return deduplicateQuestions(list);
  }, [activeSession, sessionQuestions, isWeeklySession, getWeeklyQuestions, selectedTopic, topicModulesMap, activeSubjectQuestions, questions]);

  const currentQ = filteredQuestions[currentIdx];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 animate-page-in pb-24 lg:pb-0">
          {/* Header Title Bar (when not in active session) */}
          {!activeSession && (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Subject & Topic Daily Practice Papers
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Practice question sets categorized by Subject and Topic modules for {courseName}. Earn +27 XP per correct answer!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 flex items-center gap-1.5 shadow-xs">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Subject Hierarchy
                </span>
              </div>
            </div>
          )}

          {/* ACTIVE MOCK TEST STYLE SESSION VIEW */}
          {activeSession && currentQ && (
            <div className="space-y-6">
              {/* Session Top Header Sub-Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {selectedSubject || 'General'} ➔ {selectedTopic || 'Practice Set'}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Mode: {activeSession === 'quiz' ? 'Quiz Assessment (Timed)' : 'Self-Paced Practice'}
                  </span>
                </div>

                {/* Timer Badge */}
                {!submittedResult && (
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-1.5 rounded-xl text-slate-900 dark:text-slate-100">
                    <Clock className={`w-4 h-4 ${activeSession === 'quiz' ? 'text-amber-500 animate-pulse' : 'text-blue-500'}`} />
                    <span className="font-mono text-sm font-bold">{formatTime(timerSeconds)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {activeSession === 'quiz' ? 'Remaining' : 'Elapsed'}
                    </span>
                  </div>
                )}

                {!submittedResult && (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    type="button"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                  >
                    {activeSession === 'quiz' ? 'Submit Quiz' : 'Finish Practice Set'}
                  </button>
                )}
              </div>

              {/* Result Screen or Active Question Interface */}
              {submittedResult ? (
                /* Performance Summary Screen */
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
                      <Award className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {activeSession === 'quiz' ? 'Quiz Completed!' : 'Practice Set Finished!'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {selectedSubject} • {selectedTopic || 'Practice Set'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Correct Answers</span>
                        <span className="text-2xl font-black text-emerald-600">
                          {submittedResult.correctCount} / {submittedResult.totalQuestions}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Accuracy</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {submittedResult.accuracyPercent}%
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Time Taken</span>
                        <span className="text-2xl font-black text-brand-800 dark:text-brand-300">
                          {formatTime(submittedResult.timeSpent || timerSeconds)}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">XP Earned</span>
                        <span className="text-2xl font-black text-emerald-500">+{submittedResult.xpEarned} XP</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleResetSession}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl"
                      >
                        Back to Topic Modules
                      </button>
                      <button
                        onClick={() => handleStartSession(activeSession)}
                        className="flex-1 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs rounded-xl"
                      >
                        Retry Session
                      </button>
                    </div>
                  </div>

                  {/* Solution Breakdown */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Question Solutions</h3>
                    {filteredQuestions.map((q: any, idx: number) => {
                      const userChoice = userAnswers[q._id];
                      return (
                        <div key={q._id} className="border-b border-slate-200 dark:border-slate-800 pb-4 last:border-0 space-y-3">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Q{idx + 1}. {q.question_text}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isCorrectKey = optIdx === q.correct_option;
                              const isUserSelection = userChoice === optIdx;

                              let style = 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                              if (isCorrectKey) {
                                style = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300';
                              } else if (isUserSelection && !isCorrectKey) {
                                style = 'bg-rose-50 border-rose-400 text-rose-900 font-bold dark:bg-rose-950 dark:border-rose-700 dark:text-rose-300';
                              }

                              return (
                                <div key={optIdx} className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${style}`}>
                                  <span>
                                    <strong className="mr-1">{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                                  </span>
                                  {isCorrectKey && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                  {isUserSelection && !isCorrectKey && <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                          {(q.explanation || q.detailed_explanation) && (
                            <div className="text-[11px] text-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-2">
                              <p>
                                <strong>Normal Explanation:</strong> {q.explanation || 'Refer to textbook model answer.'}
                              </p>
                              {q.detailed_explanation && (
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenDetailedExplanation((prev) => ({
                                        ...prev,
                                        [q._id]: !prev[q._id],
                                      }))
                                    }
                                    className="text-xs font-bold text-brand-800 dark:text-blue-400 flex items-center justify-between w-full hover:underline"
                                  >
                                    <span>📘 View Detailed Step-by-Step Explanation</span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform duration-300 ${
                                        openDetailedExplanation[q._id] ? 'rotate-180' : 'rotate-0'
                                      }`}
                                    />
                                  </button>
                                  <div
                                    className={`grid transition-all duration-300 ease-in-out ${
                                      openDetailedExplanation[q._id]
                                        ? 'grid-rows-[1fr] opacity-100 mt-2'
                                        : 'grid-rows-[0fr] opacity-0 mt-0 overflow-hidden'
                                    }`}
                                  >
                                    <div className="overflow-hidden">
                                      <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] whitespace-pre-line pt-1">
                                        {q.detailed_explanation}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Active Question & Palette Grid */
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Active Question Box */}
                  <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[420px] max-h-[calc(100vh-220px)] overflow-y-auto">
                    <div>
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">
                            Question {currentIdx + 1} of {filteredQuestions.length}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            currentQ.question_type === 'Long Answer'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                              : currentQ.question_type === 'Short Answer'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                          }`}>
                            {currentQ.question_type === 'Long Answer' ? '📄 Long Answer' : currentQ.question_type === 'Short Answer' ? '📝 Short Answer' : '🔘 MCQ'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-extrabold text-[10px]">
                            {currentQ.marks || (currentQ.question_type === 'Long Answer' ? 5 : currentQ.question_type === 'Short Answer' ? 2 : 1)} Mark(s)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeSession === 'practice' && (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
                                checkedQuestions[currentQ._id]
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                              }`}
                              title={checkedQuestions[currentQ._id] ? 'Question Timer Stopped (Submitted)' : 'Question Timer Running'}
                            >
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              {formatTime(questionTimers[currentQ._id] || 0)}
                              {checkedQuestions[currentQ._id] && (
                                <span className="text-[9px] px-1 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 rounded uppercase font-black">
                                  Stopped
                                </span>
                              )}
                            </span>
                          )}

                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {selectedTopic || selectedSubject}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-3 mb-4">
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-relaxed flex-1">
                          {hindiTranslations[currentQ._id]?.question ?? cleanQuestionText(currentQ.question_text)}
                        </h2>
                        <HindiTranslateButton
                          texts={[cleanQuestionText(currentQ.question_text), ...getNormalizedOptions(currentQ)]}
                          isTranslated={!!hindiTranslations[currentQ._id]}
                          onTranslated={(translated) => handleTranslated(currentQ._id, translated)}
                          onReset={() => handleResetTranslation(currentQ._id)}
                        />
                      </div>

                      <QuestionDiagram src={currentQ.image_url || (currentQ as any).image || (currentQ as any).question_image} />

                      {getNormalizedOptions(currentQ).length > 0 ? (
                        /* MCQ Options Grid */
                        <div className="space-y-3">
                          {getNormalizedOptions(currentQ).map((opt: string, optIdx: number) => {
                            const isSelected = userAnswers[currentQ._id] === optIdx;
                            const isChecked = activeSession === 'practice' && checkedQuestions[currentQ._id];
                            const isCorrect = optIdx === currentQ.correct_option;

                            let style = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300';

                            if (isChecked) {
                              if (isCorrect) {
                                style = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300';
                              } else if (isSelected && !isCorrect) {
                                style = 'bg-rose-50 border-rose-500 text-rose-950 font-bold dark:bg-rose-950 dark:border-rose-700 dark:text-rose-300';
                              }
                            } else if (isSelected) {
                              style = 'bg-brand-50 border-brand-800 text-brand-900 dark:bg-brand-950 dark:border-brand-500 dark:text-brand-300 font-bold shadow-xs';
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectOption(currentQ._id, optIdx)}
                                className={`w-full p-3.5 rounded-xl border text-xs text-left font-medium transition-all flex items-center justify-between gap-3 ${style}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-bold shrink-0 ${
                                      isSelected
                                        ? 'bg-brand-800 text-white'
                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{hindiTranslations[currentQ._id]?.options?.[optIdx] ?? opt}</span>
                                </div>

                                {isChecked && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {isChecked && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* Short / Long Answer Text Response Field */
                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Draft Your Response / Key Answer Steps:
                          </label>
                          <textarea
                            rows={currentQ.question_type === 'Long Answer' ? 6 : 3}
                            value={userTextAnswers[currentQ._id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUserTextAnswers((prev) => ({ ...prev, [currentQ._id]: val }));
                              // Mark as answered
                              if (val.trim()) {
                                setUserAnswers((prev) => ({ ...prev, [currentQ._id]: 1 }));
                              }
                            }}
                            placeholder="Write your answer, key steps, or formulas here..."
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Solution / Model Answer Reveal */}
                      {activeSession === 'practice' && checkedQuestions[currentQ._id] && (
                        <div className="mt-5 p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-3 text-xs shadow-xs">
                          <div>
                            <span className="font-extrabold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Solution & Normal Explanation
                            </span>
                            <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed whitespace-pre-line font-medium text-xs">
                              {currentQ.explanation || currentQ.sample_answer || (currentQ.correct_option !== undefined ? `Correct option is ${String.fromCharCode(65 + currentQ.correct_option)}.` : 'Refer to textbook model answer.')}
                            </p>
                          </div>

                          <div className="border-t border-emerald-200/80 dark:border-emerald-800/60 pt-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenDetailedExplanation((prev) => ({
                                  ...prev,
                                  [currentQ._id]: !prev[currentQ._id],
                                }))
                              }
                              className="w-full py-2 px-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center justify-between transition-all duration-200 shadow-xs"
                            >
                              <span className="flex items-center gap-2 text-brand-800 dark:text-blue-400 font-extrabold">
                                <FileText className="w-4 h-4 text-brand-600 dark:text-blue-400" />
                                View Detailed Step-by-Step Explanation
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${
                                  openDetailedExplanation[currentQ._id] ? 'rotate-180' : 'rotate-0'
                                }`}
                              />
                            </button>

                            <div
                              className={`grid transition-all duration-300 ease-in-out ${
                                openDetailedExplanation[currentQ._id]
                                  ? 'grid-rows-[1fr] opacity-100 mt-2.5'
                                  : 'grid-rows-[0fr] opacity-0 mt-0 overflow-hidden'
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs">
                                  <span className="font-extrabold text-slate-900 dark:text-white block text-xs">
                                    📘 Detailed Step-by-Step Derivation & Solution:
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                                    {currentQ.detailed_explanation || currentQ.explanation || 'No extra detailed breakdown provided for this question.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                      {activeSession === 'practice' ? (
                        userAnswers[currentQ._id] !== undefined && userAnswers[currentQ._id] !== null ? (
                          <button
                            type="button"
                            onClick={() => handleCheckSingleQuestion(currentQ._id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {checkedQuestions[currentQ._id] ? 'Submitted (Click to Re-submit)' : 'Submit Question'}
                          </button>
                        ) : (
                          <div className="text-xs text-slate-400 font-medium italic">
                            Select an option above to submit this question.
                          </div>
                        )
                      ) : (
                        <div />
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={currentIdx === 0}
                          onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-lg disabled:opacity-40 flex items-center gap-1 text-slate-700 dark:text-slate-300"
                        >
                          <ChevronLeft className="w-4 h-4" /> Previous
                        </button>

                        <button
                          type="button"
                          disabled={currentIdx === filteredQuestions.length - 1}
                          onClick={() => setCurrentIdx((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                          className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-lg disabled:opacity-40 flex items-center gap-1 transition-colors"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Question Palette Sidebar */}
                  <div className="w-full md:w-64 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-2xl shrink-0 h-fit space-y-4 shadow-xs">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Question Palette
                    </h3>

                    <div className="grid grid-cols-5 gap-2">
                      {filteredQuestions.map((q: any, idx: number) => {
                        const isCurrent = idx === currentIdx;
                        const isAnswered = userAnswers[q._id] !== undefined && userAnswers[q._id] !== null;
                        const isChecked = activeSession === 'practice' && checkedQuestions[q._id];
                        const isCorrect = isChecked && userAnswers[q._id] === q.correct_option;

                        let color = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

                        if (isChecked) {
                          color = isCorrect
                            ? 'bg-emerald-500 text-white border-emerald-600 font-bold'
                            : 'bg-rose-500 text-white border-rose-600 font-bold';
                        } else if (isAnswered) {
                          color = 'bg-brand-800 text-white border-brand-900 font-bold';
                        }

                        return (
                          <button
                            key={q._id}
                            type="button"
                            onClick={() => setCurrentIdx(idx)}
                            className={`h-9 rounded-lg font-mono text-xs flex items-center justify-center border transition-all ${color} ${
                              isCurrent ? 'ring-2 ring-brand-800 ring-offset-2' : ''
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {!submittedResult && (
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="w-full mt-4 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" /> Finish & Submit Practice Set
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Session Safe Fallback */}
          {activeSession && !currentQ && (
            <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">No questions available for this paper yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active questions were found matching your current course track for this Weekly DPP paper.
              </p>
              <button
                type="button"
                onClick={handleResetSession}
                className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          {/* HIERARCHICAL MODE (when not in active session) */}
          {!activeSession && viewMode === 'hierarchy' && (
            <div className="space-y-6">
              {/* Breadcrumb Navigation Trail */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <button
                  onClick={() => {
                    setCurrentLevel('subjects');
                    setSelectedSubject('');
                    setSelectedTopic('');
                  }}
                  className={`hover:underline flex items-center gap-1.5 ${
                    currentLevel === 'subjects' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {courseName}
                </button>

                {selectedSubject && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <button
                      onClick={() => {
                        setCurrentLevel('topics');
                        setSelectedTopic('');
                      }}
                      className={`hover:underline flex items-center gap-1 ${
                        currentLevel === 'topics' ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''
                      }`}
                    >
                      <Folder className="w-4 h-4 text-slate-700 dark:text-slate-300" /> {selectedSubject}
                    </button>
                  </>
                )}

                {selectedTopic && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
                      <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" /> {selectedTopic}
                    </span>
                  </>
                )}
              </div>

              {/* LEVEL 1: SUBJECT WISE SELECTION */}
              {currentLevel === 'subjects' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Subject-wise Practice</h3>
                    <p className="text-xs text-slate-500">Select a subject to explore its specific topic practice modules.</p>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs animate-pulse space-y-4"
                        >
                          <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800" />
                          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                          <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
                          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : courseSubjects.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <BookOpen className="w-7 h-7 stroke-[1.5]" />
                      </div>
                      <div className="max-w-md mx-auto space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No practice questions available for this course yet</h4>
                        <p className="text-xs text-slate-400 font-medium">Daily practice sets and modules are being configured by your course faculty.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {courseSubjects.map((sName) => {
                        const qList = subjectQuestionMap[sName] || [];
                        return (
                          <div
                            key={sName}
                            onClick={() => {
                              setSelectedSubject(sName);
                              setSelectedTopic('');
                              setCurrentLevel('topics');
                            }}
                            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                          >
                            <div>
                              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center mb-4">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                                {sName}
                              </h4>
                              <p className="text-xs text-slate-500 font-semibold">{Math.min(10, qList.length)} Questions per Set (Smart Reshuffled)</p>
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubject(sName);
                                setSelectedTopic('');
                                setCurrentLevel('topics');
                              }}
                              className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 cursor-pointer"
                            >
                              <span>Browse Topics</span>
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-400 group-hover:text-blue-600" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* WEEKLY MEGA DPP CHALLENGE SECTION (Clean Light Theme with Indigo Accent) */}
                  {(() => {
                    const hasDppForCourse = hasCourseWeeklyDpp && weeklySmartSet.length > 0;
                    const totalWeeklyCount = weeklySmartSet.length;

                    return (
                      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-slate-800 p-7 shadow-xs space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-5">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-2xl ${hasDppForCourse ? 'bg-blue-600' : 'bg-amber-500'} text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20`}>
                              <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 tracking-wider border border-blue-200/80 dark:border-blue-800">
                                  {getCurrentWeekLabel()}
                                </span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                  Course Weekly DPP Paper
                                </span>
                                {hasDppForCourse ? (
                                  <WeeklyCountdownBadge />
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                    ⏳ Coming Soon
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                                {hasDppForCourse ? (publishedWeeklyDpp?.title || 'Weekly DPP Test') : 'Weekly DPP Test (Coming Soon)'}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1 max-w-xl">
                                {hasDppForCourse
                                  ? isWeeklyAttemptedThisWeek
                                    ? `✓ Attempt complete for this week! Questions stay fixed until next Monday at 00:00. Wrongly answered questions repeat for mastery.`
                                    : `Course Weekly Test Paper (${courseName || 'Enrolled Course'}). Questions stay fixed for the week and automatically reshuffle next Monday at 00:00. Wrong & correct questions repeat to ensure full mastery!`
                                  : `Weekly DPP test for ${courseName || 'your course'} has not been configured yet. Check back soon for your weekly revision paper!`}
                              </p>
                            </div>
                          </div>

                          {hasDppForCourse ? (
                            <button
                              type="button"
                              onClick={handleOpenWeeklyChallenge}
                              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                            >
                              {isWeeklyAttemptedThisWeek ? (
                                <>
                                  <RotateCcw className="w-4 h-4" /> Retake Weekly Test
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 fill-current" /> Start Weekly Test
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-extrabold text-xs rounded-xl flex items-center gap-2 shrink-0 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                            >
                              <Clock className="w-4 h-4" /> Coming Soon
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black block uppercase tracking-wider mb-1">TEST DURATION</span>
                            <span className="text-base font-black text-slate-900 dark:text-white">{hasDppForCourse ? `${publishedWeeklyDpp?.duration_minutes || 30} Mins` : '30 Mins'}</span>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black block uppercase tracking-wider mb-1">CONFIGURED QUESTIONS</span>
                            <span className={`text-base font-black ${hasDppForCourse ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                              {hasDppForCourse ? `${totalWeeklyCount} Questions` : 'Coming Soon'}
                            </span>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black block uppercase tracking-wider mb-1">REPEATING RULE</span>
                            <span className={`text-base font-black ${hasDppForCourse ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {hasDppForCourse ? 'Wrong + Mastery Repeat' : 'Pending Release'}
                            </span>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black block uppercase tracking-wider mb-1">MAX XP BONUS</span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              +{hasDppForCourse ? totalWeeklyCount * 27 : 270} XP
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* LEVEL 2: TOPIC WISE SELECTION */}
              {currentLevel === 'topics' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Topic Modules under <span className="text-[#0B192C] dark:text-blue-400">{selectedSubject}</span>
                      </h3>
                      <p className="text-xs text-slate-500">Select a topic module to start practicing question sets.</p>
                    </div>

                    <button
                      onClick={() => setCurrentLevel('subjects')}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Subjects
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {loading ? (
                      [1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs animate-pulse space-y-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                          <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
                        </div>
                      ))
                    ) : Object.keys(topicModulesMap).length === 0 ? (
                      <div className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 bg-white dark:bg-slate-900">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <BookOpen className="w-7 h-7 stroke-[1.5]" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1.5">
                          <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                            No topic practice questions added for {selectedSubject} yet
                          </h4>
                          <p className="text-xs text-slate-400 font-medium">
                            Questions for {selectedSubject} under this course have not been uploaded yet. Please check back soon or explore other subjects!
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setCurrentLevel('subjects');
                            setSelectedSubject('');
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> Back to Subjects
                        </button>
                      </div>
                    ) : (
                      Object.keys(topicModulesMap).map((tName) => {
                        const tQList = topicModulesMap[tName] || [];
                        return (
                          <div
                            key={tName}
                            onClick={() => handleOpenTopic(tName)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 rounded-lg p-5 shadow-xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                          >
                            <div>
                              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center mb-3">
                                <Folder className="w-5 h-5" />
                              </div>
                              <h4 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">{tName}</h4>
                              <p className="text-xs text-slate-500">{Math.min(10, tQList.length)} Questions per Set</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-[#0B192C] dark:text-blue-400">
                              <span>Start Practice</span>
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ALL QUESTIONS MODE */}
          {!activeSession && viewMode === 'all' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">All Practice Questions</h3>
                  <p className="text-xs text-slate-500">Pick any question set to begin interactive practice.</p>
                </div>
                <button
                  onClick={() => handleOpenTopic('All Topics')}
                  className="px-4 py-2 bg-brand-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4" /> Start All Practice
                </button>
              </div>
            </div>
          )}
        </main>

      {/* MODE SELECTION MODAL */}
      {showModeModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 animate-in fade-in duration-200
            flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModeModal(false); }}
        >
          {/* Modal panel — bottom sheet on mobile, centered card on sm+ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
            rounded-t-3xl sm:rounded-2xl
            p-6 w-full sm:max-w-lg shadow-2xl space-y-5
            pb-28 sm:pb-6
            animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

            <div className="sm:hidden w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Choose Practice Mode</h3>
              <p className="text-xs text-slate-500">
                Select your preferred mode for <strong className="text-slate-800 dark:text-slate-200">{selectedTopic || 'Practice Set'}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Practice Mode Option */}
              <div
                onClick={() => setSelectedMode('practice')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex sm:flex-col items-start sm:items-start gap-4 sm:gap-3 ${
                  selectedMode === 'practice'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">Practice Mode</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    • Forward Stopwatch Timer<br />
                    • Per-question answer check<br />
                    • Instant solution reveal
                  </p>
                </div>
              </div>

              {/* Quiz Mode Option */}
              <div
                onClick={() => setSelectedMode('quiz')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex sm:flex-col items-start sm:items-start gap-4 sm:gap-3 ${
                  selectedMode === 'quiz'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">Quiz Mode</h4>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    • Backwards Countdown Timer<br />
                    • Timed assessment simulation<br />
                    • Final submission evaluation
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowModeModal(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStartSession(selectedMode)}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0B192C] hover:bg-[#060E18] text-white text-xs font-extrabold rounded-xl transition-colors shadow-xs"
              >
                Start {selectedMode === 'practice' ? 'Practice' : 'Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL SUBMIT CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Submit {activeSession === 'quiz' ? 'Quiz' : 'Practice Set'}?
              </h3>
              <p className="text-xs text-slate-500">
                You have answered {Object.keys(userAnswers).length} of {filteredQuestions.length} questions.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300"
              >
                Resume
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit('manual')}
                className="px-6 py-2 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE SESSION CONFIRMATION MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Leave Test Session?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                If you choose to leave now, all your current progress in this session will be lost and you will have to start over again.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Continue Session
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveModal(false);
                  handleResetSession();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-colors shadow-sm"
              >
                Leave Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
