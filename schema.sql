-- =====================================================================
-- Script Skill - Supabase schema
-- =====================================================================
-- Run this once in the Supabase SQL editor.
-- Designed for the free tier (1GB). Sliding window + auto-archive keeps
-- the footprint microscopic even after thousands of scripts.
-- =====================================================================

-- One row per "thread" of work. status='active' means it's the
-- currently-being-worked-on script for that user. Closed/archived
-- sessions stay for audit but are pruned by the cleanup function.
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        TEXT NOT NULL,
  topic        TEXT,                                  -- short label, set from first user turn
  status       TEXT NOT NULL DEFAULT 'active',        -- active | archived | abandoned
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_phone_status_idx
  ON sessions (phone, status, updated_at DESC);

-- Every turn (user message + assistant reply). Used as sliding context
-- window for the writer.
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,                          -- user | assistant
  kind        TEXT NOT NULL DEFAULT 'text',           -- text | transcript | script | system
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_session_created_idx
  ON messages (session_id, created_at);

-- Approved final scripts. Tiny rows, kept forever.
CREATE TABLE IF NOT EXISTS final_scripts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES sessions(id) ON DELETE SET NULL,
  phone        TEXT NOT NULL,
  topic        TEXT,
  script       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS final_scripts_phone_idx
  ON final_scripts (phone, created_at DESC);

-- Idempotency cache: WAHA can redeliver webhooks. Store seen message ids
-- briefly so we never process the same audio twice.
CREATE TABLE IF NOT EXISTS processed_events (
  event_id   TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- Cleanup: keep the database lean.
-- Call from a scheduled function (Supabase cron) every hour, or via the
-- /admin/cleanup endpoint from a cron service.
-- =====================================================================
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Auto-abandon active sessions idle > 24h (writer treats them as stale)
  UPDATE sessions
     SET status = 'abandoned', updated_at = NOW()
   WHERE status = 'active'
     AND updated_at < NOW() - INTERVAL '24 hours';

  -- 2. Delete archived/abandoned sessions older than 7 days
  --    (their final scripts are already saved in final_scripts)
  DELETE FROM sessions
   WHERE status IN ('archived', 'abandoned')
     AND updated_at < NOW() - INTERVAL '7 days';

  -- 3. Trim processed_events older than 3 days
  DELETE FROM processed_events
   WHERE created_at < NOW() - INTERVAL '3 days';
END;
$$;
