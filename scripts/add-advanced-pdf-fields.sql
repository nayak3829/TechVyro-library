-- Add advanced fields to pdfs table for enhanced upload features
-- This migration adds tags, visibility, scheduling, download control, and custom slugs

-- Add tags column (array of text)
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT NULL;

-- Add visibility column (public, unlisted, private)
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private'));

-- Add scheduled publishing column
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- Add download permission column
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT TRUE;

-- Add custom URL slug column
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT NULL;

-- Add unique index on slug (where not null)
CREATE UNIQUE INDEX IF NOT EXISTS pdfs_slug_unique ON pdfs(slug) WHERE slug IS NOT NULL;

-- Add index on tags for faster searches
CREATE INDEX IF NOT EXISTS pdfs_tags_idx ON pdfs USING GIN(tags);

-- Add index on visibility for filtering
CREATE INDEX IF NOT EXISTS pdfs_visibility_idx ON pdfs(visibility);

-- Add index on scheduled_at for scheduled publishing queries
CREATE INDEX IF NOT EXISTS pdfs_scheduled_at_idx ON pdfs(scheduled_at) WHERE scheduled_at IS NOT NULL;
