'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { DigiLockerGuard } from '@/components/ui/DigiLockerModal';
import {
  FolderDown,
  BookOpen,
  Layers,
  GraduationCap,
  FileText,
  Search,
  Download,
  Eye,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  X,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  Lightbulb,
  Check,
  Copy,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { CURATED_ACADEMIC_RESOURCES, CuratedResource, StudyChapter } from '@/lib/academicResourceData';

interface ResourceItem {
  id: string;
  _id?: string;
  course_id?: string;
  title: string;
  description: string;
  subject: string;
  resource_type: string;
  file_url: string;
  file_size: string;
  page_count: number;
  created_at?: string;
  download_count?: number;
}

const RESOURCE_CATEGORIES = [
  { id: 'all', label: 'All Resources', icon: Layers },
  { id: 'PDF Book', label: 'PDF E-Books', icon: BookOpen },
  { id: 'Formula Sheet', label: 'Formula Sheets', icon: FileCheck },
  { id: 'Study Module', label: 'Study Modules', icon: GraduationCap },
  { id: 'Previous Year Paper', label: 'PYQ Papers', icon: FileText },
];

// Curated default high-yield resources pointing to the same-origin PDF generator
const DEFAULT_COURSE_RESOURCES: ResourceItem[] = [
  {
    id: 'res-def-1',
    title: 'Complete Mathematics High-Yield Formula Book',
    description: 'Comprehensive compendium of algebra formulas, mensuration geometries, ratios, and quick shortcut methods.',
    subject: 'Mathematics',
    resource_type: 'Formula Sheet',
    file_url: '/api/resources/pdf?id=res-def-1',
    file_size: '3.4 MB',
    page_count: 28,
  },
  {
    id: 'res-def-2',
    title: 'NCERT Exemplar Theory & Diagram Study Module',
    description: 'Diagram-intensive chapter summaries, labeled anatomical/physical illustrations, and solved NCERT exemplar exercises.',
    subject: 'Science',
    resource_type: 'Study Module',
    file_url: '/api/resources/pdf?id=res-def-2',
    file_size: '8.1 MB',
    page_count: 64,
  },
  {
    id: 'res-def-3',
    title: 'Logical Reasoning & Mental Ability Handbook',
    description: 'Direction tests, pattern completions, coding-decoding, series, and non-verbal reasoning test models.',
    subject: 'Reasoning',
    resource_type: 'PDF Book',
    file_url: '/api/resources/pdf?id=res-def-3',
    file_size: '5.2 MB',
    page_count: 52,
  },
  {
    id: 'res-def-4',
    title: 'National Scholarship & Olympiad Past Solved Papers',
    description: 'Previous 5-year solved assessment questions with step-by-step marking schemes and analytical tips.',
    subject: 'General Science',
    resource_type: 'Previous Year Paper',
    file_url: '/api/resources/pdf?id=res-def-4',
    file_size: '6.7 MB',
    page_count: 46,
  },
  {
    id: 'res-def-5',
    title: 'English Grammar & Vocabulary Speed Sheet',
    description: 'Tenses matrix, active-passive voice rules, sentence correction rules, and high-frequency academic vocabulary.',
    subject: 'English',
    resource_type: 'Formula Sheet',
    file_url: '/api/resources/pdf?id=res-def-5',
    file_size: '2.1 MB',
    page_count: 18,
  },
  {
    id: 'res-def-6',
    title: 'Social Science Quick Revision Maps & Timelines',
    description: 'Chronological timeline tables, geographic topographical maps, and civics concept maps for rapid exam recall.',
    subject: 'Social Science',
    resource_type: 'Study Module',
    file_url: '/api/resources/pdf?id=res-def-6',
    file_size: '4.8 MB',
    page_count: 36,
  },
];

export default function ResourcesListPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [courseName, setCourseName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Preview Modal State
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);
  const [previewMode, setPreviewMode] = useState<'study' | 'pdf'>('study');
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [revealedDrillIndex, setRevealedDrillIndex] = useState<Record<number, boolean>>({});
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  const [expandedSolutions, setExpandedSolutions] = useState<Record<number, boolean>>({ 0: true });

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/resources')
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch')))
      .then((data) => {
        if (data.course?.name) {
          setCourseName(data.course.name);
        }
        if (Array.isArray(data.resources) && data.resources.length > 0) {
          // Normalize file_url if pointing to broken dummy url
          const sanitized = data.resources.map((r: any) => {
            let url = r.file_url;
            if (!url || url.includes('w3.org') || url.includes('dummy.pdf')) {
              url = `/api/resources/pdf?id=${r._id || r.id}`;
            }
            return { ...r, file_url: url };
          });
          setResources(sanitized);
        } else {
          setResources(DEFAULT_COURSE_RESOURCES);
        }
      })
      .catch((err) => {
        console.warn('[Resources] Fetch error, using default resources:', err);
        setResources(DEFAULT_COURSE_RESOURCES);
      })
      .finally(() => setLoading(false));
  }, []);

  // Keyboard shortcut listener for preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewResource) {
        setPreviewResource(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewResource]);

  // Distinct subjects
  const distinctSubjects = useMemo(() => {
    const subs = new Set<string>();
    resources.forEach((r) => {
      if (r.subject) subs.add(r.subject);
    });
    return Array.from(subs);
  }, [resources]);

  // Filtered resources list
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' ||
        item.resource_type?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSub =
        selectedSubject === 'all' ||
        item.subject?.toLowerCase() === selectedSubject.toLowerCase();

      return matchesSearch && matchesCat && matchesSub;
    });
  }, [resources, searchQuery, selectedCategory, selectedSubject]);

  const handleOpenPreview = (item: ResourceItem, preferredMode: 'study' | 'pdf' = 'study') => {
    setPreviewResource(item);
    setPreviewMode(preferredMode);
    setActiveChapterIndex(0);
    setDocSearchQuery('');
    setIframeLoading(true);
    setRevealedDrillIndex({});
    setExpandedSolutions({ 0: true });
  };

  // Resolve structured content for active preview
  const activeCuratedData: CuratedResource | null = useMemo(() => {
    if (!previewResource) return null;
    return (
      CURATED_ACADEMIC_RESOURCES[previewResource.id] ||
      CURATED_ACADEMIC_RESOURCES['res-def-2']
    );
  }, [previewResource]);

  const activeChapter: StudyChapter | null = useMemo(() => {
    if (!activeCuratedData || !activeCuratedData.chapters) return null;
    return activeCuratedData.chapters[activeChapterIndex] || activeCuratedData.chapters[0];
  }, [activeCuratedData, activeChapterIndex]);

  // Filtered chapter sections based on in-document search
  const filteredFormulas = useMemo(() => {
    if (!activeChapter) return [];
    if (!docSearchQuery.trim()) return activeChapter.formulas;
    const q = docSearchQuery.toLowerCase();
    return activeChapter.formulas.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.expr.toLowerCase().includes(q) ||
        f.notes.toLowerCase().includes(q)
    );
  }, [activeChapter, docSearchQuery]);

  const filteredPrinciples = useMemo(() => {
    if (!activeChapter) return [];
    if (!docSearchQuery.trim()) return activeChapter.keyPrinciples;
    const q = docSearchQuery.toLowerCase();
    return activeChapter.keyPrinciples.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tag?.toLowerCase().includes(q)
    );
  }, [activeChapter, docSearchQuery]);

  const filteredExemplars = useMemo(() => {
    if (!activeChapter) return [];
    if (!docSearchQuery.trim()) return activeChapter.exemplarProblems;
    const q = docSearchQuery.toLowerCase();
    return activeChapter.exemplarProblems.filter(
      (ex) =>
        ex.question.toLowerCase().includes(q) ||
        ex.examTip.toLowerCase().includes(q) ||
        ex.solutionSteps.some((step) => step.toLowerCase().includes(q))
    );
  }, [activeChapter, docSearchQuery]);

  const handleCopyFormula = (expr: string) => {
    navigator.clipboard?.writeText(expr);
    setCopiedFormula(expr);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <DigiLockerGuard>
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 animate-page-in pb-24 lg:pb-8">
          
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B192C] via-blue-900 to-indigo-900 text-white p-6 sm:p-8 shadow-xl border border-blue-800/40">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -top-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/25 text-blue-200 border border-blue-400/30 inline-flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Curated Digital Library
                  </span>
                  {courseName && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/20">
                      🎓 {courseName}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ⚡ Instant Fast Previews
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  Academic Resources &amp; E-Books
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
                  Official syllabus-aligned PDF textbooks, revision formula cheat sheets, solved previous year papers, and high-yield study modules with lightning-fast interactive reading.
                </p>
              </div>

              {/* Total Resource Counter Pill */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4 shrink-0 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-blue-600/60 border border-white/20 flex items-center justify-center text-white">
                  <FolderDown className="w-6 h-6 stroke-[1.75]" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white leading-none">
                    {resources.length}
                  </div>
                  <div className="text-[11px] font-bold text-blue-200 mt-1 uppercase tracking-wider">
                    Available Materials
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search resources, topics, or subjects (e.g., Mathematics, Algebra, Optics, Grammar)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Subject Dropdown Filter */}
              {distinctSubjects.length > 0 && (
                <div className="sm:w-56 shrink-0">
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full py-3 px-3.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs cursor-pointer"
                  >
                    <option value="all">All Subjects ({resources.length})</option>
                    {distinctSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {RESOURCE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                const count =
                  cat.id === 'all'
                    ? resources.length
                    : resources.filter(
                        (r) => r.resource_type?.toLowerCase() === cat.id.toLowerCase()
                      ).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-xs ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resources Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl space-y-4 animate-pulse shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
                  </div>
                  <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            /* Empty State */
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xs max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FolderDown className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  No matching resources found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search query, clearing filters, or switching to &ldquo;All Resources&rdquo;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedSubject('all');
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResources.map((item) => {
                const isPdfBook = item.resource_type === 'PDF Book';
                const isFormula = item.resource_type === 'Formula Sheet';
                const isPYQ = item.resource_type === 'Previous Year Paper';

                const badgeBg = isPdfBook
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40'
                  : isFormula
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200/60 dark:border-purple-800/40'
                  : isPYQ
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40';

                const iconColor = isPdfBook
                  ? 'text-blue-600 dark:text-blue-400'
                  : isFormula
                  ? 'text-purple-600 dark:text-purple-400'
                  : isPYQ
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400';

                return (
                  <div
                    key={item.id}
                    className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 rounded-3xl p-5 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    {/* Top Section */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        {/* Type Icon */}
                        <div
                          className={`w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0 ${iconColor} group-hover:scale-105 transition-transform`}
                        >
                          {isPdfBook && <BookOpen className="w-5 h-5 stroke-[1.75]" />}
                          {isFormula && <FileCheck className="w-5 h-5 stroke-[1.75]" />}
                          {isPYQ && <FileText className="w-5 h-5 stroke-[1.75]" />}
                          {!isPdfBook && !isFormula && !isPYQ && (
                            <GraduationCap className="w-5 h-5 stroke-[1.75]" />
                          )}
                        </div>

                        {/* Subject Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${badgeBg}`}
                        >
                          {item.subject}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Footer & Actions */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      {/* Meta pills */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> {item.page_count} Pages
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> {item.file_size}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(item, 'study')}
                          className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Preview</span>
                        </button>

                        <a
                          href={`${item.file_url}${item.file_url.includes('?') ? '&' : '?'}download=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </DigiLockerGuard>

      {/* DUAL-ENGINE HIGH-PERFORMANCE PREVIEW MODAL */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            ref={modalRef}
            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${
              isFullscreen ? 'fixed inset-2 z-50 h-[calc(100vh-16px)]' : 'max-w-5xl h-[92vh]'
            }`}
          >
            {/* Modal Top Navigation Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/80">
              
              {/* Document Identity */}
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {previewResource.title}
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40 shrink-0">
                      {previewResource.subject}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {previewResource.page_count} Pages &bull; {previewResource.resource_type} &bull; Official Curriculum
                  </p>
                </div>
              </div>

              {/* Mode Switcher & Action Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                
                {/* Engine Mode Switcher Tabs */}
                <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-300/50 dark:border-slate-700/50 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('study')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewMode === 'study'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Study Reader</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMode('pdf');
                      setIframeLoading(true);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewMode === 'pdf'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Native PDF</span>
                  </button>
                </div>

                {/* Font Scaling (for Study Mode) */}
                {previewMode === 'study' && (
                  <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                    <button
                      type="button"
                      title="Decrease font size"
                      onClick={() => setFontSizeMultiplier((prev) => Math.max(0.85, prev - 0.1))}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-black px-1 text-slate-600 dark:text-slate-300">
                      {Math.round(fontSizeMultiplier * 100)}%
                    </span>
                    <button
                      type="button"
                      title="Increase font size"
                      onClick={() => setFontSizeMultiplier((prev) => Math.min(1.35, prev + 0.1))}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 transition-colors cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Download Direct Button */}
                <a
                  href={`${previewResource.file_url}${previewResource.file_url.includes('?') ? '&' : '?'}download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                {/* Open in New Window */}
                <a
                  href={previewResource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open PDF in new window"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewResource(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 relative">
              
              {/* MODE 1: INTERACTIVE STUDY READER (INSTANT < 5ms, NO EXTERNAL BLOCK) */}
              {previewMode === 'study' && activeCuratedData && (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50/50 dark:bg-slate-950">
                  
                  {/* Left Sidebar / Chapter Navigation */}
                  <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 sm:p-4 flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Course Units ({activeCuratedData.chapters.length})
                      </span>
                    </div>

                    {/* Chapter Tabs */}
                    <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto scrollbar-none">
                      {activeCuratedData.chapters.map((chap, idx) => {
                        const isCurrent = idx === activeChapterIndex;
                        return (
                          <button
                            key={chap.id}
                            type="button"
                            onClick={() => {
                              setActiveChapterIndex(idx);
                              setDocSearchQuery('');
                            }}
                            className={`p-2.5 rounded-2xl text-left transition-all shrink-0 md:w-full flex items-start gap-2.5 cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                                isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0 pr-1">
                              <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider truncate">
                                {chap.unit}
                              </div>
                              <div className="text-xs font-extrabold leading-tight truncate">
                                {chap.title}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick In-Chapter Search */}
                    <div className="relative mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 hidden md:block">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search formulas or topics..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-2 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {docSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDocSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Content Area: Structured Interactive Reader */}
                  <div
                    className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6"
                    style={{ fontSize: `${fontSizeMultiplier * 100}%` }}
                  >
                    {activeChapter && (
                      <div className="space-y-6 max-w-3xl mx-auto">
                        
                        {/* Chapter Banner */}
                        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-blue-800/40 relative overflow-hidden">
                          <div className="relative z-10 space-y-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/15 text-blue-200 border border-white/20">
                              {activeChapter.unit}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                              {activeChapter.title}
                            </h2>
                            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
                              {activeChapter.overview}
                            </p>
                          </div>
                        </div>

                        {/* Search Filter Alert if Active */}
                        {docSearchQuery && (
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-bold text-blue-700 dark:text-blue-300">
                            <span>Filtering results for &ldquo;{docSearchQuery}&rdquo;</span>
                            <button
                              type="button"
                              onClick={() => setDocSearchQuery('')}
                              className="text-blue-600 dark:text-blue-400 underline cursor-pointer"
                            >
                              Clear search
                            </button>
                          </div>
                        )}

                        {/* High-Yield Formulas Section */}
                        {filteredFormulas.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                High-Yield Formulas &amp; Equalities
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {filteredFormulas.map((f, i) => (
                                <div
                                  key={i}
                                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-amber-500/40 transition-colors space-y-2 relative group"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                      {f.title}
                                    </h4>
                                    <button
                                      type="button"
                                      title="Copy formula"
                                      onClick={() => handleCopyFormula(f.expr)}
                                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                      {copiedFormula === f.expr ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>

                                  <div className="px-3 py-2 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 rounded-xl font-mono text-xs font-black text-amber-950 dark:text-amber-200 tracking-wide">
                                    {f.expr}
                                  </div>

                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {f.notes}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Core Principles & Rules Section */}
                        {filteredPrinciples.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Bookmark className="w-3.5 h-3.5" />
                              </div>
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Fundamental Principles &amp; Diagram Rules
                              </h3>
                            </div>

                            <div className="space-y-3">
                              {filteredPrinciples.map((p, i) => (
                                <div
                                  key={i}
                                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                                      {p.tag || 'Core Rule'}
                                    </span>
                                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                      {p.title}
                                    </h4>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                    {p.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Solved NCERT / Olympiad Exemplar Problems */}
                        {filteredExemplars.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <GraduationCap className="w-3.5 h-3.5" />
                              </div>
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                NCERT Exemplar Solved Problems with Marking Scheme
                              </h3>
                            </div>

                            <div className="space-y-4">
                              {filteredExemplars.map((ex, i) => {
                                const isExpanded = !!expandedSolutions[i];
                                return (
                                  <div
                                    key={i}
                                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 text-[10px] font-black flex items-center justify-center shrink-0">
                                            Q{i + 1}
                                          </span>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                            Exemplar Question
                                          </span>
                                        </div>
                                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                                          {ex.question}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedSolutions((prev) => ({
                                            ...prev,
                                            [i]: !prev[i],
                                          }))
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold transition-all shrink-0 cursor-pointer"
                                      >
                                        {isExpanded ? 'Hide Solution' : 'Show Solution'}
                                      </button>
                                    </div>

                                    {/* Step-by-Step Solution Breakdown */}
                                    {isExpanded && (
                                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 space-y-2">
                                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                                            Step-by-Step Solution
                                          </div>
                                          {ex.solutionSteps.map((step, sIdx) => (
                                            <div
                                              key={sIdx}
                                              className="text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed"
                                            >
                                              {step}
                                            </div>
                                          ))}
                                        </div>

                                        {/* Exam Tip Callout */}
                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
                                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                          <div>
                                            <span className="font-black">Examiner Note: </span>
                                            {ex.examTip}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quick Drill / Self Assessment */}
                        {activeChapter.quickDrills && activeChapter.quickDrills.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <HelpCircle className="w-3.5 h-3.5" />
                              </div>
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Rapid Self-Check Drills
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {activeChapter.quickDrills.map((drill, dIdx) => {
                                const isRevealed = !!revealedDrillIndex[dIdx];
                                return (
                                  <div
                                    key={dIdx}
                                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2 flex flex-col justify-between"
                                  >
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {drill.question}
                                    </p>

                                    {isRevealed ? (
                                      <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 text-xs font-bold border border-purple-200/60 dark:border-purple-800/40 animate-fade-in">
                                        Answer: {drill.answer}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setRevealedDrillIndex((prev) => ({
                                            ...prev,
                                            [dIdx]: true,
                                          }))
                                        }
                                        className="py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[11px] font-black transition-colors self-start cursor-pointer"
                                      >
                                        Reveal Answer
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Navigation Footer between Chapters */}
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            disabled={activeChapterIndex === 0}
                            onClick={() => {
                              setActiveChapterIndex((prev) => Math.max(0, prev - 1));
                              setDocSearchQuery('');
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              activeChapterIndex === 0
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Previous Unit</span>
                          </button>

                          <div className="text-xs font-black text-slate-400">
                            Unit {activeChapterIndex + 1} of {activeCuratedData.chapters.length}
                          </div>

                          <button
                            type="button"
                            disabled={activeChapterIndex === activeCuratedData.chapters.length - 1}
                            onClick={() => {
                              setActiveChapterIndex((prev) =>
                                Math.min(activeCuratedData.chapters.length - 1, prev + 1)
                              );
                              setDocSearchQuery('');
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              activeChapterIndex === activeCuratedData.chapters.length - 1
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            }`}
                          >
                            <span>Next Unit</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: NATIVE PDF EMBED (SAME ORIGIN, FAST STREAM, NEVER REFUSES CONNECTION) */}
              {previewMode === 'pdf' && (
                <div className="flex-1 w-full h-full relative flex flex-col">
                  {/* Top Notification Bar for PDF Engine */}
                  <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-800/60 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                    <span className="flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        Streaming authentic standard PDF binary directly from local server engine.
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('study')}
                      className="font-bold underline hover:text-blue-950 dark:hover:text-white cursor-pointer"
                    >
                      Switch to Study Reader
                    </button>
                  </div>

                  {/* Loading Spinner for PDF iframe */}
                  {iframeLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs space-y-3">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                        Loading high-resolution academic document...
                      </p>
                    </div>
                  )}

                  {/* Same-Origin PDF Stream iframe */}
                  <iframe
                    src={`${previewResource.file_url}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
                    title={previewResource.title}
                    onLoad={() => setIframeLoading(false)}
                    className="w-full flex-1 border-none bg-slate-200 dark:bg-slate-950"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
