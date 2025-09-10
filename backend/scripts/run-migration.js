require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  try {
    console.log('Starting database migration...');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );

    console.log('Testing database connection...');

    // Test connection by trying to select from upload_notes
    const { data: testData, error: testError } = await supabase
      .from('upload_notes')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Database connection test failed:', testError.message);
      console.log('\nPlease run the following SQL commands manually in your Supabase SQL editor:');
      console.log(`
-- Add missing columns to upload_notes table
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE upload_notes ADD COLUMN IF NOT EXISTS folder_id UUID;

-- Create notes_folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS notes_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#14807a',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE upload_notes ADD CONSTRAINT fk_upload_notes_folder
  FOREIGN KEY (folder_id) REFERENCES notes_folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_upload_notes_user_id ON upload_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_notes_is_favorite ON upload_notes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_upload_notes_folder_id ON upload_notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_upload_notes_created_at ON upload_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_folders_user_id ON notes_folders(user_id);
      `);
      return;
    }

    console.log('✓ Database connection successful');

    // Try to add columns using Supabase's table modification
    console.log('Attempting to add missing columns...');

    // Test if columns exist by trying to select them
    const { data: columnTest, error: columnError } = await supabase
      .from('upload_notes')
      .select('file_name, file_type, file_size')
      .limit(1);

    if (columnError && columnError.message.includes('column')) {
      console.log('Columns appear to be missing. Please run the SQL commands shown above in your Supabase dashboard.');
    } else {
      console.log('✓ Required columns appear to exist');
    }

    console.log('\nMigration check completed!');
    console.log('\nNext steps:');
    console.log('1. If columns are missing, run the SQL commands above in Supabase SQL editor');
    console.log('2. Restart your backend server');
    console.log('3. Test file upload functionality');
    console.log('4. Verify that file information displays correctly in the UI');

  } catch (error) {
    console.error('Migration check failed:', error);
    console.log('\nPlease ensure your Supabase credentials are correct and try again.');
    process.exit(1);
  }
}

runMigration();
