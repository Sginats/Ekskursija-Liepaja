import React, { createContext, useContext, useState, useCallback } from 'react';

// Admin password for the testing panel.
// Change this string to update the password.
const ADMIN_PASSWORD = 'NoHomo2026';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    try { return sessionStorage.getItem('_adm') === '1'; } catch { return false; }
  });
  const [error, setError] = useState('');

  const login = useCallback((password) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setError('');
      try { sessionStorage.setItem('_adm', '1'); } catch {}
      return true;
    }
    setError('Nepareiza parole');
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
    try { sessionStorage.removeItem('_adm'); } catch {}
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout, error, setError }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
