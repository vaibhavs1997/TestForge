import React from 'react';
import { Workflow, Network, Brain, FileBarChart, Layers, Shield } from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'AI that thinks like QA',
    description:
      'Requirements, strategies, and execution plans generated from your API graph—not brittle scripts.',
  },
  {
    icon: Network,
    title: 'Dependency intelligence',
    description:
      'Maps auth flows, user journeys, and cross-service dependencies before a single request runs.',
  },
  {
    icon: Workflow,
    title: 'Execution pipeline',
    description:
      'Orchestrates environments, test data, assertions, and runtime variables in one quality workflow.',
  },
  {
    icon: Layers,
    title: 'Knowledge graph',
    description:
      'Business rules, documentation, and runtime context feed every validation decision.',
  },
  {
    icon: FileBarChart,
    title: 'Developer-ready reports',
    description:
      'Clear pass/fail narratives, coverage signals, and risk highlights your team can ship on.',
  },
  {
    icon: Shield,
    title: 'Enterprise-ready',
    description:
      'Project workspaces, versioning, audit trails, and scheduling built for platform teams.',
  },
];

export const LandingFeatures: React.FC = () => (
  <section id="features" className="relative z-10 border-t border-white/[0.06] py-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Quality engineering, not click-and-send
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          TestForge automates the work senior QA engineers do—analysis, design, execution, and reporting.
        </p>
      </div>
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-[#2563EB]/30 hover:bg-white/[0.04]"
            style={{ borderRadius: 16 }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#7C3AED]/20 text-[#7C3AED] transition-colors group-hover:from-[#2563EB]/30 group-hover:to-[#7C3AED]/30">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
