import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
import { avatarColorsFor } from '../avatarColors';
import { teamEmojiFor } from '../teamEmoji';

interface ContactsProps {
  onSelectUser: (username: string | null) => void;
}

export const Contacts: React.FC<ContactsProps> = ({ onSelectUser }) => {
  const { users, userAvatars, loadUsers, getRelationship, sendFriendRequest, acceptFriendRequest, declineFriendRequest } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = search.trim() ? users.filter((u) => u.username.toLowerCase().includes(search.trim().toLowerCase())) : users;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="cipher-sidebar-col cipher-scroll-hide"
    >
      <div className="cipher-contacts-header">
        <h2 className="cipher-contacts-title">People</h2>
        <div className="cipher-sb-search-wrap cipher-contacts-search">
          <Icons.Search size={13} strokeWidth={1.55} className="text-[var(--tx3)] shrink-0" />
          <input
            type="text"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cipher-sb-search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 cipher-scroll-hide px-2 pb-3">
        <div className="cipher-section-label">All users</div>
        {filtered.map((u, i) => {
          const rel = getRelationship(u.username);
          const avatar = userAvatars[u.username];
          const cols = avatarColorsFor(u.username, u.displayName);
          const teamE = teamEmojiFor(u.displayName, u.username);
          const initial = (u.displayName || u.username).charAt(0).toUpperCase();

          return (
            <motion.div
              key={u.username}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 + i * 0.02 }}
              className="cipher-contact-row"
            >
              <div
                className="cipher-contact-avatar"
                style={
                  avatar
                    ? undefined
                    : {
                        background: cols.bg,
                        color: cols.color,
                        fontSize: cols.fs,
                      }
                }
              >
                {avatar ? (
                  <img src={`data:image/png;base64,${avatar}`} alt="" />
                ) : teamE ? (
                  <span className="text-[1.05rem] font-normal leading-none">{teamE}</span>
                ) : (
                  initial
                )}
              </div>
              <div className="cipher-contact-body">
                <p className="cipher-contact-name truncate">
                  {teamE && (
                    <span className="mr-1 inline-block" aria-hidden>
                      {teamE}
                    </span>
                  )}
                  {u.displayName || u.username}
                </p>
                <div className="cipher-contact-status-row">
                  {rel === 'friend' && (
                    <span className="cipher-pill cipher-pill--friend">
                      <Icons.ShieldCheck size={10} strokeWidth={1.55} className="opacity-90" />
                      Friend
                    </span>
                  )}
                  {rel === 'pending_sent' && <span className="cipher-pill cipher-pill--pending">Pending</span>}
                  {rel === 'pending_received' && <span className="cipher-pill cipher-pill--request">Request</span>}
                  {rel === 'none' && <span className="cipher-pill cipher-pill--stranger">Stranger</span>}
                </div>
              </div>
              <div className="cipher-contact-actions">
                {rel === 'friend' && (
                  <button type="button" onClick={() => onSelectUser(u.username)} className="cipher-ghost-icon-btn" title="Message">
                    <Icons.MessageSquare size={17} strokeWidth={1.55} />
                  </button>
                )}
                {rel === 'pending_received' && (
                  <>
                    <button type="button" onClick={() => acceptFriendRequest(u.username)} className="cipher-btn-inline" title="Accept">
                      <Icons.Check size={12} strokeWidth={2} />
                      Accept
                    </button>
                    <button type="button" onClick={() => declineFriendRequest(u.username)} className="cipher-btn-decline" title="Decline">
                      <Icons.X size={15} strokeWidth={1.55} />
                    </button>
                  </>
                )}
                {rel === 'none' && (
                  <button type="button" onClick={() => sendFriendRequest(u.username)} className="cipher-contact-add" title="Add friend">
                    <Icons.UserPlus size={16} strokeWidth={1.55} />
                    Add
                  </button>
                )}
                {rel === 'pending_sent' && <span className="cipher-pill-sent">Sent</span>}
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-[11px] text-[var(--tx3)] px-3 py-6 font-[family-name:var(--font-sans)] font-light leading-relaxed">No other users yet.</p>
        )}
      </div>
    </motion.div>
  );
};
