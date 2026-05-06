import React, { useEffect, useMemo, useState } from 'react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage } from '../context/AuthContext';
import { avatarColorsFor } from '../avatarColors';
import { teamEmojiFor } from '../teamEmoji';

interface ChatListProps {
  activeChatId: string | null;
  onChatSelect: (id: string | null) => void;
  onComposeNew?: () => void;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function trailingUnreadFromThem(list: ChatMessage[]) {
  let n = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].own) break;
    n++;
  }
  return n;
}

export const ChatList: React.FC<ChatListProps> = ({ activeChatId, onChatSelect, onComposeNew }) => {
  const { users, userAvatars, messageHistory, loadUsers, onlineUsers, typingFrom } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const friends = users.filter((u) => u.relationship === 'friend');

  const filtered = useMemo(() => {
    let list = search.trim() ? friends.filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase())) : [...friends];
    if (filter === 'unread') {
      list = list.filter((u) => trailingUnreadFromThem(messageHistory[u.username] || []) > 0);
    }
    if (filter === 'groups') {
      list = list.filter((u) => /\bteam\b|dev|group/i.test(u.displayName || u.username));
    }
    return list;
  }, [friends, search, filter, messageHistory]);

  const getLastMessage = (u: { username: string }) => {
    const list = messageHistory[u.username] || [];
    return list[list.length - 1];
  };

  return (
    <div className="cipher-sidebar-col cipher-scroll-hide">
      <div className="cipher-sb-header">
        <h2 className="cipher-sb-title">Messages</h2>
        <div className="flex items-center gap-1">
          <button type="button" className="cipher-sb-icon-btn" title="Filter">
            <Icons.ListFilter size={15} strokeWidth={1.55} />
          </button>
          <button type="button" className="cipher-sb-icon-btn cipher-sb-compose" onClick={() => onComposeNew?.()} title="New message">
            <Icons.Plus size={16} strokeWidth={1.55} />
          </button>
        </div>
      </div>

      <div className="cipher-stories">
        <button type="button" className="cipher-story" onClick={() => onComposeNew?.()}>
          <div className="cipher-story-ring cipher-story-ring--seen">
            <div className="cipher-story-inner text-[var(--tx3)]">
              <Icons.Plus size={16} strokeWidth={1.55} />
            </div>
          </div>
          <span className="cipher-story-label">New</span>
        </button>
        {friends.slice(0, 12).map((u) => {
          const unread = trailingUnreadFromThem(messageHistory[u.username] || []);
          const av = userAvatars[u.username];
          const cols = avatarColorsFor(u.username, u.displayName);
          const teamE = teamEmojiFor(u.displayName, u.username);
          return (
            <button key={u.username} type="button" className="cipher-story" onClick={() => onChatSelect(u.username)}>
              <div className={`cipher-story-ring ${unread > 0 ? 'cipher-story-ring--new' : 'cipher-story-ring--seen'}`}>
                <div
                  className="cipher-story-inner"
                  style={{
                    background: cols.bg,
                    color: cols.color,
                    fontSize: cols.fs,
                  }}
                >
                  {av ? (
                    <img src={`data:image/png;base64,${av}`} alt="" className="w-full h-full object-cover" />
                  ) : teamE ? (
                    <span className="text-[1.1rem] leading-none" aria-hidden>
                      {teamE}
                    </span>
                  ) : (
                    (u.displayName || u.username).slice(0, 2).toUpperCase()
                  )}
                </div>
              </div>
              <span className="cipher-story-label">
                {teamE ? `${teamE} ` : ''}
                {u.displayName || u.username}
              </span>
            </button>
          );
        })}
      </div>

      <div className="cipher-sb-search-wrap">
        <Icons.Search size={13} strokeWidth={1.55} className="text-[var(--tx3)] shrink-0" />
        <input
          type="text"
          className="cipher-sb-search"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cipher-filter-tabs">
        {(['all', 'unread', 'groups'] as const).map((id) => (
          <button key={id} type="button" className={`cipher-filter-tab ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>
            {id === 'all' ? 'All' : id === 'unread' ? 'Unread' : '👥 Groups'}
          </button>
        ))}
      </div>

      <div className="cipher-section-label">Chats</div>

      <div className="flex-1 overflow-y-auto min-h-0 cipher-scroll-hide px-2 pb-2">
        {filtered.length === 0 && (
          <p className="text-[11px] text-[var(--tx3)] px-3 py-6 leading-relaxed font-[family-name:var(--font-sans)] font-light">
            {users.length === 0 ? 'Loading…' : 'No conversations match.'}
          </p>
        )}
        {filtered.map((u) => {
          const last = getLastMessage(u);
          const lastText = last ? last.text || (last.attachment ? 'Attachment' : '') : '';
          const lastTime = last ? formatTime(last.at) : '';
          const avatar = userAvatars[u.username];
          const isOnline = onlineUsers.has(u.username) || u.online;
          const isSelected = activeChatId === u.username;
          const isOwnLast = last?.own;
          const lastPreview = lastText ? (isOwnLast ? `You: ${lastText}` : lastText) : 'No messages yet';
          const conv = messageHistory[u.username] || [];
          const unread = !isSelected ? trailingUnreadFromThem(conv) : 0;
          const isTyping = typingFrom === u.username;
          const cols = avatarColorsFor(u.username, u.displayName);
          const teamE = teamEmojiFor(u.displayName, u.username);

          return (
            <div
              key={u.username}
              role="button"
              tabIndex={0}
              onClick={() => onChatSelect(u.username)}
              onKeyDown={(e) => e.key === 'Enter' && onChatSelect(u.username)}
              className={`cipher-ci mb-0.5 ${isSelected ? 'on' : ''}`}
            >
              <div className={`cipher-ci-avatar-wrap ${isSelected ? 'ring-on' : ''}`}>
                <div className="cipher-ci-avatar overflow-hidden" style={avatar ? {} : { background: cols.bg, color: cols.color, fontSize: cols.fs }}>
                  {avatar ? (
                    <img src={`data:image/png;base64,${avatar}`} alt="" className="w-full h-full object-cover" />
                  ) : teamE ? (
                    <span className="text-[1.05rem] leading-none" aria-hidden>
                      {teamE}
                    </span>
                  ) : (
                    (u.displayName || u.username).charAt(0).toUpperCase()
                  )}
                </div>
                <span
                  className={`cipher-ci-dot ${isOnline ? 'cipher-ci-dot--on' : 'cipher-ci-dot--off'}`}
                  title={isOnline ? 'Online' : 'Offline'}
                />
              </div>
              <div className="cipher-ci-body">
                <p className="cipher-ci-name">
                  {teamE && (
                    <span className="mr-1 inline-block" aria-hidden>
                      {teamE}
                    </span>
                  )}
                  {u.displayName || u.username}
                </p>
                <p className={`cipher-ci-preview ${isTyping ? 'typing' : ''}`}>
                  {isTyping ? 'typing…' : lastPreview}
                </p>
              </div>
              <div className="cipher-ci-meta">
                {lastTime && <span className="cipher-ci-time">{lastTime}</span>}
                {unread > 0 && <span className="cipher-ci-unread">{unread > 9 ? '9+' : unread}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
