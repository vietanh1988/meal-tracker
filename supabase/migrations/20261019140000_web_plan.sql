-- Web fipilotai.com đọc giá + ngày dùng thử + lượt AI từng gói (Quản trị › Gói cước & giới hạn) mà KHÔNG mở bảng subscription_settings cho khách
-- (bảng có thông tin tài khoản ngân hàng, khách không được đọc). Hàm chỉ trả các cột công khai.
create or replace function public.web_plan()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'price_1m', price_1m, 'price_3m', price_3m, 'price_6m', price_6m, 'price_12m', price_12m, 'trial_days', trial_days,
    'free_ai_macro_limit', free_ai_macro_limit, 'free_ai_chat_limit', free_ai_chat_limit, 'free_ai_menu_limit', free_ai_menu_limit, 'free_ai_photo_limit', free_ai_photo_limit,
    'premium_ai_macro_limit', premium_ai_macro_limit, 'premium_ai_chat_limit', premium_ai_chat_limit, 'premium_ai_menu_limit', premium_ai_menu_limit, 'premium_ai_photo_limit', premium_ai_photo_limit)
  from subscription_settings where id = 1
$$;
revoke all on function public.web_plan() from public;
grant execute on function public.web_plan() to anon, authenticated;
