-- ============================================================
-- Baseline cấu trúc DB prod (Supabase veodsvojxjmjhtrlaieq), chép 13/10/2026
-- bằng SELECT trên catalog (bảng, cột, ràng buộc, index, RLS, policy, hàm, trigger).
-- MỤC ĐÍCH: dựng Supabase LOCAL cho CI / E2E. KHÔNG chạy file này lên prod.
-- - Secret trong hàm đã thay bằng LOCAL_TEST_SECRET, URL edge function prod
--   thay bằng địa chỉ chết để local không gọi ra ngoài.
-- - Các hàm admin_* (thống kê / quản trị) CHƯA chép — chỉ màn admin dùng.
--   Khi viết E2E cho admin thì chép thêm vào migration mới.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_net;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_id uuid,
  target_user_id uuid,
  action text NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_stats_snapshots (
  snapshot_date date NOT NULL,
  total_users integer NOT NULL,
  active_users integer NOT NULL,
  new_7d integer NOT NULL,
  locked_users integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_menu_cache (
  user_id uuid NOT NULL,
  menu_date date DEFAULT CURRENT_DATE NOT NULL,
  template jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  feature text,
  input_tokens integer DEFAULT 0 NOT NULL,
  output_tokens integer DEFAULT 0 NOT NULL,
  cost_usd numeric(12,6) DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  message text,
  stack text,
  component_stack text,
  url text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  log_date date NOT NULL,
  day_type text NOT NULL,
  template_used uuid,
  meals jsonb DEFAULT '[]'::jsonb NOT NULL,
  total_cal integer DEFAULT 0,
  total_protein numeric(6,1) DEFAULT 0,
  total_carb numeric(6,1) DEFAULT 0,
  total_fat numeric(6,1) DEFAULT 0,
  total_fiber numeric(6,1) DEFAULT 0,
  is_complete boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  eaten_meals jsonb DEFAULT '[]'::jsonb,
  water_ml integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.feature_ratings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  username text,
  feature text NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.food_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  food_name text NOT NULL,
  gram integer NOT NULL,
  protein numeric(6,1),
  carb numeric(6,1),
  fat numeric(6,1),
  fiber numeric(6,1),
  cal numeric(7,1),
  ai_provider text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.food_cache_pending (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  food_name text NOT NULL,
  gram integer,
  protein numeric,
  carb numeric,
  fat numeric,
  fiber numeric,
  cal numeric,
  ai_provider text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.food_overrides (
  key text NOT NULL,
  p numeric NOT NULL,
  c numeric NOT NULL,
  f numeric NOT NULL,
  cal numeric NOT NULL,
  fiber numeric DEFAULT 0,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  meal_id text NOT NULL,
  day_type text NOT NULL,
  log_date date DEFAULT CURRENT_DATE,
  items jsonb NOT NULL,
  total_cal numeric(7,1),
  total_protein numeric(6,1),
  total_carb numeric(6,1),
  total_fat numeric(6,1),
  created_at timestamp with time zone DEFAULT now(),
  pattern text,
  composite boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.notification_batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_id uuid,
  title text NOT NULL,
  body text,
  url text DEFAULT '/'::text,
  target_type text NOT NULL,
  target_user_id uuid,
  recipient_count integer DEFAULT 0 NOT NULL,
  push_sent_count integer DEFAULT 0 NOT NULL,
  push_failed_count integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  url text DEFAULT '/'::text,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  package text,
  amount bigint,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  confirmed_by uuid,
  confirmed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  username text,
  cm integer DEFAULT 170,
  kg numeric(5,1) DEFAULT 60,
  age integer DEFAULT 25,
  goal_kg numeric(5,1) DEFAULT 65,
  gym integer DEFAULT 4,
  goal_type text DEFAULT 'bulk'::text,
  months integer DEFAULT 4,
  activity text DEFAULT 'sedentary'::text,
  gym_days integer[] DEFAULT '{0,2,4,5}'::integer[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gender text,
  exercise_type text,
  cardio_intensity text,
  onboarding_done boolean DEFAULT false,
  birth_year integer,
  frequency text DEFAULT 'regular'::text,
  diet_strategy text DEFAULT 'balanced'::text,
  calorie_mode text DEFAULT 'standard'::text,
  is_admin boolean DEFAULT false,
  tier text DEFAULT 'trial'::text,
  trial_end_date date,
  subscription_end_date date,
  is_locked boolean DEFAULT false,
  ai_macro_count_this_month integer DEFAULT 0,
  ai_macro_count_reset_at date DEFAULT CURRENT_DATE,
  ai_chat_count_today integer DEFAULT 0,
  ai_chat_count_reset_at date DEFAULT CURRENT_DATE,
  admin_notes text,
  last_active_at timestamp with time zone,
  meal_config jsonb,
  uses_supplements boolean DEFAULT false,
  ai_menu_count_today integer DEFAULT 0,
  ai_menu_count_reset_at date,
  ai_menu_last_call_at timestamp with time zone,
  ai_chat_last_call_at timestamp with time zone,
  ai_photo_count_this_month integer DEFAULT 0,
  ai_photo_count_reset_at text,
  banner_dismissed_date date,
  admin_role text,
  push_dismissed_date date,
  push_prompted_after_eaten boolean DEFAULT false,
  push_enabled_clicked boolean DEFAULT false,
  meal_times jsonb,
  water_goal_ml integer,
  reminder_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_test boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_settings (
  id integer DEFAULT 1 NOT NULL,
  free_ai_macro_limit integer DEFAULT 100,
  free_ai_chat_limit integer DEFAULT 20,
  trial_days integer DEFAULT 90,
  grace_period_days integer DEFAULT 3,
  price_3m bigint,
  price_6m bigint,
  price_12m bigint,
  bank_name text,
  bank_account text,
  bank_account_name text,
  updated_at timestamp with time zone DEFAULT now(),
  free_ai_menu_limit integer DEFAULT 5,
  trial_ai_menu_limit integer DEFAULT 30,
  trial_ai_chat_limit integer DEFAULT 100,
  trial_ai_macro_limit integer DEFAULT 500,
  premium_ai_menu_limit integer DEFAULT 50,
  premium_ai_chat_limit integer DEFAULT 150,
  premium_ai_macro_limit integer DEFAULT 1000,
  free_ai_photo_limit integer DEFAULT 30,
  trial_ai_photo_limit integer DEFAULT 100,
  premium_ai_photo_limit integer DEFAULT 300
);

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  username text,
  category text DEFAULT 'suggestion'::text NOT NULL,
  content text NOT NULL,
  image_url text,
  status text DEFAULT 'pending'::text NOT NULL,
  admin_reply text,
  admin_replied_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_bundles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  goal_type text NOT NULL,
  days jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.weekly_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text DEFAULT 'Template mới'::text NOT NULL,
  day_name text NOT NULL,
  day_type text NOT NULL,
  meals jsonb DEFAULT '[]'::jsonb NOT NULL,
  total_cal integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  goal_type text,
  diet_strategy text
);

CREATE TABLE IF NOT EXISTS public.weight_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  week integer NOT NULL,
  kg numeric(5,1) NOT NULL,
  delta numeric(4,1),
  logged_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now()
);

-- ===== Khoá chính / unique / check =====
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_stats_snapshots ADD CONSTRAINT admin_stats_snapshots_pkey PRIMARY KEY (snapshot_date);
ALTER TABLE public.ai_chat_history ADD CONSTRAINT ai_chat_history_pkey PRIMARY KEY (id);
ALTER TABLE public.ai_menu_cache ADD CONSTRAINT ai_menu_cache_pkey PRIMARY KEY (user_id, menu_date);
ALTER TABLE public.ai_usage_log ADD CONSTRAINT ai_usage_log_pkey PRIMARY KEY (id);
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);
ALTER TABLE public.client_errors ADD CONSTRAINT client_errors_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.feature_ratings ADD CONSTRAINT feature_ratings_pkey PRIMARY KEY (id);
ALTER TABLE public.food_cache ADD CONSTRAINT food_cache_pkey PRIMARY KEY (id);
ALTER TABLE public.food_cache_pending ADD CONSTRAINT food_cache_pending_pkey PRIMARY KEY (id);
ALTER TABLE public.food_overrides ADD CONSTRAINT food_overrides_pkey PRIMARY KEY (key);
ALTER TABLE public.meal_logs ADD CONSTRAINT meal_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_batches ADD CONSTRAINT notification_batches_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.subscription_settings ADD CONSTRAINT subscription_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.weekly_bundles ADD CONSTRAINT weekly_bundles_pkey PRIMARY KEY (id);
ALTER TABLE public.weekly_templates ADD CONSTRAINT weekly_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.weight_logs ADD CONSTRAINT weight_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_day_type_check CHECK ((day_type = ANY (ARRAY['train'::text, 'rest'::text])));
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_user_id_log_date_key UNIQUE (user_id, log_date);
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_water_ml_check CHECK (((water_ml >= 0) AND (water_ml <= 10000)));
ALTER TABLE public.feature_ratings ADD CONSTRAINT feature_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE public.feature_ratings ADD CONSTRAINT feature_ratings_user_id_feature_key UNIQUE (user_id, feature);
ALTER TABLE public.food_cache ADD CONSTRAINT food_cache_food_name_gram_key UNIQUE (food_name, gram);
ALTER TABLE public.meal_logs ADD CONSTRAINT unique_meal_per_type UNIQUE (user_id, meal_id, day_type);
ALTER TABLE public.orders ADD CONSTRAINT orders_package_check CHECK ((package = ANY (ARRAY['3m'::text, '6m'::text, '12m'::text])));
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_activity_check CHECK ((activity = ANY (ARRAY['sedentary'::text, 'moderate'::text, 'active'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_goal_type_check CHECK ((goal_type = ANY (ARRAY['bulk'::text, 'cut'::text, 'maintain'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'trial'::text, 'premium'::text])));
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
ALTER TABLE public.subscription_settings ADD CONSTRAINT single_row CHECK ((id = 1));
ALTER TABLE public.weekly_templates ADD CONSTRAINT weekly_templates_day_name_check CHECK ((day_name = ANY (ARRAY['thu_2'::text, 'thu_3'::text, 'thu_4'::text, 'thu_5'::text, 'thu_6'::text, 'thu_7'::text, 'cn'::text])));
ALTER TABLE public.weekly_templates ADD CONSTRAINT weekly_templates_day_type_check CHECK ((day_type = ANY (ARRAY['train'::text, 'rest'::text])));

-- ===== Khoá ngoại =====
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_chat_history ADD CONSTRAINT ai_chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_menu_cache ADD CONSTRAINT ai_menu_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_usage_log ADD CONSTRAINT ai_usage_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.client_errors ADD CONSTRAINT client_errors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_template_used_fkey FOREIGN KEY (template_used) REFERENCES weekly_templates(id) ON DELETE SET NULL;
ALTER TABLE public.daily_logs ADD CONSTRAINT daily_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.feature_ratings ADD CONSTRAINT feature_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.food_cache_pending ADD CONSTRAINT food_cache_pending_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.food_overrides ADD CONSTRAINT food_overrides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public.meal_logs ADD CONSTRAINT meal_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notification_batches ADD CONSTRAINT notification_batches_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD CONSTRAINT orders_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.weekly_bundles ADD CONSTRAINT weekly_bundles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.weekly_templates ADD CONSTRAINT weekly_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.weight_logs ADD CONSTRAINT weight_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ===== Index =====
CREATE INDEX IF NOT EXISTS food_cache_pending_created_by_idx ON public.food_cache_pending USING btree (created_by);
CREATE INDEX IF NOT EXISTS food_cache_pending_food_name_idx ON public.food_cache_pending USING btree (food_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id ON public.ai_usage_log USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_date ON public.ai_chat_history USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_created ON public.client_errors USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs USING btree (log_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON public.daily_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs USING btree (user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_notification_batches_created ON public.notification_batches USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_templates_user ON public.weekly_templates USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_templates_user_day ON public.weekly_templates USING btree (user_id, day_name);

-- ===== Hàm (không gồm admin_*) =====
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
 SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$function$;

CREATE OR REPLACE FUNCTION public.auto_downgrade_expired_tiers()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 UPDATE profiles SET tier = 'free'
 WHERE tier = 'trial' AND trial_end_date IS NOT NULL AND trial_end_date < CURRENT_DATE;
 UPDATE profiles SET tier = 'free'
 WHERE tier = 'premium' AND subscription_end_date IS NOT NULL AND subscription_end_date < CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_email_available(p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 RETURN NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email));
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 RETURN NOT EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(p_username));
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 DELETE FROM push_subscriptions WHERE endpoint = p_endpoint AND user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 v_grace int;
BEGIN
 SELECT grace_period_days INTO v_grace FROM subscription_settings WHERE id = 1;
 v_grace := COALESCE(v_grace, 0);
 UPDATE profiles SET tier = 'free'
 WHERE tier = 'trial' AND trial_end_date IS NOT NULL AND trial_end_date + v_grace < CURRENT_DATE;
 UPDATE profiles SET tier = 'free'
 WHERE tier = 'premium' AND subscription_end_date IS NOT NULL AND subscription_end_date + v_grace < CURRENT_DATE;
END;
$function$;

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
 INSERT INTO public.profiles (id, username, tier, trial_end_date)
 VALUES (
 NEW.id,
 NEW.raw_user_meta_data->>'username',
 'trial',
 (CURRENT_DATE + COALESCE(v_trial_days, 90))
 )
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_client_error(p_message text, p_stack text DEFAULT NULL::text, p_component_stack text DEFAULT NULL::text, p_url text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 INSERT INTO client_errors (user_id, message, stack, component_stack, url, user_agent)
 VALUES (auth.uid(), p_message, p_stack, p_component_stack, p_url, p_user_agent);
END;
$function$;

-- Local: không gửi push thật (prod gọi edge function send-push)
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_user_activity()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 UPDATE profiles SET last_active_at = now() WHERE id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
 INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key)
 VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth_key)
 ON CONFLICT (endpoint) DO UPDATE SET user_id = auth.uid(), p256dh = p_p256dh, auth_key = p_auth_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
 NEW.updated_at = NOW();
 RETURN NEW;
END;
$function$;

-- ===== RLS =====
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_stats_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_menu_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_cache_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- ===== Policy =====
CREATE POLICY "Admin insert audit log" ON public.admin_audit_log AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin_user());
CREATE POLICY "Admin view audit log" ON public.admin_audit_log AS PERMISSIVE FOR SELECT TO public USING (is_admin_user());
CREATE POLICY "admin read audit log" ON public.admin_audit_log AS PERMISSIVE FOR SELECT TO public USING (is_admin_user());
CREATE POLICY "Admin read stats" ON public.admin_stats_snapshots AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Users manage own chat" ON public.ai_chat_history AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own menu cache" ON public.ai_menu_cache AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own menu cache" ON public.ai_menu_cache AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own menu cache" ON public.ai_menu_cache AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own menu cache" ON public.ai_menu_cache AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "service role insert only" ON public.ai_usage_log AS PERMISSIVE FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service role select all" ON public.ai_usage_log AS PERMISSIVE FOR SELECT TO service_role USING (true);
CREATE POLICY admin_update ON public.app_settings AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = 'e2e39900-6390-4d0d-a387-cc707f0a2645'::uuid)) WITH CHECK ((auth.uid() = 'e2e39900-6390-4d0d-a387-cc707f0a2645'::uuid));
CREATE POLICY admin_write ON public.app_settings AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = 'e2e39900-6390-4d0d-a387-cc707f0a2645'::uuid));
CREATE POLICY read_public_settings ON public.app_settings AS PERMISSIVE FOR SELECT TO public USING ((key <> ALL (ARRAY['claude_key'::text, 'gpt_key'::text, 'gemini_key'::text, 'usda_key'::text])));
CREATE POLICY read_sensitive_settings_admin_only ON public.app_settings AS PERMISSIVE FOR SELECT TO public USING (((key = ANY (ARRAY['claude_key'::text, 'gpt_key'::text, 'gemini_key'::text, 'usda_key'::text])) AND is_admin_user()));
CREATE POLICY "admin read client_errors" ON public.client_errors AS PERMISSIVE FOR SELECT TO public USING (is_admin_user());
CREATE POLICY "Users can delete own logs" ON public.daily_logs AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own logs" ON public.daily_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own logs" ON public.daily_logs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own logs" ON public.daily_logs AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admin read all ratings" ON public.feature_ratings AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Users read own ratings" ON public.feature_ratings AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users update own ratings" ON public.feature_ratings AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users upsert ratings" ON public.feature_ratings AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY food_cache_delete ON public.food_cache AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY food_cache_insert ON public.food_cache AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY food_cache_select ON public.food_cache AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY food_cache_update ON public.food_cache AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY pending_delete ON public.food_cache_pending AS PERMISSIVE FOR DELETE TO public USING (((created_by = auth.uid()) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))));
CREATE POLICY pending_insert ON public.food_cache_pending AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY pending_select ON public.food_cache_pending AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY pending_update ON public.food_cache_pending AS PERMISSIVE FOR UPDATE TO public USING (((created_by = auth.uid()) OR (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))));
CREATE POLICY "Admin can delete food_overrides" ON public.food_overrides AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Admin can insert food_overrides" ON public.food_overrides AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Admin can update food_overrides" ON public.food_overrides AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Anyone can read food_overrides" ON public.food_overrides AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users manage own meal logs" ON public.meal_logs AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY meals_delete ON public.meal_logs AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY meals_insert ON public.meal_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY meals_select ON public.meal_logs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY meals_update ON public.meal_logs AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "admin read notification_batches" ON public.notification_batches AS PERMISSIVE FOR SELECT TO public USING (is_admin_user());
CREATE POLICY "Admin insert notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "own notifications select" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "own notifications update" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Admin update orders" ON public.orders AS PERMISSIVE FOR UPDATE TO public USING (is_admin_user());
CREATE POLICY "User create own orders" ON public.orders AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "User view own orders" ON public.orders AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin_user()));
CREATE POLICY "Admin update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = id) OR is_admin_user()));
CREATE POLICY "Admin view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = id) OR is_admin_user()));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY profiles_insert ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_select ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY profiles_update ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY "own push subscriptions" ON public.push_subscriptions AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Admin insert settings" ON public.subscription_settings AS PERMISSIVE FOR INSERT TO public WITH CHECK (is_admin_user());
CREATE POLICY "Admin update settings" ON public.subscription_settings AS PERMISSIVE FOR UPDATE TO public USING (is_admin_user());
CREATE POLICY "Anyone read settings" ON public.subscription_settings AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admin read all feedback" ON public.user_feedback AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Admin update feedback" ON public.user_feedback AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY "Users insert feedback" ON public.user_feedback AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users read own feedback" ON public.user_feedback AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY weekly_bundles_admin_write ON public.weekly_bundles AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));
CREATE POLICY weekly_bundles_select_all_auth ON public.weekly_bundles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Anyone can read default templates" ON public.weekly_templates AS PERMISSIVE FOR SELECT TO public USING ((is_default = true));
CREATE POLICY "Users can delete own templates" ON public.weekly_templates AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own templates" ON public.weekly_templates AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own templates" ON public.weekly_templates AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (is_default = true)));
CREATE POLICY "Users can update own templates" ON public.weekly_templates AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users manage own weight logs" ON public.weight_logs AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY weight_delete ON public.weight_logs AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY weight_insert ON public.weight_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY weight_select ON public.weight_logs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY weight_update ON public.weight_logs AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));

-- ===== Trigger =====
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER on_new_user_notify_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION notify_admin_new_user();
CREATE TRIGGER daily_logs_updated_at BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER weekly_templates_updated_at BEFORE UPDATE ON public.weekly_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== Storage =====
INSERT INTO storage.buckets(id,name,public) VALUES ('avatars','avatars',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets(id,name,public) VALUES ('public-assets','public-assets',true) ON CONFLICT DO NOTHING;

-- ===== Dữ liệu tối thiểu cho app chạy =====
INSERT INTO public.subscription_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
