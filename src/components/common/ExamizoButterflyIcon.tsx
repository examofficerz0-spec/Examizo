'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ExamizoButterflyIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
  interactive?: boolean;
  autoLoop?: boolean;
  variant?: 'crest' | 'butterfly-only';
  onFlightComplete?: () => void;
}

/**
 * ExamizoButterflyIcon
 * 
 * Official Examizo Brand Crest featuring:
 * - Regal Gold Shield Crest with Royal Midnight Sapphire Field & Gem Facets
 * - Glowing 4-Point North Star at top
 * - Centerpiece: Open Book that transforms into a living Butterfly
 * - Dynamic Gust of Wind animation: Butterfly takes flight, soars through the air,
 *   and gracefully lands back in the center, unfolding its wings as an opening book!
 * - Golden Ribbon Banner with "EXAMIZO" serif typography
 */
export const ExamizoButterflyIcon: React.FC<ExamizoButterflyIconProps> = ({
  size = 56,
  className = '',
  animate = true,
  interactive = true,
  autoLoop = false,
  variant = 'crest',
  onFlightComplete,
}) => {
  const [flightState, setFlightState] = useState<'resting' | 'gust' | 'flying' | 'landing'>('resting');
  const [animTime, setAnimTime] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const isPlayingRef = useRef(autoLoop);

  const triggerFlight = useCallback(() => {
    if (!interactive) return;
    setAnimTime(0.22 * 9.0);
    isPlayingRef.current = true;
  }, [interactive]);

  useEffect(() => {
    if (!animate && !isPlayingRef.current) return;

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlayingRef.current) {
        setAnimTime((prev) => {
          const next = prev + dt;
          const cycle = 9.0;
          if (next >= cycle) {
            if (autoLoop) {
              return next % cycle;
            } else {
              isPlayingRef.current = false;
              if (onFlightComplete) onFlightComplete();
              return 0;
            }
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate, autoLoop, onFlightComplete]);

  // Compute flight transform based on animTime (0s to 9.0s cycle)
  const tNorm = (animTime % 9.0) / 9.0;
  let transform = { x: 0, y: 0, scale: 1, rotate: 0, isFlapping: false, isLandingUnfold: false, windActive: false };

  if (tNorm < 0.22) {
    transform = { x: 0, y: 0, scale: 1, rotate: 0, isFlapping: false, isLandingUnfold: false, windActive: false };
  } else if (tNorm < 0.32) {
    const p = (tNorm - 0.22) / 0.10;
    transform = {
      x: Math.sin(p * Math.PI) * 10,
      y: -p * 24,
      scale: 1 + p * 0.05,
      rotate: p * 8,
      isFlapping: true,
      isLandingUnfold: false,
      windActive: true,
    };
  } else if (tNorm < 0.72) {
    const p = (tNorm - 0.32) / 0.40;
    const angle = p * Math.PI * 2;
    transform = {
      x: Math.sin(angle) * 165 + Math.cos(angle * 2) * 35,
      y: -135 - Math.sin(angle) * 75 + Math.sin(angle * 3) * 20,
      scale: 0.84 + Math.sin(angle + Math.PI / 2) * 0.22,
      rotate: Math.cos(angle) * 26,
      isFlapping: true,
      isLandingUnfold: false,
      windActive: true,
    };
  } else if (tNorm < 0.88) {
    const p = (tNorm - 0.72) / 0.16;
    const ease = 1 - Math.pow(1 - p, 3);
    transform = {
      x: 65 * (1 - ease),
      y: -120 * (1 - ease),
      scale: 0.88 + ease * 0.12,
      rotate: 16 * (1 - ease),
      isFlapping: p < 0.45,
      isLandingUnfold: p >= 0.45,
      windActive: p < 0.55,
    };
  }

  return (
    <div
      style={{ width: size, height: (size * 700) / 600 }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-visible group/ezbutterfly ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={triggerFlight}
      title="Click to trigger flight & gusts of wind"
    >
      <svg
        viewBox="0 0 600 700"
        width={size}
        height={(size * 700) / 600}
        className="w-full h-full overflow-visible transition-transform duration-200 group-hover/ezbutterfly:scale-105"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ezShieldGoldBevel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="15%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id="ezShieldGoldRim" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="75%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <radialGradient id="ezShieldBg" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#14285b" />
            <stop offset="45%" stopColor="#0e1c42" />
            <stop offset="75%" stopColor="#081028" />
            <stop offset="100%" stopColor="#040816" />
          </radialGradient>

          <linearGradient id="ezWingPageGradLeft" x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>

          <linearGradient id="ezWingPageGradRight" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>

          <linearGradient id="ezWingGoldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="85%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="ezSpineGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="85%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="ezRibbonGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="20%" stopColor="#fde047" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="ezRibbonDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>

          <linearGradient id="ezWindGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <filter id="ezStarGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="ezCrestShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#020617" floodOpacity="0.65" />
          </filter>

          <filter id="ezWingShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#020617" floodOpacity="0.4" />
          </filter>
        </defs>

        <style>{`
          @keyframes ezStarPulse {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.25); opacity: 1; }
          }
          @keyframes ezWingFlapL {
            0% { transform: rotate(0deg) scaleX(1); }
            50% { transform: rotate(18deg) scaleX(0.3); }
            100% { transform: rotate(0deg) scaleX(1); }
          }
          @keyframes ezWingFlapR {
            0% { transform: rotate(0deg) scaleX(1); }
            50% { transform: rotate(-18deg) scaleX(0.3); }
            100% { transform: rotate(0deg) scaleX(1); }
          }
          @keyframes ezLandingUnfoldL {
            0% { transform: rotate(26deg) scaleX(0.35); }
            65% { transform: rotate(-3deg) scaleX(1.02); }
            100% { transform: rotate(0deg) scaleX(1); }
          }
          @keyframes ezLandingUnfoldR {
            0% { transform: rotate(-26deg) scaleX(0.35); }
            65% { transform: rotate(3deg) scaleX(1.02); }
            100% { transform: rotate(0deg) scaleX(1); }
          }
          @keyframes ezWindDash {
            0% { stroke-dashoffset: 800; opacity: 0; }
            20% { opacity: 0.95; }
            80% { opacity: 0.95; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          .ez-star-twinkle {
            transform-origin: 300px 122px;
            animation: ezStarPulse 3s ease-in-out infinite;
          }
          .ez-flap-left {
            transform-origin: 300px 340px;
            animation: ezWingFlapL 0.15s ease-in-out infinite;
          }
          .ez-flap-right {
            transform-origin: 300px 340px;
            animation: ezWingFlapR 0.15s ease-in-out infinite;
          }
          .ez-unfold-left {
            transform-origin: 300px 340px;
            animation: ezLandingUnfoldL 0.9s cubic-bezier(0.2, 0.8, 0.25, 1) forwards;
          }
          .ez-unfold-right {
            transform-origin: 300px 340px;
            animation: ezLandingUnfoldR 0.9s cubic-bezier(0.2, 0.8, 0.25, 1) forwards;
          }
          .ez-wind-1 {
            stroke-dasharray: 180 600;
            animation: ezWindDash 1.6s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
          }
          .ez-wind-2 {
            stroke-dasharray: 240 700;
            animation: ezWindDash 2.0s 0.2s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
          }
        `}</style>

        <g filter="url(#ezCrestShadow)">
          {/* Shield Outline and Bevel */}
          <path
            d="M 100 110 L 120 85 Q 300 48 480 85 L 500 110 L 500 350 C 500 490 405 585 300 642 C 195 585 100 490 100 350 Z"
            fill="url(#ezShieldGoldBevel)"
            stroke="#b45309"
            strokeWidth="2"
          />
          {/* Highlight Rim */}
          <path
            d="M 115 118 L 130 98 Q 300 65 470 98 L 485 118 L 485 348 C 485 478 398 570 300 622 C 202 570 115 478 115 348 Z"
            fill="none"
            stroke="#fef08a"
            strokeWidth="2.5"
            opacity="0.75"
          />
          {/* Navy Blue Field */}
          <path
            d="M 125 125 L 138 108 Q 300 78 462 108 L 475 125 L 475 345 C 475 468 392 558 300 608 C 208 558 125 468 125 345 Z"
            fill="url(#ezShieldBg)"
          />
          {/* Inset Gold Pin Stripe */}
          <path
            d="M 140 138 L 150 125 Q 300 98 450 125 L 460 138 L 460 340 C 460 452 385 538 300 584 C 215 538 140 452 140 340 Z"
            fill="none"
            stroke="url(#ezShieldGoldRim)"
            strokeWidth="3"
            opacity="0.9"
          />

          {/* Facet Lines */}
          <g opacity="0.14" stroke="#93c5fd" strokeWidth="1.2" fill="none">
            <line x1="300" y1="80" x2="300" y2="600" />
            <line x1="300" y1="125" x2="140" y2="138" />
            <line x1="300" y1="125" x2="460" y2="138" />
            <line x1="300" y1="125" x2="140" y2="340" />
            <line x1="300" y1="125" x2="460" y2="340" />
            <polygon points="300,125 460,340 300,580 140,340" />
          </g>

          {/* North Star */}
          <g className="ez-star-twinkle" filter="url(#ezStarGlow)">
            <circle cx="300" cy="122" r="14" fill="#fbbf24" opacity="0.35" />
            <path
              d="M 300 96 Q 300 122 313 122 Q 300 122 300 148 Q 300 122 287 122 Q 300 122 300 96 Z"
              fill="#ffffff"
            />
            <path
              d="M 300 102 Q 300 122 310 122 Q 300 122 300 142 Q 300 122 290 122 Q 300 122 300 102 Z"
              fill="#fef08a"
            />
          </g>
          <circle cx="230" cy="125" r="3.2" fill="#fef08a" opacity="0.85" />
          <circle cx="370" cy="125" r="3.2" fill="#fef08a" opacity="0.85" />

          {/* Gust of Wind Streams (Active when flying) */}
          {transform.windActive && (
            <g>
              <path
                className="ez-wind-1"
                d="M 80 540 C 130 460 210 390 300 330 C 380 270 450 210 520 150"
                fill="none"
                stroke="url(#ezWindGrad)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                className="ez-wind-2"
                d="M 120 280 C 180 170 320 150 420 210 C 490 270 470 420 380 470"
                fill="none"
                stroke="url(#ezWindGrad)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* ================= BUTTERFLY-BOOK CENTERPIECE ================= */}
          <g
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotate}deg)`,
              transformOrigin: '300px 340px',
              transition: 'transform 0.05s linear',
            }}
          >
            <g filter="url(#ezWingShadow)">
              {/* Back Aura */}
              <ellipse cx="300" cy="335" rx="145" ry="115" fill="#38bdf8" opacity="0.10" />

              {/* LEFT WING / BOOK PAGE */}
              <g
                className={
                  transform.isFlapping
                    ? 'ez-flap-left'
                    : transform.isLandingUnfold
                    ? 'ez-unfold-left'
                    : ''
                }
              >
                <path
                  d="M 296 242 C 275 208 195 168 142 200 C 118 215 110 248 120 282 C 130 315 158 332 176 354 C 152 388 140 425 168 456 C 200 488 255 470 296 445 Z"
                  fill="url(#ezWingPageGradLeft)"
                  stroke="url(#ezWingGoldTrim)"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />
                <path
                  d="M 294 252 C 274 222 202 184 152 212 C 132 225 125 252 133 280 C 142 310 168 326 185 348 C 162 382 152 415 178 442 C 205 468 254 454 294 432"
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth="2.5"
                  opacity="0.85"
                />
                {/* Book Page Crease Lines */}
                <path d="M 294 276 C 255 248 202 224 158 238" fill="none" stroke="#93c5fd" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                <path d="M 294 310 C 250 292 198 278 152 296" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
                <path d="M 294 345 C 255 338 212 336 182 352" fill="none" stroke="#93c5fd" strokeWidth="2.8" strokeLinecap="round" opacity="0.7" />
                <path d="M 294 380 C 255 388 216 394 182 418" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
                <path d="M 294 415 C 265 426 232 440 205 452" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
              </g>

              {/* RIGHT WING / BOOK PAGE */}
              <g
                className={
                  transform.isFlapping
                    ? 'ez-flap-right'
                    : transform.isLandingUnfold
                    ? 'ez-unfold-right'
                    : ''
                }
              >
                <path
                  d="M 304 242 C 325 208 405 168 458 200 C 482 215 490 248 480 282 C 470 315 442 332 424 354 C 448 388 460 425 432 456 C 400 488 345 470 304 445 Z"
                  fill="url(#ezWingPageGradRight)"
                  stroke="url(#ezWingGoldTrim)"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />
                <path
                  d="M 306 252 C 326 222 398 184 448 212 C 468 225 475 252 467 280 C 458 310 432 326 415 348 C 438 382 448 415 422 442 C 395 468 346 454 306 432"
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth="2.5"
                  opacity="0.85"
                />
                {/* Book Page Crease Lines */}
                <path d="M 306 276 C 345 248 398 224 442 238" fill="none" stroke="#93c5fd" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
                <path d="M 306 310 C 350 292 402 278 448 296" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
                <path d="M 306 345 C 345 338 388 336 418 352" fill="none" stroke="#93c5fd" strokeWidth="2.8" strokeLinecap="round" opacity="0.7" />
                <path d="M 306 380 C 345 388 384 394 418 418" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
                <path d="M 306 415 C 335 426 368 440 395 452" fill="none" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
              </g>

              {/* BUTTERFLY BODY & SPINE */}
              <g>
                <path
                  d="M 297 228 C 285 194 240 180 216 200 C 208 206 212 216 220 214 C 228 212 230 202 220 198"
                  fill="none"
                  stroke="url(#ezWingGoldTrim)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="218" cy="204" r="5.5" fill="url(#ezWingGoldTrim)" />
                <path
                  d="M 303 228 C 315 194 360 180 384 200 C 392 206 388 216 380 214 C 372 212 370 202 380 198"
                  fill="none"
                  stroke="url(#ezWingGoldTrim)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="382" cy="204" r="5.5" fill="url(#ezWingGoldTrim)" />

                {/* Head */}
                <circle cx="300" cy="232" r="11" fill="url(#ezSpineGold)" />
                {/* Spine */}
                <path
                  d="M 296 240 C 295 285 293 365 294 430 L 300 458 L 306 430 C 307 365 305 285 304 240 Z"
                  fill="url(#ezSpineGold)"
                />
                <line x1="300" y1="245" x2="300" y2="452" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="300" cy="458" r="2.5" fill="#fef08a" />
              </g>
            </g>
          </g>

          {/* ================= GOLDEN RIBBON BANNER ================= */}
          <g>
            {/* Left Tail */}
            <path d="M 68 558 L 130 558 L 130 608 L 68 608 L 95 583 Z" fill="url(#ezRibbonDark)" stroke="#92400e" strokeWidth="1" />
            <polygon points="120,545 130,558 130,608" fill="#451a03" />

            {/* Right Tail */}
            <path d="M 532 558 L 470 558 L 470 608 L 532 608 L 505 583 Z" fill="url(#ezRibbonDark)" stroke="#92400e" strokeWidth="1" />
            <polygon points="480,545 470,558 470,608" fill="#451a03" />

            {/* Front Curved Ribbon Face */}
            <path
              d="M 115 545 Q 300 575 485 545 L 475 605 Q 300 635 125 605 Z"
              fill="url(#ezRibbonGold)"
              stroke="#78350f"
              strokeWidth="1.5"
            />
            <path d="M 116 547 Q 300 577 484 547" fill="none" stroke="#fffbeb" strokeWidth="2.5" />
            <path d="M 126 603 Q 300 633 474 603" fill="none" stroke="#92400e" strokeWidth="2" />

            {/* EXAMIZO Typography */}
            <text
              x="300"
              y="588"
              textAnchor="middle"
              fontFamily="'Cinzel', 'Playfair Display', serif"
              fontSize="40"
              fontWeight="900"
              letterSpacing="0.22em"
              fill="#0a1329"
            >
              EXAMIZO
            </text>
            <text
              x="300"
              y="589"
              textAnchor="middle"
              fontFamily="'Cinzel', 'Playfair Display', serif"
              fontSize="40"
              fontWeight="900"
              letterSpacing="0.22em"
              fill="none"
              stroke="#fffbeb"
              strokeWidth="0.7"
              opacity="0.4"
            >
              EXAMIZO
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default ExamizoButterflyIcon;
