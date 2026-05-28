import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('panel_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('panel_token');
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('panel_token'); localStorage.removeItem('panel_user'); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    localStorage.setItem('panel_token', res.data.token);
    localStorage.setItem('panel_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('panel_token');
    localStorage.removeItem('panel_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
