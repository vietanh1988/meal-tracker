-- 20/11 (Vercel CPU vẫn ~6–15 phút/ngày dù khách thật chỉ vài lượt): web lưu đệm 1 giờ nên bot quét lại mỗi giờ
-- là dựng lại cả web. Web đổi sang lưu đệm 7 ngày, chỉ làm mới khi dữ liệu đổi → phải báo đủ mọi chỗ đổi dữ liệu:
--  (1) bài hẹn giờ tới giờ đăng (không có dòng nào bị sửa, chỉ là published_at <= now() bắt đầu đúng) → lịch mỗi phút tự xét;
--  (2) giá gói (subscription_settings, web đọc qua web_plan) và số calo đã sửa (food_overrides) — trước đây chờ hết 1 giờ.

alter table public.web_rev add column if not exists sched_at timestamptz;

create or replace function public.web_rev_tick() returns void
language plpgsql security definer set search_path = public as $$
declare r public.web_rev;
begin
  select * into r from public.web_rev where id = 1;
  if r is null then return; end if;
  -- bài hẹn giờ vừa tới giờ đăng kể từ lần xét trước (lần đầu: 2 phút gần nhất)
  if exists (select 1 from public.web_posts
             where status in ('published', 'scheduled')
               and published_at > coalesce(r.sched_at, now() - interval '2 minutes') and published_at <= now()) then
    r.dirty := true;
  end if;
  update public.web_rev set sched_at = now() where id = 1;
  if not r.dirty then return; end if;
  update public.web_rev set dirty = false, last_ping = now() where id = 1;
  if exists (select 1 from pg_extension where extname = 'pg_net') then
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      using 'https://fipilotai.com/api/revalidate', '{"Content-Type": "application/json"}'::jsonb, jsonb_build_object('token', r.token);
  end if;
end $$;
revoke all on function public.web_rev_tick() from public, anon, authenticated;
grant execute on function public.web_rev_tick() to service_role;

do $$
declare t text;
begin
  foreach t in array array['subscription_settings', 'food_overrides'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists web_rev_%1$s on public.%1$I', t);
      execute format('create trigger web_rev_%1$s after insert or update or delete on public.%1$I for each statement execute function public.web_mark_dirty()', t);
    end if;
  end loop;
end $$;
