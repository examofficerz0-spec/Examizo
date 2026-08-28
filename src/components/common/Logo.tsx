import React from 'react';
import { ExamizoIcon } from './ExamizoIcon';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
  textColor?: string;
  animate?: boolean;
  interactive?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 38,
  showText = true,
  textColor,
  animate = true,
  interactive = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 group examizo-container select-none ${className}`}>
      <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
        <ExamizoIcon size={size} animate={animate} interactive={interactive} />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-black text-xl tracking-tight font-sans transition-colors duration-200 ${
              textColor || 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}
          >
            Examizo
          </span>
        </div>
      )}
    </div>
  );
};
