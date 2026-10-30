-- 30/10 (chủ dự án chốt bản vẽ "Khoe Pi & giao lưu" màn 6–10, đợt 2): Bạn bè & Xếp hạng.
-- Xếp hạng tuần (thứ Hai → Chủ nhật, ngày của Pi) 3 bảng, mỗi bảng Tất cả / Bạn bè:
--   cham      = Hạt kiếm đúng ngày (bỏ Hạt quản trị, Hạt mời, thưởng xếp hạng)
--   vandong   = phút "Vận động thêm" ghi đúng ngày (sửa lúc cách ngày đó ≤ 1 ngày), tối đa 90 phút / ngày
--   hanhtrinh = % chặng đường tới cân mục tiêu (giảm / tăng), chỉ ai tự bật "Khoe tiến độ cân", chỉ lần cân nhập đúng ngày,
--               mỗi tuần tối đa 1% cân → không thưởng giảm / tăng quá nhanh; KHÔNG trả số kg
-- Thưởng (chạy thứ Hai 4:10 sáng giờ VN, cho tuần vừa xong): top 3 Chăm chỉ + Vận động (Tất cả) +50 / 30 / 20 Hạt;
--   Pi đẹp tuần nhiều tim nhất (≥ 3 phiếu) +100; thử thách nhóm "5 ngày đủ nước" cả nhóm đạt → mỗi người +30.
--   Hành trình cân không thưởng (tránh thúc ép cân). Hạt thưởng kind 'rank' (không tính trần / ngày, Hạt tuần).
-- Bạn bè: kết bạn bằng mã mời, đồng ý / bỏ qua; ghé phòng bạn: thả tim 1 lần / ngày; Pi đẹp tuần: 3 phiếu / tuần, chỉ cho bạn bè.

alter table public.pi_share add column if not exists board_on boolean not null default true;

create table if not exists public.pi_friends (
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'ok')),
  by_user uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index if not exists pi_friends_b on public.pi_friends (b);
create table if not exists public.pi_hearts (
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, day)
);
create index if not exists pi_hearts_to on public.pi_hearts (to_id, day);
create table if not exists public.pi_votes (
  voter uuid not null references auth.users(id) on delete cascade,
  target uuid not null references auth.users(id) on delete cascade,
  week date not null,
  created_at timestamptz not null default now(),
  primary key (voter, target, week)
);
create index if not exists pi_votes_target on public.pi_votes (target, week);
alter table public.pi_friends enable row level security;
alter table public.pi_hearts enable row level security;
alter table public.pi_votes enable row level security;
drop policy if exists pi_friends_own on public.pi_friends;
create policy pi_friends_own on public.pi_friends for select to authenticated using (a = (select auth.uid()) or b = (select auth.uid()) or (select public.is_admin_user()));
drop policy if exists pi_hearts_own on public.pi_hearts;
create policy pi_hearts_own on public.pi_hearts for select to authenticated using (from_id = (select auth.uid()) or to_id = (select auth.uid()) or (select public.is_admin_user()));
drop policy if exists pi_votes_own on public.pi_votes;
create policy pi_votes_own on public.pi_votes for select to authenticated using (voter = (select auth.uid()) or (select public.is_admin_user()));
grant select on public.pi_friends to authenticated;
grant select on public.pi_hearts to authenticated;
grant select on public.pi_votes to authenticated;
grant select, insert, update, delete on public.pi_friends to service_role;
grant select, insert, update, delete on public.pi_hearts to service_role;
grant select, insert, update, delete on public.pi_votes to service_role;

create or replace function public.pi_is_friend(p_x uuid, p_y uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.pi_friends where a = least(p_x, p_y) and b = greatest(p_x, p_y) and status = 'ok')
$$;
revoke all on function public.pi_is_friend(uuid, uuid) from public, anon, authenticated;

-- 1 khách → thông tin hiện ra cho người khác (không user_id, không kg)
create or replace function public.pi_card(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('nick', s.nick, 'name', coalesce(p.name, 'Pi'), 'variant', public.pet_variant(p_uid), 'level', public.pet_level(coalesce(p.xp, 0)),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = p_uid),
    'place', (select coalesce(jsonb_object_agg(it.id, it.place->'tf'), '{}'::jsonb) from public.pet_equipped e join public.pet_items it on it.id = e.item_id where e.user_id = p_uid and it.place ? 'tf'))
  from public.pet_profiles p left join public.pi_share s on s.user_id = p.user_id where p.user_id = p_uid
$$;
revoke all on function public.pi_card(uuid) from public, anon, authenticated;

-- số của 1 bảng cho 1 tuần (w0 = thứ Hai): user_id, giá trị, chữ phụ, lúc đạt (bằng nhau thì ai đạt sớm hơn đứng trên)
create or replace function public.pi_board_rows(p_kind text, p_w0 date) returns table (user_id uuid, v numeric, sub text, at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_kind = 'cham' then
    return query select l.user_id, sum(l.amount)::numeric, null::text, max(l.created_at)
      from public.pet_ledger l where l.day between p_w0 and p_w0 + 6 and l.amount > 0 and l.kind not in ('admin', 'invite', 'rank', 'buy')
      group by l.user_id;
  elsif p_kind = 'vandong' then
    return query select d.user_id, sum(d.m)::numeric, string_agg(distinct d.t, ','), max(d.at)
      from (select a.user_id, a.log_date, least(90, coalesce(sum(greatest(0, (it->>'min')::numeric)), 0)) m, string_agg(distinct coalesce(it->>'type', 'other'), ',') t, max(a.updated_at) at
              from public.activity_logs a cross join lateral jsonb_array_elements(case when jsonb_typeof(a.items) = 'array' then a.items else '[]'::jsonb end) it
             where a.log_date between p_w0 and p_w0 + 6 and ((a.updated_at at time zone 'Asia/Ho_Chi_Minh')::date - a.log_date) between 0 and 1
             group by a.user_id, a.log_date) d
      where d.m > 0 group by d.user_id;
  elsif p_kind = 'hanhtrinh' then
    return query
      with w as (
        select x.user_id, x.logged_date, x.kg, x.created_at,
               row_number() over (partition by x.user_id order by x.logged_date, x.created_at) r1,
               row_number() over (partition by x.user_id order by x.logged_date desc, x.created_at desc) r2
          from public.weight_logs x
         where x.logged_date between current_date - 120 and current_date + 1 and x.kg > 0
           and ((x.created_at at time zone 'Asia/Ho_Chi_Minh')::date - x.logged_date) between 0 and 1),
      f as (select a.user_id, a.kg k0, a.logged_date d0, b.kg k1, b.logged_date d1, b.created_at at from w a join w b on b.user_id = a.user_id and b.r2 = 1 where a.r1 = 1 and a.logged_date < b.logged_date),
      g as (select f.*, pr.goal_type gt, pr.goal_kg gk,
                   case when pr.goal_type = 'cut' then f.k0 - pr.goal_kg else pr.goal_kg - f.k0 end need,
                   least(case when pr.goal_type = 'cut' then f.k0 - f.k1 else f.k1 - f.k0 end, greatest(1, (f.d1 - f.d0) / 7.0) * f.k0 * 0.01) done
              from f join public.profiles pr on pr.id = f.user_id join public.pi_share s on s.user_id = f.user_id and s.show_weight
             where pr.goal_type in ('cut', 'bulk') and pr.goal_kg > 0)
      select g.user_id, greatest(0, least(100, round(g.done / g.need * 100)))::numeric,
             (case when g.gt = 'cut' then 'Giảm cân' else 'Tăng cân' end) || ' · ' || greatest(1, ceil((g.d1 - g.d0) / 7.0))::int || ' tuần', g.at
        from g where g.need > 0;
  end if;
end $$;
revoke all on function public.pi_board_rows(text, date) from public, anon, authenticated;

-- bảng xếp hạng tuần này: tối đa 50 dòng + dòng của mình
create or replace function public.pi_board(p_kind text, p_scope text default 'all') returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_w0 date := date_trunc('week', public.pet_day())::date; v_rows jsonb; v_me jsonb; v_total int;
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
         (select coalesce(jsonb_agg(coalesce(public.pi_card(r.user_id), '{}'::jsonb) || jsonb_build_object('rank', r.rk, 'value', r.v, 'sub', r.sub, 'me', r.user_id = v_uid) order by r.rk), '[]'::jsonb) from r where r.rk <= 50),
         (select jsonb_build_object('rank', r.rk, 'value', r.v, 'sub', r.sub) from r where r.user_id = v_uid)
    into v_total, v_rows, v_me;
  return jsonb_build_object('kind', p_kind, 'scope', p_scope, 'week', v_w0, 'total', v_total, 'rows', v_rows, 'me', v_me,
    'board_on', coalesce((select board_on from public.pi_share where user_id = v_uid), true),
    'show_weight', coalesce((select show_weight from public.pi_share where user_id = v_uid), false),
    'friends', (select count(*) from public.pi_friends where (a = v_uid or b = v_uid) and status = 'ok'));
end $$;
revoke all on function public.pi_board(text, text) from public, anon;
grant execute on function public.pi_board(text, text) to authenticated;

create or replace function public.pi_board_set(p_board_on boolean default null, p_show_weight boolean default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform public.pi_share_ensure(v_uid);
  update public.pi_share set board_on = coalesce(p_board_on, board_on), show_weight = coalesce(p_show_weight, show_weight), updated_at = now() where user_id = v_uid;
  return (select jsonb_build_object('board_on', board_on, 'show_weight', show_weight) from public.pi_share where user_id = v_uid);
end $$;
revoke all on function public.pi_board_set(boolean, boolean) from public, anon;
grant execute on function public.pi_board_set(boolean, boolean) to authenticated;

-- kết bạn bằng mã mời; người kia đã gửi lời mời cho mình thì thành bạn luôn
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
    if f.status = 'pending' and f.by_user = v_o then update public.pi_friends set status = 'ok' where a = f.a and b = f.b; return jsonb_build_object('ok', true, 'status', 'ok', 'name', (select name from public.pet_profiles where user_id = v_o)); end if;
    return jsonb_build_object('ok', true, 'status', f.status, 'name', (select name from public.pet_profiles where user_id = v_o));
  end if;
  insert into public.pi_friends (a, b, status, by_user) values (least(v_uid, v_o), greatest(v_uid, v_o), 'pending', v_uid);
  return jsonb_build_object('ok', true, 'status', 'pending', 'name', (select name from public.pet_profiles where user_id = v_o));
end $$;
revoke all on function public.pi_friend_add(text) from public, anon;
grant execute on function public.pi_friend_add(text) to authenticated;

-- đồng ý / bỏ qua lời mời, huỷ kết bạn (theo biệt danh của người kia)
create or replace function public.pi_friend_answer(p_nick text, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null then return jsonb_build_object('ok', false); end if;
  if p_accept then
    update public.pi_friends set status = 'ok' where a = least(v_uid, v_o) and b = greatest(v_uid, v_o) and status = 'pending' and by_user = v_o;
  else
    delete from public.pi_friends where a = least(v_uid, v_o) and b = greatest(v_uid, v_o);
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.pi_friend_answer(text, boolean) from public, anon;
grant execute on function public.pi_friend_answer(text, boolean) to authenticated;

-- danh sách bạn + lời mời + thử thách nhóm tuần này (5 ngày đủ nước) + tim nhận tuần này
create or replace function public.pi_friends_list() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_day date := public.pet_day(); v_w0 date := date_trunc('week', public.pet_day())::date; v_ids uuid[];
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select coalesce(array_agg(case when f.a = v_uid then f.b else f.a end), '{}') into v_ids from public.pi_friends f where (f.a = v_uid or f.b = v_uid) and f.status = 'ok';
  return jsonb_build_object(
    'me', (select jsonb_build_object('nick', nick, 'code', code) from public.pi_share where user_id = v_uid),
    'friends', (select coalesce(jsonb_agg(coalesce(public.pi_card(u), '{}'::jsonb) || jsonb_build_object(
        'meals', (select count(*) from public.pet_ledger l where l.user_id = u and l.kind = 'meal' and l.day = v_day),
        'water', exists (select 1 from public.pet_ledger l where l.user_id = u and l.kind = 'water' and l.day = v_day),
        'streak', (public.pet_progress(u)->>'streak')::int,
        'away', v_day - coalesce((select max(l.day) from public.pet_ledger l where l.user_id = u and l.kind = 'active'), v_day - 99),
        'hearted', exists (select 1 from public.pi_hearts h where h.from_id = v_uid and h.to_id = u and h.day = v_day)) order by u), '[]'::jsonb) from unnest(v_ids) u),
    'incoming', (select coalesce(jsonb_agg(public.pi_card(f.by_user)), '[]'::jsonb) from public.pi_friends f where (f.a = v_uid or f.b = v_uid) and f.status = 'pending' and f.by_user <> v_uid),
    'outgoing', (select coalesce(jsonb_agg(public.pi_card(case when f.a = v_uid then f.b else f.a end)), '[]'::jsonb) from public.pi_friends f where f.by_user = v_uid and f.status = 'pending'),
    'challenge', jsonb_build_object('goal', 5, 'total', 1 + coalesce(array_length(v_ids, 1), 0),
       'done', (select count(*) from unnest(v_ids || v_uid) u where (select count(*) from public.pet_ledger l where l.user_id = u and l.kind = 'water' and l.day between v_w0 and v_w0 + 6) >= 5),
       'mine', (select count(*) from public.pet_ledger l where l.user_id = v_uid and l.kind = 'water' and l.day between v_w0 and v_w0 + 6),
       'left', v_w0 + 6 - v_day),
    'hearts', jsonb_build_object('n', (select count(*) from public.pi_hearts h where h.to_id = v_uid and h.day >= v_w0),
       'from', (select coalesce(jsonb_agg(x.name), '[]'::jsonb) from (select distinct p.name from public.pi_hearts h join public.pet_profiles p on p.user_id = h.from_id where h.to_id = v_uid and h.day >= v_w0 limit 5) x)));
end $$;
revoke all on function public.pi_friends_list() from public, anon;
grant execute on function public.pi_friends_list() to authenticated;

-- phòng của 1 người bạn (chỉ bạn bè)
create or replace function public.pi_room(p_nick text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid; v_day date := public.pet_day();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null or not public.pi_is_friend(v_uid, v_o) then return null; end if;
  return public.pi_card(v_o) || jsonb_build_object(
    'owned', (select count(*) from public.pet_inventory i where i.user_id = v_o),
    'streak', (public.pet_progress(v_o)->>'streak')::int,
    'meals', (select count(*) from public.pet_ledger l where l.user_id = v_o and l.kind = 'meal' and l.day = v_day),
    'hearts', (select count(*) from public.pi_hearts h where h.to_id = v_o and h.day >= date_trunc('week', v_day)::date),
    'hearted', exists (select 1 from public.pi_hearts h where h.from_id = v_uid and h.to_id = v_o and h.day = v_day),
    'face', (select settings->>'face' from public.pet_profiles where user_id = v_o));
end $$;
revoke all on function public.pi_room(text) from public, anon;
grant execute on function public.pi_room(text) to authenticated;

-- thả tim cho Pi của bạn: 1 lần / người / ngày
create or replace function public.pi_heart(p_nick text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null or not public.pi_is_friend(v_uid, v_o) then return jsonb_build_object('ok', false); end if;
  insert into public.pi_hearts (from_id, to_id, day) values (v_uid, v_o, public.pet_day()) on conflict do nothing;
  return jsonb_build_object('ok', true, 'hearts', (select count(*) from public.pi_hearts h where h.to_id = v_o and h.day >= date_trunc('week', public.pet_day())::date));
end $$;
revoke all on function public.pi_heart(text) from public, anon;
grant execute on function public.pi_heart(text) to authenticated;

-- Pi đẹp tuần: mình + bạn bè, số tim (phiếu) tuần này, mình còn mấy phiếu
create or replace function public.pi_beauty() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_w0 date := date_trunc('week', public.pet_day())::date; v_ids uuid[];
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select coalesce(array_agg(case when f.a = v_uid then f.b else f.a end), '{}') into v_ids from public.pi_friends f where (f.a = v_uid or f.b = v_uid) and f.status = 'ok';
  return jsonb_build_object('left', 3 - (select count(*) from public.pi_votes where voter = v_uid and week = v_w0),
    'entries', (select coalesce(jsonb_agg(coalesce(public.pi_card(u), '{}'::jsonb) || jsonb_build_object('me', u = v_uid,
        'votes', (select count(*) from public.pi_votes v where v.target = u and v.week = v_w0),
        'voted', exists (select 1 from public.pi_votes v where v.voter = v_uid and v.target = u and v.week = v_w0))
        order by (select count(*) from public.pi_votes v where v.target = u and v.week = v_w0) desc, u), '[]'::jsonb) from unnest(v_uid || v_ids) u));
end $$;
revoke all on function public.pi_beauty() from public, anon;
grant execute on function public.pi_beauty() to authenticated;

create or replace function public.pi_vote(p_nick text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid; v_w0 date := date_trunc('week', public.pet_day())::date;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null or v_o = v_uid or not public.pi_is_friend(v_uid, v_o) then return jsonb_build_object('ok', false, 'why', 'friend'); end if;
  if (select count(*) from public.pi_votes where voter = v_uid and week = v_w0) >= 3 then return jsonb_build_object('ok', false, 'why', 'left'); end if;
  insert into public.pi_votes (voter, target, week) values (v_uid, v_o, v_w0) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.pi_vote(text) from public, anon;
grant execute on function public.pi_vote(text) to authenticated;

-- thưởng tuần vừa xong (lịch chạy thứ Hai 4:10 sáng giờ VN; chạy lại không cộng đôi nhờ khoá key)
create or replace function public.pi_rank_award() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_w0 date := date_trunc('week', public.pet_day())::date - 7; v_wk text := to_char(date_trunc('week', public.pet_day())::date - 7, 'IYYY-"W"IW');
  k text; r record; v_n int := 0; v_amt int;
begin
  foreach k in array array['cham', 'vandong'] loop
    for r in select x.user_id, row_number() over (order by x.v desc, x.at asc) rk
               from public.pi_board_rows(k, v_w0) x left join public.pi_share s on s.user_id = x.user_id left join public.profiles pr on pr.id = x.user_id
              where x.v > 0 and coalesce(s.board_on, true) and not coalesce(pr.is_test, false) order by x.v desc, x.at asc limit 3 loop
      v_amt := (array[50, 30, 20])[r.rk];
      insert into public.pet_ledger (user_id, amount, kind, key, day, meta) values (r.user_id, v_amt, 'rank', 'rank:' || k || ':' || v_wk, public.pet_day(), jsonb_build_object('rank', r.rk)) on conflict (user_id, key) do nothing;
      if found then update public.pet_profiles set balance = balance + v_amt, updated_at = now() where user_id = r.user_id; v_n := v_n + 1; end if;
    end loop;
  end loop;
  for r in select v.target user_id, count(*) n from public.pi_votes v where v.week = v_w0 group by v.target having count(*) >= 3 order by count(*) desc, max(v.created_at) asc limit 1 loop
    insert into public.pet_ledger (user_id, amount, kind, key, day) values (r.user_id, 100, 'rank', 'beauty:' || v_wk, public.pet_day()) on conflict (user_id, key) do nothing;
    if found then update public.pet_profiles set balance = balance + 100, updated_at = now() where user_id = r.user_id; v_n := v_n + 1; end if;
  end loop;
  -- thử thách nhóm: người có ≥ 1 bạn, mình và mọi bạn đều ≥ 5 ngày đủ nước trong tuần
  for r in select distinct u.uid user_id from (select a uid from public.pi_friends where status = 'ok' union select b from public.pi_friends where status = 'ok') u
            where not exists (
              select 1 from (select u.uid x union select case when f.a = u.uid then f.b else f.a end from public.pi_friends f where (f.a = u.uid or f.b = u.uid) and f.status = 'ok') m
               where (select count(*) from public.pet_ledger l where l.user_id = m.x and l.kind = 'water' and l.day between v_w0 and v_w0 + 6) < 5) loop
    insert into public.pet_ledger (user_id, amount, kind, key, day) values (r.user_id, 30, 'rank', 'chal:' || v_wk, public.pet_day()) on conflict (user_id, key) do nothing;
    if found then update public.pet_profiles set balance = balance + 30, updated_at = now() where user_id = r.user_id; v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;
revoke all on function public.pi_rank_award() from public, anon, authenticated;
grant execute on function public.pi_rank_award() to service_role;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('pi-rank-award', '10 21 * * 0', 'select public.pi_rank_award()');
  end if;
end $$;
