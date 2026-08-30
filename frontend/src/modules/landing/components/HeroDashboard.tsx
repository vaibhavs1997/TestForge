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
  { label: 'Project Readiness', value: '92%', color: 'from-[#4FD1C5] to-[#006D77]' },
  { label: 'Dependency Health', value: '98%', color: 'from-[#4FD1C5] to-[#7F00FF]' },
  { label: 'Coverage', value: '95%', color: 'from-[#4FD1C5] to-[#006D77]' },
  { label: 'Critical Risks', value: '2', color: 'from-[#EBBE63] to-[#EBBE63]', alert: true },
];

export const HeroDashboard: React.FC = () => (
  <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
    <div
      className="landing-dashboard-glow landing-surface relative overflow-hidden rounded-2xl border p-5 sm:p-6"
      style={{ borderRadius: 16 }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Project</p>
          <h3 className="text-lg font-semibold text-text">E-Commerce Platform</h3>
        </div>
        <span className="landing-surface flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Analyzing…
        </span>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex justify-between text-xs text-text-secondary">
          <span>Progress</span>
          <span className="text-text">78%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background/70">
          <div className="landing-progress-bar h-full w-[78%] rounded-full bg-gradient-to-r from-[#4FD1C5] via-[#7F00FF] to-[#4FD1C5]" />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {['48 APIs', '162 Operations', '23 Dependencies', 'Authentication Flow', 'User Journey'].map(
          (item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              {item}
            </div>
          )
        )}
      </div>

      <div className="landing-surface mb-5 rounded-xl border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text">
          <Brain className="h-4 w-4 text-primary" />
          AI is generating
        </div>
        <ul className="space-y-2 text-sm text-text-secondary">
          {['Test Strategy', 'Execution Plan', 'Dependency Graph'].map((line, i) => (
            <li key={line} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary"
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
            className="landing-surface rounded-xl border p-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{m.label}</p>
            {m.alert ? (
              <p className="mt-1 flex items-center gap-1 text-xl font-bold text-warning">
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

    <div className="landing-float-card landing-surface absolute -left-4 top-8 z-10 hidden max-w-[220px] rounded-2xl border p-4 lg:block">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
        <Network className="h-3.5 w-3.5" />
        Dependency detected
      </div>
      <div className="space-y-1.5 text-xs text-text-secondary">
        <div className="rounded-lg bg-background/50 px-2 py-1.5">Login API</div>
        <div className="text-center text-text-secondary">↓</div>
        <div className="rounded-lg bg-background/50 px-2 py-1.5">Generate Token</div>
        <div className="text-center text-text-secondary">↓</div>
        <div className="rounded-lg bg-background/50 px-2 py-1.5">Update Profile</div>
      </div>
      <p className="mt-2 text-[10px] text-text-secondary">
        Confidence <span className="font-semibold text-primary">98%</span>
      </p>
    </div>

    <div
      className="landing-float-card-delay landing-surface absolute -right-2 bottom-4 z-10 hidden max-w-[240px] rounded-2xl border p-4 lg:block"
      style={{ borderRadius: 16 }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        AI Recommendation
      </div>
      <p className="text-xs leading-relaxed text-text-secondary">
        Checkout APIs should execute after Authentication.
      </p>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-text-secondary">
        <GitBranch className="h-3 w-3" />
        Suggested execution sequence generated.
      </p>
    </div>
  </div>
);
