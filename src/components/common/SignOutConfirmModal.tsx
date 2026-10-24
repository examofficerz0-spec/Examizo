'use client';

import React, { useEffect } from 'react';
import { LogOut, X, Loader2 } from 'lucide-react';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isSigningOut?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function SignOutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSigningOut = false,
  title = 'Sign Out of Examizo?',
  description = 'Are you sure you want to sign out? You will need to log back in to access your dashboard, practice sets, and mock tests.',
  confirmLabel = 'Yes, Sign Out',
  cancelLabel = 'Stay Signed In',
}: SignOutConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSigningOut) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSigningOut, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-dialog-title"
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSigningOut) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center relative text-slate-900 dark:text-white transition-all transform animate-in zoom-in-95 duration-150 select-none">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSigningOut}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <LogOut className="w-7 h-7 stroke-[2.2]" />
        </div>

        {/* Dialog Title */}
        <h3 id="signout-dialog-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {title}
        </h3>

        {/* Description / Confirmation prompt */}
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSigningOut}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-extrabold text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSigningOut}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-600/25 hover:shadow-rose-600/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <span>{confirmLabel}</span>
                <LogOut className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
