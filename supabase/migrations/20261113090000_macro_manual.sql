-- 13/11/2026: Tự nhập macro theo giai đoạn (vd mini cut 6 tuần cắt tinh bột).
-- macro_manual: { on: bool, until: 'YYYY-MM-DD' | null, p: g đạm, f: g béo, c: g tinh bột ngày tập, cRest: g tinh bột ngày nghỉ, preset }
-- Cột trên bảng có sẵn (profiles) — không phải bảng mới nên không cần GRANT. App chưa thấy cột thì tự lưu trên máy.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS macro_manual jsonb;
