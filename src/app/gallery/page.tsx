'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/common/Logo';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { getSwrCache, setSwrCache } from '@/lib/swrCache';
import { 
  ArrowRight, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Camera, 
  CheckCircle2, 
  ArrowLeft,
  Calendar,
  Tag
} from 'lucide-react';
import { PageLoader } from '@/components/common/PageLoader';

interface GalleryPhoto {
  id: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
  display_order: number;
  is_active: number;
  created_at?: string;
}

export default function GalleryPage() {
  const [mounted, setMounted] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lightbox Modal State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const cached = getSwrCache<GalleryPhoto[]>('student_gallery_cache');
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setPhotos(cached);
      setLoading(false);
    }

    fetch('/api/gallery', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.gallery)) {
          setPhotos(data.gallery);
          setSwrCache('student_gallery_cache', data.gallery);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredPhotos.length : null));
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredPhotos.length) % filteredPhotos.length : null));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]);

  const categories = ['All', ...Array.from(new Set(photos.map((p) => p.category).filter(Boolean)))];

  const filteredPhotos = photos.filter((photo) => {
    const matchesCat = selectedCategory === 'All' || photo.category === selectedCategory;
    const matchesSearch =
      photo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (photo.description && photo.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      photo.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const currentLightboxPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* 1. FIXED HEADER NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-900/5 transition-all duration-300">
        <div className="w-full px-4 sm:px-8 lg:px-12 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size={38} />
          </Link>

          {/* Animated Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
            {[
              { name: 'Home', href: '/' },
              { name: 'Features', href: '/#features' },
              { name: 'Exams Covered', href: '/#exams' },
              { name: 'Gallery', href: '/gallery', active: true },
            ].map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 group flex items-center justify-center overflow-hidden ${
                  link.active
                    ? 'text-blue-600 bg-blue-50/80 dark:bg-slate-800'
                    : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/60'
                }`}
              >
                <span className="relative z-10 group-hover:scale-105 transition-transform duration-200">{link.name}</span>
                {link.active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2.5px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Action Button - Get Started Only */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. MAIN GALLERY CONTENT */}
      <main className="relative z-10 flex-1 pt-24 sm:pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-black uppercase tracking-wider shadow-xs">
            <Camera className="w-3.5 h-3.5" />
            <span>Campus &amp; Proctored Hall Showcase</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            Examizo Live Media Gallery
          </h1>

          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Experience our national proctored testing environments, high-intensity problem-solving circles, smart digital examination halls, and student milestones.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 -translate-y-0.5'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search photos, topics, facilities..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <PageLoader
            inline
            title="Loading Campus Showcase"
            subtitle="Fetching high-resolution examination hall photos and campus media..."
            minHeight="min-h-[320px]"
          />
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200/80 space-y-4 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">No photos found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No gallery media match your current search criteria. Try selecting "All" or clear the search filter.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                onClick={() => setLightboxIndex(idx)}
                className="group cursor-pointer bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-2xl hover:border-blue-400/60 transition-all duration-500 flex flex-col justify-between"
              >
                {/* Photo Thumbnail */}
                <div className="relative aspect-[16/10] w-full bg-slate-950 overflow-hidden">
                  <img
                    src={photo.image_url}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    onError={(e: any) => {
                      e.target.src = '/images/exam_hall_1.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

                  {/* Category Pill on Image */}
                  <span className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-extrabold text-white shadow-sm">
                    {photo.category}
                  </span>

                  {/* Fullscreen Magnify Trigger */}
                  <div className="absolute bottom-4 right-4 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 shadow-md">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>

                {/* Card Information */}
                <div className="p-6 space-y-2.5">
                  <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {photo.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                    {photo.description || 'Proctored competitive exam hall session.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. BOTTOM CALL TO ACTION BANNER */}
        <div className="mt-16 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-600/20">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-black">Experience Real Exam Pressure Today</h2>
            <p className="text-blue-100 text-xs sm:text-sm font-medium max-w-xl">
              Join thousands of top aspirants taking timed DPPs and full-length mock exams designed to match the exact patterns of JEE, NEET, SSC, and UPSC.
            </p>
          </div>
          <Link
            href="/login"
            className="px-8 py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black text-sm shadow-lg transition-all hover:-translate-y-0.5 shrink-0 flex items-center gap-2"
          >
            <span>Start Free Practice</span>
            <ArrowRight className="w-4 h-4 text-slate-900" />
          </Link>
        </div>

      </main>

      {/* 4. LIGHTBOX MODAL */}
      {currentLightboxPhoto && lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
          {/* Close Button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left / Prev Arrow */}
          <button
            onClick={() =>
              setLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredPhotos.length) % filteredPhotos.length : null))
            }
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-50"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right / Next Arrow */}
          <button
            onClick={() =>
              setLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredPhotos.length : null))
            }
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-50"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Modal Content Box */}
          <div className="max-w-5xl w-full bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Image Section */}
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden">
              <img
                src={currentLightboxPhoto.image_url}
                alt={currentLightboxPhoto.title}
                className="max-w-full max-h-[65vh] object-contain"
                onError={(e: any) => {
                  e.target.src = '/images/exam_hall_1.jpg';
                }}
              />
            </div>

            {/* Photo Details Bar */}
            <div className="p-6 bg-slate-950 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-600/80 text-[10px] font-extrabold uppercase tracking-wider text-white">
                    {currentLightboxPhoto.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    Photo {lightboxIndex + 1} of {filteredPhotos.length}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{currentLightboxPhoto.title}</h3>
                {currentLightboxPhoto.description && (
                  <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
                    {currentLightboxPhoto.description}
                  </p>
                )}
              </div>

              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shrink-0 flex items-center gap-2"
              >
                <span>Try Live Practice</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. PUBLIC FOOTER */}
      <PublicFooter />

    </div>
  );
}
