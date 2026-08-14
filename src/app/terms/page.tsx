'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/common/Logo';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  AlertCircle, 
  BookOpen, 
  Scale, 
  Sparkles 
} from 'lucide-react';

export default function TermsOfServicePage() {
  const lastUpdated = 'August 14, 2026';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Header Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={38} />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/25 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-10">
        
        {/* Title Header */}
        <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-extrabold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            <span>User Agreement &amp; Policies</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Terms of Service
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Published by <strong>Develope Future</strong> • Last Revised: {lastUpdated}
          </p>
        </div>

        {/* Overview Box */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-blue-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Standardized Assessment Code of Conduct</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            Welcome to Examizo. These Terms of Service constitute a legally binding agreement between you and <strong>Develope Future</strong> regarding your access to and use of our assessment software, question banks, timed mock tests, and analytics engines.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">1</span>
              <span>Account Registration &amp; Security</span>
            </h2>
            <p>
              To access daily practice sets, mock tests, and leaderboards, you must register for an Examizo student account. You agree to:
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-blue-600">
              <li>Provide accurate, current, and complete registration information.</li>
              <li>Maintain the confidentiality of your session credentials and password.</li>
              <li>Accept responsibility for all activities conducted under your primary account and sub-profiles.</li>
              <li>Notify our support team immediately of any suspected unauthorized access or security breach.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
              <span>Academic Integrity &amp; Proctoring Rules</span>
            </h2>
            <p>
              Examizo provides genuine examination simulations designed to evaluate actual student preparedness. Users must uphold the highest standards of academic honesty:
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-blue-600">
              <li><strong>No Automated Scripts:</strong> You may not use bots, automated scrapers, or browser tampering scripts to submit mock tests or artificially manipulate scores.</li>
              <li><strong>No Content Harvesting:</strong> Copying, scraping, republishing, or redistributing proprietary mock test questions, answer explanations, or DPP sets without written permission from Develope Future is strictly prohibited.</li>
              <li><strong>Fair Leaderboards:</strong> Attempts that violate timer integrity or exploit system vulnerabilities will result in leaderboard disqualification and account termination.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">3</span>
              <span>Intellectual Property Rights</span>
            </h2>
            <p>
              All software, assessment algorithms, user interface designs, logos, question banks, diagrams, and multimedia materials available on Examizo are the exclusive intellectual property of <strong>Develope Future</strong> and its licensors. You are granted a limited, personal, non-exclusive, non-transferable license to access practice materials solely for non-commercial educational study.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">4</span>
              <span>Service Availability &amp; Modifications</span>
            </h2>
            <p>
              Develope Future continuously upgrades examination algorithms, question repositories, and interface features. We reserve the right to modify, suspend, or discontinue any course track or practice module at any time with or without prior notice to ensure system security and compliance with the latest competitive exam syllabi.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">5</span>
              <span>Inquiries &amp; Contact</span>
            </h2>
            <p>
              For legal notices, permissions, or questions regarding these Terms of Service, please reach out to our legal department:
            </p>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-extrabold text-xs text-slate-900 dark:text-white">Develope Future (Legal &amp; Assessment Compliance)</p>
              <p className="text-xs text-slate-500">Email: <a href="mailto:info@examizo.com" className="text-blue-600 font-bold hover:underline">info@examizo.com</a></p>
              <p className="text-xs text-slate-500">Portal: <a href="https://examizo.com" className="text-blue-600 font-bold hover:underline">examizo.com</a></p>
            </div>
          </section>

        </div>

      </main>

      {/* Shared Public Footer */}
      <PublicFooter />

    </div>
  );
}
