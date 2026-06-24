-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- NEET bank trigram indexes
CREATE INDEX IF NOT EXISTS idx_neet_bank_chapter_trgm ON neet_bank USING GIN (chapter gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_neet_bank_subject_trgm ON neet_bank USING GIN (subject gin_trgm_ops);

-- JEE bank trigram indexes
CREATE INDEX IF NOT EXISTS idx_jee_main_bank_chapter_trgm ON jee_main_bank USING GIN (chapter gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jee_main_bank_subject_trgm ON jee_main_bank USING GIN (subject gin_trgm_ops);

-- md_bank trigram indexes
CREATE INDEX IF NOT EXISTS idx_md_bank_title_trgm ON md_bank USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_md_bank_subject_trgm ON md_bank USING GIN (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_md_bank_chapter_trgm ON md_bank USING GIN (chapter gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_md_bank_author_trgm ON md_bank USING GIN (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_md_bank_description_trgm ON md_bank USING GIN (description gin_trgm_ops);
