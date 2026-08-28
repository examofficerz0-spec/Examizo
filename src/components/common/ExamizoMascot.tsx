'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ExamizoMascotProps {
  /** Size of the mascot in pixels */
  size?: number;
  /** Whether to auto-animate (for loading screens) */
  autoAnimate?: boolean;
  /** Whether to show the name label below */
  showLabel?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Examizo Mascot — An animated closed book character with a graduation cap.
 * 
 * Animations:
 * - Idle: gentle floating bob + cap tassel sway
 * - Touch/Click: book bounces, eyes sparkle, cap tips, arm waves
 * - Loading: continuous gentle bounce with sparkle particles
 */
export const ExamizoMascot: React.FC<ExamizoMascotProps> = ({
  size = 120,
  autoAnimate = false,
  showLabel = false,
  className = '',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const sparkleIdRef = useRef(0);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle touch/click interaction
  const handleInteraction = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Generate random sparkle positions
    const newSparkles = Array.from({ length: 5 }, () => ({
      id: ++sparkleIdRef.current,
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 5,
    }));
    setSparkles(newSparkles);

    animTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
      setSparkles([]);
    }, 1200);
  }, [isAnimating]);

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, []);

  const scale = size / 120;

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      style={{ width: size, minHeight: size + (showLabel ? 24 : 0) }}
    >
      {/* Mascot SVG */}
      <svg
        viewBox="0 0 120 130"
        width={size}
        height={size * (130 / 120)}
        className={`cursor-pointer transition-transform duration-200 active:scale-90 ${
          autoAnimate ? 'animate-mascot-float' : ''
        } ${isAnimating ? 'animate-mascot-bounce' : ''}`}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
        role="img"
        aria-label="Examizo mascot — a cute book with a graduation cap"
      >
        <defs>
          {/* Book cover gradient */}
          <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="50%" stopColor="#3730a3" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          {/* Book spine gradient */}
          <linearGradient id="bookSpine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          {/* Gold accent */}
          <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          {/* Cap gradient */}
          <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          {/* Eye sparkle */}
          <radialGradient id="eyeShine" cx="35%" cy="35%" r="50%">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="#dbeafe" />
          </radialGradient>
          {/* Shadow */}
          <filter id="mascotShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1e1b4b" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="60" cy="126" rx="28" ry="4" fill="#1e1b4b" opacity="0.12">
          {autoAnimate && (
            <animate attributeName="rx" values="28;24;28" dur="2s" repeatCount="indefinite" />
          )}
        </ellipse>

        {/* === BOOK BODY === */}
        <g filter="url(#mascotShadow)" className={isAnimating ? 'animate-mascot-wiggle' : ''}>
          {/* Book spine (left side) */}
          <rect x="28" y="38" width="8" height="72" rx="3" fill="url(#bookSpine)" />
          {/* Spine gold bands */}
          <rect x="28" y="48" width="8" height="3" rx="1" fill="url(#goldAccent)" opacity="0.8" />
          <rect x="28" y="58" width="8" height="3" rx="1" fill="url(#goldAccent)" opacity="0.8" />
          <rect x="28" y="90" width="8" height="3" rx="1" fill="url(#goldAccent)" opacity="0.8" />

          {/* Book cover (front) */}
          <rect x="34" y="36" width="56" height="76" rx="5" fill="url(#bookCover)" />
          
          {/* Cover gold border frame */}
          <rect x="39" y="41" width="46" height="66" rx="3" fill="none" stroke="url(#goldAccent)" strokeWidth="1.5" opacity="0.6" />

          {/* Cover inner gold rectangle */}
          <rect x="43" y="45" width="38" height="28" rx="2" fill="none" stroke="url(#goldAccent)" strokeWidth="1" opacity="0.4" />

          {/* Star decorations on cover */}
          <polygon points="50,48 51,51 54,51 52,53 53,56 50,54 47,56 48,53 46,51 49,51" fill="#fbbf24" opacity="0.5">
            {(autoAnimate || isAnimating) && (
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
            )}
          </polygon>
          <polygon points="74,48 75,51 78,51 76,53 77,56 74,54 71,56 72,53 70,51 73,51" fill="#fbbf24" opacity="0.5">
            {(autoAnimate || isAnimating) && (
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.8s" repeatCount="indefinite" />
            )}
          </polygon>

          {/* Pages (visible at bottom) */}
          <rect x="34" y="105" width="56" height="6" rx="2" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5" />
          <line x1="36" y1="107" x2="88" y2="107" stroke="#cbd5e1" strokeWidth="0.3" />
          <line x1="36" y1="109" x2="88" y2="109" stroke="#cbd5e1" strokeWidth="0.3" />
        </g>

        {/* === FACE === */}
        <g>
          {/* Left eye */}
          <ellipse cx="50" cy="72" rx="7" ry="7.5" fill="white" stroke="#312e81" strokeWidth="1" />
          <ellipse cx="50" cy="72" rx="4.5" ry="5" fill="#1e3a5f" />
          <circle cx="48" cy="70" r="2" fill="url(#eyeShine)" />
          <circle cx="52" cy="74" r="1" fill="white" opacity="0.5" />
          {/* Blink animation */}
          {(autoAnimate || isAnimating) && (
            <ellipse cx="50" cy="72" rx="7" ry="7.5" fill="url(#bookCover)">
              <animate
                attributeName="ry"
                values="0;0;0;7.5;7.5;7.5;7.5;7.5;7.5;7.5;7.5;7.5;0;0;7.5"
                dur="4s"
                repeatCount="indefinite"
              />
            </ellipse>
          )}

          {/* Right eye */}
          <ellipse cx="74" cy="72" rx="7" ry="7.5" fill="white" stroke="#312e81" strokeWidth="1" />
          <ellipse cx="74" cy="72" rx="4.5" ry="5" fill="#1e3a5f" />
          <circle cx="72" cy="70" r="2" fill="url(#eyeShine)" />
          <circle cx="76" cy="74" r="1" fill="white" opacity="0.5" />
          {/* Blink animation */}
          {(autoAnimate || isAnimating) && (
            <ellipse cx="74" cy="72" rx="7" ry="7.5" fill="url(#bookCover)">
              <animate
                attributeName="ry"
                values="0;0;0;7.5;7.5;7.5;7.5;7.5;7.5;7.5;7.5;7.5;0;0;7.5"
                dur="4s"
                repeatCount="indefinite"
              />
            </ellipse>
          )}

          {/* Sparkle eyes on touch */}
          {isAnimating && (
            <>
              <polygon points="50,68 51,70 53,70 51.5,71.5 52,74 50,72.5 48,74 48.5,71.5 47,70 49,70" fill="#fbbf24" opacity="0.9">
                <animate attributeName="opacity" values="0;1;0" dur="0.6s" repeatCount="2" />
              </polygon>
              <polygon points="74,68 75,70 77,70 75.5,71.5 76,74 74,72.5 72,74 72.5,71.5 71,70 73,70" fill="#fbbf24" opacity="0.9">
                <animate attributeName="opacity" values="0;1;0" dur="0.6s" repeatCount="2" />
              </polygon>
            </>
          )}

          {/* Rosy cheeks */}
          <circle cx="43" cy="78" r="4" fill="#fca5a5" opacity="0.4" />
          <circle cx="81" cy="78" r="4" fill="#fca5a5" opacity="0.4" />

          {/* Mouth (happy smile) */}
          <path
            d={isAnimating ? "M56,82 Q62,90 68,82" : "M56,82 Q62,87 68,82"}
            fill="none"
            stroke="#312e81"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Open mouth on interaction */}
          {isAnimating && (
            <ellipse cx="62" cy="85" rx="4" ry="3" fill="#ef4444" opacity="0.7">
              <animate attributeName="ry" values="0;3;3;0" dur="1.2s" repeatCount="1" />
            </ellipse>
          )}
        </g>

        {/* === ARMS === */}
        {/* Left arm — thumbs up */}
        <g>
          <path
            d="M28,70 Q18,72 16,80 Q14,86 20,88"
            fill="none"
            stroke="#4338ca"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Thumb */}
          <circle cx="19" cy="87" r="4" fill="#6366f1" />
          <path d="M17,84 L15,79" stroke="#e0e7ff" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Right arm — waving */}
        <g className={isAnimating ? 'animate-mascot-wave' : ''}>
          <path
            d={isAnimating 
              ? "M90,68 Q100,62 104,55 Q106,50 102,48"
              : "M90,70 Q100,72 104,78 Q106,82 102,84"
            }
            fill="none"
            stroke="#4338ca"
            strokeWidth="4"
            strokeLinecap="round"
          >
            {autoAnimate && (
              <animate
                attributeName="d"
                values="M90,70 Q100,72 104,78 Q106,82 102,84;M90,68 Q100,62 104,55 Q106,50 102,48;M90,70 Q100,72 104,78 Q106,82 102,84"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </path>
          {/* Hand */}
          <circle cx={isAnimating ? "101" : "101"} cy={isAnimating ? "49" : "83"} r="5" fill="#818cf8">
            {autoAnimate && (
              <>
                <animate attributeName="cy" values="83;49;83" dur="3s" repeatCount="indefinite" />
                <animate attributeName="cx" values="101;101;101" dur="3s" repeatCount="indefinite" />
              </>
            )}
          </circle>
          {/* Fingers */}
          <g opacity="0.9">
            <line x1="99" y1={isAnimating ? "45" : "79"} x2="96" y2={isAnimating ? "42" : "76"} stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round">
              {autoAnimate && <animate attributeName="y1" values="79;45;79" dur="3s" repeatCount="indefinite" />}
              {autoAnimate && <animate attributeName="y2" values="76;42;76" dur="3s" repeatCount="indefinite" />}
            </line>
            <line x1="102" y1={isAnimating ? "44" : "78"} x2="103" y2={isAnimating ? "39" : "73"} stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round">
              {autoAnimate && <animate attributeName="y1" values="78;44;78" dur="3s" repeatCount="indefinite" />}
              {autoAnimate && <animate attributeName="y2" values="73;39;73" dur="3s" repeatCount="indefinite" />}
            </line>
            <line x1="105" y1={isAnimating ? "46" : "80"} x2="108" y2={isAnimating ? "43" : "77"} stroke="#c7d2fe" strokeWidth="2.5" strokeLinecap="round">
              {autoAnimate && <animate attributeName="y1" values="80;46;80" dur="3s" repeatCount="indefinite" />}
              {autoAnimate && <animate attributeName="y2" values="77;43;77" dur="3s" repeatCount="indefinite" />}
            </line>
          </g>
        </g>

        {/* === LEGS === */}
        <rect x="44" y="112" width="8" height="10" rx="4" fill="#4338ca" />
        <rect x="72" y="112" width="8" height="10" rx="4" fill="#4338ca" />
        {/* Shoes */}
        <ellipse cx="48" cy="122" rx="6" ry="3" fill="#312e81" />
        <ellipse cx="76" cy="122" rx="6" ry="3" fill="#312e81" />

        {/* === GRADUATION CAP === */}
        <g className={isAnimating ? 'animate-mascot-cap-tip' : ''}>
          {/* Cap base (board) */}
          <polygon points="30,34 62,22 94,34 62,40" fill="url(#capGrad)" />
          <polygon points="30,34 62,40 62,42 30,36" fill="#1e1b4b" opacity="0.3" />
          <polygon points="94,34 62,40 62,42 94,36" fill="#1e1b4b" opacity="0.15" />
          
          {/* Cap button (center top) */}
          <circle cx="62" cy="30" r="3" fill="url(#goldAccent)" />

          {/* Tassel */}
          <g>
            <path
              d="M62,30 Q72,34 78,44 Q80,48 78,50"
              fill="none"
              stroke="url(#goldAccent)"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              {(autoAnimate || isAnimating) && (
                <animate
                  attributeName="d"
                  values="M62,30 Q72,34 78,44 Q80,48 78,50;M62,30 Q74,32 80,42 Q82,46 80,48;M62,30 Q72,34 78,44 Q80,48 78,50"
                  dur="2s"
                  repeatCount="indefinite"
                />
              )}
            </path>
            {/* Tassel end */}
            <circle cx="78" cy="50" r="3" fill="url(#goldAccent)">
              {(autoAnimate || isAnimating) && (
                <>
                  <animate attributeName="cx" values="78;80;78" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="50;48;50" dur="2s" repeatCount="indefinite" />
                </>
              )}
            </circle>
            <line x1="76" y1="50" x2="76" y2="56" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round">
              {(autoAnimate || isAnimating) && (
                <animate attributeName="x1" values="76;78;76" dur="2s" repeatCount="indefinite" />
              )}
            </line>
            <line x1="78" y1="50" x2="78" y2="57" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round">
              {(autoAnimate || isAnimating) && (
                <animate attributeName="x1" values="78;80;78" dur="2s" repeatCount="indefinite" />
              )}
            </line>
            <line x1="80" y1="50" x2="80" y2="55" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round">
              {(autoAnimate || isAnimating) && (
                <animate attributeName="x1" values="80;82;80" dur="2s" repeatCount="indefinite" />
              )}
            </line>
          </g>
        </g>

        {/* === SPARKLE PARTICLES (on touch) === */}
        {sparkles.map((s) => (
          <g key={s.id}>
            <circle cx={s.x} cy={s.y} r="2" fill="#fbbf24">
              <animate attributeName="r" values="0;3;0" dur="0.8s" repeatCount="1" />
              <animate attributeName="cy" values={`${s.y};${s.y - 15}`} dur="0.8s" repeatCount="1" />
              <animate attributeName="opacity" values="1;0" dur="0.8s" repeatCount="1" />
            </circle>
            <polygon
              points={`${s.x},${s.y - 3} ${s.x + 1},${s.y - 1} ${s.x + 3},${s.y - 1} ${s.x + 1.5},${s.y + 0.5} ${s.x + 2},${s.y + 3} ${s.x},${s.y + 1.5} ${s.x - 2},${s.y + 3} ${s.x - 1.5},${s.y + 0.5} ${s.x - 3},${s.y - 1} ${s.x - 1},${s.y - 1}`}
              fill="#818cf8"
            >
              <animate attributeName="opacity" values="0;1;0" dur="0.6s" repeatCount="1" />
            </polygon>
          </g>
        ))}
      </svg>

      {/* Label */}
      {showLabel && (
        <span className="mt-1 text-xs font-black text-indigo-900 dark:text-indigo-200 tracking-tight">
          Examizo
        </span>
      )}

      {/* Inline CSS animations */}
      <style jsx>{`
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes mascot-bounce {
          0% { transform: scale(1) translateY(0); }
          20% { transform: scale(0.92, 1.08) translateY(2px); }
          40% { transform: scale(1.08, 0.92) translateY(-10px); }
          60% { transform: scale(0.98, 1.02) translateY(-4px); }
          80% { transform: scale(1.02, 0.98) translateY(0); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes mascot-wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-4deg); }
          40% { transform: rotate(4deg); }
          60% { transform: rotate(-3deg); }
          80% { transform: rotate(2deg); }
        }
        @keyframes mascot-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
        @keyframes mascot-cap-tip {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          30% { transform: rotate(-8deg) translateY(-3px); }
          70% { transform: rotate(5deg) translateY(-1px); }
        }
        .animate-mascot-float {
          animation: mascot-float 2s ease-in-out infinite;
        }
        .animate-mascot-bounce {
          animation: mascot-bounce 0.8s ease-out;
        }
        .animate-mascot-wiggle {
          animation: mascot-wiggle 0.6s ease-in-out;
        }
        .animate-mascot-wave {
          transform-origin: 90px 70px;
          animation: mascot-wave 0.5s ease-in-out 3;
        }
        .animate-mascot-cap-tip {
          transform-origin: 62px 34px;
          animation: mascot-cap-tip 0.8s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ExamizoMascot;
