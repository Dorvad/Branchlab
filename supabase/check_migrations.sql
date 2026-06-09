-- Run this in the Supabase SQL Editor to check which migrations have been applied.
-- Each block returns TRUE (applied) or FALSE (not applied).

SELECT
  -- Migration 011: player_analytics_extended
  -- Marker: completed_at column on player_sessions
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'player_sessions'
      AND column_name  = 'completed_at'
  ) AS "011_player_analytics_extended",

  -- Migration 012: facilitator_mode
  -- Marker: facilitator_sessions table
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'facilitator_sessions'
  ) AS "012_facilitator_mode",

  -- Migration 013: private_sharing
  -- Marker: scenario_share_tokens table
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'scenario_share_tokens'
  ) AS "013_private_sharing",

  -- Migration 014: share_token_atomic_increment
  -- Marker: increment_share_token_use() function
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'increment_share_token_use'
  ) AS "014_share_token_atomic_increment";

-- ── Diagnostic: verify scenario_versions.id type (must be uuid for 013 to work) ──
SELECT
  data_type AS "scenario_versions_id_type"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'scenario_versions'
  AND column_name  = 'id';
