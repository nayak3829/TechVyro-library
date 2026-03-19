-- Add view_count column to pdfs table (no file size limit)
ALTER TABLE pdfs 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for faster view count queries
CREATE INDEX IF NOT EXISTS idx_pdfs_view_count ON pdfs(view_count DESC);
