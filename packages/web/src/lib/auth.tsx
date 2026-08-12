import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_URL } from './api';

interface AdminSummary {
  id: string;
  email: string;
}

interface AdminAuthState {
  admin: AdminSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AdminAuthState | null>(null);

const REFRESH_TOKEN_KEY = 'lojapix_refresh_token';

let accessTokenMemory: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Só existe UMA chamada de refresh em voo por vez, mesmo se várias requisições
// tomarem 401 ao mesmo tempo — todas esperam a mesma promise em vez de cada uma
// tentar trocar o refresh token (que é de uso único) por conta própria.
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          accessTokenMemory = null;
          return null;
        }
        const data = await response.json();
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        accessTokenMemory = data.accessToken;
        return data.accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

  let response = await doFetch(accessTokenMemory);

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    response = await doFetch(newToken);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          setAdmin(await adminRequest<AdminSummary>('/admin/auth/me'));
        } catch {
          setAdmin(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const response = await fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Falha no login');
    }
    const data = await response.json();
    accessTokenMemory = data.accessToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    setAdmin(data.admin);
  }

  async function logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await fetch(`${API_URL}/admin/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    accessTokenMemory = null;
    setAdmin(null);
  }

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
