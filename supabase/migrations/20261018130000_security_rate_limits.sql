-- 18/10 · Rà bảo mật đợt 2: giới hạn số lần gọi các hàm mở cho khách chưa đăng nhập (theo địa chỉ IP).
--  - check_email_available (ô Email lúc đăng ký): tối đa 20 lần / 10 phút / IP — chống dò "email này có phải khách không".
--  - check_username_available (tự chọn tên lúc đăng ký): 60 lần / 10 phút / IP.
--  - log_client_error (app tự ghi lỗi): 20 dòng / phút / IP (đã đăng nhập: theo tài khoản), cắt độ dài, tự xoá lỗi cũ > 30 ngày.
-- Không có IP (chạy local / CI) thì không giới hạn.
CREATE TABLE IF NOT EXISTS public.rpc_hits (
  who text NOT NULL,
  fn text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rpc_hits_who_fn_at ON public.rpc_hits (who, fn, at DESC);
ALTER TABLE public.rpc_hits ENABLE ROW LEVEL SECURITY; -- không có policy: chỉ hàm nội bộ đọc / ghi
REVOKE ALL ON public.rpc_hits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.rpc_rate_ok(p_fn text, p_max int, p_window interval, p_who text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE h json; w text; n int;
BEGIN
  w := p_who;
  IF w IS NULL THEN
    BEGIN h := current_setting('request.headers', true)::json; EXCEPTION WHEN others THEN h := NULL; END;
    w := coalesce(h->>'cf-connecting-ip', h->>'x-real-ip', btrim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)));
    IF w = '' THEN w := NULL; END IF;
  END IF;
  IF w IS NULL THEN RETURN true; END IF;
  SELECT count(*) INTO n FROM rpc_hits WHERE who = w AND fn = p_fn AND at > now() - p_window;
  IF n >= p_max THEN RETURN false; END IF;
  INSERT INTO rpc_hits (who, fn) VALUES (w, p_fn);
  IF random() < 0.02 THEN DELETE FROM rpc_hits WHERE at < now() - interval '1 day'; END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.rpc_rate_ok(text, int, interval, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_email_available(p_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.rpc_rate_ok('check_email', 20, interval '10 minutes') THEN RAISE EXCEPTION 'Thử lại sau ít phút'; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(left(btrim(coalesce(p_email, '')), 320)));
END $$;

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.rpc_rate_ok('check_username', 60, interval '10 minutes') THEN RAISE EXCEPTION 'Thử lại sau ít phút'; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(left(btrim(coalesce(p_username, '')), 60)));
END $$;

CREATE OR REPLACE FUNCTION public.log_client_error(p_message text, p_stack text DEFAULT NULL, p_component_stack text DEFAULT NULL, p_url text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.rpc_rate_ok('log_error', 20, interval '1 minute', auth.uid()::text) THEN RETURN; END IF;
  INSERT INTO client_errors (user_id, message, stack, component_stack, url, user_agent)
  VALUES (auth.uid(), left(p_message, 1000), left(p_stack, 4000), left(p_component_stack, 4000), left(p_url, 500), left(p_user_agent, 300));
  IF random() < 0.02 THEN DELETE FROM client_errors WHERE created_at < now() - interval '30 days'; END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.check_email_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, text) TO anon, authenticated;

-- Hàm nền còn sót: ghim search_path
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
