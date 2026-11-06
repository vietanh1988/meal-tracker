-- 06/11 (chủ dự án chốt "Cụm chủ đề SEO" + bản vẽ): trang món /calo/… và trang bài tập /bai-tap/… tự hiện bài viết có nhắc món / bài tập đó.
-- Tìm trong nội dung bài (blocks) bằng các cụm chữ web gửi lên (tên món, tên bài tập, "ex": "<mã bài tập>").
-- security invoker: chạy theo quyền người gọi nên RLS web_posts vẫn áp (khách chỉ thấy bài đã đăng / tới giờ đăng).
create or replace function public.web_mentions(p_pats text[], p_limit int default 6)
returns table (id uuid, slug text, title text, cover_url text, cover_alt text, primary_term uuid, published_at timestamptz)
language sql stable security invoker set search_path = public, pg_temp as $$
  select p.id, p.slug, p.title, p.cover_url, p.cover_alt, p.primary_term, p.published_at
    from public.web_posts p
   where p.kind = 'post' and p.status in ('published', 'scheduled')
     and coalesce(array_length(p_pats, 1), 0) > 0
     and exists (select 1 from unnest(p_pats) x where length(x) >= 3 and (p.blocks::text ilike '%' || x || '%' or p.title ilike '%' || x || '%'))
   order by (select count(*) from unnest(p_pats) x where length(x) >= 3 and p.title ilike '%' || x || '%') desc, p.published_at desc
   limit least(greatest(coalesce(p_limit, 6), 1), 12)
$$;
revoke all on function public.web_mentions(text[], int) from public;
grant execute on function public.web_mentions(text[], int) to anon, authenticated, service_role;
