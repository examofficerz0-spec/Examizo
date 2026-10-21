'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  BookOpen,
  FileCheck,
  FileText,
  GraduationCap,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Share2,
  Check,
} from 'lucide-react';
import { CURATED_ACADEMIC_RESOURCES } from '@/lib/academicResourceData';

interface ResourceMeta {
  id: string;
  title: string;
  description?: string;
  subject: string;
  resource_type: string;
  file_size?: string;
  page_count?: number;
}

export default function FullPageResourceViewer() {
  const params = useParams();
  const router = useRouter();
  const resourceId = (params?.id as string) || 'res-def-2';

  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Default lookup from curated resources
  const curated = CURATED_ACADEMIC_RESOURCES[resourceId];

  const [resource, setResource] = useState<ResourceMeta>({
    id: resourceId,
    title: curated?.title || 'Academic Resource PDF Document',
    description: curated?.description || 'Official curriculum syllabus material.',
    subject: curated?.subject || 'Curriculum',
    resource_type: curated?.resource_type || 'Study Module',
    file_size: curated?.file_size || '5.0 MB',
    page_count: curated?.page_count || 32,
  });

  useEffect(() => {
    // Attempt to fetch matching resource meta from API if custom resource
    fetch('/api/resources')
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed')))
      .then((data) => {
        if (Array.isArray(data.resources)) {
          const matched = data.resources.find(
            (r: any) => String(r.id) === resourceId || String(r._id) === resourceId
          );
          if (matched) {
            setResource({
              id: matched.id || matched._id,
              title: matched.title,
              description: matched.description,
              subject: matched.subject || 'General',
              resource_type: matched.resource_type || 'PDF Book',
              file_size: matched.file_size || '4.0 MB',
              page_count: matched.page_count || 24,
            });
          }
        }
      })
      .catch(() => {
        // Fallback already pre-set from curated dictionary
      });
  }, [resourceId]);

  const pdfUrl = `/api/resources/pdf?id=${encodeURIComponent(resourceId)}`;
  const downloadUrl = `/api/resources/pdf?id=${encodeURIComponent(resourceId)}&download=true`;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleReloadIframe = () => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const isFormula = resource.resource_type === 'Formula Sheet';
  const isPYQ = resource.resource_type === 'Previous Year Paper';
  const isBook = resource.resource_type === 'PDF Book';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans select-none">
      
      {/* ─── Top Full-Width Navigation & Action Bar ─── */}
      <header className="h-16 bg-[#0B192C] border-b border-blue-900/40 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20 shadow-md">
        
        {/* Left Side: Back Button & Title Info */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/resources"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-black text-white transition-all shrink-0 border border-white/15"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Resources</span>
          </Link>

          <div className="h-6 w-px bg-blue-800/60 hidden sm:block shrink-0" />

          {/* Document Icon & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shrink-0 border border-blue-400/30">
              {isFormula && <FileCheck className="w-4 h-4" />}
              {isPYQ && <FileText className="w-4 h-4" />}
              {isBook && <BookOpen className="w-4 h-4" />}
              {!isFormula && !isPYQ && !isBook && <GraduationCap className="w-4 h-4" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-md md:max-w-lg">
                  {resource.title}
                </h1>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
                  {resource.subject}
                </span>
              </div>
              <p className="text-[10px] text-blue-200/80 truncate hidden sm:block">
                {resource.resource_type} &bull; {resource.page_count} Pages &bull; {resource.file_size}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Reload Iframe Button */}
          <button
            type="button"
            title="Reload PDF document"
            onClick={handleReloadIframe}
            className="p-2 rounded-xl text-blue-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer hidden sm:flex items-center justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Share / Copy Link Button */}
          <button
            type="button"
            title="Copy document URL"
            onClick={handleShare}
            className="p-2 rounded-xl text-blue-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer flex items-center justify-center"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Open Raw in New Window */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new window"
            className="p-2 rounded-xl text-blue-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Direct Download Button */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download PDF</span>
          </a>
        </div>
      </header>

      {/* ─── Main Viewport: Full Page PDF Embed ─── */}
      <main className="flex-1 w-full relative bg-[#525659] overflow-hidden">
        
        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xs space-y-4 text-white">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-1">
              <h2 className="text-sm font-black text-white">Loading Academic Document...</h2>
              <p className="text-xs text-blue-200/80">
                Streaming high-resolution PDF for {resource.title}
              </p>
            </div>
          </div>
        )}

        {/* Same-Origin Native Full Page PDF Frame */}
        <iframe
          key={iframeKey}
          src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
          title={resource.title}
          onLoad={() => setLoading(false)}
          className="w-full h-full border-none block"
          allow="autoplay; fullscreen"
        />

        {/* Mobile / Restricted Webview Helper Banner */}
        <div className="absolute bottom-3 left-3 right-3 sm:hidden z-10 pointer-events-none">
          <div className="p-3 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between text-xs text-white pointer-events-auto shadow-xl">
            <span className="text-[11px] text-slate-300 truncate pr-2">
              Viewing on phone? Use Download for offline reading.
            </span>
            <a
              href={downloadUrl}
              download
              className="px-2.5 py-1 bg-blue-600 rounded-lg text-[10px] font-black shrink-0"
            >
              Download
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
