-- Add structure_location to pdfs table for Content Structure navigation
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS structure_location JSONB DEFAULT NULL;

-- Index for faster structure queries
CREATE INDEX IF NOT EXISTS pdfs_structure_location_idx ON pdfs USING GIN(structure_location);
