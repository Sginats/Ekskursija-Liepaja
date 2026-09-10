import React, { createContext, useContext, useState, useCallback } from 'react';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    try { return sessionStorage.getItem('_adm') === '1'; } catch { return false; }
  });
  const [error, setError] = useState('');

  const login = useCallback((password) => {
    // Client-side passwords are never a security boundary. Use the protected
    // PHP admin session instead of shipping a credential in the bundle.
    void password;
    setError('Administratora panelis jāatver caur servera admin.php.');
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
