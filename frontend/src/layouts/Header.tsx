// External libraries
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Home, FolderKanban } from 'lucide-react';

// Components
import { SessionBadge } from '../components/shared/SessionBadge';
import { BrandLogo } from '../components/brand/BrandLogo';
import { useThemeStore } from '../store/themeStore';
import { appPaths } from '../routes/paths';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const isInsideProject = /^\/projects\/[^/]+/.test(location.pathname);
  const isProjectsPage = location.pathname === appPaths.projects;
  const projectHeader = (() => {
    const tab = location.pathname.split('/')[3] || 'overview';
    const headers: Record<string, { title: string; description: string }> = {
      overview: { title: 'Project', description: 'Follow the steps below to go from API contract to test report.' },
      apis: { title: 'APIs', description: 'Import, edit, and execute API requests in your project workspace.' },
      testdata: { title: 'Test data', description: 'Control how TestsForge supplies request data automatically when your APIs run.' },
      knowledge: { title: 'Knowledge', description: 'Upload documentation, tag it, and connect it to the API and Test Data workspace.' },
      requirements: { title: 'Requirements', description: 'Capture acceptance criteria, generate test cases, and prepare them for review.' },
      execution: { title: 'Execution', description: 'Run and manage approved project test suites.' },
      reports: { title: 'Test reports', description: 'Review outcomes from test runs and export results.' },
      'ai-providers': { title: 'AI providers', description: 'Manage LLM connections, defaults, and health for this project.' },
    };
    return headers[tab] || headers.overview;
  })();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex min-w-0 flex-1 items-center">
        <div className="mr-5 md:hidden">
          <BrandLogo variant="header" linkTo="/" />
        </div>
        {(isInsideProject || isProjectsPage) && (
          <div className="hidden md:block">
            <p className="text-lg font-bold leading-tight text-text">
              {isProjectsPage ? 'Your projects' : projectHeader.title}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {isProjectsPage
                ? 'Open a workspace or create one — each project follows import → requirements → run → report.'
                : projectHeader.description}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <SessionBadge />
        {isInsideProject ? (
          <>
            <Link
              to={appPaths.root}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              aria-label="Go to Home"
              title="Go to Home"
            >
              <Home className="h-4 w-4" aria-hidden />
              Home
            </Link>
            <Link
              to={appPaths.projects}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              aria-label="Go to Projects"
              title="Go to Projects"
            >
              <FolderKanban className="h-4 w-4" aria-hidden />
              Projects
            </Link>
          </>
        ) : location.pathname.startsWith(appPaths.projects) ? (
          <Link
            to={appPaths.root}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            aria-label="Go to Home"
            title="Go to Home"
          >
            <Home className="h-4 w-4" aria-hidden />
            Home
          </Link>
        ) : (
          <Link
            to={appPaths.projects}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            aria-label="Go to Projects"
            title="Go to Projects"
          >
            <FolderKanban className="h-4 w-4" aria-hidden />
            Projects
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text transition-colors"
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" aria-hidden /> : <Sun className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </header>
  );
};

export default Header;
