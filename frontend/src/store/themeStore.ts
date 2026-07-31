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

export const useThemeStore = create<ThemeState>((set, get) => {
  // Initialize theme from localStorage and apply to document
  const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: initialTheme,
    toggleTheme: () => {
      const newTheme = get().theme === 'light' ? 'dark' : 'light';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', newTheme);
      set({ theme: newTheme });
    },
  };
});