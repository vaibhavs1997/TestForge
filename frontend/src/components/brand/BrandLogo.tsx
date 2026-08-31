import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import brandMark from '../../assets/images/testforge-brand-mark.png';

export type BrandLogoVariant = 'sidebar' | 'header' | 'landing' | 'compact';

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  showLabel?: boolean;
  /** Set to false to render without a home link */
  linkTo?: string | false;
}

const imageClass: Record<BrandLogoVariant, string> = {
  sidebar: 'h-11 w-11',
  header: 'h-10 w-10',
  landing: 'h-12 w-12',
  compact: 'h-9 w-9',
};

const labelClass: Record<BrandLogoVariant, string> = {
  sidebar: 'text-xl',
  header: 'text-lg',
  landing: 'text-2xl',
  compact: 'text-lg',
};

/**
 * TestsForge brand mark — PNG on a light card so it reads on dark app chrome.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'sidebar',
  className,
  showLabel = true,
  linkTo = '/',
}) => {
  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-3 overflow-hidden rounded-xl bg-surface px-2.5 py-1.5 shadow-sm ring-1 ring-white/10 dark:ring-white/10',
        variant === 'landing' && 'shadow-md ring-white/20',
        className,
      )}
    >
      <img
        src={brandMark}
        alt="TestForge — AI-Powered Quality Assurance"
        className={cn('scale-[1.55] rounded-lg object-cover', imageClass[variant])}
        width={64}
        height={64}
        decoding="async"
      />
      {showLabel && <span className={cn('font-bold tracking-tight text-text', labelClass[variant])}>TestsForge</span>}
    </span>
  );

  if (linkTo === false) {
    return content;
  }

  return (
    <Link
      to={linkTo}
      className="inline-flex shrink-0 rounded-xl transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="TestsForge home"
    >
      {content}
    </Link>
  );
};

export default BrandLogo;
