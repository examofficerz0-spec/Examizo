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
  size = 53,
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
    (size >= 50
      ? 'text-[26px] sm:text-[29px]'
      : size >= 42
      ? 'text-[25px] sm:text-[27px]'
      : size >= 33
      ? 'text-[22px]'
      : size >= 26
      ? 'text-[20px]'
      : 'text-base');

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
      onMouseEnter={() => {
        if (interactive) {
          butterflyRef.current?.triggerFlight(false);
        }
      }}
      style={{ overflow: 'visible' }}
      className={`flex items-center gap-3.5 group examizo-container select-none overflow-visible ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="relative shrink-0 z-20 overflow-visible transition-transform duration-300 group-hover:scale-105">
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
