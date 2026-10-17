-- Vận động thêm trong ngày (17/10, bản vẽ 130a–c): 1 dòng / user / ngày VN, items = [{ id, type, min, kcal }]
CREATE TABLE IF NOT EXISTS public.activity_logs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_date)
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_logs_select_own ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_insert_own ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_update_own ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_delete_own ON public.activity_logs;
CREATE POLICY activity_logs_select_own ON public.activity_logs FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY activity_logs_insert_own ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY activity_logs_update_own ON public.activity_logs FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY activity_logs_delete_own ON public.activity_logs FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
