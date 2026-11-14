-- 14/11 (Vercel báo team free đã dùng 90% CPU tháng): web làm mới trang theo giờ thay vì mỗi phút,
-- còn khi Quản trị (hoặc AI viết bài, lịch đăng bài hẹn giờ) đổi nội dung web thì báo web làm mới NGAY.
-- Cách chạy: trigger trên bảng web_* chỉ bật cờ "dirty" → lịch mỗi phút thấy cờ thì gọi https://fipilotai.com/api/revalidate
-- (1 lần / phút dù sửa bao nhiêu dòng). Web kiểm mã bằng hàm web_revalidate_ok (mã nằm trong bảng riêng, khách không đọc được).

create table if not exists public.web_rev (
  id integer primary key default 1 check (id = 1),
  dirty boolean not null default false,
  token text not null default replace(gen_random_uuid()::text, '-', ''),
  last_ping timestamptz,
  last_status integer
);
alter table public.web_rev enable row level security; -- không có quy tắc nào → chỉ hàm security definer / service_role đọc ghi
insert into public.web_rev (id) values (1) on conflict (id) do nothing;
revoke all on table public.web_rev from anon, authenticated;
grant select, insert, update, delete on table public.web_rev to service_role;

-- Web gọi để kiểm mã (khách gọi được nhưng chỉ nhận true / false)
create or replace function public.web_revalidate_ok(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.web_rev where id = 1 and token = p_token and length(coalesce(p_token, '')) >= 16);
$$;
revoke all on function public.web_revalidate_ok(text) from public;
grant execute on function public.web_revalidate_ok(text) to anon, authenticated, service_role;

create or replace function public.web_mark_dirty() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.web_rev set dirty = true where id = 1 and not dirty;
  return null;
end $$;
revoke all on function public.web_mark_dirty() from public, anon, authenticated;

-- Bài / trang: chỉ khi bài đang hiện (hoặc vừa thôi hiện) — bản nháp tự lưu mỗi phút không làm web dựng lại
drop trigger if exists web_rev_posts on public.web_posts;
create trigger web_rev_posts after insert or update or delete on public.web_posts
  for each row when (coalesce(new.status, '') in ('published', 'scheduled') or coalesce(old.status, '') in ('published', 'scheduled'))
  execute function public.web_mark_dirty();

do $$
declare t text;
begin
  foreach t in array array['web_terms', 'web_post_terms', 'web_settings', 'web_menus', 'web_blocks', 'web_calo_pages', 'web_authors'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists web_rev_%1$s on public.%1$I', t);
      execute format('create trigger web_rev_%1$s after insert or update or delete on public.%1$I for each statement execute function public.web_mark_dirty()', t);
    end if;
  end loop;
end $$;

-- app_settings dùng chung với web: Giới thiệu, Điều khoản (giá đọc qua web_plan, đổi ít — để theo giờ)
drop trigger if exists web_rev_app_settings on public.app_settings;
create trigger web_rev_app_settings after insert or update on public.app_settings
  for each row when (new.key in ('about_page', 'terms_content'))
  execute function public.web_mark_dirty();

create or replace function public.web_rev_tick() returns void
language plpgsql security definer set search_path = public as $$
declare r public.web_rev;
begin
  select * into r from public.web_rev where id = 1;
  if r is null or not r.dirty then return; end if;
  update public.web_rev set dirty = false, last_ping = now() where id = 1;
  if exists (select 1 from pg_extension where extname = 'pg_net') then
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      using 'https://fipilotai.com/api/revalidate', '{"Content-Type": "application/json"}'::jsonb, jsonb_build_object('token', r.token);
  end if;
end $$;
revoke all on function public.web_rev_tick() from public, anon, authenticated;
grant execute on function public.web_rev_tick() to service_role;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('web-revalidate', '* * * * *', 'select public.web_rev_tick()');
  end if;
end $$;
