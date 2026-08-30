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
    primary: '#4FD1C5',
    secondary: '#A9B0B8',
    background: '#0A192F',
    surface: 'rgba(255, 255, 255, 0.15)',
    text: '#FFFFFF',
    textSecondary: '#A9B0B8',
    border: 'rgba(221, 226, 232, 0.28)',
    success: '#22c55e',
    warning: '#EBBE63',
    error: '#FF6F61',
  },
  spacing,
  radius,
  shadows,
  typography,
};

export type DarkTheme = typeof darkTheme;
