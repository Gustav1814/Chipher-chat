/**
 * API client for apps/server backend.
 * Uses VITE_API_URL in dev or relative URLs when proxied.
 */

const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_STORAGE_KEY = 'cipherchat_auth_token';

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

let token: string | null = readStoredToken();

export function getToken(): string | null {
  if (token != null) return token;
  token = readStoredToken();
  return token;
}

export function setToken(t: string | null) {
  token = t;
  if (typeof window === 'undefined') return;
  try {
    if (t) localStorage.setItem(TOKEN_STORAGE_KEY, t);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
}

export async function api<T = unknown>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : BASE + path;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  } as RequestInit);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export interface User {
  username: string;
  userId: string;
  displayName?: string;
  status?: string;
  hasPublicKey: boolean;
  hasAvatar: boolean;
  relationship?: 'friend' | 'pending_sent' | 'pending_received' | 'none';
  online?: boolean;
}

export interface MeProfile {
  username: string;
  displayName: string;
  status: string;
  hasAvatar: boolean;
}

export async function getMe(): Promise<MeProfile> {
  return api<MeProfile>('/api/me');
}

export async function updateMeProfile(body: { displayName?: string; status?: string }): Promise<MeProfile> {
  return api<MeProfile>('/api/me', { method: 'PATCH', body });
}

export interface UsersResponse {
  users: User[];
}

export interface FriendRequestsResponse {
  pendingSent: string[];
  pendingReceived: string[];
}
