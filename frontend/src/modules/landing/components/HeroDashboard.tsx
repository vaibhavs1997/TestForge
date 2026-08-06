import React from 'react';
import {
  GitBranch,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Network,
  Brain,
} from 'lucide-react';

const metrics = [
  { label: 'Project Readiness', value: '92%', color: 'from-[#2563EB] to-[#3B82F6]' },
  { label: 'Dependency Health', value: '98%', color: 'from-[#7C3AED] to-[#A78BFA]' },
  { label: 'Coverage', value: '95%', color: 'from-emerald-500 to-teal-400' },
  { label: 'Critical Risks', value: '2', color: 'from-amber-500 to-orange-400', alert: true },
];

export const HeroDashboard: React.FC = () => (
  <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
    <div
      className="landing-dashboard-glow relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-6"
      style={{ borderRadius: 16 }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Project</p>
          <h3 className="text-lg font-semibold text-white">E-Commerce Platform</h3>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-3 py-1 text-xs font-medium text-violet-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
          </span>
          Analyzing…
        </span>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex justify-between text-xs text-slate-400">
          <span>Progress</span>
          <span className="text-slate-300">78%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="landing-progress-bar h-full w-[78%] rounded-full bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#2563EB]" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {['48 APIs', '162 Operations', '23 Dependencies', 'Authentication Flow', 'User Journey'].map(
          (item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              {item}
            </div>
          )
        )}
      </div>

      <div className="mb-5 rounded-xl border border-white/[0.06] bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
          <Brain className="h-4 w-4 text-[#7C3AED]" />
          AI is generating
        </div>
        <ul className="space-y-2 text-sm text-slate-400">
          {['Test Strategy', 'Execution Plan', 'Dependency Graph'].map((line, i) => (
            <li key={line} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#2563EB]"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
              <span className="landing-shimmer-text">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-white/[0.06] bg-slate-900/50 p-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{m.label}</p>
            {m.alert ? (
              <p className="mt-1 flex items-center gap-1 text-xl font-bold text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {m.value}
              </p>
            ) : (
              <p className={`mt-1 text-xl font-bold bg-gradient-to-r ${m.color} bg-clip-text text-transparent`}>
                {m.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>

    <div className="landing-float-card absolute -left-4 top-8 z-10 hidden max-w-[220px] rounded-2xl border border-white/10 bg-[#1e293b]/95 p-4 shadow-xl backdrop-blur-md lg:block">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-300">
        <Network className="h-3.5 w-3.5" />
        Dependency detected
      </div>
      <div className="space-y-1.5 text-xs text-slate-300">
        <div className="rounded-lg bg-slate-800/80 px-2 py-1.5">Login API</div>
        <div className="text-center text-slate-500">↓</div>
        <div className="rounded-lg bg-slate-800/80 px-2 py-1.5">Generate Token</div>
        <div className="text-center text-slate-500">↓</div>
        <div className="rounded-lg bg-slate-800/80 px-2 py-1.5">Update Profile</div>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Confidence <span className="font-semibold text-emerald-400">98%</span>
      </p>
    </div>

    <div
      className="landing-float-card-delay absolute -right-2 bottom-4 z-10 hidden max-w-[240px] rounded-2xl border border-[#2563EB]/20 bg-gradient-to-br from-[#1e3a5f]/90 to-[#1e293b]/95 p-4 shadow-xl backdrop-blur-md lg:block"
      style={{ borderRadius: 16 }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-300">
        <Sparkles className="h-3.5 w-3.5" />
        AI Recommendation
      </div>
      <p className="text-xs leading-relaxed text-slate-300">
        Checkout APIs should execute after Authentication.
      </p>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
        <GitBranch className="h-3 w-3" />
        Suggested execution sequence generated.
      </p>
    </div>
  </div>
);
