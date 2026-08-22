'use client';

import React from 'react';

interface ExamizoIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const ExamizoIcon: React.FC<ExamizoIconProps> = ({
  size = 42,
  className = '',
  animate = true,
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-visible group/icon ${className}`}
    >
      <svg
        viewBox="0 0 220 220"
        width={size}
        height={size}
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients matching the signature Examizo Ribbon Logo */}
          <linearGradient id="ezTopBarGrad" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#1a56db" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id="ezMidBarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a1931" />
            <stop offset="50%" stopColor="#0f2b5c" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          <linearGradient id="ezBotBarGrad" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id="ezSpineMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="30%" stopColor="#2563eb" />
            <stop offset="70%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>

          <linearGradient id="ezSpineDarkFold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b172a" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>

          {/* Mortarboard Graduation Cap Gradients */}
          <linearGradient id="ezHatTopGrad" x1="0%" y1="70%" x2="100%" y2="30%">
            <stop offset="0%" stopColor="#071126" />
            <stop offset="30%" stopColor="#0c234b" />
            <stop offset="70%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          <linearGradient id="ezHatSideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#071126" />
            <stop offset="100%" stopColor="#030814" />
          </linearGradient>

          <linearGradient id="ezTasselGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#0f2b5c" />
            <stop offset="100%" stopColor="#071126" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="ezDropShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#1e40af" floodOpacity="0.3" />
          </filter>
        </defs>

        <style>{`
          /* Fluid Floating Tilt Animation for the Graduation Hat */
          @keyframes ezHatInfiniteFloat {
            0%, 100% {
              transform: translate3d(0, 0px, 0) rotate(0deg);
              -webkit-transform: translate3d(0, 0px, 0) rotate(0deg);
            }
            25% {
              transform: translate3d(0, -3.5px, 0) rotate(-2.5deg);
              -webkit-transform: translate3d(0, -3.5px, 0) rotate(-2.5deg);
            }
            50% {
              transform: translate3d(0, -0.8px, 0) rotate(1.2deg);
              -webkit-transform: translate3d(0, -0.8px, 0) rotate(1.2deg);
            }
            75% {
              transform: translate3d(0, -2.8px, 0) rotate(-1.2deg);
              -webkit-transform: translate3d(0, -2.8px, 0) rotate(-1.2deg);
            }
          }

          /* Fluid Continuous Swaying Loop for the Tassel */
          @keyframes ezTasselContinuousLoop {
            0%, 100% {
              transform: rotate(0deg);
              -webkit-transform: rotate(0deg);
            }
            25% {
              transform: rotate(-18deg);
              -webkit-transform: rotate(-18deg);
            }
            50% {
              transform: rotate(14deg);
              -webkit-transform: rotate(14deg);
            }
            75% {
              transform: rotate(-10deg);
              -webkit-transform: rotate(-10deg);
            }
          }

          /* Fluid Secondary Wave for the Tassel Brush Tip */
          @keyframes ezTasselBrushContinuous {
            0%, 100% {
              transform: rotate(0deg) skewX(0deg);
              -webkit-transform: rotate(0deg) skewX(0deg);
            }
            25% {
              transform: rotate(-12deg) skewX(-6deg);
              -webkit-transform: rotate(-12deg) skewX(-6deg);
            }
            50% {
              transform: rotate(10deg) skewX(5deg);
              -webkit-transform: rotate(10deg) skewX(5deg);
            }
            75% {
              transform: rotate(-6deg) skewX(-3deg);
              -webkit-transform: rotate(-6deg) skewX(-3deg);
            }
          }

          .ez-hat-animated {
            transform-origin: 110px 72px;
            -webkit-transform-origin: 110px 72px;
            will-change: transform;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            animation: ezHatInfiniteFloat 3.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            -webkit-animation: ezHatInfiniteFloat 3.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          }

          .ez-tassel-loop {
            transform-origin: 64px 72px;
            -webkit-transform-origin: 64px 72px;
            will-change: transform;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            animation: ezTasselContinuousLoop 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            -webkit-animation: ezTasselContinuousLoop 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          }

          .ez-tassel-brush-loop {
            transform-origin: 62px 90px;
            -webkit-transform-origin: 62px 90px;
            will-change: transform;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            animation: ezTasselBrushContinuous 2.8s ease-in-out infinite;
            -webkit-animation: ezTasselBrushContinuous 2.8s ease-in-out infinite;
          }

          .ez-e-animated {
            transform-origin: 110px 140px;
            -webkit-transform-origin: 110px 140px;
            will-change: transform;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }

          .group\\/icon:hover .ez-hat-animated,
          .group:hover .ez-hat-animated,
          .examizo-container:hover .ez-hat-animated {
            animation: ezHatInfiniteFloat 2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            -webkit-animation: ezHatInfiniteFloat 2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          }

          .group\\/icon:hover .ez-tassel-loop,
          .group:hover .ez-tassel-loop,
          .examizo-container:hover .ez-tassel-loop {
            animation: ezTasselContinuousLoop 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
            -webkit-animation: ezTasselContinuousLoop 1.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          }
        `}</style>

        {/* 1. Base Stylized 'E' Ribbon Group */}
        <g filter="url(#ezDropShadow)" className={animate ? 'ez-e-animated' : ''}>
          {/* Top Bar of 'E' */}
          <path
            d="M 96 90 C 114 86 138 84 158 84 C 165 84 170 89 170 96 C 170 102 165 107 158 107 C 128 107 106 109 90 113 Z"
            fill="url(#ezTopBarGrad)"
          />

          {/* Under Spine Dark Depth Layer */}
          <path
            d="M 98 94 L 70 148 C 66 156 70 167 80 174 C 84 176 89 177 94 177 L 115 132 C 118 123 112 113 102 111 Z"
            fill="url(#ezSpineDarkFold)"
          />

          {/* Middle Bar of 'E' (Dark Ribbon fold) */}
          <path
            d="M 96 114 C 108 111 128 110 146 110 C 153 110 158 114 158 120 C 158 126 152 131 144 131 C 124 131 106 136 86 144 C 81 146 77 143 79 137 C 83 128 90 119 96 114 Z"
            fill="url(#ezMidBarGrad)"
          />

          {/* Bottom Bar of 'E' */}
          <path
            d="M 76 160 C 72 171 80 184 92 184 L 148 184 C 157 184 162 178 158 170 C 155 163 148 159 140 159 L 96 159 C 88 159 80 158 76 160 Z"
            fill="url(#ezBotBarGrad)"
          />

          {/* Dynamic Front Spine Ribbon (Sweeping 3D Blue Curve) */}
          <path
            d="M 136 86 C 116 88 94 103 84 120 C 66 148 58 174 74 187 C 82 194 96 193 106 183 C 115 174 122 157 126 146 C 128 140 124 134 117 134 C 105 134 94 143 90 154 C 85 167 75 169 73 158 C 71 145 82 123 97 108 C 108 97 122 90 136 86 Z"
            fill="url(#ezSpineMain)"
          />
        </g>

        {/* 2. Mortarboard Graduation Cap (The Hat with Infinite Floating Motion) */}
        <g className={animate ? 'ez-hat-animated' : ''}>
          {/* Skull cap band sitting on E's crest */}
          <path
            d="M 94 72 C 105 70 128 72 142 76 L 140 92 C 124 96 104 94 94 88 Z"
            fill="url(#ezHatSideGrad)"
          />

          {/* Mortarboard Diamond Board */}
          <polygon
            points="112,32 182,54 112,76 42,54"
            fill="url(#ezHatTopGrad)"
          />

          {/* Top highlight facet */}
          <polygon
            points="112,32 182,54 112,38 48,54"
            fill="#60a5fa"
            opacity="0.4"
          />

          {/* Center Mortarboard Button */}
          <ellipse cx="112" cy="54" rx="5" ry="3.5" fill="#071126" />

          {/* Tassel Assembly (Continuous Infinite Swaying Loop) */}
          <g className={animate ? 'ez-tassel-loop' : ''}>
            {/* Tassel Cord hanging from hat to left */}
            <path
              d="M 112 54 Q 80 58 64 72 L 62 90"
              fill="none"
              stroke="#071126"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Tassel Ring & Brush Tip with fluid secondary flex */}
            <g className={animate ? 'ez-tassel-brush-loop' : ''}>
              <circle cx="62" cy="90" r="4" fill="#071126" />
              <path
                d="M 59 92 L 65 92 L 68 112 C 68 114 56 114 56 112 Z"
                fill="url(#ezTasselGrad)"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
