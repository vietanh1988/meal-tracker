-- Fipilot Pet (20/10/2026) — thú cưng Pi: Hạt, cấp, cửa hàng, tủ đồ, câu Pi nói.
-- Luật (BACKLOG-fipilot.md · Fipilot Pet): điểm CHỈ máy chủ tính (pet_claim), chỉ việc của HÔM NAY (giờ VN), trần Hạt/ngày,
-- khoá theo key (gọi 2 lần không cộng trùng), app không bao giờ gửi số điểm. Khách chỉ đọc dữ liệu của mình; ghi chỉ qua hàm.
-- Bản Pi theo giới tính hồ sơ (female → nu, còn lại nam). Chạy lại nhiều lần vẫn an toàn.

-- ===== Bảng =====
create table if not exists public.pet_items (
  id text primary key,
  name text not null,
  slot text not null,
  rarity text not null check (rarity in ('common','rare','legendary')),
  price integer not null default 100 check (price >= 0),
  level integer not null default 1 check (level >= 1),
  variants text[] not null default array['nam','nu'],
  achievement boolean not null default false,
  hidden boolean not null default false,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.pet_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Pi' check (char_length(name) between 1 and 12),
  balance integer not null default 0,
  xp integer not null default 0,
  bow boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pet_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  kind text not null,               -- meal | photo | full_day | water | weigh | streak | buy | admin
  key text not null,                -- meal:2026-10-20:trua · water:2026-10-20 · weigh:2026-W43 · buy:<món>
  day date not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists pet_ledger_user_day on public.pet_ledger (user_id, day);
create table if not exists public.pet_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.pet_items(id),
  how text not null default 'buy',  -- buy | achievement | admin
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create table if not exists public.pet_equipped (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null,
  item_id text not null references public.pet_items(id),
  primary key (user_id, slot)
);
create table if not exists public.pet_lines (
  id bigserial primary key,
  event text not null,
  variant text not null check (variant in ('nam','nu')),
  text text not null check (char_length(text) between 1 and 160),
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.pet_items enable row level security;
alter table public.pet_profiles enable row level security;
alter table public.pet_ledger enable row level security;
alter table public.pet_inventory enable row level security;
alter table public.pet_equipped enable row level security;
alter table public.pet_lines enable row level security;

drop policy if exists pet_items_read on public.pet_items;
create policy pet_items_read on public.pet_items for select to authenticated using (true);
drop policy if exists pet_items_admin on public.pet_items;
create policy pet_items_admin on public.pet_items for all to authenticated using ((select public.is_admin_user())) with check ((select public.is_admin_user()));
drop policy if exists pet_lines_read on public.pet_lines;
create policy pet_lines_read on public.pet_lines for select to authenticated using (true);
drop policy if exists pet_lines_admin on public.pet_lines;
create policy pet_lines_admin on public.pet_lines for all to authenticated using ((select public.is_admin_user())) with check ((select public.is_admin_user()));
drop policy if exists pet_profiles_own on public.pet_profiles;
create policy pet_profiles_own on public.pet_profiles for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_user()));
drop policy if exists pet_ledger_own on public.pet_ledger;
create policy pet_ledger_own on public.pet_ledger for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_user()));
drop policy if exists pet_inventory_own on public.pet_inventory;
create policy pet_inventory_own on public.pet_inventory for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_user()));
drop policy if exists pet_equipped_own on public.pet_equipped;
create policy pet_equipped_own on public.pet_equipped for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_user()));

grant select, insert, update, delete on public.pet_items, public.pet_lines to authenticated;
grant select on public.pet_profiles, public.pet_ledger, public.pet_inventory, public.pet_equipped to authenticated;
grant usage, select on sequence public.pet_lines_id_seq to authenticated;
grant all on public.pet_items, public.pet_lines, public.pet_profiles, public.pet_ledger, public.pet_inventory, public.pet_equipped to service_role;

-- ===== Hàm phụ =====
create or replace function public.pet_level(p_xp integer) returns integer
language sql immutable as $$
  select case when p_xp >= 8100 then 10 + (p_xp - 8100) / 1500
    else (select count(*)::int from unnest(array[0,300,750,1350,2100,3000,4050,5250,6600,8100]) t where t <= greatest(p_xp, 0)) end
$$;

create or replace function public.pet_variant(p_uid uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case when (select gender from public.profiles where id = p_uid) = 'female' then 'nu' else 'nam' end
$$;
revoke all on function public.pet_variant(uuid) from public, anon;

-- Trạng thái đầy đủ của 1 khách (gọi từ các hàm dưới)
create or replace function public.pet_state_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'name', p.name, 'balance', p.balance, 'xp', p.xp, 'level', public.pet_level(p.xp), 'bow', p.bow, 'settings', p.settings,
    'variant', public.pet_variant(p_uid),
    'today', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.day = (now() at time zone 'Asia/Ho_Chi_Minh')::date and l.amount > 0 and l.kind <> 'admin'),
    'keys', (select coalesce(jsonb_agg(l.key), '[]'::jsonb) from public.pet_ledger l where l.user_id = p_uid and l.day >= (now() at time zone 'Asia/Ho_Chi_Minh')::date - 6 and l.amount > 0),
    'owned', (select coalesce(jsonb_agg(i.item_id), '[]'::jsonb) from public.pet_inventory i where i.user_id = p_uid),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = p_uid),
    'week', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.amount > 0 and l.kind <> 'admin' and l.day >= date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh')::date)::date)
  ) from public.pet_profiles p where p.user_id = p_uid
$$;
revoke all on function public.pet_state_json(uuid) from public, anon, authenticated;

-- ===== pet_claim: quét việc HÔM NAY của chính người gọi, cộng Hạt việc đủ điều kiện mà chưa nhận =====
create or replace function public.pet_claim() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_cfg jsonb; v_pts jsonb; v_cap int; v_sum int; v_add int;
  v_log record; v_prof record;
  v_c jsonb := '[]'::jsonb; c jsonb; m jsonb;
  v_eaten jsonb; v_n int := 0; v_all boolean := true; v_photo boolean := false; v_kcal numeric;
  v_goal int; v_streak int := 0; d date; v_weeks int; v_wdays int; v_has boolean;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform 1 from public.pet_profiles where user_id = v_uid for update; -- 2 lần gọi cùng lúc chạy lần lượt

  select coalesce((select value::jsonb from public.app_settings where key = 'pet_config'), '{}'::jsonb) into v_cfg;
  v_pts := '{"meal":10,"photo":5,"full_day":20,"water":15,"weigh":20,"streak":10}'::jsonb || coalesce(v_cfg->'points', '{}'::jsonb);
  v_cap := coalesce((v_cfg->>'cap')::int, 120);

  select meals, eaten_meals, water_ml, day_type into v_log from public.daily_logs where user_id = v_uid and log_date = v_day;
  v_has := found;
  select kg, water_goal_ml into v_prof from public.profiles where id = v_uid;

  if v_has then
    v_eaten := coalesce(v_log.eaten_meals, '[]'::jsonb);
    for m in select * from jsonb_array_elements(coalesce(v_log.meals, '[]'::jsonb)) loop
      if jsonb_array_length(coalesce(m->'items', '[]'::jsonb)) = 0 then continue; end if;
      if not (v_eaten ? (m->>'meal_id')) then v_all := false; continue; end if;
      select coalesce(sum((it->>'cal')::numeric), 0) into v_kcal from jsonb_array_elements(m->'items') it;
      if exists (select 1 from jsonb_array_elements(m->'items') it where it->>'source' = 'photo') then v_photo := true; end if;
      if v_kcal >= 100 then
        v_n := v_n + 1;
        if v_n <= 5 then v_c := v_c || jsonb_build_object('k', 'meal', 'key', 'meal:' || v_day || ':' || (m->>'meal_id')); end if;
      end if;
    end loop;
    if v_photo then v_c := v_c || jsonb_build_object('k', 'photo', 'key', 'photo:' || v_day); end if;
    if v_n >= 3 and v_all then v_c := v_c || jsonb_build_object('k', 'full_day', 'key', 'full:' || v_day); end if;
    v_goal := coalesce(v_prof.water_goal_ml, least(5000, greatest(1500, round((35 * coalesce(v_prof.kg, 60) + case when v_log.day_type = 'train' then 500 else 0 end) / 50.0) * 50)))::int;
    if coalesce(v_log.water_ml, 0) >= v_goal * 0.8 then v_c := v_c || jsonb_build_object('k', 'water', 'key', 'water:' || v_day); end if;
  end if;
  if exists (select 1 from public.weight_logs w where w.user_id = v_uid and w.logged_date between date_trunc('week', v_day)::date and v_day) then
    v_c := v_c || jsonb_build_object('k', 'weigh', 'key', 'weigh:' || to_char(v_day, 'IYYY-"W"IW'));
  end if;
  -- chuỗi: số ngày liền (tính đến hôm nay) có ít nhất 1 bữa đã ăn
  d := v_day;
  while exists (select 1 from public.daily_logs x where x.user_id = v_uid and x.log_date = d and jsonb_array_length(coalesce(x.eaten_meals, '[]'::jsonb)) > 0) and v_streak < 400 loop
    v_streak := v_streak + 1; d := d - 1;
  end loop;
  if v_streak >= 3 then v_c := v_c || jsonb_build_object('k', 'streak', 'key', 'streak:' || v_day, 'n', v_streak); end if;

  select coalesce(sum(amount), 0) into v_sum from public.pet_ledger where user_id = v_uid and day = v_day and amount > 0 and kind <> 'admin';
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

  -- đồ thành tích (không bán, ai cũng nhận)
  if v_streak >= 7 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-05', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-05') on conflict do nothing; end if;
  if v_streak >= 30 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-06', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-06') on conflict do nothing; end if;
  if v_streak >= 100 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-17', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-17') on conflict do nothing; end if;
  select count(distinct date_trunc('week', w.logged_date)) into v_weeks from public.weight_logs w where w.user_id = v_uid and w.logged_date > date_trunc('week', v_day)::date - 28;
  if v_weeks >= 4 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-02', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-02') on conflict do nothing; end if;
  select count(*) into v_wdays from public.pet_ledger l where l.user_id = v_uid and l.kind = 'water' and l.day > v_day - 30;
  if v_wdays >= 30 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-04', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-04') on conflict do nothing; end if;

  return public.pet_state_json(v_uid) || jsonb_build_object('streak', v_streak);
end $$;
revoke all on function public.pet_claim() from public, anon;
grant execute on function public.pet_claim() to authenticated;

-- ===== pet_buy: mua 1 món (khoá số dư, kiểm đủ điều kiện, ghi sổ −giá, thêm vào tủ — 1 giao dịch) =====
create or replace function public.pet_buy(p_item text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_it record; v_p record; v_tier text;
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  select * into v_p from public.pet_profiles where user_id = v_uid for update;
  select * into v_it from public.pet_items where id = p_item;
  if not found or v_it.hidden then raise exception 'Món này không còn bán'; end if;
  if v_it.achievement then raise exception 'Đồ thành tích không bán'; end if;
  if not (public.pet_variant(v_uid) = any (v_it.variants)) then raise exception 'Món này không dành cho Pi của bạn'; end if;
  if exists (select 1 from public.pet_inventory where user_id = v_uid and item_id = p_item) then raise exception 'Bạn đã có món này'; end if;
  if v_it.level > public.pet_level(v_p.xp) then raise exception 'Mở ở cấp %', v_it.level; end if;
  select coalesce(tier, 'free') into v_tier from public.profiles where id = v_uid;
  if v_it.rarity <> 'common' and v_tier = 'free' then raise exception 'Đồ Hiếm và Huyền thoại dành cho Premium'; end if;
  if v_p.balance < v_it.price then raise exception 'Còn thiếu % Hạt', v_it.price - v_p.balance; end if;
  insert into public.pet_ledger (user_id, amount, kind, key, day) values (v_uid, -v_it.price, 'buy', 'buy:' || p_item, v_day);
  insert into public.pet_inventory (user_id, item_id, how) values (v_uid, p_item, 'buy');
  update public.pet_profiles set balance = balance - v_it.price, updated_at = now() where user_id = v_uid;
  return public.pet_state_json(v_uid);
end $$;
revoke all on function public.pet_buy(text) from public, anon;
grant execute on function public.pet_buy(text) to authenticated;

-- ===== pet_equip: mặc / tháo (p_item null = tháo). cam_tay = tay phải, cam_tay_trai = tay trái =====
create or replace function public.pet_equip(p_slot text, p_item text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_it record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_slot not in ('dau','ao','kinh','tai_nghe','cam_tay','cam_tay_trai','deo','sau_lung','duoi_chan','hieu_ung') then raise exception 'Ô không hợp lệ'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  if p_item is null then
    delete from public.pet_equipped where user_id = v_uid and slot = p_slot;
  else
    select * into v_it from public.pet_items where id = p_item;
    if not found then raise exception 'Món không có'; end if;
    if not exists (select 1 from public.pet_inventory where user_id = v_uid and item_id = p_item) then raise exception 'Bạn chưa có món này'; end if;
    if v_it.slot <> (case when p_slot = 'cam_tay_trai' then 'cam_tay' else p_slot end) then raise exception 'Món này không đeo ở ô đó'; end if;
    if not (public.pet_variant(v_uid) = any (v_it.variants)) then raise exception 'Món này không dành cho Pi của bạn'; end if;
    delete from public.pet_equipped where user_id = v_uid and item_id = p_item and slot <> p_slot; -- 1 món không cầm 2 tay
    insert into public.pet_equipped (user_id, slot, item_id) values (v_uid, p_slot, p_item)
      on conflict (user_id, slot) do update set item_id = excluded.item_id;
  end if;
  return public.pet_state_json(v_uid);
end $$;
revoke all on function public.pet_equip(text, text) from public, anon;
grant execute on function public.pet_equip(text, text) to authenticated;

-- ===== pet_save: tên, nơ, cài đặt (Pi khen và nhắc, giờ yên lặng, tổng kết tuần) =====
create or replace function public.pet_save(p_name text default null, p_bow boolean default null, p_settings jsonb default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_name is not null and char_length(btrim(p_name)) not between 1 and 12 then raise exception 'Tên từ 1 đến 12 chữ'; end if;
  if p_settings is not null and (jsonb_typeof(p_settings) <> 'object' or length(p_settings::text) > 2000) then raise exception 'Cài đặt không hợp lệ'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  update public.pet_profiles set
    name = coalesce(btrim(p_name), name), bow = coalesce(p_bow, bow),
    settings = case when p_settings is null then settings else settings || p_settings end, updated_at = now()
  where user_id = v_uid;
  return public.pet_state_json(v_uid);
end $$;
revoke all on function public.pet_save(text, boolean, jsonb) from public, anon;
grant execute on function public.pet_save(text, boolean, jsonb) to authenticated;

-- ===== Quản trị: số tổng quan =====
create or replace function public.pet_admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_cap int;
begin
  if not public.is_admin_user() then raise exception 'not admin'; end if;
  v_cap := coalesce((select (value::jsonb->>'cap')::int from public.app_settings where key = 'pet_config'), 120);
  return jsonb_build_object(
    'pets', (select count(*) from public.pet_profiles),
    'petsNu', (select count(*) from public.pet_profiles p join public.profiles r on r.id = p.user_id where r.gender = 'female'),
    'seedsToday', (select coalesce(sum(amount), 0) from public.pet_ledger where day = v_day and amount > 0 and kind <> 'admin'),
    'capHit', (select count(*) from (select user_id from public.pet_ledger where day = v_day and amount > 0 and kind <> 'admin' group by user_id having sum(amount) >= v_cap) t),
    'soldToday', (select count(*) from public.pet_ledger where day = v_day and kind = 'buy'),
    'soldPremium', (select count(*) from public.pet_ledger l join public.pet_items i on 'buy:' || i.id = l.key where l.day = v_day and l.kind = 'buy' and i.rarity <> 'common'),
    'askToday', (select count(*) from public.ai_usage_log where feature = 'pet_chat' and created_at >= (v_day::timestamp at time zone 'Asia/Ho_Chi_Minh')),
    'sold', (select coalesce(jsonb_object_agg(item_id, n), '{}'::jsonb) from (select item_id, count(*) n from public.pet_inventory where how = 'buy' group by item_id) t),
    'top7', (select coalesce(jsonb_agg(jsonb_build_array(item_id, n) order by n desc), '[]'::jsonb) from (select substr(key, 5) item_id, count(*) n from public.pet_ledger where kind = 'buy' and day > v_day - 7 group by 1 order by 2 desc limit 6) t)
  );
end $$;
revoke all on function public.pet_admin_overview() from public, anon;
grant execute on function public.pet_admin_overview() to authenticated;

-- ===== Dữ liệu gốc: món (từ src/pet/catalog.json) + câu Pi nói (từ src/pet/lines.js) =====
insert into public.pet_items (id, name, slot, rarity, price, level, variants, achievement, sort) values
  ('ao-roi-01','Áo khoác thể thao xanh','ao','common',100,1,array['nam'],false,0),
  ('ao-roi-02','Áo khoác trắng','ao','common',100,1,array['nam'],false,1),
  ('ao-roi-03','Áo hoodie xanh đậm','ao','rare',400,3,array['nam'],false,2),
  ('ao-roi-04','Áo vest học sinh','ao','rare',400,3,array['nam'],false,3),
  ('ao-roi-05','Bộ phi hành gia','ao','legendary',1000,5,array['nam'],false,4),
  ('ao-roi-06','Áo khoác jean','ao','rare',400,3,array['nam'],false,5),
  ('ao-roi-07','Khăn len xanh','deo','common',100,1,array['nam'],false,6),
  ('ao-roi-08','Áo hoodie hồng','ao','common',100,1,array['nu'],false,7),
  ('ao-roi-09','Áo len kem','ao','common',100,1,array['nu'],false,8),
  ('ao-roi-10','Váy vàng','ao','rare',400,3,array['nu'],false,9),
  ('ao-roi-11','Váy trắng nơ','ao','rare',400,4,array['nu'],false,10),
  ('ao-roi-12','Váy tím công chúa','ao','legendary',1000,6,array['nu'],false,11),
  ('ao-roi-13','Áo khoác hồng tim','ao','common',100,1,array['nu'],false,12),
  ('doi-dau-01','Mũ lưỡi trai xanh','dau','common',100,1,array['nam'],false,13),
  ('doi-dau-02','Mũ lưỡi trai đen','dau','common',100,1,array['nam'],false,14),
  ('doi-dau-03','Mũ lưỡi trai xanh trắng','dau','common',100,1,array['nam'],false,15),
  ('doi-dau-04','Mũ tai bèo be','dau','common',100,1,array['nam','nu'],false,16),
  ('doi-dau-05','Mũ tai bèo xanh rêu','dau','rare',400,4,array['nam'],false,17),
  ('doi-dau-06','Mũ lưỡi trai đen trắng','dau','common',100,1,array['nam'],false,18),
  ('doi-dau-07','Nơ hồng to','dau','common',100,1,array['nu'],false,19),
  ('doi-dau-08','Mũ rơm hoa','dau','rare',400,4,array['nu'],false,20),
  ('doi-dau-09','Mũ lưỡi trai hồng','dau','common',120,2,array['nu'],false,21),
  ('doi-dau-10','Băng đô tai mèo','dau','rare',400,4,array['nu'],false,22),
  ('doi-dau-11','Vương miện vàng','dau','legendary',1000,6,array['nam','nu'],true,23),
  ('doi-dau-12','Vương miện hồng ngọc','dau','legendary',1000,7,array['nu'],false,24),
  ('kinh-tai-nghe-01','Kính tròn đen','kinh','common',120,2,array['nam'],false,25),
  ('kinh-tai-nghe-02','Kính râm đen','kinh','common',120,2,array['nam'],false,26),
  ('kinh-tai-nghe-03','Kính râm xanh','kinh','common',120,2,array['nam'],false,27),
  ('kinh-tai-nghe-04','Tai nghe xanh','tai_nghe','rare',400,5,array['nam'],false,28),
  ('kinh-tai-nghe-05','Tai nghe đen','tai_nghe','rare',400,5,array['nam'],false,29),
  ('kinh-tai-nghe-06','Kính tim hồng','kinh','rare',400,5,array['nu'],false,30),
  ('kinh-tai-nghe-07','Kính tròn hồng','kinh','common',120,2,array['nu'],false,31),
  ('kinh-tai-nghe-08','Kính râm nâu','kinh','common',120,2,array['nam'],false,32),
  ('kinh-tai-nghe-09','Tai nghe hồng','tai_nghe','rare',400,5,array['nu'],false,33),
  ('kinh-tai-nghe-10','Tai nghe tai mèo','tai_nghe','legendary',1000,8,array['nu'],false,34),
  ('phu-kien-01','Balo xanh','sau_lung','rare',400,6,array['nam'],false,35),
  ('phu-kien-02','Túi đeo hông','deo','common',150,3,array['nam','nu'],false,36),
  ('phu-kien-03','Chai nước suối','cam_tay','common',150,3,array['nam','nu'],false,37),
  ('phu-kien-04','Bình thể thao xanh','cam_tay','common',150,3,array['nam'],false,38),
  ('phu-kien-05','Bình giữ nhiệt inox','cam_tay','common',150,3,array['nam','nu'],false,39),
  ('phu-kien-06','Quả tạ','cam_tay','common',150,3,array['nam'],false,40),
  ('phu-kien-07','Chùm bóng xanh','cam_tay','rare',400,6,array['nam'],false,41),
  ('phu-kien-08','Ván trượt xanh','duoi_chan','legendary',1000,8,array['nam'],false,42),
  ('phu-kien-09','Balo hồng','sau_lung','rare',400,6,array['nu'],false,43),
  ('phu-kien-10','Túi xách hồng','cam_tay','common',150,3,array['nu'],false,44),
  ('phu-kien-11','Giỏ hoa','cam_tay','common',180,4,array['nu'],false,45),
  ('phu-kien-12','Bình giữ nhiệt hồng','cam_tay','common',180,4,array['nu'],false,46),
  ('phu-kien-13','Khăn quàng hồng','deo','common',180,4,array['nu'],false,47),
  ('phu-kien-14','Ván trượt hồng','duoi_chan','rare',400,6,array['nu'],false,48),
  ('phu-kien-15','Hoa cúc trắng','cam_tay','common',180,4,array['nu'],false,49),
  ('hieu-ung-01','Tim xanh','hieu_ung','common',180,4,array['nam'],false,50),
  ('hieu-ung-02','Ngôi sao','hieu_ung','common',180,4,array['nam','nu'],true,51),
  ('hieu-ung-03','Lấp lánh','hieu_ung','rare',400,7,array['nam','nu'],false,52),
  ('hieu-ung-04','Tia nước','hieu_ung','common',200,5,array['nam','nu'],true,53),
  ('hieu-ung-05','Đồng xu','hieu_ung','rare',400,7,array['nam','nu'],true,54),
  ('hieu-ung-06','Cúp vàng','hieu_ung','legendary',1000,9,array['nam','nu'],true,55),
  ('hieu-ung-07','Vòng nước','hieu_ung','common',200,5,array['nam','nu'],false,56),
  ('hieu-ung-08','Mây trắng','hieu_ung','common',200,5,array['nam','nu'],false,57),
  ('hieu-ung-09','Mây bông','hieu_ung','common',200,5,array['nam','nu'],false,58),
  ('hieu-ung-10','Gió mát','hieu_ung','common',200,5,array['nam'],false,59),
  ('hieu-ung-11','Tim hồng','hieu_ung','rare',400,7,array['nu'],false,60),
  ('hieu-ung-13','Hoa anh đào','hieu_ung','rare',400,7,array['nu'],false,61),
  ('hieu-ung-17','Cầu vồng','hieu_ung','legendary',1000,10,array['nam','nu'],true,62)
on conflict (id) do nothing;

insert into public.pet_lines (event, variant, text, sort)
select * from (values
  ('back','nam','Ê bạn về rồi! Pi chờ mãi đó!',0),
  ('back','nam','Về rồi hả? Chiến tiếp thôi!',1),
  ('back','nu','A, bạn quay lại rồi! Pi nhớ bạn lắm!',0),
  ('back','nu','Bạn về rồi nè, Pi vui ghê!',1),
  ('level','nam','Lên cấp {so}! Pi mạnh thêm rồi nhé!',0),
  ('level','nu','Pi lên cấp {so} rồi, cảm ơn bạn nha!',0),
  ('streak','nam','{so} ngày liền đủ bữa, phong độ đấy!',0),
  ('streak','nam','Chuỗi {so} ngày, giữ lửa nha bạn!',1),
  ('streak','nu','{so} ngày liền rồi nè, Pi tự hào lắm!',0),
  ('streak','nu','Chuỗi {so} ngày luôn, giỏi ghê!',1),
  ('full','nam','Đủ bữa rồi, chiến quá bạn ơi!',0),
  ('full','nam','Hôm nay ăn chuẩn bài, ngon!',1),
  ('full','nu','Hôm nay ăn đủ bữa luôn, giỏi ghê!',0),
  ('full','nu','Đủ bữa rồi nè, Pi vui lắm!',1),
  ('weight','nam','Đều tay cả tuần, kết quả tới rồi đó!',0),
  ('weight','nu','Cả tuần đều đặn, thấy kết quả rồi nè!',0),
  ('meal_late','nam','Trưa nay ăn gì đó? Ghi Pi biết với!',0),
  ('meal_late','nu','Bạn ăn trưa chưa nè? Nhớ ghi cho Pi nha.',0),
  ('water','nam','Còn {so} ly nữa thôi, làm luôn không?',0),
  ('water','nu','Còn {so} ly nước nữa nha, uống từ từ thôi.',0),
  ('gym','nam','Hôm nay ngày tập, quẩy hết mình nha!',0),
  ('gym','nu','Hôm nay đi tập nè, cố lên nha!',0),
  ('rest','nam','Nghỉ ngơi cũng là tập, sạc pin đi bạn!',0),
  ('rest','nu','Hôm nay nghỉ ngơi cho khỏe nha.',0),
  ('night','nam','Khuya rồi, ngủ lấy sức mai chiến tiếp.',0),
  ('night','nu','Khuya rồi đó, đi ngủ sớm nha bạn.',0),
  ('poke_sleep','nam','Ơ… Pi ngủ tiếp chút nha…',0),
  ('poke_sleep','nu','Ưm… cho Pi ngủ thêm xíu…',0)
) v(event, variant, text, sort) where not exists (select 1 from public.pet_lines);

select 'ok' as ket_qua;
