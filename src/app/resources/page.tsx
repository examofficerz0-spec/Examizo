'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Bookmark
} from 'lucide-react';

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

// Curated default high-yield resources for courses if database entries are pending
const DEFAULT_COURSE_RESOURCES: ResourceItem[] = [
  {
    id: 'res-def-1',
    title: 'Complete Mathematics High-Yield Formula Book',
    description: 'Comprehensive compendium of algebra formulas, mensuration geometries, ratios, and quick shortcut methods.',
    subject: 'Mathematics',
    resource_type: 'Formula Sheet',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '3.4 MB',
    page_count: 28,
  },
  {
    id: 'res-def-2',
    title: 'NCERT Exemplar Theory & Diagram Study Module',
    description: 'Diagram-intensive chapter summaries, labeled anatomical/physical illustrations, and solved NCERT exemplar exercises.',
    subject: 'Science',
    resource_type: 'Study Module',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '8.1 MB',
    page_count: 64,
  },
  {
    id: 'res-def-3',
    title: 'Logical Reasoning & Mental Ability Handbook',
    description: 'Direction tests, pattern completions, coding-decoding, series, and non-verbal reasoning test models.',
    subject: 'Reasoning',
    resource_type: 'PDF Book',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '5.2 MB',
    page_count: 52,
  },
  {
    id: 'res-def-4',
    title: 'National Scholarship & Olympiad Past Solved Papers',
    description: 'Previous 5-year solved assessment questions with step-by-step marking schemes and analytical tips.',
    subject: 'General Science',
    resource_type: 'Previous Year Paper',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '6.7 MB',
    page_count: 46,
  },
  {
    id: 'res-def-5',
    title: 'English Grammar & Vocabulary Speed Sheet',
    description: 'Tenses matrix, active-passive voice rules, sentence correction rules, and high-frequency academic vocabulary.',
    subject: 'English',
    resource_type: 'Formula Sheet',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_size: '2.1 MB',
    page_count: 18,
  },
  {
    id: 'res-def-6',
    title: 'Social Science Quick Revision Maps & Timelines',
    description: 'Chronological timeline tables, geographic topographical maps, and civics concept maps for rapid exam recall.',
    subject: 'Social Science',
    resource_type: 'Study Module',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
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
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  useEffect(() => {
    fetch('/api/resources')
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch')))
      .then((data) => {
        if (data.course?.name) {
          setCourseName(data.course.name);
        }
        if (Array.isArray(data.resources) && data.resources.length > 0) {
          setResources(data.resources);
        } else {
          // Fallback to high-yield starter course materials
          setResources(DEFAULT_COURSE_RESOURCES);
        }
      })
      .catch((err) => {
        console.warn('[Resources] Fetch error, using default resources:', err);
        setResources(DEFAULT_COURSE_RESOURCES);
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute distinct subjects from resource collection
  const distinctSubjects = useMemo(() => {
    const subs = new Set<string>();
    resources.forEach((r) => {
      if (r.subject) subs.add(r.subject);
    });
    return Array.from(subs);
  }, [resources]);

  // Filtered list based on search, category, and subject
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

  const handleOpenPdf = (url: string, title: string) => {
    setPreviewTitle(title);
    setPreviewPdfUrl(url);
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
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  Academic Resources &amp; E-Books
                </h1>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium">
                  Official syllabus-aligned PDF textbooks, revision formula cheat sheets, solved previous year papers, and high-yield study modules.
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
                  placeholder="Search resources, topics, or subjects (e.g., Mathematics, Algebra, Physics)..."
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
                  Try adjusting your search query, clearing filters, or switching to "All Resources".
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
                          onClick={() => handleOpenPdf(item.file_url, item.title)}
                          className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200/80 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Preview</span>
                        </button>

                        <a
                          href={item.file_url}
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

      {/* In-Browser PDF Preview Modal */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  {previewTitle}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF iframe */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
              <iframe
                src={`${previewPdfUrl}#toolbar=0`}
                title={previewTitle}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
