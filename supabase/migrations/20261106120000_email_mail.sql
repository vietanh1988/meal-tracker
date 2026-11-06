-- 06/11: thư gửi người dùng (hàm send-mail, Resend). email_optout = người bấm "Không nhận thư như này nữa";
-- email_sends = nhật ký mỗi thư đã gửi theo đợt (chạy lại không gửi trùng). Chỉ hàm (service_role) đọc / ghi.
create table if not exists public.email_optout (
  email text primary key,
  created_at timestamptz not null default now()
);
create table if not exists public.email_sends (
  id bigserial primary key,
  campaign text not null,
  email text not null,
  user_id uuid,
  resend_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (campaign, email)
);
alter table public.email_optout enable row level security;
alter table public.email_sends enable row level security;
drop policy if exists email_sends_admin_read on public.email_sends;
create policy email_sends_admin_read on public.email_sends for select to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin));
drop policy if exists email_optout_admin_read on public.email_optout;
create policy email_optout_admin_read on public.email_optout for select to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin));
grant select, insert, update, delete on public.email_optout to authenticated, service_role;
grant select, insert, update, delete on public.email_sends to authenticated, service_role;
grant usage, select on sequence public.email_sends_id_seq to authenticated, service_role;
