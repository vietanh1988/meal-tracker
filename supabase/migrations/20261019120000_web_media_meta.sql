-- Thư viện ảnh web (Quản trị PC › WEB › Thư viện ảnh, bản vẽ 138e): thông tin từng ảnh trong kho 'web'.
-- File ảnh nằm ở storage (bucket 'web', đường dẫn img/yyyy/mm/<ten>_<rong>w.webp + bản nhỏ _400w/_800w/_1200w).
create table if not exists public.web_media (
  path text primary key check (path ~ '^img/'),
  url text not null,
  name text not null,
  alt text,
  caption text,
  width int, height int, size int,
  sizes int[] not null default '{}',
  orig_name text, orig_size int, orig_w int, orig_h int,
  uploader text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists web_media_created_idx on public.web_media (created_at desc);
alter table public.web_media enable row level security;
drop policy if exists web_media_meta_read on public.web_media;
drop policy if exists web_media_meta_ins on public.web_media;
drop policy if exists web_media_meta_upd on public.web_media;
drop policy if exists web_media_meta_del on public.web_media;
create policy web_media_meta_read on public.web_media for select using (true);
create policy web_media_meta_ins on public.web_media for insert with check (public.is_web_admin());
create policy web_media_meta_upd on public.web_media for update using (public.is_web_admin()) with check (public.is_web_admin());
create policy web_media_meta_del on public.web_media for delete using (public.is_web_admin());
grant select on public.web_media to anon, authenticated;
grant insert, update, delete on public.web_media to authenticated;
-- Ảnh gốc tối đa 10 MB (bản WebP sau nén vẫn ≤ 5 MB theo kho 'web')
