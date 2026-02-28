import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../context/GameContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import SettingsModal from '../modals/SettingsModal.jsx';
import AboutModal from '../modals/AboutModal.jsx';
import DifficultyModal from '../modals/DifficultyModal.jsx';
import AdminLoginModal from './AdminLoginModal.jsx';
import { NotificationContainer } from '../common/Notification.jsx';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const { isAdmin, logout } = useAdmin();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const { startFreshGame, notify, dispatch } = useGame();
  const { playHover } = useAudio();
  const navigate = useNavigate();
  const { tryConnect, send, wsRef, modeRef } = useWebSocket();

  const [name, setName] = useState('');
  const [showModePanel, setShowModePanel] = useState(false);
  const [showJoinPanel, setShowJoinPanel] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [lobbyCode, setLobbyCode] = useState(null);
  const [lobbyStatus, setLobbyStatus] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const pendingGameRef = useRef(null); // { name, mode, role, lobbyCode } set before difficulty modal

  // Particle canvas
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const cleanupRef = useRef(null);

  useEffect(() => {
    tryConnect().then((ok) => {
      if (ok) {
        dispatch({ type: 'SET_CONNECTION', mode: 'websocket', status: 'connected' });
      }
    });

    cleanupRef.current = initParticles();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  // WebSocket message routing for menu
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'created') {
          setLobbyCode(data.code);
          setLobbyStatus('Gaidu otru spēlētāju...');
        } else if (data.type === 'guest_joined') {
          setLobbyStatus('Spēlētājs pievienojās! Sagatavojies...');
        } else if (data.type === 'player_ready') {
          setLobbyStatus('Otrs speletajs ir gatavy!');
        } else if (data.type === 'start_game') {
          const role = data.role;
          startFreshGame(name, 'multi', role, lobbyCode, 'normal').then(() => navigate('/play'));
        } else if (data.type === 'error') {
          notify(data.msg, 'error');
        }
      } catch (_) {}
    };
  }, [wsRef.current, lobbyCode, name]);

  function validate() {
    const n = name.trim().substring(0, 8);
    if (!n) { notify('Ievadi savu vārdu!', 'warning'); return null; }
    return n;
  }

  async function playSingle() {
    const n = validate();
    if (!n) return;
    pendingGameRef.current = { name: n, mode: 'single', role: null, lobbyCode: null };
    setShowDifficulty(true);
  }

  async function handleDifficultySelect(difficulty) {
    setShowDifficulty(false);
    if (!pendingGameRef.current) return;
    const { name: n, mode, role, lobbyCode } = pendingGameRef.current;
    pendingGameRef.current = null;
    await startFreshGame(n, mode, role, lobbyCode, difficulty);
    navigate('/play');
  }

  function handleDifficultyCancel() {
    setShowDifficulty(false);
    pendingGameRef.current = null;
  }

  function createLobby() {
    const n = validate();
    if (!n) return;
    if (modeRef.current === 'websocket' && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ action: 'create' }));
      setLobbyStatus('Vēru istabu...');
    } else {
      // PHP fallback
      fetch(`../src/php/lobby.php?action=create&code=${Math.floor(1000 + Math.random() * 9000)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.status === 'success') {
            setLobbyCode(d.code);
            setLobbyStatus('Gaidu otru spēlētāju...');
          }
        });
    }
  }

  function joinLobby() {
    const n = validate();
    if (!n) return;
    if (!joinCode || joinCode.length !== 4) {
      notify('Ievadi 4-ciparu kodu!', 'error');
      return;
    }
    if (modeRef.current === 'websocket' && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ action: 'join', code: joinCode }));
    } else {
      fetch(`../src/php/lobby.php?action=join&code=${joinCode}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.status === 'success') {
            startFreshGame(n, 'multi', 'guest', joinCode, 'normal').then(() => navigate('/play'));
          } else {
            notify('Istaba nav atrasta vai jau pilna.', 'error');
          }
        });
    }
  }

  function sendLobbyReady() {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ action: 'ready', code: lobbyCode, role: 'host' }));
      setLobbyStatus('Gaidu, kamēr otrs spēlētājs sagatavojas...');
    }
  }

  // ---- Background particle animation ----
  function initParticles() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const count = 120;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // City skyline silhouette
      const skyY = h * 0.72;
      ctx.fillStyle = 'rgba(255,170,0,0.05)';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w * 0.05, skyY + 60); ctx.lineTo(w * 0.065, skyY + 20);
      ctx.arc(w * 0.075, skyY + 20, w * 0.01, Math.PI, 0, false);
      ctx.lineTo(w * 0.10, skyY + 60);
      ctx.lineTo(w * 0.15, skyY + 60); ctx.lineTo(w * 0.15, skyY + 30);
      ctx.lineTo(w * 0.22, skyY + 30); ctx.lineTo(w * 0.22, skyY + 60);
      ctx.lineTo(w * 0.28, skyY + 60); ctx.lineTo(w * 0.28, skyY + 10);
      ctx.lineTo(w * 0.285, skyY); ctx.lineTo(w * 0.29, skyY + 10);
      ctx.lineTo(w * 0.29, skyY + 60);
      ctx.lineTo(w * 0.35, skyY + 60); ctx.lineTo(w * 0.35, skyY + 5);
      ctx.lineTo(w * 0.355, skyY + 2); ctx.lineTo(w * 0.36, skyY + 5);
      ctx.lineTo(w * 0.36, skyY + 60);
      ctx.lineTo(w * 0.42, skyY + 60); ctx.lineTo(w * 0.42, skyY + 25);
      ctx.lineTo(w * 0.50, skyY + 10); ctx.lineTo(w * 0.50, skyY + 25);
      ctx.lineTo(w * 0.44, skyY + 25); ctx.lineTo(w * 0.44, skyY + 60);
      ctx.lineTo(w * 0.55, skyY + 60); ctx.lineTo(w * 0.55, skyY + 45);
      ctx.lineTo(w * 0.65, skyY + 45); ctx.lineTo(w * 0.65, skyY + 60);
      ctx.lineTo(w * 0.70, skyY + 60); ctx.lineTo(w * 0.70, skyY + 20);
      ctx.lineTo(w * 0.78, skyY + 20); ctx.lineTo(w * 0.78, skyY + 60);
      ctx.lineTo(w * 0.88, skyY + 60); ctx.lineTo(w * 0.88, skyY + 35);
      ctx.lineTo(w * 0.90, skyY + 15); ctx.lineTo(w * 0.92, skyY + 35);
      ctx.lineTo(w * 0.92, skyY + 60); ctx.lineTo(w, skyY + 60);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();

      // Animated sea waves
      const waveT = Date.now() / 2000;
      const waveY = h * 0.88;
      ctx.lineWidth = 1.5;
      for (let wave = 0; wave < 3; wave++) {
        ctx.strokeStyle = `rgba(255,170,0,${0.07 - wave * 0.015})`;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y = waveY + wave * 12 + Math.sin(x / 80 + waveT + wave * 1.2) * 6;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      particlesRef.current.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,170,0,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      const oldW = canvas.width;
      const oldH = canvas.height;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (oldW > 0 && oldH > 0) {
        const sx = canvas.width / oldW;
        const sy = canvas.height / oldH;
        particlesRef.current.forEach((p) => {
          p.x *= sx;
          p.y *= sy;
        });
      }
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.bgCanvas} />

      <div className={styles.center}>
        <h1 className={styles.title}>LIEPAJAS KARTE</h1>
        <h2 className={styles.subtitle}>EKSKURSIJA</h2>

        {!showModePanel && !lobbyCode ? (
          <div className={styles.menu}>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Tavs vārds</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Ievadi savu vārdu..."
                maxLength={8}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') playSingle(); }}
              />
            </div>
            <button className={styles.btn} onMouseEnter={playHover} onClick={playSingle}>Spēlēt vienam</button>
            <button className={styles.btn} onMouseEnter={playHover} onClick={() => setShowModePanel(true)}>Spēlēt ar draugu</button>
            <button className={styles.btn} onMouseEnter={playHover} onClick={() => navigate('/leaderboard')}>Top 10</button>
            <button className={styles.btn} onMouseEnter={playHover} onClick={() => setShowSettings(true)}>Iestatījumi</button>
            <button className={styles.btn} onMouseEnter={playHover} onClick={() => setShowAbout(true)}>Par spēli</button>
            <button className={styles.btn} onMouseEnter={playHover} onClick={() => window.location.href = 'https://www.google.com'}>Iziet</button>
          </div>
        ) : lobbyCode ? (
          <div className={styles.lobby}>
            <p className={styles.lobbyLabel}>Tavas istabas kods:</p>
            <div className={styles.codeBox}>{lobbyCode}</div>
            <p className={styles.lobbyStatus}>{lobbyStatus}</p>
            {lobbyStatus.includes('pievienojās') && (
              <button className={styles.btn} onMouseEnter={playHover} onClick={sendLobbyReady}>Esmu gatavs!</button>
            )}
            <button className={styles.btnSecondary} onMouseEnter={playHover} onClick={() => { setLobbyCode(null); setShowModePanel(false); }}>
              Atcelt
            </button>
          </div>
        ) : (
          <div className={styles.modePanel}>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Tavs vārds</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Ievadi savu vārdu..."
                maxLength={8}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button className={styles.btn} onMouseEnter={playHover} onClick={createLobby}>Izveidot istabu</button>
            <div className={styles.divider} />
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Drauga kods</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Ievadi 4-ciparu kodu"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') joinLobby(); }}
              />
            </div>
            <button className={styles.btn} onMouseEnter={playHover} onClick={joinLobby}>Pievienoties</button>
            <button className={styles.btnSecondary} onMouseEnter={playHover} onClick={() => setShowModePanel(false)}>Atcelt</button>
          </div>
        )}
      </div>

      <div className={styles.authors}>Autori: Niks Senvalds, Dans Bitenieks</div>

      {/* Subtle admin button bottom-right */}
      <button
        className={styles.adminBtn}
        title={isAdmin ? 'Admin: izrakstīties' : 'Administratora pieslēgšanās'}
        onClick={() => isAdmin ? logout() : setShowAdminLogin(true)}
      >
        {isAdmin ? 'Admin' : 'Pieteikties'}
      </button>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <DifficultyModal open={showDifficulty} onSelect={handleDifficultySelect} onCancel={handleDifficultyCancel} />
      <AdminLoginModal open={showAdminLogin} onClose={() => setShowAdminLogin(false)} />
      <NotificationContainer />
    </div>
  );
}
