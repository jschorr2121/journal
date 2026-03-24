-- Run in Supabase SQL Editor
-- Adds new journal section columns

ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS key_events jsonb default '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS productivity jsonb default '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS goals_and_intentions jsonb default '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS health_and_wellbeing jsonb default '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS relationships jsonb default '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS ideas_and_insights jsonb default '[]'::jsonb;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS worries_and_open_loops jsonb default '[]'::jsonb;
