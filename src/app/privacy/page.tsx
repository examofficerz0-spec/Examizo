'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/common/Logo';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  Mail, 
  Server,
  UserCheck
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'August 14, 2026';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Header Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={48} />
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
              href="/login"
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Legal Policy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Published by <strong>Develope Future</strong> • Last Revised: {lastUpdated}
          </p>
        </div>

        {/* Overview Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-blue-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Commitment to Student Data Protection</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            Examizo is developed, published, and operated by <strong>Develope Future</strong>. We are committed to safeguarding the personal information, academic assessments, timed test responses, and profile records of our students and test-takers with institutional-grade data security.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">1</span>
              <span>Information We Collect</span>
            </h2>
            <p>
              When you register and use Examizo for competitive exam preparation and Daily Practice Problems (DPP), we collect the following categories of information:
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-blue-600">
              <li><strong>Account Credentials:</strong> Name, email address, password hashes, and optional multi-profile avatars.</li>
              <li><strong>Academic Track Selection:</strong> Target examination courses (e.g., JEE Advanced, NEET, UPSC, SSC, Banking, School Foundations).</li>
              <li><strong>Assessment &amp; Test Records:</strong> Question responses, options selected, time spent per question, test scores, subject accuracy, XP transactions, and test attempt history.</li>
              <li><strong>Technical &amp; Telemetry Data:</strong> Browser type, operating system, IP address, device resolution, and session timestamps used solely for platform stability and proctoring fraud prevention.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
              <span>How We Use Your Data</span>
            </h2>
            <p>
              Develope Future utilizes the information collected exclusively for educational and platform service delivery:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Real-Time Evaluation</h4>
                <p className="text-xs text-slate-500">Grading mock tests, calculating negative marking, and generating detailed chapter-wise analytics.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">National Leaderboards</h4>
                <p className="text-xs text-slate-500">Ranking student performance and XP benchmarks within your locked course track.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Revision Assistance</h4>
                <p className="text-xs text-slate-500">Providing personalized weak-topic recommendations and bookmarking tricky questions.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Session Security</h4>
                <p className="text-xs text-slate-500">Enforcing single-session security tokens and preventing unauthorized examination breaches.</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">3</span>
              <span>Data Protection &amp; Storage Architecture</span>
            </h2>
            <p>
              All user records, assessment logs, and database entries are stored in encrypted Cloudflare D1 distributed database clusters. We enforce TLS 1.3 encryption in transit, strict HTTP-only authentication cookies, and role-based administrative isolation. We do not sell or monetize student personal information to third-party advertisers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">4</span>
              <span>Student Account &amp; Deletion Rights</span>
            </h2>
            <p>
              You maintain complete control over your account. You may request account deactivation, data export, or profile deletion at any time. When an account is deleted by administrators or upon user request, session tokens are immediately invalidated and personal identifiers are permanently scrubbed.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center">5</span>
              <span>Contact &amp; Privacy Support</span>
            </h2>
            <p>
              If you have any questions regarding this Privacy Policy or wish to exercise your data rights, please contact our legal and support team:
            </p>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-extrabold text-xs text-slate-900 dark:text-white">Develope Future (Examizo Assessment Platform)</p>
              <p className="text-xs text-slate-500">Email: <a href="mailto:info@examizo.com" className="text-blue-600 font-bold hover:underline">info@examizo.com</a></p>
              <p className="text-xs text-slate-500">Official Portal: <a href="https://examizo.com" className="text-blue-600 font-bold hover:underline">examizo.com</a></p>
            </div>
          </section>

        </div>

      </main>

      {/* Shared Public Footer */}
      <PublicFooter />

    </div>
  );
}
