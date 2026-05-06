import React from 'react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onProfileClick?: () => void;
  unreadChats?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onProfileClick, unreadChats = 0 }) => {
  const { username, myDisplayName, userAvatars } = useAuth();
  const navItems: { id: string; icon: typeof Icons.MessageSquare; label: string; disabled?: boolean }[] = [
    { id: 'chats', icon: Icons.MessageSquare, label: 'Messages' },
    { id: 'calls', icon: Icons.Phone, label: 'Calls', disabled: true },
    { id: 'contacts', icon: Icons.Users, label: 'People' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings' },
  ];

  const initials = (myDisplayName || username || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="cipher-rail">
      <button type="button" className="cipher-rail-logo" title="Cipher" aria-label="Cipher home">
        <Icons.Layers size={20} strokeWidth={2.2} className="text-white" />
      </button>

      <div className="flex-1 flex flex-col gap-0.5 w-full items-center">
        {navItems.map((item) => {
          const on = activeTab === item.id;
          const disabled = !!item.disabled;
          const showBadge = item.id === 'chats' && unreadChats > 0;
          return (
            <div key={item.id} className={`cipher-rail-nav-wrap relative w-full flex justify-center ${on && !disabled ? 'on' : ''}`}>
              <button
                type="button"
                title={item.label}
                disabled={disabled}
                onClick={() => !disabled && onTabChange(item.id)}
                className={`cipher-rail-nav ${on && !disabled ? 'on' : ''}`}
              >
                <item.icon size={20} strokeWidth={1.55} />
              </button>
              {item.id === 'chats' && showBadge && (
                <span className="cipher-rail-badge" aria-label={`${unreadChats} unread`}>
                  {unreadChats > 9 ? '9+' : unreadChats}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="cipher-rail-avatar" onClick={() => onProfileClick?.()} title="Profile">
        {userAvatars[username || ''] ? (
          <img src={`data:image/png;base64,${userAvatars[username || '']}`} alt="" className="w-full h-full object-cover rounded-full" />
        ) : (
          initials
        )}
        <span className="cipher-rail-avatar-dot" />
      </button>
    </div>
  );
};
