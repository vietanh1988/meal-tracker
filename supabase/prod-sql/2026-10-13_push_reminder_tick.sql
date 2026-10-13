-- Chạy trên PROD sau khi đã deploy edge function push-meal-reminder bản v9 (có type "tick").
-- Đổi nhắc bữa từ giờ cố định cho mọi người sang theo cài đặt Nhắc nhở của từng người (cron mỗi phút).
-- Không chứa secret: lệnh mới được chép từ job cũ push-reminder-trua, chỉ đổi 'trua' → 'tick'.

-- 1) Thêm job mỗi phút
select cron.schedule(
  'push-reminder-tick',
  '* * * * *',
  replace((select command from cron.job where jobname = 'push-reminder-trua'), '''type'', ''trua''', '''type'', ''tick''')
);

-- 2) Kiểm tra job mới đúng type tick (phải ra 1 dòng, has_tick = true)
select jobname, schedule, command like '%''type'', ''tick''%' as has_tick from cron.job where jobname = 'push-reminder-tick';

-- 3) Tắt các job nhắc bữa giờ cố định cũ (streak + weekly giữ nguyên)
select cron.unschedule(jobname) from cron.job
where jobname in ('push-reminder-sang', 'push-reminder-phu-sang', 'push-reminder-trua', 'push-reminder-phu-chieu', 'push-reminder-toi');
