-- Dữ liệu tối thiểu cho Supabase LOCAL (CI/E2E). Không có dữ liệu người dùng thật.
insert into public.app_settings (key, value) values
  ('app_version', '3.7.4'),
  ('ai_provider', 'gpt'),
  ('feature_flags', '{"ai_chat":true,"ai_macro":true,"ai_menu_gen":true,"push":false,"sales_enabled":false,"registration_enabled":true,"template_library":false,"photo_macro":true}'),
  ('meal_config', '{"train":["sang","trua","phu_chieu","pre","toi"],"rest":["sang","trua","phu_chieu","toi"]}'),
  ('notifications', '[]')
on conflict (key) do nothing;
