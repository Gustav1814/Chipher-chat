import React from 'react';

/** Drifting radial glows (violet / blue / rose) — obsidian luxury chat backdrop */
export const AuroraMesh: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`aurora-mesh pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
    <div className="aurora-blob aurora-blob--violet" />
    <div className="aurora-blob aurora-blob--blue" />
    <div className="aurora-blob aurora-blob--rose" />
    <div className="aurora-blob aurora-blob--violet-soft" />
  </div>
);
