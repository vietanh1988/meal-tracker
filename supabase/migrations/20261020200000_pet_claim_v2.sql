-- 20/10 (soát logic Pi): sửa pet_claim / pet_state_json
-- 1) Ngày của Pi = ngày app: trước 4:00 sáng vẫn là hôm trước (v_day = giờ VN − 4 tiếng). Quét cả daily_logs của ngày lịch (Hôm nay ghi lúc 1h sáng vẫn vào ngày lịch) và ngày app.
-- 2) "Ăn từ 3 bữa trở lên" = ≥ 3 bữa đã ăn ≥ 100 kcal (trước đây đòi ăn HẾT mọi bữa có món → áp thực đơn 5 bữa ăn 4 vẫn mất +20).
-- 3) Chuỗi chỉ đếm ngày có ăn ĐÚNG ngày đó (dấu "active:<ngày>" trong pet_ledger, ghi lúc nhận) → ghi bù ngày cũ không ra chuỗi / đồ thành tích.
--    Hôm nay chưa ăn thì chuỗi tính tới hôm qua (sáng ra không về 0); Hạt chuỗi chỉ khi hôm nay đã ăn.
-- 4) Cân đủ 4 tuần LIỀN (theo sổ weigh:<tuần> nhận đúng tuần đó). Đạt cân mục tiêu giữ 2 tuần (Vương miện vàng doi-dau-11): goal_type cut/bulk + goal_kg,
--    các lần cân nhập đúng ngày (không cân bù) trong 14 ngày qua ≥ 2 lần, lần đầu cách hôm nay ≥ 14 ngày, mọi lần đều đã đạt (cut ≤ goal + 0,5 kg; bulk ≥ goal − 0,5 kg).
-- 5) Mục tiêu nước: chỉ nhận water_goal_ml trong 500–8000 (giống app), ngoài khoảng thì dùng công thức.
-- 6) pet_state_json trả thêm day (ngày app), streak, weeks, waterDays, goalDays → mọi lần gọi (mua / mặc) không mất số chuỗi.

create or replace function public.pet_day() returns date
language sql stable as $$ select ((now() at time zone 'Asia/Ho_Chi_Minh') - interval '4 hours')::date $$;
grant execute on function public.pet_day() to authenticated;

create or replace function public.pet_progress(p_uid uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_day date := public.pet_day(); d date; v_streak int := 0; v_weeks int := 0; w date; v_wdays int; v_goal int := 0;
  v_prof record; v_first date; v_bad boolean; v_cnt int;
begin
  d := case when exists (select 1 from public.pet_ledger where user_id = p_uid and key = 'active:' || v_day) then v_day else v_day - 1 end;
  while exists (select 1 from public.pet_ledger where user_id = p_uid and key = 'active:' || d) and v_streak < 400 loop
    v_streak := v_streak + 1; d := d - 1;
  end loop;
  w := date_trunc('week', v_day)::date;
  if not exists (select 1 from public.pet_ledger where user_id = p_uid and key = 'weigh:' || to_char(w, 'IYYY-"W"IW')) then w := w - 7; end if;
  while exists (select 1 from public.pet_ledger where user_id = p_uid and key = 'weigh:' || to_char(w, 'IYYY-"W"IW')) and v_weeks < 60 loop
    v_weeks := v_weeks + 1; w := w - 7;
  end loop;
  select count(*) into v_wdays from public.pet_ledger l where l.user_id = p_uid and l.kind = 'water' and l.day > v_day - 30;
  select goal_type, goal_kg into v_prof from public.profiles where id = p_uid;
  if v_prof.goal_type in ('cut', 'bulk') and v_prof.goal_kg > 0 then
    -- lần cân nhập đúng ngày (created_at theo giờ VN cách logged_date ≤ 1 ngày)
    select min(x.logged_date), count(*), bool_or(case when v_prof.goal_type = 'cut' then x.kg > v_prof.goal_kg + 0.5 else x.kg < v_prof.goal_kg - 0.5 end)
      into v_first, v_cnt, v_bad
      from (select w2.logged_date, w2.kg from public.weight_logs w2 where w2.user_id = p_uid and w2.logged_date between v_day - 28 and v_day
              and ((w2.created_at at time zone 'Asia/Ho_Chi_Minh')::date - w2.logged_date) between 0 and 1
              and w2.logged_date >= coalesce((select max(w3.logged_date) from public.weight_logs w3 where w3.user_id = p_uid and w3.logged_date <= v_day
                and (case when v_prof.goal_type = 'cut' then w3.kg > v_prof.goal_kg + 0.5 else w3.kg < v_prof.goal_kg - 0.5 end)) + 1, '1900-01-01'::date)) x;
    if v_cnt >= 2 and not coalesce(v_bad, true) then v_goal := least(14, greatest(0, v_day - v_first)); end if;
  end if;
  return jsonb_build_object('day', v_day, 'streak', v_streak, 'weeks', v_weeks, 'waterDays', v_wdays, 'goalDays', v_goal);
end $$;
revoke all on function public.pet_progress(uuid) from public, anon, authenticated;

create or replace function public.pet_state_json(p_uid uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'name', p.name, 'balance', p.balance, 'xp', p.xp, 'level', public.pet_level(p.xp), 'bow', p.bow, 'settings', p.settings,
    'variant', public.pet_variant(p_uid),
    'today', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.day = public.pet_day() and l.amount > 0 and l.kind <> 'admin'),
    'keys', (select coalesce(jsonb_agg(l.key), '[]'::jsonb) from public.pet_ledger l where l.user_id = p_uid and l.day >= public.pet_day() - 6 and l.amount > 0),
    'owned', (select coalesce(jsonb_agg(i.item_id), '[]'::jsonb) from public.pet_inventory i where i.user_id = p_uid),
    'equipped', (select coalesce(jsonb_object_agg(e.slot, e.item_id), '{}'::jsonb) from public.pet_equipped e where e.user_id = p_uid),
    'week', (select coalesce(sum(amount), 0) from public.pet_ledger l where l.user_id = p_uid and l.amount > 0 and l.kind <> 'admin' and l.day >= date_trunc('week', public.pet_day())::date)
  ) || public.pet_progress(p_uid) from public.pet_profiles p where p.user_id = p_uid
$$;
revoke all on function public.pet_state_json(uuid) from public, anon, authenticated;

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

  -- đồ thành tích (không bán, ai cũng nhận) — chỉ theo việc làm đúng ngày
  v_pr := public.pet_progress(v_uid);
  if (v_pr->>'streak')::int >= 7 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-05', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-05') on conflict do nothing; end if;
  if (v_pr->>'streak')::int >= 30 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-06', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-06') on conflict do nothing; end if;
  if (v_pr->>'streak')::int >= 100 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-17', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-17') on conflict do nothing; end if;
  if (v_pr->>'weeks')::int >= 4 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-02', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-02') on conflict do nothing; end if;
  if (v_pr->>'waterDays')::int >= 30 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'hieu-ung-04', 'achievement' where exists (select 1 from public.pet_items where id = 'hieu-ung-04') on conflict do nothing; end if;
  if (v_pr->>'goalDays')::int >= 14 then insert into public.pet_inventory (user_id, item_id, how) select v_uid, 'doi-dau-11', 'achievement' where exists (select 1 from public.pet_items where id = 'doi-dau-11') on conflict do nothing; end if;

  return public.pet_state_json(v_uid);
end $$;
revoke all on function public.pet_claim() from public, anon;
grant execute on function public.pet_claim() to authenticated;

-- Dấu "active" cho ngày đã nhận Hạt bữa trước bản này (để chuỗi của người đang dùng không về 0)
insert into public.pet_ledger (user_id, amount, kind, key, day)
select distinct user_id, 0, 'active', 'active:' || day, day from public.pet_ledger where kind = 'meal'
on conflict (user_id, key) do nothing;
