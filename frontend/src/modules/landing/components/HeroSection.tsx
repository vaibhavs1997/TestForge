import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { HeroDashboard } from './HeroDashboard';
import { authStore } from '../../../store/authStore';
import { getLandingCtaPaths } from '../utils/landingCta';
import { useLandingAuth } from '../context/LandingAuthContext';

const TRUST = [
  'No Credit Card Required',
  'AI Powered',
  'Works with OpenAPI, Postman & GraphQL',
];

export const HeroSection: React.FC = () => {
  const user = authStore((s) => s.user);
  const cta = getLandingCtaPaths(user);
  const { openLogin, openRegister } = useLandingAuth();

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="landing-fade-up">
          <div className="landing-surface mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-primary">
            <span aria-hidden>✨</span>
            AI-Powered API Quality Engineering Platform
          </div>

          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-text sm:text-5xl lg:text-[3.25rem]">
            Stop Writing API Tests.
            <span className="mt-2 block bg-gradient-to-r from-white via-[#4FD1C5] to-[#A9B0B8] bg-clip-text text-transparent">
              Let AI Engineer Quality For You.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
            TestsForge understands your project, analyzes API dependencies, generates intelligent
            validation strategies, creates execution plans, executes validations, and delivers
            developer-ready reports automatically.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {cta.signedIn ? (
              <Link
                to={cta.primary}
                className="landing-primary-action group inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold text-white"
              >
                {cta.primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openRegister}
                  className="landing-primary-action group inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold text-white"
                >
                  {cta.primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={openLogin}
                  className="landing-secondary-action inline-flex items-center gap-2 rounded-2xl border px-7 py-3.5 text-sm font-semibold text-white transition-colors"
                >
                  {cta.secondaryLabel}
                </button>
              </>
            )}
          </div>

          <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
            {TRUST.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                <Check className="landing-accent h-4 w-4" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="landing-fade-up landing-fade-up-delay relative lg:pl-4">
          <HeroDashboard />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
