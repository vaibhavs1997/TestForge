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

export const lightTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#dbe4f0',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
  },
  spacing,
  radius,
  shadows,
  typography,
};

export type LightTheme = typeof lightTheme;
