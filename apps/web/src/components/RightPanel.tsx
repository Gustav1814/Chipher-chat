import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../types';

interface RightPanelProps {
  activeChatId: string | null;
}

export const RightPanel: React.FC<RightPanelProps> = ({ activeChatId }) => {
  const { users, userAvatars, myFingerprint, remoteFingerprints, messageHistory, onlineUsers } = useAuth();
  const theirFingerprint = activeChatId ? remoteFingerprints[activeChatId] : null;
  const contact = activeChatId ? users.find((u) => u.username === activeChatId) : null;
  const displayName = contact?.displayName || contact?.username || activeChatId;
  const contactStatus = contact?.status ?? '';
  const contactAvatar = activeChatId ? userAvatars[activeChatId] : null;
  const isOnline = activeChatId ? onlineUsers.has(activeChatId) || contact?.online : false;

  // Extract real shared media from message history
  const messages = activeChatId ? (messageHistory[activeChatId] || []) : [];
  const sharedImages = messages.filter((m) => m.attachment?.type === 'image' && m.attachment?.data);
  const totalMessages = messages.length;

  return (
    <div className="w-80 h-full flex flex-col border-l border-brand-border glass-panel p-5 overflow-y-auto">
      {activeChatId ? (
        <>
          {/* Contact Profile Card */}
          <div className="flex flex-col items-center p-5 rounded-2xl border border-brand-border bg-brand-glass mb-5">
            <div className="relative mb-3">
              {contactAvatar ? (
                <img src={`data:image/png;base64,${contactAvatar}`} alt="" className="w-20 h-20 rounded-full border-2 border-brand-accent object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-brand-accent bg-brand-accent flex items-center justify-center text-2xl font-bold text-white">
                  {(displayName || activeChatId).charAt(0).toUpperCase()}
                </div>
              )}
              <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-brand-surface ${isOnline ? 'status-online' : 'status-offline'}`} />
            </div>
            <div className="text-center w-full space-y-1.5">
              <div className="text-base font-bold">{displayName}</div>
              <div className="text-xs text-brand-text-muted">@{activeChatId}</div>
              {contactStatus && (
                <p className="text-xs text-brand-text-muted italic truncate" title={contactStatus}>
                  "{contactStatus}"
                </p>
              )}
              <div className="encryption-badge mx-auto mt-2">
                <Icons.Lock size={10} />
                <span>E2E Encrypted</span>
              </div>
            </div>
          </div>

          {/* Chat Stats */}
          <div className="shared-section">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-brand-glass border border-brand-border">
                <div className="text-lg font-bold">{totalMessages}</div>
                <div className="text-[10px] text-brand-text-muted">Messages</div>
              </div>
              <div className="p-3 rounded-xl bg-brand-glass border border-brand-border">
                <div className="text-lg font-bold">{sharedImages.length}</div>
                <div className="text-[10px] text-brand-text-muted">Media</div>
              </div>
              <div className="p-3 rounded-xl bg-brand-glass border border-brand-border">
                <div className="text-lg font-bold flex items-center justify-center">
                  <Icons.Lock size={16} className="text-green-500" />
                </div>
                <div className="text-[10px] text-brand-text-muted">Secured</div>
              </div>
            </div>
          </div>

          {/* Shared Media */}
          {sharedImages.length > 0 && (
            <div className="shared-section">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Shared Media</span>
                <span className="text-[10px] text-brand-accent">{sharedImages.length} items</span>
              </div>
              <div className="shared-media-grid">
                {sharedImages.slice(0, 8).map((m, i) => (
                  <div key={i} className="shared-media-thumb">
                    <img
                      src={`data:${m.attachment?.mime || 'image/png'};base64,${m.attachment?.data}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encryption Verification */}
          <div className="shared-section">
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
              <Icons.Lock size={12} className="text-green-500" />
              Encryption Verification
            </h3>
            <p className="text-[10px] text-brand-text-muted mb-3 leading-relaxed">
              Compare fingerprints with {displayName} in person or via a secure channel to verify their identity.
            </p>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">Your fingerprint</div>
                <code className="text-[10px] font-mono text-brand-accent break-all block bg-black/20 px-2.5 py-2 rounded-lg leading-relaxed">
                  {myFingerprint || '—'}
                </code>
              </div>
              <div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-1">{displayName}'s fingerprint</div>
                <code className="text-[10px] font-mono text-brand-accent break-all block bg-black/20 px-2.5 py-2 rounded-lg leading-relaxed">
                  {theirFingerprint || '—'}
                </code>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* No chat selected */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-brand-glass border border-brand-border flex items-center justify-center mb-4">
            <Icons.Lock size={24} className="text-brand-accent" />
          </div>
          <h3 className="text-sm font-semibold mb-2">End-to-End Encrypted</h3>
          <p className="text-[11px] text-brand-text-muted leading-relaxed">
            Select a chat to see contact details and encryption verification. Your keys are generated automatically on login.
          </p>
        </div>
      )}
    </div>
  );
};
