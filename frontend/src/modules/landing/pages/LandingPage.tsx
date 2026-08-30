import React, { useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LandingBackground } from '../components/LandingBackground';
import { LandingNav } from '../components/LandingNav';
import { HeroSection } from '../components/HeroSection';
import { LandingFeatures } from '../components/LandingFeatures';
import { LandingOverviewSections } from '../components/LandingOverviewSections';
import { authStore } from '../../../store/authStore';
import { getLandingCtaPaths } from '../utils/landingCta';
import { LandingAuthProvider, type LandingAuthMode } from '../context/LandingAuthContext';
import { useLandingAuth } from '../context/LandingAuthContext';

function LandingCtaButton() {
  const user = authStore((s) => s.user);
  const cta = getLandingCtaPaths(user);
  const { openRegister } = useLandingAuth();

  if (cta.signedIn) {
    return (
      <Link
        to={cta.primary}
        className="landing-primary-action mt-8 inline-flex rounded-2xl px-8 py-3.5 text-sm font-semibold text-white"
      >
        {cta.primaryLabel}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={openRegister}
      className="landing-primary-action mt-8 inline-flex rounded-2xl px-8 py-3.5 text-sm font-semibold text-white"
    >
      Create free account
    </button>
  );
}

export const LandingPage: React.FC = () => {
  const user = authStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const authParam = searchParams.get('auth');
  const sessionExpired = searchParams.get('expired') === '1';
  const authMode: LandingAuthMode | null =
    authParam === 'login' || authParam === 'register' ? authParam : null;

  const setAuthMode = useCallback(
    (mode: LandingAuthMode | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (mode) {
            next.set('auth', mode);
          } else {
            next.delete('auth');
            next.delete('expired');
          }
          return next;
        },
        { replace: true, state: location.state },
      );
    },
    [setSearchParams, location.state],
  );

  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      // Leave theme as user preference when navigating to app
    };
  }, []);

  useEffect(() => {
    if (user && authMode) {
      setAuthMode(null);
    }
  }, [user, authMode, setAuthMode]);

  useEffect(() => {
    if (user) {
      navigate('/projects', { replace: true });
    }
  }, [user, navigate]);


  return (
    <LandingAuthProvider
      authMode={user ? null : authMode}
      sessionExpired={sessionExpired}
      onAuthModeChange={setAuthMode}
    >
      <div className="relative min-h-screen bg-background text-text antialiased">
        <LandingBackground />
        <LandingNav />
        <main>
          <HeroSection />
          <LandingFeatures />
          <LandingOverviewSections />
          <section className="relative z-10 border-t border-border py-20">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <h2 className="text-2xl font-semibold text-text sm:text-3xl">
                Ready to engineer quality with AI?
              </h2>
              <p className="mt-4 text-text-secondary">
                Import your APIs, let TestForge build the strategy, and run validations in minutes.
              </p>
              <LandingCtaButton />
            </div>
          </section>
        </main>
        <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-text-secondary">
          © {new Date().getFullYear()} TestForge. AI Quality Engineering Platform.
        </footer>
      </div>
    </LandingAuthProvider>
  );
};

export default LandingPage;
