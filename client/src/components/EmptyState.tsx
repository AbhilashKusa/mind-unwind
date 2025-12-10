import React from 'react';
import { SparklesIcon } from './Icons';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-24 h-24 mb-6 relative flex items-center justify-center rounded-full bg-emerald-light/20 border border-gold/20 shadow-glow-sm">
        <SparklesIcon className="w-10 h-10 text-gold animate-pulse-slow" />
      </div>
      <h3 className="text-2xl font-serif text-ivory mb-2 tracking-wide">Tranquility Achieved</h3>
      <p className="text-xs text-gold-muted max-w-sm font-sans uppercase tracking-[0.15em] leading-relaxed">
        Your sanctuary is clear.<br />
        Use the <span className="text-gold">Command Center</span> to inscribe new tasks.
      </p>
    </div>
  );
};