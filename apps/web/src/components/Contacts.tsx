import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';

interface ContactsProps {
  onSelectUser: (username: string | null) => void;
}

export const Contacts: React.FC<ContactsProps> = ({ onSelectUser }) => {
  const { users, userAvatars, loadUsers, getRelationship, sendFriendRequest, acceptFriendRequest, declineFriendRequest } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = search.trim()
    ? users.filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase()))
    : users;

  return (
    <div className="w-80 h-full flex flex-col border-r border-brand-border glass-panel">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6">Contacts</h2>
        <div className="relative mb-6">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-glass border border-brand-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-accent transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest mb-4 px-2">All users</div>
        {filtered.map((u) => {
          const rel = getRelationship(u.username);
          const avatar = userAvatars[u.username];
          return (
            <motion.div
              key={u.username}
              whileHover={{ x: 4 }}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all mb-1"
            >
              <div className="relative flex-shrink-0">
                {avatar ? (
                  <img src={`data:image/png;base64,${avatar}`} alt="" className="w-10 h-10 rounded-full object-cover border border-brand-border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-accent border border-brand-border flex items-center justify-center font-semibold text-white text-sm">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{u.displayName || u.username}</div>
                <div className="text-xs text-brand-text-muted">
                  {rel === 'friend' && 'Friend · Encrypted'}
                  {rel === 'pending_sent' && 'Pending'}
                  {rel === 'pending_received' && 'Wants to be friends'}
                  {rel === 'none' && 'Add friend'}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {rel === 'friend' && (
                  <button
                    type="button"
                    onClick={() => onSelectUser(u.username)}
                    className="p-2 text-brand-text-muted hover:text-brand-accent transition-colors"
                    title="Chat"
                  >
                    <Icons.MessageSquare size={16} />
                  </button>
                )}
                {rel === 'pending_received' && (
                  <>
                    <button
                      type="button"
                      onClick={() => acceptFriendRequest(u.username)}
                      className="text-xs px-2 py-1 rounded-lg bg-brand-accent text-white font-medium"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => declineFriendRequest(u.username)}
                      className="text-xs px-2 py-1 rounded-lg border border-brand-border text-brand-text-muted hover:text-red-400"
                    >
                      Decline
                    </button>
                  </>
                )}
                {rel === 'none' && (
                  <button
                    type="button"
                    onClick={() => sendFriendRequest(u.username)}
                    className="text-xs px-2 py-1 rounded-lg bg-brand-accent text-white font-medium"
                  >
                    Add
                  </button>
                )}
                {rel === 'pending_sent' && <span className="text-[10px] text-amber-500">Sent</span>}
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-brand-text-muted px-2 py-4">No other users yet.</p>}
      </div>
    </div>
  );
};
