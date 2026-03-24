-- Run this in your Supabase SQL Editor to set up the journal database

-- Entries table
CREATE TABLE entries (
  id BIGSERIAL PRIMARY KEY,
  entry_date DATE NOT NULL,
  transcript TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}',
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast date lookups
CREATE INDEX idx_entries_date ON entries(entry_date DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) - disabled for now since no auth
-- When you add Google Auth later, enable RLS and add policies:
-- ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage own entries" ON entries
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
