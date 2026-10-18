-- Web fipilotai.com (bản vẽ 137–139): bài viết, trang, chuyên mục/thẻ, trang calo món, menu, khối dùng lại,
-- tác giả, chuyển hướng, nhật ký 404, lịch sử bản sửa, cài đặt web. Khách đọc phần đã đăng; chỉ admin ghi.
-- Không đụng bảng của app.

create or replace function public.is_web_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Chuyên mục & thẻ
create table if not exists public.web_terms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('category','tag')),
  name text not null check (length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references public.web_terms(id) on delete set null,
  description text,
  image_url text,
  seo jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, slug)
);

-- Tác giả (gắn với tài khoản quản trị)
create table if not exists public.web_authors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  job_title text, experience text, bio text, avatar_url text,
  credentials jsonb not null default '[]'::jsonb,
  same_as jsonb not null default '[]'::jsonb,
  show_box boolean not null default true,
  is_reviewer boolean not null default false,
  created_at timestamptz not null default now()
);

-- Bài viết + trang (chung 1 bảng; đường dẫn không trùng giữa bài và trang)
create table if not exists public.web_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'post' check (kind in ('post','page')),
  title text not null check (length(title) between 1 and 300),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft','scheduled','published','trash')),
  blocks jsonb not null default '[]'::jsonb,
  excerpt text,
  cover_url text, cover_alt text,
  author_id uuid references public.web_authors(id) on delete set null,
  reviewer_id uuid references public.web_authors(id) on delete set null,
  primary_term uuid references public.web_terms(id) on delete set null,
  template text,
  parent_id uuid references public.web_posts(id) on delete set null,
  sort int not null default 0,
  pinned boolean not null default false,
  related jsonb not null default '{"mode":"auto","ids":[]}'::jsonb,
  seo jsonb not null default '{}'::jsonb,   -- title, desc, keyword, canonical, noindex, nofollow, og_image, schema
  word_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists web_posts_pub_idx on public.web_posts (kind, status, published_at desc);

create table if not exists public.web_post_terms (
  post_id uuid not null references public.web_posts(id) on delete cascade,
  term_id uuid not null references public.web_terms(id) on delete cascade,
  primary key (post_id, term_id)
);

-- Lịch sử bản sửa (giữ 30 bản / bài — dọn ở hàm save)
create table if not exists public.web_revisions (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.web_posts(id) on delete cascade,
  snapshot jsonb not null,
  reason text not null default 'autosave' check (reason in ('autosave','draft','update','publish','restore','replace')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists web_revisions_post_idx on public.web_revisions (post_id, created_at desc);

-- Trang calo món /calo/<slug> (số calo luôn lấy từ kho món của app, bảng này chỉ giữ phần viết thêm).
-- Mặc định: món Việt (region vn) có khẩu phần đều có trang; dòng enabled=false → tắt (trả 410, bỏ khỏi sitemap).
create table if not exists public.web_calo_pages (
  food_key text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  enabled boolean not null default false,
  intro text, image_url text, image_alt text,
  portions jsonb,            -- null = dùng khẩu phần của app
  faq jsonb not null default '[]'::jsonb,
  related jsonb not null default '[]'::jsonb,
  noindex boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Menu theo vị trí: header, mobile, footer_1..3
create table if not exists public.web_menus (
  location text primary key check (location ~ '^[a-z0-9_]+$'),
  name text not null,
  items jsonb not null default '[]'::jsonb,  -- [{label,url,type,ref,new_tab,nofollow,style,children:[...]}]
  updated_at timestamptz not null default now()
);

-- Khối dùng lại
create table if not exists public.web_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'block' check (kind in ('block','template')),
  blocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Chuyển hướng
create table if not exists public.web_redirects (
  id uuid primary key default gen_random_uuid(),
  src text not null unique check (src ~ '^/'),
  dest text,
  code int not null default 301 check (code in (301,302,410)),
  match text not null default 'exact' check (match in ('exact','prefix')),
  hits int not null default 0,
  last_hit timestamptz,
  source text not null default 'manual' check (source in ('manual','slug_change','permalink','calo_off','import')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Nhật ký 404
create table if not exists public.web_404 (
  path text primary key check (length(path) <= 500),
  hits int not null default 1,
  referrer text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  ignored boolean not null default false
);

-- Cài đặt web (công khai: tên web, liên hệ, mã xác minh, robots…) — KHÔNG để khoá bí mật ở đây
create table if not exists public.web_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ===== RLS =====
alter table public.web_terms enable row level security;
alter table public.web_authors enable row level security;
alter table public.web_posts enable row level security;
alter table public.web_post_terms enable row level security;
alter table public.web_revisions enable row level security;
alter table public.web_calo_pages enable row level security;
alter table public.web_menus enable row level security;
alter table public.web_blocks enable row level security;
alter table public.web_redirects enable row level security;
alter table public.web_404 enable row level security;
alter table public.web_settings enable row level security;

create policy web_terms_read on public.web_terms for select using (true);
create policy web_authors_read on public.web_authors for select using (true);
create policy web_posts_read on public.web_posts for select
  using ((status in ('published','scheduled') and published_at <= now()) or public.is_web_admin());
create policy web_post_terms_read on public.web_post_terms for select using (true);
create policy web_calo_read on public.web_calo_pages for select using (true);  -- không có gì bí mật; cần đọc cả dòng tắt để trả 410
create policy web_menus_read on public.web_menus for select using (true);
create policy web_blocks_read on public.web_blocks for select using (true);
create policy web_redirects_read on public.web_redirects for select using (enabled or public.is_web_admin());
create policy web_settings_read on public.web_settings for select using (true);
create policy web_revisions_admin on public.web_revisions for select using (public.is_web_admin());
create policy web_404_admin on public.web_404 for select using (public.is_web_admin());

do $$ declare t text; begin
  foreach t in array array['web_terms','web_authors','web_posts','web_post_terms','web_revisions','web_calo_pages','web_menus','web_blocks','web_redirects','web_404','web_settings'] loop
    execute format('create policy %I on public.%I for insert with check (public.is_web_admin())', t || '_ins', t);
    execute format('create policy %I on public.%I for update using (public.is_web_admin()) with check (public.is_web_admin())', t || '_upd', t);
    execute format('create policy %I on public.%I for delete using (public.is_web_admin())', t || '_del', t);
  end loop;
end $$;

-- Ghi 404 từ máy chủ web (gọi bằng khoá anon): cộng lượt, giới hạn 500 ký tự, tối đa 5.000 đường dẫn.
create or replace function public.log_web_404(p_path text, p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_path is null or length(p_path) > 500 or p_path !~ '^/' then return; end if;
  if not exists (select 1 from web_404 where path = p_path) and (select count(*) from web_404) >= 5000 then return; end if;
  insert into web_404 (path, referrer) values (p_path, left(p_ref, 500))
  on conflict (path) do update set hits = web_404.hits + 1, last_seen = now(), referrer = coalesce(left(excluded.referrer, 500), web_404.referrer);
end $$;
revoke all on function public.log_web_404(text, text) from public;
grant execute on function public.log_web_404(text, text) to anon, authenticated;

-- Đếm lượt chuyển hướng
create or replace function public.hit_web_redirect(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update web_redirects set hits = hits + 1, last_hit = now() where id = p_id and enabled;
$$;
revoke all on function public.hit_web_redirect(uuid) from public;
grant execute on function public.hit_web_redirect(uuid) to anon, authenticated;

-- Đổi đường dẫn bài đã đăng → tự tạo 301 từ đường cũ
create or replace function public.web_posts_slug_redirect() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.slug is distinct from new.slug and old.status = 'published' then
    insert into web_redirects (src, dest, code, source) values ('/' || old.slug, '/' || new.slug, 301, 'slug_change')
    on conflict (src) do update set dest = excluded.dest, enabled = true;
    update web_redirects set dest = '/' || new.slug where dest = '/' || old.slug;  -- tránh chuyển 2 lần
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists web_posts_slug_redirect on public.web_posts;
create trigger web_posts_slug_redirect before update on public.web_posts for each row execute function public.web_posts_slug_redirect();

-- Giữ 30 bản sửa mới nhất mỗi bài
create or replace function public.web_revisions_trim() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from web_revisions where post_id = new.post_id and id not in (select id from web_revisions where post_id = new.post_id order by created_at desc limit 30);
  return null;
end $$;
drop trigger if exists web_revisions_trim on public.web_revisions;
create trigger web_revisions_trim after insert on public.web_revisions for each row execute function public.web_revisions_trim();

-- Menu mặc định (theo bản vẽ 137/138g)
insert into public.web_menus (location, name, items) values
 ('header', 'Menu đầu trang', '[{"label":"Giảm cân","url":"/chu-de/giam-can"},{"label":"Thực đơn","url":"/chu-de/thuc-don"},{"label":"Bảng calo món","url":"/bang-calo"},{"label":"Kiến thức","url":"/chu-de/kien-thuc"},{"label":"Bảng giá","url":"/bang-gia"},{"label":"Dùng thử miễn phí","url":"https://app.fipilotai.com/?ref=header","style":"button"}]'),
 ('footer_1', 'Chân trang · Chủ đề', '[{"label":"Giảm cân","url":"/chu-de/giam-can","icon":"scale"},{"label":"Thực đơn giảm cân","url":"/chu-de/thuc-don","icon":"menu"},{"label":"Bảng calo món Việt","url":"/bang-calo","icon":"table"},{"label":"Kiến thức dinh dưỡng","url":"/chu-de/kien-thuc","icon":"book"}]'),
 ('footer_2', 'Chân trang · Fipilot AI', '[{"label":"Giới thiệu","url":"/gioi-thieu","icon":"info"},{"label":"Bảng giá","url":"/bang-gia","icon":"tag"},{"label":"Cài app lên điện thoại","url":"/cai-app","icon":"phone"},{"label":"Liên hệ","url":"/lien-he","icon":"chat"}]'),
 ('footer_3', 'Chân trang · Chính sách', '[{"label":"Điều khoản sử dụng","url":"/dieu-khoan","icon":"doc"},{"label":"Chính sách riêng tư","url":"/chinh-sach-rieng-tu","icon":"shield"}]')
on conflict (location) do nothing;

insert into public.web_settings (key, value) values
 ('site', '{"name":"Fipilot AI","tagline":"Giảm cân bằng món Việt","url":"https://fipilotai.com","app_url":"https://app.fipilotai.com","posts_per_page":12,"title_tpl":"%title% | %site%"}'),
 ('contact', '{"email":"mrvietanh1988@gmail.com","phone":"0967 838 989","zalo":"","facebook":"","tiktok":"","youtube":""}'),
 ('footer', '{"about":"Giảm cân bằng món Việt quen thuộc — app lo phần tính, bạn chỉ việc ăn theo.","copyright":"© %year% Fipilot AI","note":"Số calo tham khảo từ kho món Fipilot AI · không thay thế tư vấn bác sĩ","popular_foods":["phở bò","cơm tấm","bánh mì thịt","bún chả","bún bò huế","bánh cuốn","cháo gà"],"show_app_card":true}'),
 ('seo', '{"permalink":"name","cat_base":"chu-de","tag_base":"the","calo_base":"calo","sitemap":{"post":true,"page":true,"category":true,"tag":false,"calo":true,"author":true,"images":true},"robots_extra":"Disallow: /api/\nDisallow: /tim-kiem\n","allow_ai_bots":true,"org":{"type":"Organization","name":"Fipilot AI"}}'),
 ('tracking', '{"gsc":"","bing":"","fb_domain":"","ga4":"","fb_pixel":"","vercel_analytics":true,"head":"","body_start":"","body_end":""}'),
 ('notice_bar', '{"enabled":false,"text":"","url":"","from":null,"to":null}'),
 ('maintenance', '{"enabled":false}')
on conflict (key) do nothing;
