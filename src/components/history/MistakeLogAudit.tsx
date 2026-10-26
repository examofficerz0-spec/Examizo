'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Maximize2,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Layers,
  ClipboardList,
  Target,
  FileText,
  Check,
} from 'lucide-react';
import { QuestionDiagram } from '@/components/ui/QuestionDiagram';

interface MistakeLogAuditProps {
  incorrectLog: any[];
  defaultExpanded?: boolean;
}

export function MistakeLogAudit({
  incorrectLog = [],
  defaultExpanded = true,
}: MistakeLogAuditProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [isMistakeCardExpanded, setIsMistakeCardExpanded] = useState(defaultExpanded);
  const [showAllMistakeSets, setShowAllMistakeSets] = useState(false);
  const [expandedTestQuestions, setExpandedTestQuestions] = useState<Record<string, boolean>>({});
  const [openTestGroups, setOpenTestGroups] = useState<Record<string, boolean>>({});
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({});
  const [activeLogTab, setActiveLogTab] = useState<'all' | 'mock' | 'practice'>('all');
  const [openDetailedExplanation, setOpenDetailedExplanation] = useState<Record<string, boolean>>({});

  const filteredLogItems = useMemo(() => {
    return (Array.isArray(incorrectLog) ? incorrectLog : []).filter((item) => {
      if (!item) return false;
      if (!logSearch.trim()) return true;
      const q = logSearch.toLowerCase();
      return (
        (item.question_text || '').toLowerCase().includes(q) ||
        (item.topic_tag || '').toLowerCase().includes(q) ||
        (item.test_title || '').toLowerCase().includes(q) ||
        (item.explanation || '').toLowerCase().includes(q)
      );
    });
  }, [incorrectLog, logSearch]);

  const mockCount = useMemo(() => {
    return filteredLogItems.filter(
      (i) => i && (i.test_type === 'mock' || i.attemptType === 'mock')
    ).length;
  }, [filteredLogItems]);

  const practiceCount = useMemo(() => {
    return filteredLogItems.filter(
      (i) => i && (i.test_type === 'practice' || i.attemptType !== 'mock')
    ).length;
  }, [filteredLogItems]);

  // Group incorrect items by Mock Test / Practice Set
  const groupedTestLogs = useMemo(() => {
    const groups: {
      testId: string;
      testTitle: string;
      testType: 'mock' | 'practice';
      attemptedAt?: string;
      items: any[];
    }[] = [];

    const groupMap = new Map<string, (typeof groups)[0]>();

    filteredLogItems.forEach((item) => {
      if (!item) return;
      const itemType = (item.test_type || (item.attemptType === 'mock' ? 'mock' : 'practice')) as
        | 'mock'
        | 'practice';
      if (activeLogTab !== 'all' && itemType !== activeLogTab) {
        return;
      }

      const testTitle =
        item.test_title || (item.topic_tag ? `Practice - ${item.topic_tag}` : 'Practice Examination');
      const testId = item.test_id || testTitle;

      if (!groupMap.has(testId)) {
        const newGroup = {
          testId,
          testTitle,
          testType: itemType,
          attemptedAt: item.attemptedAt,
          items: [],
        };
        groupMap.set(testId, newGroup);
        groups.push(newGroup);
      } else if (item.attemptedAt) {
        const existing = groupMap.get(testId)!;
        if (
          !existing.attemptedAt ||
          new Date(item.attemptedAt).getTime() > new Date(existing.attemptedAt).getTime()
        ) {
          existing.attemptedAt = item.attemptedAt;
        }
      }
      groupMap.get(testId)!.items.push(item);
    });

    // Ensure groups are sorted with latest attempted sets first
    groups.sort((a, b) => {
      const timeA = a.attemptedAt ? new Date(a.attemptedAt).getTime() : 0;
      const timeB = b.attemptedAt ? new Date(b.attemptedAt).getTime() : 0;
      return timeB - timeA;
    });

    return groups;
  }, [filteredLogItems, activeLogTab]);

  const isTestGroupOpen = (testId: string) => {
    return Boolean(openTestGroups[testId]);
  };

  const toggleTestGroup = (testId: string) => {
    setOpenTestGroups((prev) => {
      const isCurrentlyOpen = Boolean(prev[testId]);
      if (isCurrentlyOpen) {
        return {};
      }
      return { [testId]: true };
    });
  };

  const isQuestionOpen = (qKey: string) => {
    return Boolean(openQuestions[qKey]);
  };

  const toggleQuestion = (qKey: string) => {
    setOpenQuestions((prev) => ({
      ...prev,
      [qKey]: !prev[qKey],
    }));
  };

  const setAllGroupsExpanded = (expand: boolean) => {
    const nextGroupState: Record<string, boolean> = {};
    const nextQuestionState: Record<string, boolean> = {};
    groupedTestLogs.forEach((g) => {
      if (!g) return;
      nextGroupState[g.testId] = expand;
      (g.items || []).forEach((item, idx) => {
        const qKey = item?._id || `${g.testId}-q-${idx}`;
        nextQuestionState[qKey] = expand;
      });
    });
    setOpenTestGroups(nextGroupState);
    setOpenQuestions(nextQuestionState);
  };

  const renderQuestionItem = (item: any, qIdx: number, testId: string) => {
    if (!item) return null;
    const qKey = item._id || `${testId}-q-${qIdx}`;
    const isOpen = isQuestionOpen(qKey);
    const isDetailedOpen = Boolean(openDetailedExplanation[qKey]);

    const rawCorrect = item.correctOption ?? item.correct_option ?? 0;
    const correctOptIdx = !isNaN(Number(rawCorrect)) ? Number(rawCorrect) : 0;
    const rawUser = item.userSelectedOption ?? item.selected_option;
    const userOptIdx =
      rawUser !== null && rawUser !== undefined && !isNaN(Number(rawUser)) && Number(rawUser) >= 0
        ? Number(rawUser)
        : null;

    const correctOptText =
      Array.isArray(item.options) && item.options[correctOptIdx] !== undefined
        ? item.options[correctOptIdx]
        : `Option ${correctOptIdx + 1}`;

    const selectedOptText =
      userOptIdx !== null && Array.isArray(item.options) && item.options[userOptIdx] !== undefined
        ? item.options[userOptIdx]
        : userOptIdx !== null
        ? `Option ${userOptIdx + 1}`
        : 'Unanswered';

    return (
      <div
        key={qKey}
        className="border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-slate-700"
      >
        {/* Compact Question Header */}
        <div
          onClick={() => toggleQuestion(qKey)}
          className={`px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
            isOpen
              ? 'bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800'
              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
          }`}
        >
          {/* Left: Index + Topic Tag + Truncated Question Text */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-100/80 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-black text-[10px] sm:text-[11px] flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-900/50">
              Q{qIdx + 1}
            </span>
            {item.topic_tag && (
              <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0 hidden md:inline-flex border border-blue-100 dark:border-blue-900/50 truncate max-w-[130px]">
                {item.topic_tag}
              </span>
            )}
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">
              {item.question_text}
            </span>
          </div>

          {/* Right: Quick answer badges & Dropdown toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/40 hidden lg:inline-flex items-center gap-1 max-w-[170px] truncate">
              <XCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">Your: {selectedOptText}</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40 hidden lg:inline-flex items-center gap-1 max-w-[170px] truncate">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span className="truncate">Ans: {correctOptText}</span>
            </span>

            <span
              className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold rounded-lg flex items-center gap-1.5 transition-all ${
                isOpen
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700'
              }`}
            >
              <span>{isOpen ? 'Hide' : 'Solution'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </span>
          </div>
        </div>

        {/* Nested Dropdown Body (Full Question, Options, and Explanation) */}
        <div
          className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800">
              {/* Full Question Statement */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Full Question
                  </span>
                  {item.topic_tag && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.topic_tag}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed">
                  {item.question_text}
                </p>
                <QuestionDiagram
                  src={item.image_url || item.imageUrl || item.image}
                  alt={item.question_text}
                />
              </div>

              {/* Options Comparison Grid */}
              {Array.isArray(item.options) && item.options.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Options &amp; Breakdown
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                    {item.options.map((opt: string, optIdx: number) => {
                      const isSelected = userOptIdx === optIdx;
                      const isCorrect = correctOptIdx === optIdx;

                      let cardStyle =
                        'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';
                      if (isCorrect) {
                        cardStyle =
                          'bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500/20 font-bold';
                      } else if (isSelected) {
                        cardStyle =
                          'bg-rose-50/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-700 ring-1 ring-rose-500/20 font-bold';
                      }

                      const letterLabel = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 shadow-2xs transition-all ${cardStyle}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isSelected
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {letterLabel}
                            </span>
                            <span className="truncate leading-tight text-xs">{opt}</span>
                          </div>

                          {isCorrect && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-black uppercase shrink-0 flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" /> Correct Answer
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100 font-black uppercase shrink-0 flex items-center gap-1">
                              <X className="w-3 h-3 stroke-[3]" /> Your Selection
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Answer Key Summary Banner */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 font-extrabold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Correct Answer:{' '}
                    <span className="underline decoration-emerald-500/50 underline-offset-2">
                      Option {String.fromCharCode(65 + correctOptIdx)} ({correctOptText})
                    </span>
                  </span>
                </div>
                {userOptIdx !== null && (
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Your Selection: Option {String.fromCharCode(65 + userOptIdx)} ({selectedOptText})
                    </span>
                  </div>
                )}
              </div>

              {/* Explanation Box */}
              {item.explanation || item.detailed_explanation ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 space-y-2.5 shadow-2xs">
                  {item.explanation && (
                    <>
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <div className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
                          💡
                        </div>
                        <span className="font-extrabold text-xs">Explanation:</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap break-words">
                        {item.explanation}
                      </p>
                    </>
                  )}

                  {/* Detailed Step-by-Step Explanation Accordion */}
                  {item.detailed_explanation && (
                    <div
                      className={`${
                        item.explanation ? 'pt-2.5 border-t border-slate-100 dark:border-slate-800' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDetailedExplanation((prev) => ({
                            ...prev,
                            [qKey]: !prev[qKey],
                          }))
                        }
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center justify-between w-full group py-1 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>📘 View Step-by-Step Solution Breakdown</span>
                          {(() => {
                            const steps = String(item.detailed_explanation)
                              .split('\n')
                              .filter((l: string) => l.trim().length > 0);
                            if (steps.length > 1) {
                              return (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                                  {steps.length} steps
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-300 text-blue-500 shrink-0 ${
                            isDetailedOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </button>
                      <div
                        className={`grid transition-all duration-300 ease-in-out ${
                          isDetailedOpen
                            ? 'grid-rows-[1fr] opacity-100 mt-2.5'
                            : 'grid-rows-[0fr] opacity-0 mt-0 overflow-hidden'
                        }`}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="text-slate-800 dark:text-slate-200 font-mono text-[11px] sm:text-xs whitespace-pre-wrap break-words leading-relaxed bg-slate-50/90 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-2xs max-h-[600px] overflow-y-auto">
                            {item.detailed_explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-400 italic">
                  No additional explanation provided for this question.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTestGroupAccordion = (group: (typeof groupedTestLogs)[0]) => {
    const isOpen = isTestGroupOpen(group.testId);
    const isMock = group.testType === 'mock';

    return (
      <div
        key={group.testId}
        className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 transition-all duration-200 shadow-xs"
      >
        {/* Test Accordion Header */}
        <button
          type="button"
          onClick={() => toggleTestGroup(group.testId)}
          className={`w-full px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer select-none ${
            isOpen
              ? 'bg-slate-100/80 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isMock
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
              }`}
            >
              {isMock ? (
                <ClipboardList className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : (
                <Target className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {group.testTitle}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase ${
                    isMock
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {isMock ? 'Mock Test' : 'Practice Set'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {group.items.length} incorrect question{group.items.length === 1 ? '' : 's'} to review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              {group.items.length} {group.items.length === 1 ? 'Question' : 'Questions'}
            </span>
            <div
              className={`w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform duration-300 ${
                isOpen
                  ? 'rotate-180 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                  : 'rotate-0'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Level 1 Body: Questions List */}
        <div
          className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-3 sm:p-4 space-y-2.5 bg-slate-50/30 dark:bg-slate-950/30">
              {(() => {
                const showAllQs = Boolean(expandedTestQuestions[group.testId]);
                const visibleItems = showAllQs ? group.items : group.items.slice(0, 5);
                return (
                  <>
                    {visibleItems.map((item, qIdx) => renderQuestionItem(item, qIdx, group.testId))}
                    {group.items.length > 5 && (
                      <div className="pt-1.5 flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTestQuestions((prev) => ({
                              ...prev,
                              [group.testId]: !showAllQs,
                            }));
                          }}
                          className="px-4 py-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showAllQs ? 'Show fewer questions' : `Show all ${group.items.length} questions`}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${showAllQs ? 'rotate-180' : 'rotate-0'}`}
                          />
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        id="mistake-log-section"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 transition-all"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div
            onClick={() => incorrectLog.length > 0 && setIsMistakeCardExpanded(!isMistakeCardExpanded)}
            className="flex items-center gap-3 cursor-pointer select-none group flex-1"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Mistake Log &amp; Incorrect Answers Audit
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {incorrectLog.length} Question{incorrectLog.length === 1 ? '' : 's'}
                </span>
                {groupedTestLogs.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {groupedTestLogs.length} Test Set{groupedTestLogs.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Review questions answered incorrectly in mock tests &amp; practice sets with solution dropdowns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            {incorrectLog.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMistakeCardExpanded(!isMistakeCardExpanded)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  isMistakeCardExpanded
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50 shadow-2xs'
                }`}
              >
                <span>{isMistakeCardExpanded ? 'Collapse Tests' : 'View Test Sets'}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isMistakeCardExpanded ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Expand Window
            </button>
          </div>
        </div>

        {/* Collapsed / Expanded Content inside the Card */}
        {incorrectLog.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                No incorrect questions logged yet!
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Great job! As you attempt practice sets or mock tests, any incorrect answers will be logged here for revision.
              </p>
            </div>
          </div>
        ) : !isMistakeCardExpanded ? (
          /* Collapsed Teaser Banner */
          <div
            onClick={() => setIsMistakeCardExpanded(true)}
            className="p-3.5 px-4 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 cursor-pointer transition-all text-xs font-bold text-slate-600 dark:text-slate-300 group"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
              <span>
                {incorrectLog.length} questions available across {groupedTestLogs.length} test set
                {groupedTestLogs.length === 1 ? '' : 's'} for revision
              </span>
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1 group-hover:underline text-[11px] shrink-0">
              Click to expand test cards <ChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
        ) : (
          /* Expanded Content: Filter Tabs + Test Cards */
          <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
            {/* Filter Tabs */}
            {groupedTestLogs.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('all')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeLogTab === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All ({filteredLogItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('mock')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeLogTab === 'mock'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Mock Tests ({mockCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLogTab('practice')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeLogTab === 'practice'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Practice ({practiceCount})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMistakeCardExpanded(false)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  Hide Test Cards
                </button>
              </div>
            )}

            {groupedTestLogs.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                No questions found for the selected filter tab.
              </div>
            ) : (
              <div className="space-y-3">
                {(showAllMistakeSets ? groupedTestLogs : groupedTestLogs.slice(0, 5)).map((group) =>
                  renderTestGroupAccordion(group)
                )}

                {/* Show More / Show Less Button */}
                {groupedTestLogs.length > 5 && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllMistakeSets(!showAllMistakeSets)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-black text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <span>
                        {showAllMistakeSets
                          ? 'Show Less Test Sets'
                          : `Show More (${groupedTestLogs.length - 5} More Test Sets)`}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          showAllMistakeSets ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* POPUP LOG WINDOW MODAL */}
      {showLogModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogModal(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Window Header */}
            <div className="p-5 px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Mistake Log &amp; Incorrect Answers Audit
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold">
                      {filteredLogItems.length} {filteredLogItems.length === 1 ? 'Question' : 'Questions'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Mock test-wise hierarchical view with questions, answers, and step-by-step solutions.
                  </p>
                </div>
              </div>

              {/* Cross Close Button (X) */}
              <button
                onClick={() => setShowLogModal(false)}
                type="button"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Close Window"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Search Bar & Expand/Collapse All */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search incorrect questions by keyword, test title, topic, or explanation..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAllGroupsExpanded(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllGroupsExpanded(false)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Filter Tabs Bar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveLogTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLogTab === 'all'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> All Tests ({filteredLogItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLogTab('mock')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLogTab === 'mock'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Mock Tests ({mockCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLogTab('practice')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLogTab === 'practice'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" /> Practice Sets ({practiceCount})
                </button>
              </div>

              {/* Question Log Items List */}
              {groupedTestLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No matching incorrect questions found
                  </p>
                  <p className="text-[11px] text-slate-400">Try adjusting your search query or tab filters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedTestLogs.map((group) => renderTestGroupAccordion(group))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
