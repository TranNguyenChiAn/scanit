import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api';
import { normalizeServerUrl } from '../api/serverUrl';
import { ApiError } from '../api/http';
import { clearSession, loadSession, saveServerUrl, saveSession } from '../storage/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | signedOut | signedIn
  const [user, setUser] = useState(null);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Khoi dong: neu da co token thi vao thang, khong bat dang nhap lai
  useEffect(() => {
    let active = true;
    loadSession().then((session) => {
      if (!active) return;
      if (session) {
        setUser(session.user);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Token het han giua chung -> tu dong ve man hinh dang nhap
  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async ({ serverUrl, account, password }) => {
    const normalized = normalizeServerUrl(serverUrl);
    if (!normalized) {
      throw new ApiError('Địa chỉ máy chủ không hợp lệ. Ví dụ: 192.168.1.20:8080', { code: 'HTTP' });
    }
    await saveServerUrl(normalized);
    const session = await api.login(account, password);
    await saveSession(session);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return ctx;
}
