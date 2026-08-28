import React from 'react';
import { ExamizoIcon } from './ExamizoIcon';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
  textColor?: string;
  textSize?: string;
  animate?: boolean;
  interactive?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 48,
  showText = true,
  subtitle,
  textColor,
  textSize,
  animate = true,
  interactive = true,
}) => {
  const calculatedTextSize =
    textSize ||
    (size >= 46
      ? 'text-2xl sm:text-[26px]'
      : size >= 38
      ? 'text-2xl'
      : size >= 30
      ? 'text-xl'
      : 'text-lg');

  return (
    <div className={`flex items-center gap-3 group examizo-container select-none ${className}`}>
      <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
        <ExamizoIcon size={size} animate={animate} interactive={interactive} />
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-black tracking-tight font-sans leading-none transition-colors duration-200 ${calculatedTextSize} ${
              textColor || 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}
          >
            Examizo
          </span>
          {subtitle && (
            <span className="text-[10px] tracking-wider uppercase font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
