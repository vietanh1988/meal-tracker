-- Chặn user tự sửa các cột quyền / gói cước / bộ đếm AI trong hồ sơ của chính mình.
-- Trước đây policy cho user UPDATE mọi cột của dòng mình → tự đặt is_admin = true,
-- tier = 'premium', reset bộ đếm AI… được.
-- Được phép sửa các cột này: admin (is_admin_user()), service role / cron / SQL editor
-- (không có auth.uid()). User thường sửa → báo lỗi, các cột khác vẫn sửa bình thường.
-- Chạy lại nhiều lần vẫn an toàn.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service role, cron, SQL editor, trigger đăng ký (handle_new_user): không có user
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  -- admin được sửa
  if public.is_admin_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- user tự tạo hồ sơ (hiếm, khi trigger đăng ký chưa tạo): ép giá trị mặc định an toàn
    new.is_admin := false;
    new.admin_role := null;
    new.is_locked := false;
    new.is_test := false;
    new.tier := 'trial';
    new.subscription_end_date := null;
    new.trial_end_date := current_date + coalesce((select trial_days from subscription_settings where id = 1), 90);
    new.admin_notes := null;
    new.ai_macro_count_this_month := 0;
    new.ai_chat_count_today := 0;
    new.ai_menu_count_today := 0;
    new.ai_photo_count_this_month := 0;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin
     or new.admin_role is distinct from old.admin_role
     or new.is_locked is distinct from old.is_locked
     or new.is_test is distinct from old.is_test
     or new.tier is distinct from old.tier
     or new.trial_end_date is distinct from old.trial_end_date
     or new.subscription_end_date is distinct from old.subscription_end_date
     or new.admin_notes is distinct from old.admin_notes
     or new.ai_macro_count_this_month is distinct from old.ai_macro_count_this_month
     or new.ai_macro_count_reset_at is distinct from old.ai_macro_count_reset_at
     or new.ai_chat_count_today is distinct from old.ai_chat_count_today
     or new.ai_chat_count_reset_at is distinct from old.ai_chat_count_reset_at
     or new.ai_menu_count_today is distinct from old.ai_menu_count_today
     or new.ai_menu_count_reset_at is distinct from old.ai_menu_count_reset_at
     or new.ai_menu_last_call_at is distinct from old.ai_menu_last_call_at
     or new.ai_chat_last_call_at is distinct from old.ai_chat_last_call_at
     or new.ai_photo_count_this_month is distinct from old.ai_photo_count_this_month
     or new.ai_photo_count_reset_at is distinct from old.ai_photo_count_reset_at
  then
    raise exception 'Không được sửa quyền / gói cước / bộ đếm AI' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_columns();

select 'ok' as ket_qua;
