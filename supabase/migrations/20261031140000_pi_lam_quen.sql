-- 31/10 (chủ dự án chốt bản B): 3 ngày làm quen Pi cho tài khoản mới (tạo trong 14 ngày).
-- Mỗi ngày của Pi (pet_day) làm được tối đa 1 việc, theo thứ tự; việc chưa làm thì hôm sau vẫn chờ, không mất thưởng.
--   1) có ít nhất 1 bữa bấm Đã ăn (≥ 100 kcal) hôm nay        → +30 Hạt (key onboard:1)
--   2) có ít nhất 2 bữa Đã ăn được tính Hạt hôm nay           → +40 Hạt (key onboard:2)
--   3) uống đủ nước hôm nay hoặc có lần cân nhập đúng hôm nay → +50 Hạt (key onboard:3)
-- Hạt làm quen (kind 'onboard') KHÔNG tính vào trần Hạt / ngày, Hạt hôm nay, Hạt tuần (giống 'invite', 'rank'); chỉ cộng ví, không cộng XP.
-- pet_claim tự soát việc làm quen sau khi cộng Hạt việc ngày; pet_state_json trả thêm onboard = { n, last, day } (null khi tài khoản quá 14 ngày).

create or replace function public.pet_onboard_info(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select case when exists (select 1 from auth.users u where u.id = p_uid and u.created_at > now() - interval '14 days')
    then jsonb_build_object(
      'n', (select count(*) from public.pet_ledger l where l.user_id = p_uid and l.kind = 'onboard'),
      'last', (select max(l.day) from public.pet_ledger l where l.user_id = p_uid and l.kind = 'onboard'),
      'day', public.pet_day())
  end
$$;
revoke all on function public.pet_onboard_info(uuid) from public, anon, authenticated;

create or replace function public.pet_onboard_tick(p_uid uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_day date := public.pet_day();
  v_cal date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_n int; v_last date; v_ok boolean := false; v_pts int;
begin
  if not exists (select 1 from auth.users u where u.id = p_uid and u.created_at > now() - interval '14 days') then return; end if;
  select count(*), max(day) into v_n, v_last from public.pet_ledger where user_id = p_uid and kind = 'onboard';
  if v_n >= 3 or v_last >= v_day then return; end if;
  if v_n = 0 then
    v_ok := exists (select 1 from public.pet_ledger where user_id = p_uid and key = 'active:' || v_day);
  elsif v_n = 1 then
    v_ok := (select count(*) from public.pet_ledger where user_id = p_uid and kind = 'meal' and day = v_day) >= 2;
  else
    v_ok := exists (select 1 from public.pet_ledger where user_id = p_uid and key = 'water:' || v_day)
      or exists (select 1 from public.weight_logs w where w.user_id = p_uid and w.logged_date in (v_day, v_cal)
                 and ((w.created_at at time zone 'Asia/Ho_Chi_Minh')::date - w.logged_date) between 0 and 1);
  end if;
  if not v_ok then return; end if;
  v_pts := (array[30, 40, 50])[v_n + 1];
  insert into public.pet_ledger (user_id, amount, kind, key, day) values (p_uid, v_pts, 'onboard', 'onboard:' || (v_n + 1), v_day)
    on conflict (user_id, key) do nothing;
  if found then update public.pet_profiles set balance = balance + v_pts, updated_at = now() where user_id = p_uid; end if;
end $$;
revoke all on function public.pet_onboard_tick(uuid) from public, anon, authenticated;

-- Hạt mời / xếp hạng / làm quen không tính vào trần / ngày, Hạt hôm nay, Hạt tuần; thêm onboard
create or replace function public.pet_state_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'name', p.name, 'balance', p.balance, 'xp', p.xp, 'level', public.pet_level(p.xp), 'bow', p.bow, 'settings', p.settings,
    'variant', public.pet_variant(p_uid),
    'today', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.day = public.pet_day() and l.amount > 0 and l.kind not in ('admin', 'invite', 'rank', 'onboard')),
    'keys', (select coalesce(jsonb_agg(l.key), '[]'::jsonb) from public.pet_ledger l where l.user_id = p_uid and l.day >= public.pet_day() - 6 and l.amount > 0),
    'owned', (select coalesce(jsonb_agg(i.item_id), '[]'::jsonb) from public.pet_inventory i where i.user_id = p_uid),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = p_uid),
    'week', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.amount > 0 and l.kind not in ('admin', 'invite', 'rank', 'onboard') and l.day >= date_trunc('week', public.pet_day())::date),
    'onboard', public.pet_onboard_info(p_uid)
  ) || public.pet_progress(p_uid) from public.pet_profiles p where p.user_id = p_uid
$$;
revoke all on function public.pet_state_json(uuid) from public, anon, authenticated;

-- pet_claim: như bản 30/10 (pi_khoe), trần ngày bỏ qua 'onboard', cuối hàm soát việc làm quen
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

  select coalesce(sum(amount), 0) into v_sum from public.pet_ledger where user_id = v_uid and day = v_day and amount > 0 and kind not in ('admin', 'invite', 'rank', 'onboard');
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

  perform public.pet_onboard_tick(v_uid);
  return public.pet_state_json(v_uid);
end $$;
revoke all on function public.pet_claim() from public, anon;
grant execute on function public.pet_claim() to authenticated;
