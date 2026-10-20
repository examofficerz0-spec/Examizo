'use client';

import React from 'react';

export function isImageStr(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim();
  return (
    s.startsWith('data:image/') ||
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    /!\[(.*?)\]\((.*?)\)/.test(s) ||
    /\.(png|jpe?g|webp|svg)(\?.*)?$/i.test(s)
  );
}

interface OptionContentProps {
  text: string;
  className?: string;
  borderless?: boolean;
}

export function OptionContent({ text, className = '', borderless = false }: OptionContentProps) {
  if (!text || typeof text !== 'string') return null;
  const str = text.trim();

  // Case 1: Markdown image ![alt](url)
  const mdMatch = str.match(/!\[(.*?)\]\((.*?)\)/);
  if (mdMatch) {
    const alt = mdMatch[1] || 'Option Figure';
    const url = mdMatch[2];
    const textWithoutImg = str.replace(/!\[(.*?)\]\((.*?)\)/, '').trim();
    return (
      <div className={`flex flex-col items-center gap-1.5 py-1 min-w-0 ${className}`}>
        {textWithoutImg && <span className="leading-snug font-bold text-xs sm:text-sm text-center">{textWithoutImg}</span>}
        {borderless ? (
          <img
            src={url}
            alt={alt}
            className="max-h-20 sm:max-h-28 max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 max-w-full shadow-2xs">
            <img
              src={url}
              alt={alt}
              className="max-h-24 sm:max-h-32 max-w-full object-contain rounded-lg"
              loading="lazy"
            />
          </div>
        )}
      </div>
    );
  }

  // Case 2: Direct image URL or data URI
  if (str.startsWith('data:image/') || str.startsWith('http://') || str.startsWith('https://')) {
    if (borderless) {
      return (
        <div className={`flex flex-col items-center justify-center py-0.5 min-w-0 ${className}`}>
          <img
            src={str}
            alt="Option Figure"
            className="max-h-20 sm:max-h-28 max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      );
    }
    return (
      <div className={`flex flex-col items-center gap-1.5 py-1 min-w-0 ${className}`}>
        <div className="p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 max-w-full shadow-2xs">
          <img
            src={str}
            alt="Option Figure"
            className="max-h-24 sm:max-h-32 max-w-full object-contain rounded-lg"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  // Case 3: Label followed by URL (e.g. "Figure A: https://..." or "Option A: data:image/...")
  const prefixUrlMatch = str.match(/^([^:]+:)\s*(data:image\/[^\s]+|https?:\/\/[^\s]+)$/i);
  if (prefixUrlMatch) {
    const label = prefixUrlMatch[1];
    const url = prefixUrlMatch[2];
    return (
      <div className={`flex flex-col items-center gap-1.5 py-1 min-w-0 ${className}`}>
        <span className="leading-snug font-bold text-xs">{label}</span>
        {borderless ? (
          <img
            src={url}
            alt={label}
            className="max-h-20 sm:max-h-28 max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 max-w-full shadow-2xs">
            <img
              src={url}
              alt={label}
              className="max-h-24 sm:max-h-32 max-w-full object-contain rounded-lg"
              loading="lazy"
            />
          </div>
        )}
      </div>
    );
  }

  // Case 4: Standard text
  return <span className={`leading-snug ${className}`}>{str}</span>;
}
