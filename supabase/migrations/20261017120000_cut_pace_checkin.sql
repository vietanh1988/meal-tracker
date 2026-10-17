-- 17/10 (bản vẽ 126–127): giảm mỡ theo tốc độ + kiểm tra tuần
--  cut_pace        : tốc độ giảm khách chọn — slow 0,25% · mid 0,5% · fast 0,75% cân nặng / tuần (null = mid)
--  cal_offset      : điều chỉnh calo cộng dồn từ thẻ Kiểm tra tuần (bước 100 kcal, trong khoảng −300…+300)
--  cal_offset_date : ngày chỉnh gần nhất (hiện ở Mục tiêu › Điều chỉnh theo tuần)
--  checkin_date    : ngày khách xử lý thẻ Kiểm tra tuần gần nhất (ẩn thẻ tới tuần sau)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cut_pace text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cal_offset integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cal_offset_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS checkin_date date;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_cut_pace_chk CHECK (cut_pace IS NULL OR cut_pace IN ('slow', 'mid', 'fast'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_cal_offset_chk CHECK (cal_offset BETWEEN -300 AND 300);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
