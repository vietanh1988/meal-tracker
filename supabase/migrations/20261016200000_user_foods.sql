-- Món tự nhập của từng khách (16/10): trước chỉ lưu localStorage (fp_my_foods) → đổi máy / xoá trình duyệt là mất.
-- 1 dòng / user / tên món; data = { p, c, f, fiber, cal, gram } cho 1 đơn vị (giống food_cache entry).
CREATE TABLE IF NOT EXISTS public.user_foods (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name text NOT NULL CHECK (char_length(food_name) BETWEEN 1 AND 120),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, food_name)
);
ALTER TABLE public.user_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_foods_select_own ON public.user_foods;
DROP POLICY IF EXISTS user_foods_insert_own ON public.user_foods;
DROP POLICY IF EXISTS user_foods_update_own ON public.user_foods;
DROP POLICY IF EXISTS user_foods_delete_own ON public.user_foods;
CREATE POLICY user_foods_select_own ON public.user_foods FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY user_foods_insert_own ON public.user_foods FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY user_foods_update_own ON public.user_foods FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY user_foods_delete_own ON public.user_foods FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_foods TO authenticated;

-- Thời điểm khách đồng ý Điều khoản / Chính sách (ghi lúc đăng ký; tài khoản cũ = null)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Đăng ký gửi kèm user_metadata.terms_accepted = true (màn đăng ký ghi "Tiếp tục nghĩa là bạn đồng ý…")
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_days int;
BEGIN
  SELECT trial_days INTO v_trial_days FROM subscription_settings WHERE id = 1;
  INSERT INTO public.profiles (id, username, tier, trial_end_date, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    'trial',
    (CURRENT_DATE + COALESCE(v_trial_days, 90)),
    CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted') = 'true' THEN now() END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
