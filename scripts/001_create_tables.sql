-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pdfs table
CREATE TABLE IF NOT EXISTS pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on pdfs" ON pdfs
  FOR SELECT USING (true);

-- Insert some default categories
INSERT INTO categories (name, slug, color) VALUES
  ('Technology', 'technology', '#3B82F6'),
  ('Business', 'business', '#10B981'),
  ('Education', 'education', '#8B5CF6'),
  ('Health', 'health', '#EC4899'),
  ('Science', 'science', '#F59E0B')
ON CONFLICT (slug) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pdfs_category_id ON pdfs(category_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_at ON pdfs(created_at DESC);
