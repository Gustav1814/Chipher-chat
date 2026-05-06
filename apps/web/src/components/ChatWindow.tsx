import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
import { teamEmojiFor } from '../teamEmoji';
import { COMPOSER_EMOJI_GROUPS } from '../composerEmojis';
import { isJumboEmojiOnly } from '../emojiJumbo';
import type { ChatMessage } from '../context/AuthContext';

interface ChatWindowProps {
  activeChatId: string | null;
  onTogglePanel?: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ activeChatId, onTogglePanel }) => {
  const {
    users,
    userAvatars,
    username,
    messageHistory,
    getRelationship,
    ensureRemoteKey,
    sendMessage,
    onlineUsers,
    typingFrom,
    emitTyping,
    mergeHistoryFromIDB,
  } = useAuth();
  const [input, setInput] = useState('');
  const [keyReady, setKeyReady] = useState(false);
  const [keyError, setKeyError] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; text: string } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ChatMessage['attachment'] | null>(null);
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [keyErrorMessage, setKeyErrorMessage] = useState<string | null>(null);
  const [pinnedVisible, setPinnedVisible] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const friend = users.find((u) => u.username === activeChatId);
  const isFriend = friend && activeChatId && getRelationship(activeChatId) === 'friend';
  let messages: ChatMessage[] = activeChatId ? messageHistory[activeChatId] || [] : [];
  const q = searchInChat.trim().toLowerCase();
  if (q) messages = messages.filter((m) => (m.text || '').toLowerCase().includes(q));

  const isOnline = activeChatId ? onlineUsers.has(activeChatId) || friend?.online : false;

  useEffect(() => {
    if (!activeChatId || !isFriend) {
      setKeyReady(false);
      setKeyError(false);
      setReplyTo(null);
      setPendingAttachment(null);
      return;
    }
    setKeyError(false);
    setKeyReady(false);
    setKeyErrorMessage(null);
    mergeHistoryFromIDB(activeChatId).then(() => {});

    let cancelled = false;
    const fetchKeyWithRetry = (retriesLeft: number) => {
      ensureRemoteKey(activeChatId!).then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setKeyReady(true);
          setKeyError(false);
          setKeyErrorMessage(null);
          return;
        }
        if (retriesLeft > 0) {
          setTimeout(() => fetchKeyWithRetry(retriesLeft - 1), 2500);
          return;
        }
        setKeyReady(false);
        setKeyError(true);
        setKeyErrorMessage(result.error || 'Key unavailable');
      });
    };
    fetchKeyWithRetry(6);
    return () => {
      cancelled = true;
    };
  }, [activeChatId, isFriend, ensureRemoteKey, mergeHistoryFromIDB]);

  useEffect(() => {
    if (!keyError || !activeChatId || !onlineUsers.has(activeChatId)) return;
    const tryFetch = () => {
      ensureRemoteKey(activeChatId!).then((result) => {
        if (result.ok) {
          setKeyReady(true);
          setKeyError(false);
          setKeyErrorMessage(null);
        } else {
          setKeyErrorMessage(result.error || null);
        }
      });
    };
    tryFetch();
    const interval = setInterval(tryFetch, 3500);
    return () => clearInterval(interval);
  }, [keyError, activeChatId, onlineUsers, ensureRemoteKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingFrom === activeChatId]);

  useEffect(() => {
    setShowEmojiPicker(false);
  }, [activeChatId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!chatMenuRef.current?.contains(e.target as Node)) setShowChatMenu(false);
      if (!emojiPickerRef.current?.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${Math.min(96, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  const handleTyping = useCallback(() => {
    if (!activeChatId) return;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      emitTyping(activeChatId, true);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => emitTyping(activeChatId, false), 2000);
    }, 300);
  }, [activeChatId, emitTyping]);

  const insertEmojiInComposer = useCallback(
    (emoji: string) => {
      if (!emoji || !keyReady) return;
      const ta = textareaRef.current;
      setInput((prev) => {
        const start = ta ? ta.selectionStart : prev.length;
        const end = ta ? ta.selectionEnd : prev.length;
        const padBefore = start > 0 && /\S/.test(prev[start - 1]!) ? ' ' : '';
        const padAfter = end < prev.length && /\S/.test(prev[end]!) ? ' ' : '';
        const chunk = `${padBefore}${emoji}${padAfter}`;
        const next = prev.slice(0, start) + chunk + prev.slice(end);
        const cursor = start + chunk.length;
        if (ta) {
          queueMicrotask(() => {
            ta.focus();
            ta.setSelectionRange(cursor, cursor);
          });
        }
        return next;
      });
      handleTyping();
    },
    [keyReady, handleTyping],
  );

  useEffect(
    () => () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (activeChatId) emitTyping(activeChatId, false);
    },
    [activeChatId, emitTyping],
  );

  const doSend = () => {
    const text = input.trim();
    if (!activeChatId || !keyReady || (!text && !pendingAttachment)) return;
    emitTyping(activeChatId, false);
    sendMessage(activeChatId, text, pendingAttachment ?? undefined, replyTo ?? undefined);
    setInput('');
    setReplyTo(null);
    setPendingAttachment(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSend();
  };

  const handleExport = useCallback(() => {
    if (!activeChatId) return;
    setShowChatMenu(false);
    const list = messageHistory[activeChatId] || [];
    const otherName = friend?.displayName || activeChatId;
    const lines = list.map((m) => {
      const who = m.own ? 'You' : otherName;
      return `[${new Date(m.at).toLocaleString()}] ${who}: ${m.text || (m.attachment ? '(attachment)' : '')}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chat-${activeChatId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [activeChatId, messageHistory, friend?.displayName]);

  const onFileChosen = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const base64 = data.replace(/^data:[^;]+;base64,/, '');
      if (base64.length > 450000) return;
      setPendingAttachment({ type: 'image', name: file.name || 'image', data: base64, mime: file.type || 'image/png' });
    };
    reader.readAsDataURL(file);
  }, []);

  if (!activeChatId) {
    return (
      <div className="cipher-chat-col">
        <div className="cipher-empty-chat">
          <Icons.MessageSquare size={40} strokeWidth={1.55} className="text-[var(--tx3)] opacity-80" />
          <h3>Cipher</h3>
          <p className="text-[12px] font-[family-name:var(--font-sans)] font-light text-[var(--tx3)] max-w-xs">
            Choose a conversation. Messages are end-to-end encrypted.
          </p>
        </div>
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div className="cipher-chat-col">
        <div className="cipher-empty-chat">
          <Icons.ShieldCheck size={40} strokeWidth={1.55} className="text-[var(--i3)] opacity-90" />
          <h3>{activeChatId}</h3>
          <p className="text-[12px] font-[family-name:var(--font-sans)] font-light text-[var(--tx3)] max-w-xs">
            Add them as a friend in People to start an encrypted chat.
          </p>
        </div>
      </div>
    );
  }

  const avatar = userAvatars[activeChatId];
  const displayName = friend?.displayName || activeChatId;
  const teamE = teamEmojiFor(friend?.displayName, activeChatId);
  const pinnedText = messages.find((m) => m.text)?.text?.slice(0, 80) || 'Encrypted session active';

  return (
    <div className="cipher-chat-col">
      <header className="cipher-chat-header">
        <div className="cipher-ch-left min-w-0">
          <div className="cipher-ch-avatar-wrap">
            <div className="cipher-ch-avatar-glow" aria-hidden />
            {avatar ? (
              <div className="cipher-ch-avatar p-0 overflow-hidden">
                <img src={`data:image/png;base64,${avatar}`} alt="" />
              </div>
            ) : teamE ? (
              <div className="cipher-ch-avatar text-[1.15rem] font-normal leading-none">{teamE}</div>
            ) : (
              <div className="cipher-ch-avatar">{displayName.charAt(0).toUpperCase()}</div>
            )}
            {isOnline && <span className="cipher-ch-dot" />}
          </div>
          <div className="cipher-ch-info min-w-0">
            <h2 className="truncate">
              {teamE && (
                <span className="mr-1.5 inline-block" aria-hidden>
                  {teamE}
                </span>
              )}
              {displayName}
            </h2>
            <div className="cipher-ch-status">
              {isOnline && <span className="cipher-ch-status-dot" />}
              {isOnline ? 'Online now' : 'Offline'}
            </div>
          </div>
          <div className="cipher-private-badge shrink-0">
            <Icons.Lock size={10} strokeWidth={2} stroke="url(#ig)" />
            <span>Private</span>
          </div>
        </div>
        <div className="cipher-ch-actions">
          <button type="button" disabled className="cipher-ch-action" title="Voice call">
            <Icons.Phone size={17} strokeWidth={1.55} />
          </button>
          <button type="button" disabled className="cipher-ch-action" title="Video call">
            <Icons.Video size={17} strokeWidth={1.55} />
          </button>
          <span className="cipher-ch-divider" />
          <button
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            className="cipher-ch-action"
            title="Search in chat"
          >
            <Icons.Search size={17} strokeWidth={1.55} />
          </button>
          {showSearch && (
            <input
              type="text"
              placeholder="Search…"
              value={searchInChat}
              onChange={(e) => setSearchInChat(e.target.value)}
              className="w-28 px-2 py-1.5 text-[11px] rounded-lg bg-[var(--lift)] border border-[var(--seam2)] text-[var(--tx1)] placeholder:text-[var(--tx3)] outline-none focus:border-[rgba(91,95,255,0.35)]"
            />
          )}
          <div className="relative" ref={chatMenuRef}>
            <button type="button" onClick={() => setShowChatMenu((v) => !v)} className="cipher-ch-action" title="More">
              <Icons.MoreHorizontal size={17} strokeWidth={1.55} />
            </button>
            {showChatMenu && (
              <div className="absolute right-0 top-full mt-1 py-1 min-w-[9rem] rounded-xl border border-[var(--seam2)] bg-[rgba(0,0,0,0.94)] backdrop-blur-xl z-50 shadow-[0_8px_36px_rgba(0,0,0,0.65)]">
                <button
                  type="button"
                  onClick={handleExport}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] text-[var(--tx2)] hover:bg-[var(--lift3)]"
                >
                  <Icons.Download size={14} strokeWidth={1.55} />
                  Export chat
                </button>
                {onTogglePanel && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false);
                      onTogglePanel();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] text-[var(--tx2)] hover:bg-[var(--lift3)]"
                  >
                    <Icons.Info size={14} strokeWidth={1.55} />
                    Details panel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {pinnedVisible && (
        <div className="cipher-pinned">
          <div className="cipher-pinned-accent" />
          <Icons.Pin size={13} strokeWidth={1.55} className="cipher-pinned-pin" />
          <span className="cipher-pinned-label">Pinned</span>
          <span className="cipher-pinned-text">{pinnedText}</span>
          <button type="button" className="cipher-pinned-x" aria-label="Dismiss pinned" onClick={() => setPinnedVisible(false)}>
            <Icons.X size={14} strokeWidth={1.55} />
          </button>
        </div>
      )}

      {replyTo && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-[var(--seam)] bg-[var(--lift)] text-[11px]">
          <span className="text-[var(--tx3)] truncate flex-1">Replying: {(replyTo.text || '').slice(0, 60)}</span>
          <button type="button" onClick={() => setReplyTo(null)} className="cipher-in-btn !w-8 !h-8" aria-label="Cancel reply">
            <Icons.X size={14} strokeWidth={1.55} />
          </button>
        </div>
      )}

      {keyError && (
        <div className="mx-4 mt-2 p-3 rounded-xl border border-[var(--seam2)] bg-[var(--lift)] text-[var(--tx2)] text-[11px] flex items-center justify-between gap-3">
          <span>
            Encryption key for {displayName} is not available yet. {keyErrorMessage ? <strong>{keyErrorMessage}.</strong> : null}{' '}
            Ask them to stay logged in.
            {isOnline ? ' Retrying…' : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              setKeyErrorMessage(null);
              ensureRemoteKey(activeChatId!).then((result) => {
                setKeyReady(result.ok);
                setKeyError(!result.ok);
                if (!result.ok) setKeyErrorMessage(result.error || null);
              });
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-[rgba(91,95,255,0.3)] text-[var(--i3)] bg-[rgba(91,95,255,0.08)]"
          >
            Retry
          </button>
        </div>
      )}

      <div ref={scrollRef} className="cipher-feed cipher-scroll-chat">
        <div className="cipher-date-divider">Today</div>
        <div className="cipher-e2e-pill">
          <span className="cipher-e2e-grad">
            <Icons.ShieldCheck size={12} strokeWidth={1.55} className="shrink-0 opacity-90" />
            End-to-end encrypted — keys stay on device
          </span>
        </div>

        {typingFrom === activeChatId && (
          <div className="cipher-msg-row r">
            <div className="cipher-msg-ava hide" />
            <div className="cipher-typing-bubble">
              <span className="cipher-typing-dot" />
              <span className="cipher-typing-dot" />
              <span className="cipher-typing-dot" />
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : undefined;
          const samePrev = prev && prev.own === msg.own;
          const showAvatar = !samePrev;
          return (
            <CipherMessageRow
              key={`${msg.at}-${idx}`}
              message={msg}
              isMe={msg.own}
              showAvatar={showAvatar}
              myAvatar={userAvatars[username || '']}
              myInitial={(username || 'U').charAt(0).toUpperCase()}
              theirAvatar={avatar}
              theirTeamEmoji={teamE}
              theirName={displayName}
              idx={idx}
              onReply={() => setReplyTo({ id: `${msg.at}-${idx}`, text: (msg.text || '').slice(0, 200) })}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {pendingAttachment && (
        <div className="px-4 py-2 flex items-center gap-2 border-t border-[var(--seam)] bg-[var(--lift)] text-[11px]">
          {pendingAttachment.type === 'image' && pendingAttachment.data && (
            <img
              src={`data:${pendingAttachment.mime || 'image/png'};base64,${pendingAttachment.data}`}
              alt=""
              className="h-9 w-9 rounded-lg object-cover"
            />
          )}
          <span className="text-[var(--tx3)] truncate flex-1">{pendingAttachment.name || 'Image'}</span>
          <button type="button" onClick={() => setPendingAttachment(null)} className="cipher-in-btn !w-8 !h-8">
            <Icons.X size={14} strokeWidth={1.55} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="cipher-input-area">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChosen} />
        <div className="cipher-input-shell">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cipher-in-btn"
            title="Attach"
            disabled={!keyReady}
          >
            <Icons.Paperclip size={16} strokeWidth={1.6} />
          </button>
          {teamE ? (
            <button
              type="button"
              className="cipher-team-quick-emoji"
              title={`Insert ${teamE} (team)`}
              aria-label={`Insert team emoji ${teamE} into message`}
              disabled={!keyReady}
              onClick={() => insertEmojiInComposer(teamE)}
            >
              <span aria-hidden>{teamE}</span>
            </button>
          ) : null}
          <div className="cipher-emoji-picker-wrap" ref={emojiPickerRef}>
            <button
              type="button"
              className={`cipher-in-btn ${showEmojiPicker ? 'bg-[var(--lift3)] text-[var(--tx1)]' : ''}`}
              title="Emoji"
              aria-label="Open emoji picker"
              aria-expanded={showEmojiPicker}
              disabled={!keyReady}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowEmojiPicker((v) => !v)}
            >
              <Icons.Smile size={16} strokeWidth={1.6} />
            </button>
            {showEmojiPicker && keyReady && (
              <div className="cipher-emoji-popover" role="listbox" aria-label="Emoji categories">
                {COMPOSER_EMOJI_GROUPS.map((group) => (
                  <div key={group.title} className="cipher-emoji-popover-section">
                    <div className="cipher-emoji-popover-label">{group.title}</div>
                    <div className="cipher-emoji-popover-grid">
                      {group.emojis.map((em) => (
                        <button
                          key={`${group.title}-${em}`}
                          type="button"
                          className="cipher-emoji-popover-cell"
                          role="option"
                          title={em}
                          aria-label={`Insert ${em}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            insertEmojiInComposer(em);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={keyReady ? 'Message…' : 'Loading encryption…'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                doSend();
              }
            }}
            onBlur={() => activeChatId && emitTyping(activeChatId, false)}
            disabled={!keyReady}
            className="cipher-textarea"
          />
          <button type="submit" disabled={!keyReady || (!input.trim() && !pendingAttachment)} className="cipher-send-btn" title="Send">
            <Icons.Send size={18} strokeWidth={2.3} className="text-white -translate-x-px" />
          </button>
        </div>
        <div className="cipher-security-bar">
          <span className="cipher-security-dot" />
          <span>
            AES-256-GCM · End-to-end encrypted · Forward secrecy enabled
          </span>
        </div>
      </form>
    </div>
  );
};

const CipherMessageRow: React.FC<{
  message: ChatMessage;
  isMe: boolean;
  showAvatar: boolean;
  myAvatar?: string;
  myInitial: string;
  theirAvatar?: string;
  theirTeamEmoji?: string | null;
  theirName: string;
  idx: number;
  onReply?: () => void;
}> = ({ message, isMe, showAvatar, myAvatar, myInitial, theirAvatar, theirTeamEmoji, theirName, idx, onReply }) => {
  const bubbleFirst = showAvatar;
  const jumboEmoji =
    !message.replyTo &&
    !(message.attachment?.data && message.attachment?.type === 'image') &&
    isJumboEmojiOnly(message.text);

  const bubble = (
    <div>
      {message.replyTo?.text && (
        <div className="cipher-reply-preview">
          <div className="cipher-reply-name">{isMe ? 'You' : theirName}</div>
          <div className="cipher-reply-snippet">{(message.replyTo.text || '').slice(0, 120)}</div>
        </div>
      )}
      {message.attachment?.data && message.attachment.type === 'image' ? (
        <div
          className={`overflow-hidden border border-[rgba(100,120,255,0.1)] rounded-2xl max-w-[220px] ${isMe ? 'cipher-bubble-s ' + (bubbleFirst ? 'first' : 'mid') : 'cipher-bubble-r ' + (bubbleFirst ? 'first' : 'mid')}`}
        >
          <img
            src={`data:${message.attachment.mime || 'image/png'};base64,${message.attachment.data}`}
            alt=""
            className="w-full h-auto object-cover max-h-[155px]"
          />
        </div>
      ) : jumboEmoji ? (
        <div className={`cipher-jumbo-emoji-wrap ${isMe ? 'cipher-jumbo-emoji-wrap--me' : ''}`}>
          <span className="cipher-emoji-jumbo-emote">
            <span className="cipher-emoji-jumbo-char" key={`emoji-${message.at}`}>
              {(message.text || '').trim()}
            </span>
          </span>
        </div>
      ) : (
        <div className={`${isMe ? 'cipher-bubble-s' : 'cipher-bubble-r'} ${bubbleFirst ? 'first' : 'mid'}`}>
          {message.text || (message.attachment ? 'Attachment' : '')}
        </div>
      )}
      <div className={`cipher-msg-footer ${isMe ? 'justify-end' : ''}`}>
        <span>{formatTime(message.at)}</span>
        {onReply && (
          <button type="button" onClick={onReply} className="text-[var(--i3)] opacity-70 hover:opacity-100 text-[9px] uppercase tracking-wide">
            Reply
          </button>
        )}
        {isMe && (
          <Icons.Check size={13} strokeWidth={2.2} className="text-[rgba(0,170,255,0.75)]" />
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`cipher-msg-row group ${isMe ? 's' : 'r'}${jumboEmoji ? ' jumbo' : ''}`}
      style={{ animationDelay: `${idx * 0.02}s` }}
    >
      <div className={`cipher-msg-ava ${showAvatar ? '' : 'hide'}`}>
        {isMe
          ? myAvatar
            ? <img src={`data:image/png;base64,${myAvatar}`} alt="" className="w-full h-full object-cover rounded-full" />
            : myInitial
          : theirAvatar
            ? <img src={`data:image/png;base64,${theirAvatar}`} alt="" className="w-full h-full object-cover rounded-full" />
            : theirTeamEmoji || theirName.charAt(0).toUpperCase()}
      </div>
      {bubble}
    </div>
  );
};
