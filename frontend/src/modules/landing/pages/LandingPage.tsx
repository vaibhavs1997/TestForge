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
  const [newsletterFirstName, setNewsletterFirstName] = React.useState('');
  const [newsletterLastName, setNewsletterLastName] = React.useState('');
  const [newsletterCountry, setNewsletterCountry] = React.useState('');
  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = React.useState(false);

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

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsletterFirstName.trim() || !newsletterLastName.trim() || !newsletterCountry || !newsletterEmail.trim()) return;
    setNewsletterSubmitted(true);
  };


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
          {false && <section className="relative z-10 border-t border-border py-20">
            <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
              <h2 className="text-2xl font-semibold text-text sm:text-3xl">
                Ready to engineer quality with AI?
              </h2>
              <p className="mt-4 text-text-secondary">
                Import your APIs, let TestsForge build the strategy, and run validations in minutes.
              </p>
              <LandingCtaButton />
            </div>
          </section>}
        </main>
        <div className="relative z-10 border-t border-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="lg:col-start-2">
          <div className="landing-surface mx-auto h-full rounded-3xl border border-border p-6 shadow-glass sm:p-7">
            {newsletterSubmitted ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-3xl text-primary" aria-hidden="true">✓</div>
                <h2 className="mt-5 text-2xl font-semibold text-text">You’re on the list!</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">Thanks for subscribing. We’ll send useful API quality insights and TestsForge updates to your inbox.</p>
              </div>
            ) : (
              <>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">TestsForge updates</p>
              <h2 className="mt-3 text-2xl font-semibold text-text">Stay ahead of API quality</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Get practical API testing guidance, product updates, and quality engineering insights in your inbox.
              </p>
            </div>
            <form className="mt-5 grid w-full gap-3 sm:grid-cols-2" onSubmit={handleNewsletterSubmit}>
              <label className="sr-only" htmlFor="newsletter-first-name">First name</label>
              <input id="newsletter-first-name" type="text" value={newsletterFirstName} onChange={(event) => { setNewsletterFirstName(event.target.value); setNewsletterSubmitted(false); }} placeholder="First name" autoComplete="given-name" required className="min-w-0 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-text outline-none transition focus:border-primary" />
              <label className="sr-only" htmlFor="newsletter-last-name">Last name</label>
              <input id="newsletter-last-name" type="text" value={newsletterLastName} onChange={(event) => { setNewsletterLastName(event.target.value); setNewsletterSubmitted(false); }} placeholder="Last name" autoComplete="family-name" required className="min-w-0 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-text outline-none transition focus:border-primary" />
              <label className="sr-only" htmlFor="newsletter-country">Country</label>
              <input id="newsletter-country" type="text" value={newsletterCountry} onChange={(event) => { setNewsletterCountry(event.target.value); setNewsletterSubmitted(false); }} placeholder="Country" autoComplete="country-name" required className="min-w-0 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-text outline-none transition focus:border-primary" />
              <div className="flex gap-3 sm:col-span-2">
                <label className="sr-only" htmlFor="newsletter-email">Email address</label>
                <input id="newsletter-email" type="email" value={newsletterEmail} onChange={(event) => { setNewsletterEmail(event.target.value); setNewsletterSubmitted(false); }} placeholder="you@company.com" autoComplete="email" required className="min-w-0 flex-1 rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-text outline-none transition focus:border-primary" />
                <button type="submit" className="landing-primary-action shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white">Subscribe</button>
              </div>
            </form>
              </>
            )}
          </div>
        </section>

        <footer className="relative z-10 h-full rounded-3xl border border-border bg-background/50 px-6 py-7 shadow-glass sm:px-7 sm:py-8 lg:col-start-1 lg:row-start-1">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
            <div>
              <Link to="/" className="text-xl font-semibold text-text">TestsForge</Link>
              <p className="mt-3 max-w-xs text-sm leading-6 text-text-secondary">AI-powered API quality engineering for teams building reliable digital experiences.</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-text-secondary"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> All systems operational</div>
            </div>
            <div><h3 className="text-sm font-semibold text-text">Product</h3><nav className="mt-4 flex flex-col gap-3 text-sm text-text-secondary"><a href="#features" className="transition-colors hover:text-primary">Features</a><a href="#solutions" className="transition-colors hover:text-primary">Solutions</a><a href="#pricing" className="transition-colors hover:text-primary">Pricing</a></nav></div>
            <div><h3 className="text-sm font-semibold text-text">Resources</h3><nav className="mt-4 flex flex-col gap-3 text-sm text-text-secondary"><a href="#docs" className="transition-colors hover:text-primary">Documentation</a><a href="#blog" className="transition-colors hover:text-primary">Blog</a><a href="mailto:support@testforge.app" className="transition-colors hover:text-primary">Contact support</a></nav></div>
            <div><h3 className="text-sm font-semibold text-text">Company</h3><nav className="mt-4 flex flex-col gap-3 text-sm text-text-secondary"><a href="#about" className="transition-colors hover:text-primary">About TestForge</a><a href="#security" className="transition-colors hover:text-primary">Security</a><a href="#privacy" className="transition-colors hover:text-primary">Privacy</a></nav></div>
          </div>
          <div className="mx-auto mt-6 flex max-w-7xl flex-col gap-2 border-t border-border pt-5 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} TestForge. All rights reserved.</span><span>Built for confident releases.</span></div>
          
        </footer>
          </div>
        </div>
      </div>
    </LandingAuthProvider>
  );
};

export default LandingPage;
