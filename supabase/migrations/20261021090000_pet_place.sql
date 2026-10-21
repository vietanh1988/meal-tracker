-- 21/10: Quản trị PC › Thú cưng Pi › Kho đồ › "Chỉnh vị trí" — kéo thả món trên Pi, lưu đè điểm đặt gốc của catalog.
-- place = { "nam": {x,y,w,h?,r?,fx?,cut?}, "nu": {...}, "behind_head"?: bool } · redraw = cần vẽ lại (hình sai, chỉnh vị trí không cứu được) + ghi chú.
-- Bảng đã có quyền + RLS (khách chỉ đọc, admin sửa) từ 20261020150000_pet.sql. Chạy lại vẫn an toàn.
alter table public.pet_items add column if not exists place jsonb not null default '{}'::jsonb;
alter table public.pet_items add column if not exists redraw boolean not null default false;
alter table public.pet_items add column if not exists redraw_note text not null default '';
