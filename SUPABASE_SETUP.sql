-- MaintenanceAI Supabase Setup
-- Run this in the Supabase SQL Editor at https://supabase.com/dashboard

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  home_type text,
  home_year int,
  vehicles int DEFAULT 0,
  subscribed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text CHECK (category IN ('home','vehicle')),
  item text NOT NULL,
  task text NOT NULL,
  due_date date,
  completed_at timestamptz,
  recurring_days int,
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_diagnoses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text,
  problem text,
  severity text,
  cost_estimate text,
  diy_difficulty int,
  fix_steps text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE maintenance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_diagnoses ENABLE ROW LEVEL SECURITY;

-- Profiles: users own their own row
CREATE POLICY "users_own_profile" ON maintenance_profiles
  FOR ALL USING (auth.uid() = id);

-- Tasks: users own their own tasks
CREATE POLICY "users_own_tasks" ON maintenance_tasks
  FOR ALL USING (auth.uid() = user_id);

-- Diagnoses: users own their own diagnoses
CREATE POLICY "users_own_diagnoses" ON maintenance_diagnoses
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES (performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON maintenance_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON maintenance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_diagnoses_user ON maintenance_diagnoses(user_id, created_at DESC);

-- ============================================================
-- OPTIONAL: Auto-create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.maintenance_profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
