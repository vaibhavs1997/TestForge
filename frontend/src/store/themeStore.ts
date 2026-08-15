// External libraries
import { create } from 'zustand';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem('theme');
  return storedTheme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useThemeStore = create<ThemeState>((set, get) => {
  // Initialize theme from localStorage and apply it only in browser contexts.
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  return {
    theme: initialTheme,
    toggleTheme: () => {
      const newTheme = get().theme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('theme', newTheme);
      }
      set({ theme: newTheme });
    },
  };
});
