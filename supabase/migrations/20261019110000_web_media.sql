-- Ảnh cho web fipilotai.com (Quản trị web › ảnh đại diện, ảnh trong bài, Thư viện ảnh): kho 'web' công khai, chỉ admin tải lên / xoá.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('web', 'web', true, 5242880, array['image/webp','image/jpeg','image/png','image/gif','image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists web_media_read on storage.objects;
drop policy if exists web_media_ins on storage.objects;
drop policy if exists web_media_upd on storage.objects;
drop policy if exists web_media_del on storage.objects;
create policy web_media_read on storage.objects for select using (bucket_id = 'web');
create policy web_media_ins on storage.objects for insert to authenticated with check (bucket_id = 'web' and public.is_web_admin());
create policy web_media_upd on storage.objects for update to authenticated using (bucket_id = 'web' and public.is_web_admin());
create policy web_media_del on storage.objects for delete to authenticated using (bucket_id = 'web' and public.is_web_admin());
