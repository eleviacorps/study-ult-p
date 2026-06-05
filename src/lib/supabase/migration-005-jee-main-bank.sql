-- ============================================================
-- Migration 005: JEE Main Question Bank with pgvector embeddings
-- Run this in Supabase SQL Editor after migration 004
--   (uses same vector extension, same embedding model)
-- ============================================================

-- 21. JEE MAIN BANK — scraped past-year questions with embeddings
create table if not exists jee_main_bank (
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
create index if not exists idx_jee_main_bank_subject_chapter
  on jee_main_bank (subject, chapter);

create index if not exists idx_jee_main_bank_subject
  on jee_main_bank (subject);

create index if not exists idx_jee_main_bank_chapter
  on jee_main_bank (chapter);

create index if not exists idx_jee_main_bank_year
  on jee_main_bank (year);

-- No vector index: Qwen3-embedding-8b outputs 4096D (exceeds IVFFlat/HNSW 2000D limit).
-- Vector search runs exact (brute-force) on metadata-filtered subsets (≤180 rows/chapter),
-- which is fast enough without an index.

-- RLS: read-only for authenticated users (anyone logged in can search)
alter table jee_main_bank enable row level security;

drop policy if exists "Anyone can read jee_main_bank" on jee_main_bank;
create policy "Anyone can read jee_main_bank"
  on jee_main_bank for select
  using (true);

-- Service role can insert (for the import script)
drop policy if exists "Service role can insert jee_main_bank" on jee_main_bank;
create policy "Service role can insert jee_main_bank"
  on jee_main_bank for insert
  with check (true);

-- Analyze for query planner
analyze jee_main_bank;

-- ============================================================
-- Helper function: match_jee_main_bank
-- Returns top-k questions by cosine similarity to a query embedding,
-- with optional subject/chapter filters.
-- ============================================================
create or replace function match_jee_main_bank(
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
    jb.id,
    jb.question_id,
    jb.subject,
    jb.chapter,
    jb.year,
    jb.type,
    jb.difficulty,
    jb.question_text,
    jb.options,
    jb.correct_answer,
    jb.solution_text,
    1 - (jb.embedding <=> query_embedding) as similarity
  from jee_main_bank jb
  where
    jb.embedding is not null
    and (filter_subject is null or jb.subject = filter_subject)
    and (filter_chapter is null or jb.chapter = filter_chapter)
    and (1 - (jb.embedding <=> query_embedding)) > match_threshold
  order by jb.embedding <=> query_embedding
  limit match_count;
end;
$$;
