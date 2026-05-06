import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

type SettingsTab = 'main' | 'profile';

export const SettingsPage: React.FC = () => {
  const { username, myDisplayName, myStatus, userAvatars, updateMyProfile, refreshMyAvatar, logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('main');
  const [displayName, setDisplayName] = useState(myDisplayName ?? username ?? '');
  const [status, setStatus] = useState(myStatus ?? '');
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDisplayName(myDisplayName ?? username ?? '');
    setStatus(myStatus ?? '');
  }, [myDisplayName, myStatus, username]);

  const handleSaveProfile = async () => {
    setProfileError(null);
    setSaving(true);
    try {
      await updateMyProfile(displayName.trim() || undefined, status);
      setActiveSubTab('main');
    } catch (e) {
      setProfileError((e as Error).message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const base64 = data.replace(/^data:[^;]+;base64,/, '');
      if (base64.length > 450000) {
        setProfileError('Image too large. Use a smaller photo.');
        return;
      }
      api('/api/me/avatar', { method: 'POST', body: { avatar: base64 } })
        .then(() => refreshMyAvatar())
        .catch(() => setProfileError('Failed to update avatar'));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (activeSubTab === 'profile') {
    return (
      <div className="cipher-sidebar-col cipher-scroll-hide">
        <div className="p-4 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('main')}
            className="flex items-center gap-2 text-[var(--tx3)] hover:text-[var(--tx2)] mb-5 text-[11px] transition-colors font-[family-name:var(--font-sans)] font-light"
          >
            <Icons.ChevronRight size={16} className="rotate-180" />
            Back
          </button>
          <h2 className="text-[14px] font-[family-name:var(--font-display)] font-bold mb-5 text-[var(--tx1)]">Profile</h2>
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 mb-6">
              <motion.button
                type="button"
                className="cipher-bg-iris relative rounded-full p-[3px] shadow-[0_0_24px_rgba(91,95,255,0.35)]"
                whileHover={{ scale: 1.03 }}
                onClick={() => avatarInputRef.current?.click()}
              >
                <div className="rounded-full bg-[var(--deep)] p-[2px]">
                  {userAvatars[username || ''] ? (
                    <img src={`data:image/png;base64,${userAvatars[username || '']}`} alt="" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[rgba(91,95,255,0.2)] flex items-center justify-center text-xl font-[family-name:var(--font-display)] font-bold text-[var(--i3)]">
                      {(displayName || username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </motion.button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-[10px] text-[var(--i3)] font-semibold">
                Change avatar
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1.5">Username</label>
                <input
                  type="text"
                  value={username || ''}
                  readOnly
                  className="w-full bg-[var(--lift)] border border-[var(--seam2)] rounded-xl p-2.5 text-[11px] outline-none opacity-70 cursor-not-allowed font-[family-name:var(--font-sans)] font-light text-[var(--tx2)]"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1.5">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How others see you"
                  className="w-full bg-[var(--lift)] border border-[var(--seam2)] rounded-xl p-2.5 text-[11px] outline-none focus:border-[rgba(91,95,255,0.35)] text-[var(--tx1)] font-[family-name:var(--font-sans)] font-light placeholder:text-[var(--tx3)]"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1.5">Status</label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="Busy, in flow, etc."
                  maxLength={200}
                  className="w-full bg-[var(--lift)] border border-[var(--seam2)] rounded-xl p-2.5 text-[11px] outline-none focus:border-[rgba(91,95,255,0.35)] text-[var(--tx1)] font-[family-name:var(--font-sans)] font-light placeholder:text-[var(--tx3)]"
                />
              </div>
            </div>
            {profileError && <p className="text-red-400/90 text-[11px]">{profileError}</p>}
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="cipher-bg-iris w-full py-2.5 rounded-xl font-[family-name:var(--font-display)] font-bold text-[13px] text-white disabled:opacity-70 shadow-[0_4px_22px_rgba(91,95,255,0.4)]"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cipher-sidebar-col cipher-scroll-hide">
      <div className="cipher-sb-header border-b border-[var(--seam)]">
        <h2 className="cipher-sb-title">Settings</h2>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center p-4 rounded-2xl border border-[var(--seam2)] bg-[var(--lift)] mb-6">
          <div className="cipher-bg-iris rounded-full p-[2px] mb-3">
            <div className="rounded-full bg-[var(--deep)] p-[2px]">
              {userAvatars[username || ''] ? (
                <img src={`data:image/png;base64,${userAvatars[username || '']}`} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[rgba(91,95,255,0.2)] flex items-center justify-center text-xl font-[family-name:var(--font-display)] font-bold text-[var(--i3)]">
                  {(myDisplayName || username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-[13px] text-[var(--tx1)]">{myDisplayName || username}</h3>
          <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--t2)] px-2 py-0.5 rounded-full bg-[rgba(0,196,160,0.12)] border border-[rgba(0,196,160,0.25)]">
            <Icons.Lock size={9} strokeWidth={2} />
            E2E encrypted
          </div>
        </div>

        <p className="text-[10px] text-[var(--tx3)] font-[family-name:var(--font-sans)] font-light leading-relaxed mb-4 px-1">
          Cipher uses a single deep-space theme: electric indigo, cyan, and teal — tuned for focus and encryption cues.
        </p>

        <motion.button
          type="button"
          whileHover={{ x: 3 }}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:bg-[var(--lift3)] hover:border-[var(--seam2)] transition-all text-left mb-2"
          onClick={() => setActiveSubTab('profile')}
        >
          <div className="p-2 rounded-lg bg-[var(--lift)] border border-[var(--seam2)] text-[var(--tx3)]">
            <Icons.Users size={16} strokeWidth={1.55} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-[family-name:var(--font-display)] font-semibold text-[var(--tx1)]">Profile</div>
            <div className="text-[9px] text-[var(--tx3)] truncate font-[family-name:var(--font-sans)] font-light">Display name, avatar, status</div>
          </div>
          <Icons.ChevronRight size={13} className="text-[var(--tx3)]" />
        </motion.button>

        <button
          type="button"
          onClick={() => void logout()}
          className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[rgba(239,68,68,0.2)] text-[rgba(239,100,100,0.85)] hover:bg-[rgba(239,68,68,0.08)] text-[11px] font-[family-name:var(--font-sans)] font-medium transition-colors"
        >
          <Icons.LogOut size={15} strokeWidth={1.55} />
          Log out
        </button>
      </div>
    </div>
  );
};
