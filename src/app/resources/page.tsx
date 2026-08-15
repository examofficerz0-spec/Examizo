'use client';

import React, { useEffect, useState } from 'react';
import { DigiLockerGuard } from '@/components/ui/DigiLockerModal';
import { getClientUserCache, setClientUserCache } from '@/lib/clientCache';
import {
  FolderDown,
  FileText,
  Search,
  BookOpen,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  Eye,
  FileSpreadsheet,
  Lock,
  Clock
} from 'lucide-react';

interface ResourceItem {
  _id: string;
  course_id: string;
  title: string;
  description?: string;
  subject?: string;
  resource_type: 'PDF Book' | 'Study Notes' | 'Formula Sheet' | 'Reference Manual';
  file_url: string;
  file_size?: string;
  page_count?: number;
  created_at?: string;
}

export default function StudentResourcesPage() {
  const initialCache = getClientUserCache('__RESOURCES_CACHE__');
  const [resources, setResources] = useState<ResourceItem[]>(initialCache?.resources || []);
  const [courseName, setCourseName] = useState<string>(initialCache?.courseName || 'Selected Course');
  const [loading, setLoading] = useState(!initialCache);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Preview Modal State
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/resources');
      const data = await res.json();
      if (data.resources) {
        setResources(data.resources);
      }
      if (data.course?.name) {
        setCourseName(data.course.name);
      }
      setClientUserCache('__RESOURCES_CACHE__', {
        resources: data.resources || [],
        courseName: data.course?.name || 'Selected Course',
      });
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derive available subject tags
  const subjects = ['All', ...Array.from(new Set(resources.map((r) => r.subject || 'General')))];
  const resourceTypes = ['All', 'PDF Book', 'Study Notes', 'Formula Sheet', 'Reference Manual'];

  // Filtered resources
  const filtered = resources.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
    const matchesType = selectedType === 'All' || item.resource_type === selectedType;

    return matchesSearch && matchesSubject && matchesType;
  });

  const isComingSoon = !loading && resources.length === 0;

  return (
    <DigiLockerGuard courseName={courseName}>
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 animate-page-in pb-24 lg:pb-0 relative">
        
        {/* Main Content Area — Blurred when 0 resources exist */}
        <div className={`space-y-8 ${isComingSoon ? 'blur-md pointer-events-none select-none transition-all duration-500' : ''}`}>
          
          {/* Page Banner Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <FolderDown className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Resource Library & Digital PDF Books
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Course-specific E-books, study notes, formula sheets, and reference materials for <strong className="text-blue-600 dark:text-blue-400">{courseName}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {resources.length} Available Resources
              </span>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
            
            {/* Top Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search PDF books, formula sheets, topics, or subjects..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              
              {/* Subject Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Subject:</span>
                {subjects.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedSubject === sub
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Resource Type Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Type:</span>
                {resourceTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedType === type
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 h-64 animate-pulse space-y-4 shadow-xs">
                  <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl pt-2" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex items-center justify-center">
                  <FolderDown className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">No Resources Found</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  No course study materials match your search filters. Try selecting another subject or type.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-800 transition-all space-y-4 group"
                >
                  <div className="space-y-3">
                    
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {item.resource_type}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                        {item.subject || 'General'}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                        {item.description || 'Official course reference module and practice PDF book.'}
                      </p>
                    </div>
                  </div>

                  {/* Footer Details & Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                      <span>📄 {item.page_count || 120} Pages</span>
                      <span>💾 {item.file_size || '2.5 MB'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewResource(item)}
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Preview
                      </button>

                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs shadow-blue-500/20"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Universal Coming Soon Blur Overlay when 0 Resource PDFs exist */}
        {isComingSoon && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-950/60 backdrop-blur-xs rounded-3xl text-center min-h-[450px]">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-5 animate-in zoom-in-95 duration-300">
              {/* Glowing Icon */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <FolderDown className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md">
                  <Lock className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Resource Library
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-3">
                  Coming Soon
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                  Digital PDF books, formula sheets, and course study notes are currently being prepared by faculty.
                  This library will automatically unlock here as soon as the first resource PDF is published!
                </p>
              </div>

              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs">
                <Clock className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: '6s' }} />
                Check back soon for new PDF downloads
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PDF PREVIEW MODAL */}
      {previewResource && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewResource(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-md">
                  {previewResource.title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {previewResource.resource_type} • {previewResource.subject} • {previewResource.file_size}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewResource.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Open / Download PDF
                </a>
                <button
                  onClick={() => setPreviewResource(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 flex flex-col items-center justify-center">
              <iframe
                src={previewResource.file_url}
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                title={previewResource.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </DigiLockerGuard>
  );
}
