'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  X,
  Trash2,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Search
} from 'lucide-react';
import {
  BookmarkedQuestion,
  getSavedBookmarks,
  removeQuestionBookmark,
} from '@/lib/bookmarks';
import { OptionContent } from '@/components/ui/OptionContent';
import { QuestionDiagram } from '@/components/ui/QuestionDiagram';

interface BookmarkedQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
}

export const BookmarkedQuestionsModal: React.FC<BookmarkedQuestionsModalProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  const reloadBookmarks = () => {
    setBookmarks(getSavedBookmarks(studentId));
  };

  useEffect(() => {
    if (isOpen) {
      reloadBookmarks();
    }
  }, [isOpen, studentId]);

  useEffect(() => {
    const handleUpdate = () => {
      reloadBookmarks();
    };
    window.addEventListener('examizo:bookmarks-updated', handleUpdate);
    return () => window.removeEventListener('examizo:bookmarks-updated', handleUpdate);
  }, [studentId]);

  const distinctSubjects = useMemo(() => {
    const subs = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.subject) subs.add(b.subject);
    });
    return Array.from(subs);
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const qText = (b.question_text || '').toLowerCase();
      const sName = (b.subject || '').toLowerCase();
      const tTag = (b.topic_tag || '').toLowerCase();
      const qMatches =
        searchQuery.trim() === '' ||
        qText.includes(searchQuery.toLowerCase()) ||
        sName.includes(searchQuery.toLowerCase()) ||
        tTag.includes(searchQuery.toLowerCase());

      const subMatches =
        selectedSubject === 'all' ||
        (b.subject || '').toLowerCase() === selectedSubject.toLowerCase();

      return qMatches && subMatches;
    });
  }, [bookmarks, searchQuery, selectedSubject]);

  const handleToggleSolution = (id: string) => {
    setExpandedSolutions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRemove = (id: string) => {
    removeQuestionBookmark(id, studentId);
    reloadBookmarks();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shadow-xs shrink-0">
              <Bookmark className="w-5 h-5 fill-purple-600 dark:fill-purple-400 stroke-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Saved Questions for Revision
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                  {bookmarks.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tricky problems and key concepts flagged during your tests and practice sessions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        {bookmarks.length > 0 && (
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search saved questions or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {distinctSubjects.length > 0 && (
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {distinctSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Question List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {bookmarks.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-400 flex items-center justify-center mx-auto">
                <Bookmark className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                No bookmarked questions yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Click the <span className="font-bold text-purple-600 dark:text-purple-400">🔖 Bookmark</span> button while practicing or reviewing mock tests to save tricky questions here for quick revision before exams.
              </p>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No questions matched your search criteria.
            </div>
          ) : (
            filteredBookmarks.map((q, idx) => {
              const qId = String(q.id || q._id);
              const isExpanded = !!expandedSolutions[qId];

              return (
                <div
                  key={qId}
                  className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs hover:border-purple-300 dark:hover:border-purple-800/80 transition-all"
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        Q{idx + 1} • {q.subject || 'General'}
                      </span>
                      {q.topic_tag && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {q.topic_tag}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(qId)}
                      title="Remove Bookmark"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {q.question_text}
                  </div>

                  {/* Question Diagram / Image */}
                  {q.image_url && (
                    <div className="pt-1">
                      <QuestionDiagram
                        src={q.image_url}
                        alt="Question illustration"
                      />
                    </div>
                  )}

                  {/* Options List */}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((optText, optIdx) => {
                        const isCorrect = optIdx === q.correct_option;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <div className="flex-1">
                              <OptionContent text={optText} />
                            </div>
                            {isCorrect && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Solution Accordion */}
                  {(q.explanation || q.detailed_explanation) && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleToggleSolution(qId)}
                        className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide Solution & Theory' : 'View Detailed Solution'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 text-xs text-slate-700 dark:text-slate-200 space-y-1.5 animate-fade-in leading-relaxed">
                          {q.explanation && (
                            <p className="font-semibold">{q.explanation}</p>
                          )}
                          {q.detailed_explanation && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-line">
                              {q.detailed_explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Saved questions are preserved locally for quick revision anytime.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
