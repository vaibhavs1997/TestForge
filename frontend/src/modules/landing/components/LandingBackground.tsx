import React from 'react';

export const LandingBackground: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37, 99, 235, 0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(124, 58, 237, 0.12), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(37, 99, 235, 0.08), transparent), #0B1120',
      }}
    />
    <svg className="absolute inset-0 h-full w-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
          <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M120 200 Q400 120 680 280 T1200 200" fill="none" stroke="url(#lineGrad)" strokeWidth="1" className="landing-line-draw" />
      <path d="M80 450 Q350 380 620 520 T1100 440" fill="none" stroke="url(#lineGrad)" strokeWidth="1" className="landing-line-draw landing-line-delay" />
      <circle cx="680" cy="280" r="3" fill="#7C3AED" className="landing-node-pulse" />
      <circle cx="350" cy="380" r="2" fill="#2563EB" className="landing-node-pulse landing-line-delay" />
      <circle cx="900" cy="200" r="2" fill="#2563EB" className="landing-node-pulse" />
    </svg>
    {Array.from({ length: 24 }).map((_, i) => (
      <span
        key={i}
        className="landing-particle absolute rounded-full bg-white"
        style={{
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          left: `${(i * 17 + 5) % 100}%`,
          top: `${(i * 23 + 10) % 100}%`,
          opacity: 0.15 + (i % 5) * 0.05,
          animationDelay: `${i * 0.7}s`,
        }}
      />
    ))}
  </div>
);
