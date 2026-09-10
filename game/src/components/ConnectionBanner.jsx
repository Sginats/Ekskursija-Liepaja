import { useEffect, useState } from 'react';
import SocketManager from '../utils/SocketManager.js';

export default function ConnectionBanner() {
  const [state, setState] = useState(navigator.onLine ? 'online' : 'offline');

  useEffect(() => {
    const online = () => setState(SocketManager.connected ? 'online' : 'reconnecting');
    const offline = () => setState('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    const timer = setInterval(() => setState(navigator.onLine ? (SocketManager.connected ? 'online' : 'reconnecting') : 'offline'), 5000);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      clearInterval(timer);
    };
  }, []);

  if (state === 'online') return null;
  return (
    <div className="connection-banner" role="status" aria-live="polite">
      {state === 'offline'
        ? 'Bezsaistes režīms — progress tiks sinhronizēts, kad savienojums atjaunosies.'
        : 'Savienojums tiek atjaunots…'}
      <button type="button" onClick={() => window.location.reload()}>Mēģināt vēlreiz</button>
    </div>
  );
}
