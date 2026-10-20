-- Fipilot Pet (20/10 khuya): bộ Bóng đá — 16 món (12 đồ rời + 4 áo liền thân). Mặc định ĐÓNG, admin mở theo mùa giải. Chạy lại vẫn an toàn.
insert into public.pet_items (id, name, slot, rarity, price, level, variants, achievement, sort) values
  ('bong-da-01','Mũ lưỡi trai cổ vũ','dau','common',150,1,array['nam','nu'],false,170),
  ('bong-da-02','Băng đô cổ vũ','dau','common',150,1,array['nam','nu'],false,171),
  ('bong-da-03','Bờm nơ sao vàng','dau','common',150,1,array['nu'],false,172),
  ('bong-da-04','Mũ len cổ vũ','dau','common',150,2,array['nam','nu'],false,173),
  ('bong-da-05','Kính ngôi sao','kinh','common',150,1,array['nam','nu'],false,174),
  ('bong-da-06','Khăn cổ vũ','deo','common',150,1,array['nam','nu'],false,175),
  ('bong-da-07','Quả bóng đá','cam_tay','common',150,1,array['nam','nu'],false,176),
  ('bong-da-08','Cúp vô địch','cam_tay','rare',400,3,array['nam','nu'],false,177),
  ('bong-da-09','Cờ đỏ sao vàng','cam_tay','common',150,1,array['nam','nu'],false,178),
  ('bong-da-10','Kèn cổ vũ','cam_tay','common',150,2,array['nam','nu'],false,179),
  ('bong-da-11','Pháo giấy','hieu_ung','common',150,2,array['nam','nu'],false,180),
  ('bong-da-12','Bóng bay sao','hieu_ung','rare',400,3,array['nam','nu'],false,181),
  ('bong-da-ao-01','Áo đấu đỏ','ao','common',150,1,array['nam'],false,182),
  ('bong-da-ao-02','Áo thủ môn','ao','rare',400,3,array['nam'],false,183),
  ('bong-da-ao-03','Váy cổ động','ao','common',150,1,array['nu'],false,184),
  ('bong-da-ao-04','Áo đấu trắng','ao','rare',400,2,array['nu'],false,185)
on conflict (id) do nothing;

create or replace function public.pet_col_open(p_col text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_cfg jsonb := coalesce((select value::jsonb -> 'collections' -> p_col from public.app_settings where key = 'pet_config'), '{}'::jsonb);
  v_day date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_mode text; v_from text; v_to text; v_md text; v_before int; v_after int; t date;
  v_tet date[] := array['2027-02-06','2028-01-26','2029-02-13','2030-02-03','2031-01-23','2032-02-11','2033-01-31','2034-02-19','2035-02-08','2036-01-28']::date[];
begin
  if p_col is null then return true; end if;
  v_mode := coalesce(v_cfg ->> 'mode', case p_col when 'co-trang' then 'open' when 'bong-da' then 'closed' else 'season' end); -- Bóng đá: admin mở theo mùa giải
  if v_mode = 'open' then return true; end if;
  if v_mode = 'closed' then return false; end if;
  if p_col = 'tet' then
    v_before := coalesce((v_cfg ->> 'before')::int, 21); v_after := coalesce((v_cfg ->> 'after')::int, 15);
    foreach t in array v_tet loop
      if v_day between t - v_before and t + v_after then return true; end if;
    end loop;
    return false;
  end if;
  v_from := coalesce(v_cfg ->> 'from', case p_col when 'noel' then '12-01' when 'halloween' then '10-15' when 'bong-da' then '11-15' else '01-01' end);
  v_to := coalesce(v_cfg ->> 'to', case p_col when 'noel' then '01-06' when 'halloween' then '11-02' when 'bong-da' then '01-10' else '12-31' end);
  v_md := to_char(v_day, 'MM-DD');
  if v_from <= v_to then return v_md between v_from and v_to; end if;
  return v_md >= v_from or v_md <= v_to;
end $$;
revoke all on function public.pet_col_open(text) from public, anon;
grant execute on function public.pet_col_open(text) to authenticated;

