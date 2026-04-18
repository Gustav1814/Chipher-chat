import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Icons } from '../types';
import { useAuth } from '../context/AuthContext';
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
    users, userAvatars, username, messageHistory, getRelationship, ensureRemoteKey, sendMessage,
    onlineUsers, typingFrom, emitTyping, mergeHistoryFromIDB,
  } = useAuth();
  const [input, setInput] = useState('');
  const [keyReady, setKeyReady] = useState(false);
  const [keyError, setKeyError] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; text: string } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ChatMessage['attachment'] | null>(null);
  const [searchInChat, setSearchInChat] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [keyErrorMessage, setKeyErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const friend = users.find((u) => u.username === activeChatId);
  const isFriend = friend && getRelationship(activeChatId!) === 'friend';
  let messages: ChatMessage[] = activeChatId ? (messageHistory[activeChatId] || []) : [];
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
    mergeHistoryFromIDB(activeChatId).then(() => { });

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
    return () => { cancelled = true; };
  }, [activeChatId, isFriend, ensureRemoteKey, mergeHistoryFromIDB]);

  // When key is missing and they're online, keep polling until we get it (they may have just opened the app)
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
  }, [messages.length]);

  const handleTyping = useCallback(() => {
    if (!activeChatId) return;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      emitTyping(activeChatId, true);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => emitTyping(activeChatId, false), 2000);
    }, 300);
  }, [activeChatId, emitTyping]);

  useEffect(() => () => {
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (activeChatId) emitTyping(activeChatId, false);
  }, [activeChatId, emitTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!activeChatId || !keyReady || (!text && !pendingAttachment)) return;
    emitTyping(activeChatId, false);
    sendMessage(activeChatId, text, pendingAttachment ?? undefined, replyTo ?? undefined);
    setInput('');
    setReplyTo(null);
    setPendingAttachment(null);
  };

  const handleExport = useCallback(() => {
    if (!activeChatId) return;
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
  }, [activeChatId, messageHistory]);

  if (!activeChatId) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-brand-bg text-brand-text-muted">
        <Icons.MessageSquare size={48} className="mb-4 opacity-50" />
        <p className="text-sm">Choose a conversation</p>
        <p className="text-xs mt-1">Messages are end-to-end encrypted. Only friends can chat.</p>
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-brand-bg text-brand-text-muted p-6">
        <Icons.Lock size={48} className="mb-4 opacity-50" />
        <p className="text-sm font-medium">{activeChatId}</p>
        <p className="text-xs mt-2 text-center">Add them as a friend in Contacts to start an encrypted chat.</p>
      </div>
    );
  }

  const avatar = userAvatars[activeChatId];
  const displayName = friend?.displayName || activeChatId;

  return (
    <div className="flex-1 h-full flex flex-col text-brand-text relative overflow-hidden chat-window-theme">
      <div className="p-6 flex items-center justify-between border-b border-brand-border z-10 glass-panel">
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={`data:image/png;base64,${avatar}`} alt="" className="w-10 h-10 rounded-full object-cover border border-brand-border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-accent border border-brand-border flex items-center justify-center font-semibold text-white text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              {displayName}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </h2>
            <p className="text-xs text-brand-text-muted flex items-center gap-1">
              <Icons.Lock size={10} /> E2E Encrypted
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowSearch((s) => !s)} className="p-2 text-brand-text-muted hover:text-brand-text rounded-lg" title="Search">🔍</button>
          {showSearch && (
            <input
              type="text"
              placeholder="Search in chat..."
              value={searchInChat}
              onChange={(e) => setSearchInChat(e.target.value)}
              className="w-32 px-2 py-1 text-sm bg-brand-input border border-brand-border rounded-lg text-brand-text placeholder:text-brand-text-muted"
            />
          )}
          <button type="button" onClick={handleExport} className="p-2 text-brand-text-muted hover:text-brand-text rounded-lg text-xs" title="Export chat">Export</button>
          {onTogglePanel && (
            <button type="button" onClick={onTogglePanel} className="p-2 text-brand-text-muted hover:text-brand-text rounded-lg">
              <Icons.ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      {typingFrom === activeChatId && (
        <div className="px-6 py-1 text-xs text-brand-text-muted italic z-10">{activeChatId} is typing…</div>
      )}

      {replyTo && (
        <div className="px-6 py-2 flex items-center gap-2 border-b border-brand-border glass z-10 text-sm">
          <span className="text-brand-text-muted truncate flex-1">Replying to: {(replyTo.text || '').slice(0, 50)}{replyTo.text.length > 50 ? '…' : ''}</span>
          <button type="button" onClick={() => setReplyTo(null)} className="text-brand-text-muted hover:text-brand-text p-1">✕</button>
        </div>
      )}

      {keyError && (
        <div className="mx-4 mt-2 p-3 rounded-xl glass border-brand-border text-brand-text-muted text-sm flex items-center justify-between gap-3">
          <span>Encryption key for {displayName} is not available yet. {keyErrorMessage ? <strong>{keyErrorMessage}.</strong> : null} {keyErrorMessage === 'Public key not set' ? 'Have them open this app in another tab, log in as themselves, and stay on the app. ' : keyErrorMessage && (keyErrorMessage.includes('fetch') || keyErrorMessage.includes('Network')) ? 'Is the backend running on port 3000? ' : ''}Ask them to open the app and stay logged in.{isOnline ? ' Retrying automatically…' : ' Then click Retry.'}</span>
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
            className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-accent/20 text-brand-accent hover:bg-brand-accent/30 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 z-10 bg-transparent">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={`${msg.at}-${idx}`}
            message={msg}
            isMe={msg.own}
            myAvatar={userAvatars[username || '']}
            theirAvatar={avatar}
            theirName={displayName}
            onReply={() => setReplyTo({ id: `${msg.at}-${idx}`, text: (msg.text || '').slice(0, 200) })}
          />
        ))}
        <div ref={messagesEndRef} />
        <div className="flex items-center justify-center gap-2 py-3 mt-2">
          <span className="flex gap-1"><span className="secure-dot"></span><span className="secure-dot"></span><span className="secure-dot"></span></span>
          <span className="text-[10px] text-brand-text-muted tracking-wide">Secure connection active...</span>
        </div>
      </div>

      {pendingAttachment && (
        <div className="px-6 py-2 flex items-center gap-2 border-b border-brand-border glass z-10 text-sm">
          {pendingAttachment.type === 'image' && pendingAttachment.data && (
            <img src={`data:${pendingAttachment.mime || 'image/png'};base64,${pendingAttachment.data}`} alt="" className="h-10 w-10 rounded object-cover" />
          )}
          <span className="text-brand-text-muted truncate flex-1">{pendingAttachment.name || 'Image'}</span>
          <button type="button" onClick={() => setPendingAttachment(null)} className="text-brand-text-muted hover:text-brand-text p-1">✕</button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-6 z-10 border-t border-brand-border glass-panel">
        <div className="glass rounded-2xl p-2 flex items-center gap-2 min-h-[52px]">
          <input
            type="text"
            placeholder={keyReady ? 'Write an encrypted message...' : 'Loading encryption...'}
            value={input}
            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
            onBlur={() => activeChatId && emitTyping(activeChatId, false)}
            onPaste={(e) => {
              const dt = e.clipboardData;
              if (!dt?.items?.length) return;
              for (let i = 0; i < dt.items.length; i++) {
                if (dt.items[i].type.indexOf('image') !== -1) {
                  const file = dt.items[i].getAsFile();
                  if (file) {
                    e.preventDefault();
                    const reader = new FileReader();
                    reader.onload = () => {
                      const data = reader.result as string;
                      const base64 = data.replace(/^data:[^;]+;base64,/, '');
                      if (base64.length > 450000) return;
                      setPendingAttachment({ type: 'image', name: file.name || 'pasted.png', data: base64, mime: file.type || 'image/png' });
                    };
                    reader.readAsDataURL(file);
                  }
                  break;
                }
              }
            }}
            disabled={!keyReady}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-2 px-3 text-brand-text placeholder:text-brand-text-muted disabled:opacity-60"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!keyReady || (!input.trim() && !pendingAttachment)}
            className="btn-send-gradient shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:pointer-events-none"
          >
            <Icons.Send size={18} />
          </motion.button>
        </div>
      </form>
    </div>
  );
};

const MessageBubble: React.FC<{
  message: ChatMessage;
  isMe: boolean;
  myAvatar?: string;
  theirAvatar?: string;
  theirName: string;
  onReply?: () => void;
}> = ({ message, isMe, myAvatar, theirAvatar, theirName, onReply }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
  >
    <div className="shrink-0 mt-auto">
      {isMe ? (
        myAvatar ? (
          <img src={`data:image/png;base64,${myAvatar}`} alt="" className="w-7 h-7 rounded-full border border-brand-border object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-accent/80 flex items-center justify-center text-white text-[10px] font-semibold">You</div>
        )
      ) : (
        theirAvatar ? (
          <img src={`data:image/png;base64,${theirAvatar}`} alt="" className="w-7 h-7 rounded-full border border-brand-border object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-accent/60 flex items-center justify-center text-white text-[10px] font-semibold">
            {theirName.charAt(0).toUpperCase()}
          </div>
        )
      )}
    </div>
    <div className={`max-w-[65%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
      {message.attachment?.data && (
        <div className="mb-1">
          {message.attachment.type === 'image' ? (
            <img
              src={`data:${message.attachment.mime || 'image/png'};base64,${message.attachment.data}`}
              alt={message.attachment.name || 'Image'}
              className="max-h-48 rounded-2xl object-contain border border-brand-border"
            />
          ) : (
            <a
              href={`data:application/octet-stream;base64,${message.attachment.data}`}
              download={message.attachment.name || 'file'}
              className="text-xs text-brand-accent hover:underline inline-flex items-center gap-1"
            >
              <Icons.FileText size={12} /> {message.attachment.name || 'File'}
            </a>
          )}
        </div>
      )}
      <div className={`px-4 py-2.5 text-[13px] leading-relaxed ${isMe ? 'message-bubble-own' : 'message-bubble-other'}`}>
        {message.replyTo?.text && (
          <div className="text-[11px] opacity-80 border-l-2 border-white/40 pl-2 mb-1.5 truncate max-w-full">
            {(message.replyTo.text || '').slice(0, 80)}{message.replyTo.text.length > 80 ? '…' : ''}
          </div>
        )}
        {message.text || (message.attachment ? 'Attachment' : '')}
      </div>
      <div className="flex items-center gap-2 mt-0.5 px-1">
        <span className="text-[10px] text-brand-text-muted/70 font-mono">{formatTime(message.at)}</span>
        {onReply && (
          <button type="button" onClick={onReply} className="text-[10px] text-brand-accent/60 hover:text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity">
            Reply
          </button>
        )}
        {isMe && (
          <div className="flex gap-0.5">
            <Icons.ChevronRight size={9} className="text-green-400/70" />
            <Icons.ChevronRight size={9} className="text-green-400/70 -ml-1.5" />
          </div>
        )}
      </div>
    </div>
  </motion.div>
);
