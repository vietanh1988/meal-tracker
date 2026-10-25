-- 25/10 (chủ dự án chốt): ô mới "Túi" (túi đeo chéo, vẽ đè lên áo) — 6 balo / túi đeo lưng chuyển sang ô Túi
create or replace function public.pet_equip(p_slot text, p_item text default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_it record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if p_slot not in ('ao','dau','giay','co','mat','toc','tay','gang','lung','tui','phong') then raise exception 'Ô không hợp lệ'; end if;
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

update public.pet_items set slot = 'tui' where id in ('giangsinh-nam-pk12','muadong-nam-pk11','trungthu-nam-pk11','tet-nam-pk11','tet-nu-pk11','muahe-nam-pk12');
update public.pet_items set name = 'Túi người tuyết đeo chéo' where id = 'giangsinh-nam-pk12' and name = 'Ba lô người tuyết';
update public.pet_items set name = 'Túi len nâu đeo chéo' where id = 'muadong-nam-pk11' and name = 'Ba lô len nâu';
update public.pet_items set name = 'Túi chống nước xanh đeo chéo' where id = 'muahe-nam-pk12' and name = 'Ba lô chống nước xanh';
-- ai đang đeo các món này ở ô Lưng → chuyển sang ô Túi (giữ món)
update public.pet_equipped set slot = 'tui' where slot = 'lung' and item_id in ('giangsinh-nam-pk12','muadong-nam-pk11','trungthu-nam-pk11','tet-nam-pk11','tet-nu-pk11','muahe-nam-pk12');
