-- Run this migration to add missing columns to upload_notes table
-- This should be run in Supabase SQL editor or via a migration tool

-- Add missing columns if they don't exist
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS ai_analysis_json JSONB;

-- Add foreign key constraint for folder_id
ALTER TABLE upload_notes ADD CONSTRAINT fk_upload_notes_folder
  FOREIGN KEY (folder_id) REFERENCES notes_folders(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_upload_notes_user_id ON upload_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_notes_is_favorite ON upload_notes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_upload_notes_folder_id ON upload_notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_upload_notes_created_at ON upload_notes(created_at DESC);
