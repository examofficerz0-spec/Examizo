'use client';

import React from 'react';

interface ExamizoIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const ExamizoIcon: React.FC<ExamizoIconProps> = ({
  size = 40,
  className = '',
  animate = true,
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients for E */}
          <linearGradient id="eTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id="eMidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="eBotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id="eSpineFront" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          <linearGradient id="eSpineDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Hat Gradients */}
          <linearGradient id="hatTopGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#0a1128" />
            <stop offset="35%" stopColor="#102a5c" />
            <stop offset="75%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          <linearGradient id="hatCapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1128" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="tasselGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2563eb" floodOpacity="0.25" />
          </filter>
        </defs>

        <style>{`
          @keyframes hatDropIn {
            0% {
              transform: translateY(-40px) rotate(-18deg) scale(1.15);
              opacity: 0;
            }
            65% {
              transform: translateY(4px) rotate(2deg) scale(0.98);
              opacity: 1;
            }
            85% {
              transform: translateY(-2px) rotate(-1deg) scale(1.01);
            }
            100% {
              transform: translateY(0) rotate(0deg) scale(1);
              opacity: 1;
            }
          }

          @keyframes tasselSway {
            0%, 100% {
              transform: rotate(0deg);
            }
            25% {
              transform: rotate(14deg);
            }
            50% {
              transform: rotate(-10deg);
            }
            75% {
              transform: rotate(6deg);
            }
          }

          @keyframes ePulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.02);
            }
          }

          .examizo-hat-animated {
            transform-origin: 100px 65px;
            animation: hatDropIn 1.2s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
          }

          .examizo-tassel-animated {
            transform-origin: 66px 68px;
            animation: tasselSway 2.4s ease-in-out 1.2s infinite;
          }

          .examizo-container:hover .examizo-hat-animated {
            animation: hatDropIn 0.8s cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
          }
        `}</style>

        {/* Group for the 'E' Letter Base */}
        <g filter="url(#logoGlow)" className="transition-transform duration-300">
          {/* Top Bar of 'E' */}
          <path
            d="M 86 86 C 104 81 128 78 152 78 C 158 78 163 83 163 89 C 163 95 158 100 152 100 C 122 100 100 101 84 105 Z"
            fill="url(#eTopGrad)"
          />

          {/* Under Spine Shadow / Depth Layer */}
          <path
            d="M 88 88 L 62 138 C 58 147 62 158 72 165 C 75 167 80 168 85 168 L 105 125 C 109 116 102 106 92 104 Z"
            fill="url(#eSpineDark)"
          />

          {/* Mid Bar of 'E' (Dark Ribbon fold) */}
          <path
            d="M 88 106 C 98 103 118 102 136 102 C 142 102 147 106 147 111 C 147 117 141 123 134 123 C 114 123 96 127 78 135 C 74 137 70 134 72 129 C 76 119 82 110 88 106 Z"
            fill="url(#eMidGrad)"
          />

          {/* Bottom Bar of 'E' */}
          <path
            d="M 68 152 C 64 163 71 176 83 176 L 140 176 C 148 176 153 171 150 163 C 147 156 141 152 133 152 L 88 152 C 80 152 72 150 68 152 Z"
            fill="url(#eBotGrad)"
          />

          {/* Left Flowing Ribbon Spine (Bright Dynamic Curve) */}
          <path
            d="M 126 80 C 106 82 86 96 76 112 C 60 138 52 162 67 175 C 75 182 88 181 97 172 C 106 163 112 148 116 138 C 118 132 114 126 108 126 C 96 126 86 134 82 144 C 77 156 68 158 66 148 C 64 136 74 116 88 102 C 98 92 112 85 126 80 Z"
            fill="url(#eSpineFront)"
          />
        </g>

        {/* Group for Graduation Cap (The Hat) with Landing Animation */}
        <g className={animate ? 'examizo-hat-animated' : ''}>
          {/* Hat Skull Cap underneath diamond */}
          <path
            d="M 85 64 C 95 62 118 64 132 68 L 130 84 C 114 88 95 86 85 80 Z"
            fill="url(#hatCapGrad)"
          />

          {/* Diamond Top Board (Mortarboard) */}
          <polygon
            points="102,28 168,48 102,68 36,48"
            fill="url(#hatTopGrad)"
          />

          {/* Top highlight facet */}
          <polygon
            points="102,28 168,48 102,32 40,48"
            fill="#3b82f6"
            opacity="0.35"
          />

          {/* Center Button on Mortarboard */}
          <ellipse cx="102" cy="48" rx="4.5" ry="3" fill="#0f172a" />

          {/* Tassel Assembly */}
          <g className={animate ? 'examizo-tassel-animated' : ''}>
            {/* Tassel Cord hanging to left */}
            <path
              d="M 102 48 Q 72 52 58 64 L 56 80"
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Tassel Bell / Fringe */}
            <circle cx="56" cy="80" r="3.5" fill="#0a1128" />
            <path
              d="M 53 82 L 59 82 L 61 98 C 61 100 51 100 51 98 Z"
              fill="url(#tasselGrad)"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
