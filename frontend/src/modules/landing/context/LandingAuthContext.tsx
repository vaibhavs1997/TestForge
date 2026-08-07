import React from 'react';
import { LandingAuthModal } from '../components/LandingAuthModal';

export type LandingAuthMode = 'login' | 'register';

type LandingAuthContextValue = {
  openLogin: () => void;
  openRegister: () => void;
  closeAuth: () => void;
};

const LandingAuthContext = React.createContext<LandingAuthContextValue | null>(null);

export function useLandingAuth(): LandingAuthContextValue {
  const ctx = React.useContext(LandingAuthContext);
  if (!ctx) {
    throw new Error('useLandingAuth must be used within LandingAuthProvider');
  }
  return ctx;
}

export type LandingAuthProviderProps = {
  children: React.ReactNode;
  authMode: LandingAuthMode | null;
  sessionExpired: boolean;
  onAuthModeChange: (mode: LandingAuthMode | null) => void;
};

export const LandingAuthProvider: React.FC<LandingAuthProviderProps> = ({
  children,
  authMode,
  sessionExpired,
  onAuthModeChange,
}) => {
  const openLogin = React.useCallback(() => onAuthModeChange('login'), [onAuthModeChange]);
  const openRegister = React.useCallback(() => onAuthModeChange('register'), [onAuthModeChange]);
  const closeAuth = React.useCallback(() => onAuthModeChange(null), [onAuthModeChange]);

  const value = React.useMemo(
    () => ({ openLogin, openRegister, closeAuth }),
    [openLogin, openRegister, closeAuth],
  );

  return (
    <LandingAuthContext.Provider value={value}>
      {children}
      {authMode ? (
        <LandingAuthModal
          mode={authMode}
          sessionExpired={sessionExpired}
          onClose={closeAuth}
          onSwitchMode={onAuthModeChange}
        />
      ) : null}
    </LandingAuthContext.Provider>
  );
};

export default LandingAuthProvider;
