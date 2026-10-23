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

-- ===== Món bộ mới (sinh từ src/pi/manifest.json bằng scripts/pi/sql.py) =====
insert into public.pet_items (id, name, slot, rarity, price, level, variants, achievement, sort) values
  ('giangsinh-nam-ao01','Áo len đỏ hoạ tiết tuần lộc','ao','common',250,1,array['nam'],false,2000),
  ('giangsinh-nam-ao02','Bộ đồ ông già Noel áo đỏ viền lông trắng, đai đen khoá vàng','ao','common',250,1,array['nam'],false,2001),
  ('giangsinh-nam-ao03','Áo phao xanh lá hoạ tiết bông tuyết','ao','common',250,1,array['nam'],false,2002),
  ('giangsinh-nam-ao04','Áo hoodie trắng in cây thông','ao','common',250,1,array['nam'],false,2003),
  ('giangsinh-nam-ao05','Áo vest đỏ thắt nơ xanh dự tiệc','ao','common',250,1,array['nam'],false,2004),
  ('giangsinh-nam-dau01','Mũ ông già Noel đỏ quả bông trắng','dau','common',150,1,array['nam'],false,2005),
  ('giangsinh-nam-dau02','Mũ len có sừng tuần lộc','dau','common',150,1,array['nam'],false,2006),
  ('giangsinh-nam-dau03','Mũ len xanh lá quả bông đỏ','dau','common',150,1,array['nam'],false,2007),
  ('giangsinh-nam-dau04','Mũ yêu tinh xanh lá có chuông','dau','common',150,1,array['nam'],false,2008),
  ('giangsinh-nam-dau05','Băng đô sừng tuần lộc','dau','common',150,1,array['nam'],false,2009),
  ('giangsinh-nam-pk01','Kính hình bông tuyết','mat','common',120,1,array['nam'],false,2010),
  ('giangsinh-nam-pk02','Kính tròn gọng đỏ','mat','common',120,1,array['nam'],false,2011),
  ('giangsinh-nam-pk03','Khăn len sọc đỏ xanh lá','co','common',100,1,array['nam'],false,2012),
  ('giangsinh-nam-pk04','Nơ cổ đỏ','co','common',100,1,array['nam'],false,2013),
  ('giangsinh-nam-pk05','Vòng cổ chuông lục lạc','co','common',100,1,array['nam'],false,2014),
  ('giangsinh-nam-pk06','Cầm kẹo gậy','tay','common',150,1,array['nam'],false,2015),
  ('giangsinh-nam-pk07','Cầm hộp quà','tay','common',150,1,array['nam'],false,2016),
  ('giangsinh-nam-pk08','Cầm cốc ca cao nóng','tay','common',150,1,array['nam'],false,2017),
  ('giangsinh-nam-pk09','Cầm quả châu thông','tay','common',150,1,array['nam'],false,2018),
  ('giangsinh-nam-pk10','Găng tay len đỏ','gang','common',100,1,array['nam'],false,2019),
  ('giangsinh-nam-pk11','Túi quà ông già Noel đeo lưng','lung','common',200,1,array['nam'],false,2020),
  ('giangsinh-nam-pk12','Ba lô người tuyết','lung','common',200,1,array['nam'],false,2021),
  ('giangsinh-nam-giay01','Ủng đỏ viền lông trắng','giay','common',80,1,array['nam'],false,2022),
  ('giangsinh-nam-giay02','Giày len xanh lá','giay','common',80,1,array['nam'],false,2023),
  ('giangsinh-nam-giay03','Dép bông hình tuần lộc','giay','common',80,1,array['nam'],false,2024),
  ('giangsinh-nu-ao01','Váy Noel đỏ viền lông trắng, nơ trước ngực','ao','common',250,1,array['nu'],false,2025),
  ('giangsinh-nu-ao02','Váy công chúa tuyết trắng ánh bạc','ao','common',250,1,array['nu'],false,2026),
  ('giangsinh-nu-ao03','Áo len hồng hoạ tiết kẹo gậy kèm chân váy đỏ','ao','common',250,1,array['nu'],false,2027),
  ('giangsinh-nu-ao04','Áo choàng đỏ viền lông có nút gỗ','ao','common',250,1,array['nu'],false,2028),
  ('giangsinh-nu-ao05','Váy yếm xanh lá hoạ tiết hộp quà','ao','common',250,1,array['nu'],false,2029),
  ('giangsinh-nu-dau01','Mũ Noel đỏ thắt nơ hồng','dau','common',150,1,array['nu'],false,2030),
  ('giangsinh-nu-dau02','Băng đô sừng tuần lộc gắn hoa','dau','common',150,1,array['nu'],false,2031),
  ('giangsinh-nu-dau03','Vương miện bông tuyết bạc','dau','common',150,1,array['nu'],false,2032),
  ('giangsinh-nu-dau04','Mũ len trắng tai thỏ','dau','common',150,1,array['nu'],false,2033),
  ('giangsinh-nu-dau05','Băng đô nơ đỏ chuông vàng','dau','common',150,1,array['nu'],false,2034),
  ('giangsinh-nu-pk01','Kính hình ngôi sao vàng','mat','common',120,1,array['nu'],false,2035),
  ('giangsinh-nu-pk02','Kính tim hồng','mat','common',120,1,array['nu'],false,2036),
  ('giangsinh-nu-pk03','Khăn len trắng quả bông','co','common',100,1,array['nu'],false,2037),
  ('giangsinh-nu-pk04','Vòng cổ ngọc trai chuông nhỏ','co','common',100,1,array['nu'],false,2038),
  ('giangsinh-nu-pk05','Nơ cổ nhung đỏ','co','common',100,1,array['nu'],false,2039),
  ('giangsinh-nu-pk06','Cầm kẹo gậy hồng','tay','common',150,1,array['nu'],false,2040),
  ('giangsinh-nu-pk07','Cầm hộp quà nơ hồng','tay','common',150,1,array['nu'],false,2041),
  ('giangsinh-nu-pk08','Cầm đũa thần bông tuyết','tay','common',150,1,array['nu'],false,2042),
  ('giangsinh-nu-pk09','Cầm bánh gừng','tay','common',150,1,array['nu'],false,2043),
  ('giangsinh-nu-pk10','Găng tay lông trắng','gang','common',100,1,array['nu'],false,2044),
  ('giangsinh-nu-pk11','Đôi cánh thiên thần nhỏ','lung','common',200,1,array['nu'],false,2045),
  ('giangsinh-nu-pk12','Kẹp tóc bông tuyết','toc','common',100,1,array['nu'],false,2046),
  ('giangsinh-nu-giay01','Ủng trắng lông xù','giay','common',80,1,array['nu'],false,2047),
  ('giangsinh-nu-giay02','Giày búp bê đỏ thắt nơ','giay','common',80,1,array['nu'],false,2048),
  ('giangsinh-nu-giay03','Dép bông hồng tai thỏ','giay','common',80,1,array['nu'],false,2049),
  ('tet-nam-ao01','Áo dài nam đỏ hoạ tiết rồng vàng','ao','common',250,1,array['nam'],false,2050),
  ('tet-nam-ao02','Áo dài nam xanh ngọc hoạ tiết chữ Thọ','ao','common',250,1,array['nam'],false,2051),
  ('tet-nam-ao03','Áo bà ba nâu kèm khăn rằn','ao','common',250,1,array['nam'],false,2052),
  ('tet-nam-ao04','Áo the đen trơn kiểu truyền thống','ao','common',250,1,array['nam'],false,2053),
  ('tet-nam-ao05','Áo sơ mi đỏ in hoa mai vàng','ao','common',250,1,array['nam'],false,2054),
  ('tet-nam-dau01','Khăn đóng đỏ','dau','common',150,1,array['nam'],false,2055),
  ('tet-nam-dau02','Khăn đóng xanh ngọc','dau','common',150,1,array['nam'],false,2056),
  ('tet-nam-dau03','Nón lá','dau','common',150,1,array['nam'],false,2057),
  ('tet-nam-dau04','Mũ lân đỏ vàng','dau','common',150,1,array['nam'],false,2058),
  ('tet-nam-dau05','Băng đô đỏ chữ Phúc','dau','common',150,1,array['nam'],false,2059),
  ('tet-nam-pk01','Kính tròn gọng vàng kiểu cổ','mat','common',120,1,array['nam'],false,2060),
  ('tet-nam-pk02','Dây chuyền đồng tiền vàng','co','common',100,1,array['nam'],false,2061),
  ('tet-nam-pk03','Khăn rằn quàng cổ','co','common',100,1,array['nam'],false,2062),
  ('tet-nam-pk04','Nơ cổ đỏ chữ Lộc','co','common',100,1,array['nam'],false,2063),
  ('tet-nam-pk05','Cầm bao lì xì','tay','common',150,1,array['nam'],false,2064),
  ('tet-nam-pk06','Cầm cành mai vàng','tay','common',150,1,array['nam'],false,2065),
  ('tet-nam-pk07','Cầm bánh chưng','tay','common',150,1,array['nam'],false,2066),
  ('tet-nam-pk08','Cầm câu đối đỏ','tay','common',150,1,array['nam'],false,2067),
  ('tet-nam-pk09','Cầm quạt giấy đỏ','tay','common',150,1,array['nam'],false,2068),
  ('tet-nam-pk10','Cầm pháo giấy trang trí','tay','common',150,1,array['nam'],false,2069),
  ('tet-nam-pk11','Túi gấm đỏ đeo chéo','lung','common',200,1,array['nam'],false,2070),
  ('tet-nam-pk12','Kính đỏ hình chữ Phúc','mat','common',120,1,array['nam'],false,2071),
  ('tet-nam-giay01','Hài đỏ thêu rồng','giay','common',80,1,array['nam'],false,2072),
  ('tet-nam-giay02','Giày vải đen truyền thống','giay','common',80,1,array['nam'],false,2073),
  ('tet-nam-giay03','Dép mộc gỗ','giay','common',80,1,array['nam'],false,2074),
  ('tet-nu-ao01','Áo dài đỏ thêu hoa mai vàng','ao','common',250,1,array['nu'],false,2075),
  ('tet-nu-ao02','Áo dài hồng phấn thêu hoa đào','ao','common',250,1,array['nu'],false,2076),
  ('tet-nu-ao03','Áo yếm đỏ kèm váy lụa','ao','common',250,1,array['nu'],false,2077),
  ('tet-nu-ao04','Áo dài cách tân vàng hoạ tiết sen','ao','common',250,1,array['nu'],false,2078),
  ('tet-nu-ao05','Áo tứ thân nâu kèm thắt lưng xanh','ao','common',250,1,array['nu'],false,2079),
  ('tet-nu-dau01','Khăn vấn vàng','dau','common',150,1,array['nu'],false,2080),
  ('tet-nu-dau02','Mấn đội đầu đỏ kiểu cổ','dau','common',150,1,array['nu'],false,2081),
  ('tet-nu-dau03','Nón lá thắt quai lụa hồng','dau','common',150,1,array['nu'],false,2082),
  ('tet-nu-dau04','Băng đô hoa đào','dau','common',150,1,array['nu'],false,2083),
  ('tet-nu-dau05','Cài tóc hoa mai lớn','dau','common',150,1,array['nu'],false,2084),
  ('tet-nu-pk01','Kính tim đỏ','mat','common',120,1,array['nu'],false,2085),
  ('tet-nu-pk02','Vòng cổ ngọc bích','co','common',100,1,array['nu'],false,2086),
  ('tet-nu-pk03','Dây chuyền hoa sen vàng','co','common',100,1,array['nu'],false,2087),
  ('tet-nu-pk04','Khăn lụa hồng','co','common',100,1,array['nu'],false,2088),
  ('tet-nu-pk05','Cầm bao lì xì hồng','tay','common',150,1,array['nu'],false,2089),
  ('tet-nu-pk06','Cầm cành đào','tay','common',150,1,array['nu'],false,2090),
  ('tet-nu-pk07','Cầm giỏ mứt Tết','tay','common',150,1,array['nu'],false,2091),
  ('tet-nu-pk08','Cầm quạt lụa thêu hoa','tay','common',150,1,array['nu'],false,2092),
  ('tet-nu-pk09','Cầm đèn lồng đỏ nhỏ','tay','common',150,1,array['nu'],false,2093),
  ('tet-nu-pk10','Cầm khay bánh mứt','tay','common',150,1,array['nu'],false,2094),
  ('tet-nu-pk11','Túi gấm vàng đeo chéo','lung','common',200,1,array['nu'],false,2095),
  ('tet-nu-pk12','Trâm cài tóc hoa mai','toc','common',100,1,array['nu'],false,2096),
  ('tet-nu-giay01','Hài thêu hoa đỏ','giay','common',80,1,array['nu'],false,2097),
  ('tet-nu-giay02','Guốc mộc sơn hoa','giay','common',80,1,array['nu'],false,2098),
  ('tet-nu-giay03','Giày búp bê vàng thêu sen','giay','common',80,1,array['nu'],false,2099),
  ('muadong-nam-ao01','Áo phao xanh navy có mũ viền lông','ao','common',250,1,array['nam'],false,2100),
  ('muadong-nam-ao02','Áo khoác dạ be cài khuy','ao','common',250,1,array['nam'],false,2101),
  ('muadong-nam-ao03','Áo len cổ lọ xám hoạ tiết vặn thừng','ao','common',250,1,array['nam'],false,2102),
  ('muadong-nam-ao04','Áo hoodie nỉ xanh rêu','ao','common',250,1,array['nam'],false,2103),
  ('muadong-nam-ao05','Áo khoác lông cừu nâu','ao','common',250,1,array['nam'],false,2104),
  ('muadong-nam-dau01','Mũ len xám quả bông','dau','common',150,1,array['nam'],false,2105),
  ('muadong-nam-dau02','Mũ lông có che tai kiểu phi công','dau','common',150,1,array['nam'],false,2106),
  ('muadong-nam-dau03','Mũ beret nâu','dau','common',150,1,array['nam'],false,2107),
  ('muadong-nam-dau04','Bịt tai lông đen','dau','common',150,1,array['nam'],false,2108),
  ('muadong-nam-dau05','Mũ len sọc xanh trắng','dau','common',150,1,array['nam'],false,2109),
  ('muadong-nam-pk01','Khăn len kẻ caro đỏ','co','common',100,1,array['nam'],false,2110),
  ('muadong-nam-pk02','Khăn len xám dài','co','common',100,1,array['nam'],false,2111),
  ('muadong-nam-pk03','Kính tròn gọng đen','mat','common',120,1,array['nam'],false,2112),
  ('muadong-nam-pk04','Kính trượt tuyết','mat','common',120,1,array['nam'],false,2113),
  ('muadong-nam-pk05','Găng tay len xám','gang','common',100,1,array['nam'],false,2114),
  ('muadong-nam-pk06','Cầm cốc trà nóng bốc khói','tay','common',150,1,array['nam'],false,2115),
  ('muadong-nam-pk07','Cầm túi sưởi tay','tay','common',150,1,array['nam'],false,2116),
  ('muadong-nam-pk08','Cầm quả cầu tuyết','tay','common',150,1,array['nam'],false,2117),
  ('muadong-nam-pk09','Cầm khoai lang nướng','tay','common',150,1,array['nam'],false,2118),
  ('muadong-nam-pk10','Cầm ván trượt tuyết nhỏ','tay','common',150,1,array['nam'],false,2119),
  ('muadong-nam-pk11','Ba lô len nâu','lung','common',200,1,array['nam'],false,2120),
  ('muadong-nam-pk12','Áo choàng len khoác vai','lung','common',200,1,array['nam'],false,2121),
  ('muadong-nam-giay01','Giày boot da nâu','giay','common',80,1,array['nam'],false,2122),
  ('muadong-nam-giay02','Ủng đi tuyết xám','giay','common',80,1,array['nam'],false,2123),
  ('muadong-nam-giay03','Dép lông trong nhà xanh','giay','common',80,1,array['nam'],false,2124),
  ('muadong-nu-ao01','Áo phao hồng có mũ viền lông','ao','common',250,1,array['nu'],false,2125),
  ('muadong-nu-ao02','Áo khoác dạ đỏ đô thắt đai','ao','common',250,1,array['nu'],false,2126),
  ('muadong-nu-ao03','Váy len trắng cổ lọ','ao','common',250,1,array['nu'],false,2127),
  ('muadong-nu-ao04','Áo cardigan len xanh mint kèm chân váy','ao','common',250,1,array['nu'],false,2128),
  ('muadong-nu-ao05','Áo khoác lông xù kem','ao','common',250,1,array['nu'],false,2129),
  ('muadong-nu-dau01','Mũ len hồng tai mèo','dau','common',150,1,array['nu'],false,2130),
  ('muadong-nu-dau02','Bịt tai lông trắng','dau','common',150,1,array['nu'],false,2131),
  ('muadong-nu-dau03','Mũ beret đỏ','dau','common',150,1,array['nu'],false,2132),
  ('muadong-nu-dau04','Mũ len kem quả bông to','dau','common',150,1,array['nu'],false,2133),
  ('muadong-nu-dau05','Băng đô len đan hoa','dau','common',150,1,array['nu'],false,2134),
  ('muadong-nu-pk01','Khăn len hồng quả bông','co','common',100,1,array['nu'],false,2135),
  ('muadong-nu-pk02','Khăn lông trắng','co','common',100,1,array['nu'],false,2136),
  ('muadong-nu-pk03','Kính tròn gọng vàng hồng','mat','common',120,1,array['nu'],false,2137),
  ('muadong-nu-pk04','Kính trượt tuyết hồng','mat','common',120,1,array['nu'],false,2138),
  ('muadong-nu-pk05','Găng tay len hồng tai mèo','gang','common',100,1,array['nu'],false,2139),
  ('muadong-nu-pk06','Cầm cốc sô cô la nóng','tay','common',150,1,array['nu'],false,2140),
  ('muadong-nu-pk07','Cầm túi sưởi hình gấu','tay','common',150,1,array['nu'],false,2141),
  ('muadong-nu-pk08','Cầm quả cầu tuyết lấp lánh','tay','common',150,1,array['nu'],false,2142),
  ('muadong-nu-pk09','Cầm bó hoa khô','tay','common',150,1,array['nu'],false,2143),
  ('muadong-nu-pk10','Cầm gấu bông nhỏ','tay','common',150,1,array['nu'],false,2144),
  ('muadong-nu-pk11','Ba lô lông xù trắng','lung','common',200,1,array['nu'],false,2145),
  ('muadong-nu-pk12','Kẹp tóc nơ len','toc','common',100,1,array['nu'],false,2146),
  ('muadong-nu-giay01','Boot lông hồng','giay','common',80,1,array['nu'],false,2147),
  ('muadong-nu-giay02','Boot da đỏ đô','giay','common',80,1,array['nu'],false,2148),
  ('muadong-nu-giay03','Dép lông trong nhà trắng tai thỏ','giay','common',80,1,array['nu'],false,2149),
  ('muahe-nam-ao01','Áo sơ mi hoa Hawaii xanh','ao','common',250,1,array['nam'],false,2150),
  ('muahe-nam-ao02','Áo ba lỗ thể thao cam kèm quần short','ao','common',250,1,array['nam'],false,2151),
  ('muahe-nam-ao03','Áo phông trắng in quả dứa','ao','common',250,1,array['nam'],false,2152),
  ('muahe-nam-ao04','Áo cứu hộ đỏ','ao','common',250,1,array['nam'],false,2153),
  ('muahe-nam-ao05','Bộ đồ bơi kẻ sọc xanh trắng','ao','common',250,1,array['nam'],false,2154),
  ('muahe-nam-dau01','Mũ rơm vành rộng','dau','common',150,1,array['nam'],false,2155),
  ('muahe-nam-dau02','Mũ lưỡi trai đội ngược màu cam','dau','common',150,1,array['nam'],false,2156),
  ('muahe-nam-dau03','Mũ tai bèo xanh','dau','common',150,1,array['nam'],false,2157),
  ('muahe-nam-dau04','Băng đô thể thao trắng','dau','common',150,1,array['nam'],false,2158),
  ('muahe-nam-dau05','Kính lặn đeo trên trán','dau','common',150,1,array['nam'],false,2159),
  ('muahe-nam-pk01','Kính râm đen','mat','common',120,1,array['nam'],false,2160),
  ('muahe-nam-pk02','Kính râm tráng gương xanh','mat','common',120,1,array['nam'],false,2161),
  ('muahe-nam-pk03','Vòng cổ hoa Hawaii','co','common',100,1,array['nam'],false,2162),
  ('muahe-nam-pk04','Dây chuyền vỏ sò','co','common',100,1,array['nam'],false,2163),
  ('muahe-nam-pk05','Cầm trái dừa có ống hút','tay','common',150,1,array['nam'],false,2164),
  ('muahe-nam-pk06','Cầm kem ốc quế','tay','common',150,1,array['nam'],false,2165),
  ('muahe-nam-pk07','Cầm ván lướt sóng nhỏ','tay','common',150,1,array['nam'],false,2166),
  ('muahe-nam-pk08','Cầm súng nước','tay','common',150,1,array['nam'],false,2167),
  ('muahe-nam-pk09','Cầm xô cát và xẻng','tay','common',150,1,array['nam'],false,2168),
  ('muahe-nam-pk10','Cầm quả bóng chuyền bãi biển','tay','common',150,1,array['nam'],false,2169),
  ('muahe-nam-pk11','Phao bơi vịt vàng đeo quanh bụng','lung','common',200,1,array['nam'],false,2170),
  ('muahe-nam-pk12','Ba lô chống nước xanh','lung','common',200,1,array['nam'],false,2171),
  ('muahe-nam-giay01','Dép tông xanh','giay','common',80,1,array['nam'],false,2172),
  ('muahe-nam-giay02','Giày sandal nâu','giay','common',80,1,array['nam'],false,2173),
  ('muahe-nam-giay03','Giày lười vải trắng','giay','common',80,1,array['nam'],false,2174),
  ('muahe-nu-ao01','Váy hoa nhí vàng hai dây','ao','common',250,1,array['nu'],false,2175),
  ('muahe-nu-ao02','Áo croptop kèm chân váy jean','ao','common',250,1,array['nu'],false,2176),
  ('muahe-nu-ao03','Váy maxi đi biển trắng','ao','common',250,1,array['nu'],false,2177),
  ('muahe-nu-ao04','Bộ đồ bơi chấm bi hồng có bèo','ao','common',250,1,array['nu'],false,2178),
  ('muahe-nu-ao05','Váy yếm xanh in dưa hấu','ao','common',250,1,array['nu'],false,2179),
  ('muahe-nu-dau01','Mũ rơm thắt nơ hồng','dau','common',150,1,array['nu'],false,2180),
  ('muahe-nu-dau02','Mũ cói vành rộng hoa','dau','common',150,1,array['nu'],false,2181),
  ('muahe-nu-dau03','Băng đô hoa nhiệt đới','dau','common',150,1,array['nu'],false,2182),
  ('muahe-nu-dau04','Mũ tai bèo vàng','dau','common',150,1,array['nu'],false,2183),
  ('muahe-nu-dau05','Kẹp tóc ngôi sao biển','dau','common',150,1,array['nu'],false,2184),
  ('muahe-nu-pk01','Kính râm tim hồng','mat','common',120,1,array['nu'],false,2185),
  ('muahe-nu-pk02','Kính râm gọng trắng to','mat','common',120,1,array['nu'],false,2186),
  ('muahe-nu-pk03','Vòng cổ hoa nhiệt đới','co','common',100,1,array['nu'],false,2187),
  ('muahe-nu-pk04','Dây chuyền ngọc trai biển','co','common',100,1,array['nu'],false,2188),
  ('muahe-nu-pk05','Cầm ly nước ép dưa hấu','tay','common',150,1,array['nu'],false,2189),
  ('muahe-nu-pk06','Cầm kem que','tay','common',150,1,array['nu'],false,2190),
  ('muahe-nu-pk07','Cầm quạt cầm tay','tay','common',150,1,array['nu'],false,2191),
  ('muahe-nu-pk08','Cầm ô che nắng nhỏ','tay','common',150,1,array['nu'],false,2192),
  ('muahe-nu-pk09','Cầm giỏ cói','tay','common',150,1,array['nu'],false,2193),
  ('muahe-nu-pk10','Cầm vỏ sò lớn','tay','common',150,1,array['nu'],false,2194),
  ('muahe-nu-pk11','Phao bơi kỳ lân','lung','common',200,1,array['nu'],false,2195),
  ('muahe-nu-pk12','Hoa dâm bụt cài tóc','toc','common',100,1,array['nu'],false,2196),
  ('muahe-nu-giay01','Dép tông hoa','giay','common',80,1,array['nu'],false,2197),
  ('muahe-nu-giay02','Sandal quai hồng','giay','common',80,1,array['nu'],false,2198),
  ('muahe-nu-giay03','Giày cói đế xuồng','giay','common',80,1,array['nu'],false,2199),
  ('halloween-nam-ao01','Áo choàng ma cà rồng đen lót đỏ','ao','common',250,1,array['nam'],false,2200),
  ('halloween-nam-ao02','Bộ đồ bí ngô cam','ao','common',250,1,array['nam'],false,2201),
  ('halloween-nam-ao03','Bộ đồ bộ xương đen in xương trắng','ao','common',250,1,array['nam'],false,2202),
  ('halloween-nam-ao04','Áo choàng phù thuỷ tím sao vàng','ao','common',250,1,array['nam'],false,2203),
  ('halloween-nam-ao05','Bộ đồ xác ướp quấn băng','ao','common',250,1,array['nam'],false,2204),
  ('halloween-nam-dau01','Mũ phù thuỷ đen','dau','common',150,1,array['nam'],false,2205),
  ('halloween-nam-dau02','Mũ hình bí ngô','dau','common',150,1,array['nam'],false,2206),
  ('halloween-nam-dau03','Băng đô sừng quỷ đỏ','dau','common',150,1,array['nam'],false,2207),
  ('halloween-nam-dau04','Băng đô tai dơi','dau','common',150,1,array['nam'],false,2208),
  ('halloween-nam-dau05','Mũ trùm đầu ma trắng','dau','common',150,1,array['nam'],false,2209),
  ('halloween-nam-pk01','Mặt nạ che mắt đen','mat','common',120,1,array['nam'],false,2210),
  ('halloween-nam-pk02','Kính tròn bí ngô','mat','common',120,1,array['nam'],false,2211),
  ('halloween-nam-pk03','Nơ cổ dơi đen','co','common',100,1,array['nam'],false,2212),
  ('halloween-nam-pk04','Vòng cổ răng nanh','co','common',100,1,array['nam'],false,2213),
  ('halloween-nam-pk05','Cầm giỏ bí ngô đựng kẹo','tay','common',150,1,array['nam'],false,2214),
  ('halloween-nam-pk06','Cầm đèn lồng bí ngô','tay','common',150,1,array['nam'],false,2215),
  ('halloween-nam-pk07','Cầm chổi phù thuỷ','tay','common',150,1,array['nam'],false,2216),
  ('halloween-nam-pk08','Cầm đinh ba đồ chơi','tay','common',150,1,array['nam'],false,2217),
  ('halloween-nam-pk09','Cầm kẹo mút xoắn','tay','common',150,1,array['nam'],false,2218),
  ('halloween-nam-pk10','Cầm cây đũa xương','tay','common',150,1,array['nam'],false,2219),
  ('halloween-nam-pk11','Đôi cánh dơi','lung','common',200,1,array['nam'],false,2220),
  ('halloween-nam-pk12','Áo choàng ngắn tím','lung','common',200,1,array['nam'],false,2221),
  ('halloween-nam-giay01','Giày nhọn phù thuỷ đen','giay','common',80,1,array['nam'],false,2222),
  ('halloween-nam-giay02','Ủng bí ngô cam','giay','common',80,1,array['nam'],false,2223),
  ('halloween-nam-giay03','Giày xương trắng','giay','common',80,1,array['nam'],false,2224),
  ('halloween-nu-ao01','Váy phù thuỷ tím đen viền ren','ao','common',250,1,array['nu'],false,2225),
  ('halloween-nu-ao02','Váy bí ngô cam xoè','ao','common',250,1,array['nu'],false,2226),
  ('halloween-nu-ao03','Váy mèo đen có đuôi','ao','common',250,1,array['nu'],false,2227),
  ('halloween-nu-ao04','Váy ma trắng bồng bềnh','ao','common',250,1,array['nu'],false,2228),
  ('halloween-nu-ao05','Áo choàng cô bé quàng khăn đỏ','ao','common',250,1,array['nu'],false,2229),
  ('halloween-nu-dau01','Mũ phù thuỷ tím nơ cam','dau','common',150,1,array['nu'],false,2230),
  ('halloween-nu-dau02','Băng đô tai mèo đen','dau','common',150,1,array['nu'],false,2231),
  ('halloween-nu-dau03','Băng đô sừng quỷ hồng','dau','common',150,1,array['nu'],false,2232),
  ('halloween-nu-dau04','Vương miện nhện bạc','dau','common',150,1,array['nu'],false,2233),
  ('halloween-nu-dau05','Băng đô bí ngô nhỏ','dau','common',150,1,array['nu'],false,2234),
  ('halloween-nu-pk01','Mặt nạ ren tím','mat','common',120,1,array['nu'],false,2235),
  ('halloween-nu-pk02','Kính mắt mèo','mat','common',120,1,array['nu'],false,2236),
  ('halloween-nu-pk03','Vòng cổ nhện bạc','co','common',100,1,array['nu'],false,2237),
  ('halloween-nu-pk04','Nơ cổ cam chấm bi','co','common',100,1,array['nu'],false,2238),
  ('halloween-nu-pk05','Cầm giỏ bí ngô hồng','tay','common',150,1,array['nu'],false,2239),
  ('halloween-nu-pk06','Cầm đũa phép ngôi sao','tay','common',150,1,array['nu'],false,2240),
  ('halloween-nu-pk07','Cầm chổi phù thuỷ nhỏ','tay','common',150,1,array['nu'],false,2241),
  ('halloween-nu-pk08','Cầm quả táo độc đỏ','tay','common',150,1,array['nu'],false,2242),
  ('halloween-nu-pk09','Cầm kẹo bông tím','tay','common',150,1,array['nu'],false,2243),
  ('halloween-nu-pk10','Cầm gấu bông mèo đen','tay','common',150,1,array['nu'],false,2244),
  ('halloween-nu-pk11','Đôi cánh dơi tím','lung','common',200,1,array['nu'],false,2245),
  ('halloween-nu-pk12','Kẹp tóc dơi','toc','common',100,1,array['nu'],false,2246),
  ('halloween-nu-giay01','Giày nhọn tím khoá bạc','giay','common',80,1,array['nu'],false,2247),
  ('halloween-nu-giay02','Ủng mèo đen','giay','common',80,1,array['nu'],false,2248),
  ('halloween-nu-giay03','Giày búp bê cam nơ đen','giay','common',80,1,array['nu'],false,2249),
  ('trungthu-nam-ao01','Áo dài trẻ em vàng hoạ tiết đèn lồng','ao','common',250,1,array['nam'],false,2250),
  ('trungthu-nam-ao02','Bộ đồ chú Cuội áo nâu quần xanh','ao','common',250,1,array['nam'],false,2251),
  ('trungthu-nam-ao03','Áo bà ba đỏ','ao','common',250,1,array['nam'],false,2252),
  ('trungthu-nam-ao04','Bộ đồ múa lân đỏ vàng','ao','common',250,1,array['nam'],false,2253),
  ('trungthu-nam-ao05','Áo phông in thỏ ngọc và trăng','ao','common',250,1,array['nam'],false,2254),
  ('trungthu-nam-dau01','Đầu lân đội đầu đỏ vàng','dau','common',150,1,array['nam'],false,2255),
  ('trungthu-nam-dau02','Mũ chú Cuội nâu','dau','common',150,1,array['nam'],false,2256),
  ('trungthu-nam-dau03','Băng đô tai thỏ trắng','dau','common',150,1,array['nam'],false,2257),
  ('trungthu-nam-dau04','Mũ đèn lồng đỏ','dau','common',150,1,array['nam'],false,2258),
  ('trungthu-nam-dau05','Khăn xếp vàng','dau','common',150,1,array['nam'],false,2259),
  ('trungthu-nam-pk01','Cầm đèn ông sao đỏ','tay','common',150,1,array['nam'],false,2260),
  ('trungthu-nam-pk02','Cầm đèn lồng cá chép','tay','common',150,1,array['nam'],false,2261),
  ('trungthu-nam-pk03','Cầm bánh nướng','tay','common',150,1,array['nam'],false,2262),
  ('trungthu-nam-pk04','Cầm bánh dẻo','tay','common',150,1,array['nam'],false,2263),
  ('trungthu-nam-pk05','Cầm trống lân','tay','common',150,1,array['nam'],false,2264),
  ('trungthu-nam-pk06','Cầm mặt nạ giấy ông địa','tay','common',150,1,array['nam'],false,2265),
  ('trungthu-nam-pk07','Cầm chong chóng giấy','tay','common',150,1,array['nam'],false,2266),
  ('trungthu-nam-pk08','Kính tròn trăng vàng','mat','common',120,1,array['nam'],false,2267),
  ('trungthu-nam-pk09','Vòng cổ thỏ ngọc','co','common',100,1,array['nam'],false,2268),
  ('trungthu-nam-pk10','Khăn quàng đỏ','co','common',100,1,array['nam'],false,2269),
  ('trungthu-nam-pk11','Túi đựng bánh đeo chéo','lung','common',200,1,array['nam'],false,2270),
  ('trungthu-nam-pk12','Cái gậy chú Cuội đeo lưng','lung','common',200,1,array['nam'],false,2271),
  ('trungthu-nam-giay01','Giày vải đỏ','giay','common',80,1,array['nam'],false,2272),
  ('trungthu-nam-giay02','Dép gỗ','giay','common',80,1,array['nam'],false,2273),
  ('trungthu-nam-giay03','Giày vải vàng thêu mây','giay','common',80,1,array['nam'],false,2274),
  ('trungthu-nu-ao01','Váy chị Hằng trắng dải lụa hồng','ao','common',250,1,array['nu'],false,2275),
  ('trungthu-nu-ao02','Áo dài trẻ em đỏ hoạ tiết hoa','ao','common',250,1,array['nu'],false,2276),
  ('trungthu-nu-ao03','Váy thỏ ngọc trắng hồng','ao','common',250,1,array['nu'],false,2277),
  ('trungthu-nu-ao04','Áo yếm vàng kèm váy lụa','ao','common',250,1,array['nu'],false,2278),
  ('trungthu-nu-ao05','Váy cam thêu đèn lồng','ao','common',250,1,array['nu'],false,2279),
  ('trungthu-nu-dau01','Vương miện mặt trăng chị Hằng','dau','common',150,1,array['nu'],false,2280),
  ('trungthu-nu-dau02','Băng đô tai thỏ hồng','dau','common',150,1,array['nu'],false,2281),
  ('trungthu-nu-dau03','Trâm hoa sen cài tóc','dau','common',150,1,array['nu'],false,2282),
  ('trungthu-nu-dau04','Băng đô đèn lồng nhỏ','dau','common',150,1,array['nu'],false,2283),
  ('trungthu-nu-dau05','Khăn voan hồng','dau','common',150,1,array['nu'],false,2284),
  ('trungthu-nu-pk01','Cầm đèn lồng hoa sen','tay','common',150,1,array['nu'],false,2285),
  ('trungthu-nu-pk02','Cầm đèn ông sao hồng','tay','common',150,1,array['nu'],false,2286),
  ('trungthu-nu-pk03','Cầm bánh nướng hình thỏ','tay','common',150,1,array['nu'],false,2287),
  ('trungthu-nu-pk04','Cầm thỏ bông trắng','tay','common',150,1,array['nu'],false,2288),
  ('trungthu-nu-pk05','Cầm quạt giấy vẽ trăng','tay','common',150,1,array['nu'],false,2289),
  ('trungthu-nu-pk06','Cầm giỏ hoa quả','tay','common',150,1,array['nu'],false,2290),
  ('trungthu-nu-pk07','Cầm mặt nạ giấy thỏ','tay','common',150,1,array['nu'],false,2291),
  ('trungthu-nu-pk08','Kính tim vàng','mat','common',120,1,array['nu'],false,2292),
  ('trungthu-nu-pk09','Vòng cổ trăng khuyết','co','common',100,1,array['nu'],false,2293),
  ('trungthu-nu-pk10','Dải lụa hồng quàng vai','co','common',100,1,array['nu'],false,2294),
  ('trungthu-nu-pk11','Dải lụa bay chị Hằng','lung','common',200,1,array['nu'],false,2295),
  ('trungthu-nu-pk12','Kẹp tóc thỏ ngọc','toc','common',100,1,array['nu'],false,2296),
  ('trungthu-nu-giay01','Hài thêu hoa trắng','giay','common',80,1,array['nu'],false,2297),
  ('trungthu-nu-giay02','Giày búp bê hồng thỏ','giay','common',80,1,array['nu'],false,2298),
  ('trungthu-nu-giay03','Guốc gỗ sơn hoa','giay','common',80,1,array['nu'],false,2299),
  ('phong-tet','Phòng Tết Việt Nam','phong','common',400,1,array['nam','nu'],false,3000),
  ('phong-trungthu','Phòng Trung thu','phong','common',400,1,array['nam','nu'],false,3001),
  ('phong-halloween','Phòng Halloween','phong','common',400,1,array['nam','nu'],false,3002),
  ('phong-giangsinh','Phòng Giáng sinh','phong','common',400,1,array['nam','nu'],false,3003),
  ('phong-muadong','Phòng Mùa đông','phong','common',400,1,array['nam','nu'],false,3004),
  ('phong-muahe','Phòng Mùa hè','phong','common',400,1,array['nam','nu'],false,3005)
on conflict (id) do nothing;

-- ===== Đồ cũ: ẩn, hoàn Hạt, bỏ khỏi tủ + tháo =====
-- đồ thành tích cũ (chuỗi 7/30/100 ngày, cân 4 tuần, nước 30 ngày, đạt cân) giữ để trưng
update public.pet_items set hidden = true, updated_at = now()
  where id not in ('giangsinh-nam-ao01', 'giangsinh-nam-ao02', 'giangsinh-nam-ao03', 'giangsinh-nam-ao04', 'giangsinh-nam-ao05', 'giangsinh-nam-dau01', 'giangsinh-nam-dau02', 'giangsinh-nam-dau03', 'giangsinh-nam-dau04', 'giangsinh-nam-dau05', 'giangsinh-nam-pk01', 'giangsinh-nam-pk02', 'giangsinh-nam-pk03', 'giangsinh-nam-pk04', 'giangsinh-nam-pk05', 'giangsinh-nam-pk06', 'giangsinh-nam-pk07', 'giangsinh-nam-pk08', 'giangsinh-nam-pk09', 'giangsinh-nam-pk10', 'giangsinh-nam-pk11', 'giangsinh-nam-pk12', 'giangsinh-nam-giay01', 'giangsinh-nam-giay02', 'giangsinh-nam-giay03', 'giangsinh-nu-ao01', 'giangsinh-nu-ao02', 'giangsinh-nu-ao03', 'giangsinh-nu-ao04', 'giangsinh-nu-ao05', 'giangsinh-nu-dau01', 'giangsinh-nu-dau02', 'giangsinh-nu-dau03', 'giangsinh-nu-dau04', 'giangsinh-nu-dau05', 'giangsinh-nu-pk01', 'giangsinh-nu-pk02', 'giangsinh-nu-pk03', 'giangsinh-nu-pk04', 'giangsinh-nu-pk05', 'giangsinh-nu-pk06', 'giangsinh-nu-pk07', 'giangsinh-nu-pk08', 'giangsinh-nu-pk09', 'giangsinh-nu-pk10', 'giangsinh-nu-pk11', 'giangsinh-nu-pk12', 'giangsinh-nu-giay01', 'giangsinh-nu-giay02', 'giangsinh-nu-giay03', 'tet-nam-ao01', 'tet-nam-ao02', 'tet-nam-ao03', 'tet-nam-ao04', 'tet-nam-ao05', 'tet-nam-dau01', 'tet-nam-dau02', 'tet-nam-dau03', 'tet-nam-dau04', 'tet-nam-dau05', 'tet-nam-pk01', 'tet-nam-pk02', 'tet-nam-pk03', 'tet-nam-pk04', 'tet-nam-pk05', 'tet-nam-pk06', 'tet-nam-pk07', 'tet-nam-pk08', 'tet-nam-pk09', 'tet-nam-pk10', 'tet-nam-pk11', 'tet-nam-pk12', 'tet-nam-giay01', 'tet-nam-giay02', 'tet-nam-giay03', 'tet-nu-ao01', 'tet-nu-ao02', 'tet-nu-ao03', 'tet-nu-ao04', 'tet-nu-ao05', 'tet-nu-dau01', 'tet-nu-dau02', 'tet-nu-dau03', 'tet-nu-dau04', 'tet-nu-dau05', 'tet-nu-pk01', 'tet-nu-pk02', 'tet-nu-pk03', 'tet-nu-pk04', 'tet-nu-pk05', 'tet-nu-pk06', 'tet-nu-pk07', 'tet-nu-pk08', 'tet-nu-pk09', 'tet-nu-pk10', 'tet-nu-pk11', 'tet-nu-pk12', 'tet-nu-giay01', 'tet-nu-giay02', 'tet-nu-giay03', 'muadong-nam-ao01', 'muadong-nam-ao02', 'muadong-nam-ao03', 'muadong-nam-ao04', 'muadong-nam-ao05', 'muadong-nam-dau01', 'muadong-nam-dau02', 'muadong-nam-dau03', 'muadong-nam-dau04', 'muadong-nam-dau05', 'muadong-nam-pk01', 'muadong-nam-pk02', 'muadong-nam-pk03', 'muadong-nam-pk04', 'muadong-nam-pk05', 'muadong-nam-pk06', 'muadong-nam-pk07', 'muadong-nam-pk08', 'muadong-nam-pk09', 'muadong-nam-pk10', 'muadong-nam-pk11', 'muadong-nam-pk12', 'muadong-nam-giay01', 'muadong-nam-giay02', 'muadong-nam-giay03', 'muadong-nu-ao01', 'muadong-nu-ao02', 'muadong-nu-ao03', 'muadong-nu-ao04', 'muadong-nu-ao05', 'muadong-nu-dau01', 'muadong-nu-dau02', 'muadong-nu-dau03', 'muadong-nu-dau04', 'muadong-nu-dau05', 'muadong-nu-pk01', 'muadong-nu-pk02', 'muadong-nu-pk03', 'muadong-nu-pk04', 'muadong-nu-pk05', 'muadong-nu-pk06', 'muadong-nu-pk07', 'muadong-nu-pk08', 'muadong-nu-pk09', 'muadong-nu-pk10', 'muadong-nu-pk11', 'muadong-nu-pk12', 'muadong-nu-giay01', 'muadong-nu-giay02', 'muadong-nu-giay03', 'muahe-nam-ao01', 'muahe-nam-ao02', 'muahe-nam-ao03', 'muahe-nam-ao04', 'muahe-nam-ao05', 'muahe-nam-dau01', 'muahe-nam-dau02', 'muahe-nam-dau03', 'muahe-nam-dau04', 'muahe-nam-dau05', 'muahe-nam-pk01', 'muahe-nam-pk02', 'muahe-nam-pk03', 'muahe-nam-pk04', 'muahe-nam-pk05', 'muahe-nam-pk06', 'muahe-nam-pk07', 'muahe-nam-pk08', 'muahe-nam-pk09', 'muahe-nam-pk10', 'muahe-nam-pk11', 'muahe-nam-pk12', 'muahe-nam-giay01', 'muahe-nam-giay02', 'muahe-nam-giay03', 'muahe-nu-ao01', 'muahe-nu-ao02', 'muahe-nu-ao03', 'muahe-nu-ao04', 'muahe-nu-ao05', 'muahe-nu-dau01', 'muahe-nu-dau02', 'muahe-nu-dau03', 'muahe-nu-dau04', 'muahe-nu-dau05', 'muahe-nu-pk01', 'muahe-nu-pk02', 'muahe-nu-pk03', 'muahe-nu-pk04', 'muahe-nu-pk05', 'muahe-nu-pk06', 'muahe-nu-pk07', 'muahe-nu-pk08', 'muahe-nu-pk09', 'muahe-nu-pk10', 'muahe-nu-pk11', 'muahe-nu-pk12', 'muahe-nu-giay01', 'muahe-nu-giay02', 'muahe-nu-giay03', 'halloween-nam-ao01', 'halloween-nam-ao02', 'halloween-nam-ao03', 'halloween-nam-ao04', 'halloween-nam-ao05', 'halloween-nam-dau01', 'halloween-nam-dau02', 'halloween-nam-dau03', 'halloween-nam-dau04', 'halloween-nam-dau05', 'halloween-nam-pk01', 'halloween-nam-pk02', 'halloween-nam-pk03', 'halloween-nam-pk04', 'halloween-nam-pk05', 'halloween-nam-pk06', 'halloween-nam-pk07', 'halloween-nam-pk08', 'halloween-nam-pk09', 'halloween-nam-pk10', 'halloween-nam-pk11', 'halloween-nam-pk12', 'halloween-nam-giay01', 'halloween-nam-giay02', 'halloween-nam-giay03', 'halloween-nu-ao01', 'halloween-nu-ao02', 'halloween-nu-ao03', 'halloween-nu-ao04', 'halloween-nu-ao05', 'halloween-nu-dau01', 'halloween-nu-dau02', 'halloween-nu-dau03', 'halloween-nu-dau04', 'halloween-nu-dau05', 'halloween-nu-pk01', 'halloween-nu-pk02', 'halloween-nu-pk03', 'halloween-nu-pk04', 'halloween-nu-pk05', 'halloween-nu-pk06', 'halloween-nu-pk07', 'halloween-nu-pk08', 'halloween-nu-pk09', 'halloween-nu-pk10', 'halloween-nu-pk11', 'halloween-nu-pk12', 'halloween-nu-giay01', 'halloween-nu-giay02', 'halloween-nu-giay03', 'trungthu-nam-ao01', 'trungthu-nam-ao02', 'trungthu-nam-ao03', 'trungthu-nam-ao04', 'trungthu-nam-ao05', 'trungthu-nam-dau01', 'trungthu-nam-dau02', 'trungthu-nam-dau03', 'trungthu-nam-dau04', 'trungthu-nam-dau05', 'trungthu-nam-pk01', 'trungthu-nam-pk02', 'trungthu-nam-pk03', 'trungthu-nam-pk04', 'trungthu-nam-pk05', 'trungthu-nam-pk06', 'trungthu-nam-pk07', 'trungthu-nam-pk08', 'trungthu-nam-pk09', 'trungthu-nam-pk10', 'trungthu-nam-pk11', 'trungthu-nam-pk12', 'trungthu-nam-giay01', 'trungthu-nam-giay02', 'trungthu-nam-giay03', 'trungthu-nu-ao01', 'trungthu-nu-ao02', 'trungthu-nu-ao03', 'trungthu-nu-ao04', 'trungthu-nu-ao05', 'trungthu-nu-dau01', 'trungthu-nu-dau02', 'trungthu-nu-dau03', 'trungthu-nu-dau04', 'trungthu-nu-dau05', 'trungthu-nu-pk01', 'trungthu-nu-pk02', 'trungthu-nu-pk03', 'trungthu-nu-pk04', 'trungthu-nu-pk05', 'trungthu-nu-pk06', 'trungthu-nu-pk07', 'trungthu-nu-pk08', 'trungthu-nu-pk09', 'trungthu-nu-pk10', 'trungthu-nu-pk11', 'trungthu-nu-pk12', 'trungthu-nu-giay01', 'trungthu-nu-giay02', 'trungthu-nu-giay03', 'phong-tet', 'phong-trungthu', 'phong-halloween', 'phong-giangsinh', 'phong-muadong', 'phong-muahe')
    and id not in ('hieu-ung-02','hieu-ung-04','hieu-ung-05','hieu-ung-06','hieu-ung-17','doi-dau-11') and not hidden;

with paid as (
  select i.user_id, i.item_id, coalesce(-(select l.amount from public.pet_ledger l where l.user_id = i.user_id and l.key = 'buy:' || i.item_id), it.price) amt
  from public.pet_inventory i join public.pet_items it on it.id = i.item_id
  where i.how = 'buy' and it.id not in ('giangsinh-nam-ao01', 'giangsinh-nam-ao02', 'giangsinh-nam-ao03', 'giangsinh-nam-ao04', 'giangsinh-nam-ao05', 'giangsinh-nam-dau01', 'giangsinh-nam-dau02', 'giangsinh-nam-dau03', 'giangsinh-nam-dau04', 'giangsinh-nam-dau05', 'giangsinh-nam-pk01', 'giangsinh-nam-pk02', 'giangsinh-nam-pk03', 'giangsinh-nam-pk04', 'giangsinh-nam-pk05', 'giangsinh-nam-pk06', 'giangsinh-nam-pk07', 'giangsinh-nam-pk08', 'giangsinh-nam-pk09', 'giangsinh-nam-pk10', 'giangsinh-nam-pk11', 'giangsinh-nam-pk12', 'giangsinh-nam-giay01', 'giangsinh-nam-giay02', 'giangsinh-nam-giay03', 'giangsinh-nu-ao01', 'giangsinh-nu-ao02', 'giangsinh-nu-ao03', 'giangsinh-nu-ao04', 'giangsinh-nu-ao05', 'giangsinh-nu-dau01', 'giangsinh-nu-dau02', 'giangsinh-nu-dau03', 'giangsinh-nu-dau04', 'giangsinh-nu-dau05', 'giangsinh-nu-pk01', 'giangsinh-nu-pk02', 'giangsinh-nu-pk03', 'giangsinh-nu-pk04', 'giangsinh-nu-pk05', 'giangsinh-nu-pk06', 'giangsinh-nu-pk07', 'giangsinh-nu-pk08', 'giangsinh-nu-pk09', 'giangsinh-nu-pk10', 'giangsinh-nu-pk11', 'giangsinh-nu-pk12', 'giangsinh-nu-giay01', 'giangsinh-nu-giay02', 'giangsinh-nu-giay03', 'tet-nam-ao01', 'tet-nam-ao02', 'tet-nam-ao03', 'tet-nam-ao04', 'tet-nam-ao05', 'tet-nam-dau01', 'tet-nam-dau02', 'tet-nam-dau03', 'tet-nam-dau04', 'tet-nam-dau05', 'tet-nam-pk01', 'tet-nam-pk02', 'tet-nam-pk03', 'tet-nam-pk04', 'tet-nam-pk05', 'tet-nam-pk06', 'tet-nam-pk07', 'tet-nam-pk08', 'tet-nam-pk09', 'tet-nam-pk10', 'tet-nam-pk11', 'tet-nam-pk12', 'tet-nam-giay01', 'tet-nam-giay02', 'tet-nam-giay03', 'tet-nu-ao01', 'tet-nu-ao02', 'tet-nu-ao03', 'tet-nu-ao04', 'tet-nu-ao05', 'tet-nu-dau01', 'tet-nu-dau02', 'tet-nu-dau03', 'tet-nu-dau04', 'tet-nu-dau05', 'tet-nu-pk01', 'tet-nu-pk02', 'tet-nu-pk03', 'tet-nu-pk04', 'tet-nu-pk05', 'tet-nu-pk06', 'tet-nu-pk07', 'tet-nu-pk08', 'tet-nu-pk09', 'tet-nu-pk10', 'tet-nu-pk11', 'tet-nu-pk12', 'tet-nu-giay01', 'tet-nu-giay02', 'tet-nu-giay03', 'muadong-nam-ao01', 'muadong-nam-ao02', 'muadong-nam-ao03', 'muadong-nam-ao04', 'muadong-nam-ao05', 'muadong-nam-dau01', 'muadong-nam-dau02', 'muadong-nam-dau03', 'muadong-nam-dau04', 'muadong-nam-dau05', 'muadong-nam-pk01', 'muadong-nam-pk02', 'muadong-nam-pk03', 'muadong-nam-pk04', 'muadong-nam-pk05', 'muadong-nam-pk06', 'muadong-nam-pk07', 'muadong-nam-pk08', 'muadong-nam-pk09', 'muadong-nam-pk10', 'muadong-nam-pk11', 'muadong-nam-pk12', 'muadong-nam-giay01', 'muadong-nam-giay02', 'muadong-nam-giay03', 'muadong-nu-ao01', 'muadong-nu-ao02', 'muadong-nu-ao03', 'muadong-nu-ao04', 'muadong-nu-ao05', 'muadong-nu-dau01', 'muadong-nu-dau02', 'muadong-nu-dau03', 'muadong-nu-dau04', 'muadong-nu-dau05', 'muadong-nu-pk01', 'muadong-nu-pk02', 'muadong-nu-pk03', 'muadong-nu-pk04', 'muadong-nu-pk05', 'muadong-nu-pk06', 'muadong-nu-pk07', 'muadong-nu-pk08', 'muadong-nu-pk09', 'muadong-nu-pk10', 'muadong-nu-pk11', 'muadong-nu-pk12', 'muadong-nu-giay01', 'muadong-nu-giay02', 'muadong-nu-giay03', 'muahe-nam-ao01', 'muahe-nam-ao02', 'muahe-nam-ao03', 'muahe-nam-ao04', 'muahe-nam-ao05', 'muahe-nam-dau01', 'muahe-nam-dau02', 'muahe-nam-dau03', 'muahe-nam-dau04', 'muahe-nam-dau05', 'muahe-nam-pk01', 'muahe-nam-pk02', 'muahe-nam-pk03', 'muahe-nam-pk04', 'muahe-nam-pk05', 'muahe-nam-pk06', 'muahe-nam-pk07', 'muahe-nam-pk08', 'muahe-nam-pk09', 'muahe-nam-pk10', 'muahe-nam-pk11', 'muahe-nam-pk12', 'muahe-nam-giay01', 'muahe-nam-giay02', 'muahe-nam-giay03', 'muahe-nu-ao01', 'muahe-nu-ao02', 'muahe-nu-ao03', 'muahe-nu-ao04', 'muahe-nu-ao05', 'muahe-nu-dau01', 'muahe-nu-dau02', 'muahe-nu-dau03', 'muahe-nu-dau04', 'muahe-nu-dau05', 'muahe-nu-pk01', 'muahe-nu-pk02', 'muahe-nu-pk03', 'muahe-nu-pk04', 'muahe-nu-pk05', 'muahe-nu-pk06', 'muahe-nu-pk07', 'muahe-nu-pk08', 'muahe-nu-pk09', 'muahe-nu-pk10', 'muahe-nu-pk11', 'muahe-nu-pk12', 'muahe-nu-giay01', 'muahe-nu-giay02', 'muahe-nu-giay03', 'halloween-nam-ao01', 'halloween-nam-ao02', 'halloween-nam-ao03', 'halloween-nam-ao04', 'halloween-nam-ao05', 'halloween-nam-dau01', 'halloween-nam-dau02', 'halloween-nam-dau03', 'halloween-nam-dau04', 'halloween-nam-dau05', 'halloween-nam-pk01', 'halloween-nam-pk02', 'halloween-nam-pk03', 'halloween-nam-pk04', 'halloween-nam-pk05', 'halloween-nam-pk06', 'halloween-nam-pk07', 'halloween-nam-pk08', 'halloween-nam-pk09', 'halloween-nam-pk10', 'halloween-nam-pk11', 'halloween-nam-pk12', 'halloween-nam-giay01', 'halloween-nam-giay02', 'halloween-nam-giay03', 'halloween-nu-ao01', 'halloween-nu-ao02', 'halloween-nu-ao03', 'halloween-nu-ao04', 'halloween-nu-ao05', 'halloween-nu-dau01', 'halloween-nu-dau02', 'halloween-nu-dau03', 'halloween-nu-dau04', 'halloween-nu-dau05', 'halloween-nu-pk01', 'halloween-nu-pk02', 'halloween-nu-pk03', 'halloween-nu-pk04', 'halloween-nu-pk05', 'halloween-nu-pk06', 'halloween-nu-pk07', 'halloween-nu-pk08', 'halloween-nu-pk09', 'halloween-nu-pk10', 'halloween-nu-pk11', 'halloween-nu-pk12', 'halloween-nu-giay01', 'halloween-nu-giay02', 'halloween-nu-giay03', 'trungthu-nam-ao01', 'trungthu-nam-ao02', 'trungthu-nam-ao03', 'trungthu-nam-ao04', 'trungthu-nam-ao05', 'trungthu-nam-dau01', 'trungthu-nam-dau02', 'trungthu-nam-dau03', 'trungthu-nam-dau04', 'trungthu-nam-dau05', 'trungthu-nam-pk01', 'trungthu-nam-pk02', 'trungthu-nam-pk03', 'trungthu-nam-pk04', 'trungthu-nam-pk05', 'trungthu-nam-pk06', 'trungthu-nam-pk07', 'trungthu-nam-pk08', 'trungthu-nam-pk09', 'trungthu-nam-pk10', 'trungthu-nam-pk11', 'trungthu-nam-pk12', 'trungthu-nam-giay01', 'trungthu-nam-giay02', 'trungthu-nam-giay03', 'trungthu-nu-ao01', 'trungthu-nu-ao02', 'trungthu-nu-ao03', 'trungthu-nu-ao04', 'trungthu-nu-ao05', 'trungthu-nu-dau01', 'trungthu-nu-dau02', 'trungthu-nu-dau03', 'trungthu-nu-dau04', 'trungthu-nu-dau05', 'trungthu-nu-pk01', 'trungthu-nu-pk02', 'trungthu-nu-pk03', 'trungthu-nu-pk04', 'trungthu-nu-pk05', 'trungthu-nu-pk06', 'trungthu-nu-pk07', 'trungthu-nu-pk08', 'trungthu-nu-pk09', 'trungthu-nu-pk10', 'trungthu-nu-pk11', 'trungthu-nu-pk12', 'trungthu-nu-giay01', 'trungthu-nu-giay02', 'trungthu-nu-giay03', 'phong-tet', 'phong-trungthu', 'phong-halloween', 'phong-giangsinh', 'phong-muadong', 'phong-muahe') and not it.achievement
    and it.id not in ('hieu-ung-02','hieu-ung-04','hieu-ung-05','hieu-ung-06','hieu-ung-17','doi-dau-11')
), ins as (
  insert into public.pet_ledger (user_id, amount, kind, key, day, meta)
  select user_id, amt, 'admin', 'refund:' || item_id, (now() at time zone 'Asia/Ho_Chi_Minh')::date, jsonb_build_object('why', 'Pi bộ mới 23/10')
  from paid where amt > 0
  on conflict (user_id, key) do nothing
  returning user_id, amount
)
update public.pet_profiles p set balance = p.balance + s.total, updated_at = now()
  from (select user_id, sum(amount) total from ins group by user_id) s where s.user_id = p.user_id;

delete from public.pet_equipped where item_id not in ('giangsinh-nam-ao01', 'giangsinh-nam-ao02', 'giangsinh-nam-ao03', 'giangsinh-nam-ao04', 'giangsinh-nam-ao05', 'giangsinh-nam-dau01', 'giangsinh-nam-dau02', 'giangsinh-nam-dau03', 'giangsinh-nam-dau04', 'giangsinh-nam-dau05', 'giangsinh-nam-pk01', 'giangsinh-nam-pk02', 'giangsinh-nam-pk03', 'giangsinh-nam-pk04', 'giangsinh-nam-pk05', 'giangsinh-nam-pk06', 'giangsinh-nam-pk07', 'giangsinh-nam-pk08', 'giangsinh-nam-pk09', 'giangsinh-nam-pk10', 'giangsinh-nam-pk11', 'giangsinh-nam-pk12', 'giangsinh-nam-giay01', 'giangsinh-nam-giay02', 'giangsinh-nam-giay03', 'giangsinh-nu-ao01', 'giangsinh-nu-ao02', 'giangsinh-nu-ao03', 'giangsinh-nu-ao04', 'giangsinh-nu-ao05', 'giangsinh-nu-dau01', 'giangsinh-nu-dau02', 'giangsinh-nu-dau03', 'giangsinh-nu-dau04', 'giangsinh-nu-dau05', 'giangsinh-nu-pk01', 'giangsinh-nu-pk02', 'giangsinh-nu-pk03', 'giangsinh-nu-pk04', 'giangsinh-nu-pk05', 'giangsinh-nu-pk06', 'giangsinh-nu-pk07', 'giangsinh-nu-pk08', 'giangsinh-nu-pk09', 'giangsinh-nu-pk10', 'giangsinh-nu-pk11', 'giangsinh-nu-pk12', 'giangsinh-nu-giay01', 'giangsinh-nu-giay02', 'giangsinh-nu-giay03', 'tet-nam-ao01', 'tet-nam-ao02', 'tet-nam-ao03', 'tet-nam-ao04', 'tet-nam-ao05', 'tet-nam-dau01', 'tet-nam-dau02', 'tet-nam-dau03', 'tet-nam-dau04', 'tet-nam-dau05', 'tet-nam-pk01', 'tet-nam-pk02', 'tet-nam-pk03', 'tet-nam-pk04', 'tet-nam-pk05', 'tet-nam-pk06', 'tet-nam-pk07', 'tet-nam-pk08', 'tet-nam-pk09', 'tet-nam-pk10', 'tet-nam-pk11', 'tet-nam-pk12', 'tet-nam-giay01', 'tet-nam-giay02', 'tet-nam-giay03', 'tet-nu-ao01', 'tet-nu-ao02', 'tet-nu-ao03', 'tet-nu-ao04', 'tet-nu-ao05', 'tet-nu-dau01', 'tet-nu-dau02', 'tet-nu-dau03', 'tet-nu-dau04', 'tet-nu-dau05', 'tet-nu-pk01', 'tet-nu-pk02', 'tet-nu-pk03', 'tet-nu-pk04', 'tet-nu-pk05', 'tet-nu-pk06', 'tet-nu-pk07', 'tet-nu-pk08', 'tet-nu-pk09', 'tet-nu-pk10', 'tet-nu-pk11', 'tet-nu-pk12', 'tet-nu-giay01', 'tet-nu-giay02', 'tet-nu-giay03', 'muadong-nam-ao01', 'muadong-nam-ao02', 'muadong-nam-ao03', 'muadong-nam-ao04', 'muadong-nam-ao05', 'muadong-nam-dau01', 'muadong-nam-dau02', 'muadong-nam-dau03', 'muadong-nam-dau04', 'muadong-nam-dau05', 'muadong-nam-pk01', 'muadong-nam-pk02', 'muadong-nam-pk03', 'muadong-nam-pk04', 'muadong-nam-pk05', 'muadong-nam-pk06', 'muadong-nam-pk07', 'muadong-nam-pk08', 'muadong-nam-pk09', 'muadong-nam-pk10', 'muadong-nam-pk11', 'muadong-nam-pk12', 'muadong-nam-giay01', 'muadong-nam-giay02', 'muadong-nam-giay03', 'muadong-nu-ao01', 'muadong-nu-ao02', 'muadong-nu-ao03', 'muadong-nu-ao04', 'muadong-nu-ao05', 'muadong-nu-dau01', 'muadong-nu-dau02', 'muadong-nu-dau03', 'muadong-nu-dau04', 'muadong-nu-dau05', 'muadong-nu-pk01', 'muadong-nu-pk02', 'muadong-nu-pk03', 'muadong-nu-pk04', 'muadong-nu-pk05', 'muadong-nu-pk06', 'muadong-nu-pk07', 'muadong-nu-pk08', 'muadong-nu-pk09', 'muadong-nu-pk10', 'muadong-nu-pk11', 'muadong-nu-pk12', 'muadong-nu-giay01', 'muadong-nu-giay02', 'muadong-nu-giay03', 'muahe-nam-ao01', 'muahe-nam-ao02', 'muahe-nam-ao03', 'muahe-nam-ao04', 'muahe-nam-ao05', 'muahe-nam-dau01', 'muahe-nam-dau02', 'muahe-nam-dau03', 'muahe-nam-dau04', 'muahe-nam-dau05', 'muahe-nam-pk01', 'muahe-nam-pk02', 'muahe-nam-pk03', 'muahe-nam-pk04', 'muahe-nam-pk05', 'muahe-nam-pk06', 'muahe-nam-pk07', 'muahe-nam-pk08', 'muahe-nam-pk09', 'muahe-nam-pk10', 'muahe-nam-pk11', 'muahe-nam-pk12', 'muahe-nam-giay01', 'muahe-nam-giay02', 'muahe-nam-giay03', 'muahe-nu-ao01', 'muahe-nu-ao02', 'muahe-nu-ao03', 'muahe-nu-ao04', 'muahe-nu-ao05', 'muahe-nu-dau01', 'muahe-nu-dau02', 'muahe-nu-dau03', 'muahe-nu-dau04', 'muahe-nu-dau05', 'muahe-nu-pk01', 'muahe-nu-pk02', 'muahe-nu-pk03', 'muahe-nu-pk04', 'muahe-nu-pk05', 'muahe-nu-pk06', 'muahe-nu-pk07', 'muahe-nu-pk08', 'muahe-nu-pk09', 'muahe-nu-pk10', 'muahe-nu-pk11', 'muahe-nu-pk12', 'muahe-nu-giay01', 'muahe-nu-giay02', 'muahe-nu-giay03', 'halloween-nam-ao01', 'halloween-nam-ao02', 'halloween-nam-ao03', 'halloween-nam-ao04', 'halloween-nam-ao05', 'halloween-nam-dau01', 'halloween-nam-dau02', 'halloween-nam-dau03', 'halloween-nam-dau04', 'halloween-nam-dau05', 'halloween-nam-pk01', 'halloween-nam-pk02', 'halloween-nam-pk03', 'halloween-nam-pk04', 'halloween-nam-pk05', 'halloween-nam-pk06', 'halloween-nam-pk07', 'halloween-nam-pk08', 'halloween-nam-pk09', 'halloween-nam-pk10', 'halloween-nam-pk11', 'halloween-nam-pk12', 'halloween-nam-giay01', 'halloween-nam-giay02', 'halloween-nam-giay03', 'halloween-nu-ao01', 'halloween-nu-ao02', 'halloween-nu-ao03', 'halloween-nu-ao04', 'halloween-nu-ao05', 'halloween-nu-dau01', 'halloween-nu-dau02', 'halloween-nu-dau03', 'halloween-nu-dau04', 'halloween-nu-dau05', 'halloween-nu-pk01', 'halloween-nu-pk02', 'halloween-nu-pk03', 'halloween-nu-pk04', 'halloween-nu-pk05', 'halloween-nu-pk06', 'halloween-nu-pk07', 'halloween-nu-pk08', 'halloween-nu-pk09', 'halloween-nu-pk10', 'halloween-nu-pk11', 'halloween-nu-pk12', 'halloween-nu-giay01', 'halloween-nu-giay02', 'halloween-nu-giay03', 'trungthu-nam-ao01', 'trungthu-nam-ao02', 'trungthu-nam-ao03', 'trungthu-nam-ao04', 'trungthu-nam-ao05', 'trungthu-nam-dau01', 'trungthu-nam-dau02', 'trungthu-nam-dau03', 'trungthu-nam-dau04', 'trungthu-nam-dau05', 'trungthu-nam-pk01', 'trungthu-nam-pk02', 'trungthu-nam-pk03', 'trungthu-nam-pk04', 'trungthu-nam-pk05', 'trungthu-nam-pk06', 'trungthu-nam-pk07', 'trungthu-nam-pk08', 'trungthu-nam-pk09', 'trungthu-nam-pk10', 'trungthu-nam-pk11', 'trungthu-nam-pk12', 'trungthu-nam-giay01', 'trungthu-nam-giay02', 'trungthu-nam-giay03', 'trungthu-nu-ao01', 'trungthu-nu-ao02', 'trungthu-nu-ao03', 'trungthu-nu-ao04', 'trungthu-nu-ao05', 'trungthu-nu-dau01', 'trungthu-nu-dau02', 'trungthu-nu-dau03', 'trungthu-nu-dau04', 'trungthu-nu-dau05', 'trungthu-nu-pk01', 'trungthu-nu-pk02', 'trungthu-nu-pk03', 'trungthu-nu-pk04', 'trungthu-nu-pk05', 'trungthu-nu-pk06', 'trungthu-nu-pk07', 'trungthu-nu-pk08', 'trungthu-nu-pk09', 'trungthu-nu-pk10', 'trungthu-nu-pk11', 'trungthu-nu-pk12', 'trungthu-nu-giay01', 'trungthu-nu-giay02', 'trungthu-nu-giay03', 'phong-tet', 'phong-trungthu', 'phong-halloween', 'phong-giangsinh', 'phong-muadong', 'phong-muahe');
delete from public.pet_inventory i using public.pet_items it
  where it.id = i.item_id and it.id not in ('giangsinh-nam-ao01', 'giangsinh-nam-ao02', 'giangsinh-nam-ao03', 'giangsinh-nam-ao04', 'giangsinh-nam-ao05', 'giangsinh-nam-dau01', 'giangsinh-nam-dau02', 'giangsinh-nam-dau03', 'giangsinh-nam-dau04', 'giangsinh-nam-dau05', 'giangsinh-nam-pk01', 'giangsinh-nam-pk02', 'giangsinh-nam-pk03', 'giangsinh-nam-pk04', 'giangsinh-nam-pk05', 'giangsinh-nam-pk06', 'giangsinh-nam-pk07', 'giangsinh-nam-pk08', 'giangsinh-nam-pk09', 'giangsinh-nam-pk10', 'giangsinh-nam-pk11', 'giangsinh-nam-pk12', 'giangsinh-nam-giay01', 'giangsinh-nam-giay02', 'giangsinh-nam-giay03', 'giangsinh-nu-ao01', 'giangsinh-nu-ao02', 'giangsinh-nu-ao03', 'giangsinh-nu-ao04', 'giangsinh-nu-ao05', 'giangsinh-nu-dau01', 'giangsinh-nu-dau02', 'giangsinh-nu-dau03', 'giangsinh-nu-dau04', 'giangsinh-nu-dau05', 'giangsinh-nu-pk01', 'giangsinh-nu-pk02', 'giangsinh-nu-pk03', 'giangsinh-nu-pk04', 'giangsinh-nu-pk05', 'giangsinh-nu-pk06', 'giangsinh-nu-pk07', 'giangsinh-nu-pk08', 'giangsinh-nu-pk09', 'giangsinh-nu-pk10', 'giangsinh-nu-pk11', 'giangsinh-nu-pk12', 'giangsinh-nu-giay01', 'giangsinh-nu-giay02', 'giangsinh-nu-giay03', 'tet-nam-ao01', 'tet-nam-ao02', 'tet-nam-ao03', 'tet-nam-ao04', 'tet-nam-ao05', 'tet-nam-dau01', 'tet-nam-dau02', 'tet-nam-dau03', 'tet-nam-dau04', 'tet-nam-dau05', 'tet-nam-pk01', 'tet-nam-pk02', 'tet-nam-pk03', 'tet-nam-pk04', 'tet-nam-pk05', 'tet-nam-pk06', 'tet-nam-pk07', 'tet-nam-pk08', 'tet-nam-pk09', 'tet-nam-pk10', 'tet-nam-pk11', 'tet-nam-pk12', 'tet-nam-giay01', 'tet-nam-giay02', 'tet-nam-giay03', 'tet-nu-ao01', 'tet-nu-ao02', 'tet-nu-ao03', 'tet-nu-ao04', 'tet-nu-ao05', 'tet-nu-dau01', 'tet-nu-dau02', 'tet-nu-dau03', 'tet-nu-dau04', 'tet-nu-dau05', 'tet-nu-pk01', 'tet-nu-pk02', 'tet-nu-pk03', 'tet-nu-pk04', 'tet-nu-pk05', 'tet-nu-pk06', 'tet-nu-pk07', 'tet-nu-pk08', 'tet-nu-pk09', 'tet-nu-pk10', 'tet-nu-pk11', 'tet-nu-pk12', 'tet-nu-giay01', 'tet-nu-giay02', 'tet-nu-giay03', 'muadong-nam-ao01', 'muadong-nam-ao02', 'muadong-nam-ao03', 'muadong-nam-ao04', 'muadong-nam-ao05', 'muadong-nam-dau01', 'muadong-nam-dau02', 'muadong-nam-dau03', 'muadong-nam-dau04', 'muadong-nam-dau05', 'muadong-nam-pk01', 'muadong-nam-pk02', 'muadong-nam-pk03', 'muadong-nam-pk04', 'muadong-nam-pk05', 'muadong-nam-pk06', 'muadong-nam-pk07', 'muadong-nam-pk08', 'muadong-nam-pk09', 'muadong-nam-pk10', 'muadong-nam-pk11', 'muadong-nam-pk12', 'muadong-nam-giay01', 'muadong-nam-giay02', 'muadong-nam-giay03', 'muadong-nu-ao01', 'muadong-nu-ao02', 'muadong-nu-ao03', 'muadong-nu-ao04', 'muadong-nu-ao05', 'muadong-nu-dau01', 'muadong-nu-dau02', 'muadong-nu-dau03', 'muadong-nu-dau04', 'muadong-nu-dau05', 'muadong-nu-pk01', 'muadong-nu-pk02', 'muadong-nu-pk03', 'muadong-nu-pk04', 'muadong-nu-pk05', 'muadong-nu-pk06', 'muadong-nu-pk07', 'muadong-nu-pk08', 'muadong-nu-pk09', 'muadong-nu-pk10', 'muadong-nu-pk11', 'muadong-nu-pk12', 'muadong-nu-giay01', 'muadong-nu-giay02', 'muadong-nu-giay03', 'muahe-nam-ao01', 'muahe-nam-ao02', 'muahe-nam-ao03', 'muahe-nam-ao04', 'muahe-nam-ao05', 'muahe-nam-dau01', 'muahe-nam-dau02', 'muahe-nam-dau03', 'muahe-nam-dau04', 'muahe-nam-dau05', 'muahe-nam-pk01', 'muahe-nam-pk02', 'muahe-nam-pk03', 'muahe-nam-pk04', 'muahe-nam-pk05', 'muahe-nam-pk06', 'muahe-nam-pk07', 'muahe-nam-pk08', 'muahe-nam-pk09', 'muahe-nam-pk10', 'muahe-nam-pk11', 'muahe-nam-pk12', 'muahe-nam-giay01', 'muahe-nam-giay02', 'muahe-nam-giay03', 'muahe-nu-ao01', 'muahe-nu-ao02', 'muahe-nu-ao03', 'muahe-nu-ao04', 'muahe-nu-ao05', 'muahe-nu-dau01', 'muahe-nu-dau02', 'muahe-nu-dau03', 'muahe-nu-dau04', 'muahe-nu-dau05', 'muahe-nu-pk01', 'muahe-nu-pk02', 'muahe-nu-pk03', 'muahe-nu-pk04', 'muahe-nu-pk05', 'muahe-nu-pk06', 'muahe-nu-pk07', 'muahe-nu-pk08', 'muahe-nu-pk09', 'muahe-nu-pk10', 'muahe-nu-pk11', 'muahe-nu-pk12', 'muahe-nu-giay01', 'muahe-nu-giay02', 'muahe-nu-giay03', 'halloween-nam-ao01', 'halloween-nam-ao02', 'halloween-nam-ao03', 'halloween-nam-ao04', 'halloween-nam-ao05', 'halloween-nam-dau01', 'halloween-nam-dau02', 'halloween-nam-dau03', 'halloween-nam-dau04', 'halloween-nam-dau05', 'halloween-nam-pk01', 'halloween-nam-pk02', 'halloween-nam-pk03', 'halloween-nam-pk04', 'halloween-nam-pk05', 'halloween-nam-pk06', 'halloween-nam-pk07', 'halloween-nam-pk08', 'halloween-nam-pk09', 'halloween-nam-pk10', 'halloween-nam-pk11', 'halloween-nam-pk12', 'halloween-nam-giay01', 'halloween-nam-giay02', 'halloween-nam-giay03', 'halloween-nu-ao01', 'halloween-nu-ao02', 'halloween-nu-ao03', 'halloween-nu-ao04', 'halloween-nu-ao05', 'halloween-nu-dau01', 'halloween-nu-dau02', 'halloween-nu-dau03', 'halloween-nu-dau04', 'halloween-nu-dau05', 'halloween-nu-pk01', 'halloween-nu-pk02', 'halloween-nu-pk03', 'halloween-nu-pk04', 'halloween-nu-pk05', 'halloween-nu-pk06', 'halloween-nu-pk07', 'halloween-nu-pk08', 'halloween-nu-pk09', 'halloween-nu-pk10', 'halloween-nu-pk11', 'halloween-nu-pk12', 'halloween-nu-giay01', 'halloween-nu-giay02', 'halloween-nu-giay03', 'trungthu-nam-ao01', 'trungthu-nam-ao02', 'trungthu-nam-ao03', 'trungthu-nam-ao04', 'trungthu-nam-ao05', 'trungthu-nam-dau01', 'trungthu-nam-dau02', 'trungthu-nam-dau03', 'trungthu-nam-dau04', 'trungthu-nam-dau05', 'trungthu-nam-pk01', 'trungthu-nam-pk02', 'trungthu-nam-pk03', 'trungthu-nam-pk04', 'trungthu-nam-pk05', 'trungthu-nam-pk06', 'trungthu-nam-pk07', 'trungthu-nam-pk08', 'trungthu-nam-pk09', 'trungthu-nam-pk10', 'trungthu-nam-pk11', 'trungthu-nam-pk12', 'trungthu-nam-giay01', 'trungthu-nam-giay02', 'trungthu-nam-giay03', 'trungthu-nu-ao01', 'trungthu-nu-ao02', 'trungthu-nu-ao03', 'trungthu-nu-ao04', 'trungthu-nu-ao05', 'trungthu-nu-dau01', 'trungthu-nu-dau02', 'trungthu-nu-dau03', 'trungthu-nu-dau04', 'trungthu-nu-dau05', 'trungthu-nu-pk01', 'trungthu-nu-pk02', 'trungthu-nu-pk03', 'trungthu-nu-pk04', 'trungthu-nu-pk05', 'trungthu-nu-pk06', 'trungthu-nu-pk07', 'trungthu-nu-pk08', 'trungthu-nu-pk09', 'trungthu-nu-pk10', 'trungthu-nu-pk11', 'trungthu-nu-pk12', 'trungthu-nu-giay01', 'trungthu-nu-giay02', 'trungthu-nu-giay03', 'phong-tet', 'phong-trungthu', 'phong-halloween', 'phong-giangsinh', 'phong-muadong', 'phong-muahe') and not it.achievement and i.how = 'buy'
    and it.id not in ('hieu-ung-02','hieu-ung-04','hieu-ung-05','hieu-ung-06','hieu-ung-17','doi-dau-11');
