-- Thống kê web tự đếm (Quản trị PC › WEB › Thống kê web, bản vẽ 138u · phương án 1).
-- Gộp theo ngày giờ VN × đường dẫn × nguồn khách: không lưu IP, không lưu từng khách.
create table if not exists public.web_stats_daily (
  day date not null,
  path text not null check (path ~ '^/' and length(path) <= 300),
  src text not null check (src in ('google','facebook','zalo','direct','other')),
  views int not null default 0,
  visitors int not null default 0,  -- lượt mở đầu tiên trong ngày của 1 trình duyệt
  app int not null default 0,       -- bấm sang app.fipilotai.com
  primary key (day, path, src)
);
create index if not exists web_stats_daily_day_idx on public.web_stats_daily (day);
alter table public.web_stats_daily enable row level security;
drop policy if exists web_stats_admin on public.web_stats_daily;
create policy web_stats_admin on public.web_stats_daily for select using (public.is_web_admin());
grant select on public.web_stats_daily to authenticated;

-- Web gọi khi khách xem trang (p_kind 'view') hoặc bấm nút sang app (p_kind 'app')
create or replace function public.web_hit(p_path text, p_src text, p_kind text default 'view', p_new boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; s text; p text;
begin
  p := left(split_part(coalesce(p_path, '/'), '?', 1), 300);
  if p !~ '^/' or p ~ '^/(api|_next|anh|img)/' then return; end if;
  s := case when p_src in ('google','facebook','zalo','direct','other') then p_src else 'other' end;
  -- chặn ghi bừa: tối đa 3.000 dòng / ngày
  if not exists (select 1 from web_stats_daily where day = d and path = p and src = s)
     and (select count(*) from web_stats_daily where day = d) >= 3000 then return; end if;
  insert into web_stats_daily as w (day, path, src, views, visitors, app)
  values (d, p, s, case when p_kind = 'app' then 0 else 1 end, case when p_kind <> 'app' and p_new then 1 else 0 end, case when p_kind = 'app' then 1 else 0 end)
  on conflict (day, path, src) do update set
    views = w.views + excluded.views, visitors = w.visitors + excluded.visitors, app = w.app + excluded.app;
end $$;
revoke all on function public.web_hit(text, text, text, boolean) from public;
grant execute on function public.web_hit(text, text, text, boolean) to anon, authenticated;
