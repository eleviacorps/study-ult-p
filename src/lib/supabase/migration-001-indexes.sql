-- ============================================================
-- Migration 001: Performance Indexes & Connection Pool Config
-- ============================================================
-- Run this in Supabase SQL Editor after the base schema.
--
-- Also configure pgbouncer in Supabase Dashboard:
--   Project Settings → Database → Connection Pooling
--   - Mode: Transaction
--   - Pool Size: 15 (Hobby), 30+ (Pro)
--   - Default Pool Size: 15
-- ============================================================

-- ── Composite indexes for frequent query patterns ──

-- chat_messages: session-based pagination
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(user_id, session_id, created_at);

-- attempt_analytics: per-user time-range queries
CREATE INDEX IF NOT EXISTS idx_attempt_analytics_user_created
  ON attempt_analytics(user_id, created_at DESC);

-- attempt_analytics: per-topic performance lookups
CREATE INDEX IF NOT EXISTS idx_attempt_analytics_topic_created
  ON attempt_analytics(user_id, topic, created_at DESC);

-- vault_chunks: document-based chunk retrieval
CREATE INDEX IF NOT EXISTS idx_vault_chunks_document_user
  ON vault_chunks(document_id, user_id, chunk_index);

-- vault_chunks: retrieval queries by user + metadata
CREATE INDEX IF NOT EXISTS idx_vault_chunks_user_created
  ON vault_chunks(user_id, created_at DESC);

-- chat_sessions: most-recent-first ordering
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON chat_sessions(user_id, updated_at DESC);

-- chat_sessions: session scope lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_type
  ON chat_sessions(user_id, type);

-- study_sessions: date-range queries
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date
  ON study_sessions(user_id, date DESC);

-- daily_learning_metrics: time-series lookups
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date
  ON daily_learning_metrics(user_id, date DESC);

-- user_notes: chapter-based browsing
CREATE INDEX IF NOT EXISTS idx_user_notes_user_chapter
  ON user_notes(user_id, chapter);

-- ── Partial indexes for filtered queries ──

-- Weak areas: only non-deleted, sorted by accuracy
CREATE INDEX IF NOT EXISTS idx_weak_areas_user_accuracy
  ON weak_areas(user_id, accuracy ASC)
  WHERE accuracy IS NOT NULL;

-- Recovery tasks: pending tasks sorted by due date
CREATE INDEX IF NOT EXISTS idx_recovery_tasks_pending
  ON student_recovery_tasks(user_id, due_at ASC)
  WHERE status = 'pending';

-- Focus queue: high-priority pending items
CREATE INDEX IF NOT EXISTS idx_focus_queue_active
  ON student_focus_queue(user_id, priority DESC, due_at ASC)
  WHERE status = 'pending';

-- Flashcards: reviewed-today lookups (common query)
-- If you add a `reviewed_at` column to track last review time:
-- CREATE INDEX IF NOT EXISTS idx_flashcards_reviewed_today
--   ON user_flashcards(user_id, reviewed_at DESC)
--   WHERE reviewed_at >= CURRENT_DATE;

-- ── BRIN indexes for append-heavy tables ──

-- activity_snapshots: append-only, range scans
CREATE INDEX IF NOT EXISTS idx_activity_snapshots_brin
  ON activity_snapshots USING BRIN (created_at)
  WITH (pages_per_range = 32);

-- performance_trends: append-heavy time-series
CREATE INDEX IF NOT EXISTS idx_performance_trends_brin
  ON performance_trends USING BRIN (created_at)
  WITH (pages_per_range = 32);

-- ── GIN indexes for JSONB query patterns ──

-- student_learning_state: jsonb key lookups
CREATE INDEX IF NOT EXISTS idx_learning_state_gin
  ON student_learning_state USING GIN (mastery_map jsonb_path_ops);

-- ── ANALYZE to update query planner statistics ──
ANALYZE;
