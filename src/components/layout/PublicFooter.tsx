'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/common/Logo';
import { Mail, ShieldCheck, ExternalLink, ArrowRight } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 relative z-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Brand & Organization Information */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <Logo size={44} />
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800">
                Official Assessment Portal
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              <strong className="text-slate-900 dark:text-white font-extrabold">Published by Develope Future.</strong> Standardized digital examination &amp; assessment platform for verified academic records, timed mock tests, and competitive entrance preparation.
            </p>

            <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Support: </span>
              <a
                href="mailto:info@examizo.com"
                className="text-blue-600 hover:text-blue-700 font-extrabold hover:underline transition-colors"
              >
                info@examizo.com
              </a>
            </div>
          </div>

          {/* Navigation Links Column 1 */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Platform &amp; Media
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-blue-600 transition-colors">Features</Link>
              </li>
              <li>
                <Link href="/#exams" className="hover:text-blue-600 transition-colors">Exams Covered</Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-blue-600 transition-colors flex items-center gap-1">
                  <span>Gallery Showcase</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded">New</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Portals Column 2 */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Legal &amp; Access
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 transition-colors">Sign In to Student Account</Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-blue-600 transition-colors">Create Free Account</Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <p>
            © 2026 Examizo (Develope Future). All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Proctored Assessment Security</span>
            </div>
            <span>•</span>
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-blue-600">Terms</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
