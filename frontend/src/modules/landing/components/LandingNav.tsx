import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '../../../components/brand/BrandLogo';
import { authStore } from '../../../store/authStore';
import { getLandingCtaPaths } from '../utils/landingCta';
import { useLandingAuth } from '../context/LandingAuthContext';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Documentation', href: '#docs' },
  { label: 'Blog', href: '#blog' },
];

export const LandingNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const user = authStore((s) => s.user);
  const cta = getLandingCtaPaths(user);
  const { openLogin, openRegister } = useLandingAuth();

  return (
    <header className="relative z-50 border-b border-white/[0.06] bg-[#0B1120]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo variant="landing" linkTo="/" />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {cta.signedIn ? (
            <Link
              to={cta.primary}
              className="rounded-2xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500"
            >
              {cta.primaryLabel}
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={openLogin}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                {cta.secondaryLabel}
              </button>
              <button
                type="button"
                onClick={openRegister}
                className="rounded-2xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500 hover:shadow-blue-500/40"
              >
                {cta.primaryLabel}
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#0B1120]/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-300"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            {!cta.signedIn ? (
              <button
                type="button"
                className="text-left text-sm font-medium text-slate-300"
                onClick={() => {
                  setOpen(false);
                  openLogin();
                }}
              >
                {cta.secondaryLabel}
              </button>
            ) : null}
            {cta.signedIn ? (
              <Link
                to={cta.primary}
                className="mt-2 rounded-2xl bg-[#2563EB] px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                {cta.primaryLabel}
              </Link>
            ) : (
              <button
                type="button"
                className="mt-2 rounded-2xl bg-[#2563EB] px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={() => {
                  setOpen(false);
                  openRegister();
                }}
              >
                {cta.primaryLabel}
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default LandingNav;
