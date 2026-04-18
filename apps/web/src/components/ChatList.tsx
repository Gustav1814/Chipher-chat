import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';

interface ChatListProps {
  activeChatId: string | null;
  onChatSelect: (id: string | null) => void;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const ChatList: React.FC<ChatListProps> = ({ activeChatId, onChatSelect }) => {
  const { username, myDisplayName, users, userAvatars, messageHistory, loadUsers, onlineUsers } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const friends = users.filter((u) => u.relationship === 'friend');
  const filtered = search.trim() ? friends.filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase())) : friends;

  const getLastMessage = (u: { username: string }) => {
    const list = messageHistory[u.username] || [];
    return list[list.length - 1];
  };

  return (
    <div className="w-80 h-full flex flex-col border-r border-brand-border glass-panel">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {userAvatars[username || ''] ? (
              <img src={`data:image/png;base64,${userAvatars[username || '']}`} alt="" className="w-10 h-10 rounded-full object-cover border border-brand-border" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-accent border border-brand-border flex items-center justify-center font-semibold text-white">
                {(username || '').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-brand-sidebar rounded-full" />
          </div>
          <div>
            <div className="text-sm font-semibold">{myDisplayName || username}</div>
            <div className="text-xs text-brand-text-muted">E2E Encrypted</div>
          </div>
        </div>
        <Icons.MoreHorizontal className="text-brand-text-muted cursor-pointer hover:text-brand-text" size={20} />
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
          <input type="text" placeholder="People, groups and messages +" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-brand-input border border-brand-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-violet-500/50 transition-colors" />
        </div>
      </div>
      {/* Story-style circles */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto no-scrollbar border-b border-brand-border">
        <button type="button" onClick={() => onChatSelect(null)} className="shrink-0 flex flex-col items-center gap-1.5 group">
          <div className="w-[3.25rem] h-[3.25rem] rounded-full border-2 border-dashed border-brand-border bg-brand-glass flex items-center justify-center text-brand-text-muted group-hover:border-brand-accent transition-colors">
            <Icons.Plus size={20} />
          </div>
          <span className="text-[10px] text-brand-text-muted truncate max-w-[56px]">My Story</span>
        </button>
        {friends.slice(0, 8).map((u) => {
          const avatar = userAvatars[u.username];
          return (
            <button key={u.username} type="button" onClick={() => onChatSelect(u.username)} className="shrink-0 flex flex-col items-center gap-1.5 group">
              <div className="story-ring w-[3.25rem] h-[3.25rem] group-hover:scale-105 transition-transform">
                <div className="story-ring-inner w-full h-full overflow-hidden">
                  {avatar ? <img src={`data:image/png;base64,${avatar}`} alt="" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-brand-accent flex items-center justify-center text-white font-semibold text-xs rounded-full">{u.displayName?.charAt(0) || u.username.charAt(0)}</div>}
                </div>
              </div>
              <span className="text-[10px] text-brand-text-muted truncate max-w-[56px]">{u.displayName || u.username}</span>
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {filtered.length === 0 && <p className="text-sm text-brand-text-muted px-4 py-6">{users.length === 0 ? 'Loading...' : 'No friends yet. Go to Contacts to add friends.'}</p>}
        {filtered.map((u) => {
          const last = getLastMessage(u);
          const lastText = last ? (last.text || (last.attachment ? 'Attachment' : '')) : '';
          const lastTime = last ? formatTime(last.at) : '';
          const avatar = userAvatars[u.username];
          const isOnline = onlineUsers.has(u.username) || u.online;
          const isSelected = activeChatId === u.username;
          const isOwnLast = last?.own;
          const lastPreview = lastText ? (isOwnLast ? `You: ${lastText}` : lastText) : 'No messages yet';
          return (
            <motion.div key={u.username} whileHover={{ x: 2 }} onClick={() => onChatSelect(u.username)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-0.5 ${isSelected ? 'chat-list-item-selected' : 'hover:bg-white/6'}`}>
              <div className="relative shrink-0">
                {avatar ? <img src={`data:image/png;base64,${avatar}`} alt="" className="w-12 h-12 rounded-full object-cover border border-brand-border" /> : <div className="w-12 h-12 rounded-full bg-brand-accent border border-brand-border flex items-center justify-center font-semibold text-white text-sm chat-avatar-placeholder">{u.username.charAt(0).toUpperCase()}</div>}
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-brand-sidebar ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} title={isOnline ? 'Online' : 'Offline'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold truncate text-inherit">{u.displayName || u.username}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {lastTime && <span className="text-[10px] text-brand-text-muted font-mono">{lastTime}</span>}
                    {isSelected && <span className="flex items-center chat-read-chevrons"><Icons.ChevronRight size={12} className="-ml-1" /><Icons.ChevronRight size={12} /></span>}
                  </div>
                </div>
                <p className="text-xs text-brand-text-muted truncate pr-1">{lastPreview}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
