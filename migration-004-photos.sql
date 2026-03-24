-- Run in Supabase SQL Editor
-- Adds photos column and follow_up_questions to journal_entries

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS follow_up_questions jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for journal photos (run in Supabase Dashboard > Storage > New Bucket)
-- Bucket name: journal-photos
-- Public: true (so images can be displayed without auth tokens)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Storage policies (run after creating bucket):
-- Allow authenticated users to upload to their own folder
INSERT INTO storage.policies (name, bucket_id, definition, check_expression)
SELECT 
  'Users can upload photos',
  'journal-photos',
  '(auth.uid() IS NOT NULL)',
  '(auth.uid()::text = (storage.foldername(name))[1])'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Users can upload photos' AND bucket_id = 'journal-photos'
);

-- Allow public read access
INSERT INTO storage.policies (name, bucket_id, definition)
SELECT
  'Public photo access',
  'journal-photos', 
  'true'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Public photo access' AND bucket_id = 'journal-photos'
);
