// External libraries
import React from 'react';
import { Sun, Moon } from 'lucide-react';

// Shared constants
import { APP_NAME } from '../constants';

// Shared types

// Hooks
import { useThemeStore } from '../store/themeStore';

// Services

// Components

// Styles

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-text">{APP_NAME}</h2>
      </div>
      <div className="flex items-center gap-4">
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