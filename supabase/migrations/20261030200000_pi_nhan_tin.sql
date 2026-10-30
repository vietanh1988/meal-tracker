-- 30/10 (đợt 2 làm nốt, bản vẽ màn 9): lời nhắn chọn sẵn khi ghé phòng bạn + thông báo điện thoại cho việc bạn bè.
-- Lời nhắn: 1 câu / người gửi / người nhận / ngày, chỉ bạn bè, chỉ câu có sẵn (không gõ tự do → không cần kiểm duyệt).
--   Danh sách câu = PI_NOTES dưới đây, app chép y hệt ở src/pet/piNotes.js (test so 2 bản).
-- Thông báo (qua hàm send-push sẵn có): có người muốn kết bạn · đồng ý kết bạn · thả tim · nhắn Pi. Tối đa 5 thông báo bạn bè / người / ngày.
--   Khoá gửi lấy từ Vault (tên 'push_secret'); chưa có khoá hoặc máy không có pg_net thì bỏ qua, không lỗi.

create table if not exists public.pi_notes (
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  msg smallint not null check (msg between 0 and 7),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  primary key (from_id, to_id, day)
);
create index if not exists pi_notes_to on public.pi_notes (to_id, created_at desc);
create table if not exists public.pi_push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.pi_notes enable row level security;
alter table public.pi_push_log enable row level security;
drop policy if exists pi_notes_own on public.pi_notes;
create policy pi_notes_own on public.pi_notes for select to authenticated using (from_id = (select auth.uid()) or to_id = (select auth.uid()) or (select public.is_admin_user()));
grant select on public.pi_notes to authenticated;
grant select, insert, update, delete on public.pi_notes to service_role;
grant select, insert, update, delete on public.pi_push_log to service_role;

-- PI_NOTES (giữ đúng thứ tự, app dùng số thứ tự)
create or replace function public.pi_note_text(p_i int) returns text
language sql immutable as $$
  select (array['Pi đẹp quá!', 'Cố lên nha!', 'Uống nước đi nè', 'Mai ăn sáng đúng giờ nha', 'Hôm nay chăm Pi chưa?', 'Tuần này mình đua tiếp nha', 'Nhớ cân tuần này nha', 'Pi của bạn dễ thương ghê'])[p_i + 1]
$$;

-- gửi 1 thông báo bạn bè (tối đa 5 / người / ngày); lỗi gửi không làm hỏng việc chính
create or replace function public.pi_push(p_uid uuid, p_title text, p_body text, p_url text default '/?pi=social&from=push') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_secret text; v_day date := public.pet_day(); v_n int;
begin
  if p_uid is null or not exists (select 1 from public.push_subscriptions where user_id = p_uid) then return; end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return; end if;
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v_secret using 'push_secret';
  exception when others then v_secret := null;
  end;
  if v_secret is null then return; end if;
  insert into public.pi_push_log (user_id, day, n) values (p_uid, v_day, 1)
    on conflict (user_id, day) do update set n = public.pi_push_log.n + 1 returning n into v_n;
  if v_n > 5 then return; end if;
  begin
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      using 'https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/send-push', '{"Content-Type": "application/json"}'::jsonb,
            jsonb_build_object('secret', v_secret, 'user_id', p_uid, 'title', p_title, 'body', coalesce(p_body, ''), 'url', p_url);
  exception when others then null;
  end;
end $$;
revoke all on function public.pi_push(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.pi_name(p_uid uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$ select coalesce((select name from public.pet_profiles where user_id = p_uid), 'Pi') $$;
revoke all on function public.pi_name(uuid) from public, anon, authenticated;

-- nhắn Pi của bạn: 1 câu / ngày / người
create or replace function public.pi_note(p_nick text, p_msg int) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_msg is null or p_msg < 0 or p_msg > 7 then return jsonb_build_object('ok', false, 'why', 'msg'); end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null or not public.pi_is_friend(v_uid, v_o) then return jsonb_build_object('ok', false, 'why', 'friend'); end if;
  insert into public.pi_notes (from_id, to_id, day, msg) values (v_uid, v_o, public.pet_day(), p_msg) on conflict do nothing;
  if not found then return jsonb_build_object('ok', false, 'why', 'today'); end if;
  perform public.pi_push(v_o, public.pi_name(v_uid) || ' nhắn cho Pi', public.pi_note_text(p_msg));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.pi_note(text, int) from public, anon;
grant execute on function public.pi_note(text, int) to authenticated;

-- lời nhắn nhận được (14 ngày gần nhất) + đánh dấu đã đọc
create or replace function public.pi_notes_list() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v jsonb;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select coalesce(jsonb_agg(coalesce(public.pi_card(n.from_id), '{}'::jsonb) || jsonb_build_object('msg', n.msg, 'text', public.pi_note_text(n.msg), 'day', n.day, 'new', n.read_at is null) order by n.created_at desc), '[]'::jsonb)
    into v from (select * from public.pi_notes where to_id = v_uid and day >= public.pet_day() - 13 order by created_at desc limit 20) n;
  update public.pi_notes set read_at = now() where to_id = v_uid and read_at is null;
  return v;
end $$;
revoke all on function public.pi_notes_list() from public, anon;
grant execute on function public.pi_notes_list() to authenticated;

-- đã nhắn cho bạn này hôm nay chưa (màn phòng của bạn)
create or replace function public.pi_note_sent(p_nick text) returns integer
language sql stable security definer set search_path = public, pg_temp as $$
  select n.msg::int from public.pi_notes n join public.pi_share s on s.user_id = n.to_id
   where n.from_id = auth.uid() and s.nick = lower(trim(coalesce(p_nick, ''))) and n.day = public.pet_day()
$$;
revoke all on function public.pi_note_sent(text) from public, anon;
grant execute on function public.pi_note_sent(text) to authenticated;

-- thông báo khi có lời mời / đồng ý kết bạn / thả tim (bọc lại hàm cũ, giữ nguyên cách tính)
create or replace function public.pi_friend_add(p_code text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid; f public.pi_friends;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform public.pi_share_ensure(v_uid);
  select user_id into v_o from public.pi_share where code = upper(trim(coalesce(p_code, '')));
  if v_o is null then return jsonb_build_object('ok', false, 'why', 'code'); end if;
  if v_o = v_uid then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  if (select count(*) from public.pi_friends where (a = v_uid or b = v_uid)) >= 200 then return jsonb_build_object('ok', false, 'why', 'full'); end if;
  select * into f from public.pi_friends where a = least(v_uid, v_o) and b = greatest(v_uid, v_o);
  if found then
    if f.status = 'pending' and f.by_user = v_o then
      update public.pi_friends set status = 'ok' where a = f.a and b = f.b;
      perform public.pi_push(v_o, public.pi_name(v_uid) || ' đã kết bạn với bạn', 'Ghé phòng Pi của nhau, thả tim, đua xếp hạng tuần nha');
      return jsonb_build_object('ok', true, 'status', 'ok', 'name', public.pi_name(v_o));
    end if;
    return jsonb_build_object('ok', true, 'status', f.status, 'name', public.pi_name(v_o));
  end if;
  insert into public.pi_friends (a, b, status, by_user) values (least(v_uid, v_o), greatest(v_uid, v_o), 'pending', v_uid);
  perform public.pi_push(v_o, public.pi_name(v_uid) || ' muốn kết bạn', 'Mở Bạn bè & Xếp hạng để đồng ý');
  return jsonb_build_object('ok', true, 'status', 'pending', 'name', public.pi_name(v_o));
end $$;
revoke all on function public.pi_friend_add(text) from public, anon;
grant execute on function public.pi_friend_add(text) to authenticated;

create or replace function public.pi_friend_answer(p_nick text, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null then return jsonb_build_object('ok', false); end if;
  if p_accept then
    update public.pi_friends set status = 'ok' where a = least(v_uid, v_o) and b = greatest(v_uid, v_o) and status = 'pending' and by_user = v_o;
    if found then perform public.pi_push(v_o, public.pi_name(v_uid) || ' đã đồng ý kết bạn', 'Ghé phòng Pi của nhau, thả tim, đua xếp hạng tuần nha'); end if;
  else
    delete from public.pi_friends where a = least(v_uid, v_o) and b = greatest(v_uid, v_o);
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.pi_friend_answer(text, boolean) from public, anon;
grant execute on function public.pi_friend_answer(text, boolean) to authenticated;

create or replace function public.pi_heart(p_nick text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null or not public.pi_is_friend(v_uid, v_o) then return jsonb_build_object('ok', false); end if;
  insert into public.pi_hearts (from_id, to_id, day) values (v_uid, v_o, public.pet_day()) on conflict do nothing;
  if found then perform public.pi_push(v_o, public.pi_name(v_uid) || ' thả tim cho Pi của bạn', 'Ghé lại phòng Pi của bạn ấy nha'); end if;
  return jsonb_build_object('ok', true, 'hearts', (select count(*) from public.pi_hearts h where h.to_id = v_o and h.day >= date_trunc('week', public.pet_day())::date));
end $$;
revoke all on function public.pi_heart(text) from public, anon;
grant execute on function public.pi_heart(text) to authenticated;
