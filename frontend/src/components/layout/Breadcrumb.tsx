// External libraries
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Consistent breadcrumb navigation component.
 *
 * Renders a trail of items (e.g., Project → Module → Submodule).
 * The last item is always rendered as plain text (non-link).
 * Supports browser navigation via react-router Links.
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-sm', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
            )}
            {isLast || !item.to ? (
              <span
                className="font-medium text-text"
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className="text-text-secondary transition-colors hover:text-text hover:underline"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

/**
 * Hook helper that returns breadcrumb items for a project workspace.
 *
 * Given a projectId and a map of module → submodule labels, this builds
 * the Project → Module → Submodule trail automatically.
 */
export const useProjectBreadcrumbs = (
  projectId: string,
  moduleLabel: string,
  submoduleLabel?: string
): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    { label: 'Projects', to: '/projects' },
    { label: 'Project', to: `/projects/${projectId}/overview` },
    { label: moduleLabel, to: `/projects/${projectId}/${normalizeModuleKey(moduleLabel)}` },
  ];

  if (submoduleLabel) {
    items.push({ label: submoduleLabel });
  }

  return items;
};

// Helper to normalize a label into a route key (e.g., "API Testing" → "api-testing")
const normalizeModuleKey = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export default Breadcrumb;