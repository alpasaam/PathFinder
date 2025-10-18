/*
  # PathFinder Database Schema

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `session_id` (text, unique identifier for each conversation session)
      - `riasec_scores` (jsonb, stores RIASEC personality scores)
      - `conversation_data` (jsonb, stores conversation history and context)
      - `current_stage` (text, tracks conversation flow stage)
      - `question_count` (integer, tracks number of questions asked)
      - `selected_major_id` (uuid, reference to selected major)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `recommendations`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to conversations)
      - `type` (text, either 'major' or 'career')
      - `title` (text, name of the major or career)
      - `why_fits` (text, explanation of why it fits the user)
      - `salary_range` (text, salary information)
      - `day_in_life` (text, description of daily activities)
      - `details` (jsonb, additional details like courses, skills, etc.)
      - `is_pinned` (boolean, whether user pinned this recommendation)
      - `created_at` (timestamptz)
    
    - `mentor_requests`
      - `id` (uuid, primary key)
      - `recommendation_id` (uuid, foreign key to recommendations)
      - `mentor_name` (text)
      - `mentor_email` (text)
      - `mentor_profile` (jsonb, LinkedIn or other profile data)
      - `draft_email` (text, AI-generated email draft)
      - `sent_at` (timestamptz, null if not sent yet)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Public access for demo purposes (can be restricted later for auth users)
*/

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  riasec_scores jsonb DEFAULT '{}'::jsonb,
  conversation_data jsonb DEFAULT '[]'::jsonb,
  current_stage text DEFAULT 'questions' CHECK (current_stage IN ('questions', 'majors', 'careers')),
  question_count integer DEFAULT 0,
  selected_major_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to conversations"
  ON conversations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to conversations"
  ON conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to conversations"
  ON conversations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('major', 'career')),
  title text NOT NULL,
  why_fits text NOT NULL,
  salary_range text DEFAULT '',
  day_in_life text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to recommendations"
  ON recommendations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to recommendations"
  ON recommendations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to recommendations"
  ON recommendations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to recommendations"
  ON recommendations FOR DELETE
  TO anon
  USING (true);

-- Add foreign key for selected_major_id after recommendations table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversations_selected_major_id_fkey'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_selected_major_id_fkey
    FOREIGN KEY (selected_major_id) REFERENCES recommendations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Mentor requests table
CREATE TABLE IF NOT EXISTS mentor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid REFERENCES recommendations(id) ON DELETE CASCADE,
  mentor_name text NOT NULL,
  mentor_email text NOT NULL,
  mentor_profile jsonb DEFAULT '{}'::jsonb,
  draft_email text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mentor_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to mentor_requests"
  ON mentor_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to mentor_requests"
  ON mentor_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to mentor_requests"
  ON mentor_requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_conversation_id ON recommendations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(conversation_id, type);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_recommendation_id ON mentor_requests(recommendation_id);
