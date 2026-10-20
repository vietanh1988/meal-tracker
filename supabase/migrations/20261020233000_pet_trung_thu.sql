-- Fipilot Pet (20/10 khuya): bộ Trung thu — 16 món (12 đồ rời + 4 áo liền thân). Bán 21 ngày trước – 3 ngày sau rằm tháng 8. Chạy lại vẫn an toàn.
insert into public.pet_items (id, name, slot, rarity, price, level, variants, achievement, sort) values
  ('trung-thu-01','Bờm tai thỏ','dau','common',150,1,array['nam','nu'],false,190),
  ('trung-thu-02','Mũ len trăng khuyết','dau','common',150,1,array['nam','nu'],false,191),
  ('trung-thu-03','Kẹp tóc ngôi sao','dau','common',150,1,array['nu'],false,192),
  ('trung-thu-04','Đèn ông sao','cam_tay','common',150,1,array['nam','nu'],false,193),
  ('trung-thu-05','Đèn cá chép','cam_tay','rare',400,2,array['nam','nu'],false,194),
  ('trung-thu-06','Đèn thỏ ngọc','cam_tay','rare',400,2,array['nu'],false,195),
  ('trung-thu-07','Bánh trung thu','cam_tay','common',150,1,array['nam','nu'],false,196),
  ('trung-thu-08','Tò he gà trống','cam_tay','common',150,2,array['nam','nu'],false,197),
  ('trung-thu-09','Túi đeo hông trăng','deo','common',150,2,array['nam','nu'],false,198),
  ('trung-thu-10','Balo bánh nướng','sau_lung','rare',400,3,array['nam','nu'],false,199),
  ('trung-thu-11','Trăng rằm','hieu_ung','rare',400,3,array['nam','nu'],false,200),
  ('trung-thu-12','Đèn trời','hieu_ung','common',150,2,array['nam','nu'],false,201),
  ('trung-thu-ao-01','Áo chú Cuội','ao','common',150,1,array['nam'],false,202),
  ('trung-thu-ao-02','Bộ múa lân','ao','legendary',1000,4,array['nam'],false,203),
  ('trung-thu-ao-03','Váy chị Hằng','ao','legendary',1000,4,array['nu'],false,204),
  ('trung-thu-ao-04','Áo thỏ ngọc','ao','rare',400,2,array['nu'],false,205)
on conflict (id) do nothing;

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
  v_mode := coalesce(v_cfg ->> 'mode', case p_col when 'co-trang' then 'open' when 'bong-da' then 'closed' else 'season' end); -- Bóng đá: admin mở theo mùa giải
  if v_mode = 'open' then return true; end if;
  if v_mode = 'closed' then return false; end if;
  if p_col in ('tet', 'trung-thu') then
    v_before := coalesce((v_cfg ->> 'before')::int, case p_col when 'tet' then 21 else 21 end); v_after := coalesce((v_cfg ->> 'after')::int, case p_col when 'tet' then 15 else 3 end);
    foreach t in array (case p_col when 'tet' then v_tet else v_tt end) loop
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

