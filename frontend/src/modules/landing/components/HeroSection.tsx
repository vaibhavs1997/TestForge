import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Check } from 'lucide-react';
import { HeroDashboard } from './HeroDashboard';

const TRUST = [
  'No Credit Card Required',
  'AI Powered',
  'Works with OpenAPI, Postman & GraphQL',
];

export const HeroSection: React.FC = () => (
  <section className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className="landing-fade-up">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7C3AED]/25 bg-[#7C3AED]/10 px-4 py-1.5 text-sm text-violet-200">
          <span aria-hidden>✨</span>
          AI-Powered API Quality Engineering Platform
        </div>

        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
          Stop Writing API Tests.
          <span className="mt-2 block bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Let AI Engineer Quality For You.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
          TestForge understands your project, analyzes API dependencies, generates intelligent
          validation strategies, creates execution plans, executes validations, and delivers
          developer-ready reports automatically.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/projects"
            className="group inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/35 transition-all hover:bg-blue-500 hover:shadow-blue-500/45"
          >
            Start Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
          >
            <Play className="h-4 w-4 fill-current" />
            Watch Demo
          </button>
        </div>

        <ul className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2">
          {TRUST.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
              <Check className="h-4 w-4 text-emerald-400" />
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
