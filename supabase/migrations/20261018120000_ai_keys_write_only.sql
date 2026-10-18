-- 18/10 · Khoá AI (Claude / OpenAI / Gemini) CHỈ GHI, KHÔNG ĐỌC qua app: không admin / trình duyệt nào tải được nguyên khoá.
-- Hàm ai-proxy (máy chủ, service role) vẫn đọc app_settings như cũ → không phải sửa / deploy lại hàm.
-- Khoá USDA (miễn phí, trang mẫu thực đơn PC dùng trực tiếp) vẫn cho admin đọc.
DROP POLICY IF EXISTS read_sensitive_settings_admin_only ON public.app_settings;
DROP POLICY IF EXISTS read_usda_key_admin ON public.app_settings;
CREATE POLICY read_usda_key_admin ON public.app_settings FOR SELECT TO authenticated
  USING (key = 'usda_key' AND (select public.is_admin_user()));

-- Ghi khoá: chỉ Super Admin; trả 4 ký tự cuối để hiện "Đã cài · ••••1234"
CREATE OR REPLACE FUNCTION public.admin_set_ai_key(p_name text, p_value text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin AND admin_role = 'super') THEN RAISE EXCEPTION 'Chỉ Super Admin'; END IF;
  IF p_name NOT IN ('claude_key', 'gpt_key', 'gemini_key') THEN RAISE EXCEPTION 'Khoá không hợp lệ'; END IF;
  p_value := btrim(coalesce(p_value, ''));
  IF char_length(p_value) < 20 OR char_length(p_value) > 400 THEN RAISE EXCEPTION 'Khoá không hợp lệ'; END IF;
  INSERT INTO app_settings (key, value, updated_at) VALUES (p_name, p_value, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN right(p_value, 4);
END $$;

-- Xem tình trạng khoá (không trả khoá): đã cài chưa, 4 ký tự cuối, lần đổi gần nhất
CREATE OR REPLACE FUNCTION public.admin_ai_key_status()
RETURNS TABLE (name text, is_set boolean, last4 text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY SELECT k.n, coalesce(char_length(s.value), 0) > 0, CASE WHEN char_length(s.value) > 0 THEN right(s.value, 4) END, s.updated_at
    FROM unnest(ARRAY['claude_key', 'gpt_key', 'gemini_key']) AS k(n) LEFT JOIN app_settings s ON s.key = k.n;
END $$;

REVOKE ALL ON FUNCTION public.admin_set_ai_key(text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_ai_key_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_key(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_key_status() TO authenticated;
