import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { RightPanel } from './components/RightPanel';
import { Auth } from './components/Auth';
import { Contacts } from './components/Contacts';
import { SettingsPage } from './components/SettingsPage';
import { AuthProvider, useAuth, type ChatMessage } from './context/AuthContext';
import { CipherAmbient } from './components/CipherAmbient';
import { IrisGradientDefs } from './components/IrisGradientDefs';

const panelStagger = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

function AppContent() {
  const { username, messageHistory, token, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const railUnread = useMemo(() => {
    let n = 0;
    for (const conv of Object.values(messageHistory) as ChatMessage[][]) {
      for (let i = conv.length - 1; i >= 0; i--) {
        if (conv[i].own) break;
        n++;
      }
    }
    return n;
  }, [messageHistory]);

  if (loading && token && !username) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--void)] text-[var(--tx2)] text-[13px] font-[family-name:var(--font-sans)] font-light">
        Restoring session…
      </div>
    );
  }

  if (!username) {
    return <Auth onLogin={() => {}} />;
  }

  return (
    <>
      <IrisGradientDefs />
      <div className="flex h-screen w-screen min-w-[1024px] overflow-hidden select-none relative bg-[var(--void)] text-[var(--tx1)]">
        <CipherAmbient />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full h-full relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...panelStagger, delay: 0 }}
            className="shrink-0"
          >
            <Sidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onProfileClick={() => setActiveTab('settings')}
              unreadChats={railUnread}
            />
          </motion.div>
          {activeTab === 'chats' && (
            <motion.div
              key="chats-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...panelStagger, delay: 0.05 }}
              className="shrink-0"
            >
              <ChatList activeChatId={activeChatId} onChatSelect={setActiveChatId} onComposeNew={() => setActiveTab('contacts')} />
            </motion.div>
          )}
          {activeTab === 'contacts' && (
            <motion.div
              key="contacts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...panelStagger, delay: 0.05 }}
              className="shrink-0"
            >
              <Contacts onSelectUser={setActiveChatId} />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...panelStagger, delay: 0.05 }}
              className="shrink-0"
            >
              <SettingsPage />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...panelStagger, delay: 0.1 }}
            className="flex-1 min-w-0 flex"
          >
            <ChatWindow activeChatId={activeChatId} onTogglePanel={() => setIsRightPanelOpen((o) => !o)} />
          </motion.div>
          {isRightPanelOpen && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 w-[280px]"
            >
              <RightPanel activeChatId={activeChatId} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
