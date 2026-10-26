import React, { useRef } from 'react';
import { ExamizoIcon } from './ExamizoIcon';
import { ExamizoButterflyIcon, ExamizoButterflyIconHandle } from './ExamizoButterflyIcon';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
  textColor?: string;
  textSize?: string;
  animate?: boolean;
  interactive?: boolean;
  variant?: 'butterfly' | 'mascot';
  onClick?: () => void;
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
  variant = 'butterfly',
  onClick,
}) => {
  const butterflyRef = useRef<ExamizoButterflyIconHandle>(null);

  const calculatedTextSize =
    textSize ||
    (size >= 46
      ? 'text-2xl sm:text-[26px]'
      : size >= 38
      ? 'text-2xl'
      : size >= 30
      ? 'text-xl'
      : 'text-lg');

  const handleContainerClick = () => {
    if (interactive) {
      butterflyRef.current?.triggerFlight(true);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`flex items-center gap-3 group examizo-container select-none ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="relative shrink-0 z-20 transition-transform duration-300 group-hover:scale-105">
        {variant === 'butterfly' ? (
          <ExamizoButterflyIcon
            ref={butterflyRef}
            size={size}
            animate={animate}
            interactive={interactive}
            allowTextSpiral={showText}
          />
        ) : (
          <ExamizoIcon size={size} animate={animate} interactive={interactive} />
        )}
      </div>

      {showText && (
        <div className="flex flex-col justify-center relative z-10 pointer-events-none">
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
