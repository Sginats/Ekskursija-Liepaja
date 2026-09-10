# Security and improvement plan

## Completed in this review

- Removed committed/default admin passwords and made PHP admin authentication depend on `ADMIN_PASSWORD_HASH`.
- Restricted PHP and Socket.IO CORS to configured/known origins.
- Added origin, framing, MIME-sniffing, referrer, and content-security headers.
- Added connection/failed-admin-attempt rate limiting to the Node server.
- Bound PHP lobby state changes to unguessable host/guest tokens.
- Bound Socket.IO lobby readiness and task events to the socket that owns the role.
- Replaced browser admin secrets with `game/admin.html`, a 15-minute server-issued
  HttpOnly session cookie, and cookie-authenticated `/admin` events.
- Added server-side answer validation, duplicate task prevention, authoritative
  score increments, and automated security tests.
- Added root setup/build/test/lint/format/audit commands, CI, Gitleaks, and
  lazy-loaded Phaser scene chunks.
- Updated vulnerable server, game, and client lockfiles where non-breaking fixes were available.
- Kept `.env`, service-role keys, logs, and data files out of the public surface.

## Architecture

The repository currently contains three frontend generations (`src/`, `client/`, and
`game/`) plus PHP and Node backends. Consolidate toward one supported frontend and
one API boundary. Move API calls into `src/services/`, game state into
`src/state/`, reusable UI into `src/components/`, and static media into `public/`.
Mark the legacy PHP/HTML entry points as compatibility-only before removing them.

The Node Socket.IO service is the authoritative mutation boundary. Every score
and answer mutation validates a server-side player record; legacy PHP remains a
compatibility adapter and must not become a second source of truth.

## Authentication and authorization

The Socket.IO admin namespace uses a server login that creates a short-lived,
HttpOnly, Secure-in-production, SameSite session cookie. Every namespace
connection is authorized against the server-side session store.

For player sessions, issue a random server token at `start_game.php`, bind it to
the PHP session, expire it, and derive score/time/task totals only from server
state. Do not trust `score`, `tasks`, `role`, or elapsed time from the browser.

## Data and database

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Use the anon key only in a
frontend that needs public read access. Enable RLS on every table, keep public
policies read-only where possible, and add constraints for names, URLs, scores,
and timestamps. Use parameterized queries or the Supabase client; never build SQL
from request strings. Add retention rules for logs and leaderboard data.

## Forms and XSS

React escapes interpolated text by default. Preserve that behavior and avoid
`dangerouslySetInnerHTML`. The legacy `innerHTML` code in `src/js/script.js`
should be migrated to DOM text nodes or escaped template helpers before accepting
any user-controlled content. Validate URLs with `https:`/`http:` allowlists,
reject `javascript:` and `data:` schemes, and use `rel="noopener noreferrer"` on
external links.

## Rate limiting and operations

Keep the in-memory limits for a single Node process, but use a shared store
(Redis/Supabase edge rate limit) when deploying multiple instances. Add limits
per IP and session for answer attempts, score submissions, lobby creation, and
admin login. Add structured request IDs, generic client errors, and server-side
audit events for admin actions.

Set production `NODE_ENV=production`, disable verbose error output, use HTTPS,
rotate credentials, and monitor failed authentication and abnormal lobby
activity.

## Feature and UX roadmap

1. Category filtering, route planning, an audio-guide speech fallback, and
   Latvian/English/Russian message catalogs are implemented in `game/`.
2. Connection/offline/retry, loading, and empty states are implemented in the
   supported game/admin entries; continue extending them to legacy views.
3. Keyboard focus, semantic labels, contrast, and reduced-motion defaults are
   implemented in the supported UI; verify with an automated accessibility
   runner when browser test infrastructure is added.
4. Phaser scenes are lazy-loaded and split into chunks. Continue converting
   large media to WebP/AVIF and compressed audio with text transcripts.

## Developer experience

Add one root command that installs/builds the supported frontend and server,
document required Node/PHP versions, run ESLint/Prettier in CI, and add automated
tests for authorization, lobby ownership, score integrity, CORS, and XSS-safe
rendering. Run `npm audit` and secret scanning in pull requests.
