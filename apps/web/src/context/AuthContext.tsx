import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, setToken, getToken, getMe, updateMeProfile, type User } from '../api';
import { CryptoUtils } from '../cryptoUtils';
import * as idb from '../idb';
import { saveKeySession, loadKeySession, clearKeySession } from '../idbSession';

export interface ChatMessage {
  text: string;
  attachment?: { type: string; name?: string; data?: string; mime?: string };
  at: number;
  own: boolean;
  replyTo?: { id: string; text: string };
}

interface AuthState {
  token: string | null;
  username: string | null;
  myDisplayName: string | null;
  myStatus: string | null;
  users: User[];
  userAvatars: Record<string, string>;
  messageHistory: Record<string, ChatMessage[]>;
  remotePublicKeys: Record<string, CryptoKey>;
  keyPair: CryptoKeyPair | null;
  publicKeyBase64: string | null;
  myFingerprint: string | null;
  remoteFingerprints: Record<string, string>;
  sharedKeys: Record<string, CryptoKey>;
  socket: Socket | null;
  onlineUsers: Set<string>;
  typingFrom: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUsers: () => Promise<void>;
  getRelationship: (username: string) => 'friend' | 'pending_sent' | 'pending_received' | 'none';
  sendFriendRequest: (toUsername: string) => Promise<void>;
  acceptFriendRequest: (fromUsername: string) => Promise<void>;
  declineFriendRequest: (username: string) => Promise<void>;
  ensureRemoteKey: (username: string) => Promise<{ ok: boolean; error?: string }>;
  sendMessage: (toUsername: string, text: string, attachment?: ChatMessage['attachment'], replyTo?: { id: string; text: string }) => Promise<void>;
  appendMessage: (remoteUsername: string, payload: { text: string; attachment?: ChatMessage['attachment']; replyTo?: { id: string; text: string } }, at: number, own: boolean) => void;
  mergeHistoryFromIDB: (remoteUsername: string) => Promise<void>;
  clearConversation: (remoteUsername: string) => Promise<void>;
  emitTyping: (toUsername: string, typing: boolean) => void;
  updateMyProfile: (displayName?: string, status?: string) => Promise<void>;
  refreshMyAvatar: () => Promise<void>;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const receivedIds = new Set<string>();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const t = getToken();
    return {
      token: t,
      username: null,
      myDisplayName: null,
      myStatus: null,
      users: [],
      userAvatars: {},
      messageHistory: {},
      remotePublicKeys: {},
      keyPair: null,
      publicKeyBase64: null,
      myFingerprint: null,
      remoteFingerprints: {},
      sharedKeys: {},
      socket: null,
      onlineUsers: new Set<string>(),
      typingFrom: null,
      loading: !!t,
      error: null,
    };
  });

  const loadUsers = useCallback(async () => {
    if (!state.token) return;
    try {
      const res = await api<{ users: User[] }>('/api/users');
      const users = (res.users || []).filter((u) => u.username !== state.username);
      setState((s) => ({ ...s, users }));
      users.filter((u) => u.hasAvatar).forEach((u) => {
        api<{ avatar: string }>('/api/users/' + encodeURIComponent(u.username) + '/avatar')
          .then((r) => setState((s) => ({ ...s, userAvatars: { ...s.userAvatars, [u.username]: r.avatar } })))
          .catch(() => {});
      });
    } catch (_) {}
  }, [state.token, state.username]);

  const login = useCallback(async (username: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api<{ username: string; token: string }>('/api/login', { method: 'POST', body: { username: username.trim().toLowerCase(), password } });
      setToken(res.token);
      const pair = await CryptoUtils.generateKeyPair();
      const publicKeyBase64 = await CryptoUtils.exportPublicKeyBase64(pair.publicKey!);
      const myFingerprint = await CryptoUtils.getFingerprint(pair.publicKey!);

      // Upload public key with retries so server reliably has it for others to fetch
      const uploadKey = () => api('/api/me/publicKey', { method: 'POST', body: { publicKey: publicKeyBase64 } });
      for (let i = 0; i < 3; i++) {
        try {
          await uploadKey();
          break;
        } catch {
          if (i === 2) throw new Error('Could not register encryption key. Check connection and retry.');
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      await saveKeySession(res.username, pair);

      const socketOrigin = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const socket = io(socketOrigin, { path: '/socket.io', transports: ['websocket', 'polling'] });

      socket.on('connect', () => socket.emit('auth', { token: res.token, publicKey: publicKeyBase64 }));
      socket.on('auth_fail', () => setState((s) => ({ ...s, error: 'Authentication failed' })));

      const uname = res.username.trim().toLowerCase();
      setState((s) => ({
        ...s,
        token: res.token,
        username: uname,
        keyPair: pair,
        publicKeyBase64,
        myFingerprint,
        socket,
        loading: false,
        error: null,
        users: [],
        messageHistory: {},
        remotePublicKeys: {},
        sharedKeys: {},
        remoteFingerprints: {},
      }));
      getMe()
        .then(async (profile) => {
          setState((s) => ({ ...s, myDisplayName: profile.displayName, myStatus: profile.status }));
          if (profile.hasAvatar) {
            try {
              const av = await api<{ avatar: string }>('/api/users/' + encodeURIComponent(uname) + '/avatar');
              setState((s) => ({ ...s, userAvatars: { ...s.userAvatars, [uname]: av.avatar } }));
            } catch (_) {}
          }
        })
        .catch(() => {});
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      throw e;
    }
  }, []);

  const register = useCallback(async (username: string, password: string, confirmPassword: string) => {
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await api('/api/register', { method: 'POST', body: { username: username.trim().toLowerCase(), password } });
      setState((s) => ({ ...s, loading: false }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false }));
      throw e;
    }
  }, []);

  useEffect(() => {
    const authToken = getToken();
    if (!authToken) {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const profile = await getMe();
        if (cancelled) return;
        const u = profile.username.trim().toLowerCase();
        const pair = await loadKeySession(u);
        if (!pair) {
          setToken(null);
          await clearKeySession();
          if (!cancelled) {
            setState({
              token: null,
              username: null,
              myDisplayName: null,
              myStatus: null,
              users: [],
              userAvatars: {},
              messageHistory: {},
              remotePublicKeys: {},
              keyPair: null,
              publicKeyBase64: null,
              myFingerprint: null,
              remoteFingerprints: {},
              sharedKeys: {},
              socket: null,
              onlineUsers: new Set(),
              typingFrom: null,
              loading: false,
              error: null,
            });
          }
          return;
        }
        const publicKeyBase64 = await CryptoUtils.exportPublicKeyBase64(pair.publicKey);
        const myFingerprint = await CryptoUtils.getFingerprint(pair.publicKey);

        const uploadKey = () => api('/api/me/publicKey', { method: 'POST', body: { publicKey: publicKeyBase64 } });
        for (let i = 0; i < 3; i++) {
          try {
            await uploadKey();
            break;
          } catch {
            if (i === 2) throw new Error('Could not sync encryption key');
            await new Promise((r) => setTimeout(r, 600));
          }
        }
        if (cancelled) return;

        const socketOrigin = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const socket = io(socketOrigin, { path: '/socket.io', transports: ['websocket', 'polling'] });
        const tok = getToken();
        socket.on('connect', () => socket.emit('auth', { token: tok, publicKey: publicKeyBase64 }));
        socket.on('auth_fail', () => {
          setToken(null);
          void clearKeySession();
          socket.disconnect();
          if (!cancelled) {
            setState({
              token: null,
              username: null,
              myDisplayName: null,
              myStatus: null,
              users: [],
              userAvatars: {},
              messageHistory: {},
              remotePublicKeys: {},
              keyPair: null,
              publicKeyBase64: null,
              myFingerprint: null,
              remoteFingerprints: {},
              sharedKeys: {},
              socket: null,
              onlineUsers: new Set(),
              typingFrom: null,
              loading: false,
              error: 'Session expired. Please sign in again.',
            });
          }
        });

        const nextAvatars: Record<string, string> = {};
        if (profile.hasAvatar) {
          try {
            const av = await api<{ avatar: string }>('/api/users/' + encodeURIComponent(u) + '/avatar');
            nextAvatars[u] = av.avatar;
          } catch (_) {}
        }

        if (cancelled) {
          socket.disconnect();
          return;
        }

        setState((s) => ({
          ...s,
          token: tok,
          username: u,
          keyPair: pair,
          publicKeyBase64,
          myFingerprint,
          myDisplayName: profile.displayName,
          myStatus: profile.status,
          socket,
          userAvatars: { ...s.userAvatars, ...nextAvatars },
          loading: false,
          error: null,
          users: [],
          messageHistory: {},
          remotePublicKeys: {},
          sharedKeys: {},
          remoteFingerprints: {},
          onlineUsers: new Set(),
          typingFrom: null,
        }));
      } catch {
        setToken(null);
        await clearKeySession();
        if (!cancelled) {
          setState({
            token: null,
            username: null,
            myDisplayName: null,
            myStatus: null,
            users: [],
            userAvatars: {},
            messageHistory: {},
            remotePublicKeys: {},
            keyPair: null,
            publicKeyBase64: null,
            myFingerprint: null,
            remoteFingerprints: {},
            sharedKeys: {},
            socket: null,
            onlineUsers: new Set(),
            typingFrom: null,
            loading: false,
            error: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    if (state.socket) state.socket.disconnect();
    try {
      await api('/api/logout', { method: 'POST' });
    } catch (_) {
      /* offline or already invalid */
    }
    await clearKeySession();
    setToken(null);
    setState({
      token: null,
      username: null,
      myDisplayName: null,
      myStatus: null,
      users: [],
      userAvatars: {},
      messageHistory: {},
      remotePublicKeys: {},
      keyPair: null,
      publicKeyBase64: null,
      myFingerprint: null,
      remoteFingerprints: {},
      sharedKeys: {},
      socket: null,
      onlineUsers: new Set(),
      typingFrom: null,
      loading: false,
      error: null,
    });
  }, [state.socket]);

  const updateMyProfile = useCallback(async (displayName?: string, status?: string) => {
    const body: { displayName?: string; status?: string } = {};
    if (displayName !== undefined) body.displayName = displayName;
    if (status !== undefined) body.status = status;
    const updated = await updateMeProfile(body);
    setState((s) => ({ ...s, myDisplayName: updated.displayName, myStatus: updated.status }));
  }, []);

  const refreshMyAvatar = useCallback(async () => {
    if (!state.username) return;
    try {
      const res = await api<{ avatar: string }>('/api/users/' + encodeURIComponent(state.username) + '/avatar');
      setState((s) => ({ ...s, userAvatars: { ...s.userAvatars, [state.username!]: res.avatar } }));
    } catch (_) {}
  }, [state.username]);

  const getRelationship = useCallback((username: string): 'friend' | 'pending_sent' | 'pending_received' | 'none' => {
    const u = state.users.find((x) => x.username === username);
    return u?.relationship || 'none';
  }, [state.users]);

  const sendFriendRequest = useCallback(async (toUsername: string) => {
    await api('/api/friend-requests', { method: 'POST', body: { toUsername: toUsername.trim().toLowerCase() } });
    await loadUsers();
  }, [loadUsers]);

  const acceptFriendRequest = useCallback(async (fromUsername: string) => {
    await api('/api/friend-requests/accept', { method: 'POST', body: { fromUsername: fromUsername.trim().toLowerCase() } });
    await loadUsers();
  }, [loadUsers]);

  const declineFriendRequest = useCallback(async (username: string) => {
    await api('/api/friend-requests/' + encodeURIComponent(username.trim().toLowerCase()), { method: 'DELETE' });
    await loadUsers();
  }, [loadUsers]);

  const ensureRemoteKey = useCallback(async (username: string): Promise<{ ok: boolean; error?: string }> => {
    const u = (username || '').trim().toLowerCase();
    if (!u) return { ok: false, error: 'Invalid user' };
    if (state.remotePublicKeys[u]) return { ok: true };
    const base = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = (base.endsWith('/') ? base.slice(0, -1) : base) + '/api/users/' + encodeURIComponent(u) + '/publicKey';
    try {
      const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: string }).error || res.statusText;
        if (import.meta.env.DEV) console.warn('[ensureRemoteKey]', u, res.status, url, msg);
        return { ok: false, error: msg };
      }
      const data = (await res.json()) as { publicKey: string };
      if (!data?.publicKey) return { ok: false, error: 'Public key not set' };
      const remotePublicKey = await CryptoUtils.importPublicKeyBase64(data.publicKey);
      const fingerprint = await CryptoUtils.getFingerprint(remotePublicKey);
      const sharedKey = await CryptoUtils.deriveSharedAesKey(state.keyPair!.privateKey!, remotePublicKey);
      setState((s) => ({
        ...s,
        remotePublicKeys: { ...s.remotePublicKeys, [u]: remotePublicKey },
        remoteFingerprints: { ...s.remoteFingerprints, [u]: fingerprint },
        sharedKeys: { ...s.sharedKeys, [u]: sharedKey },
      }));
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      if (import.meta.env.DEV) console.warn('[ensureRemoteKey]', u, url, e);
      return { ok: false, error: msg };
    }
  }, [state.keyPair, state.remotePublicKeys]);

  const appendMessage = useCallback((remoteUsername: string, payload: { text: string; attachment?: ChatMessage['attachment']; replyTo?: { id: string; text: string } }, at: number, own: boolean) => {
    const msg = { ...payload, at, own };
    setState((s) => {
      const list = s.messageHistory[remoteUsername] || [];
      return { ...s, messageHistory: { ...s.messageHistory, [remoteUsername]: [...list, msg] } };
    });
    if (state.username) idb.addMessage(state.username, remoteUsername, msg).catch(() => {});
  }, [state.username]);

  const mergeHistoryFromIDB = useCallback(async (remoteUsername: string) => {
    if (!state.username) return;
    try {
      const loaded = await idb.getMessages(state.username, remoteUsername);
      setState((s) => {
        const current = s.messageHistory[remoteUsername] || [];
        const combined = [...current, ...loaded];
        const seen = new Set<string>();
        const key = (m: ChatMessage) => m.at + (m.own ? '1' : '0') + (m.text || '');
        const merged = combined.filter((m) => {
          const k = key(m);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).sort((a, b) => a.at - b.at);
        return { ...s, messageHistory: { ...s.messageHistory, [remoteUsername]: merged } };
      });
    } catch (_) {}
  }, [state.username]);

  const clearConversation = useCallback(async (remoteUsername: string) => {
    const u = (remoteUsername || '').trim().toLowerCase();
    if (!state.username || !u) return;
    setState((s) => ({
      ...s,
      messageHistory: { ...s.messageHistory, [u]: [] },
    }));
    await idb.clearConversation(state.username, u).catch(() => {});
  }, [state.username]);

  const emitTyping = useCallback((toUsername: string, typing: boolean) => {
    if (state.socket && toUsername) state.socket.emit('typing', { to: toUsername, typing });
  }, [state.socket]);

  const sendMessage = useCallback(async (toUsername: string, text: string, attachment?: ChatMessage['attachment'], replyTo?: { id: string; text: string }) => {
    const result = await ensureRemoteKey(toUsername);
    if (!result.ok || !state.socket || !state.keyPair || !state.publicKeyBase64) return;
    const u = (toUsername || '').trim().toLowerCase();
    const remotePublic = state.remotePublicKeys[u];
    if (!remotePublic) return;
    const payload: { text: string; attachment?: ChatMessage['attachment']; replyTo?: { id: string; text: string } } = { text: text || '', attachment };
    if (replyTo) payload.replyTo = replyTo;
    const plaintext = JSON.stringify(payload);
    const { ephemeralPublicKey, ciphertext, iv } = await CryptoUtils.encryptWithEphemeral(plaintext, remotePublic);
    const messageId = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
    state.socket.emit('message', {
      to: toUsername,
      ciphertext,
      iv,
      ephemeralPublicKey,
      messageId,
      senderPublicKey: state.publicKeyBase64,
    });
    appendMessage(toUsername, payload, Date.now(), true);
  }, [state.socket, state.keyPair, state.publicKeyBase64, state.remotePublicKeys, ensureRemoteKey, appendMessage]);

  useEffect(() => {
    if (!state.token || !state.username || !state.socket) return;
    state.socket.on('auth_ok', loadUsers);
    return () => { state.socket?.off('auth_ok', loadUsers); };
  }, [state.token, state.username, state.socket, loadUsers]);

  useEffect(() => {
    if (!state.socket) return;
    let typingHideTimeout: ReturnType<typeof setTimeout> | null = null;
    const onOnlineList = (list: string[]) => {
      setState((s) => ({ ...s, onlineUsers: new Set(Array.isArray(list) ? list : []) }));
    };
    const onTyping = ({ from, typing }: { from: string; typing: boolean }) => {
      if (typingHideTimeout) clearTimeout(typingHideTimeout);
      setState((s) => ({ ...s, typingFrom: typing ? from : null }));
      if (typing) typingHideTimeout = setTimeout(() => setState((s) => ({ ...s, typingFrom: null })), 3000);
    };
    state.socket.on('online_list', onOnlineList);
    state.socket.on('typing', onTyping);
    return () => {
      if (typingHideTimeout) clearTimeout(typingHideTimeout);
      state.socket?.off('online_list', onOnlineList);
      state.socket?.off('typing', onTyping);
    };
  }, [state.socket]);

  useEffect(() => {
    if (!state.socket || !state.keyPair) return;
    const onMessage = (payload: { from: string; to: string; ciphertext: string; iv: string; ephemeralPublicKey?: string; messageId?: string; at?: number }) => {
      const { from: fromUser, to, ciphertext, iv, ephemeralPublicKey, messageId, at } = payload;
      if (to !== state.username) return;
      const replayKey = fromUser + ':' + (messageId || (at || 0) + ciphertext);
      if (receivedIds.has(replayKey)) return;
      receivedIds.add(replayKey);
      const ts = at || Date.now();
      const parsed = (plaintext: string) => {
        try {
          const o = JSON.parse(plaintext);
          if (o && (typeof o.text === 'string' || o.attachment)) return o;
        } catch (_) {}
        return { text: plaintext };
      };
      if (ephemeralPublicKey) {
        CryptoUtils.decryptWithEphemeral(ciphertext, iv, ephemeralPublicKey, state.keyPair!.privateKey!)
          .then((text) => appendMessage(fromUser, parsed(text), ts, false))
          .catch(() => appendMessage(fromUser, { text: '[Decryption failed]' }, ts, false));
        return;
      }
      const key = state.sharedKeys[fromUser];
      if (!key) {
        api<{ publicKey: string }>('/api/users/' + encodeURIComponent(fromUser) + '/publicKey')
          .then(async (res) => {
            const remotePublicKey = await CryptoUtils.importPublicKeyBase64(res.publicKey);
            const fingerprint = await CryptoUtils.getFingerprint(remotePublicKey);
            const sharedKey = await CryptoUtils.deriveSharedAesKey(state.keyPair!.privateKey!, remotePublicKey);
            setState((s) => ({
              ...s,
              remotePublicKeys: { ...s.remotePublicKeys, [fromUser]: remotePublicKey },
              remoteFingerprints: { ...s.remoteFingerprints, [fromUser]: fingerprint },
              sharedKeys: { ...s.sharedKeys, [fromUser]: sharedKey },
            }));
            return CryptoUtils.decrypt(ciphertext, iv, sharedKey);
          })
          .then((text) => appendMessage(fromUser, parsed(text), ts, false))
          .catch(() => appendMessage(fromUser, { text: '[Could not decrypt]' }, ts, false));
        return;
      }
      CryptoUtils.decrypt(ciphertext, iv, key).then((text) => appendMessage(fromUser, parsed(text), ts, false)).catch(() => appendMessage(fromUser, { text: '[Decryption failed]' }, ts, false));
    };
    state.socket.on('message', onMessage);
    return () => { state.socket?.off('message', onMessage); };
  }, [state.socket, state.keyPair, state.username, state.sharedKeys, appendMessage, ensureRemoteKey]);

  const value: AuthContextValue = {
    ...state,
    loadUsers,
    login,
    register,
    logout,
    getRelationship,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    ensureRemoteKey,
    sendMessage,
    appendMessage,
    mergeHistoryFromIDB,
    clearConversation,
    emitTyping,
    updateMyProfile,
    refreshMyAvatar,
    setError: (err) => setState((s) => ({ ...s, error: err })),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
