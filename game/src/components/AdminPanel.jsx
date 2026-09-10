/**
 * AdminPanel — Game Master Interface
 *
 * Tabs:
 *   1. Spēlētāji  – live player map + list with ping & anti-cheat flags
 *   2. Anti-Cheat – flagged players dashboard
 *   3. Žurnāls    – real-time log terminal
 *   4. Jautājumi  – hot-swap question editor
 *   5. Resursi    – CRUD for information source links
 *
 * Connects to the /admin Socket.io namespace.
 * Authentication: the separate admin entry obtains a short-lived HttpOnly
 * session from the Node server before this component mounts.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io }        from 'socket.io-client';
import { LOCATIONS } from '../data/LocationData.js';

const SERVER_URL    = import.meta.env.VITE_SOCKET_URL    || window.location.origin;

const TABS = ['Spēlētāji', 'Anti-Cheat', 'Žurnāls', 'Jautājumi', 'Resursi'];

// ── Local storage helpers for resource links ──────────────────────────────────
const RES_KEY = 'eksk_admin_resources_v1';
function loadResources() {
  try { return JSON.parse(localStorage.getItem(RES_KEY) || '[]'); } catch { return []; }
}
function saveResources(list) {
  try { localStorage.setItem(RES_KEY, JSON.stringify(list)); } catch {}
}

// ── Utility ───────────────────────────────────────────────────────────────────
function formatTs(ts) {
  return new Date(ts).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatTime(secs) {
  const s = Math.round(secs);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPanel({ onClose }) {
  const [tab,       setTab]       = useState(0);
  const [players,   setPlayers]   = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [overrides, setOverrides] = useState({});
  const [progress,  setProgress]  = useState({ pct: 0, completed: 0, total: 0 });
  const [resources, setResources] = useState(loadResources);
  const [connected, setConnected] = useState(false);
  const socketRef  = useRef(null);
  const logsEndRef = useRef(null);

  // ── Connect to admin namespace ─────────────────────────────────────────────
  useEffect(() => {
    const sock = io(`${SERVER_URL}/admin`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    sock.on('connect',    () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));

    sock.on('admin:players',       setPlayers);
    sock.on('log:history',         setLogs);
    sock.on('log:entry',           entry => setLogs(prev => [...prev.slice(-199), entry]));
    sock.on('questions:overrides', setOverrides);
    sock.on('city:progress',       setProgress);

    socketRef.current = sock;
    return () => { sock.disconnect(); socketRef.current = null; };
  }, []);

  // Auto-scroll log terminal
  useEffect(() => {
    if (tab === 2) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, tab]);

  // ── Admin actions ──────────────────────────────────────────────────────────
  const refreshPlayer = useCallback((socketId) => {
    socketRef.current?.emit('admin:refresh_player', { socketId });
  }, []);

  const clearFlag = useCallback((socketId) => {
    socketRef.current?.emit('admin:clear_flag', { socketId });
  }, []);

  const resetProgress = useCallback(() => {
    if (window.confirm('Atiestatīt globālo progresu?')) {
      socketRef.current?.emit('admin:reset_progress');
    }
  }, []);

  const triggerFlashQuiz = useCallback(() => {
    socketRef.current?.emit('admin:trigger_flash_quiz');
  }, []);

  const saveQuestion = useCallback((locationId, questionIdx, patch) => {
    socketRef.current?.emit('admin:update_question', { locationId, questionIdx, patch });
    setOverrides(prev => ({
      ...prev,
      [`${locationId}:${questionIdx}`]: { ...(prev[`${locationId}:${questionIdx}`] || {}), ...patch },
    }));
  }, []);

  const resetQuestion = useCallback((locationId, questionIdx) => {
    socketRef.current?.emit('admin:reset_question', { locationId, questionIdx });
    setOverrides(prev => {
      const next = { ...prev };
      delete next[`${locationId}:${questionIdx}`];
      return next;
    });
  }, []);

  // Resource CRUD
  const addResource    = useCallback((r) => { const n = [...resources, r]; setResources(n); saveResources(n); }, [resources]);
  const updateResource = useCallback((i, r) => { const n = resources.map((x, j) => j === i ? r : x); setResources(n); saveResources(n); }, [resources]);
  const deleteResource = useCallback((i) => { const n = resources.filter((_, j) => j !== i); setResources(n); saveResources(n); }, [resources]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-overlay">
      <div className="admin-panel">

        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <span className="admin-title">🎮 Game Master</span>
            <span className={`admin-status ${connected ? 'online' : 'offline'}`}>
              {connected ? '● Online' : '○ Offline'}
            </span>
          </div>
          <div className="admin-header-right">
            <span className="admin-progress-mini">
              🌆 {progress.pct}% ({progress.completed}/{progress.total})
            </span>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {TABS.map((t, i) => (
            <button
              key={t}
              className={`admin-tab ${tab === i ? 'active' : ''}`}
              onClick={() => setTab(i)}
            >
              {t}
              {i === 1 && players.filter(p => p.flagged).length > 0 && (
                <span className="admin-badge">{players.filter(p => p.flagged).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Players ── */}
        {tab === 0 && (
          <div className="admin-section">
            <div className="admin-section-toolbar">
              <span className="admin-section-title">
                👥 Spēlētāji ({players.length})
              </span>
              <button className="admin-btn-sm" onClick={triggerFlashQuiz}>⚡ Flash viktorīna</button>
              <button className="admin-btn-sm danger" onClick={resetProgress}>🔄 Reset progress</button>
            </div>

            {/* Live mini-map */}
            <div className="admin-mini-map">
              {LOCATIONS.map(loc => {
                const here = players.filter(p => p.currentLocation === loc.id);
                return (
                  <div
                    key={loc.id}
                    className={`admin-map-dot ${here.length > 0 ? 'occupied' : ''}`}
                    style={{ left: `${loc.mapPosition.x}%`, top: `${loc.mapPosition.y}%` }}
                    title={`${loc.name}${here.length ? ': ' + here.map(p => p.name).join(', ') : ''}`}
                  >
                    {here.length > 0 && <span className="admin-map-count">{here.length}</span>}
                  </div>
                );
              })}
            </div>

            {/* Player table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Vārds</th>
                    <th>Atrašanās vieta</th>
                    <th>Pabeigtas</th>
                    <th>Punkti</th>
                    <th>Ping</th>
                    <th>Darbības</th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 && (
                    <tr><td colSpan={6} className="admin-empty">Nav aktīvu spēlētāju</td></tr>
                  )}
                  {players.map(p => (
                    <tr key={p.socketId} className={p.flagged ? 'row-flagged' : ''}>
                      <td>
                        {p.flagged && <span className="ac-flag" title="Anti-cheat karodziņš">⚠ </span>}
                        {p.name}
                      </td>
                      <td>{p.currentLocation || '—'}</td>
                      <td>{p.locationsCompleted}/10</td>
                      <td>{p.score}</td>
                      <td className={p.latencyMs > 200 ? 'ping-high' : ''}>
                        {p.latencyMs !== null && p.latencyMs !== undefined ? `${p.latencyMs}ms` : '—'}
                      </td>
                      <td>
                        <button className="admin-btn-xs" onClick={() => refreshPlayer(p.socketId)} title="Pārlādēt sesiju">↺</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 1: Anti-Cheat ── */}
        {tab === 1 && (
          <div className="admin-section">
            <p className="admin-section-title">🛡 Anti-Cheat monitorings</p>
            <p className="admin-desc">Spēlētāji, kas pabeidza lokāciju ātrāk par {20} sekundēm.</p>
            {players.filter(p => p.flagged).length === 0 && (
              <p className="admin-empty">✓ Nav aizdomīgu ierakstu</p>
            )}
            {players.filter(p => p.flagged).map(p => (
              <div key={p.socketId} className="ac-card">
                <div className="ac-card-info">
                  <span className="ac-name">⚠ {p.name}</span>
                  <span className="ac-detail">Lokācija: {p.currentLocation || '?'} · Punkti: {p.score}</span>
                </div>
                <button className="admin-btn-sm" onClick={() => clearFlag(p.socketId)}>Notīrīt</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab 2: Live Log ── */}
        {tab === 2 && (
          <div className="admin-section">
            <p className="admin-section-title">📋 Reāllaika žurnāls</p>
            <div className="admin-log-terminal">
              {logs.map((entry, i) => (
                <div key={i} className={`log-entry log-${entry.level}`}>
                  <span className="log-ts">{formatTs(entry.ts)}</span>
                  <span className={`log-level log-level-${entry.level}`}>{entry.level.toUpperCase()}</span>
                  <span className="log-msg">{entry.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* ── Tab 3: Hot-swap Questions ── */}
        {tab === 3 && (
          <div className="admin-section">
            <p className="admin-section-title">✏️ Jautājumu redaktors (karstā nomaiņa)</p>
            <p className="admin-desc">Izmaiņas tūlīt tiek sinhronizētas visiem aktīvajiem spēlētājiem.</p>
            <div className="admin-question-list">
              {LOCATIONS.map(loc =>
                loc.questions.map((q, qi) => {
                  const key      = `${loc.id}:${qi}`;
                  const override = overrides[key] || {};
                  return (
                    <QuestionEditor
                      key={key}
                      locationName={loc.name}
                      original={q}
                      override={override}
                      onSave={(patch) => saveQuestion(loc.id, qi, patch)}
                      onReset={() => resetQuestion(loc.id, qi)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Tab 4: Resources ── */}
        {tab === 4 && (
          <div className="admin-section">
            <p className="admin-section-title">🔗 Informācijas avoti (CRUD)</p>
            <ResourceManager
              resources={resources}
              onAdd={addResource}
              onUpdate={updateResource}
              onDelete={deleteResource}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuestionEditor({ locationName, original, override, onSave, onReset }) {
  const [editText,   setEditText]   = useState(override.text   ?? original.text);
  const [editAnswer, setEditAnswer] = useState(override.answer ?? original.answer);
  const [editFact,   setEditFact]   = useState(override.fact   ?? original.fact);
  const isModified = override.text || override.answer || override.fact;

  function handleSave() {
    const patch = {};
    if (editText   !== original.text)   patch.text   = editText;
    if (editAnswer !== original.answer) patch.answer = editAnswer;
    if (editFact   !== original.fact)   patch.fact   = editFact;
    if (Object.keys(patch).length) onSave(patch);
  }

  return (
    <div className={`q-editor ${isModified ? 'q-modified' : ''}`}>
      <p className="q-loc-name">{locationName} {isModified && <span className="q-badge">✏ Mainīts</span>}</p>
      <label className="q-label">Jautājums</label>
      <textarea className="q-textarea" value={editText} onChange={e => setEditText(e.target.value)} rows={2} />
      <label className="q-label">Pareizā atbilde</label>
      <input  className="q-input"    value={editAnswer} onChange={e => setEditAnswer(e.target.value)} />
      <label className="q-label">Fakts</label>
      <textarea className="q-textarea" value={editFact}   onChange={e => setEditFact(e.target.value)} rows={2} />
      <div className="q-actions">
        <button className="admin-btn-sm" onClick={handleSave}>💾 Saglabāt</button>
        {isModified && <button className="admin-btn-sm danger" onClick={onReset}>↩ Atjaunot</button>}
      </div>
    </div>
  );
}

function ResourceManager({ resources, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ title: '', url: '', description: '' });
  const [editIdx, setEditIdx] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.url) return;
    if (editIdx !== null) { onUpdate(editIdx, form); setEditIdx(null); }
    else                  { onAdd(form); }
    setForm({ title: '', url: '', description: '' });
  }

  return (
    <div className="resource-manager">
      <form className="resource-form" onSubmit={handleSubmit}>
        <input  className="q-input"    placeholder="Nosaukums *" value={form.title}       onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        <input  className="q-input"    placeholder="URL *"       value={form.url}         onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
        <input  className="q-input"    placeholder="Apraksts"    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div className="q-actions">
          <button className="admin-btn-sm" type="submit">
            {editIdx !== null ? '💾 Atjaunināt' : '➕ Pievienot'}
          </button>
          {editIdx !== null && (
            <button className="admin-btn-sm" type="button" onClick={() => { setEditIdx(null); setForm({ title: '', url: '', description: '' }); }}>
              Atcelt
            </button>
          )}
        </div>
      </form>

      {resources.length === 0 && <p className="admin-empty">Nav pievienotu avotu</p>}
      {resources.map((r, i) => (
        <div key={i} className="resource-card">
          <div className="resource-info">
            <a href={r.url} target="_blank" rel="noreferrer" className="resource-title">{r.title}</a>
            {r.description && <p className="resource-desc">{r.description}</p>}
          </div>
          <div className="resource-actions">
            <button className="admin-btn-xs" onClick={() => { setForm(r); setEditIdx(i); }}>✏</button>
            <button className="admin-btn-xs danger" onClick={() => onDelete(i)}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}
