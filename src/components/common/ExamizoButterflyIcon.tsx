'use client';

import React, { useState, useCallback, useRef, useEffect, useImperativeHandle } from 'react';

export interface ExamizoButterflyIconHandle {
  triggerFlight: (force?: boolean) => void;
}

export interface ExamizoButterflyIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
  interactive?: boolean;
  autoLoop?: boolean;
  variant?: 'crest' | 'butterfly-only';
  allowTextSpiral?: boolean;
  onFlightComplete?: () => void;
}

/**
 * ExamizoButterflyIcon
 * 
 * Official Examizo Brand Crest featuring:
 * - Regal Gold Shield Crest with Royal Midnight Sapphire Field & Gem Facets
 * - Glowing 4-Point North Star at top
 * - Centerpiece: Open Book that transforms into a living Butterfly
 * - Dual Flight Trajectories:
 *   1st Trigger: Majestic soaring loop around the shield crest
 *   2nd Trigger: 3D helical spiral weaving across the entire "Examizo" lettering with depth scaling & triumph loop
 *   Subsequent Triggers: Alternates between crest flight and text spiral flight
 * - Golden Ribbon Banner with "EXAMIZO" serif typography
 */
// Persistent client-side cache for alternate flight cycle state across navigations
let globalCachedFlightCycle = 0;
if (typeof window !== 'undefined') {
  try {
    const saved = sessionStorage.getItem('ez_logo_flight_count');
    if (saved) globalCachedFlightCycle = parseInt(saved, 10) || 0;
  } catch (_) {}
}

export const ExamizoButterflyIcon = React.forwardRef<
  ExamizoButterflyIconHandle,
  ExamizoButterflyIconProps
>(function ExamizoButterflyIcon(
  {
    size = 56,
    className = '',
    animate = true,
    interactive = true,
    autoLoop = false,
    variant = 'crest',
    allowTextSpiral = true,
    onFlightComplete,
  },
  ref
) {
  const [showWind, setShowWind] = useState(false);
  const [flightMode, setFlightMode] = useState<'crest' | 'spiral-text'>('crest');
  const butterflyRef = useRef<SVGGElement | null>(null);
  const leftWingRef = useRef<SVGGElement | null>(null);
  const rightWingRef = useRef<SVGGElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const isPlayingRef = useRef(autoLoop);
  const animTimeRef = useRef(0);
  const flightModeRef = useRef<'crest' | 'spiral-text'>('crest');
  const flightCycleCountRef = useRef<number>(globalCachedFlightCycle);
  const lastWindRef = useRef(false);
  const lastTriggerTickRef = useRef<number>(0);

  // Trajectory 1: Soaring loop around the Shield Crest (4.4s duration, instant takeoff)
  const calculateCrestTransform = (time: number) => {
    const DURATION = 4.4;
    const tNorm = Math.min(0.9999, Math.max(0, time / DURATION));
    let x = 0;
    let y = 0;
    let scale = 1;
    let rotate = 0;
    let isFlapping = false;
    let isLandingUnfold = false;
    let unfoldProgress = 0;
    let windActive = false;

    if (tNorm < 0.16) {
      // Phase 1: Rapid, majestic takeoff from crest (0 to ~0.7s)
      const p = tNorm / 0.16;
      const ease = p * p * (3 - 2 * p);
      x = Math.sin(p * Math.PI) * 14;
      y = -ease * 45;
      scale = 1 + ease * 0.10;
      rotate = ease * 12;
      isFlapping = true;
      windActive = true;
    } else if (tNorm < 0.72) {
      // Phase 2: Soaring panoramic loop around the shield crest (0.7s to ~3.15s)
      const p = (tNorm - 0.16) / 0.56;
      const angle = p * Math.PI * 2;
      x = Math.sin(angle) * 165 + Math.cos(angle * 2) * 35;
      y = -135 - Math.sin(angle) * 75 + Math.sin(angle * 3) * 20;
      scale = 0.86 + Math.sin(angle + Math.PI / 2) * 0.22;
      rotate = Math.cos(angle) * 26;
      isFlapping = true;
      windActive = true;
    } else if (tNorm < 0.88) {
      // Phase 3: Gliding approach down to the open book base (3.15s to ~3.87s)
      const p = (tNorm - 0.72) / 0.16;
      const ease = 1 - Math.pow(1 - p, 3);
      x = 65 * (1 - ease);
      y = -120 * (1 - ease);
      scale = 0.88 + ease * 0.12;
      rotate = 16 * (1 - ease);
      isFlapping = p < 0.6;
      windActive = p < 0.5;
    } else {
      // Phase 4: Touchdown and book page unfolding (3.87s to 4.4s)
      const p = (tNorm - 0.88) / 0.12;
      x = 0;
      y = 0;
      scale = 1;
      rotate = 0;
      isFlapping = false;
      isLandingUnfold = true;
      unfoldProgress = p;
      windActive = false;
    }

    return { x, y, scale, rotate, isFlapping, isLandingUnfold, unfoldProgress, windActive };
  };

  // Trajectory 2: 3D Helical Spiral weaving across the entire "Examizo" lettering (5.6s duration)
  const calculateSpiralTransform = (time: number) => {
    const DURATION = 5.6;
    const tNorm = Math.min(0.9999, Math.max(0, time / DURATION));
    let x = 0;
    let y = 0;
    let scale = 1;
    let rotate = 0;
    let isFlapping = false;
    let isLandingUnfold = false;
    let unfoldProgress = 0;
    let windActive = false;

    if (tNorm < 0.12) {
      // Phase 1: Takeoff towards letter 'E' (0 to ~0.67s)
      const p = tNorm / 0.12;
      const ease = p * p * (3 - 2 * p);
      x = ease * 450;
      y = -Math.sin(p * Math.PI) * 70;
      scale = 1.0 + Math.sin(p * Math.PI) * 0.15;
      rotate = p * 14;
      isFlapping = true;
      windActive = true;
    } else if (tNorm < 0.66) {
      // Phase 2: Helical 3D spiral weaving across "Examizo" lettering (~0.67s to ~3.7s)
      const p = (tNorm - 0.12) / 0.54;
      const env = Math.min(1, p * 4);
      const endEnv = Math.min(1, (1 - p) * 4);
      const spiralEnv = Math.min(env, endEnv);

      const x_base = 450 + p * 1500;
      const theta = p * 6.5 * Math.PI;

      x = x_base - (1 - Math.cos(theta)) * 35 * spiralEnv;
      y = Math.sin(theta) * 125 * env;
      scale = 1.08 + Math.cos(theta) * 0.28 * spiralEnv;
      rotate = 14 * (1 - p * 0.5) + Math.cos(theta) * 20 * spiralEnv;
      isFlapping = true;
      windActive = true;
    } else if (tNorm < 0.78) {
      // Phase 3: Victory flourish loop past letter 'o' (~3.7s to ~4.36s)
      const p = (tNorm - 0.66) / 0.12;
      const loopAngle = p * Math.PI * 2;
      x = 1950 + Math.sin(loopAngle) * 90;
      y = -(1 - Math.cos(loopAngle)) * 95;
      scale = 1.08 + Math.sin(p * Math.PI) * 0.22;
      rotate = 7 + Math.sin(loopAngle) * 28;
      isFlapping = true;
      windActive = true;
    } else if (tNorm < 0.90) {
      // Phase 4: High-speed return glide back to crest (~4.36s to ~5.04s)
      const p = (tNorm - 0.78) / 0.12;
      const ease = p * p * (3 - 2 * p);
      x = 1950 * (1 - ease) + 60 * ease;
      y = -ease * 70 - Math.sin(p * Math.PI) * 75;
      scale = 1.08 * (1 - ease) + 1.0 * ease;
      rotate = 7 * (1 - ease) - 12 * Math.sin(p * Math.PI) + 8 * ease;
      isFlapping = true;
      windActive = true;
    } else {
      // Phase 5: Landing and book unfolding (~5.04s to 5.6s)
      const p = (tNorm - 0.90) / 0.10;
      const ease = 1 - Math.pow(1 - p, 3);
      x = 60 * (1 - ease);
      y = -70 * (1 - ease);
      scale = 1.0;
      rotate = 8 * (1 - ease);
      isFlapping = p < 0.35;
      isLandingUnfold = p >= 0.35;
      unfoldProgress = p;
      windActive = p < 0.40;
    }

    return { x, y, scale, rotate, isFlapping, isLandingUnfold, unfoldProgress, windActive };
  };

  const calculateTransform = (time: number, mode: 'crest' | 'spiral-text') => {
    return mode === 'spiral-text'
      ? calculateSpiralTransform(time)
      : calculateCrestTransform(time);
  };

  // 100% Native SVG 1.1 transforms: works flawlessly in Safari, Chrome, Firefox, iOS WebKit
  const applyTransform = (
    x: number,
    y: number,
    scale: number,
    rotate: number,
    isFlapping: boolean,
    unfoldProgress: number
  ) => {
    if (butterflyRef.current) {
      butterflyRef.current.setAttribute(
        'transform',
        `translate(${x.toFixed(2)}, ${y.toFixed(2)}) translate(300, 340) rotate(${rotate.toFixed(2)}) scale(${scale.toFixed(3)}) translate(-300, -340)`
      );
    }

    if (leftWingRef.current && rightWingRef.current) {
      if (isFlapping) {
        // High-frequency natural wing flap
        const flap = Math.sin(animTimeRef.current * 36);
        const flapScaleX = 0.32 + 0.68 * (0.5 + 0.5 * flap);
        const flapAngle = 18 * (0.5 - 0.5 * flap);

        leftWingRef.current.setAttribute(
          'transform',
          `translate(296, 340) rotate(${flapAngle.toFixed(2)}) scale(${flapScaleX.toFixed(3)}, 1) translate(-296, -340)`
        );
        rightWingRef.current.setAttribute(
          'transform',
          `translate(304, 340) rotate(${(-flapAngle).toFixed(2)}) scale(${flapScaleX.toFixed(3)}, 1) translate(-304, -340)`
        );
      } else if (unfoldProgress > 0) {
        // Landing book unfold
        const ease = 1 - Math.pow(1 - unfoldProgress, 3);
        const unfoldScaleX = 0.35 + 0.65 * ease;
        const unfoldAngle = (1 - ease) * 24;

        leftWingRef.current.setAttribute(
          'transform',
          `translate(296, 340) rotate(${unfoldAngle.toFixed(2)}) scale(${unfoldScaleX.toFixed(3)}, 1) translate(-296, -340)`
        );
        rightWingRef.current.setAttribute(
          'transform',
          `translate(304, 340) rotate(${(-unfoldAngle).toFixed(2)}) scale(${unfoldScaleX.toFixed(3)}, 1) translate(-304, -340)`
        );
      } else {
        // Idle open wings
        leftWingRef.current.removeAttribute('transform');
        rightWingRef.current.removeAttribute('transform');
      }
    }
  };

  const triggerFlight = useCallback(
    (force: boolean = false) => {
      if (!interactive) return;
      const now = performance.now();
      // Guard against rapid duplicate clicks/invocations (< 200ms)
      if (now - lastTriggerTickRef.current < 200) return;
      lastTriggerTickRef.current = now;

      const currentMode = flightModeRef.current;
      const currentDuration = currentMode === 'spiral-text' ? 5.6 : 4.4;
      const isMidAir =
        isPlayingRef.current &&
        animTimeRef.current > 0.05 * currentDuration &&
        animTimeRef.current < 0.92 * currentDuration;

      // If mid-air and not forced, let current flight finish smoothly
      if (isMidAir && !force) {
        return;
      }

      // Alternate: 1st trigger (0) -> crest, 2nd trigger (1) -> spiral-text, etc.
      const count = flightCycleCountRef.current;
      const nextMode: 'crest' | 'spiral-text' =
        allowTextSpiral && count % 2 === 1 ? 'spiral-text' : 'crest';

      flightModeRef.current = nextMode;
      setFlightMode(nextMode);
      flightCycleCountRef.current = count + 1;
      globalCachedFlightCycle = count + 1;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('ez_logo_flight_count', String(count + 1));
        } catch (_) {}
      }

      animTimeRef.current = 0;
      isPlayingRef.current = true;
      lastTimeRef.current = performance.now();
    },
    [interactive, allowTextSpiral]
  );

  useImperativeHandle(
    ref,
    () => ({
      triggerFlight: (force: boolean = true) => triggerFlight(force),
    }),
    [triggerFlight]
  );

  useEffect(() => {
    if (!animate) return;

    let rafId: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      if (isPlayingRef.current) {
        animTimeRef.current += dt;
        const currentMode = flightModeRef.current;
        const cycle = currentMode === 'spiral-text' ? 5.6 : 4.4;

        if (animTimeRef.current >= cycle) {
          if (autoLoop) {
            const count = flightCycleCountRef.current;
            const nextMode: 'crest' | 'spiral-text' =
              allowTextSpiral && count % 2 === 1 ? 'spiral-text' : 'crest';
            flightModeRef.current = nextMode;
            setFlightMode(nextMode);
            flightCycleCountRef.current = count + 1;
            globalCachedFlightCycle = count + 1;
            animTimeRef.current = 0;
          } else {
            isPlayingRef.current = false;
            animTimeRef.current = 0;
            applyTransform(0, 0, 1, 0, false, 0);
            if (lastWindRef.current) {
              lastWindRef.current = false;
              setShowWind(false);
            }
            if (onFlightComplete) onFlightComplete();
          }
        }

        if (isPlayingRef.current) {
          const { x, y, scale, rotate, isFlapping, isLandingUnfold, unfoldProgress, windActive } =
            calculateTransform(animTimeRef.current, flightModeRef.current);

          applyTransform(x, y, scale, rotate, isFlapping, isLandingUnfold ? unfoldProgress : 0);

          if (windActive !== lastWindRef.current) {
            lastWindRef.current = windActive;
            setShowWind(windActive);
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [animate, autoLoop, onFlightComplete, allowTextSpiral]);

  return (
    <div
      style={{ width: size, height: (size * 700) / 600, overflow: 'visible' }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-visible group/ezbutterfly ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        triggerFlight(true);
      }}
      title="Click to trigger butterfly flight"
    >
      <svg
        viewBox="0 0 600 700"
        width={size}
        height={(size * 700) / 600}
        overflow="visible"
        style={{ overflow: 'visible' }}
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

          {/* Butterfly Wing Colorful Jewel Gradients */}
          <linearGradient id="ezWingPageGradLeft" x1="100%" y1="35%" x2="0%" y2="65%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="14%" stopColor="#7c3aed" />
            <stop offset="32%" stopColor="#2563eb" />
            <stop offset="52%" stopColor="#06b6d4" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="85%" stopColor="#ec4899" />
            <stop offset="95%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          <linearGradient id="ezWingPageGradRight" x1="0%" y1="35%" x2="100%" y2="65%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="14%" stopColor="#7c3aed" />
            <stop offset="32%" stopColor="#2563eb" />
            <stop offset="52%" stopColor="#06b6d4" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="85%" stopColor="#ec4899" />
            <stop offset="95%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          {/* Secondary Wing Jewel Inlay Gradients */}
          <radialGradient id="ezWingUpperJewelL" cx="65%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ezWingUpperJewelR" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ezWingLowerJewelL" cx="70%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="40%" stopColor="#f43f5e" stopOpacity="0.55" />
            <stop offset="80%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ezWingLowerJewelR" cx="30%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="40%" stopColor="#f43f5e" stopOpacity="0.55" />
            <stop offset="80%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>

          {/* Specular Glare Arc Gradients */}
          <linearGradient id="ezWingGlareArcL" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="80%" stopColor="#67e8f9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="ezWingGlareArcR" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="80%" stopColor="#67e8f9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Glair Lustre Sweep (Iridescent Sheen) */}
          <linearGradient id="ezLustreSheenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="28%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="48%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="72%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Vein Gold & Diamond Filigree */}
          <linearGradient id="ezVeinGoldL" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="ezVeinGoldR" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.75" />
          </linearGradient>

          {/* Wings Combined Clip Path for Lustre Sweep */}
          <clipPath id="ezButterflyWingsClip">
            <path d="M 296 242 C 275 208 195 168 142 200 C 118 215 110 248 120 282 C 130 315 158 332 176 354 C 152 388 140 425 168 456 C 200 488 255 470 296 445 Z M 304 242 C 325 208 405 168 458 200 C 482 215 490 248 480 282 C 470 315 442 332 424 354 C 448 388 460 425 432 456 C 400 488 345 470 304 445 Z" />
          </clipPath>

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

          {/* Examizo Text Spiral Wind Ribbon Gradient */}
          <linearGradient id="ezSpiralWindGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="15%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#ec4899" stopOpacity="0.8" />
            <stop offset="90%" stopColor="#818cf8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <filter id="ezStarGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="ezCrestShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#020617" floodOpacity="0.65" />
          </filter>

          <filter id="ezWingShadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#020617" floodOpacity="0.4" />
          </filter>
        </defs>

        <style>{`
          @keyframes ezStarPulse {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.25); opacity: 1; }
          }
          @-webkit-keyframes ezStarPulse {
            0%, 100% { -webkit-transform: scale(1); opacity: 0.95; }
            50% { -webkit-transform: scale(1.25); opacity: 1; }
          }
          @keyframes ezWindDash {
            0% { stroke-dashoffset: 800; opacity: 0; }
            20% { opacity: 0.95; }
            80% { opacity: 0.95; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          @-webkit-keyframes ezWindDash {
            0% { stroke-dashoffset: 800; opacity: 0; }
            20% { opacity: 0.95; }
            80% { opacity: 0.95; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          @keyframes ezSpiralWindDash {
            0% { stroke-dashoffset: 1800; opacity: 0; }
            15% { opacity: 0.95; }
            85% { opacity: 0.95; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          @-webkit-keyframes ezSpiralWindDash {
            0% { stroke-dashoffset: 1800; opacity: 0; }
            15% { opacity: 0.95; }
            85% { opacity: 0.95; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          @keyframes ezLustreShine {
            0% { transform: translateX(-320px) skewX(-24deg); opacity: 0; }
            15% { opacity: 0.85; }
            35% { transform: translateX(280px) skewX(-24deg); opacity: 0.85; }
            45%, 100% { transform: translateX(340px) skewX(-24deg); opacity: 0; }
          }
          @-webkit-keyframes ezLustreShine {
            0% { -webkit-transform: translateX(-320px) skewX(-24deg); opacity: 0; }
            15% { opacity: 0.85; }
            35% { -webkit-transform: translateX(280px) skewX(-24deg); opacity: 0.85; }
            45%, 100% { -webkit-transform: translateX(340px) skewX(-24deg); opacity: 0; }
          }
          @keyframes ezGlintTwinkle {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 1; }
          }
          @-webkit-keyframes ezGlintTwinkle {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 1; }
          }
          .ez-star-twinkle {
            transform-box: fill-box;
            -webkit-transform-box: fill-box;
            transform-origin: center;
            -webkit-transform-origin: center;
            animation: ezStarPulse 3s ease-in-out infinite;
            -webkit-animation: ezStarPulse 3s ease-in-out infinite;
          }
          .ez-wind-1 {
            stroke-dasharray: 180 600;
            animation: ezWindDash 1.6s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            -webkit-animation: ezWindDash 1.6s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
          }
          .ez-wind-2 {
            stroke-dasharray: 240 700;
            animation: ezWindDash 2.0s 0.2s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
            -webkit-animation: ezWindDash 2.0s 0.2s cubic-bezier(0.2, 0.8, 0.3, 1) infinite;
          }
          .ez-spiral-wind-1 {
            stroke-dasharray: 320 1600;
            animation: ezSpiralWindDash 2.4s cubic-bezier(0.2, 0.8, 0.25, 1) infinite;
            -webkit-animation: ezSpiralWindDash 2.4s cubic-bezier(0.2, 0.8, 0.25, 1) infinite;
          }
          .ez-spiral-wind-2 {
            stroke-dasharray: 260 1400;
            animation: ezSpiralWindDash 2.8s 0.3s cubic-bezier(0.2, 0.8, 0.25, 1) infinite;
            -webkit-animation: ezSpiralWindDash 2.8s 0.3s cubic-bezier(0.2, 0.8, 0.25, 1) infinite;
          }
          .ez-lustre-sweep {
            animation: ezLustreShine 4.2s ease-in-out infinite;
            -webkit-animation: ezLustreShine 4.2s ease-in-out infinite;
          }
          .ez-glint-left {
            animation: ezGlintTwinkle 2.8s ease-in-out infinite;
            -webkit-animation: ezGlintTwinkle 2.8s ease-in-out infinite;
          }
          .ez-glint-right {
            animation: ezGlintTwinkle 2.8s 1.4s ease-in-out infinite;
            -webkit-animation: ezGlintTwinkle 2.8s 1.4s ease-in-out infinite;
          }
        `}</style>

        {/* Shield and North Star Base (Crest Shadow applied only to shield group) */}
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
        </g>

        {/* Gust of Wind Streams (Active when flying around crest) */}
        {showWind && flightMode === 'crest' && (
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

        {/* Examizo Text Spiral Wind & Stardust Trail (Active when spiraling the Examizo text) */}
        {showWind && flightMode === 'spiral-text' && (
          <g>
            <path
              className="ez-spiral-wind-1"
              d="M 300 340 C 380 260 440 220 520 260 C 620 310 700 460 820 440 C 940 420 1020 220 1140 240 C 1260 260 1340 460 1460 440 C 1580 420 1660 220 1780 250 C 1900 280 1960 400 2050 340 C 2150 260 2160 140 2050 150 C 1920 160 1400 180 300 340"
              fill="none"
              stroke="url(#ezSpiralWindGrad)"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <path
              className="ez-spiral-wind-2"
              d="M 460 300 C 580 230 680 470 800 450 C 920 430 1020 230 1140 250 C 1260 270 1360 470 1480 450 C 1600 430 1700 230 1820 270 C 1940 310 2080 340 2100 220 C 2120 160 1980 140 1800 150 C 1300 180 700 220 340 330"
              fill="none"
              stroke="url(#ezWindGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.85"
            />
            <g filter="url(#ezStarGlow)">
              <circle className="ez-star-twinkle" cx="520" cy="260" r="4.5" fill="#fef08a" opacity="0.9" />
              <circle className="ez-star-twinkle" cx="820" cy="440" r="4" fill="#38bdf8" opacity="0.9" />
              <circle className="ez-star-twinkle" cx="1140" cy="240" r="5" fill="#fef08a" opacity="0.95" />
              <circle className="ez-star-twinkle" cx="1460" cy="440" r="4" fill="#38bdf8" opacity="0.9" />
              <circle className="ez-star-twinkle" cx="1780" cy="250" r="4.5" fill="#fef08a" opacity="0.9" />
              <circle className="ez-star-twinkle" cx="2050" cy="150" r="6" fill="#fde047" opacity="1" />
            </g>
          </g>
        )}

        {/* ================= BUTTERFLY-BOOK CENTERPIECE ================= */}
        {/* Hardware-accelerated native SVG transform in viewBox coordinates with zero WebKit CSS pixel drift */}
        <g
          ref={butterflyRef}
          transform="translate(0 0) translate(300 340) rotate(0) scale(1) translate(-300 -340)"
          style={{
            willChange: 'transform',
          }}
        >
          <g filter="url(#ezWingShadow)">
            {/* Back Aura */}
            <ellipse cx="300" cy="335" rx="145" ry="115" fill="#38bdf8" opacity="0.12" />

            {/* LEFT WING / BOOK PAGE (Direct SVG transform driven) */}
            <g ref={leftWingRef}>
              {/* Main Colorful Wing Base */}
              <path
                d="M 296 242 C 275 208 195 168 142 200 C 118 215 110 248 120 282 C 130 315 158 332 176 354 C 152 388 140 425 168 456 C 200 488 255 470 296 445 Z"
                fill="url(#ezWingPageGradLeft)"
                stroke="url(#ezWingGoldTrim)"
                strokeWidth="8"
                strokeLinejoin="round"
              />

              {/* Upper Lobe Jewel Inlay */}
              <path
                d="M 284 254 C 255 228 198 200 155 220 C 136 230 130 252 138 275 C 148 300 172 316 195 330 C 235 305 268 280 284 254 Z"
                fill="url(#ezWingUpperJewelL)"
              />

              {/* Lower Lobe Jewel Inlay */}
              <path
                d="M 282 390 C 248 405 210 415 185 432 C 168 444 180 460 205 462 C 238 464 268 442 288 418 Z"
                fill="url(#ezWingLowerJewelL)"
              />

              {/* Inner Page Shading Contour */}
              <path
                d="M 294 252 C 274 222 202 184 152 212 C 132 225 125 252 133 280 C 142 310 168 326 185 348 C 162 382 152 415 178 442 C 205 468 254 454 294 432"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                opacity="0.75"
              />

              {/* Book Page Crease Lines / Luminous Veins */}
              <path d="M 294 276 C 255 248 202 224 158 238" fill="none" stroke="url(#ezVeinGoldL)" strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />
              <path d="M 294 310 C 250 292 198 278 152 296" fill="none" stroke="url(#ezVeinGoldL)" strokeWidth="2.8" strokeLinecap="round" opacity="0.85" />
              <path d="M 294 345 C 255 338 212 336 182 352" fill="none" stroke="url(#ezVeinGoldL)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
              <path d="M 294 380 C 255 388 216 394 182 418" fill="none" stroke="url(#ezVeinGoldL)" strokeWidth="2.8" strokeLinecap="round" opacity="0.85" />
              <path d="M 294 415 C 265 426 232 440 205 452" fill="none" stroke="url(#ezVeinGoldL)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

              {/* Specular Glare / Lustre Gloss Cap (Upper Ridge Reflection) */}
              <path
                d="M 296 242 C 275 208 195 168 142 200 C 132 206 130 216 142 216 C 185 192 260 220 294 250 Z"
                fill="url(#ezWingGlareArcL)"
              />

              {/* Diamond Glint Star Sparkle */}
              <g className="ez-glint-left" filter="url(#ezStarGlow)">
                <path d="M 144 194 Q 144 202 152 202 Q 144 202 144 210 Q 144 202 136 202 Q 144 202 144 194 Z" fill="#ffffff" />
                <circle cx="144" cy="202" r="2" fill="#fef08a" />
              </g>
            </g>

            {/* RIGHT WING / BOOK PAGE (Direct SVG transform driven) */}
            <g ref={rightWingRef}>
                {/* Main Colorful Wing Base */}
                <path
                  d="M 304 242 C 325 208 405 168 458 200 C 482 215 490 248 480 282 C 470 315 442 332 424 354 C 448 388 460 425 432 456 C 400 488 345 470 304 445 Z"
                  fill="url(#ezWingPageGradRight)"
                  stroke="url(#ezWingGoldTrim)"
                  strokeWidth="8"
                  strokeLinejoin="round"
                />

                {/* Upper Lobe Jewel Inlay */}
                <path
                  d="M 316 254 C 345 228 402 200 445 220 C 464 230 470 252 462 275 C 452 300 428 316 405 330 C 365 305 332 280 316 254 Z"
                  fill="url(#ezWingUpperJewelR)"
                />

                {/* Lower Lobe Jewel Inlay */}
                <path
                  d="M 318 390 C 352 405 390 415 415 432 C 432 444 420 460 395 462 C 362 464 332 442 312 418 Z"
                  fill="url(#ezWingLowerJewelR)"
                />

                {/* Inner Page Shading Contour */}
                <path
                  d="M 306 252 C 326 222 398 184 448 212 C 468 225 475 252 467 280 C 458 310 432 326 415 348 C 438 382 448 415 422 442 C 395 468 346 454 306 432"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  opacity="0.75"
                />

                {/* Book Page Crease Lines / Luminous Veins */}
                <path d="M 306 276 C 345 248 398 224 442 238" fill="none" stroke="url(#ezVeinGoldR)" strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />
                <path d="M 306 310 C 350 292 402 278 448 296" fill="none" stroke="url(#ezVeinGoldR)" strokeWidth="2.8" strokeLinecap="round" opacity="0.85" />
                <path d="M 306 345 C 345 338 388 336 418 352" fill="none" stroke="url(#ezVeinGoldR)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <path d="M 306 380 C 345 388 384 394 418 418" fill="none" stroke="url(#ezVeinGoldR)" strokeWidth="2.8" strokeLinecap="round" opacity="0.85" />
                <path d="M 306 415 C 335 426 368 440 395 452" fill="none" stroke="url(#ezVeinGoldR)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

                {/* Specular Glare / Lustre Gloss Cap (Upper Ridge Reflection) */}
                <path
                  d="M 304 242 C 325 208 405 168 458 200 C 468 206 470 216 458 216 C 415 192 340 220 306 250 Z"
                  fill="url(#ezWingGlareArcR)"
                />

                {/* Diamond Glint Star Sparkle */}
                <g className="ez-glint-right" filter="url(#ezStarGlow)">
                  <path d="M 456 194 Q 456 202 464 202 Q 456 202 456 210 Q 456 202 448 202 Q 456 202 456 194 Z" fill="#ffffff" />
                  <circle cx="456" cy="202" r="2" fill="#fef08a" />
                </g>
              </g>

              {/* Animated Lustre Shine / Glare Light Sweep across Butterfly Wings */}
              <g clipPath="url(#ezButterflyWingsClip)" opacity="0.7">
                <rect className="ez-lustre-sweep" x="80" y="150" width="140" height="340" fill="url(#ezLustreSheenGrad)" />
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
                <circle cx="219" cy="202" r="1.8" fill="#ffffff" />

                <path
                  d="M 303 228 C 315 194 360 180 384 200 C 392 206 388 216 380 214 C 372 212 370 202 380 198"
                  fill="none"
                  stroke="url(#ezWingGoldTrim)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="382" cy="204" r="5.5" fill="url(#ezWingGoldTrim)" />
                <circle cx="383" cy="202" r="1.8" fill="#ffffff" />

                {/* Head */}
                <circle cx="300" cy="232" r="11" fill="url(#ezSpineGold)" />
                <circle cx="298" cy="229" r="3" fill="#ffffff" opacity="0.75" />

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
            <path d="M 68 560 L 130 560 L 130 616 L 68 616 L 95 588 Z" fill="url(#ezRibbonDark)" stroke="#92400e" strokeWidth="1" />
            <polygon points="120,542 130,560 130,616" fill="#451a03" />

            {/* Right Tail */}
            <path d="M 532 560 L 470 560 L 470 616 L 532 616 L 505 588 Z" fill="url(#ezRibbonDark)" stroke="#92400e" strokeWidth="1" />
            <polygon points="480,542 470,560 470,616" fill="#451a03" />

            {/* Front Curved Ribbon Face */}
            <path
              d="M 115 542 Q 300 572 485 542 L 475 616 Q 300 648 125 616 Z"
              fill="url(#ezRibbonGold)"
              stroke="#78350f"
              strokeWidth="1.5"
            />
            {/* Lustrous Gold Bevel Highlights on Ribbon */}
            <path d="M 116 544 Q 300 574 484 544" fill="none" stroke="#fffbeb" strokeWidth="2.5" />
            <path d="M 126 614 Q 300 646 474 614" fill="none" stroke="#92400e" strokeWidth="2" />

            {/* EXAMIZO Typography */}
            <text
              x="300"
              y="585"
              textAnchor="middle"
              fontFamily="var(--font-cinzel), 'Cinzel', 'Playfair Display', serif"
              fontSize="34"
              fontWeight="900"
              letterSpacing="0.22em"
              fill="#0a1329"
            >
              EXAMIZO
            </text>
            <text
              x="300"
              y="586"
              textAnchor="middle"
              fontFamily="var(--font-cinzel), 'Cinzel', 'Playfair Display', serif"
              fontSize="34"
              fontWeight="900"
              letterSpacing="0.22em"
              fill="none"
              stroke="#fffbeb"
              strokeWidth="0.7"
              opacity="0.4"
            >
              EXAMIZO
            </text>

            {/* ESTD Typography in Ribbon */}
            <text
              x="300"
              y="607.5"
              textAnchor="middle"
              fontFamily="var(--font-cinzel), 'Cinzel', 'Playfair Display', serif"
              fontSize="15.5"
              fontWeight="800"
              letterSpacing="0.28em"
              fill="#451a03"
            >
              • ESTD. 2026 •
            </text>
            <text
              x="300"
              y="608.2"
              textAnchor="middle"
              fontFamily="var(--font-cinzel), 'Cinzel', 'Playfair Display', serif"
              fontSize="15.5"
              fontWeight="800"
              letterSpacing="0.28em"
              fill="none"
              stroke="#fffbeb"
              strokeWidth="0.5"
              opacity="0.5"
            >
              • ESTD. 2026 •
            </text>
          </g>
      </svg>
    </div>
  );
});

ExamizoButterflyIcon.displayName = 'ExamizoButterflyIcon';

export default ExamizoButterflyIcon;
