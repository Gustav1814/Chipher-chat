import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { teamEmojiFor } from '../teamEmoji';
import { Icons } from '../types';

interface RightPanelProps {
  activeChatId: string | null;
}

function useCountUp(target: number, duration = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setV(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export const RightPanel: React.FC<RightPanelProps> = ({ activeChatId }) => {
  const { users, userAvatars, myFingerprint, remoteFingerprints, messageHistory, onlineUsers, clearConversation } = useAuth();
  const theirFingerprint = activeChatId ? remoteFingerprints[activeChatId] : null;
  const contact = activeChatId ? users.find((u) => u.username === activeChatId) : null;
  const displayName = contact?.displayName || contact?.username || activeChatId;
  const teamE = teamEmojiFor(contact?.displayName, activeChatId || '');
  const contactAvatar = activeChatId ? userAvatars[activeChatId] : null;
  const isOnline = activeChatId ? onlineUsers.has(activeChatId) || contact?.online : false;

  const messages = activeChatId ? messageHistory[activeChatId] || [] : [];
  const sharedImages = messages.filter((m) => m.attachment?.type === 'image' && m.attachment?.data);
  const totalMessages = messages.length;

  const msgCount = useCountUp(totalMessages);
  const mediaCount = useCountUp(sharedImages.length);

  const [keysVerified, setKeysVerified] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSound, setNotifSound] = useState(false);

  useEffect(() => {
    setKeysVerified(false);
  }, [activeChatId]);

  const copyFp = useCallback((label: string, text: string) => {
    if (!text || text === '—') return;
    void navigator.clipboard.writeText(text).then(() => {
      setToast(`Copied ${label}`);
      setTimeout(() => setToast(null), 2200);
    });
  }, []);

  const cellClass = ['cipher-media-cell a', 'cipher-media-cell b', 'cipher-media-cell c', 'cipher-media-cell d', 'cipher-media-cell e', 'cipher-media-cell f'];

  return (
    <div className="cipher-rpanel cipher-scroll-hide">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl border border-[var(--seam2)] bg-[var(--deep)] text-[11px] text-[var(--tx1)] shadow-[0_0_24px_rgba(91,95,255,0.25)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {activeChatId ? (
        <>
          <div className="cipher-rp-profile">
            <div className="cipher-rp-ring-out">
              {contactAvatar ? (
                <div className="cipher-rp-avatar-lg overflow-hidden">
                  <img src={`data:image/png;base64,${contactAvatar}`} alt="" />
                </div>
              ) : teamE ? (
                <div className="cipher-rp-avatar-lg text-[1.35rem] font-normal leading-none">{teamE}</div>
              ) : (
                <div className="cipher-rp-avatar-lg">{(displayName || activeChatId).charAt(0).toUpperCase()}</div>
              )}
              {isOnline && <span className="cipher-rp-online" />}
            </div>
            <h2 className="cipher-rp-name">
              {teamE && (
                <span className="mr-1.5 inline-block" aria-hidden>
                  {teamE}
                </span>
              )}
              {displayName}
            </h2>
            <p className="cipher-rp-handle">@{activeChatId}</p>
            <div className="flex items-center gap-2 mt-1 opacity-[0.62]">
              <Icons.Lock size={10} strokeWidth={2} stroke="url(#ig)" />
              <span className="cipher-text-iris text-[10px] font-semibold uppercase tracking-[0.12em]">Encrypted</span>
            </div>

            <div className="cipher-rp-actions">
              <div className="cipher-rp-act">
                <button type="button" className="cipher-rp-act-btn" title="Call">
                  <Icons.Phone size={18} strokeWidth={1.55} />
                </button>
                <span>Call</span>
              </div>
              <div className="cipher-rp-act">
                <button type="button" className="cipher-rp-act-btn" title="Video">
                  <Icons.Video size={18} strokeWidth={1.55} />
                </button>
                <span>Video</span>
              </div>
              <div className="cipher-rp-act">
                <button type="button" className="cipher-rp-act-btn" title="Share">
                  <Icons.Share2 size={18} strokeWidth={1.55} />
                </button>
                <span>Share</span>
              </div>
            </div>
          </div>

          <div className="cipher-rp-stats">
            <div className="cipher-rp-stat-cell">
              <div className="cipher-stat-num">{msgCount}</div>
              <div className="cipher-rp-stat-label">Messages</div>
            </div>
            <div className="cipher-rp-stat-cell">
              <div className="cipher-stat-num">{mediaCount}</div>
              <div className="cipher-rp-stat-label">Media</div>
            </div>
            <div className="cipher-rp-stat-cell">
              <div className="cipher-stat-num text-[16px] leading-none pt-1">✦</div>
              <div className="cipher-rp-stat-label">Secured</div>
            </div>
          </div>

          <div className="cipher-rp-section-h">Notifications</div>
          <div className="cipher-toggle-row">
            <label htmlFor="n1">Push notifications</label>
            <button
              id="n1"
              type="button"
              role="switch"
              aria-checked={notifPush}
              className={`cipher-switch ${notifPush ? 'on' : 'off'}`}
              onClick={() => setNotifPush((v) => !v)}
            >
              <span className="cipher-switch-thumb" />
            </button>
          </div>
          <div className="cipher-toggle-row">
            <label htmlFor="n2">Sound</label>
            <button
              id="n2"
              type="button"
              role="switch"
              aria-checked={notifSound}
              className={`cipher-switch ${notifSound ? 'on' : 'off'}`}
              onClick={() => setNotifSound((v) => !v)}
            >
              <span className="cipher-switch-thumb" />
            </button>
          </div>

          <div className="cipher-rp-section-h pt-2">Encryption</div>
          <div className="cipher-fp-card">
            <div className="cipher-fp-label">Your fingerprint</div>
            <FingerprintVal variant="self" text={myFingerprint || '—'} onCopy={() => copyFp('your fingerprint', myFingerprint || '')} />
          </div>
          <div className="cipher-fp-card">
            <div className="cipher-fp-label">{displayName}&apos;s fingerprint</div>
            <FingerprintVal variant="peer" text={theirFingerprint || '—'} onCopy={() => copyFp('their fingerprint', theirFingerprint || '')} />
          </div>
          <button
            type="button"
            className="cipher-btn-verify"
            onClick={() => {
              setKeysVerified(true);
              setToast('Marked as verified (local)');
              setTimeout(() => setToast(null), 2200);
            }}
          >
            <Icons.Check size={14} strokeWidth={2} stroke="url(#ig)" />
            {keysVerified ? 'Verified' : 'Mark as verified'}
          </button>

          <div className="cipher-rp-section-h">Shared media</div>
          <div className="cipher-media-grid">
            {sharedImages.length > 0
              ? sharedImages.slice(0, 6).map((m, i) => (
                  <div key={i} className={`${cellClass[i % cellClass.length]} overflow-hidden p-0`}>
                    <img
                      src={`data:${m.attachment?.mime || 'image/png'};base64,${m.attachment?.data}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              : cellClass.map((c, i) => (
                  <div key={i} className={c}>
                    {['📎', '🖼', '🔐', '✨', '💬', '🛡'][i]}
                  </div>
                ))}
          </div>

          <button
            type="button"
            className="cipher-clear-btn"
            onClick={() => {
              if (!activeChatId) return;
              if (!window.confirm('Clear this conversation from this device only? This cannot be undone.')) return;
              void clearConversation(activeChatId);
              setToast('Conversation cleared locally');
              setTimeout(() => setToast(null), 2200);
            }}
          >
            <Icons.Trash2 size={13} strokeWidth={1.55} />
            Clear conversation
          </button>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-10">
          <div className="w-14 h-14 rounded-2xl border border-[var(--seam2)] bg-[var(--lift)] flex items-center justify-center mb-3">
            <Icons.ShieldCheck size={24} strokeWidth={1.55} className="text-[var(--i3)]" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-[13px] font-bold text-[var(--tx2)] mb-2">Cipher</h3>
          <p className="text-[10px] text-[var(--tx3)] leading-relaxed font-[family-name:var(--font-sans)] font-light">
            Select a chat for profile, fingerprints, and shared media.
          </p>
        </div>
      )}
    </div>
  );
};

const FingerprintVal: React.FC<{ text: string; onCopy: () => void; variant: 'self' | 'peer' }> = ({ text, onCopy, variant }) => (
    <button type="button" onClick={onCopy} className="w-full text-left cursor-pointer group">
      <code className={`cipher-fp-val block ${variant === 'self' ? 'self' : 'peer'}`}>{text}</code>
      <span className="text-[8px] text-[var(--tx3)] opacity-0 group-hover:opacity-100 transition-opacity">Tap to copy</span>
    </button>
);
