import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Leaderboard.module.css';

function calculateComboScore(entry) {
  const maxTime = 3600;
  const timeComponent = Math.max(0, (maxTime - entry.timeInSeconds) / maxTime * 100);
  return (entry.score * 0.6) + (timeComponent * 0.4);
}

function sortData(data, mode) {
  if (mode === 'time')  return [...data].sort((a, b) => a.timeInSeconds - b.timeInSeconds);
  if (mode === 'score') return [...data].sort((a, b) => b.score - a.score);
  return [...data].sort((a, b) => calculateComboScore(b) - calculateComboScore(a));
}

function LeaderboardTable({ data, sortMode, onSortTime, onSortScore }) {
  const sorted = sortData(data, sortMode);
  const top10  = sorted.slice(0, 10);

  const sortLabel =
    sortMode === 'time'  ? 'Laiks (Ātrākais pirmais)' :
    sortMode === 'score' ? 'Punktu (Vairāk pirmais)'  :
    'Kombinētā vērtējuma (Punkti + Laiks)';

  return (
    <>
      <p className={styles.sortInfo}>Kārtots pēc: <span>{sortLabel}</span></p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Vārds</th>
            <th className={styles.sortable} onClick={onSortTime}>
              Laiks {sortMode === 'time' && '↓'}
            </th>
            <th className={styles.sortable} onClick={onSortScore}>
              Punkti {sortMode === 'score' && '↓'}
            </th>
          </tr>
        </thead>
        <tbody>
          {top10.length === 0 ? (
            <tr><td colSpan={4} className={styles.empty}>Nav rezultātu</td></tr>
          ) : top10.map((row, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <tr key={i} className={i < 3 ? styles[`rank${i + 1}`] : ''}>
                <td>{medal ? <span>{medal}</span> : i + 1}</td>
                <td>{row.name}</td>
                <td>{row.time}</td>
                <td>{row.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const canvasRef  = useRef(null);
  const animRef    = useRef(null);
  const particlesRef = useRef([]);

  const [activeTab,  setActiveTab]  = useState('single');
  const [singleData, setSingleData] = useState([]);
  const [teamsData,  setTeamsData]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [sortSingle, setSortSingle] = useState('combo');
  const [sortTeams,  setSortTeams]  = useState('combo');

  // Fetch leaderboard data
  useEffect(() => {
    fetch('../src/php/get_leaderboard.php')
      .then((r) => r.json())
      .then((d) => {
        setSingleData(d.single || []);
        setTeamsData(d.teams  || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Background particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx   = canvas.getContext('2d');
    const count = 120;
    particlesRef.current = Array.from({ length: count }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.8 + 0.4,
      dx:    (Math.random() - 0.5) * 0.35,
      dy:    (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,170,0,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      const oldW = canvas.width;
      const oldH = canvas.height;
      canvas.width  = window.innerWidth;
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
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  function toggleSort(setter, by) {
    setter(prev => prev === by ? 'combo' : by);
  }

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.bgCanvas} />

      <div className={styles.center}>
        <h1 className={styles.title}>🏆 TOP 10</h1>
        <h2 className={styles.subtitle}>REZULTĀTI</h2>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'single' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('single')}
          >
            👤 Viens spēlētājs
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'teams' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            👥 Komandas
          </button>
        </div>

        <div className={styles.tableWrapper}>
          {loading ? (
            <p className={styles.loading}>Ielādē...</p>
          ) : activeTab === 'single' ? (
            <LeaderboardTable
              data={singleData}
              sortMode={sortSingle}
              onSortTime={() => toggleSort(setSortSingle, 'time')}
              onSortScore={() => toggleSort(setSortSingle, 'score')}
            />
          ) : (
            <LeaderboardTable
              data={teamsData}
              sortMode={sortTeams}
              onSortTime={() => toggleSort(setSortTeams, 'time')}
              onSortScore={() => toggleSort(setSortTeams, 'score')}
            />
          )}
        </div>

        <button className={styles.btn} onClick={() => navigate('/')}>
          Atpakaļ uz izvēlni
        </button>
      </div>
    </div>
  );
}
