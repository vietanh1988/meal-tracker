-- 18/10 (bản vẽ 135c–e): ghi hành vi khách — Quản trị PC › Hành vi khách + chấm "Đang dùng app" ở Người dùng.
-- Chỉ ghi "đã làm gì" (tên việc, màn, chế độ giảm cân / gym, vài thông tin ngắn) — KHÔNG ghi tên món, số cân hay dữ liệu sức khoẻ.
-- Khách chỉ GHI được dòng của mình, không đọc được; Admin đọc được để thống kê.
CREATE TABLE IF NOT EXISTS public.app_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  screen text CHECK (screen IS NULL OR char_length(screen) <= 30),
  mode text CHECK (mode IS NULL OR mode IN ('loss', 'gym')),
  meta jsonb CHECK (meta IS NULL OR pg_column_size(meta) <= 600)
);
CREATE INDEX IF NOT EXISTS app_events_user_at ON public.app_events (user_id, at DESC);
CREATE INDEX IF NOT EXISTS app_events_at ON public.app_events (at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_events_insert_own ON public.app_events;
DROP POLICY IF EXISTS app_events_admin_read ON public.app_events;
CREATE POLICY app_events_insert_own ON public.app_events FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY app_events_admin_read ON public.app_events FOR SELECT TO authenticated USING ((select public.is_admin_user()));
GRANT INSERT, SELECT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;

-- Danh sách khách cho trang Hành vi: lần mở cuối, số ngày có dùng (30 ngày, giờ VN), có bật thông báo không.
CREATE OR REPLACE FUNCTION public.admin_behavior_users()
RETURNS TABLE (id uuid, username text, email text, created_at timestamptz, ui_mode text, goal_type text, onboarding_done boolean,
               last_at timestamptz, active_days_30 int, has_push boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'not admin'; END IF;
  RETURN QUERY
  SELECT p.id, p.username::text, u.email::text, u.created_at, p.ui_mode::text, p.goal_type::text, p.onboarding_done,
         ev.last_at, COALESCE(ev.days, 0)::int,
         EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id = p.id)
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN LATERAL (
    SELECT max(e.at) AS last_at,
           count(DISTINCT (e.at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) FILTER (WHERE e.at > now() - interval '30 days') AS days
    FROM public.app_events e WHERE e.user_id = p.id
  ) ev ON true
  ORDER BY u.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_behavior_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_behavior_users() TO authenticated;
