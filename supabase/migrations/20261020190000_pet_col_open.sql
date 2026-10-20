-- 20/10 (chủ dự án): bộ sưu tập theo dịp — chưa đến dịp thì khoá mua. Luật giống src/lib/petMath.js collectionStatus.
-- Cài đặt: app_settings.pet_config → collections.{noel|tet|co-trang} = { mode: season|open|closed, from/to "MM-DD" (Noel), before/after ngày (Tết) }.
create or replace function public.pet_col_open(p_col text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_cfg jsonb := coalesce((select value::jsonb -> 'collections' -> p_col from public.app_settings where key = 'pet_config'), '{}'::jsonb);
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_mode text; v_from text; v_to text; v_md text; v_before int; v_after int; t date;
  v_tet date[] := array['2027-02-06','2028-01-26','2029-02-13','2030-02-03','2031-01-23','2032-02-11','2033-01-31','2034-02-19','2035-02-08','2036-01-28']::date[];
begin
  if p_col is null then return true; end if;
  v_mode := coalesce(v_cfg ->> 'mode', case when p_col = 'co-trang' then 'open' else 'season' end);
  if v_mode = 'open' then return true; end if;
  if v_mode = 'closed' then return false; end if;
  if p_col = 'tet' then
    v_before := coalesce((v_cfg ->> 'before')::int, 21); v_after := coalesce((v_cfg ->> 'after')::int, 15);
    foreach t in array v_tet loop
      if v_day between t - v_before and t + v_after then return true; end if;
    end loop;
    return false;
  end if;
  v_from := coalesce(v_cfg ->> 'from', case when p_col = 'noel' then '12-01' else '01-01' end);
  v_to := coalesce(v_cfg ->> 'to', case when p_col = 'noel' then '01-06' else '12-31' end);
  v_md := to_char(v_day, 'MM-DD');
  if v_from <= v_to then return v_md between v_from and v_to; end if;
  return v_md >= v_from or v_md <= v_to;
end $$;
revoke all on function public.pet_col_open(text) from public, anon;
grant execute on function public.pet_col_open(text) to authenticated;

create or replace function public.pet_buy(p_item text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_it record; v_p record; v_tier text;
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_col text := case when p_item like 'noel-%' then 'noel' when p_item like 'tet-%' then 'tet' when p_item like 'co-trang-%' then 'co-trang' else null end;
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
