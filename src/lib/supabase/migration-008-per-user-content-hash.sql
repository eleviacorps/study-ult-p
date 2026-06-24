-- Drop global unique constraint on vault_documents.content_hash
ALTER TABLE vault_documents DROP CONSTRAINT IF EXISTS vault_documents_content_hash_key;

-- Add per-user unique index (content_hash unique per user, not globally)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_documents_user_content_hash 
  ON vault_documents (user_id, content_hash) 
  WHERE content_hash IS NOT NULL;
