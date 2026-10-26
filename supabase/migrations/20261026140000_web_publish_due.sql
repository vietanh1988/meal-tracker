-- 26/10 (chủ dự án: "bài đã đặt lịch mà chưa đăng"): bài Hẹn giờ tới giờ thì web đã hiện (quyền đọc cho published_at <= now()),
-- nhưng trạng thái vẫn ghi "scheduled" → Quản trị hiện "Hẹn …" như chưa đăng. Hàm + lịch chạy mỗi 5 phút đổi sang "published".
create or replace function public.web_publish_due() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.web_posts set status = 'published' where status = 'scheduled' and published_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.web_publish_due() from public, anon, authenticated;
grant execute on function public.web_publish_due() to service_role;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('web-publish-due', '*/5 * * * *', 'select public.web_publish_due()');
  end if;
end $$;
