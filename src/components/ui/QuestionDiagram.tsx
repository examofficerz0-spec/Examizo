'use client';

import React, { useState, useEffect } from 'react';

interface QuestionDiagramProps {
  src?: string;
  alt?: string;
  className?: string;
}

export function QuestionDiagram({ src, alt = 'Question Diagram', className = '' }: QuestionDiagramProps) {
  const [hasError, setHasError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src || '');

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
    <div className={`p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl inline-block max-w-full my-3 ${className}`}>
      <img
        src={currentSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={handleError}
        className="max-h-72 max-w-full object-contain rounded-lg shadow-xs"
      />
    </div>
  );
}
