import type { AuthUser } from '../../../services/authApi';

/** Marketing / landing CTAs — always funnel through auth when signed out. */
export function getLandingCtaPaths(user: AuthUser | null | undefined) {
  if (user) {
    return {
      primary: '/projects',
      secondary: '/projects',
      primaryLabel: 'Open workspace',
      secondaryLabel: 'Open workspace',
      signedIn: true as const,
    };
  }
  return {
    primary: '/register',
    secondary: '/login',
    primaryLabel: 'Start free',
    secondaryLabel: 'Sign in',
    signedIn: false as const,
  };
}

export default getLandingCtaPaths;
