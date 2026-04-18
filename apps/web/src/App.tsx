import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { RightPanel } from './components/RightPanel';
import { Auth } from './components/Auth';
import { Contacts } from './components/Contacts';
import { SettingsPage } from './components/SettingsPage';
import { AuthProvider, useAuth } from './context/AuthContext';

const THEME_STORAGE_KEY = 'cipherchatTheme';

function AppContent() {
  const { username } = useAuth();
  const [activeTab, setActiveTab] = useState('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return (localStorage.getItem(THEME_STORAGE_KEY) || 'dark') !== 'light';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', !isDarkMode);
  }, [isDarkMode]);

  const setTheme = (theme: 'dark' | 'light') => {
    const isDark = theme === 'dark';
    setIsDarkMode(isDark);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_) {}
    document.documentElement.classList.toggle('light', !isDark);
  };

  const toggleTheme = () => setTheme(isDarkMode ? 'light' : 'dark');

  if (!username) {
    return <Auth onLogin={() => {}} />;
  }

  return (
    <div className={`flex h-screen w-full bg-brand-bg overflow-hidden select-none relative ${!isDarkMode ? 'light' : ''}`}>
      {/* Ambient glow orbs — primary and secondary accent corners */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-pink-500/20 blur-[120px] rounded-full" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex w-full h-full relative z-10"
        style={{ perspective: '1000px' }}
      >
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onToggleTheme={toggleTheme} isDarkMode={isDarkMode} />
        {activeTab === 'chats' && (
          <ChatList activeChatId={activeChatId} onChatSelect={setActiveChatId} />
        )}
        {activeTab === 'contacts' && <Contacts onSelectUser={setActiveChatId} />}
        {activeTab === 'settings' && <SettingsPage isDarkMode={isDarkMode} onThemeSelect={setTheme} />}
        <ChatWindow activeChatId={activeChatId} onTogglePanel={() => setIsRightPanelOpen((o) => !o)} />
        <AnimatePresence>
          {isRightPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <RightPanel activeChatId={activeChatId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
