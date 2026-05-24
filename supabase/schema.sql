-- ============================================================
-- EXPENDITURE SAAS - DATABASE SCHEMA
-- Paste this in Supabase SQL Editor and run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SCHOOLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'ABBOTTABAD',
  ddo_code TEXT NOT NULL,
  department TEXT DEFAULT 'EDUCATION',
  gender TEXT DEFAULT 'Female',
  principal_designation TEXT DEFAULT 'PRINCIPAL',
  emis_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- BUDGET HEADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_heads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('pays', 'allowances')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  budget NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, code)
);

-- ============================================================
-- MONTHLY STATEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS statements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  month_num INTEGER NOT NULL CHECK (month_num BETWEEN 1 AND 12),
  month_name TEXT NOT NULL,
  data JSONB NOT NULL, -- Complete calculated statement
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, year, month_num)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - CRITICAL FOR MULTI-TENANCY
-- ============================================================

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

-- SCHOOLS policies
CREATE POLICY "Users can view own school" ON schools
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own school" ON schools
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own school" ON schools
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own school" ON schools
  FOR DELETE USING (auth.uid() = user_id);

-- BUDGET HEADS policies
CREATE POLICY "Users can view own heads" ON budget_heads
  FOR SELECT USING (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own heads" ON budget_heads
  FOR INSERT WITH CHECK (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own heads" ON budget_heads
  FOR UPDATE USING (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own heads" ON budget_heads
  FOR DELETE USING (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

-- STATEMENTS policies
CREATE POLICY "Users can view own statements" ON statements
  FOR SELECT USING (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own statements" ON statements
  FOR INSERT WITH CHECK (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own statements" ON statements
  FOR UPDATE USING (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own statements" ON statements
  FOR DELETE USING (
    school_id IN (SELECT id FROM schools WHERE user_id = auth.uid())
  );

-- ============================================================
-- HELPER FUNCTION: Auto-create default heads when school is created
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_heads()
RETURNS TRIGGER AS $$
BEGIN
  -- PAYS section
  INSERT INTO budget_heads (school_id, section, code, name, display_order) VALUES
    (NEW.id, 'pays', 'A01101', 'Pay of Officers', 1),
    (NEW.id, 'pays', 'A01102', 'Personal Pay', 2),
    (NEW.id, 'pays', 'A01151', 'Pay of other staff', 3);
  
  -- ALLOWANCES section
  INSERT INTO budget_heads (school_id, section, code, name, display_order) VALUES
    (NEW.id, 'allowances', 'A01202', 'House Rent Allow', 1),
    (NEW.id, 'allowances', 'A01203', 'Conveyance Allow', 2),
    (NEW.id, 'allowances', 'A01207', 'Washing Allow', 3),
    (NEW.id, 'allowances', 'A01208', 'Dress Allow', 4),
    (NEW.id, 'allowances', 'A0120D', 'Integrated Allow', 5),
    (NEW.id, 'allowances', 'A01217', 'Medical Allowance', 6),
    (NEW.id, 'allowances', 'A0121T', 'Adhoc Relief 13', 7),
    (NEW.id, 'allowances', 'A0122C', 'Adhoc Relief 15', 8),
    (NEW.id, 'allowances', 'A0122M', 'Adhoc Relief 16', 9),
    (NEW.id, 'allowances', 'A0122Y', 'Adhoc Relief 17', 10),
    (NEW.id, 'allowances', 'A0123G', 'Adhoc Relief 18', 11),
    (NEW.id, 'allowances', 'A01253', 'Sc Teaching Allowance', 12),
    (NEW.id, 'allowances', 'A01229', 'Special Compensatory', 13);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create heads when new school is registered
DROP TRIGGER IF EXISTS on_school_created ON schools;
CREATE TRIGGER on_school_created
  AFTER INSERT ON schools
  FOR EACH ROW
  EXECUTE FUNCTION create_default_heads();

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_schools_user_id ON schools(user_id);
CREATE INDEX IF NOT EXISTS idx_heads_school_id ON budget_heads(school_id);
CREATE INDEX IF NOT EXISTS idx_statements_school_id ON statements(school_id);
CREATE INDEX IF NOT EXISTS idx_statements_year_month ON statements(school_id, year, month_num);

-- DONE! ✅
