-- 30/10 (chủ dự án chốt bản vẽ "Khoe Pi" màn 1–5): khoe Pi lên Story + mã mời + trang Pi trên web fipilotai.com/pi/<biệt danh>.
-- pi_share: mỗi khách 1 dòng — biệt danh (đường dẫn web), mã mời, bật / tắt trang web, ảnh xem trước (og), máy (chống tự mời).
-- pi_invites: người được mời (1 lần / tài khoản) → thưởng 50 Hạt mỗi bên khi người mới có 3 ngày khác nhau bấm Đã ăn đúng ngày
--   (dấu active:<ngày> của pet_claim); người mời được thưởng tối đa 10 lượt / tháng (giờ VN); cùng máy với người mời thì không nhận mã.
-- Hạt mời (kind 'invite') và thưởng xếp hạng (kind 'rank', đợt sau) KHÔNG tính vào trần Hạt / ngày và Hạt tuần → sửa pet_state_json + pet_claim.

create table if not exists public.pi_share (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nick text not null unique check (nick ~ '^[a-z0-9][a-z0-9-]{1,23}$'),
  code text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  web_on boolean not null default false,
  show_weight boolean not null default false,
  og text,
  device text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pi_invites (
  invitee uuid primary key references auth.users(id) on delete cascade,
  inviter uuid not null references auth.users(id) on delete cascade,
  device text,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  inviter_paid boolean not null default false
);
create index if not exists pi_invites_inviter on public.pi_invites (inviter);
alter table public.pi_share enable row level security;
alter table public.pi_invites enable row level security;
drop policy if exists pi_share_own on public.pi_share;
create policy pi_share_own on public.pi_share for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_user()));
drop policy if exists pi_invites_own on public.pi_invites;
create policy pi_invites_own on public.pi_invites for select to authenticated using (invitee = (select auth.uid()) or inviter = (select auth.uid()) or (select public.is_admin_user()));
grant select on public.pi_share to authenticated;
grant select on public.pi_invites to authenticated;
grant select, insert, update, delete on public.pi_share to service_role;
grant select, insert, update, delete on public.pi_invites to service_role;

-- chữ có dấu → không dấu, thường, nối bằng "-"
create or replace function public.pi_slug(p text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(translate(coalesce(p, ''),
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD')), '[^a-z0-9]+', '-', 'g'))
$$;

-- tạo dòng pi_share nếu chưa có: biệt danh = tên Pi không dấu (trùng thì thêm số), mã mời = 6 chữ đầu in hoa + 2 số
create or replace function public.pi_share_ensure(p_uid uuid) returns public.pi_share
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pi_share; v_base text; v_nick text; v_code text; i int := 0;
begin
  select * into r from public.pi_share where user_id = p_uid;
  if found then return r; end if;
  v_base := left(public.pi_slug((select name from public.pet_profiles where user_id = p_uid)), 16);
  if v_base is null or length(v_base) < 2 or v_base = 'pi' then v_base := 'pi-' || substr(md5(p_uid::text), 1, 4); end if;
  v_nick := v_base;
  while exists (select 1 from public.pi_share where nick = v_nick) loop i := i + 1; v_nick := v_base || '-' || (i + 1); end loop;
  loop
    v_code := upper(left(replace(v_base, '-', ''), 6)) || lpad((floor(random() * 100))::int::text, 2, '0');
    if length(v_code) < 4 then v_code := 'PI' || v_code; end if;
    exit when not exists (select 1 from public.pi_share where code = v_code);
  end loop;
  insert into public.pi_share (user_id, nick, code) values (p_uid, v_nick, v_code) on conflict (user_id) do nothing;
  select * into r from public.pi_share where user_id = p_uid;
  return r;
end $$;
revoke all on function public.pi_share_ensure(uuid) from public, anon, authenticated;

-- app: lấy biệt danh / mã mời / số người đã mời (tạo nếu chưa có), ghi mã máy (chống tự mời)
create or replace function public.pi_share_get(p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); r public.pi_share;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  r := public.pi_share_ensure(v_uid);
  if p_device is not null and length(p_device) between 8 and 64 then update public.pi_share set device = p_device where user_id = v_uid and device is distinct from p_device; end if;
  return jsonb_build_object('nick', r.nick, 'code', r.code, 'web_on', r.web_on, 'show_weight', r.show_weight,
    'invited', (select count(*) from public.pi_invites where inviter = v_uid),
    'rewarded', (select count(*) from public.pi_invites where inviter = v_uid and inviter_paid),
    'invited_by', (select p.name from public.pi_invites i join public.pet_profiles p on p.user_id = i.inviter where i.invitee = v_uid));
end $$;
revoke all on function public.pi_share_get(text) from public, anon;
grant execute on function public.pi_share_get(text) to authenticated;

-- app: bật / tắt trang web, khoe tiến độ cân, đường dẫn ảnh xem trước (chỉ ảnh của chính mình trong kho pi-share)
create or replace function public.pi_share_set(p_web_on boolean default null, p_show_weight boolean default null, p_og text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  perform public.pi_share_ensure(v_uid);
  if p_og is not null and p_og !~ ('^' || v_uid::text || '/[a-z0-9-]+\.(jpg|png|webp)$') then raise exception 'Ảnh không hợp lệ'; end if;
  update public.pi_share set web_on = coalesce(p_web_on, web_on), show_weight = coalesce(p_show_weight, show_weight), og = coalesce(p_og, og), updated_at = now() where user_id = v_uid;
  return public.pi_share_get(null);
end $$;
revoke all on function public.pi_share_set(boolean, boolean, text) from public, anon;
grant execute on function public.pi_share_set(boolean, boolean, text) to authenticated;

-- khách (chưa đăng nhập) xem trước mã mời trên màn Đăng ký: tên Pi + bản + đồ đang mặc
create or replace function public.pi_code_info(p_code text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('name', p.name, 'nick', s.nick, 'variant', public.pet_variant(s.user_id),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = s.user_id))
  from public.pi_share s join public.pet_profiles p on p.user_id = s.user_id where s.code = upper(trim(p_code))
$$;
revoke all on function public.pi_code_info(text) from public;
grant execute on function public.pi_code_info(text) to anon, authenticated;

-- người mới nhập mã mời (1 lần): tài khoản tạo chưa quá 7 ngày, không tự mời, khác máy người mời
create or replace function public.pi_invite_use(p_code text, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); s public.pi_share;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from public.pi_invites where invitee = v_uid) then return jsonb_build_object('ok', false, 'why', 'used'); end if;
  select * into s from public.pi_share where code = upper(trim(coalesce(p_code, '')));
  if not found then return jsonb_build_object('ok', false, 'why', 'code'); end if;
  if s.user_id = v_uid then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  if (select created_at from auth.users where id = v_uid) < now() - interval '7 days' then return jsonb_build_object('ok', false, 'why', 'old'); end if;
  if p_device is not null and s.device is not null and s.device = p_device then return jsonb_build_object('ok', false, 'why', 'device'); end if;
  insert into public.pi_invites (invitee, inviter, device) values (v_uid, s.user_id, left(p_device, 64)) on conflict do nothing;
  return jsonb_build_object('ok', true, 'name', (select name from public.pet_profiles where user_id = s.user_id));
end $$;
revoke all on function public.pi_invite_use(text, text) from public, anon;
grant execute on function public.pi_invite_use(text, text) to authenticated;

-- người được mời đủ 3 ngày bấm Đã ăn đúng ngày → +50 Hạt cho mình; người mời +50 nếu tháng này chưa quá 10 lượt
create or replace function public.pi_invite_tick() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_day date := public.pet_day(); i public.pi_invites; v_pay boolean;
  v_m0 timestamptz := date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  select * into i from public.pi_invites where invitee = v_uid for update;
  if not found or i.rewarded_at is not null then return jsonb_build_object('rewarded', false); end if;
  if (select count(*) from public.pet_ledger where user_id = v_uid and kind = 'active') < 3 then return jsonb_build_object('rewarded', false, 'days', (select count(*) from public.pet_ledger where user_id = v_uid and kind = 'active')); end if;
  insert into public.pet_profiles (user_id) values (i.inviter) on conflict do nothing;
  v_pay := (select count(*) from public.pi_invites where inviter = i.inviter and inviter_paid and rewarded_at >= v_m0) < 10;
  insert into public.pet_ledger (user_id, amount, kind, key, day) values (v_uid, 50, 'invite', 'invited', v_day) on conflict (user_id, key) do nothing;
  if found then update public.pet_profiles set balance = balance + 50, updated_at = now() where user_id = v_uid; end if;
  if v_pay then
    insert into public.pet_ledger (user_id, amount, kind, key, day) values (i.inviter, 50, 'invite', 'invite:' || v_uid, v_day) on conflict (user_id, key) do nothing;
    if found then update public.pet_profiles set balance = balance + 50, updated_at = now() where user_id = i.inviter; end if;
  end if;
  update public.pi_invites set rewarded_at = now(), inviter_paid = v_pay where invitee = v_uid;
  return jsonb_build_object('rewarded', true, 'state', public.pet_state_json(v_uid));
end $$;
revoke all on function public.pi_invite_tick() from public, anon;
grant execute on function public.pi_invite_tick() to authenticated;

-- web fipilotai.com/pi/<biệt danh>: chỉ khi chủ Pi đã bật; không trả user_id, email, tên thật, cân nặng
create or replace function public.web_pi(p_nick text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('nick', s.nick, 'code', s.code, 'name', p.name, 'variant', public.pet_variant(s.user_id),
    'level', public.pet_level(p.xp), 'face', p.settings->>'face', 'og', s.og,
    'streak', (public.pet_progress(s.user_id)->>'streak')::int,
    'owned', (select count(*) from public.pet_inventory i where i.user_id = s.user_id),
    'items', (select coalesce(jsonb_agg(i.item_id order by i.created_at desc), '[]'::jsonb) from (select item_id, created_at from public.pet_inventory where user_id = s.user_id order by created_at desc limit 12) i),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = s.user_id),
    'place', (select coalesce(jsonb_object_agg(it.id, it.place->'tf'), '{}'::jsonb) from public.pet_equipped e join public.pet_items it on it.id = e.item_id where e.user_id = s.user_id and it.place ? 'tf'),
    'meals', (select count(*) from public.pet_ledger l where l.user_id = s.user_id and l.kind = 'meal' and l.day >= date_trunc('week', public.pet_day())::date),
    'water', (select count(*) from public.pet_ledger l where l.user_id = s.user_id and l.kind = 'water' and l.day >= date_trunc('week', public.pet_day())::date))
  from public.pi_share s join public.pet_profiles p on p.user_id = s.user_id where s.nick = lower(trim(p_nick)) and s.web_on
$$;
revoke all on function public.web_pi(text) from public;
grant execute on function public.web_pi(text) to anon, authenticated;

-- kho ảnh xem trước trang Pi (og:image): mỗi khách chỉ ghi vào thư mục <user_id>/
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pi-share', 'pi-share', true, 600000, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;
drop policy if exists pi_share_read on storage.objects;
drop policy if exists pi_share_ins on storage.objects;
drop policy if exists pi_share_upd on storage.objects;
create policy pi_share_read on storage.objects for select using (bucket_id = 'pi-share');
create policy pi_share_ins on storage.objects for insert to authenticated with check (bucket_id = 'pi-share' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy pi_share_upd on storage.objects for update to authenticated using (bucket_id = 'pi-share' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Hạt mời / thưởng xếp hạng không tính vào trần / ngày, Hạt hôm nay, Hạt tuần
create or replace function public.pet_state_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'name', p.name, 'balance', p.balance, 'xp', p.xp, 'level', public.pet_level(p.xp), 'bow', p.bow, 'settings', p.settings,
    'variant', public.pet_variant(p_uid),
    'today', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.day = public.pet_day() and l.amount > 0 and l.kind not in ('admin', 'invite', 'rank')),
    'keys', (select coalesce(jsonb_agg(l.key), '[]'::jsonb) from public.pet_ledger l where l.user_id = p_uid and l.day >= public.pet_day() - 6 and l.amount > 0),
    'owned', (select coalesce(jsonb_agg(i.item_id), '[]'::jsonb) from public.pet_inventory i where i.user_id = p_uid),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = p_uid),
    'week', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.amount > 0 and l.kind not in ('admin', 'invite', 'rank') and l.day >= date_trunc('week', public.pet_day())::date)
  ) || public.pet_progress(p_uid) from public.pet_profiles p where p.user_id = p_uid
$$;
revoke all on function public.pet_state_json(uuid) from public, anon, authenticated;


create or replace function public.pet_claim() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_day date := public.pet_day();
  v_cal date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_cfg jsonb; v_pts jsonb; v_cap int; v_sum int; v_add int;
  v_prof record; v_log record;
  v_c jsonb := '[]'::jsonb; c jsonb; m jsonb; v_seen text[] := '{}';
  v_n int := 0; v_photo boolean := false; v_kcal numeric; v_water int := 0; v_train boolean := false; v_has boolean := false;
  v_goal int; v_pr jsonb;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform 1 from public.pet_profiles where user_id = v_uid for update; -- 2 lần gọi cùng lúc chạy lần lượt

  select coalesce((select value::jsonb from public.app_settings where key = 'pet_config'), '{}'::jsonb) into v_cfg;
  v_pts := '{"meal":10,"photo":5,"full_day":20,"water":15,"weigh":20,"streak":10}'::jsonb || coalesce(v_cfg->'points', '{}'::jsonb);
  v_cap := coalesce(nullif(v_cfg->>'cap', '')::int, 120);
  select kg, water_goal_ml into v_prof from public.profiles where id = v_uid;

  -- ngày app (và ngày lịch nếu đang 0:00–4:00): bữa đã ăn ≥ 100 kcal, ảnh chụp, nước
  for v_log in select meals, eaten_meals, water_ml, day_type from public.daily_logs where user_id = v_uid and log_date in (v_day, v_cal) loop
    v_has := true;
    v_water := greatest(v_water, coalesce(v_log.water_ml, 0));
    if v_log.day_type = 'train' then v_train := true; end if;
    for m in select * from jsonb_array_elements(coalesce(v_log.meals, '[]'::jsonb)) loop
      if jsonb_array_length(coalesce(m->'items', '[]'::jsonb)) = 0 then continue; end if;
      if not (coalesce(v_log.eaten_meals, '[]'::jsonb) ? (m->>'meal_id')) then continue; end if;
      if (m->>'meal_id') = any (v_seen) then continue; end if;
      select coalesce(sum((it->>'cal')::numeric), 0) into v_kcal from jsonb_array_elements(m->'items') it;
      if exists (select 1 from jsonb_array_elements(m->'items') it where it->>'source' = 'photo') then v_photo := true; end if;
      if v_kcal >= 100 then
        v_seen := v_seen || (m->>'meal_id'); v_n := v_n + 1;
        if v_n <= 5 then v_c := v_c || jsonb_build_object('k', 'meal', 'key', 'meal:' || v_day || ':' || (m->>'meal_id')); end if;
      end if;
    end loop;
  end loop;
  if v_n > 0 then -- dấu ngày có ăn đúng ngày (0 Hạt) → chuỗi
    insert into public.pet_ledger (user_id, amount, kind, key, day) values (v_uid, 0, 'active', 'active:' || v_day, v_day) on conflict (user_id, key) do nothing;
  end if;
  if v_photo then v_c := v_c || jsonb_build_object('k', 'photo', 'key', 'photo:' || v_day); end if;
  if v_n >= 3 then v_c := v_c || jsonb_build_object('k', 'full_day', 'key', 'full:' || v_day); end if;
  if v_has then
    v_goal := case when v_prof.water_goal_ml between 500 and 8000 then v_prof.water_goal_ml
      else least(5000, greatest(1500, round((35 * coalesce(v_prof.kg, 60) + case when v_train then 500 else 0 end) / 50.0) * 50))::int end;
    if v_water >= v_goal * 0.8 then v_c := v_c || jsonb_build_object('k', 'water', 'key', 'water:' || v_day); end if;
  end if;
  if exists (select 1 from public.weight_logs w where w.user_id = v_uid and w.logged_date between date_trunc('week', v_day)::date and greatest(v_day, v_cal)
             and ((w.created_at at time zone 'Asia/Ho_Chi_Minh')::date - w.logged_date) between 0 and 1) then
    v_c := v_c || jsonb_build_object('k', 'weigh', 'key', 'weigh:' || to_char(v_day, 'IYYY-"W"IW'));
  end if;
  v_pr := public.pet_progress(v_uid);
  if v_n > 0 and (v_pr->>'streak')::int >= 3 then v_c := v_c || jsonb_build_object('k', 'streak', 'key', 'streak:' || v_day, 'n', (v_pr->>'streak')::int); end if;

  select coalesce(sum(amount), 0) into v_sum from public.pet_ledger where user_id = v_uid and day = v_day and amount > 0 and kind not in ('admin', 'invite', 'rank');
  for c in select * from jsonb_array_elements(v_c) loop
    if exists (select 1 from public.pet_ledger where user_id = v_uid and key = c->>'key') then continue; end if;
    v_add := least(coalesce((v_pts->>(c->>'k'))::int, 0), v_cap - v_sum);
    if v_add <= 0 then continue; end if;
    insert into public.pet_ledger (user_id, amount, kind, key, day, meta) values (v_uid, v_add, c->>'k', c->>'key', v_day, case when c ? 'n' then jsonb_build_object('n', c->'n') end)
      on conflict (user_id, key) do nothing;
    if found then
      v_sum := v_sum + v_add;
      update public.pet_profiles set balance = balance + v_add, xp = xp + v_add, updated_at = now() where user_id = v_uid;
    end if;
  end loop;

  -- đồ thành tích (không bán, ai cũng nhận) — chỉ theo việc làm đúng ngày
  v_pr := public.pet_progress(v_uid);
  if (v_pr->>'streak')::int >= 7 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-05', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-05') on conflict do nothing; end if;
  if (v_pr->>'streak')::int >= 30 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-06', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-06') on conflict do nothing; end if;
  if (v_pr->>'streak')::int >= 100 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-17', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-17') on conflict do nothing; end if;
  if (v_pr->>'weeks')::int >= 4 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-02', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-02') on conflict do nothing; end if;
  if (v_pr->>'waterDays')::int >= 30 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-04', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-04') on conflict do nothing; end if;
  if (v_pr->>'goalDays')::int >= 14 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'doi-dau-11', 'achievement' where exists (select 1 from public.pet_items where id = 'doi-dau-11') on conflict do nothing; end if;

  return public.pet_state_json(v_uid);
end $$;
revoke all on function public.pet_claim() from public, anon;
grant execute on function public.pet_claim() to authenticated;

