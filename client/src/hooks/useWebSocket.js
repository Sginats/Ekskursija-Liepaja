import { useRef, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext.jsx';

const WS_TIMEOUT = 2000;
const MAX_RECONNECT = 5;
const BASE_DELAY = 1000;

export function useWebSocket() {
  const { dispatch, notify } = useGame();
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const modeRef = useRef('php');

  const updateStatus = useCallback(
    (status) => dispatch({ type: 'SET_CONNECTION', status }),
    [dispatch]
  );

  const handleMessage = useCallback(
    (data) => {
      switch (data.type) {
        case 'created':
          dispatch({ type: 'SET_MODE', mode: 'multi', role: 'host', lobbyCode: data.code });
          break;
        case 'guest_joined':
          dispatch({ type: 'SET_MODE', mode: 'multi', role: 'host' });
          break;
        case 'joined_lobby':
          dispatch({ type: 'SET_MODE', mode: 'multi', role: 'guest', lobbyCode: data.code });
          break;
        case 'start_game':
          dispatch({ type: 'SET_MODE', mode: 'multi', role: data.role });
          break;
        case 'sync_complete':
          // handled by caller
          break;
        case 'player_disconnected':
          notify(data.msg, 'warning');
          break;
        case 'error':
          notify(data.msg, 'error');
          break;
        default:
          break;
      }
    },
    [dispatch, notify]
  );

  const send = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const baseHost = import.meta.env.VITE_WS_HOST || window.location.host;
    const url = `${protocol}://${baseHost}`;
    try {
      wsRef.current = new WebSocket(url);
      wsRef.current.onopen = () => {
        reconnectAttempts.current = 0;
        updateStatus('connected');
        modeRef.current = 'websocket';
        dispatch({ type: 'SET_CONNECTION', mode: 'websocket', status: 'connected' });
      };
      wsRef.current.onmessage = (evt) => {
        try { handleMessage(JSON.parse(evt.data)); } catch (_) {}
      };
      wsRef.current.onerror = () => updateStatus('error');
      wsRef.current.onclose = () => {
        updateStatus('disconnected');
        if (reconnectAttempts.current < MAX_RECONNECT) {
          const delay = BASE_DELAY * 2 ** reconnectAttempts.current;
          reconnectAttempts.current++;
          updateStatus('reconnecting');
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };
    } catch (_) {
      updateStatus('error');
    }
  }, [dispatch, handleMessage, updateStatus]);

  const tryConnect = useCallback(
    () =>
      new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (wsRef.current) wsRef.current.close();
          resolve(false);
        }, WS_TIMEOUT);
        try {
          const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
          const baseHost = import.meta.env.VITE_WS_HOST || window.location.host;
          wsRef.current = new WebSocket(`${protocol}://${baseHost}`);
          wsRef.current.onopen = () => {
            clearTimeout(timeout);
            reconnectAttempts.current = 0;
            wsRef.current.onmessage = (evt) => {
              try { handleMessage(JSON.parse(evt.data)); } catch (_) {}
            };
            wsRef.current.onclose = () => {
              updateStatus('disconnected');
              if (reconnectAttempts.current < MAX_RECONNECT) {
                const delay = BASE_DELAY * 2 ** reconnectAttempts.current;
                reconnectAttempts.current++;
                updateStatus('reconnecting');
                reconnectTimer.current = setTimeout(connect, delay);
              }
            };
            updateStatus('connected');
            dispatch({ type: 'SET_CONNECTION', mode: 'websocket', status: 'connected' });
            resolve(true);
          };
          wsRef.current.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };
        } catch (_) {
          clearTimeout(timeout);
          resolve(false);
        }
      }),
    [connect, dispatch, handleMessage, updateStatus]
  );

  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  return { wsRef, send, connect, tryConnect, modeRef };
}
