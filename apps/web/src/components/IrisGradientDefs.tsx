import React from 'react';

/** Global SVG defs for stroke="url(#ig)" — mount once near app root */
export const IrisGradientDefs: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
    <defs>
      <linearGradient id="ig" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5B5FFF" />
        <stop offset="50%" stopColor="#00AAFF" />
        <stop offset="100%" stopColor="#00C4A0" />
      </linearGradient>
    </defs>
  </svg>
);
