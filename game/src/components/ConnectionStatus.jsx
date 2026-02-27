import { useState, useEffect } from 'react';
import SocketManager from '../utils/SocketManager.js';

export default function ConnectionStatus() {
  const [status, setStatus] = useState(SocketManager.connected ? 'connected' : 'disconnected');
  const [reconnectCount, setReconnectCount] = useState(0);

  useEffect(() => {
    const sock = SocketManager.connect();
    
    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onReconnectAttempt = (count) => setReconnectCount(count);

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('reconnect_attempt', onReconnectAttempt);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('reconnect_attempt', onReconnectAttempt);
    };
  }, []);

  if (status === 'connected') return null;

  return (
    <div className="connection-error-overlay">
      <div className="connection-error-card">
        <h3>Savienojuma kļūda</h3>
        <p>Radās problēma ar savienojumu ar serveri.</p>
        <p className="reconnect-text">Mēģina pieslēgties ({reconnectCount}/10)...</p>
        <button onClick={() => window.location.reload()} className="btn-retry">
          Pārlādēt lapu
        </button>
      </div>
    </div>
  );
}
