import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../types';

interface RightPanelProps {
  activeChatId: string | null;
}

export const RightPanel: React.FC<RightPanelProps> = ({ activeChatId }) => {
  const { users, userAvatars, myFingerprint, remoteFingerprints } = useAuth();
  const theirFingerprint = activeChatId ? remoteFingerprints[activeChatId] : null;
  const contact = activeChatId ? users.find((u) => u.username === activeChatId) : null;
  const displayName = contact?.displayName || contact?.username || activeChatId;
  const contactStatus = contact?.status ?? '';
  const contactAvatar = activeChatId ? userAvatars[activeChatId] : null;

  const mediaThumbs = [
    'linear-gradient(135deg, #2d1b69, #1a1a2e)',
    'linear-gradient(135deg, #1a2a3a, #0f1923)',
    'linear-gradient(135deg, #2a1a3a, #1a0f23)',
    'linear-gradient(135deg, #1a3a2a, #0f2319)',
    'linear-gradient(135deg, #3a2a1a, #23190f)',
    'linear-gradient(135deg, #1a2a3a, #0f1923)',
    'linear-gradient(135deg, #2d1b69, #1a1a2e)',
    'linear-gradient(135deg, #3a1a2a, #230f19)',
  ];

  return (
    <div className="w-80 h-full flex flex-col border-l border-brand-border glass-panel p-5 overflow-y-auto">
      {activeChatId && (
        <>
          <h3 className="text-sm font-semibold mb-3">Contact profile</h3>
          <div className="flex flex-col items-center p-4 rounded-2xl border border-brand-border bg-brand-glass mb-5">
            {contactAvatar ? (
              <img src={`data:image/png;base64,${contactAvatar}`} alt="" className="w-16 h-16 rounded-full border-2 border-brand-accent object-cover mb-3" />
            ) : (
              <div className="w-16 h-16 rounded-full border-2 border-brand-accent bg-brand-accent flex items-center justify-center text-xl font-bold text-white mb-3">
                {(displayName || activeChatId).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center w-full space-y-1">
              <div className="text-sm font-bold">{displayName}</div>
              <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">Username</div>
              <code className="text-xs font-mono text-brand-accent break-all block bg-black/20 px-2 py-1 rounded">
                {activeChatId}
              </code>
            </div>
            {contactStatus ? (
              <p className="text-xs text-brand-text-muted mt-2 text-center w-full truncate" title={contactStatus}>
                {contactStatus}
              </p>
            ) : null}
          </div>

          {/* Shared Media */}
          <div className="shared-section">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-brand-text-muted">Shared Media</span>
              <button className="text-[10px] text-brand-accent hover:underline">See All</button>
            </div>
            <div className="shared-media-grid">
              {mediaThumbs.map((bg, i) => (
                <div key={i} className="shared-media-thumb">
                  <div style={{ width: '100%', height: '100%', background: bg }} />
                </div>
              ))}
            </div>
          </div>

          {/* Shared Files */}
          <div className="shared-section">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-brand-text-muted">Shared Files</span>
              <button className="text-[10px] text-brand-accent hover:underline">See All</button>
            </div>
            <div className="space-y-1">
              {[
                { name: 'UARM.sketch', meta: '04.20.21 • 210ms', color: 'bg-red-500/15 text-red-400' },
                { name: 'pathlock.sketch', meta: '04.20.21 • 150ms', color: 'bg-yellow-500/15 text-yellow-400' },
                { name: 'pathlock_brandbook.pdf', meta: '04.20.21 • 20kb', color: 'bg-red-500/15 text-red-400' },
              ].map((f) => (
                <div key={f.name} className="flex items-center gap-2.5 py-1.5">
                  <div className={`w-8 h-8 rounded-lg ${f.color} flex items-center justify-center shrink-0`}>
                    <Icons.FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{f.name}</div>
                    <div className="text-[10px] text-brand-text-muted">{f.meta}</div>
                  </div>
                  <Icons.Download size={14} className="text-brand-text-muted hover:text-brand-text cursor-pointer shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Shared Links */}
          <div className="shared-section">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-brand-text-muted">Shared Links</span>
              <button className="text-[10px] text-brand-accent hover:underline">See All</button>
            </div>
            <div className="space-y-1">
              {[
                { title: 'Banking UI kit. Dark Mode.', url: 'https://dribbble.com/shots/15220669', bg: 'linear-gradient(135deg,#2d1b69,#1a1a2e)' },
                { title: 'Credit Cards Experiments.', url: 'https://dribbble.com/shots/14539167', bg: 'linear-gradient(135deg,#1a3a2a,#0f2319)' },
                { title: 'The Batman - DC FanDome Teaser...', url: 'https://www.youtube.com/watch?v=...', bg: 'linear-gradient(135deg,#1a2a3a,#0f1923)' },
              ].map((l) => (
                <div key={l.title} className="flex items-center gap-2.5 py-1.5">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <div style={{ width: '100%', height: '100%', background: l.bg }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{l.title}</div>
                    <div className="text-[10px] text-brand-accent truncate">{l.url}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Encryption Section */}
      <div className={activeChatId ? 'shared-section' : ''}>
        <h3 className="text-xs font-semibold mb-3">Encryption</h3>
        <p className="text-[10px] text-brand-text-muted mb-3 leading-relaxed">
          Your encryption key is created automatically when you sign in. Messages are end-to-end encrypted; only you and the recipient can read them.
        </p>

        {activeChatId ? (
          <>
            <div className="space-y-2.5 mb-3">
              <div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Your fingerprint</div>
                <code className="text-[10px] font-mono text-brand-accent break-all block bg-black/20 px-2 py-1.5 rounded">
                  {myFingerprint || '—'}
                </code>
              </div>
              <div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">{activeChatId}'s fingerprint</div>
                <code className="text-[10px] font-mono text-brand-accent break-all block bg-black/20 px-2 py-1.5 rounded">
                  {theirFingerprint || '—'}
                </code>
              </div>
            </div>
            <p className="text-[10px] text-brand-text-muted leading-relaxed">
              Compare fingerprints in person or over a secure channel to verify you're talking to the right person.
            </p>
          </>
        ) : (
          <p className="text-[10px] text-brand-text-muted">Select a chat to see contact profile and verification details.</p>
        )}
      </div>
    </div>
  );
};
