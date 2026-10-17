-- 18/10 (bản vẽ 131a–f): chế độ giao diện khách chọn ở màn chào — 'loss' = flow giảm cân (Hôm nay gọn, Tiến độ › Kết quả),
-- 'gym' hoặc null = giao diện hiện tại (tài khoản cũ giữ nguyên)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ui_mode text;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_ui_mode_chk CHECK (ui_mode IS NULL OR ui_mode IN ('loss', 'gym'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
