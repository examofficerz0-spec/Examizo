'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/common/Logo';
import { HindiTranslateButton, translateToHindi } from '@/components/common/HindiTranslateButton';
import { QuestionDiagram } from '@/components/ui/QuestionDiagram';
import {
  Clock, Bookmark, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, Award,
  AlertTriangle, ShieldCheck, ShieldAlert, RotateCcw, Star, BarChart2, MessageSquare, PieChart,
  Lock, XCircle, MinusCircle, Trophy, Target, Zap, TrendingUp, BookOpen, Filter, Sparkles, ArrowRight, ArrowLeft, RefreshCw, Layers, Check
} from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';
import {
  cleanQuestionText,
  normalizeQuestionSignature,
  deduplicateQuestions,
} from '@/lib/questionDeduplicator';

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const isGkGsName = (name: string) => {
  if (!name || typeof name !== 'string') return false;
  const n = name.trim().toLowerCase();
  return (
    n === 'gk/gs' ||
    n === 'gk/ gs' ||
    n === 'gk / gs' ||
    n === 'gk-gs' ||
    n === 'gk gs' ||
    n === 'gk' ||
    n === 'gs' ||
    n === 'general knowledge' ||
    n === 'general studies' ||
    n === 'general awareness' ||
    n.includes('gk') ||
    n.includes('general studies') ||
    n.includes('general awareness')
  );
};

const GK_GS_CANONICAL_MODULES: { match: RegExp; name: string }[] = [
  { match: /^(?:general\s*knowledge|static\s*gk|gk)/i, name: 'General Knowledge' },
  { match: /^(?:environment(?:al\s*(?:studies|science))?|ecology)/i, name: 'Environment' },
  { match: /^(?:general\s*science|science)/i, name: 'General Science' },
  { match: /^(?:indian\s*economy|economy|economics)/i, name: 'Indian Economy' },
  { match: /^(?:world\s*geography)/i, name: 'World Geography' },
  { match: /^(?:indian\s*geography|geography)/i, name: 'Indian Geography' },
  { match: /^(?:indian\s*history|ancient\s*india|medieval\s*india|modern\s*india|freedom\s*movement|history)/i, name: 'Indian History' },
  { match: /^(?:indian\s*polity|polity|constitution|civics)/i, name: 'Indian Polity' },
];

function getQuestionSubjectAndTopicHelper(q: any, courseSubjects: string[]) {
  if (!q) return { subject: 'General', topic: 'General Topics' };

  const validCourseSubjects = Array.isArray(courseSubjects) && courseSubjects.length > 0
    ? courseSubjects
    : ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

  const configuredGkGs = validCourseSubjects.find((s) => isGkGsName(s));
  const hasAdvanceArith = validCourseSubjects.find((s) => /^(?:advance\s*arithm[ae]tic|advanced\s*math)/i.test(s));
  const hasArithmatics = validCourseSubjects.find((s) => /^(?:arithm[ae]tics?|math(?:ematics)?|quant(?:itative\s*aptitude)?)$/i.test(s));
  const hasReasoning = validCourseSubjects.find((s) => /^(?:reasoning|logical\s*reasoning|general\s*intelligence)/i.test(s));
  const hasCurrentAffairs = validCourseSubjects.find((s) => /^(?:current\s*aff[ai]+rs?)/i.test(s));
  const hasScience = validCourseSubjects.some((s) => s.toLowerCase() === 'science');
  const hasPhysicsOrChem = validCourseSubjects.some((s) => ['physics', 'chemistry'].includes(s.toLowerCase()));
  const isScienceCourse = hasScience && !hasPhysicsOrChem;

  const tag = (q.topic_tag || '').trim();
  const qSub = (q.subject || '').toString().trim();
  const rawPrefix = tag.includes('-') ? tag.split('-')[0].trim() : tag;

  let resolvedSubject = '';
  let resolvedTopic = tag;

  // 1. Direct configured exact match on qSub or rawPrefix
  const directMatch = validCourseSubjects.find((s) => s.toLowerCase() === qSub.toLowerCase() || s.toLowerCase() === rawPrefix.toLowerCase());
  if (directMatch) {
    resolvedSubject = directMatch;
  }

  // 2. GK / GS check (if course has GK/GS subject, group all GK/GS sub-domains)
  if (!resolvedSubject && configuredGkGs) {
    const isExplicitlyOther = validCourseSubjects.some(
      (cs) => !isGkGsName(cs) && (cs.toLowerCase() === qSub.toLowerCase() || cs.toLowerCase() === rawPrefix.toLowerCase())
    );
    if (!isExplicitlyOther) {
      if (
        isGkGsName(qSub) ||
        isGkGsName(rawPrefix) ||
        isGkGsName(tag) ||
        GK_GS_CANONICAL_MODULES.some((mod) => mod.match.test(rawPrefix) || mod.match.test(qSub) || mod.match.test(tag))
      ) {
        resolvedSubject = configuredGkGs;
      }
    }
  }

  // 3. Advance Arithmetic check
  if (!resolvedSubject && hasAdvanceArith) {
    if (/^(?:advance\s*arithm[ae]tic|advanced\s*math)/i.test(qSub) || /^(?:advance\s*arithm[ae]tic|advanced\s*math)/i.test(rawPrefix) || /advance/i.test(tag)) {
      resolvedSubject = hasAdvanceArith;
    }
  }

  // 4. Arithmetic / Mathematics / Quant check
  if (!resolvedSubject && hasArithmatics) {
    if (
      /^(?:arithm[ae]tics?|math(?:ematics)?|quant(?:itative\s*aptitude)?)/i.test(qSub) ||
      /^(?:arithm[ae]tics?|math(?:ematics)?|quant(?:itative\s*aptitude)?)/i.test(rawPrefix) ||
      /(?:average|fraction|hcf|lcm|percentage|profit and loss|ratio|simple interest|simplification|time and work|arithm|math|quant)/i.test(tag)
    ) {
      resolvedSubject = hasArithmatics;
    }
  }

  // 5. Reasoning check
  if (!resolvedSubject && hasReasoning) {
    if (/^(?:reasoning|logical\s*reasoning|general\s*intelligence)/i.test(qSub) || /^(?:reasoning|logical\s*reasoning|general\s*intelligence)/i.test(rawPrefix) || /reasoning/i.test(tag)) {
      resolvedSubject = hasReasoning;
    }
  }

  // 6. Current Affairs check
  if (!resolvedSubject && hasCurrentAffairs) {
    if (/^(?:current\s*aff[ai]+rs?)/i.test(qSub) || /^(?:current\s*aff[ai]+rs?)/i.test(rawPrefix) || /current\s*affair/i.test(tag)) {
      resolvedSubject = hasCurrentAffairs;
    }
  }

  // 7. Science check
  if (!resolvedSubject && isScienceCourse) {
    if (/(?:science|physics|chemistry|biology|botany|zoology)/i.test(qSub) || /(?:science|physics|chemistry|biology|botany|zoology)/i.test(tag)) {
      resolvedSubject = 'Science';
    }
  }

  // 8. Other configured subjects substring
  if (!resolvedSubject) {
    for (const s of validCourseSubjects) {
      if (s && (tag.toLowerCase().includes(s.toLowerCase()) || qSub.toLowerCase().includes(s.toLowerCase()))) {
        resolvedSubject = s;
        break;
      }
    }
  }

  // 9. Fallback if not matched
  if (!resolvedSubject) {
    if (tag.includes('-')) {
      resolvedSubject = tag.split('-')[0].trim();
    } else {
      resolvedSubject = qSub || validCourseSubjects[0] || 'General';
    }
  }

  // Extract clean topic
  if (resolvedSubject && tag.toLowerCase().startsWith(resolvedSubject.toLowerCase())) {
    resolvedTopic = tag.slice(resolvedSubject.length).replace(/^[\s\-:]+/, '').trim() || tag;
  } else if (tag.includes('-')) {
    resolvedTopic = tag.split('-').slice(1).join('-').trim() || tag;
  }

  return { subject: resolvedSubject, topic: resolvedTopic || 'General Topics' };
}

export default function MockTestExecutionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const initialLangParam = searchParams?.get('lang') || 'en';
  const isRetakeRequested = searchParams?.get('retake') === 'true';
  const testId = (params?.id || routeParams?.id) as string;

  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Active Language preference ('en' | 'hi') initialized from query param
  const [activeLanguage, setActiveLanguage] = useState<'en' | 'hi'>(initialLangParam === 'hi' ? 'hi' : 'en');
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);

  // Question Response State
  const [userState, setUserState] = useState<Record<string, { selectedOption: number | null; isMFR: boolean; isVisited: boolean }>>({});

  // Timer State (in seconds)
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // Submission & Result State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct' | 'unattempted'>('all');
  const [reviewSubjectFilter, setReviewSubjectFilter] = useState<string>('all');
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [openReviewQuestions, setOpenReviewQuestions] = useState<Record<string, boolean>>({});
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Check sessionStorage on initial load for completed test results
  useEffect(() => {
    if (!testId) return;
    if (isRetakeRequested) {
      try {
        sessionStorage.removeItem(`mock_result_${testId}`);
      } catch (_) {}
      return;
    }
    try {
      const saved = sessionStorage.getItem(`mock_result_${testId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.result) {
          setResult(parsed.result);
          if (parsed.userState) setUserState(parsed.userState);
        }
      }
    } catch (_) {}
  }, [testId, isRetakeRequested]);

  // Post-Test Completion Window & Feedback State
  const [showCompletionWindow, setShowCompletionWindow] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Hindi Translation State
  const [hindiTranslations, setHindiTranslations] = useState<Record<string, { question: string; options: string[] } | null>>({});

  // ─── Back-Navigation Lock State ───
  const [backPressCount, setBackPressCount] = useState(0);
  const [showBackWarning, setShowBackWarning] = useState(false);
  const backPressCountRef = useRef(0); // ref for use inside event listener

  // ─── Landscape / Portrait State ───
  const [isPortrait, setIsPortrait] = useState(false);

  const handleMockTranslated = useCallback((qId: string, texts: string[]) => {
    setHindiTranslations((prev) => ({
      ...prev,
      [qId]: { question: texts[0] || '', options: texts.slice(1) },
    }));
  }, []);

  const handleMockResetTranslation = useCallback((qId: string) => {
    setHindiTranslations((prev) => ({ ...prev, [qId]: null }));
  }, []);

  useEffect(() => {
    if (!testId) return;

    fetch(`/api/mock-tests/${testId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
          router.push('/dashboard');
          return;
        }

        const rawQuestions = Array.isArray(data.test?.question_ids) ? data.test.question_ids : [];
        const courseSubjectsList: string[] = data.test?.course_id?.subjects || ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Botany', 'Zoology'];

        const rawNormalizedQuestions = rawQuestions.map((q: any, idx: number) => {
          if (typeof q === 'string') {
            return {
              _id: q,
              question_text: `Question ${idx + 1}`,
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correct_option: 0,
              topic_tag: 'General',
            };
          }
          return {
            ...q,
            _id: q._id || q.id || `q_${idx}`,
            question_text: q.question_text || `Question ${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_option: typeof q.correct_option === 'number' ? q.correct_option : 0,
            topic_tag: q.topic_tag || 'General',
          };
        }).filter(Boolean);

        const normalizedQuestions = deduplicateQuestions(rawNormalizedQuestions);

        // ─── SUBJECT-SCOPED QUESTION RESHUFFLING PER ATTEMPT ───
        // Questions are grouped strictly by subject and shuffled ONLY within each subject group
        const subjectBuckets: Record<string, any[]> = {};
        normalizedQuestions.forEach((q: any) => {
          const { subject } = getQuestionSubjectAndTopicHelper(q, courseSubjectsList);
          if (!subjectBuckets[subject]) {
            subjectBuckets[subject] = [];
          }
          subjectBuckets[subject].push(q);
        });

        // Sort subject buckets strictly by courseSubjectsList order
        const sortedSubjectNames = Object.keys(subjectBuckets).sort((a, b) => {
          const idxA = courseSubjectsList.indexOf(a);
          const idxB = courseSubjectsList.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.localeCompare(b);
        });

        let finalReshuffledQuestions: any[] = [];
        sortedSubjectNames.forEach((subj) => {
          const shuffledBucket = shuffleArray(subjectBuckets[subj]);
          finalReshuffledQuestions = finalReshuffledQuestions.concat(shuffledBucket);
        });

        const testData = {
          ...data.test,
          question_ids: finalReshuffledQuestions,
        };

        setTest(testData);

        // Initialize state for each question
        const initial: Record<string, any> = {};
        finalReshuffledQuestions.forEach((q: any, i: number) => {
          const qId = q._id || q.id;
          if (qId) {
            initial[qId] = { selectedOption: null, isMFR: false, isVisited: i === 0 };
            if (q._id && q.id && q._id !== q.id) {
              initial[q.id] = initial[qId];
            }
          }
        });

        // Restore latest completed attempt from server if available and not explicitly retaking
        if (!isRetakeRequested && data.latestAttempt) {
          setResult((prev: any) => {
            if (prev) return prev;
            return {
              score: data.latestAttempt.score,
              accuracyPercent: data.latestAttempt.accuracyPercent,
              correctCount: data.latestAttempt.correctCount,
              incorrectCount: data.latestAttempt.incorrectCount,
              unattemptedCount: data.latestAttempt.unattemptedCount,
              totalQuestions: data.latestAttempt.totalQuestions,
              xpEarned: data.latestAttempt.xpEarned || 0,
              cutoffBonusAwarded: data.latestAttempt.cutoffBonusAwarded || false,
              submissionType: data.latestAttempt.submissionType || 'manual',
            };
          });

          if (Array.isArray(data.latestAttempt.responses)) {
            const reconstructedUserState: Record<string, any> = {};
            data.latestAttempt.responses.forEach((r: any) => {
              if (r.question_id) {
                reconstructedUserState[r.question_id] = {
                  selectedOption: r.selected_option,
                  isMFR: false,
                  isVisited: true,
                };
              }
            });
            setUserState((prev) => ({ ...initial, ...prev, ...reconstructedUserState }));
          } else {
            setUserState((prev) => ({ ...initial, ...prev }));
          }
        } else {
          setUserState((prev) => ({ ...initial, ...prev }));
        }

        // Set timer (duration in minutes * 60)
        setTimeLeft((data.test?.duration_minutes || 60) * 60);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [testId, router, isRetakeRequested]);

  // Fullscreen Lockdown & Exam Start State
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [fullscreenViolationCount, setFullscreenViolationCount] = useState(0);
  const fullscreenViolationRef = useRef(0);
  const lastViolationTimeRef = useRef(0);

  const enterFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen) {
        try { (docEl as any).webkitRequestFullscreen(); } catch (e) {}
      } else if ((docEl as any).msRequestFullscreen) {
        try { (docEl as any).msRequestFullscreen(); } catch (e) {}
      }

      // Try orientation lock on mobile
      try {
        if (screen?.orientation && typeof (screen.orientation as any).lock === 'function') {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (e) {}
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartExamLock = async () => {
    await enterFullscreen();
    setIsFullscreen(true);
    setIsExamStarted(true);
    setShowLockWarning(false);
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          try { (document as any).webkitExitFullscreen(); } catch (e) {}
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Force Landscape on Mobile ───
  useEffect(() => {
    const tryLockLandscape = async () => {
      try {
        if (screen?.orientation && typeof (screen.orientation as any).lock === 'function') {
          await (screen.orientation as any).lock('landscape');
        }
      } catch (e) {
        // Not supported or user denied — fall back to CSS overlay
      }
    };

    tryLockLandscape();

    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 900 || ('ontouchstart' in window);
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      try {
        if (screen?.orientation && typeof (screen.orientation as any).unlock === 'function') {
          (screen.orientation as any).unlock();
        }
      } catch (e) {}
    };
  }, []);

  // ─── Back Navigation Lock ───
  useEffect(() => {
    if (!test || result || !isExamStarted) return;

    // Push a dummy state so there's always a "back entry" to intercept
    window.history.pushState({ mockTestLock: true }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Re-push the dummy state so back is always intercepted
      window.history.pushState({ mockTestLock: true }, '', window.location.href);

      backPressCountRef.current += 1;
      const newCount = backPressCountRef.current;
      setBackPressCount(newCount);

      if (newCount >= 3) {
        // 3rd violation → auto-submit
        handleFinalSubmit('auto');
      } else {
        // Show warning modal (1st or 2nd)
        setShowBackWarning(true);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, result, isExamStarted]);

  // Fullscreen & Lockdown Security Listener
  useEffect(() => {
    if (!test || result || !isExamStarted) return;

    // ─── Shared violation trigger ───────────────────────────────────
    const triggerViolation = (reason?: string) => {
      if (fullscreenViolationRef.current >= 3) return; // already submitted

      const now = Date.now();
      if (now - lastViolationTimeRef.current < 1200) return; // debounce multi-event bursts
      lastViolationTimeRef.current = now;

      fullscreenViolationRef.current += 1;
      const vCount = fullscreenViolationRef.current;
      setFullscreenViolationCount(vCount);
      setIsFullscreen(false);
      setShowLockWarning(true);

      if (vCount >= 3) {
        handleFinalSubmit('auto');
      }
    };

    // ─── Fullscreen exit (Esc key, browser UI) ───────────────────────
    const handleFullscreenChange = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!fsEl) {
        setIsFullscreen(false);
        triggerViolation('Fullscreen exited');
      } else {
        setIsFullscreen(true);
      }
    };

    // ─── Tab switch / window minimize (visibilitychange) ─────────────
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setIsFullscreen(false);
        triggerViolation('Tab switched / window minimized');
      }
    };

    // ─── Windows key / Alt-Tab / app switch (window blur) ────────────
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    const handleWindowBlur = () => {
      blurTimer = setTimeout(() => {
        setIsFullscreen(false);
        triggerViolation('Window blur / OS app switch');
      }, 100);
    };
    const handleWindowFocus = () => {
      if (blurTimer) clearTimeout(blurTimer);
    };

    // ─── Keyboard shortcut interception (best-effort) ─────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common OS shortcuts that escape the exam
      const blocked =
        e.key === 'Meta' || // Windows/Command key
        e.key === 'Alt' ||
        (e.altKey && (e.key === 'Tab' || e.key === 'F4' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
        (e.ctrlKey && (e.key === 'w' || e.key === 'W' || e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N' || e.key === 'r' || e.key === 'R')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'Escape')) ||
        e.key === 'F11' ||
        e.key === 'F12' ||
        e.key === 'Escape';

      if (blocked) {
        if (e.key === 'Escape' || e.key === 'F11' || e.key === 'Meta') {
          triggerViolation('Restricted key pressed');
        }
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Mock examination is locked in progress. Exiting will discard your answers.';
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyDown, true); // capture phase
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (blurTimer) clearTimeout(blurTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, result, isExamStarted]);

  // Live Timer Countdown Effect
  useEffect(() => {
    if (!test || result || !isExamStarted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit('auto');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [test, result, isExamStarted]);

  const questions: any[] = test?.question_ids || [];
  const currentQ = questions[currentIdx] || null;

  // Auto-Translation & Pre-fetching Effect when activeLanguage === 'hi'
  useEffect(() => {
    if (activeLanguage !== 'hi' || questions.length === 0) return;

    let isMounted = true;

    // Pre-translate current question + next 2 upcoming questions in background
    const targetIndices = [currentIdx, currentIdx + 1, currentIdx + 2].filter(
      (i) => i >= 0 && i < questions.length
    );

    targetIndices.forEach((idx) => {
      const q = questions[idx];
      if (!q || hindiTranslations[q._id]) return; // already translated

      translateToHindi([q.question_text, ...(q.options || [])])
        .then((translated) => {
          if (isMounted && translated && translated.length > 0) {
            setHindiTranslations((prev) => {
              if (prev[q._id]) return prev;
              return {
                ...prev,
                [q._id]: {
                  question: translated[0] || q.question_text,
                  options: translated.slice(1),
                },
              };
            });
          }
        })
        .catch((err) => console.error('Auto-translate error for Q' + (idx + 1), err));
    });

    return () => {
      isMounted = false;
    };
  }, [activeLanguage, currentIdx, questions, hindiTranslations]);

  const courseSubjects: string[] = test?.course_id?.subjects || ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

  const getQuestionSubjectAndTopic = (q: any) => {
    return getQuestionSubjectAndTopicHelper(q, courseSubjects);
  };

  const subjectGroupedQuestions = React.useMemo(() => {
    const map: Record<string, { questions: { question: any; originalIdx: number }[] }> = {};

    questions.forEach((q, idx) => {
      const { subject } = getQuestionSubjectAndTopic(q);
      if (!map[subject]) {
        map[subject] = { questions: [] };
      }
      map[subject].questions.push({ question: q, originalIdx: idx });
    });

    return map;
  }, [questions, courseSubjects]);

  const testSubjects = Object.keys(subjectGroupedQuestions).sort((a, b) => {
    const idxA = courseSubjects.indexOf(a);
    const idxB = courseSubjects.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
  const currentQInfo = currentQ ? getQuestionSubjectAndTopic(currentQ) : { subject: 'General', topic: '' };

  const [selectedPaletteSubject, setSelectedPaletteSubject] = useState<string | null>(null);

  const activeSubject = (selectedPaletteSubject && testSubjects.includes(selectedPaletteSubject))
    ? selectedPaletteSubject
    : (currentQInfo.subject || testSubjects[0] || 'General');

  useEffect(() => {
    if (currentQInfo.subject && testSubjects.includes(currentQInfo.subject)) {
      setSelectedPaletteSubject(currentQInfo.subject);
    }
  }, [currentIdx, currentQInfo.subject]);

  // Helper function to update question state
  const updateQuestionState = (qId: string, updates: Partial<{ selectedOption: number | null; isMFR: boolean; isVisited: boolean }>) => {
    if (!qId) return;
    setUserState((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], ...updates, isVisited: true },
    }));
  };

  const handleSelectOption = (optIdx: number) => {
    if (result || !currentQ) return;
    updateQuestionState(currentQ._id, { selectedOption: optIdx });
  };

  const handleClearResponse = () => {
    if (result || !currentQ) return;
    updateQuestionState(currentQ._id, { selectedOption: null });
  };

  const handleToggleMFR = () => {
    if (result || !currentQ) return;
    const curr = userState[currentQ._id]?.isMFR || false;
    updateQuestionState(currentQ._id, { isMFR: !curr });
  };

  const navigateTo = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrentIdx(idx);
      if (questions[idx]?._id) {
        updateQuestionState(questions[idx]._id, { isVisited: true });
      }
    }
  };

  // Compute Palette Stats
  let answeredCount = 0;
  let unansweredCount = 0;
  let mfrCount = 0;
  let unvisitedCount = 0;

  questions.forEach((q) => {
    const st = userState[q._id];
    if (!st || !st.isVisited) {
      unvisitedCount++;
    } else if (st.isMFR) {
      mfrCount++;
    } else if (st.selectedOption !== null && st.selectedOption !== undefined) {
      answeredCount++;
    } else {
      unansweredCount++;
    }
  });

  const topicStats = React.useMemo(() => {
    const questionsList: any[] = test?.question_ids || [];
    if (!questionsList || questionsList.length === 0) return { subjects: {}, topics: {}, total: 0 };
    const total = questionsList.length;
    const subCounts: Record<string, number> = {};
    const topCounts: Record<string, number> = {};

    questionsList.forEach((q) => {
      const { subject, topic } = getQuestionSubjectAndTopic(q);
      subCounts[subject] = (subCounts[subject] || 0) + 1;
      const key = `${subject} - ${topic}`;
      topCounts[key] = (topCounts[key] || 0) + 1;
    });

    const subjects: Record<string, { count: number; percent: number }> = {};
    Object.keys(subCounts).forEach((s) => {
      subjects[s] = { count: subCounts[s], percent: Math.round((subCounts[s] / total) * 100) };
    });

    const topics: Record<string, { count: number; percent: number }> = {};
    Object.keys(topCounts).forEach((t) => {
      topics[t] = { count: topCounts[t], percent: Math.round((topCounts[t] / total) * 100) };
    });

    return { subjects, topics, total };
  }, [test, courseSubjects]);

  const subjectPerformance = React.useMemo(() => {
    const map: Record<string, { total: number; attempted: number; correct: number; incorrect: number; score: number; percent: number }> = {};
    testSubjects.forEach((sub) => {
      map[sub] = { total: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, percent: 0 };
    });

    questions.forEach((q) => {
      const { subject } = getQuestionSubjectAndTopic(q);
      if (!map[subject]) {
        map[subject] = { total: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, percent: 0 };
      }
      map[subject].total++;
      const uSt = userState[q._id] || userState[q.id];
      const userChoice = (uSt?.selectedOption !== null && uSt?.selectedOption !== undefined && uSt?.selectedOption >= 0) ? uSt.selectedOption : null;
      if (userChoice !== null) {
        map[subject].attempted++;
        if (Number(userChoice) === Number(q.correct_option)) {
          map[subject].correct++;
          map[subject].score += 4;
        } else {
          map[subject].incorrect++;
          map[subject].score -= 1;
        }
      }
    });

    Object.keys(map).forEach((s) => {
      const subTotal = map[s].total;
      map[s].percent = subTotal > 0 ? Math.round((subTotal / (questions.length || 1)) * 100) : 0;
    });

    return map;
  }, [questions, testSubjects, userState]);

  const topicPerformance = React.useMemo(() => {
    const map: Record<string, { subject: string; topic: string; total: number; correct: number; incorrect: number }> = {};
    questions.forEach((q) => {
      const { subject, topic } = getQuestionSubjectAndTopic(q);
      const cleanTopic = topic || 'General Practice';
      const key = `${subject}::${cleanTopic}`;
      if (!map[key]) {
        map[key] = { subject, topic: cleanTopic, total: 0, correct: 0, incorrect: 0 };
      }
      map[key].total++;
      const uSt = userState[q._id] || userState[q.id];
      const userChoice = (uSt?.selectedOption !== null && uSt?.selectedOption !== undefined && uSt?.selectedOption >= 0) ? uSt.selectedOption : null;
      if (userChoice !== null) {
        if (Number(userChoice) === Number(q.correct_option)) {
          map[key].correct++;
        } else {
          map[key].incorrect++;
        }
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [questions, userState]);

  const handleFinalSubmit = async (submissionType: 'manual' | 'auto' = 'manual') => {
    setSubmitting(true);
    try {
      const targetTestId = test?._id || test?.id || testId;
      const qIdsList = (questions || []).map((q: any) => String(q._id || q.id || '')).filter(Boolean);
      const res = await fetch(`/api/mock-tests/${targetTestId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswers: userState,
          questionIds: qIdsList,
          submissionType,
        }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        setResult(data.result);
        setShowConfirmModal(false);
        setShowLockWarning(false);
        setShowBackWarning(false);
        setShowCompletionWindow(true);
        exitFullscreen();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('xpUpdated'));
          try {
            sessionStorage.setItem(`mock_result_${targetTestId}`, JSON.stringify({
              result: data.result,
              userState,
              submittedAt: Date.now(),
            }));
          } catch (_) {}
        }
      } else {
        alert(data.error || 'Submission failed. Please try again.');
        setShowLockWarning(false);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error submitting test: ' + (err?.message || 'Network error'));
      setShowLockWarning(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetakeTest = () => {
    try {
      sessionStorage.removeItem(`mock_result_${testId}`);
    } catch (_) {}
    setResult(null);
    setIsExamStarted(false);
    setHasAcceptedRules(false);
    router.push(`/mock-tests/${testId}?retake=true`);
  };

  // Format Timer MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const violationsRemaining = 3 - backPressCount;

  if (loading || !test) {
    return (
      <PageLoader
        title="Initializing Examination"
        subtitle="Loading question paper, proctoring security keys, and curriculum modules..."
        badgeText="Security Engine"
      />
    );
  }

  if (!isExamStarted && !result) {
    const totalQuestions = questions.length;
    const durationMinutes = test.duration_minutes || 60;
    const testMarks = test.cutoff_marks || (totalQuestions * 4);

    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden font-sans">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-blue-600/10 dark:bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-600/10 dark:bg-purple-600/15 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-2xl w-full bg-white dark:bg-[#0D0D12] border border-slate-200/90 dark:border-[#242033] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6 relative z-10 animate-fade-in">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#242033] pb-5">
            <div className="flex items-center gap-3.5">
              <Logo size={38} showText={false} />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-purple-400 bg-blue-50 dark:bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-purple-800/60 inline-flex items-center gap-1.5 shadow-2xs">
                  <Lock className="w-3 h-3" /> Secure Proctored Examination
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                  {test.title}
                </h1>
              </div>
            </div>
          </div>

          {/* Test Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-3.5 text-center transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Course</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate block mt-0.5">{test.course_id?.name || 'Curriculum Track'}</span>
            </div>
            <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-3.5 text-center transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Duration</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">{durationMinutes} Minutes</span>
            </div>
            <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-3.5 text-center transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Questions</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">{totalQuestions} Questions</span>
            </div>
            <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-3.5 text-center transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Cutoff / Max</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">{testMarks} Marks</span>
            </div>
          </div>

          {/* Subject Breakdown Pills */}
          {testSubjects.length > 0 && (
            <div className="bg-slate-50/80 dark:bg-[#181622]/60 border border-slate-200/80 dark:border-[#242033] rounded-2xl p-4 space-y-2.5">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Included Sections &amp; Breakdown:
              </span>
              <div className="flex flex-wrap gap-2">
                {testSubjects.map((sub) => (
                  <span
                    key={sub}
                    className="px-3 py-1.5 bg-white dark:bg-[#0D0D12] border border-slate-200 dark:border-[#242033] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-2xs"
                  >
                    <span>{sub}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono font-black border border-blue-200/60 dark:border-blue-800/40">
                      {subjectGroupedQuestions[sub]?.questions?.length || 0} Qs
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Security & Screen Lock Rules */}
          <div className="bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Exam Lockdown &amp; Proctoring Rules
              </h3>
            </div>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-black shrink-0">•</span>
                <span><strong className="text-slate-900 dark:text-white">Full-Screen Lock:</strong> Clicking the button below will immediately lock your screen into fullscreen mode.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-black shrink-0">•</span>
                <span><strong className="text-slate-900 dark:text-white">Anti-Switching Guard:</strong> Pressing Esc, switching tabs, minimizing the window, or pressing Windows/Alt-Tab will record a violation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-600 dark:text-rose-400 font-black shrink-0">•</span>
                <span><strong className="text-slate-900 dark:text-white">3 Strike Limit:</strong> After 3 violations, the test will be immediately and irreversibly auto-submitted.</span>
              </li>
            </ul>
          </div>

          {/* Language Preference selection */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-3 px-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Question Language:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveLanguage('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeLanguage === 'en'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-white dark:bg-[#0D0D12] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#242033]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setActiveLanguage('hi')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeLanguage === 'hi'
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-white dark:bg-[#0D0D12] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#242033]'
                }`}
              >
                Hindi (हिंदी)
              </button>
            </div>
          </div>

          {/* Agreement Checkbox to Unlock Exam */}
          <label
            htmlFor="rules-consent-checkbox"
            className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              hasAcceptedRules
                ? 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-xs'
                : 'bg-slate-50 dark:bg-[#181622]/80 border-slate-200 dark:border-[#242033] hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="pt-0.5 shrink-0">
              <input
                id="rules-consent-checkbox"
                type="checkbox"
                checked={hasAcceptedRules}
                onChange={(e) => setHasAcceptedRules(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                I agree to the Examination Guidelines &amp; Proctoring Conditions
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                I confirm that I will not switch tabs, minimize the window, or exit fullscreen. I understand that violations will be logged and 3 strikes will result in automatic submission.
              </p>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={!hasAcceptedRules}
              onClick={handleStartExamLock}
              className={`w-full py-4 px-6 text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 transition-all ${
                hasAcceptedRules
                  ? 'bg-[#0B192C] hover:bg-[#060E18] dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-[0.99] text-white shadow-xl shadow-slate-900/20 dark:shadow-blue-600/30 cursor-pointer'
                  : 'bg-slate-200 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60 border border-slate-300/40 dark:border-slate-700/40'
              }`}
            >
              {hasAcceptedRules ? (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Lock Screen &amp; Start Examination
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Check the box above to unlock examination
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/mock-tests')}
              className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Cancel &amp; Return to Mock Tests
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (result) {
    const totalQCount = questions.length;
    const totalAttempted = (result.correctCount || 0) + (result.incorrectCount || 0);
    const unattempted = Math.max(0, totalQCount - totalAttempted);
    const maxPossibleMarks = test?.cutoff_marks || (totalQCount * 4);
    const isCutoffPassed = result.cutoffBonusAwarded || (test?.cutoff_marks && result.score >= test.cutoff_marks);

    const activeReviewSubject = (reviewSubjectFilter && reviewSubjectFilter !== 'all' && testSubjects.includes(reviewSubjectFilter))
      ? reviewSubjectFilter
      : (testSubjects[0] || '');

    const currentSubjectQuestions = activeReviewSubject
      ? questions.filter((q) => getQuestionSubjectAndTopic(q).subject === activeReviewSubject)
      : questions;

    const subjectTotalQCount = currentSubjectQuestions.length;
    let subjectCorrectCount = 0;
    let subjectIncorrectCount = 0;
    let subjectSkippedCount = 0;

    currentSubjectQuestions.forEach((q) => {
      const uSt = userState[q._id] || userState[q.id];
      const userChoice = (uSt?.selectedOption !== null && uSt?.selectedOption !== undefined && uSt?.selectedOption >= 0) ? uSt.selectedOption : null;
      const isAttempted = userChoice !== null;
      const isCorrect = isAttempted && Number(userChoice) === Number(q.correct_option);
      const isIncorrect = isAttempted && !isCorrect;

      if (isCorrect) subjectCorrectCount++;
      else if (isIncorrect) subjectIncorrectCount++;
      else subjectSkippedCount++;
    });

    const filteredReviewQuestions = currentSubjectQuestions.filter((q) => {
      const uSt = userState[q._id] || userState[q.id];
      const userChoice = (uSt?.selectedOption !== null && uSt?.selectedOption !== undefined && uSt?.selectedOption >= 0) ? uSt.selectedOption : null;
      const isAttempted = userChoice !== null;
      const isCorrect = isAttempted && Number(userChoice) === Number(q.correct_option);
      const isIncorrect = isAttempted && !isCorrect;

      if (reviewFilter === 'correct') return isCorrect;
      if (reviewFilter === 'incorrect') return isIncorrect;
      if (reviewFilter === 'unattempted') return !isAttempted;
      return true;
    });

    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        
        {/* Sticky Header Bar */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0D0D12]/90 backdrop-blur-xl border-b border-slate-200/90 dark:border-[#242033] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <Logo size={32} showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                  Performance Report
                </span>
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {test.title}
                </h1>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Track: {test.course_id?.name || 'Curriculum Course'} • Submitted via {result.submissionType || 'manual'} action
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/mock-tests')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181622] border border-slate-200 dark:border-[#242033] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> All Mock Tests
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black text-white bg-[#0B192C] hover:bg-[#060E18] dark:bg-blue-600 dark:hover:bg-blue-500 shadow-md shadow-slate-900/10 dark:shadow-blue-600/20 transition-all cursor-pointer"
            >
              Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 animate-fade-in">
          
          {/* Hero Performance Card */}
          <div className="bg-white dark:bg-[#0D0D12] border border-slate-200/90 dark:border-[#242033] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 dark:bg-purple-600/15 blur-[90px] pointer-events-none rounded-full" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#242033] pb-5 relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-purple-400 bg-blue-50 dark:bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-purple-800/60 inline-flex items-center gap-1.5 shadow-2xs">
                  <Sparkles className="w-3 h-3" /> Official Result Summary
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                  Mock Test Performance Breakdown
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Comprehensive performance audit, sectional statistics, and question-by-question answer keys.
                </p>
              </div>

              {isCutoffPassed && (
                <div className="px-4 py-2.5 bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Award className="w-4 h-4 text-amber-200" /> Cutoff Cleared (+100 Bonus XP)
                </div>
              )}
            </div>

            {/* 5-KPI Core Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 relative z-10">
              {/* Score Tile */}
              <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-4 text-center transition-all hover:border-blue-300 dark:hover:border-purple-500">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Total Score</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block mt-0.5">
                  {result.score} <span className="text-xs text-slate-400 font-bold">/ {maxPossibleMarks}</span>
                </span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-purple-400 mt-1 block">
                  {Math.round((result.score / Math.max(1, maxPossibleMarks)) * 100)}% Marks
                </span>
              </div>

              {/* Accuracy Tile */}
              <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-4 text-center transition-all hover:border-blue-300 dark:hover:border-purple-500">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Accuracy</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block mt-0.5">
                  {result.accuracyPercent}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                  {totalAttempted} Attempted
                </span>
              </div>

              {/* Correct / Incorrect Tile */}
              <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-4 text-center transition-all hover:border-blue-300 dark:hover:border-purple-500">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Correct / Wrong</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {result.correctCount} <span className="text-slate-300 dark:text-slate-600 text-lg">/</span> <span className="text-rose-600 dark:text-rose-400">{result.incorrectCount}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                  {result.correctCount} Correct • {result.incorrectCount} Wrong
                </span>
              </div>

              {/* Unattempted / Skipped Tile */}
              <div className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-4 text-center transition-all hover:border-blue-300 dark:hover:border-purple-500">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">Skipped</span>
                <span className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-slate-300 block mt-0.5">
                  {unattempted}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                  of {totalQCount} Total Qs
                </span>
              </div>

              {/* XP Earned Tile */}
              <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-4 text-center transition-all hover:border-blue-300 dark:hover:border-purple-500">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">XP Earned</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400 block mt-0.5">
                  +{result.xpEarned}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  XP Credited
                </span>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-[#242033] relative z-10">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Responses recorded and synced with student ranking engine.</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRetakeTest}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181622] border border-slate-200 dark:border-[#242033] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake Test
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#0B192C] hover:bg-[#060E18] dark:bg-blue-600 dark:hover:bg-blue-500 shadow-md shadow-slate-900/10 dark:shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Return to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Section & Topic Weightage Breakdown Card */}
          <div className="bg-white dark:bg-[#0D0D12] border border-slate-200/90 dark:border-[#242033] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#242033] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-purple-950/60 text-blue-600 dark:text-purple-400 border border-blue-200/60 dark:border-purple-800/40">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Topic &amp; Subject Performance Breakdown
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Accuracy, score distribution, and question weightage across curriculum areas.
                  </p>
                </div>
              </div>
            </div>

            {/* Subject Distribution Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testSubjects.map((sub) => {
                const info = subjectPerformance[sub] || { total: 0, attempted: 0, correct: 0, incorrect: 0, score: 0, percent: 0 };
                const skipped = Math.max(0, info.total - info.attempted);
                
                return (
                  <div key={sub} className="bg-slate-50 dark:bg-[#181622] border border-slate-200/80 dark:border-[#242033] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{sub}</span>
                      <span className="text-xs font-black text-blue-600 dark:text-purple-400 font-mono">
                        {info.score > 0 ? `+${info.score}` : info.score} Marks
                      </span>
                    </div>

                    {/* Multi-color segmented progress bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                      {info.total > 0 && info.correct > 0 && (
                        <div
                          style={{ width: `${(info.correct / info.total) * 100}%` }}
                          className="h-full bg-emerald-500"
                          title={`${info.correct} Correct`}
                        />
                      )}
                      {info.total > 0 && info.incorrect > 0 && (
                        <div
                          style={{ width: `${(info.incorrect / info.total) * 100}%` }}
                          className="h-full bg-rose-500"
                          title={`${info.incorrect} Incorrect`}
                        />
                      )}
                      {info.total > 0 && skipped > 0 && (
                        <div
                          style={{ width: `${(skipped / info.total) * 100}%` }}
                          className="h-full bg-slate-300 dark:bg-slate-700"
                          title={`${skipped} Skipped`}
                        />
                      )}
                    </div>

                    {/* Stats details */}
                    <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold pt-1 border-t border-slate-200/60 dark:border-[#242033]">
                      <div className="text-emerald-600 dark:text-emerald-400">
                        <span className="block font-black text-xs">{info.correct}</span>
                        <span>Correct</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        <span className="block font-black text-xs">{skipped}</span>
                        <span>Skipped</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question-by-Question Solution Review (Grouped by Topic) */}
          <div className="bg-white dark:bg-[#0D0D12] border border-slate-200/90 dark:border-[#242033] rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-6">
            
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#242033] pb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-purple-950/60 text-blue-600 dark:text-purple-400 border border-blue-200/60 dark:border-purple-800/40">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Topic-Wise Question &amp; Solution Review
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Click any Topic to view its questions, then click Solution to view full steps &amp; answer keys.
                  </p>
                </div>
              </div>

              {/* Status Filter Pills + Expand/Collapse All */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-[#181622] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({subjectTotalQCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('incorrect')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilter === 'incorrect'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                  }`}
                >
                  Incorrect ({subjectIncorrectCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('correct')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilter === 'correct'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                  }`}
                >
                  Correct ({subjectCorrectCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('unattempted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilter === 'unattempted'
                      ? 'bg-slate-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#181622] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Skipped ({subjectSkippedCount})
                </button>

                <div className="h-5 w-[1px] bg-slate-200 dark:bg-[#242033] mx-1 hidden sm:block"></div>

                <button
                  type="button"
                  onClick={() => {
                    const nextTopicState: Record<string, boolean> = {};
                    const nextQState: Record<string, boolean> = {};
                    filteredReviewQuestions.forEach((q) => {
                      const { subject, topic } = getQuestionSubjectAndTopic(q);
                      const key = `${subject}__${topic || 'General'}`;
                      nextTopicState[key] = true;
                      nextQState[q._id] = true;
                    });
                    setOpenTopics(nextTopicState);
                    setOpenReviewQuestions(nextQState);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#181622] dark:hover:bg-[#242033] cursor-pointer transition-colors"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenTopics({});
                    setOpenReviewQuestions({});
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#181622] dark:hover:bg-[#242033] cursor-pointer transition-colors"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Individual Subject Dropdown Selector */}
            {testSubjects.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#181622] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-[#242033]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60 dark:border-blue-900/40">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <label htmlFor="review-subject-select" className="text-xs font-black text-slate-900 dark:text-white block uppercase tracking-wide">
                      Select Subject
                    </label>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Viewing topics &amp; solutions for <span className="text-blue-600 dark:text-blue-400 font-bold">{activeReviewSubject}</span>
                    </p>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <select
                    id="review-subject-select"
                    value={activeReviewSubject}
                    onChange={(e) => setReviewSubjectFilter(e.target.value)}
                    className="w-full py-2.5 pl-3.5 pr-9 text-xs font-black bg-white dark:bg-[#0D0D12] text-slate-900 dark:text-white border border-slate-200 dark:border-[#242033] rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer hover:border-blue-500/50 transition-colors"
                  >
                    {testSubjects.map((sub) => {
                      const subQuestions = questions.filter((q) => getQuestionSubjectAndTopic(q).subject === sub);
                      const subTotal = subQuestions.length;
                      return (
                        <option key={sub} value={sub} className="py-1">
                          {sub} ({subTotal} {subTotal === 1 ? 'Question' : 'Questions'})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {/* Grouped Topics -> Questions -> Solutions */}
            {(() => {
              const topicMap = new Map<string, {
                topicKey: string;
                subject: string;
                topic: string;
                questions: any[];
                correctCount: number;
                incorrectCount: number;
                skippedCount: number;
              }>();

              filteredReviewQuestions.forEach((q) => {
                const { subject, topic } = getQuestionSubjectAndTopic(q);
                const resolvedTopic = topic || 'General';
                const topicKey = `${subject}__${resolvedTopic}`;

                const uSt = userState[q._id] || userState[q.id];
                const userChoice = (uSt?.selectedOption !== null && uSt?.selectedOption !== undefined && uSt?.selectedOption >= 0) ? uSt.selectedOption : null;
                const isAttempted = userChoice !== null;
                const isCorrect = isAttempted && Number(userChoice) === Number(q.correct_option);
                const isIncorrect = isAttempted && !isCorrect;

                if (!topicMap.has(topicKey)) {
                  topicMap.set(topicKey, {
                    topicKey,
                    subject,
                    topic: resolvedTopic,
                    questions: [],
                    correctCount: 0,
                    incorrectCount: 0,
                    skippedCount: 0,
                  });
                }

                const grp = topicMap.get(topicKey)!;
                grp.questions.push(q);
                if (isCorrect) grp.correctCount++;
                else if (isIncorrect) grp.incorrectCount++;
                else grp.skippedCount++;
              });

              const groupedTopicList = Array.from(topicMap.values());

              if (groupedTopicList.length === 0) {
                return (
                  <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-[#242033] rounded-2xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Questions In This Filter</h4>
                    <p className="text-xs text-slate-500">Try changing your filter above to view questions.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3.5">
                  {groupedTopicList.map((grp) => {
                    const isTopicOpen = Boolean(openTopics[grp.topicKey]);

                    return (
                      <div
                        key={grp.topicKey}
                        className="border border-slate-200/90 dark:border-[#242033] rounded-2xl overflow-hidden bg-white dark:bg-[#0D0D12] transition-all shadow-xs"
                      >
                        {/* Level 1: Topic Dropdown Header */}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenTopics((prev) => {
                              const isCurrentlyOpen = Boolean(prev[grp.topicKey]);
                              if (isCurrentlyOpen) {
                                return {};
                              } else {
                                return { [grp.topicKey]: true };
                              }
                            });
                          }}
                          className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none ${
                            isTopicOpen
                              ? 'bg-slate-50/90 dark:bg-[#181622]'
                              : 'hover:bg-slate-50/60 dark:hover:bg-[#181622]/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 dark:bg-purple-950/80 text-blue-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase bg-blue-50 dark:bg-purple-950 text-blue-600 dark:text-purple-300 border border-blue-200/60 dark:border-purple-800/40">
                                  {grp.subject}
                                </span>
                                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                  {grp.topic}
                                </h4>
                              </div>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                {grp.questions.length} Question{grp.questions.length === 1 ? '' : 's'} in this topic module
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {/* Topic performance pills */}
                            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
                              {grp.correctCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                                  {grp.correctCount} Correct
                                </span>
                              )}
                              {grp.incorrectCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                                  {grp.incorrectCount} Wrong
                                </span>
                              )}
                              {grp.skippedCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {grp.skippedCount} Skipped
                                </span>
                              )}
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-blue-100 dark:bg-purple-950 text-blue-700 dark:text-purple-300">
                              {grp.questions.length} Qs
                            </span>

                            <div className={`w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform duration-300 ${
                              isTopicOpen ? 'rotate-180 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'rotate-0'
                            }`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </button>

                        {/* Level 2: List of Questions under this Topic with Smooth Animation */}
                        <div
                          className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            isTopicOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="p-3 sm:p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-200/80 dark:border-[#242033]">
                              {grp.questions.map((q) => {
                                const originalIdx = questions.findIndex((item) => item._id === q._id);
                                const uSt = userState[q._id] || userState[q.id];
                                const userChoice = (uSt?.selectedOption !== null && uSt?.selectedOption !== undefined && uSt?.selectedOption >= 0) ? uSt.selectedOption : null;
                                const isAttempted = userChoice !== null;
                                const isCorrect = isAttempted && Number(userChoice) === Number(q.correct_option);
                                const isIncorrect = isAttempted && !isCorrect;
                                const isQOpen = Boolean(openReviewQuestions[q._id]);

                                const userChoiceLetter = userChoice !== null && userChoice !== undefined && q.options?.[userChoice]
                                  ? `${String.fromCharCode(65 + userChoice)}`
                                  : 'Skipped';
                                const correctChoiceLetter = q.correct_option !== undefined && q.options?.[q.correct_option]
                                  ? `${String.fromCharCode(65 + q.correct_option)}`
                                  : '-';

                                return (
                                  <div
                                    key={q._id}
                                    className="border border-slate-200 dark:border-[#242033] rounded-xl overflow-hidden bg-white dark:bg-[#0D0D12] transition-all shadow-2xs"
                                  >
                                    {/* Level 2: Compact 1-Row Question Bar */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenReviewQuestions((prev) => ({
                                          ...prev,
                                          [q._id]: !prev[q._id],
                                        }));
                                      }}
                                      className={`w-full px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none ${
                                        isQOpen
                                          ? 'bg-slate-50 dark:bg-[#181622]/80'
                                          : 'hover:bg-slate-50/80 dark:hover:bg-[#181622]/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <span className="px-2 py-0.5 rounded-md bg-[#0B192C] dark:bg-blue-600 text-white text-[10px] font-black shrink-0 shadow-2xs">
                                          Q{originalIdx + 1}
                                        </span>

                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate min-w-0 flex-1">
                                          {cleanQuestionText(q.question_text)}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {/* Choice comparison */}
                                        <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-bold">
                                          <span className={`px-1.5 py-0.5 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : isIncorrect ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            You: {userChoiceLetter}
                                          </span>
                                          <span className="text-slate-300 dark:text-slate-700">|</span>
                                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                            Key: {correctChoiceLetter}
                                          </span>
                                        </div>

                                        {/* Status Pill */}
                                        {isCorrect && (
                                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-800 text-[10px] font-black flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> <span className="hidden sm:inline">Correct</span> (+4)
                                          </span>
                                        )}
                                        {isIncorrect && (
                                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300/80 dark:border-rose-800 text-[10px] font-black flex items-center gap-1">
                                            <XCircle className="w-3 h-3" /> <span className="hidden sm:inline">Incorrect</span> (-1)
                                          </span>
                                        )}
                                        {!isAttempted && (
                                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1">
                                            <MinusCircle className="w-3 h-3" /> <span className="hidden sm:inline">Skipped</span> (0)
                                          </span>
                                        )}

                                        {/* Solution Dropdown Button */}
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                                          isQOpen
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#181622] dark:hover:bg-[#242033] text-slate-700 dark:text-slate-300'
                                        }`}>
                                          <span>{isQOpen ? 'Hide' : 'Solution'}</span>
                                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isQOpen ? 'rotate-180' : 'rotate-0'}`} />
                                        </div>
                                      </div>
                                    </button>

                                    {/* Level 3: Solution & Explanation Dropdown with Smooth Animation */}
                                    <div
                                      className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                                        isQOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                                      }`}
                                    >
                                      <div className="overflow-hidden">
                                        <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-[#181622]/40 border-t border-slate-100 dark:border-[#242033]">
                                          {/* Full Question Text */}
                                          <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                                            {cleanQuestionText(q.question_text)}
                                          </div>

                                          <QuestionDiagram src={q.image_url || q.image || q.question_image} />

                                          {/* Options Grid */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                            {(q.options || []).map((opt: string, optIdx: number) => {
                                              const isCorrectKey = optIdx === q.correct_option;
                                              const isUserSelection = userChoice === optIdx;

                                              let cardStyle = 'bg-white dark:bg-[#0D0D12] border-slate-200/90 dark:border-[#242033] text-slate-700 dark:text-slate-300';
                                              if (isCorrectKey && isUserSelection) {
                                                cardStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs';
                                              } else if (isCorrectKey) {
                                                cardStyle = 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-300 font-bold';
                                              } else if (isUserSelection && !isCorrectKey) {
                                                cardStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-950 dark:text-rose-200 font-bold';
                                              }

                                              return (
                                                <div
                                                  key={optIdx}
                                                  className={`p-3 rounded-xl border-2 text-xs flex justify-between items-center transition-all ${cardStyle}`}
                                                >
                                                  <div className="flex items-center gap-2 pr-2">
                                                    <span className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center shrink-0 ${
                                                      isCorrectKey
                                                        ? 'bg-emerald-600 text-white'
                                                        : isUserSelection
                                                        ? 'bg-rose-600 text-white'
                                                        : 'bg-slate-100 dark:bg-[#181622] text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                      {String.fromCharCode(65 + optIdx)}
                                                    </span>
                                                    <span>{opt}</span>
                                                  </div>

                                                  <div className="shrink-0 flex items-center gap-1">
                                                    {isCorrectKey && (
                                                      <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Correct
                                                      </span>
                                                    )}
                                                    {isUserSelection && !isCorrectKey && (
                                                      <span className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        <XCircle className="w-2.5 h-2.5" /> Your Choice
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {/* Answer Key Callout Banner */}
                                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                            <span className="flex items-center gap-1.5">
                                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                              Official Key: <strong>Option {correctChoiceLetter} ({q.options?.[q.correct_option] || 'Key Answer'})</strong>
                                            </span>
                                            {isAttempted ? (
                                              <span className={`text-[10px] px-2 py-0.5 rounded-md ${isCorrect ? 'bg-emerald-200/70 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200' : 'bg-rose-100 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200'}`}>
                                                {isCorrect ? 'Your answer matched (+4)' : `You selected Option ${userChoiceLetter} (-1)`}
                                              </span>
                                            ) : (
                                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                Skipped (0)
                                              </span>
                                            )}
                                          </div>

                                          {/* Explanation Section */}
                                          {q.explanation && (
                                            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-[#181622] border border-blue-200/80 dark:border-[#242033] space-y-1">
                                              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                Explanation &amp; Solution Key
                                              </span>
                                              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                                                {q.explanation}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>

        </main>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950">

      {/* ─── Portrait Mode Overlay (mobile only) ─── */}
      {isPortrait && !result && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center p-8"
          style={{ background: 'linear-gradient(135deg, #0B192C 0%, #1a2d4a 100%)' }}
        >
          <div
            className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6"
            style={{ animation: 'spin 3s linear infinite' }}
          >
            <RotateCcw className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-white text-xl font-black mb-2">Rotate Your Device</h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Please rotate your device to <strong className="text-white">landscape mode</strong> to take the mock test.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
            <span className="text-white/40 text-xs">Waiting for rotation...</span>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Test Top Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 md:px-6 py-2 md:py-3 shrink-0 sticky top-0 z-20 shadow-md shadow-slate-200/50 dark:shadow-black/60">

        {/* ── Mobile: 3-column layout — logo | SUBMIT CENTER | timer ── */}
        <div className="flex md:hidden items-center w-full gap-2">
          {/* Left col */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Logo size={26} showText={false} />
            <h1 className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[80px]">{test.title}</h1>
          </div>

          {/* Center col: Submit */}
          {!result && (
            <button
              onClick={() => setShowConfirmModal(true)}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-black rounded-lg shadow-md shadow-rose-500/30 transition-all shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Submit Test
            </button>
          )}

          {/* Right col: violation + timer */}
          <div className="flex items-center gap-1.5 flex-1 justify-end">
            {backPressCount > 0 && !result && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-300">{backPressCount}/3</span>
              </div>
            )}
            {!result && (
              <div className="flex items-center gap-1 bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                <Clock className="w-3 h-3 text-brand-700 dark:text-brand-400" />
                <span className="font-mono text-[11px] font-bold text-brand-900 dark:text-brand-300">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Desktop: standard flex row ── */}
        <div className="hidden md:flex items-center justify-between w-full">
          <div className="flex items-center gap-4 min-w-0">
            <Logo size={28} showText={false} />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">{test.title}</h1>
              <p className="text-[10px] text-slate-500">Course: {test.course_id?.name}</p>
            </div>
          </div>
          {backPressCount > 0 && !result && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700">
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">{backPressCount}/3 Violations</span>
            </div>
          )}
          {!result && (
            <div className="flex items-center gap-1.5 bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700 px-4 py-1.5 rounded-xl text-brand-900 dark:text-brand-300">
              <Clock className="w-4 h-4 text-brand-700 dark:text-brand-400" />
              <span className="font-mono text-sm font-bold">{formatTime(timeLeft)}</span>
            </div>
          )}
          {!result && (
            <button
              onClick={() => setShowConfirmModal(true)}
              type="button"
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
            >
              Submit Test
            </button>
          )}
        </div>
      </header>

      {/* Subject Section Navigation Bar */}
      {!result && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 md:px-6 py-1.5 md:py-2 flex items-center justify-between shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] md:text-[11px] font-black uppercase text-slate-400 tracking-wider mr-1 shrink-0">
              SECTIONS:
            </span>
            {testSubjects.map((subject) => {
              const isCurrentSubject = currentQInfo.subject === subject;
              const subjectQList = subjectGroupedQuestions[subject].questions;
              const firstQIdx = subjectQList[0]?.originalIdx ?? 0;
              const subjWeightage = topicStats.subjects[subject]?.percent || 0;

              let answeredInSub = 0;
              subjectQList.forEach(({ question }) => {
                const st = userState[question._id];
                if (st?.selectedOption !== null && st?.selectedOption !== undefined) {
                  answeredInSub++;
                }
              });

              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => navigateTo(firstQIdx)}
                  className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-xl text-[10px] md:text-xs font-extrabold flex items-center gap-1.5 md:gap-2 transition-all shrink-0 border ${
                    isCurrentSubject
                      ? 'bg-[#0B192C] text-white border-[#0B192C] dark:bg-brand-500 dark:border-brand-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{subject} ({subjWeightage}%)</span>
                  <span
                    className={`text-[9px] md:text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isCurrentSubject
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {answeredInSub}/{subjectQList.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="flex-1 flex flex-row min-h-0">

        {/* Left Column: Question Screen */}
        <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-4 md:space-y-6">
          <div className="w-full flex-1 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm">
            <div className="space-y-6">
              {/* Header info bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3.5 py-1 rounded-full bg-blue-600 text-white text-xs font-black shadow-xs">
                      Q{currentIdx + 1} of {questions.length}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold border border-slate-200 dark:border-slate-700">
                      {currentQInfo.subject}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-extrabold border border-purple-200 dark:border-purple-900/50">
                      Topic: {currentQInfo.topic} ({topicStats.topics[`${currentQInfo.subject} - ${currentQInfo.topic}`]?.percent || 5}% weightage)
                    </span>
                  </div>

                  <HindiTranslateButton
                    texts={[currentQ?.question_text || '', ...(currentQ?.options || [])]}
                    isTranslated={activeLanguage === 'hi'}
                    onTranslated={(translated) => {
                      setActiveLanguage('hi');
                      handleMockTranslated(currentQ._id, translated);
                    }}
                    onReset={() => {
                      setActiveLanguage('en');
                      handleMockResetTranslation(currentQ._id);
                    }}
                  />
                </div>

                {/* Question Text & Options Render / Hindi Skeleton */}
                {activeLanguage === 'hi' && !hindiTranslations[currentQ?._id] ? (
                  <div className="space-y-4 py-4 animate-pulse">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
                      <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>🇮🇳 हिंदी अनुवाद लोड हो रहा है... (Translating question to Hindi...)</span>
                    </div>
                    <div className="h-6 w-5/6 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    <div className="h-6 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-xl" />

                    <div className="grid grid-cols-1 gap-3 pt-3">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="w-full h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Question Text */}
                    <div className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white leading-relaxed">
                      {activeLanguage === 'hi'
                        ? hindiTranslations[currentQ?._id]?.question || cleanQuestionText(currentQ?.question_text)
                        : cleanQuestionText(currentQ?.question_text)}
                    </div>

                    {/* Question Diagram / Image */}
                    <QuestionDiagram src={currentQ?.image_url || currentQ?.image || currentQ?.question_image} />

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {(activeLanguage === 'hi'
                        ? hindiTranslations[currentQ?._id]?.options || currentQ?.options || []
                        : currentQ?.options || []
                      ).map((optText: string, optIdx: number) => {
                        const isSelected = userState[currentQ?._id]?.selectedOption === optIdx;
                        return (
                          <button
                            key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(optIdx)}
                              className={`w-full p-4 rounded-2xl border-2 text-left text-xs md:text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/90 border-blue-600 text-blue-950 dark:bg-blue-950/80 dark:border-blue-500 dark:text-blue-100 shadow-md shadow-blue-500/10'
                                  : 'bg-slate-50/60 border-slate-200/80 hover:border-blue-300 hover:bg-slate-100 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <span
                                  className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="leading-snug">{optText}</span>
                              </div>
                              {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
              </div>

              {/* Question Footer Bar */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleMFR}
                    className={`px-4 py-2 rounded-xl border text-xs font-black transition-all flex items-center gap-2 ${
                      userState[currentQ?._id]?.isMFR
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    {userState[currentQ?._id]?.isMFR ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigateTo(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo(currentIdx + 1)}
                    disabled={currentIdx === questions.length - 1}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
        </div>

        {/* Right Navigation Palette Column */}
        {!result && (
          <div className="w-36 md:w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 md:p-5 shrink-0 space-y-3 md:space-y-5 overflow-y-auto">
            <div>
              <h3 className="text-[10px] md:text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 md:mb-3">
                Palette
              </h3>

              {/* 4 State Legend */}
              <div className="grid grid-cols-1 gap-1 md:gap-2 text-[9px] md:text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-emerald-500 shrink-0" /> 
                  <span>Done ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-rose-500 shrink-0" /> 
                  <span>Skip ({unansweredCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-amber-500 shrink-0" /> 
                  <span>MFR ({mfrCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-slate-200 dark:bg-slate-700 shrink-0" /> 
                  <span>New ({unvisitedCount})</span>
                </div>
              </div>
            </div>

            {/* Subject Section Selection Dropdown (Hides other sections into dropdown) */}
            {testSubjects.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] md:text-xs font-black uppercase text-slate-500 tracking-wider">
                    Section
                  </label>
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
                    {testSubjects.length} Sections
                  </span>
                </div>

                {/* Section Dropdown Selector */}
                <div className="relative">
                  <select
                    value={activeSubject}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      setSelectedPaletteSubject(newSub);
                      const firstQ = subjectGroupedQuestions[newSub]?.questions[0];
                      if (firstQ) navigateTo(firstQ.originalIdx);
                    }}
                    className="w-full py-2 pl-3 pr-8 text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs focus:ring-2 focus:ring-brand-600 appearance-none cursor-pointer"
                  >
                    {testSubjects.map((sub) => {
                      const subQ = subjectGroupedQuestions[sub]?.questions || [];
                      const doneCount = subQ.filter(({ question: q }) => {
                        const st = userState[q._id];
                        return st?.selectedOption !== null && st?.selectedOption !== undefined;
                      }).length;

                      return (
                        <option key={sub} value={sub}>
                          {sub} ({doneCount}/{subQ.length} Done)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Section Quick Switcher Badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {testSubjects.map((sub) => {
                    const subQ = subjectGroupedQuestions[sub]?.questions || [];
                    const isActive = activeSubject === sub;
                    const doneCount = subQ.filter(({ question: q }) => {
                      const st = userState[q._id];
                      return st?.selectedOption !== null && st?.selectedOption !== undefined;
                    }).length;

                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setSelectedPaletteSubject(sub);
                          const firstQ = subjectGroupedQuestions[sub]?.questions[0];
                          if (firstQ) navigateTo(firstQ.originalIdx);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          isActive
                            ? 'bg-[#0B192C] text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{sub}</span>
                        <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                          {doneCount}/{subQ.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Subject Section Grid */}
            {(() => {
              const currentSubjectData = subjectGroupedQuestions[activeSubject] || subjectGroupedQuestions[testSubjects[0]];
              if (!currentSubjectData) return null;
              const subQList = currentSubjectData.questions;

              return (
                <div className="space-y-1.5 md:space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[9px] md:text-xs font-black text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                      <span className="truncate">{activeSubject}</span>
                    </span>
                    <span className="text-[8px] md:text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                      ({subQList.length} Questions)
                    </span>
                  </div>

                  <div className="grid grid-cols-4 md:grid-cols-5 gap-1 md:gap-2 max-h-[50vh] overflow-y-auto pr-1">
                    {subQList.map(({ question: q, originalIdx: idx }) => {
                      const st = userState[q._id];
                      const isCurrent = idx === currentIdx;

                      let stateColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

                      if (st?.isMFR) {
                        stateColor = 'bg-amber-500 text-white border-amber-600 font-bold';
                      } else if (st?.selectedOption !== null && st?.selectedOption !== undefined) {
                        stateColor = 'bg-emerald-500 text-white border-emerald-600 font-bold';
                      } else if (st?.isVisited) {
                        stateColor = 'bg-rose-500 text-white border-rose-600 font-bold';
                      }

                      return (
                        <button
                          key={q._id}
                          onClick={() => navigateTo(idx)}
                          className={`h-7 md:h-9 rounded-lg font-mono text-[9px] md:text-xs flex items-center justify-center border transition-all ${stateColor} ${
                            isCurrent ? 'ring-2 ring-brand-800 ring-offset-1 font-black shadow-sm' : ''
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Manual Submission Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-lg text-center">
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">Confirm Test Submission</h3>
            <p className="text-xs text-slate-500 mb-4">Please review your answer summary before finalizing your test submission.</p>

            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold mb-6">
              <div>
                <span className="text-emerald-600 block text-lg font-black">{answeredCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Answered</span>
              </div>
              <div>
                <span className="text-amber-500 block text-lg font-black">{mfrCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Marked</span>
              </div>
              <div>
                <span className="text-rose-500 block text-lg font-black">{unansweredCount + unvisitedCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold">Unanswered</span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300"
              >
                Resume Test
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalSubmit('manual')}
                className="px-6 py-2 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-lg transition-colors"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Back Navigation Warning Modal ─── */}
      {showBackWarning && !result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-5">

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>

            {/* Strike counter */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`w-8 h-2 rounded-full transition-colors ${
                    n <= backPressCount
                      ? 'bg-rose-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 tracking-wider">
                Violation {backPressCount} of 3
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-3">
                Back Navigation Detected!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                You attempted to navigate away from the examination.
                {violationsRemaining > 0 ? (
                  <>
                    {' '}You have <span className="font-black text-rose-600 dark:text-rose-400">{violationsRemaining} violation{violationsRemaining !== 1 ? 's' : ''}</span> remaining before your test is automatically submitted.
                  </>
                ) : (
                  <> Your test is being submitted now.</>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBackWarning(false)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-lg transition-all"
            >
              Return to Examination
            </button>
          </div>
        </div>
      )}

      {/* ─── SCREEN LOCK VIOLATION MODAL — fully blocking, no escape ─── */}
      {!result && isExamStarted && showLockWarning && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            background: 'rgba(2,6,23,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          // Block all pointer events from reaching anything beneath
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-600 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5">

            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>

            {/* Strike counter bars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-2 flex-1 max-w-[60px] rounded-full transition-colors ${
                    n <= fullscreenViolationCount
                      ? 'bg-rose-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 tracking-wider">
                {fullscreenViolationCount >= 3 ? 'Auto-Submitting...' : `Violation ${fullscreenViolationCount} of 3`}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                {fullscreenViolationCount >= 3 ? 'Test Submitted' : 'Examination Screen Locked'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {fullscreenViolationCount >= 3
                  ? 'You had 3 security violations (exiting full screen, tab switching, or app switching). Your test has been automatically submitted.'
                  : `Security Alert: Exiting full screen, switching tabs, or opening other apps is strictly prohibited. You have ${3 - fullscreenViolationCount} warning${3 - fullscreenViolationCount !== 1 ? 's' : ''} remaining before automatic submission.`
                }
              </p>
            </div>

            {/* Only show re-enter button if not yet auto-submitted */}
            {fullscreenViolationCount < 3 && (
              <button
                type="button"
                onClick={async () => {
                  await enterFullscreen();
                  setIsFullscreen(true);
                  setShowLockWarning(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Re-enter Full Screen Examination
              </button>
            )}

            {fullscreenViolationCount >= 3 && (
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold">Submitting your answers...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
