import React from 'react';

export const CipherAmbient: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`cipher-ambient ${className}`.trim()} aria-hidden>
    <div className="cipher-blob cipher-blob--a1" />
    <div className="cipher-blob cipher-blob--a2" />
    <div className="cipher-blob cipher-blob--a3" />
    <div className="cipher-blob cipher-blob--a4" />
  </div>
);
