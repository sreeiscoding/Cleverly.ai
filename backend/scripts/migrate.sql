e-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- users_app table
CREATE TABLE IF NOT EXISTS users_app (
  id UUID primary key references auth.users (id) on delete cascade,
  name TEXT,
  email TEXT UNIQUE,
  plan TEXT DEFAULT 'free',
  account_type TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users_app ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile" ON users_app
  FOR ALL USING (id = auth.uid());

-- notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access for notes" ON notes
  FOR ALL USING (user_id = auth.uid());

-- notes_breakdown
CREATE TABLE IF NOT EXISTS notes_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID,
  original_text TEXT,
  breakdown_result TEXT,
  ai_options_used JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notes_breakdown ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access notes_breakdown" ON notes_breakdown
  FOR ALL USING (user_id = auth.uid());

-- ai_images
CREATE TABLE IF NOT EXISTS ai_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access ai_images" ON ai_images
  FOR ALL USING (user_id = auth.uid());

-- mcq_generator
CREATE TABLE IF NOT EXISTS mcq_generator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_text TEXT,
  generated_mcqs JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mcq_generator ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access mcq_generator" ON mcq_generator
  FOR ALL USING (user_id = auth.uid());

-- my_questions
CREATE TABLE IF NOT EXISTS my_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT,
  options JSONB,
  answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE my_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access my_questions" ON my_questions
  FOR ALL USING (user_id = auth.uid());

-- upload_notes
CREATE TABLE IF NOT EXISTS upload_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id UUID,
  title TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE upload_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access upload_notes" ON upload_notes
  FOR ALL USING (user_id = auth.uid());

-- dictionary
CREATE TABLE IF NOT EXISTS dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT,
  meaning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access dictionary" ON dictionary
  FOR ALL USING (user_id = auth.uid());

-- files
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access files" ON files
  FOR ALL USING (user_id = auth.uid());

-- file_uploads (for chunked uploads)
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  status TEXT DEFAULT 'uploading',
  uploaded_size BIGINT DEFAULT 0,
  progress INT DEFAULT 0,
  temp_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access file_uploads" ON file_uploads
  FOR ALL USING (user_id = auth.uid());

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT,
  currency TEXT,
  plan TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User access payments" ON payments
  FOR ALL USING (user_id = auth.uid());
