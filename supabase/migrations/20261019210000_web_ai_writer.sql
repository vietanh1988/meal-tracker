-- AI viết bài (Quản trị › WEB · NỘI DUNG › AI viết bài): hàng chờ viết từng bài, cài đặt, khoá riêng.
-- Hàm web-writer (service role) chạy mỗi phút qua pg_cron (lịch đặt riêng trên prod: supabase/prod/web_writer_cron.sql).

-- 1) Khoá chỉ ghi: thêm khoá Claude riêng cho viết bài + khoá fal.ai (vẽ ảnh Flux)
CREATE OR REPLACE FUNCTION public.admin_set_ai_key(p_name text, p_value text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin AND admin_role = 'super') THEN RAISE EXCEPTION 'Chỉ Super Admin'; END IF;
  IF p_name NOT IN ('claude_key', 'gpt_key', 'gemini_key', 'claude_writer_key', 'fal_key') THEN RAISE EXCEPTION 'Khoá không hợp lệ'; END IF;
  p_value := btrim(coalesce(p_value, ''));
  IF char_length(p_value) < 20 OR char_length(p_value) > 400 THEN RAISE EXCEPTION 'Khoá không hợp lệ'; END IF;
  INSERT INTO app_settings (key, value, updated_at) VALUES (p_name, p_value, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN right(p_value, 4);
END $$;

CREATE OR REPLACE FUNCTION public.admin_ai_key_status()
RETURNS TABLE (name text, is_set boolean, last4 text, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  RETURN QUERY SELECT k.n, coalesce(char_length(s.value), 0) > 0, CASE WHEN char_length(s.value) > 0 THEN right(s.value, 4) END, s.updated_at
    FROM unnest(ARRAY['claude_key', 'gpt_key', 'gemini_key', 'claude_writer_key', 'fal_key']) AS k(n) LEFT JOIN app_settings s ON s.key = k.n;
END $$;

-- 2) Cài đặt AI viết bài (1 dòng, chỉ admin web đọc / ghi — không để ở web_settings vì bảng đó công khai)
create table if not exists public.web_ai_config (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.web_ai_config (id) values (1) on conflict do nothing;
alter table public.web_ai_config enable row level security;
drop policy if exists web_ai_config_all on public.web_ai_config;
create policy web_ai_config_all on public.web_ai_config for all using (public.is_web_admin()) with check (public.is_web_admin());
grant select, insert, update on public.web_ai_config to authenticated;

-- 3) Hàng chờ: mỗi dòng = 1 bài. Chạy lần lượt (bài cũ nhất chưa xong trước), mỗi lần chạy 1 bước ngắn.
create table if not exists public.web_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  keyword text not null check (char_length(btrim(keyword)) between 2 and 200),
  term_id uuid references public.web_terms(id) on delete set null,
  auto_term boolean not null default false,
  notes text,
  model text not null,
  status text not null default 'queued' check (status in ('queued','research','writing','fixing','images','saving','done','error','canceled')),
  state jsonb not null default '{}'::jsonb,
  post_id uuid references public.web_posts(id) on delete set null,
  in_tok int not null default 0,
  out_tok int not null default 0,
  searches int not null default 0,
  images int not null default 0,
  reused int not null default 0,
  cost_text numeric(12,6) not null default 0,
  cost_img numeric(12,6) not null default 0,
  error text,
  attempts int not null default 0,
  locked_until timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists web_ai_jobs_created_idx on public.web_ai_jobs (created_at desc);
create index if not exists web_ai_jobs_open_idx on public.web_ai_jobs (created_at) where status not in ('done','error','canceled');
alter table public.web_ai_jobs enable row level security;
drop policy if exists web_ai_jobs_all on public.web_ai_jobs;
create policy web_ai_jobs_all on public.web_ai_jobs for all using (public.is_web_admin()) with check (public.is_web_admin());
grant select, insert, update, delete on public.web_ai_jobs to authenticated;

-- 4) Lấy bài kế tiếp để chạy (chỉ service role): đúng 1 bài một lúc, khoá 170 giây để 2 lần chạy không đụng nhau
create or replace function public.web_ai_claim() returns setof public.web_ai_jobs
language plpgsql security definer set search_path = public, pg_temp as $$
declare j public.web_ai_jobs;
begin
  select * into j from public.web_ai_jobs where status not in ('done','error','canceled') order by created_at limit 1 for update skip locked;
  if not found or (j.locked_until is not null and j.locked_until > now()) then return; end if;
  update public.web_ai_jobs set locked_until = now() + interval '170 seconds', started_at = coalesce(started_at, now()), updated_at = now()
    where id = j.id returning * into j;
  return next j;
end $$;
revoke all on function public.web_ai_claim() from public, anon, authenticated;
grant execute on function public.web_ai_claim() to service_role;

-- 5) Mã bí mật cho lịch chạy mỗi phút (lưu trong vault; hàm hỏi lại qua RPC chỉ service role gọi được)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'supabase_vault')
     and not exists (select 1 from vault.secrets where name = 'web_writer_cron') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'web_writer_cron', 'Mã gọi web-writer từ pg_cron');
  end if;
exception when others then null; -- máy chưa có vault (CI) thì bỏ qua
end $$;
create or replace function public.web_writer_cron_ok(p text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare s text;
begin
  begin select decrypted_secret into s from vault.decrypted_secrets where name = 'web_writer_cron'; exception when others then return false; end;
  return s is not null and p is not null and s = p;
end $$;
revoke all on function public.web_writer_cron_ok(text) from public, anon, authenticated;
grant execute on function public.web_writer_cron_ok(text) to service_role;
