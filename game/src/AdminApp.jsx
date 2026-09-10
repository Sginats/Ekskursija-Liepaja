import { useEffect, useState } from 'react';
import AdminPanel from './components/AdminPanel.jsx';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export default function AdminApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/admin/session`, { credentials: 'include' })
      .then(response => response.ok ? response.json() : { authenticated: false })
      .then(data => setAuthenticated(Boolean(data.authenticated)))
      .catch(() => setError('Serverim nevar pievienoties. Mēģini vēlreiz.'))
      .finally(() => setChecked(true));
  }, []);

  async function login(event) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${SERVER_URL}/api/admin/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error(response.status === 429 ? 'Pārāk daudz mēģinājumu.' : 'Nepareiza parole.');
      setPassword('');
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError.message || 'Pieteikšanās neizdevās.');
    } finally {
      setBusy(false);
    }
  }

  if (!checked) return <main className="admin-login" aria-live="polite">Ielādē administratora paneli…</main>;
  if (authenticated) return <AdminPanel />;

  return (
    <main className="admin-login">
      <form onSubmit={login} className="admin-login-card">
        <h1>Administratora panelis</h1>
        <p>Šī ir atsevišķa, aizsargāta ieeja spēles pārvaldībai.</p>
        <label htmlFor="admin-password">Parole</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          autoFocus
        />
        {error && <p role="alert" className="input-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Pārbauda…' : 'Pieteikties'}</button>
      </form>
    </main>
  );
}
