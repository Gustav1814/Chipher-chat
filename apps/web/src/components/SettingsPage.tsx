import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

type SettingsTab = 'main' | 'profile' | 'appearance';

interface SettingsPageProps {
  isDarkMode?: boolean;
  onThemeSelect?: (theme: 'dark' | 'light') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ isDarkMode = true, onThemeSelect }) => {
  const { username, myDisplayName, myStatus, userAvatars, updateMyProfile, refreshMyAvatar } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('main');
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [displayName, setDisplayName] = useState(myDisplayName ?? username ?? '');
  const [status, setStatus] = useState(myStatus ?? '');
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDisplayName(myDisplayName ?? username ?? '');
    setStatus(myStatus ?? '');
  }, [myDisplayName, myStatus, username]);

  const sections: { id: SettingsTab; title: string; items: { id: SettingsTab; icon: typeof Icons.Users; label: string; desc: string }[] }[] = [
    {
      id: 'profile',
      title: 'Account',
      items: [
        { id: 'profile', icon: Icons.Users, label: 'Profile Information', desc: 'Display name, avatar, status' },
      ],
    },
    {
      id: 'appearance',
      title: 'Appearance',
      items: [
        { id: 'appearance', icon: Icons.Moon, label: 'Theme Mode', desc: isDarkMode ? 'Dark' : 'Light' },
      ],
    },
  ];

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

  const renderContent = () => {
    switch (activeSubTab) {
      case 'profile':
        return (
          <div className="p-6">
            <button onClick={() => setActiveSubTab('main')} className="flex items-center gap-2 text-brand-text-muted hover:text-brand-text mb-6">
              <Icons.ChevronRight size={18} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-xl font-bold mb-6">Profile Information</h2>
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 mb-8">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {userAvatars[username || ''] ? (
                    <img src={`data:image/png;base64,${userAvatars[username || '']}`} alt="" className="w-24 h-24 rounded-full border-4 border-brand-accent object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-brand-accent bg-brand-accent flex items-center justify-center text-2xl font-bold text-white">
                      {(displayName || username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Icons.ImageIcon size={24} />
                  </div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-xs text-brand-accent font-bold">
                  Change Avatar
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-2">Username (unique, cannot change)</label>
                  <input
                    type="text"
                    value={username || ''}
                    readOnly
                    className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-sm focus:outline-none opacity-80 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-2">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How others see you"
                    className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted uppercase mb-2">Status</label>
                  <input
                    type="text"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="E.g. Hey there! or Busy"
                    maxLength={200}
                    className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              {profileError && <p className="text-red-400 text-sm">{profileError}</p>}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full bg-brand-accent py-3 rounded-xl font-bold mt-4 disabled:opacity-70"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="p-6 relative">
            <button onClick={() => setActiveSubTab('main')} className="flex items-center gap-2 text-brand-text-muted hover:text-brand-text mb-6">
              <Icons.ChevronRight size={18} className="rotate-180" />
              <span>Back</span>
            </button>
            <h2 className="text-xl font-bold mb-6">Appearance</h2>
            <p className="text-sm text-brand-text-muted mb-4">Click Theme Mode on the main settings to choose Dark or Light.</p>
            <button onClick={() => setActiveSubTab('main')} className="text-brand-accent font-medium text-sm">Back to Settings</button>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Settings</h2>

            <div className="flex flex-col items-center p-6 bg-brand-glass rounded-2xl border border-brand-border mb-8">
              {userAvatars[username || ''] ? (
                <img src={`data:image/png;base64,${userAvatars[username || '']}`} alt="" className="w-20 h-20 rounded-full border-2 border-brand-accent mb-4 object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-brand-accent mb-4 bg-brand-accent flex items-center justify-center text-2xl font-bold text-white">
                  {(myDisplayName || username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="font-bold">{myDisplayName || username}</h3>
              <p className="text-xs text-brand-text-muted">{myStatus || 'E2E Encrypted'}</p>
            </div>

            <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-350px)] no-scrollbar">
              {sections.map((section, idx) => (
                <div key={idx}>
                  <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-4">{section.title}</h4>
                  <div className="space-y-2">
                    {section.items.map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all relative"
                        onClick={() => {
                          if (item.id === 'appearance') {
                            setShowAppearanceMenu((prev) => !prev);
                          } else {
                            setActiveSubTab(item.id);
                          }
                        }}
                      >
                        <div className="p-2 rounded-lg bg-brand-glass border border-brand-border text-brand-text-muted">
                          <item.icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-[10px] text-brand-text-muted truncate">{item.desc}</div>
                        </div>
                        <Icons.ChevronRight size={14} className="text-brand-text-muted" />
                        {item.id === 'appearance' && showAppearanceMenu && (
                          <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="absolute right-0 top-full mt-1 z-20 w-36 py-2 rounded-xl border border-brand-border bg-brand-sidebar shadow-xl"
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onThemeSelect?.('dark'); setShowAppearanceMenu(false); }}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDarkMode ? 'bg-brand-accent/20 text-brand-accent font-medium' : 'hover:bg-white/5'}`}
                            >
                              <Icons.Moon size={16} /> Dark
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onThemeSelect?.('light'); setShowAppearanceMenu(false); }}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${!isDarkMode ? 'bg-brand-accent/20 text-brand-accent font-medium' : 'hover:bg-white/5'}`}
                            >
                              <Icons.Sun size={16} /> Light
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-80 h-full flex flex-col border-r border-brand-border bg-brand-chat-list relative">
      {renderContent()}
      {showAppearanceMenu && activeSubTab === 'main' && (
        <div className="fixed inset-0 z-10" onClick={() => setShowAppearanceMenu(false)} aria-hidden />
      )}
    </div>
  );
};
