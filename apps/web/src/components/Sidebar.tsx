import React from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onToggleTheme, isDarkMode }) => {
  const { logout } = useAuth();
  const navItems = [
    { id: 'chats', icon: Icons.MessageSquare, label: 'Chats' },
    { id: 'contacts', icon: Icons.Users, label: 'Contacts' },
    { id: 'settings', icon: Icons.Settings, label: 'Settings' },
  ];

  return (
    <div className={`w-20 h-full flex flex-col items-center py-8 border-r border-brand-border glass-panel ${!isDarkMode ? 'sidebar-light-tint' : ''}`}>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex flex-col items-center gap-1 mb-12 cursor-pointer" title="Secure Chat">
        <Logo size={32} animated={false} />
        <span className="text-[10px] font-semibold text-brand-text-muted truncate w-full text-center font-sans">Secure Chat</span>
      </motion.div>

      <div className="flex-1 flex flex-col gap-8">
        {navItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTabChange(item.id)}
            className={`p-3 rounded-xl cursor-pointer transition-colors ${
              activeTab === item.id ? 'nav-item-active' : 'text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <item.icon size={24} />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-6 mt-auto">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleTheme}
          className="text-brand-text-muted hover:text-brand-text cursor-pointer"
        >
          {isDarkMode ? <Icons.Sun size={24} /> : <Icons.Moon size={24} />}
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={logout} className="text-brand-text-muted hover:text-brand-text cursor-pointer" title="Log out">
          <Icons.LogOut size={24} />
        </motion.div>
      </div>
    </div>
  );
};
