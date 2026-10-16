-- Số đo cơ thể (17/10, bản vẽ 123a–d): 1 dòng / user / ngày VN. Mỗi số cm (1 chữ số thập phân) hoặc null; % mỡ tuỳ chọn.
CREATE TABLE IF NOT EXISTS public.body_measurements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  chest numeric(5,1) CHECK (chest IS NULL OR chest BETWEEN 10 AND 250),
  waist numeric(5,1) CHECK (waist IS NULL OR waist BETWEEN 10 AND 250),
  belly numeric(5,1) CHECK (belly IS NULL OR belly BETWEEN 10 AND 250),
  hip numeric(5,1) CHECK (hip IS NULL OR hip BETWEEN 10 AND 250),
  arm numeric(5,1) CHECK (arm IS NULL OR arm BETWEEN 10 AND 250),
  thigh numeric(5,1) CHECK (thigh IS NULL OR thigh BETWEEN 10 AND 250),
  body_fat numeric(4,1) CHECK (body_fat IS NULL OR body_fat BETWEEN 3 AND 60),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_date)
);
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS body_measurements_select_own ON public.body_measurements;
DROP POLICY IF EXISTS body_measurements_insert_own ON public.body_measurements;
DROP POLICY IF EXISTS body_measurements_update_own ON public.body_measurements;
DROP POLICY IF EXISTS body_measurements_delete_own ON public.body_measurements;
CREATE POLICY body_measurements_select_own ON public.body_measurements FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY body_measurements_insert_own ON public.body_measurements FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY body_measurements_update_own ON public.body_measurements FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY body_measurements_delete_own ON public.body_measurements FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
