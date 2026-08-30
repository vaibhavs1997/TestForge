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
    primary: '#4FD1C5',
    secondary: '#5A5A5A',
    background: '#F2F4F8',
    surface: 'rgba(255, 255, 255, 0.6)',
    text: '#0A192F',
    textSecondary: '#5A5A5A',
    border: 'rgba(10, 25, 47, 0.18)',
    success: '#167348',
    warning: '#EBBE63',
    error: '#FF6F61',
  },
  spacing,
  radius,
  shadows,
  typography,
};

export type LightTheme = typeof lightTheme;
