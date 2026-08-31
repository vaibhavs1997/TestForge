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
  <section id="features" className="relative z-10 border-t border-border py-24">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Quality engineering, not click-and-send
        </h2>
        <p className="mt-4 text-lg text-text-secondary">
          TestsForge automates the work senior QA engineers do—analysis, design, execution, and reporting.
        </p>
      </div>
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="theme-glass-card group rounded-2xl border p-6 transition-colors hover:border-primary/50"
            style={{ borderRadius: 16 }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4FD1C5]/20 to-[#7F00FF]/20 text-primary transition-colors group-hover:from-[#4FD1C5]/30 group-hover:to-[#7F00FF]/30">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-text">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
