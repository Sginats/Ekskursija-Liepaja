const test = require('node:test');
const assert = require('node:assert/strict');
const {
  answerMatches,
  createRateLimiter,
  createSessionStore,
  hashAdminPassword,
  isAllowedOrigin,
  isLobbyOwner,
  parseCookies,
  safePublicName,
  scoreForAnswer,
  verifyAdminPassword,
} = require('../src/js/security');

test('admin password is never the browser credential and sessions expire/revoke', () => {
  let now = 1000;
  const sessions = createSessionStore({ ttlMs: 100, now: () => now });
  const encoded = hashAdminPassword('correct horse');
  assert.equal(verifyAdminPassword('correct horse', encoded), true);
  assert.equal(verifyAdminPassword('wrong', encoded), false);
  const token = sessions.issue();
  assert.equal(sessions.verify(token), true);
  now += 101;
  assert.equal(sessions.verify(token), false);
  const second = sessions.issue();
  sessions.revoke(second);
  assert.equal(sessions.verify(second), false);
});

test('lobby actions require the socket owner of the claimed role', () => {
  const lobby = { host: 'socket-a', guest: 'socket-b' };
  assert.equal(isLobbyOwner(lobby, 'socket-a', 'host'), true);
  assert.equal(isLobbyOwner(lobby, 'socket-a', 'guest'), false);
  assert.equal(isLobbyOwner(lobby, 'socket-x', 'host'), false);
});

test('server scoring cannot be increased by a tampered client score', () => {
  assert.equal(scoreForAnswer({ correct: true, attempts: 1, maxPoints: 10 }), 10);
  assert.equal(scoreForAnswer({ correct: true, attempts: 2, maxPoints: 10 }), 5);
  assert.equal(scoreForAnswer({ correct: false, attempts: 1, maxPoints: 9999 }), 0);
});

test('CORS only permits configured origins', () => {
  const allowed = ['https://kristovskis.lv', 'http://localhost:3000'];
  assert.equal(isAllowedOrigin('https://kristovskis.lv', allowed), true);
  assert.equal(isAllowedOrigin('https://evil.example', allowed), false);
  assert.equal(isAllowedOrigin(undefined, allowed), true);
});

test('rate limiter blocks bursts and resets its window', () => {
  let now = 0;
  const allow = createRateLimiter({ windowMs: 1000, max: 2, now: () => now });
  assert.equal(allow('ip'), true);
  assert.equal(allow('ip'), true);
  assert.equal(allow('ip'), false);
  now = 1001;
  assert.equal(allow('ip'), true);
});

test('public names are sanitized against markup and control characters', () => {
  assert.equal(/[<>]/.test(safePublicName('<img src=x onerror=alert(1)>')), false);
  assert.equal(safePublicName(`safe${String.fromCharCode(0)}name`), 'safename');
  assert.equal(safePublicName('fuck this'), '');
});

test('answers are checked against the server question bank values', () => {
  const question = { answer: 'Liepājas', aliases: ['Liepajas'] };
  assert.equal(answerMatches('liepajas', question), true);
  assert.equal(answerMatches('<script>alert(1)</script>', question), false);
});

test('malformed cookies are rejected without throwing', () => {
  assert.deepEqual(parseCookies('admin_session=%'), { admin_session: '' });
});
