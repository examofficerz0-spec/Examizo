'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/common/Logo';
import { 
  BookOpen, 
  Trophy, 
  Target, 
  Zap, 
  BarChart3, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Award,
  Users,
  Brain,
  GraduationCap
} from 'lucide-react';

const TYPEWRITER_PHRASES = [
  'Academic Precision',
  'Topic-Wise DPPs',
  'Full Mock Tests',
  'Weekly DPP',
  'Course-Wise Leaderboard',
  'Performance Analytics',
];

const HERO_IMAGES = [
  '/images/exam_hall_1.jpg',
  '/images/exam_hall_2.jpg',
  '/images/exam_hall_3.jpg',
  '/images/exam_hall_4.jpg',
];

export default function LandingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  // Typewriter + Backspacing animation state
  const [textIndex, setTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Background Hero Image Carousel State
  const [heroImgIndex, setHeroImgIndex] = useState(0);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHeroImgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3000);
    return () => clearInterval(heroTimer);
  }, []);

  useEffect(() => {
    const targetWord = TYPEWRITER_PHRASES[textIndex];
    let timer: NodeJS.Timeout;

    if (!isDeleting && currentText === targetWord) {
      // Pause at full word for 2.2 seconds before backspacing
      timer = setTimeout(() => setIsDeleting(true), 2200);
    } else if (isDeleting && currentText === '') {
      // Switch to next phrase after backspacing is complete
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
    } else {
      // Character typing (80ms) and deleting (40ms) speed
      const speed = isDeleting ? 40 : 80;
      timer = setTimeout(() => {
        setCurrentText(
          isDeleting
            ? targetWord.substring(0, currentText.length - 1)
            : targetWord.substring(0, currentText.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, textIndex]);

  useEffect(() => {
    fetch('/api/courses', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.courses && Array.isArray(data.courses)) {
          // Filter out school / K-12 courses (Class 3 to 12)
          const isSchoolCourse = (name: string, category?: string) => {
            const catLower = (category || '').toLowerCase();
            if (catLower.includes('school') || catLower.includes('board') || catLower.includes('class')) return true;
            const lower = (name || '').toLowerCase();
            return /\b(class|grade|cbse|icse|board|school|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\b/.test(lower) ||
                   /\bclass\s*(3|4|5|6|7|8|9|10|11|12)\b/.test(lower);
          };

          const competitive = data.courses.filter((c: any) => !isSchoolCourse(c.name, c.category));
          setCourses(competitive);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCourses(false));
  }, []);

  // Purely dynamic competitive courses from Admin DB (up to 5 max, no dummy data)
  const displayCompetitive = React.useMemo(() => {
    const badges = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
    ];

    const icons = [GraduationCap, BookOpen, Zap, Award, Target];

    return courses.slice(0, 5).map((c, idx) => ({
      id: c._id || idx,
      name: c.name,
      description: c.description || 'Comprehensive exam preparation track.',
      icon: icons[idx % icons.length],
      badge: badges[idx % badges.length],
    }));
  }, [courses]);
  // Scroll position state for dynamic navbar color transition
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* Soft Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] bg-blue-200/40 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -right-40 w-[35rem] h-[35rem] bg-indigo-200/30 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] bg-sky-200/40 rounded-full blur-[128px]" />
      </div>

      {/* 1. DYNAMIC FIXED HEADER NAVBAR (Transparent Dark on Hero -> Crisp Frosted White on Scroll) */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-900/5'
            : 'bg-[#070B16]/70 backdrop-blur-xl backdrop-saturate-150 border-b border-white/10 shadow-sm shadow-black/30'
        }`}
      >
        <div className="w-full px-4 sm:px-8 lg:px-12 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo size={38} textColor={isScrolled ? 'text-slate-900 dark:text-white' : 'text-white'} />
          </Link>

          {/* Animated Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
            {[
              { name: 'Features', href: '#features' },
              { name: 'Exams Covered', href: '#exams' },
              { name: 'How It Works', href: '#how-it-works' },
            ].map((link, i) => (
              <a
                key={i}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 group flex items-center justify-center overflow-hidden ${
                  isScrolled
                    ? 'text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:bg-blue-50/80 dark:hover:bg-slate-800/80'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="relative z-10 group-hover:scale-105 transition-transform duration-200">{link.name}</span>
                <span
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2.5px] rounded-full transition-all duration-300 group-hover:w-3/4 ${
                    isScrolled
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                />
              </a>
            ))}
          </nav>

          {/* Action Button - Get Started Only */}
          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="px-5 py-2.5 text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT (pt-20 compensates for fixed header) */}
      <main className="relative z-10 flex-1 pt-20">
        
        {/* 2. FULL-SCREEN HERO SECTION WITH BOTTOM GRADIENT FADE */}
        <section className="relative z-10 w-full min-h-[calc(100vh-80px)] sm:min-h-screen flex flex-col justify-between overflow-hidden bg-[#070B16] -mt-20 pt-24 sm:pt-28 pb-14 sm:pb-20">
          
          {/* Edge-to-Edge Sliding Background Carousel */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div
              className="flex w-full h-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${heroImgIndex * 100}%)` }}
            >
              {HERO_IMAGES.map((src) => (
                <div
                  key={src}
                  className="w-full h-full shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${src})` }}
                />
              ))}
            </div>
            {/* Deep Dark Glass Overlay */}
            <div className="absolute inset-0 bg-[#070B16]/82 backdrop-blur-[1.5px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#070B16]/85 via-[#070B16]/88 to-transparent" />
          </div>

          {/* Smooth Fade at Bottom to Match Main Page Background Color (#F8FAFC) */}
          <div className="absolute bottom-0 inset-x-0 h-36 sm:h-48 bg-gradient-to-t from-slate-50 via-slate-50/70 to-transparent pointer-events-none z-10" />

          {/* Inner Content Container */}
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-between relative z-20">
            
            {/* Top Bar inside Hero */}
            <div className="flex items-center justify-between gap-3 w-full mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-black shadow-md shadow-blue-600/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Proctored Hall Simulation</span>
              </div>

              <div className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>NEXT-GEN COMPETITIVE EXAM PORTAL</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/80 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto • {heroImgIndex + 1} / {HERO_IMAGES.length}</span>
              </div>
            </div>

            {/* Center Content */}
            <div className="max-w-4xl mx-auto text-center space-y-6 my-auto">
              <div className="sm:hidden inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-[10px] font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>NEXT-GEN COMPETITIVE EXAM PORTAL</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.15]">
                <span>Master Competitive Exams with</span>
                <span className="block mt-2 text-2xl sm:text-4xl lg:text-5xl font-black min-h-[1.3em]">
                  <span className="text-white font-black">
                    {currentText || '\u00A0'}
                  </span>
                  <span className="inline-block w-1 sm:w-1.5 h-[0.8em] bg-blue-500 ml-2 rounded-full animate-cursor-blink align-baseline shadow-md shadow-blue-400/80" />
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
                Examizo provides topic-wise practice sets, full-length timed mock tests, instant analytics, and national leaderboards engineered for top aspirants.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5"
                >
                  <span>Start Free Practice Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#121827] hover:bg-[#1C253C] text-white font-black text-sm sm:text-base border border-slate-700/80 shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In to Account</span>
                </Link>
              </div>
            </div>

            {/* Bottom Bar: Trust Badges & Carousel Dots */}
            <div className="pt-8 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  <span>Free Registration</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  <span>Full Pattern Mock Exams</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  <span>Instant Score &amp; Rank Analytics</span>
                </div>
              </div>

              {/* Pagination indicators on bottom right */}
              <div className="flex items-center gap-1.5 shrink-0">
                {HERO_IMAGES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setHeroImgIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      idx === heroImgIndex ? 'w-6 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-600'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* 3. STUDENT PORTAL UI MOCKUP PREVIEW (Hidden Below First Screen Fold, Visible Only On Scroll) */}
        <section className="relative z-10 pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="relative bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-2xl shadow-slate-200/60 overflow-hidden">
              
              {/* Fake Window Header Bar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-mono font-semibold text-slate-400">examizo.com/student/practice-session</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200/70 px-3 py-1 rounded-full text-xs font-bold text-blue-700">
                  <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>Time Remaining: 02:45:12</span>
                </div>
              </div>

              {/* Practice Session Card Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Question Section */}
                <div className="md:col-span-2 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-blue-600">Question 14 of 90</span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">JEE Advanced • Physics</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">
                    A particle moves along the x-axis with velocity v(t) = 3t² - 6t. Calculate the total displacement of the particle from t = 0 to t = 4 seconds.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {[
                      { text: '16 units', selected: true },
                      { text: '32 units', selected: false },
                      { text: '8 units', selected: false },
                      { text: '24 units', selected: false },
                    ].map((opt, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between transition-all ${
                          opt.selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                        }`}
                      >
                        <span>{String.fromCharCode(65 + i)}. {opt.text}</span>
                        {opt.selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Stats Preview Panel */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3">Live Session Metrics</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500">Answered</span>
                        <span className="text-xs font-black text-emerald-600">12 / 15</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500">Accuracy</span>
                        <span className="text-xs font-black text-blue-600">93.3%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500">Projected Rank</span>
                        <span className="text-xs font-black text-amber-600">#4 (Top 1%)</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className="w-full py-3 text-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all block"
                  >
                    Try Live Practice →
                  </Link>
                </div>
              </div>
            </div>
        </section>

        {/* 4. KEY FEATURES SECTION */}
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3.5 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-extrabold uppercase tracking-wider">
              <span>Why Choose Examizo</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Engineered for Academic Excellence
            </h2>
            <p className="text-slate-600 text-base font-normal">
              Everything you need to systematically prepare, test, and outperform in competitive examinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 space-y-4 group">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Topic-Wise Practice</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Break down complex subjects into targeted daily practice sets (DPPs) with step-by-step solutions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-600/5 transition-all duration-300 space-y-4 group">
              <div className="w-13 h-13 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Real Exam Simulator</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Experience exact test interfaces, countdown timers, negative marking logic, and section switching.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-600/5 transition-all duration-300 space-y-4 group">
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Live Leaderboards</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Compete with thousands of students nationwide, earn XP, track ranks, and challenge your study peers.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-600/5 transition-all duration-300 space-y-4 group">
              <div className="w-13 h-13 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">In-Depth Analytics</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Identify weak chapters, time taken per question, accuracy breakdowns, and rank predictions.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-600/5 transition-all duration-300 space-y-4 group">
              <div className="w-13 h-13 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Adaptive Revision</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Smart revision flags allow you to bookmark tricky questions and re-attempt them before final exams.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-600/5 transition-all duration-300 space-y-4 group">
              <div className="w-13 h-13 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Verified Content</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                All questions and solutions are created and peer-reviewed by expert faculties and top rankers.
              </p>
            </div>
          </div>
        </section>

        {/* 5. EXAMS COVERED SECTION */}
        <section id="exams" className="py-20 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-slate-900">Targeted Exam Preparation</h2>
              <p className="text-slate-600 text-sm font-medium">Dynamically updated competitive courses & test series aligned with latest syllabi.</p>
            </div>

            {/* Dynamic Self-Adjusting Competitive Courses Flex Layout */}
            {loadingCourses ? (
              <div className="text-center py-10 text-slate-400 font-semibold text-sm animate-pulse">
                Loading active competitive courses...
              </div>
            ) : displayCompetitive.length > 0 ? (
              <div className="flex flex-wrap items-stretch justify-center gap-5 max-w-6xl mx-auto">
                {displayCompetitive.map((exam, i) => (
                  <div
                    key={exam.id || i}
                    className="flex-1 min-w-[240px] max-w-[300px] p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 text-center space-y-3.5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <exam.icon className="w-9 h-9 mx-auto text-blue-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-base font-black text-slate-900">{exam.name}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {exam.description}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <span className={`inline-block px-3 py-1 rounded-lg text-[11px] font-extrabold border ${exam.badge}`}>
                        Full Course & Test Series
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-xl mx-auto p-8 rounded-3xl bg-gradient-to-b from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/80 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 animate-pulse text-blue-600" />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-block px-3.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black uppercase tracking-wider">
                    Coming Soon
                  </span>
                  <h3 className="text-xl font-black text-slate-900">New Competitive Courses Launching Soon!</h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                    Our academic team is currently preparing dynamic competitive entrance exam tracks. New courses added in the Admin Portal will appear here automatically (up to 5 max).
                  </p>
                </div>
              </div>
            )}

            {/* Classes 3 to 12 Foundation & Board Mention Banner */}
            <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">Classes 3 to 12 School & Board Preparation</h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
                    We also offer complete practice sets, chapter DPPs, and board test series for <strong className="text-slate-800">Classes 3 through 12</strong> (CBSE, ICSE & State Boards).
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 hover:shadow-blue-600/35 transition-all shrink-0 text-center flex items-center justify-center gap-2"
              >
                <span>Explore School Courses</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 6. HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3.5 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Three Steps to Rank 1</h2>
            <p className="text-slate-600 text-sm font-medium">Getting started takes less than two minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-4 shadow-xs">
              <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center mx-auto shadow-md shadow-blue-600/20">1</span>
              <h3 className="text-lg font-extrabold text-slate-900">Create Your Account</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Sign up with Google or Email and select your target examination course.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-4 shadow-xs">
              <span className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center mx-auto shadow-md shadow-indigo-600/20">2</span>
              <h3 className="text-lg font-extrabold text-slate-900">Solve Daily DPPs & Mocks</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Attempt timed tests and topic-wise practice sets with instant evaluation.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 text-center space-y-4 shadow-xs">
              <span className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">3</span>
              <h3 className="text-lg font-extrabold text-slate-900">Analyze & Rank Up</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Review performance metrics, fix weak spots, and top the leaderboard.
              </p>
            </div>
          </div>
        </section>

        {/* 7. BOTTOM CTA BANNER */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-10 sm:p-16 text-center space-y-7 shadow-2xl shadow-blue-600/20">
            <div className="relative z-10 max-w-3xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Ready to Elevate Your Exam Preparation?
              </h2>
              <p className="text-blue-100 text-sm sm:text-base font-medium">
                Join Examizo today and experience precision testing designed to help you achieve your dream rank.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-extrabold text-base hover:bg-slate-100 shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-700/60 hover:bg-blue-700/90 text-white font-extrabold text-base border border-blue-400/40 transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 8. PUBLIC FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 text-slate-500 py-10 px-4 sm:px-6 lg:px-8 relative z-10 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <span className="text-slate-400 font-medium">| Academic Precision Portal</span>
          </div>

          <div className="flex items-center gap-6 font-bold text-slate-600">
            <Link href="/login" className="hover:text-blue-600 transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-blue-600 transition-colors">Register</Link>
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#exams" className="hover:text-blue-600 transition-colors">Exams</a>
          </div>

          <p className="text-slate-400 font-medium">
            © 2026 Examizo. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
