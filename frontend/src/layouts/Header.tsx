// External libraries
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Home, FolderKanban } from 'lucide-react';

// Shared constants
import { APP_NAME } from '../constants';

// Hooks
import { useThemeStore } from '../store/themeStore';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const isOnProjectsArea = location.pathname.startsWith('/projects');

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-lg font-semibold text-text transition-opacity hover:opacity-80">
          {APP_NAME}
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {isOnProjectsArea ? (
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        ) : (
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <FolderKanban className="h-4 w-4" />
            Projects
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
