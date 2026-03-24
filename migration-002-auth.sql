-- Run this in Supabase SQL Editor
-- Adds user auth support to journal_entries

-- 1. Add user_id column
ALTER TABLE journal_entries ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- 2. Drop the old open policy
DROP POLICY IF EXISTS "Allow all" ON journal_entries;
DROP POLICY IF EXISTS "Allow all reads" ON journal_entries;
DROP POLICY IF EXISTS "Allow all inserts" ON journal_entries;
DROP POLICY IF EXISTS "Allow all updates" ON journal_entries;
DROP POLICY IF EXISTS "Allow all deletes" ON journal_entries;

-- 3. Create user-scoped policies
CREATE POLICY "Users read own entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);
