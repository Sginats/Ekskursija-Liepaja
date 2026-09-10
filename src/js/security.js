'use strict';

const crypto = require('crypto');

function timingSafeEqualText(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Short-lived, opaque server-side sessions. The token is only ever sent in a
 * Secure/HttpOnly cookie; the map contains no password or user-provided data.
 */
function createSessionStore({ ttlMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const sessions = new Map();

  function purge() {
    const timestamp = now();
    for (const [token, expiresAt] of sessions) {
      if (expiresAt <= timestamp) sessions.delete(token);
    }
  }

  return {
    issue() {
      purge();
      const token = crypto.randomBytes(32).toString('base64url');
      sessions.set(token, now() + ttlMs);
      return token;
    },
    verify(token) {
      purge();
      if (!token || !sessions.has(token)) return false;
      return sessions.get(token) > now();
    },
    revoke(token) {
      if (token) sessions.delete(token);
    },
    size() {
      purge();
      return sessions.size;
    },
  };
}

function parseCookies(header = '') {
  return String(header)
    .split(';')
    .map((part) => part.trim().split('='))
    .filter((parts) => parts.length >= 2)
    .reduce((cookies, [key, ...value]) => {
      try {
        cookies[key] = decodeURIComponent(value.join('='));
      } catch {
        cookies[key] = '';
      }
      return cookies;
    }, {});
}

function createRateLimiter({ windowMs = 60_000, max = 120, now = () => Date.now() } = {}) {
  const buckets = new Map();
  return (key) => {
    const timestamp = now();
    const current = buckets.get(key);
    if (!current || timestamp - current.startedAt >= windowMs) {
      buckets.set(key, { startedAt: timestamp, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= max;
  };
}

function isAllowedOrigin(origin, allowedOrigins) {
  return !origin || allowedOrigins.includes(origin);
}

function isLobbyOwner(lobby, socketId, role) {
  if (!lobby || (role !== 'host' && role !== 'guest')) return false;
  return role === 'host' ? lobby.host === socketId : lobby.guest === socketId;
}

const BLOCKED_NAME_PARTS = [
  'fuck',
  'shit',
  'bitch',
  'nigger',
  'nigga',
  'slut',
  'kike',
  'cunt',
  'хуй',
  'пизд',
  'еба',
  'бляд',
  'жид',
];

function safePublicName(raw) {
  const value = String(raw || '')
    .normalize('NFKC')
    .trim()
    .slice(0, 20)
    .replace(/[<>"'`\\]/g, '')
    .split('')
    .filter((character) => character.codePointAt(0) >= 32)
    .join('');
  if (!value) return '';
  const normalized = value.toLocaleLowerCase('lv-LV');
  return BLOCKED_NAME_PARTS.some((word) => normalized.includes(word)) ? '' : value;
}

function normalizeAnswer(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('lv-LV')
    .replace(/[ā]/g, 'a')
    .replace(/[č]/g, 'c')
    .replace(/[ē]/g, 'e')
    .replace(/[ģ]/g, 'g')
    .replace(/[ī]/g, 'i')
    .replace(/[ķ]/g, 'k')
    .replace(/[ļ]/g, 'l')
    .replace(/[ņ]/g, 'n')
    .replace(/[š]/g, 's')
    .replace(/[ū]/g, 'u')
    .replace(/[ž]/g, 'z')
    .trim();
}

function answerMatches(answer, question) {
  const candidates = [question?.answer, ...(question?.aliases || [])].map(normalizeAnswer);
  return candidates.includes(normalizeAnswer(answer));
}

function scoreForAnswer({ correct, attempts = 1, maxPoints = 10 } = {}) {
  if (!correct) return 0;
  return attempts <= 1 ? maxPoints : Math.max(0, Math.floor(maxPoints / 2));
}

function hashAdminPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

function verifyAdminPassword(password, encoded) {
  if (!encoded || !encoded.startsWith('scrypt$')) return false;
  const [, salt, expected] = encoded.split('$');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return timingSafeEqualText(actual, expected);
}

module.exports = {
  answerMatches,
  createRateLimiter,
  createSessionStore,
  hashAdminPassword,
  isAllowedOrigin,
  isLobbyOwner,
  normalizeAnswer,
  parseCookies,
  safePublicName,
  scoreForAnswer,
  timingSafeEqualText,
  verifyAdminPassword,
};
