import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const _client = SUPABASE_URL && SUPABASE_ANON
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

const LS_KEY = 'eksk_leaderboard_v1';
const BLOCKED_NAME_PARTS = ['fuck', 'shit', 'bitch', 'nigger', 'nigga', 'slut', 'kike', 'cunt', 'хуй', 'пизд', 'еба', 'бляд', 'жид'];

function validPublicName(value) {
  const name = String(value || '').trim().slice(0, 32);
  if (!name || /[<>`"'\\\u0000-\u001f]/.test(name)) return false;
  const normalized = name.toLocaleLowerCase();
  return !BLOCKED_NAME_PARTS.some(part => normalized.includes(part));
}

function _loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}

function _saveLocal(rows) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch {}
}

export async function saveScore({ name, score, timeSeconds, mode = 'single' }) {
  if (!validPublicName(name)) throw new Error('Name is not allowed on the public leaderboard');
  const entry = {
    name: String(name).slice(0, 32),
    score: Math.max(0, Math.min(220, Number(score))),
    time_seconds: Number(timeSeconds),
    mode,
    created_at: new Date().toISOString(),
  };

  if (_client) {
    const { error } = await _client.from('leaderboard').insert([entry]);
    if (!error) return true;
  }

  const rows = _loadLocal();
  rows.push(entry);
  _saveLocal(rows);
  return true;
}

export async function getTopTen(mode = 'single') {
  if (_client) {
    const { data, error } = await _client
      .from('leaderboard')
      .select('*')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .order('time_seconds', { ascending: true })
      .limit(10);
    if (!error && data) return data;
  }

  const rows = _loadLocal().filter(r => r.mode === mode);
  return rows
    .sort((a, b) => b.score - a.score || a.time_seconds - b.time_seconds)
    .slice(0, 10);
}
