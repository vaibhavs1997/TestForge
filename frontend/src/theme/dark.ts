// External libraries

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { typography } from './typography';

export const darkTheme = {
  colors: {
    primary: '#60a5fa',
    secondary: '#cbd5e1',
    background: '#020617',
    surface: '#0f172a',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    border: '#1e293b',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  spacing,
  radius,
  shadows,
  typography,
};

export type DarkTheme = typeof darkTheme;
