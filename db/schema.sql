-- ═══════════════════════════════════════════════════════════════════════════
-- Ekskursija Liepāja — Supabase / PostgreSQL schema
-- Run this once in the Supabase SQL editor or via psql.
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Leaderboard ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(20) NOT NULL,
  score        INTEGER     NOT NULL CHECK (score >= 0 AND score <= 200),
  time_seconds INTEGER     NOT NULL CHECK (time_seconds >= 0),
  mode         VARCHAR(20) NOT NULL DEFAULT 'single',  -- 'single' | 'multi'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leaderboard_mode_score ON leaderboard (mode, score DESC, time_seconds ASC);

-- ── Cooperative sessions (dual-key validation log) ────────────────────────────
CREATE TABLE IF NOT EXISTS coop_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       VARCHAR(50) NOT NULL,
  location_id      VARCHAR(50) NOT NULL,
  questioner_name  VARCHAR(20),
  clue_holder_name VARCHAR(20),
  success          BOOLEAN     NOT NULL,
  multiplier       NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  penalty          INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coop_sessions_location ON coop_sessions (location_id);

-- ── Loot pool events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loot_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      VARCHAR(50) NOT NULL,
  event_type   VARCHAR(10) NOT NULL CHECK (event_type IN ('found', 'used')),
  player_name  VARCHAR(20),
  location_id  VARCHAR(50),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loot_events_item ON loot_events (item_id, event_type);

-- ── Flash quiz results ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flash_quiz_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id               VARCHAR(50) NOT NULL,
  question_id           VARCHAR(50),
  player_name           VARCHAR(20),
  answer                VARCHAR(100),
  correct               BOOLEAN     NOT NULL DEFAULT FALSE,
  community_points      INTEGER     NOT NULL DEFAULT 0,
  majority_correct      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flash_quiz_quiz_id ON flash_quiz_results (quiz_id);

-- ── Finale sessions (end-game lobby snapshots) ────────────────────────────────
CREATE TABLE IF NOT EXISTS finale_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key VARCHAR(20),                       -- e.g. date-based key
  players     JSONB       NOT NULL DEFAULT '[]', -- [{name, score, timeSeconds, completedAt}]
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ
);

-- ── Question overrides (hot-swap audit log) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS question_overrides (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  VARCHAR(50) NOT NULL,
  question_idx INTEGER     NOT NULL,
  patch        JSONB       NOT NULL,  -- {text?, answer?, fact?}
  applied_by   VARCHAR(50),           -- admin socket id
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reverted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS question_overrides_location ON question_overrides (location_id, question_idx);

-- ── Information source links (admin CRUD) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(120) NOT NULL,
  url         TEXT         NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Row-Level Security (Supabase) ─────────────────────────────────────────────
-- Allow anonymous reads on leaderboard and resources
ALTER TABLE leaderboard        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coop_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loot_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE finale_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources          ENABLE ROW LEVEL SECURITY;

-- Public clients may read only. All inserts/updates/deletes go through the
-- Node service using the server-only service_role key.
DROP POLICY IF EXISTS "leaderboard_read" ON leaderboard;
CREATE POLICY "leaderboard_read" ON leaderboard FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON leaderboard FROM anon, authenticated;

-- Public read for resources (info sources)
DROP POLICY IF EXISTS "resources_read" ON resources;
CREATE POLICY "resources_read" ON resources FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON resources FROM anon, authenticated;

-- Explicitly deny direct client reads/writes for operational/event tables.
REVOKE ALL ON coop_sessions, loot_events, flash_quiz_results, finale_sessions,
  question_overrides FROM anon, authenticated;

-- Server-side service role handles all writes. Never expose this key to Vite.

-- Structured audit stream. Keep detailed events for 90 days, then purge with
-- the scheduled job below (or the hosting provider's retention mechanism).
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level      VARCHAR(10) NOT NULL,
  message    TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at ON audit_logs (created_at);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit_logs FROM anon, authenticated;

-- Run daily using pg_cron or a managed scheduler:
-- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
