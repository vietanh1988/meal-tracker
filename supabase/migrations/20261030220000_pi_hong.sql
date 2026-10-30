-- 30/10 Pi hồng (chủ dự án chốt): Pi nữ mặc định HỒNG, chọn được Xanh ở Tủ đồ (pet_profiles.settings.color = 'hong' | 'xanh').
-- Ảnh hồng sinh sẵn (scripts/pi/pink.py → public/pi/hong/…). Pi nam luôn xanh.
-- Thẻ Pi người khác (bảng xếp hạng, bạn bè, phòng bạn, mã mời, trang web /pi/<biệt danh>) trả thêm 'color' để vẽ đúng màu.
create or replace function public.pet_color(p_uid uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.pet_variant(p_uid) <> 'nu' then 'xanh'
              when (select settings->>'color' from public.pet_profiles where user_id = p_uid) = 'xanh' then 'xanh' else 'hong' end
$$;
revoke all on function public.pet_color(uuid) from public, anon, authenticated;

create or replace function public.pi_code_info(p_code text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('name', p.name, 'nick', s.nick, 'variant', public.pet_variant(s.user_id), 'color', public.pet_color(s.user_id),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = s.user_id))
  from public.pi_share s join public.pet_profiles p on p.user_id = s.user_id where s.code = upper(trim(p_code))
$$;
revoke all on function public.pi_code_info(text) from public;
grant execute on function public.pi_code_info(text) to anon, authenticated;

create or replace function public.web_pi(p_nick text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('nick', s.nick, 'code', s.code, 'name', p.name, 'variant', public.pet_variant(s.user_id), 'color', public.pet_color(s.user_id),
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

create or replace function public.pi_card(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('nick', s.nick, 'name', coalesce(p.name, 'Pi'), 'variant', public.pet_variant(p_uid), 'color', public.pet_color(p_uid), 'level', public.pet_level(coalesce(p.xp, 0)),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = p_uid),
    'place', (select coalesce(jsonb_object_agg(it.id, it.place->'tf'), '{}'::jsonb) from public.pet_equipped e join public.pet_items it on it.id = e.item_id where e.user_id = p_uid and it.place ? 'tf'))
  from public.pet_profiles p left join public.pi_share s on s.user_id = p.user_id where p.user_id = p_uid
$$;
revoke all on function public.pi_card(uuid) from public, anon, authenticated;
