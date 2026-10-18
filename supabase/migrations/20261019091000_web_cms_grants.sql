-- Bổ sung cho 20261019090000_web_cms: prod không tự cấp quyền cho bảng mới → cấp rõ ràng.
-- Khách (anon) chỉ ĐỌC; tài khoản đăng nhập được gửi lệnh ghi nhưng RLS chỉ cho admin (is_web_admin) ghi thật.
do $$ declare t text; begin
  foreach t in array array['web_terms','web_authors','web_posts','web_post_terms','web_revisions','web_calo_pages','web_menus','web_blocks','web_redirects','web_404','web_settings'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant execute on function public.is_web_admin() to anon, authenticated;
grant execute on function public.log_web_404(text, text) to anon, authenticated;
grant execute on function public.hit_web_redirect(uuid) to anon, authenticated;
