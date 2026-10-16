-- Hàm báo cáo admin đã có trên prod nhưng thiếu trong migrations → CI (Supabase local) không dựng được,
-- màn Duyệt đơn / Báo cáo kinh doanh / Chi phí AI báo lỗi trong E2E. Chép nguyên định nghĩa từ prod (16/10).
-- create or replace → chạy lại trên prod không đổi gì.

CREATE OR REPLACE FUNCTION public.admin_ai_cost_by_feature_7d()
 RETURNS TABLE(feature text, calls bigint, total_cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY
  SELECT COALESCE(l.feature, 'không rõ'), COUNT(*), COALESCE(SUM(l.cost_usd),0)
  FROM ai_usage_log l
  WHERE l.created_at > now() - interval '7 days'
  GROUP BY l.feature
  ORDER BY SUM(l.cost_usd) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ai_cost_by_model_7d()
 RETURNS TABLE(model text, calls bigint, total_cost numeric, total_input_tokens bigint, total_output_tokens bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY
  SELECT l.model, COUNT(*), COALESCE(SUM(l.cost_usd),0), COALESCE(SUM(l.input_tokens),0), COALESCE(SUM(l.output_tokens),0)
  FROM ai_usage_log l
  WHERE l.created_at > now() - interval '7 days'
  GROUP BY l.model
  ORDER BY SUM(l.cost_usd) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ai_cost_by_user_7d(p_limit integer DEFAULT 30)
 RETURNS TABLE(user_id uuid, username text, tier text, calls bigint, total_cost numeric, total_input_tokens bigint, total_output_tokens bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY
  SELECT l.user_id, COALESCE(p.username, 'không rõ'), p.tier,
         COUNT(*), COALESCE(SUM(l.cost_usd),0),
         COALESCE(SUM(l.input_tokens),0), COALESCE(SUM(l.output_tokens),0)
  FROM ai_usage_log l
  LEFT JOIN profiles p ON p.id = l.user_id
  WHERE l.created_at > now() - interval '7 days'
  GROUP BY l.user_id, p.username, p.tier
  ORDER BY SUM(l.cost_usd) DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ai_cost_by_user_detail(p_user_id uuid)
 RETURNS TABLE(feature text, model text, calls bigint, total_cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY
  SELECT COALESCE(l.feature,'không rõ'), l.model, COUNT(*), COALESCE(SUM(l.cost_usd),0)
  FROM ai_usage_log l
  WHERE l.user_id = p_user_id AND l.created_at > now() - interval '30 days'
  GROUP BY l.feature, l.model
  ORDER BY SUM(l.cost_usd) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ai_cost_daily(p_days integer DEFAULT 14)
 RETURNS TABLE(day date, calls bigint, cost_usd numeric, input_tokens bigint, output_tokens bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY
  SELECT d::date, COALESCE(agg.calls, 0), COALESCE(agg.cost, 0), COALESCE(agg.in_tok, 0), COALESCE(agg.out_tok, 0)
  FROM generate_series(current_date - (p_days - 1), current_date, interval '1 day') d
  LEFT JOIN (
    SELECT l.created_at::date AS day, COUNT(*) AS calls, SUM(l.cost_usd) AS cost,
           SUM(l.input_tokens) AS in_tok, SUM(l.output_tokens) AS out_tok
    FROM ai_usage_log l
    WHERE l.created_at > current_date - p_days
    GROUP BY l.created_at::date
  ) agg ON agg.day = d::date
  ORDER BY d;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ai_cost_recent(p_limit integer DEFAULT 20)
 RETURNS TABLE(created_at timestamp with time zone, provider text, model text, feature text, input_tokens integer, output_tokens integer, cost_usd numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY
  SELECT l.created_at, l.provider, l.model, l.feature, l.input_tokens, l.output_tokens, l.cost_usd
  FROM ai_usage_log l
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ai_cost_summary()
 RETURNS TABLE(cost_today numeric, calls_today bigint, cost_7d numeric, calls_7d bigint, cost_30d numeric, calls_30d bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY
  SELECT
    COALESCE(SUM(cost_usd) FILTER (WHERE created_at > now() - interval '1 day'), 0),
    COUNT(*) FILTER (WHERE created_at > now() - interval '1 day'),
    COALESCE(SUM(cost_usd) FILTER (WHERE created_at > now() - interval '7 days'), 0),
    COUNT(*) FILTER (WHERE created_at > now() - interval '7 days'),
    COALESCE(SUM(cost_usd) FILTER (WHERE created_at > now() - interval '30 days'), 0),
    COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')
  FROM ai_usage_log;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_business_stats()
 RETURNS TABLE(total_revenue bigint, revenue_this_month bigint, total_users bigint, free_count bigint, trial_count bigint, premium_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    (SELECT COALESCE(sum(amount),0) FROM orders WHERE status='confirmed'),
    (SELECT COALESCE(sum(amount),0) FROM orders WHERE status='confirmed' AND date_trunc('month',confirmed_at)=date_trunc('month',now())),
    (SELECT count(*) FROM profiles),
    (SELECT count(*) FROM profiles WHERE tier='free' OR tier IS NULL),
    (SELECT count(*) FROM profiles WHERE tier='trial'),
    (SELECT count(*) FROM profiles WHERE tier='premium')
  WHERE is_admin_user();
$function$;

CREATE OR REPLACE FUNCTION public.admin_inactive_users(p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, username text, email text, last_sign_in_at timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH base AS (
    SELECT u.id,
      COALESCE(u.raw_user_meta_data->>'username', split_part(u.email,'@',1)) AS username,
      u.email,
      COALESCE(p.last_active_at, u.last_sign_in_at) AS last_sign_in_at
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE is_admin_user() AND p.is_locked = false
      AND COALESCE(p.last_active_at, u.last_sign_in_at) < now() - interval '30 days'
  )
  SELECT b.*, (SELECT count(*) FROM base) AS total_count
  FROM base b
  ORDER BY b.last_sign_in_at ASC
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_orders(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, user_id uuid, username text, email text, package text, amount bigint, status text, created_at timestamp with time zone, confirmed_by_username text, confirmed_at timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH base AS (
    SELECT
      o.id, o.user_id,
      COALESCE(u.raw_user_meta_data->>'username', split_part(u.email,'@',1)) AS username,
      u.email, o.package, o.amount, o.status, o.created_at,
      COALESCE(cu.raw_user_meta_data->>'username', split_part(cu.email,'@',1)) AS confirmed_by_username,
      o.confirmed_at
    FROM orders o
    JOIN auth.users u ON u.id = o.user_id
    LEFT JOIN auth.users cu ON cu.id = o.confirmed_by
    WHERE is_admin_user()
      AND (p_status IS NULL OR p_status = '' OR o.status = p_status)
  )
  SELECT b.*, (SELECT count(*) FROM base) AS total_count
  FROM base b
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$function$;

CREATE OR REPLACE FUNCTION public.admin_order_stats()
 RETURNS TABLE(pending_count bigint, revenue_this_month bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    (SELECT count(*) FROM orders WHERE status = 'pending') AS pending_count,
    (SELECT COALESCE(sum(amount), 0) FROM orders
       WHERE status = 'confirmed' AND date_trunc('month', confirmed_at) = date_trunc('month', now())) AS revenue_this_month
  WHERE is_admin_user();
$function$;

CREATE OR REPLACE FUNCTION public.admin_revenue_by_month(p_months integer DEFAULT 6)
 RETURNS TABLE(month_start date, revenue bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH months AS (
    SELECT (date_trunc('month', now()) - (n || ' months')::interval)::date AS month_start
    FROM generate_series(0, p_months - 1) AS n
  ),
  rev AS (
    SELECT date_trunc('month', confirmed_at)::date AS month_start, sum(amount) AS revenue
    FROM orders WHERE status = 'confirmed'
    GROUP BY 1
  )
  SELECT m.month_start, COALESCE(r.revenue, 0)
  FROM months m
  LEFT JOIN rev r ON r.month_start = m.month_start
  WHERE is_admin_user()
  ORDER BY m.month_start ASC;
$function$;
