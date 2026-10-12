'use client';

import React, { useState, useEffect } from 'react';
import { ZoomIn, X } from 'lucide-react';

interface QuestionDiagramProps {
  src?: string;
  alt?: string;
  className?: string;
}

export function QuestionDiagram({ src, alt = 'Question Diagram', className = '' }: QuestionDiagramProps) {
  const [hasError, setHasError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src || '');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setHasError(false);
    setTriedProxy(false);
    setCurrentSrc(src || '');
  }, [src]);

  if (!src || hasError) return null;

  const handleError = () => {
    if (!triedProxy && src.startsWith('http')) {
      setTriedProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(src)}`);
    } else {
      setHasError(true);
    }
  };

  return (
    <>
      <div className={`relative group p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl inline-block max-w-full my-3 ${className}`}>
        <img
          src={currentSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={handleError}
          onClick={() => setIsZoomed(true)}
          className="max-h-72 max-w-full object-contain rounded-lg shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
        />
        <button
          type="button"
          onClick={() => setIsZoomed(true)}
          className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm flex items-center gap-1 text-[11px] font-bold"
          title="Zoom Diagram"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Zoom</span>
        </button>
      </div>

      {isZoomed && (
        <div
          className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ZoomIn className="w-4 h-4 text-blue-500" /> {alt}
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={currentSrc}
              alt={alt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
