-- 01/11 (chủ dự án chốt bản vẽ "Tập luyện": Giáo án · Thư viện · Nhật ký; khách tự sửa lịch + bài; cho cả nhóm giảm cân):
--  workout_plans    = giáo án của khách (nhiều cái, 1 cái đang dùng); days = {"0".."6": {title, items:[{ex, sets, reps}]}} (0 = T2), thiếu = nghỉ
--  workout_sessions = buổi đã / đang tập (1 dòng / buổi); items = [{ex, sets:[{kg, reps, done}]}]
--  user_exercises   = bài khách tự thêm vào thư viện (bài có sẵn nằm trong app: src/workout/exercises.js)
--  pet_workout_claim(buổi) = tập xong (≥ 10 hiệp đã tick, đúng ngày) → +20 Hạt (kind 'workout', 1 lần / ngày, tính trần Hạt ngày như việc thường)
--  Bảng xếp hạng Vận động cộng thêm phút buổi tập (tối đa 90 phút / ngày gộp với Vận động thêm).

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  tpl text,
  active boolean not null default false,
  days jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_plans_user on public.workout_plans (user_id);
create unique index if not exists workout_plans_one_active on public.workout_plans (user_id) where active;

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  plan_id uuid references public.workout_plans(id) on delete set null,
  title text not null default 'Buổi tập',
  items jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes int,
  sets_done int,
  volume numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_sessions_user_day on public.workout_sessions (user_id, day desc);

create table if not exists public.user_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^u-[a-z0-9-]{1,40}$'),
  vi text not null check (char_length(vi) between 1 and 60),
  en text check (en is null or char_length(en) <= 60),
  muscle text not null,
  equip text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.workout_plans enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.user_exercises enable row level security;
drop policy if exists workout_plans_own on public.workout_plans;
create policy workout_plans_own on public.workout_plans for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists workout_sessions_own on public.workout_sessions;
create policy workout_sessions_own on public.workout_sessions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists user_exercises_own on public.user_exercises;
create policy user_exercises_own on public.user_exercises for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.workout_plans to authenticated, service_role;
grant select, insert, update, delete on public.workout_sessions to authenticated, service_role;
grant select, insert, update, delete on public.user_exercises to authenticated, service_role;

-- tập xong → +20 Hạt (1 lần / ngày), máy chủ tự đếm hiệp đã tick từ items
create or replace function public.pet_workout_claim(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_day date := public.pet_day(); v_cal date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  s public.workout_sessions; v_sets int; v_cfg jsonb; v_cap int; v_sum int; v_add int;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select * into s from public.workout_sessions where id = p_session and user_id = v_uid;
  if not found or s.ended_at is null or s.day not in (v_day, v_cal) then return jsonb_build_object('ok', false, 'why', 'session'); end if;
  select count(*) into v_sets from jsonb_array_elements(case when jsonb_typeof(s.items) = 'array' then s.items else '[]'::jsonb end) it
    cross join lateral jsonb_array_elements(case when jsonb_typeof(it->'sets') = 'array' then it->'sets' else '[]'::jsonb end) st
   where (st->>'done')::boolean is true;
  if v_sets < 10 then return jsonb_build_object('ok', false, 'why', 'sets', 'sets', v_sets); end if;
  insert into public.pet_profiles (user_id) values (v_uid) on conflict do nothing;
  perform 1 from public.pet_profiles where user_id = v_uid for update;
  if exists (select 1 from public.pet_ledger where user_id = v_uid and key = 'workout:' || v_day) then return jsonb_build_object('ok', false, 'why', 'today'); end if;
  select coalesce((select value::jsonb from public.app_settings where key = 'pet_config'), '{}'::jsonb) into v_cfg;
  v_cap := coalesce(nullif(v_cfg->>'cap', '')::int, 120);
  select coalesce(sum(amount), 0) into v_sum from public.pet_ledger where user_id = v_uid and day = v_day and amount > 0 and kind not in ('admin', 'invite', 'rank', 'onboard');
  v_add := least(coalesce(nullif(v_cfg->'points'->>'workout', '')::int, 20), v_cap - v_sum);
  if v_add <= 0 then return jsonb_build_object('ok', false, 'why', 'cap'); end if;
  insert into public.pet_ledger (user_id, amount, kind, key, day) values (v_uid, v_add, 'workout', 'workout:' || v_day, v_day) on conflict (user_id, key) do nothing;
  if found then update public.pet_profiles set balance = balance + v_add, xp = xp + v_add, updated_at = now() where user_id = v_uid; end if;
  return jsonb_build_object('ok', true, 'added', v_add, 'state', public.pet_state_json(v_uid));
end $$;
revoke all on function public.pet_workout_claim(uuid) from public, anon;
grant execute on function public.pet_workout_claim(uuid) to authenticated;

-- bảng xếp hạng: Vận động = phút Vận động thêm + phút buổi tập (gộp tối đa 90 / ngày, chỉ ghi đúng ngày)
create or replace function public.pi_board_rows(p_kind text, p_w0 date) returns table (user_id uuid, v numeric, sub text, at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if p_kind = 'cham' then
    return query select l.user_id, sum(l.amount)::numeric, null::text, max(l.created_at)
      from public.pet_ledger l where l.day between p_w0 and p_w0 + 6 and l.amount > 0 and l.kind not in ('admin', 'invite', 'rank', 'buy')
      group by l.user_id;
  elsif p_kind = 'vandong' then
    return query select d.user_id, sum(d.m)::numeric, string_agg(distinct d.t, ','), max(d.at)
      from (select u.user_id, u.log_date, least(90, sum(u.m)) m, string_agg(distinct u.t, ',') t, max(u.at) at
              from (select a.user_id, a.log_date, greatest(0, coalesce((it->>'min')::numeric, 0)) m, coalesce(it->>'type', 'other') t, a.updated_at at
                      from public.activity_logs a cross join lateral jsonb_array_elements(case when jsonb_typeof(a.items) = 'array' then a.items else '[]'::jsonb end) it
                     where a.log_date between p_w0 and p_w0 + 6 and ((a.updated_at at time zone 'Asia/Ho_Chi_Minh')::date - a.log_date) between 0 and 1
                    union all
                    select w.user_id, w.day, least(120, greatest(0, coalesce(w.minutes, 0)))::numeric, 'gym', w.ended_at
                      from public.workout_sessions w
                     where w.day between p_w0 and p_w0 + 6 and w.ended_at is not null and ((w.ended_at at time zone 'Asia/Ho_Chi_Minh')::date - w.day) between 0 and 1) u
             group by u.user_id, u.log_date) d
      where d.m > 0 group by d.user_id;
  elsif p_kind = 'hanhtrinh' then
    return query
      with w as (
        select x.user_id, x.logged_date, x.kg, x.created_at,
               row_number() over (partition by x.user_id order by x.logged_date, x.created_at) r1,
               row_number() over (partition by x.user_id order by x.logged_date desc, x.created_at desc) r2
          from public.weight_logs x
         where x.logged_date between current_date - 120 and current_date + 1 and x.kg > 0
           and ((x.created_at at time zone 'Asia/Ho_Chi_Minh')::date - x.logged_date) between 0 and 1),
      f as (select a.user_id, a.kg k0, a.logged_date d0, b.kg k1, b.logged_date d1, b.created_at at from w a join w b on b.user_id = a.user_id and b.r2 = 1 where a.r1 = 1 and a.logged_date < b.logged_date),
      g as (select f.*, pr.goal_type gt, pr.goal_kg gk,
                   case when pr.goal_type = 'cut' then f.k0 - pr.goal_kg else pr.goal_kg - f.k0 end need,
                   least(case when pr.goal_type = 'cut' then f.k0 - f.k1 else f.k1 - f.k0 end, greatest(1, (f.d1 - f.d0) / 7.0) * f.k0 * 0.01) done
              from f join public.profiles pr on pr.id = f.user_id join public.pi_share s on s.user_id = f.user_id and s.show_weight
             where pr.goal_type in ('cut', 'bulk') and pr.goal_kg > 0)
      select g.user_id, greatest(0, least(100, round(g.done / g.need * 100)))::numeric,
             (case when g.gt = 'cut' then 'Giảm cân' else 'Tăng cân' end) || ' · ' || greatest(1, ceil((g.d1 - g.d0) / 7.0))::int || ' tuần', g.at
        from g where g.need > 0;
  end if;
end $$;
revoke all on function public.pi_board_rows(text, date) from public, anon, authenticated;
