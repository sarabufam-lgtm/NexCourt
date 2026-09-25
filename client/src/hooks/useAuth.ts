import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { getSocket, updateSocketAuthToken } from '../lib/socket';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  facilityId?: string | null;
  facilityName?: string;
}

export function useAuth() {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('nexcourt_admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleLogout = () => {
      setAdmin(null);
      const s = getSocket();
      if (s.connected) s.disconnect();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('nexcourt_access_token', data.accessToken);
      localStorage.setItem('nexcourt_admin', JSON.stringify(data.admin));
      setAdmin(data.admin);
      updateSocketAuthToken(data.accessToken);

      const s = getSocket();
      if (!s.connected) s.connect();

      return data.admin;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('nexcourt_access_token');
      localStorage.removeItem('nexcourt_admin');
      setAdmin(null);
      const s = getSocket();
      if (s.connected) s.disconnect();
    }
  }, []);

  return {
    admin,
    isAuthenticated: !!admin,
    loading,
    login,
    logout
  };
}
