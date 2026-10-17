-- 18/10: hàm nhắc bữa (push-meal-reminder, chạy bằng service_role) bị 403 mỗi giờ khi đọc daily_logs / weight_logs
-- vì service_role thiếu quyền SELECT → không biết ai đã ghi bữa / đã cân, có thể nhắc nhầm.
grant select on table public.daily_logs to service_role;
grant select on table public.weight_logs to service_role;
