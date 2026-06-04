-- ============================================================
-- Migration 004: NEET Question Bank with pgvector embeddings
-- Run this in Supabase SQL Editor after enabling pgvector extension
--   create extension if not exists vector;
-- ============================================================

-- Enable pgvector if not already enabled
create extension if not exists vector with schema extensions;

-- 20. NEET BANK — scraped past-year questions with embeddings
create table if not exists neet_bank (
  id uuid primary key default gen_random_uuid(),
  question_id text not null unique,
  subject text not null,
  chapter text not null,
  year text not null default '',
  type text not null default 'mcq',
  difficulty text not null default '',
  marks_correct numeric(5,2) not null default 4,
  marks_negative numeric(5,2) not null default 1,
  question_html text default '',
  question_text text not null default '',
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null default '',
  solution_html text default '',
  solution_text text default '',
  has_diagram boolean not null default false,
  diagram_urls jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(4096),
  created_at timestamptz not null default now()
);

-- Indexes for fast metadata filtering
create index if not exists idx_neet_bank_subject_chapter
  on neet_bank (subject, chapter);

create index if not exists idx_neet_bank_subject
  on neet_bank (subject);

create index if not exists idx_neet_bank_chapter
  on neet_bank (chapter);

create index if not exists idx_neet_bank_year
  on neet_bank (year);

-- No vector index: Qwen3-embedding-8b outputs 4096D (exceeds IVFFlat/HNSW 2000D limit).
-- Vector search runs exact (brute-force) on metadata-filtered subsets (≤180 rows/chapter),
-- which is fast enough without an index.

-- RLS: read-only for authenticated users (anyone logged in can search)
alter table neet_bank enable row level security;

drop policy if exists "Anyone can read neet_bank" on neet_bank;
create policy "Anyone can read neet_bank"
  on neet_bank for select
  using (true);

-- Service role can insert (for the import script)
drop policy if exists "Service role can insert neet_bank" on neet_bank;
create policy "Service role can insert neet_bank"
  on neet_bank for insert
  with check (true);

-- Analyze for query planner
analyze neet_bank;

-- ============================================================
-- Helper function: match_neet_bank
-- Returns top-k questions by cosine similarity to a query embedding,
-- with optional subject/chapter filters.
-- ============================================================
create or replace function match_neet_bank(
  query_embedding vector(4096),
  match_threshold float default 0.5,
  match_count int default 10,
  filter_subject text default null,
  filter_chapter text default null
)
returns table (
  id uuid,
  question_id text,
  subject text,
  chapter text,
  year text,
  type text,
  difficulty text,
  question_text text,
  options jsonb,
  correct_answer text,
  solution_text text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    nb.id,
    nb.question_id,
    nb.subject,
    nb.chapter,
    nb.year,
    nb.type,
    nb.difficulty,
    nb.question_text,
    nb.options,
    nb.correct_answer,
    nb.solution_text,
    1 - (nb.embedding <=> query_embedding) as similarity
  from neet_bank nb
  where
    nb.embedding is not null
    and (filter_subject is null or nb.subject = filter_subject)
    and (filter_chapter is null or nb.chapter = filter_chapter)
    and (1 - (nb.embedding <=> query_embedding)) > match_threshold
  order by nb.embedding <=> query_embedding
  limit match_count;
end;
$$;
