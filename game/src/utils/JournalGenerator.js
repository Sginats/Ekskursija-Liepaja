/**
 * JournalGenerator
 *
 * Generates a plain-text post-game report with the player's route,
 * score, time and the facts they encountered.
 *
 * Usage:
 *   import { generateJournal, downloadJournal, printJournal } from './JournalGenerator.js';
 *
 *   const text = generateJournal({ playerName, score, timeSeconds, route });
 *   downloadJournal(text, 'ekskursija-liepaja.txt');
 */

/**
 * @typedef {Object} RouteEntry
 * @property {string}   locationId
 * @property {string}   locationName
 * @property {number}   pointsEarned
 * @property {string}   [questionText]
 * @property {string}   [fact]
 * @property {boolean}  [answeredCorrectly]
 */

/**
 * @typedef {Object} JournalData
 * @property {string}       playerName
 * @property {number}       score
 * @property {number}       timeSeconds
 * @property {RouteEntry[]} route
 * @property {string}       [mode]      – 'single' | 'multi'
 */

/**
 * Build a plain-text journal string.
 * @param {JournalData} data
 * @returns {string}
 */
export function generateJournal({ playerName, score, timeSeconds, route = [], mode = 'single' }) {
  const date     = new Date().toLocaleDateString('lv-LV', { dateStyle: 'long' });
  const mins     = String(Math.floor(timeSeconds / 60)).padStart(2, '0');
  const secs     = String(timeSeconds % 60).padStart(2, '0');
  const timeStr  = `${mins}:${secs}`;
  const maxScore = route.length * 10;

  const lines = [
    '═══════════════════════════════════════════════════',
    '      LIEPĀJAS EKSKURSIJA — CEĻOJUMA ŽURNĀLS',
    '═══════════════════════════════════════════════════',
    '',
    `  Spēlētājs : ${playerName}`,
    `  Datums    : ${date}`,
    `  Spēles režīms : ${mode === 'multi' ? 'Vairākspēlētāju' : 'Viena spēlētāja'}`,
    `  Laiks     : ${timeStr}`,
    `  Punkti    : ${score} / ${maxScore}`,
    '',
    '───────────────────────────────────────────────────',
    '  APMEKLĒTĀS VIETAS',
    '───────────────────────────────────────────────────',
    '',
  ];

  route.forEach((entry, i) => {
    const status = entry.answeredCorrectly ? '✓' : '✗';
    lines.push(`  ${i + 1}. ${entry.locationName}  [${status} +${entry.pointsEarned} pts]`);
    if (entry.questionText) {
      lines.push(`     Jautājums: ${entry.questionText}`);
    }
    if (entry.fact) {
      lines.push(`     Fakts: ${entry.fact}`);
    }
    lines.push('');
  });

  lines.push('───────────────────────────────────────────────────');
  lines.push(`  Kopā apmeklētas ${route.length} vietas.`);

  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  let rating = '⭐';
  if (pct >= 90) rating = '🏆 Izcili!';
  else if (pct >= 70) rating = '🥈 Labi!';
  else if (pct >= 50) rating = '🥉 Vidēji';

  lines.push(`  Rezultātu novērtējums: ${rating} (${pct}%)`);
  lines.push('');
  lines.push('  Paldies par dalību Liepājas ekskursijā!');
  lines.push('  Izstrādāja: Niks Šenvalds & Dans Bitenieks (2PT)');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Trigger a browser download of the journal as a .txt file.
 * @param {string} text
 * @param {string} [filename]
 */
export function downloadJournal(text, filename = 'ekskursija-liepaja-zurnals.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Open a new window with formatted journal content and trigger the print dialog.
 * @param {string} text
 */
export function printJournal(text) {
  const win = window.open('', '_blank', 'width=700,height=800');
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Liepājas Ekskursija — Žurnāls</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 32px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
        </style>
      </head>
      <body>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
