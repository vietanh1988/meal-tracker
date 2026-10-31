-- 31/10 (chủ dự án chốt bản vẽ "Thả tim người lạ, xin kết bạn, thông báo"):
--  · Bảng xếp hạng: thả tim cho cả người lạ (người có tên trên bảng), chạm người lạ → thẻ Pi (pi_card_view) → Kết bạn (pi_friend_request).
--  · Giới hạn: tim cho người lạ tối đa 20 / ngày (1 tim / người / ngày như cũ); lời mời tối đa 10 / ngày; bị từ chối thì 7 ngày sau mới gửi lại.
--  · Công tắc "Cho người lạ xin kết bạn" (pi_share.stranger_req, mặc định bật).
--  · Mọi thông báo bạn bè (tim, lời mời, đồng ý, lời nhắn) ghi thêm vào bảng notifications → chuông + thông báo nổi trong app (Realtime);
--    thông báo đẩy về máy giữ trần 5 / ngày như cũ. url mang biệt danh: req=<nick> (lời mời, có nút trả lời), heart=<nick>, friend=<nick>.
--  · Mọi Pi đều có biệt danh (pi_share) để bảng xếp hạng thả tim / kết bạn được: điền cho Pi cũ + tự tạo khi có Pi mới.

alter table public.pi_share add column if not exists stranger_req boolean not null default true;

create table if not exists public.pi_friend_no (
  from_id uuid not null references auth.users(id) on delete cascade,  -- người xin
  to_id uuid not null references auth.users(id) on delete cascade,    -- người từ chối
  at timestamptz not null default now(),
  primary key (from_id, to_id)
);
alter table public.pi_friend_no enable row level security;
drop policy if exists pi_friend_no_own on public.pi_friend_no;
create policy pi_friend_no_own on public.pi_friend_no for select to authenticated using (from_id = (select auth.uid()) or to_id = (select auth.uid()));
grant select on public.pi_friend_no to authenticated;
grant select, insert, update, delete on public.pi_friend_no to service_role;

-- biệt danh cho mọi Pi
create or replace function public.pi_share_on_pet() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.pi_share_ensure(new.user_id);
  return new;
end $$;
revoke all on function public.pi_share_on_pet() from public, anon, authenticated;
drop trigger if exists pi_share_on_pet on public.pet_profiles;
create trigger pi_share_on_pet after insert on public.pet_profiles for each row execute function public.pi_share_on_pet();
do $$ declare r record; begin
  for r in select p.user_id from public.pet_profiles p where not exists (select 1 from public.pi_share s where s.user_id = p.user_id) loop
    perform public.pi_share_ensure(r.user_id);
  end loop;
end $$;

create or replace function public.pi_nick(p_uid uuid) returns text
language sql security definer set search_path = public, pg_temp as $$ select (public.pi_share_ensure(p_uid)).nick $$;
revoke all on function public.pi_nick(uuid) from public, anon, authenticated;

-- quan hệ bạn bè nhìn từ phía mình: ok | out (mình đã xin) | in (họ xin mình) | null
create or replace function public.pi_fr(p_me uuid, p_o uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case when f.status = 'ok' then 'ok' when f.by_user = p_me then 'out' else 'in' end
    from public.pi_friends f where f.a = least(p_me, p_o) and f.b = greatest(p_me, p_o)
$$;
revoke all on function public.pi_fr(uuid, uuid) from public, anon, authenticated;

-- thông báo: ghi chuông (notifications, luôn) rồi đẩy về máy (có đăng ký, trần 5 / ngày)
create or replace function public.pi_push(p_uid uuid, p_title text, p_body text, p_url text default '/?pi=social&from=push') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_secret text; v_day date := public.pet_day(); v_n int;
begin
  if p_uid is null then return; end if;
  begin
    insert into public.notifications (user_id, title, body, url) values (p_uid, p_title, p_body, p_url);
  exception when others then null;
  end;
  if not exists (select 1 from public.push_subscriptions where user_id = p_uid) then return; end if;
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

-- thả tim: bạn bè, hoặc người lạ đang có tên trên bảng (tối đa 20 người lạ / ngày); 1 tim / người / ngày
create or replace function public.pi_heart(p_nick text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid; v_day date := public.pet_day(); v_friend boolean;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null or v_o = v_uid then return jsonb_build_object('ok', false); end if;
  v_friend := public.pi_is_friend(v_uid, v_o);
  if not v_friend then
    if not coalesce((select board_on from public.pi_share where user_id = v_o), true) then return jsonb_build_object('ok', false, 'why', 'hidden'); end if;
    if (select count(*) from public.pi_hearts h where h.from_id = v_uid and h.day = v_day and not public.pi_is_friend(v_uid, h.to_id)) >= 20 then
      return jsonb_build_object('ok', false, 'why', 'limit');
    end if;
  end if;
  insert into public.pi_hearts (from_id, to_id, day) values (v_uid, v_o, v_day) on conflict do nothing;
  if found then
    perform public.pi_push(v_o, public.pi_name(v_uid) || ' thả tim cho Pi của bạn', case when v_friend then 'Ghé lại phòng Pi của bạn ấy nha' else 'Chạm để xem Pi của bạn ấy' end,
      '/?pi=social&from=push&heart=' || public.pi_nick(v_uid));
  end if;
  return jsonb_build_object('ok', true, 'hearts', (select count(*) from public.pi_hearts h where h.to_id = v_o and h.day >= date_trunc('week', v_day)::date));
end $$;
revoke all on function public.pi_heart(text) from public, anon;
grant execute on function public.pi_heart(text) to authenticated;

-- lõi gửi lời mời (dùng chung cho mã mời và bảng xếp hạng)
create or replace function public.pi_friend_ask(p_me uuid, p_o uuid, p_stranger boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare f public.pi_friends; v_card jsonb;
begin
  if p_o is null then return jsonb_build_object('ok', false, 'why', 'code'); end if;
  if p_o = p_me then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  select * into f from public.pi_friends where a = least(p_me, p_o) and b = greatest(p_me, p_o);
  if found then
    if f.status = 'pending' and f.by_user = p_o then
      update public.pi_friends set status = 'ok' where a = f.a and b = f.b;
      perform public.pi_push(p_o, public.pi_name(p_me) || ' đã đồng ý kết bạn', 'Ghé phòng Pi của nhau, thả tim, đua xếp hạng tuần nha', '/?pi=social&from=push&friend=' || public.pi_nick(p_me));
      return jsonb_build_object('ok', true, 'status', 'ok', 'name', public.pi_name(p_o));
    end if;
    return jsonb_build_object('ok', true, 'status', f.status, 'name', public.pi_name(p_o));
  end if;
  if (select count(*) from public.pi_friends where (a = p_me or b = p_me)) >= 200 then return jsonb_build_object('ok', false, 'why', 'full'); end if;
  if p_stranger and not coalesce((select stranger_req from public.pi_share where user_id = p_o), true) then return jsonb_build_object('ok', false, 'why', 'off'); end if;
  if exists (select 1 from public.pi_friend_no n where n.from_id = p_me and n.to_id = p_o and n.at > now() - interval '7 days') then return jsonb_build_object('ok', false, 'why', 'wait'); end if;
  if (select count(*) from public.pi_friends where by_user = p_me and (created_at at time zone 'Asia/Ho_Chi_Minh')::date = (now() at time zone 'Asia/Ho_Chi_Minh')::date) >= 10 then
    return jsonb_build_object('ok', false, 'why', 'limit');
  end if;
  insert into public.pi_friends (a, b, status, by_user) values (least(p_me, p_o), greatest(p_me, p_o), 'pending', p_me);
  v_card := public.pi_card(p_me);
  perform public.pi_push(p_o, public.pi_name(p_me) || ' muốn kết bạn',
    (case when v_card->>'variant' = 'nu' then 'Pi nữ' else 'Pi nam' end) || ' · Cấp ' || coalesce(v_card->>'level', '1') || ' · chạm để trả lời',
    '/?pi=social&from=push&req=' || public.pi_nick(p_me));
  return jsonb_build_object('ok', true, 'status', 'pending', 'name', public.pi_name(p_o));
end $$;
revoke all on function public.pi_friend_ask(uuid, uuid, boolean) from public, anon, authenticated;

create or replace function public.pi_friend_add(p_code text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform public.pi_share_ensure(v_uid);
  return public.pi_friend_ask(v_uid, (select user_id from public.pi_share where code = upper(trim(coalesce(p_code, '')))), false);
end $$;
revoke all on function public.pi_friend_add(text) from public, anon;
grant execute on function public.pi_friend_add(text) to authenticated;

create or replace function public.pi_friend_request(p_nick text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform public.pi_share_ensure(v_uid);
  return public.pi_friend_ask(v_uid, (select user_id from public.pi_share where nick = lower(trim(coalesce(p_nick, '')))), true);
end $$;
revoke all on function public.pi_friend_request(text) from public, anon;
grant execute on function public.pi_friend_request(text) to authenticated;

create or replace function public.pi_friend_answer(p_nick text, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null then return jsonb_build_object('ok', false); end if;
  if p_accept then
    update public.pi_friends set status = 'ok' where a = least(v_uid, v_o) and b = greatest(v_uid, v_o) and status = 'pending' and by_user = v_o;
    if found then perform public.pi_push(v_o, public.pi_name(v_uid) || ' đã đồng ý kết bạn', 'Ghé phòng Pi của nhau, thả tim, đua xếp hạng tuần nha', '/?pi=social&from=push&friend=' || public.pi_nick(v_uid)); end if;
  else
    delete from public.pi_friends where a = least(v_uid, v_o) and b = greatest(v_uid, v_o) and status = 'pending' and by_user = v_o;
    if found then
      insert into public.pi_friend_no (from_id, to_id, at) values (v_o, v_uid, now()) on conflict (from_id, to_id) do update set at = now();
    end if;
  end if;
  return jsonb_build_object('ok', true, 'status', public.pi_fr(v_uid, v_o));
end $$;
revoke all on function public.pi_friend_answer(text, boolean) from public, anon;
grant execute on function public.pi_friend_answer(text, boolean) to authenticated;

-- bảng xếp hạng: thêm hearted (mình đã thả hôm nay), fr (quan hệ), req_on (người đó nhận lời mời); stranger_req của mình
create or replace function public.pi_board(p_kind text, p_scope text default 'all') returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_w0 date := date_trunc('week', public.pet_day())::date; v_day date := public.pet_day(); v_rows jsonb; v_me jsonb; v_total int;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_kind not in ('cham', 'vandong', 'hanhtrinh') then raise exception 'Bảng không hợp lệ'; end if;
  with r as (
    select x.user_id, x.v, x.sub, row_number() over (order by x.v desc, x.at asc) rk
      from public.pi_board_rows(p_kind, v_w0) x
      left join public.pi_share s on s.user_id = x.user_id
      left join public.profiles pr on pr.id = x.user_id
     where x.v > 0 and (x.user_id = v_uid or (coalesce(s.board_on, true) and not coalesce(pr.is_test, false)))
       and (p_scope <> 'friends' or x.user_id = v_uid or public.pi_is_friend(v_uid, x.user_id)))
  select (select count(*) from r),
         (select coalesce(jsonb_agg(coalesce(public.pi_card(r.user_id), '{}'::jsonb) || jsonb_build_object('rank', r.rk, 'value', r.v, 'sub', r.sub, 'me', r.user_id = v_uid,
              'hearted', exists (select 1 from public.pi_hearts h where h.from_id = v_uid and h.to_id = r.user_id and h.day = v_day),
              'fr', public.pi_fr(v_uid, r.user_id),
              'req_on', coalesce((select stranger_req from public.pi_share where user_id = r.user_id), true)) order by r.rk), '[]'::jsonb) from r where r.rk <= 50),
         (select jsonb_build_object('rank', r.rk, 'value', r.v, 'sub', r.sub) from r where r.user_id = v_uid)
    into v_total, v_rows, v_me;
  return jsonb_build_object('kind', p_kind, 'scope', p_scope, 'week', v_w0, 'total', v_total, 'rows', v_rows, 'me', v_me,
    'board_on', coalesce((select board_on from public.pi_share where user_id = v_uid), true),
    'show_weight', coalesce((select show_weight from public.pi_share where user_id = v_uid), false),
    'stranger_req', coalesce((select stranger_req from public.pi_share where user_id = v_uid), true),
    'friends', (select count(*) from public.pi_friends where (a = v_uid or b = v_uid) and status = 'ok'));
end $$;
revoke all on function public.pi_board(text, text) from public, anon;
grant execute on function public.pi_board(text, text) to authenticated;

drop function if exists public.pi_board_set(boolean, boolean);
create or replace function public.pi_board_set(p_board_on boolean default null, p_show_weight boolean default null, p_stranger_req boolean default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform public.pi_share_ensure(v_uid);
  update public.pi_share set board_on = coalesce(p_board_on, board_on), show_weight = coalesce(p_show_weight, show_weight),
    stranger_req = coalesce(p_stranger_req, stranger_req), updated_at = now() where user_id = v_uid;
  return (select jsonb_build_object('board_on', board_on, 'show_weight', show_weight, 'stranger_req', stranger_req) from public.pi_share where user_id = v_uid);
end $$;
revoke all on function public.pi_board_set(boolean, boolean, boolean) from public, anon;
grant execute on function public.pi_board_set(boolean, boolean, boolean) to authenticated;

-- thẻ Pi của 1 người (người lạ trên bảng / bạn bè): hạng + Hạt tuần (Chăm chỉ), tim tuần, chuỗi, quan hệ
create or replace function public.pi_card_view(p_nick text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid; v_day date := public.pet_day(); v_w0 date := date_trunc('week', public.pet_day())::date; v_rk jsonb;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null then return null; end if;
  if v_o <> v_uid and not public.pi_is_friend(v_uid, v_o) and not coalesce((select board_on from public.pi_share where user_id = v_o), true) then return null; end if;
  select jsonb_build_object('rank', r.rk, 'value', r.v) into v_rk from (
    select x.user_id, x.v, row_number() over (order by x.v desc, x.at asc) rk
      from public.pi_board_rows('cham', v_w0) x
      left join public.pi_share s on s.user_id = x.user_id left join public.profiles pr on pr.id = x.user_id
     where x.v > 0 and (x.user_id = v_o or (coalesce(s.board_on, true) and not coalesce(pr.is_test, false)))) r where r.user_id = v_o;
  return coalesce(public.pi_card(v_o), '{}'::jsonb) || jsonb_build_object(
    'rank', v_rk->'rank', 'value', coalesce((v_rk->>'value')::numeric, 0),
    'hearts', (select count(*) from public.pi_hearts h where h.to_id = v_o and h.day >= v_w0),
    'hearted', exists (select 1 from public.pi_hearts h where h.from_id = v_uid and h.to_id = v_o and h.day = v_day),
    'streak', (public.pet_progress(v_o)->>'streak')::int,
    'face', (select settings->>'face' from public.pet_profiles where user_id = v_o),
    'fr', public.pi_fr(v_uid, v_o),
    'req_on', coalesce((select stranger_req from public.pi_share where user_id = v_o), true),
    'me', v_o = v_uid);
end $$;
revoke all on function public.pi_card_view(text) from public, anon;
grant execute on function public.pi_card_view(text) to authenticated;
