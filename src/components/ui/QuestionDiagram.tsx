'use client';

import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Image as ImageIcon } from 'lucide-react';

interface QuestionDiagramProps {
  src?: string;
  imageUrl?: string;
  image?: string;
  alt?: string;
  className?: string;
}

export function QuestionDiagram({ src, imageUrl, image, alt = 'Question Diagram', className = '' }: QuestionDiagramProps) {
  const initialSrc = src || imageUrl || image || '';
  const [hasError, setHasError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    const raw = src || imageUrl || image || '';
    setHasError(false);
    setTriedProxy(false);
    setCurrentSrc(raw);
    setZoomScale(1);
  }, [src, imageUrl, image]);

  if (!currentSrc || hasError) return null;

  const isDataUri = currentSrc.startsWith('data:');
  const isHttp = currentSrc.startsWith('http://') || currentSrc.startsWith('https://');

  const handleError = () => {
    if (!triedProxy && isHttp) {
      setTriedProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(currentSrc)}`);
    } else {
      setHasError(true);
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale((prev) => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale((prev) => Math.max(prev - 0.3, 0.6));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(1);
  };

  return (
    <>
      <div className={`relative group p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl inline-block max-w-full my-3 shadow-xs ${className}`}>
        <div className="overflow-hidden rounded-lg flex items-center justify-center bg-white dark:bg-slate-900/60 min-h-[80px]">
          <img
            src={currentSrc}
            alt={alt}
            onError={handleError}
            onClick={() => {
              setZoomScale(1);
              setIsZoomed(true);
            }}
            loading="lazy"
            decoding="async"
            className="max-h-72 max-w-full object-contain cursor-pointer hover:scale-[1.01] transition-transform duration-200"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setZoomScale(1);
            setIsZoomed(true);
          }}
          className="absolute bottom-4 right-4 bg-slate-900/85 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center gap-1.5 text-[11px] font-bold backdrop-blur-xs"
          title="Click to Zoom Diagram"
        >
          <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
          <span>Zoom</span>
        </button>
      </div>

      {isZoomed && (
        <div
          className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & Zoom Controls */}
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <span className="truncate max-w-md">{alt}</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-500 min-w-[42px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

                <button
                  type="button"
                  onClick={() => setIsZoomed(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Diagram Viewer */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl min-h-[350px]">
              <img
                src={currentSrc}
                alt={alt}
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-[75vh] object-contain rounded-lg transition-transform duration-150"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
