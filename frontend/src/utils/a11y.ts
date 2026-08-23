import React from 'react';

/** Props for decorative icons beside visible text (nav, buttons with labels). */
export const decorativeIcon = { 'aria-hidden': true as const };

export function slugifyFieldId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function describedByIds(...ids: Array<string | false | undefined | null>): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

/** True when button content has no visible text (icon-only). */
export function buttonHasVisibleText(children: React.ReactNode): boolean {
  let hasText = false;
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      if (String(child).trim().length > 0) hasText = true;
    }
  });
  return hasText;
}
