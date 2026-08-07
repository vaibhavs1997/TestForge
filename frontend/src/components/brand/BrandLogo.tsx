import React from 'react';
import { Link } from 'react-router-dom';
import brandLogo from '../../assets/images/brand-logo.png';
import { cn } from '../../utils/cn';

export type BrandLogoVariant = 'sidebar' | 'header' | 'landing' | 'compact';

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  /** Set to false to render without a home link */
  linkTo?: string | false;
}

const imageClass: Record<BrandLogoVariant, string> = {
  sidebar: 'h-[4.25rem] w-auto max-w-full',
  header: 'h-10 w-auto max-w-[12rem]',
  landing: 'h-12 w-auto max-w-[14rem]',
  compact: 'h-9 w-auto max-w-[11rem]',
};

/**
 * TestForge brand mark — PNG on a light card so it reads on dark app chrome.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'sidebar',
  className,
  linkTo = '/',
}) => {
  const content = (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/10',
        variant === 'landing' && 'shadow-md ring-white/20',
        className,
      )}
    >
      <img
        src={brandLogo}
        alt="TestForge — AI-Powered Quality Assurance"
        className={cn('object-contain object-left', imageClass[variant])}
        width={200}
        height={64}
        decoding="async"
      />
    </span>
  );

  if (linkTo === false) {
    return content;
  }

  return (
    <Link
      to={linkTo}
      className="inline-flex shrink-0 rounded-xl transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="TestForge home"
    >
      {content}
    </Link>
  );
};

export default BrandLogo;
