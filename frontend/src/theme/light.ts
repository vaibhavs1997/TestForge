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
    // Aadhaar-inspired light palette: deep indigo controls on a soft lavender canvas.
    primary: '#302D78',
    secondary: '#625F83',
    background: '#F8F7FC',
    surface: '#ffffff',
    text: '#26234C',
    textSecondary: '#625F83',
    border: '#E5E2F0',
    success: '#167348',
    warning: '#B86B12',
    error: '#C63D42',
  },
  spacing,
  radius,
  shadows,
  typography,
};

export type LightTheme = typeof lightTheme;
