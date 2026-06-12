-- ============================================
-- MEAL TRACKER - Supabase Schema
-- Chạy file này trong Supabase SQL Editor
-- ============================================

-- Enable RLS (Row Level Security)
-- Mỗi user chỉ đọc/ghi được data của mình

-- 1. PROFILES - Hồ sơ người dùng
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  cm INTEGER DEFAULT 170,
  kg DECIMAL(5,1) DEFAULT 60,
  age INTEGER DEFAULT 25,
  goal_kg DECIMAL(5,1) DEFAULT 65,
  gym INTEGER DEFAULT 4,
  goal_type TEXT DEFAULT 'bulk' CHECK (goal_type IN ('bulk','cut','maintain')),
  months INTEGER DEFAULT 4,
  activity TEXT DEFAULT 'sedentary' CHECK (activity IN ('sedentary','moderate','active')),
  gym_days INTEGER[] DEFAULT '{0,2,4,5}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. WEIGHT_LOGS - Lịch sử cân nặng
CREATE TABLE weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  kg DECIMAL(5,1) NOT NULL,
  delta DECIMAL(4,1),
  logged_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weight logs" ON weight_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. MEAL_LOGS - Lịch sử bữa ăn (từ tab Bữa ăn Admin)
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id TEXT NOT NULL,         -- sang, trua, phu1, phu2, toi
  day_type TEXT NOT NULL,        -- train, rest
  log_date DATE DEFAULT CURRENT_DATE,
  items JSONB NOT NULL,          -- [{food, gram, p, c, f, fiber, cal}]
  total_cal DECIMAL(7,1),
  total_protein DECIMAL(6,1),
  total_carb DECIMAL(6,1),
  total_fat DECIMAL(6,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meal logs" ON meal_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. FOOD_CACHE - Cache kết quả AI tính macro (tiết kiệm API calls)
CREATE TABLE food_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL,
  gram INTEGER NOT NULL,
  protein DECIMAL(6,1),
  carb DECIMAL(6,1),
  fat DECIMAL(6,1),
  fiber DECIMAL(6,1),
  cal DECIMAL(7,1),
  ai_provider TEXT,              -- claude, gemini, gpt
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(food_name, gram)        -- cache theo tên + gram
);

-- Food cache có thể public read (dùng chung giữa các user)
ALTER TABLE food_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read food cache" ON food_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert food cache" ON food_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Trigger tự update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED: Tạo profile tự động khi user đăng ký
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
