-- 30/10 (soát bảo mật): kho ảnh pi-share là kho công khai → ai có link ảnh vẫn xem được (trang /pi/<biệt danh> dùng link công khai, không qua RLS).
-- Nhưng chính sách SELECT cho mọi người khiến khách (khóa anon có sẵn trong app) LIỆT KÊ được toàn bộ ảnh khoe của mọi user, cả người đã "Ẩn trang".
-- Chỉ cho chủ ảnh SELECT (cần cho upload upsert); người khác chỉ xem qua link công khai.
drop policy if exists pi_share_read on storage.objects;
create policy pi_share_read on storage.objects for select to authenticated
  using (bucket_id = 'pi-share' and (storage.foldername(name))[1] = md5((select auth.uid())::text));
