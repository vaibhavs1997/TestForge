import { authStore } from '../store/authStore';

/** Where marketing CTAs should send users (sign-in vs open app). */
export function useAuthEntryPaths() {
  const loginRequired = authStore((s) => s.loginRequired);

  if (loginRequired) {
    return {
      signInPath: '/?auth=login',
      signUpPath: '/?auth=register',
      appEntryPath: '/?auth=login',
      startPath: '/?auth=register',
    };
  }

  return {
    signInPath: '/projects',
    signUpPath: '/projects',
    appEntryPath: '/projects',
    startPath: '/projects',
  };
}

export default useAuthEntryPaths;
