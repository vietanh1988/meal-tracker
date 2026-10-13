-- Fipilot: nước uống, giờ bữa, nhắc nhở, cờ tài khoản test.
-- Chỉ THÊM cột (không sửa/xoá gì), chạy lại nhiều lần vẫn an toàn.
alter table public.daily_logs add column if not exists water_ml integer not null default 0;
alter table public.daily_logs drop constraint if exists daily_logs_water_ml_check;
alter table public.daily_logs add constraint daily_logs_water_ml_check check (water_ml between 0 and 10000);

alter table public.profiles add column if not exists meal_times jsonb;          -- {"sang":"07:00",...}; null = giờ mặc định
alter table public.profiles add column if not exists water_goal_ml integer;     -- null = tự tính 35 ml/kg (+500 ngày tập)
alter table public.profiles add column if not exists reminder_settings jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists is_test boolean not null default false;

select 'ok' as ket_qua;
