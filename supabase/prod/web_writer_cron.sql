-- CHỈ chạy trên prod (đã chạy 19/10 qua connector): gọi hàm web-writer mỗi phút để chạy hàng chờ AI viết bài.
-- Mã bí mật lấy từ vault (tạo ở migration 20261019210000_web_ai_writer.sql), không ghi thẳng vào lệnh.
select cron.unschedule('web-writer-tick') where exists (select 1 from cron.job where jobname = 'web-writer-tick');
select cron.schedule('web-writer-tick', '* * * * *', $$
  select net.http_post(
    url := 'https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/web-writer',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('action', 'tick', 'secret', (select decrypted_secret from vault.decrypted_secrets where name = 'web_writer_cron')),
    timeout_milliseconds := 160000
  )
  where exists (select 1 from public.web_ai_jobs where status not in ('done','error','canceled'));
$$);
