-- 21/10 (chủ dự án: phòng phải theo chủ đề, không tự đổi theo ngày): phòng của bộ là 1 MÓN (ô 'phong') — bán theo lịch bán của bộ
-- (pet_buy lấy bộ theo tiền tố mã), mua rồi chọn ở Tủ đồ, dùng quanh năm; không chọn = phòng thường. Chạy lại vẫn an toàn.
insert into public.pet_items (id, name, slot, rarity, price, level, variants, achievement, sort) values
  ('halloween-phong','Phòng Halloween','phong','rare',600,2,array['nam','nu'],false,300),
  ('bong-da-phong','Phòng Bóng đá','phong','rare',600,2,array['nam','nu'],false,301),
  ('noel-phong','Phòng Noel','phong','rare',600,2,array['nam'],false,302),
  ('tet-phong','Phòng Tết','phong','rare',600,2,array['nu'],false,303)
on conflict (id) do nothing;

create or replace function public.pet_equip(p_slot text, p_item text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_it record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_slot not in ('dau','ao','kinh','tai_nghe','cam_tay','cam_tay_trai','deo','sau_lung','duoi_chan','hieu_ung','phong') then raise exception 'Ô không hợp lệ'; end if;
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
