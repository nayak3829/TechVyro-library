-- Smart PDF uploads persist generated JPEG/WebP thumbnails in the private
-- pdfs bucket alongside the source PDF.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/webp']
WHERE id = 'pdfs';