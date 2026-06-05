-- ============================================================
-- Migration 006: Vault Bank — admin publishes chapter vaults to aclose users
-- Run this in Supabase SQL Editor after migration 005
--   (extends existing user_notes table; no new tables needed)
--
-- Model:
--   Admin uses the Note Agent to generate a full chapter vault
--   (notes + questions + mcqs + flashcards + quizzes + revision).
--   Admin can then "Publish to Vault Bank" — a single click that
--   flips shared_to_aclose = true on every user_notes row for that
--   chapter owned by admin.
--   aclose-role users see published chapter packages in the Vault
--   Bank tab inside the Note Agent. They click "Save to vault" to
--   copy the entire chapter (all files, paths preserved) into their
--   own user_notes table, so it appears in their Reader/Questions/etc.
--
-- Roles:
--   admin   — publishes/unpublishes their own chapter vaults
--   aclose  — browses Vault Bank, saves chapters to their own vault
--   user    — no Vault Bank access
-- ============================================================

-- Add the share flag
alter table user_notes
  add column if not exists shared_to_aclose boolean not null default false;

-- Track when the share flag was set (useful for "published N days ago")
alter table user_notes
  add column if not exists shared_at timestamptz;

-- Index for fast filtering when listing published chapters
create index if not exists idx_user_notes_shared
  on user_notes (user_id, chapter)
  where shared_to_aclose = true;

-- ============================================================
-- RLS POLICIES for Vault Bank
-- ============================================================

-- Helper: identify the single admin whose vaults are publishable.
-- In a multi-admin world this would be a per-publisher table; for
-- this app there is exactly one admin, so we hard-code the lookup
-- by joining profiles.role = 'admin'. Any user with role = 'admin'
-- can publish their own chapters. aclose users can only read rows
-- where shared_to_aclose = true. The publish endpoint is admin-only.
--
-- Existing "Own data only" policy on user_notes remains in force —
-- aclose users cannot UPDATE or DELETE admin rows; they can only
-- INSERT new rows of their own (covered by the existing insert policy
-- via with check (auth.uid() = user_id)).

-- Drop the old "Own data only" policy to add a more granular one
drop policy if exists "Own data only" on user_notes;

-- SELECT: a user can see (a) their own rows AND (b) any row marked
-- shared_to_aclose. Admins can also see any row they own (already
-- covered by (a)).
create policy "Own or shared via vault bank"
  on user_notes for select
  using (
    auth.uid() = user_id
    or (
      shared_to_aclose = true
      and exists (
        select 1 from profiles p
        where p.id = user_notes.user_id
          and p.role = 'admin'
      )
    )
  );

-- INSERT: a user can only insert rows they own. The save-to-vault
-- flow uses the service-role key (bypasses RLS) so the INSERT itself
-- is performed as a privileged write from the API route.
create policy "Own data insert"
  on user_notes for insert
  with check (auth.uid() = user_id);

-- UPDATE: a user can only update their own rows. The publish/
-- unpublish endpoint uses the service-role key for the column flip.
create policy "Own data update"
  on user_notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: a user can only delete their own rows.
create policy "Own data delete"
  on user_notes for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Admin role helper view
-- Returns the admin's user_id. Used by the Vault Bank page to
-- scope "list of published chapters" without leaking the admin
-- id into the client.
-- ============================================================
create or replace view admin_user as
  select id as user_id
  from profiles
  where role = 'admin'
  limit 1;

-- Grant read on the view to authenticated users (aclose users
-- need to query it to know which admin to read shared notes from)
grant select on admin_user to authenticated;
