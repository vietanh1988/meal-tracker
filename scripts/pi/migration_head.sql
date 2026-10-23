-- 23/10 (chủ dự án chốt): Pi bộ mới (Muse AI) THAY HẲN Pi cũ; đồ mới mua bằng Hạt như cũ, bán theo dịp của từng bộ.
-- 6 bộ: Tết, Trung thu, Halloween, Giáng sinh (lịch bán của bộ Noel), Mùa đông, Mùa hè (2 bộ mới có lịch riêng) · 300 món + 6 phòng.
-- Ô mới: ao, dau, giay, co, mat (kính / mặt nạ), toc (kẹp tóc), tay (cầm tay), gang, lung (đeo lưng), phong.
-- Đồ cũ (bản vẽ 20/10): ẩn, không bán; ai đã mua thì hoàn lại đúng số Hạt đã trả (sổ 'refund:<món>', không cộng kinh nghiệm), bỏ khỏi tủ đồ,
-- tháo khỏi Pi. Đồ thành tích cũ giữ trong tủ (trưng ở danh sách thành tích). Chạy lại nhiều lần vẫn an toàn.

-- ===== Lịch bán: thêm Mùa đông (1/12 – 28/2), Mùa hè (1/5 – 31/8) =====
create or replace function public.pet_col_open(p_col text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_cfg jsonb := coalesce((select value::jsonb -> 'collections' -> p_col from public.app_settings where key = 'pet_config'), '{}'::jsonb);
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_mode text; v_from text; v_to text; v_md text; v_before int; v_after int; t date;
  v_tt date[] := array['2027-09-15','2028-10-03','2029-09-22','2030-09-12','2031-10-01','2032-09-19','2033-09-08','2034-09-27','2035-09-16','2036-10-04']::date[]; -- rằm tháng 8
  v_tet date[] := array['2027-02-06','2028-01-26','2029-02-13','2030-02-03','2031-01-23','2032-02-11','2033-01-31','2034-02-19','2035-02-08','2036-01-28']::date[];
begin
  if p_col is null then return true; end if;
  v_mode := coalesce(v_cfg ->> 'mode', case p_col when 'co-trang' then 'open' when 'bong-da' then 'closed' else 'season' end);
  if v_mode = 'open' then return true; end if;
  if v_mode = 'closed' then return false; end if;
  if p_col in ('tet', 'trung-thu') then
    v_before := coalesce((v_cfg ->> 'before')::int, 21); v_after := coalesce((v_cfg ->> 'after')::int, case p_col when 'tet' then 15 else 3 end);
    foreach t in array (case p_col when 'tet' then v_tet else v_tt end) loop
      if v_day between t - v_before and t + v_after then return true; end if;
    end loop;
    return false;
  end if;
  v_from := coalesce(v_cfg ->> 'from', case p_col when 'noel' then '12-01' when 'halloween' then '10-15' when 'bong-da' then '11-15' when 'mua-dong' then '12-01' when 'mua-he' then '05-01' else '01-01' end);
  v_to := coalesce(v_cfg ->> 'to', case p_col when 'noel' then '01-06' when 'halloween' then '11-02' when 'bong-da' then '01-10' when 'mua-dong' then '02-28' when 'mua-he' then '08-31' else '12-31' end);
  v_md := to_char(v_day, 'MM-DD');
  if v_from <= v_to then return v_md between v_from and v_to; end if;
  return v_md >= v_from or v_md <= v_to;
end $$;
revoke all on function public.pet_col_open(text) from public, anon;
grant execute on function public.pet_col_open(text) to authenticated;

-- ===== Bộ của 1 món theo mã: <sự kiện>-<nam|nu>-<loại><số> · phong-<sự kiện> · mã cũ <bộ>-… =====
create or replace function public.pet_item_col(p_item text) returns text
language sql immutable as $$
  select case coalesce(substring(p_item from '^phong-(tet|trungthu|halloween|giangsinh|muadong|muahe)$'), substring(p_item from '^(tet|trungthu|halloween|giangsinh|muadong|muahe)-(?:nam|nu)-'))
    when 'giangsinh' then 'noel' when 'trungthu' then 'trung-thu' when 'muadong' then 'mua-dong' when 'muahe' then 'mua-he'
    when 'tet' then 'tet' when 'halloween' then 'halloween'
    else substring(p_item from '^(noel|tet|co-trang|halloween|trung-thu|bong-da)-') end
$$;
grant execute on function public.pet_item_col(text) to authenticated;

create or replace function public.pet_buy(p_item text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_it record; v_p record; v_tier text;
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_col text := public.pet_item_col(p_item);
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  select * into v_p from public.pet_profiles where user_id = v_uid for update;
  select * into v_it from public.pet_items where id = p_item;
  if not found or v_it.hidden then raise exception 'Món này không còn bán'; end if;
  if v_it.achievement then raise exception 'Đồ thành tích không bán'; end if;
  if not public.pet_col_open(v_col) then raise exception 'Bộ này chưa tới dịp mở bán'; end if;
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

-- ===== Mặc / tháo: ô của bộ mới (mỗi món 1 ô cố định) =====
create or replace function public.pet_equip(p_slot text, p_item text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_it record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_slot not in ('ao','dau','giay','co','mat','toc','tay','gang','lung','phong') then raise exception 'Ô không hợp lệ'; end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  if p_item is null then
    delete from public.pet_equipped where user_id = v_uid and slot = p_slot;
  else
    select * into v_it from public.pet_items where id = p_item;
    if not found then raise exception 'Món không có'; end if;
    if not exists (select 1 from public.pet_inventory where user_id = v_uid and item_id = p_item) then raise exception 'Bạn chưa có món này'; end if;
    if v_it.slot <> p_slot then raise exception 'Món này không đeo ở ô đó'; end if;
    if not (public.pet_variant(v_uid) = any (v_it.variants)) then raise exception 'Món này không dành cho Pi của bạn'; end if;
    insert into public.pet_equipped (user_id, slot, item_id) values (v_uid, p_slot, p_item)
      on conflict (user_id, slot) do update set item_id = excluded.item_id;
  end if;
  return public.pet_state_json(v_uid);
end $$;
revoke all on function public.pet_equip(text, text) from public, anon;
grant execute on function public.pet_equip(text, text) to authenticated;
