'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ExamizoIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
  interactive?: boolean;
}

/**
 * ExamizoIcon — Official Brand Icon featuring the Examizo Closed Book Mascot with Graduation Cap.
 * 
 * Interactive:
 * - Touch or Click: plays squash-and-bounce animation, eyes sparkle, graduation cap tips, sparkle burst.
 * - Continuous: gentle floating animation, eye blinking, and tassel sway.
 */
export const ExamizoIcon: React.FC<ExamizoIconProps> = ({
  size = 42,
  className = '',
  animate = true,
  interactive = true,
}) => {
  const [isBouncing, setIsBouncing] = useState(false);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const sparkleCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBounce = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (!interactive || isBouncing) return;
    if (e) {
      e.stopPropagation();
    }
    setIsBouncing(true);

    // Spawn 4 playful micro-sparkles
    const newSparkles = [
      { id: ++sparkleCountRef.current, x: 25, y: 30 },
      { id: ++sparkleCountRef.current, x: 95, y: 25 },
      { id: ++sparkleCountRef.current, x: 15, y: 70 },
      { id: ++sparkleCountRef.current, x: 105, y: 65 },
    ];
    setSparkles(newSparkles);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsBouncing(false);
      setSparkles([]);
    }, 900);
  }, [interactive, isBouncing]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-visible group/ezicon ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={triggerBounce}
      onTouchStart={triggerBounce}
    >
      <svg
        viewBox="0 0 120 125"
        width={size}
        height={size}
        className={`w-full h-full overflow-visible transition-transform duration-200 active:scale-90 ${
          animate ? 'ez-mascot-ambient' : ''
        } ${isBouncing ? 'ez-mascot-active-bounce' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Book Cover Gradient */}
          <linearGradient id="ezBookCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="35%" stopColor="#312e81" />
            <stop offset="70%" stopColor="#3730a3" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>

          {/* Book Spine Gradient */}
          <linearGradient id="ezBookSpineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>

          {/* Gold Trim & Accents */}
          <linearGradient id="ezGoldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="30%" stopColor="#fbbf24" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Cap Diamond Gradient */}
          <linearGradient id="ezCapGrad" x1="0%" y1="70%" x2="100%" y2="30%">
            <stop offset="0%" stopColor="#0a0a14" />
            <stop offset="40%" stopColor="#1e1b4b" />
            <stop offset="80%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Drop shadow */}
          <filter id="ezIconShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1e1b4b" floodOpacity="0.25" />
          </filter>
        </defs>

        <style>{`
          @keyframes ezAmbientBob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3.5px); }
          }
          @keyframes ezMascotSquashBounce {
            0% { transform: scale(1) translateY(0); }
            20% { transform: scale(0.88, 1.12) translateY(2px); }
            45% { transform: scale(1.12, 0.88) translateY(-8px); }
            70% { transform: scale(0.96, 1.04) translateY(-2px); }
            100% { transform: scale(1) translateY(0); }
          }
          @keyframes ezCapTiltFloat {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            50% { transform: rotate(-3deg) translateY(-1px); }
          }
          @keyframes ezTasselSway {
            0%, 100% { transform: rotate(0deg); }
            30% { transform: rotate(-16deg); }
            70% { transform: rotate(12deg); }
          }
          @keyframes ezArmWaveHello {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-18deg); }
            75% { transform: rotate(14deg); }
          }
          .ez-mascot-ambient {
            animation: ezAmbientBob 2.6s ease-in-out infinite;
          }
          .ez-mascot-active-bounce {
            animation: ezMascotSquashBounce 0.75s ease-out;
          }
          .ez-cap-layer {
            transform-origin: 60px 30px;
            animation: ezCapTiltFloat 2.6s ease-in-out infinite;
          }
          .ez-tassel-layer {
            transform-origin: 80px 42px;
            animation: ezTasselSway 2.2s ease-in-out infinite;
          }
          .ez-waving-arm {
            transform-origin: 90px 68px;
            animation: ezArmWaveHello 2s ease-in-out infinite;
          }
          .group\\/ezicon:hover .ez-waving-arm {
            animation: ezArmWaveHello 0.6s ease-in-out infinite;
          }
          .group\\/ezicon:hover .ez-cap-layer {
            animation: ezCapTiltFloat 1.2s ease-in-out infinite;
          }
        `}</style>

        {/* Ground ambient shadow */}
        <ellipse cx="60" cy="120" rx="26" ry="3.5" fill="#1e1b4b" opacity="0.15" />

        {/* === MAIN BOOK BODY GROUP === */}
        <g filter="url(#ezIconShadow)">
          {/* Left Book Spine */}
          <rect x="25" y="32" width="9" height="74" rx="3.5" fill="url(#ezBookSpineGrad)" />
          {/* Gold Ribs on Spine */}
          <rect x="25" y="42" width="9" height="2.5" rx="1" fill="url(#ezGoldTrim)" opacity="0.85" />
          <rect x="25" y="52" width="9" height="2.5" rx="1" fill="url(#ezGoldTrim)" opacity="0.85" />
          <rect x="25" y="92" width="9" height="2.5" rx="1" fill="url(#ezGoldTrim)" opacity="0.85" />

          {/* Book Front Cover */}
          <rect x="32" y="30" width="58" height="78" rx="5.5" fill="url(#ezBookCoverGrad)" />

          {/* Gold Decorative Corner Trim on Cover */}
          <rect x="37" y="35" width="48" height="68" rx="3.5" fill="none" stroke="url(#ezGoldTrim)" strokeWidth="1.4" opacity="0.65" />
          
          {/* Gold Filigree Header Banner Arc */}
          <path
            d="M 42 42 Q 61 46 80 42"
            fill="none"
            stroke="url(#ezGoldTrim)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Gold Corner Flourishes */}
          <path d="M 39 37 L 45 37 L 39 43 Z" fill="url(#ezGoldTrim)" opacity="0.75" />
          <path d="M 83 37 L 77 37 L 83 43 Z" fill="url(#ezGoldTrim)" opacity="0.75" />
          <path d="M 39 101 L 45 101 L 39 95 Z" fill="url(#ezGoldTrim)" opacity="0.75" />
          <path d="M 83 101 L 77 101 L 83 95 Z" fill="url(#ezGoldTrim)" opacity="0.75" />

          {/* Gold Stars */}
          <polygon points="61,40 62.5,43 65.5,43 63,45 64,48 61,46 58,48 59,45 56.5,43 59.5,43" fill="url(#ezGoldTrim)" opacity="0.9" />

          {/* Page Edge (Bottom) */}
          <rect x="32" y="102" width="58" height="6" rx="2" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
          <line x1="35" y1="104" x2="87" y2="104" stroke="#cbd5e1" strokeWidth="0.5" />
          <line x1="35" y1="106" x2="87" y2="106" stroke="#cbd5e1" strokeWidth="0.5" />
        </g>

        {/* === CUTE KAWAII FACE === */}
        <g>
          {/* Left Eye */}
          <ellipse cx="49" cy="67" rx="7" ry="7.5" fill="white" stroke="#1e1b4b" strokeWidth="1" />
          <ellipse cx="49" cy="67" rx="4.5" ry="5" fill="#1e293b" />
          <circle cx="47" cy="65" r="2.2" fill="white" />
          <circle cx="51" cy="69" r="1.1" fill="white" opacity="0.75" />

          {/* Right Eye */}
          <ellipse cx="73" cy="67" rx="7" ry="7.5" fill="white" stroke="#1e1b4b" strokeWidth="1" />
          <ellipse cx="73" cy="67" rx="4.5" ry="5" fill="#1e293b" />
          <circle cx="71" cy="65" r="2.2" fill="white" />
          <circle cx="75" cy="69" r="1.1" fill="white" opacity="0.75" />

          {/* Blinking Animation on eyes */}
          {animate && (
            <>
              <ellipse cx="49" cy="67" rx="7" ry="7.5" fill="url(#ezBookCoverGrad)">
                <animate
                  attributeName="ry"
                  values="0;0;0;7.5;7.5;7.5;7.5;7.5;7.5;7.5;0;0;7.5"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </ellipse>
              <ellipse cx="73" cy="67" rx="7" ry="7.5" fill="url(#ezBookCoverGrad)">
                <animate
                  attributeName="ry"
                  values="0;0;0;7.5;7.5;7.5;7.5;7.5;7.5;7.5;0;0;7.5"
                  dur="4s"
                  repeatCount="indefinite"
                />
              </ellipse>
            </>
          )}

          {/* Cheerful Star sparkle in eyes when clicked/bouncing */}
          {isBouncing && (
            <>
              <polygon points="49,63 50.5,65.5 53,65.5 51,67.5 52,70 49,68.5 46,70 47,67.5 45,65.5 47.5,65.5" fill="#fbbf24" opacity="0.95" />
              <polygon points="73,63 74.5,65.5 77,65.5 75,67.5 76,70 73,68.5 70,70 71,67.5 69,65.5 71.5,65.5" fill="#fbbf24" opacity="0.95" />
            </>
          )}

          {/* Rosy Cheeks */}
          <circle cx="42" cy="74" r="4.2" fill="#f87171" opacity="0.45" />
          <circle cx="80" cy="74" r="4.2" fill="#f87171" opacity="0.45" />

          {/* Happy Open Smile */}
          <path
            d={isBouncing ? "M 55 77 Q 61 87 67 77" : "M 55 77 Q 61 84 67 77"}
            fill={isBouncing ? "#ef4444" : "none"}
            stroke="#1e1b4b"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>

        {/* === ARMS === */}
        {/* Left Arm: Thumbs Up */}
        <g>
          <path
            d="M 25 65 Q 15 67 13 75 Q 11 81 18 83"
            fill="none"
            stroke="#3730a3"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <circle cx="17" cy="82" r="3.5" fill="#6366f1" />
          <path d="M 15 79 L 13 74" stroke="#e0e7ff" strokeWidth="2.8" strokeLinecap="round" />
        </g>

        {/* Right Arm: Friendly Waving Hand */}
        <g className="ez-waving-arm">
          <path
            d="M 90 65 Q 100 60 105 52"
            fill="none"
            stroke="#3730a3"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {/* Hand Palm & Glove */}
          <circle cx="104" cy="50" r="4.5" fill="#818cf8" />
          {/* Fingers */}
          <line x1="102" y1="46" x2="100" y2="42" stroke="#e0e7ff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="105" y1="45" x2="106" y2="40" stroke="#e0e7ff" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="108" y1="47" x2="111" y2="43" stroke="#e0e7ff" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* === LITTLE FEET === */}
        <g>
          <rect x="42" y="108" width="7" height="9" rx="3.5" fill="#3730a3" />
          <rect x="71" y="108" width="7" height="9" rx="3.5" fill="#3730a3" />
          <ellipse cx="45.5" cy="117" rx="5.5" ry="3" fill="#1e1b4b" />
          <ellipse cx="74.5" cy="117" rx="5.5" ry="3" fill="#1e1b4b" />
        </g>

        {/* === GRADUATION CAP (MORTARBOARD) === */}
        <g className="ez-cap-layer">
          {/* Skull Cap Base */}
          <path
            d="M 45 28 C 52 26 68 26 77 28 L 75 35 C 67 38 53 38 46 34 Z"
            fill="#0f172a"
          />

          {/* Diamond Mortarboard Board */}
          <polygon
            points="61,12 95,23 61,34 27,23"
            fill="url(#ezCapGrad)"
            stroke="#1e1b4b"
            strokeWidth="0.8"
          />
          {/* Top Board Highlight */}
          <polygon
            points="61,12 95,23 61,20 33,23"
            fill="#93c5fd"
            opacity="0.35"
          />

          {/* Cap Button */}
          <circle cx="61" cy="23" r="3" fill="url(#ezGoldTrim)" />

          {/* Tassel Assembly */}
          <g className="ez-tassel-layer">
            {/* Tassel Golden String */}
            <path
              d="M 61 23 Q 73 26 80 34 L 81 44"
              fill="none"
              stroke="url(#ezGoldTrim)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Tassel Ring */}
            <circle cx="81" cy="44" r="2.8" fill="url(#ezGoldTrim)" />
            {/* Tassel Brush Strands */}
            <line x1="79" y1="44" x2="79" y2="52" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="81" y1="44" x2="81" y2="54" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="83" y1="44" x2="83" y2="52" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>

        {/* === BURST SPARKLES (on click/touch) === */}
        {sparkles.map((s) => (
          <g key={s.id}>
            <circle cx={s.x} cy={s.y} r="2.5" fill="#fbbf24">
              <animate attributeName="r" values="0;3.5;0" dur="0.75s" repeatCount="1" />
              <animate attributeName="cy" values={`${s.y};${s.y - 12}`} dur="0.75s" repeatCount="1" />
              <animate attributeName="opacity" values="1;0" dur="0.75s" repeatCount="1" />
            </circle>
            <polygon
              points={`${s.x},${s.y - 3} ${s.x + 1},${s.y - 1} ${s.x + 3},${s.y - 1} ${s.x + 1.5},${s.y + 0.5} ${s.x + 2},${s.y + 3} ${s.x},${s.y + 1.5} ${s.x - 2},${s.y + 3} ${s.x - 1.5},${s.y + 0.5} ${s.x - 3},${s.y - 1} ${s.x - 1},${s.y - 1}`}
              fill="#60a5fa"
            >
              <animate attributeName="opacity" values="0;1;0" dur="0.6s" repeatCount="1" />
            </polygon>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default ExamizoIcon;
