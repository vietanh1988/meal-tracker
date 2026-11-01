-- 01/11 (chủ dự án chốt bản vẽ "Pi và Bài tập trên web"): bảng xếp hạng Pi công khai trên web + trang Pi có thành tích tuần.
-- Riêng tư (chốt "khoe Pi lên web"): chỉ Pi đã bật "Khoe Pi lên web" (pi_share.web_on) mới lộ tên Pi, biệt danh, đồ đang mặc;
-- Pi khác trên bảng hiện "Pi ẩn danh" (giống Pi + màu + cấp, không tên, không link). Không bao giờ trả tên thật / email / cân nặng.

-- hạng của 1 người trong 1 bảng tuần này (null nếu không có trên bảng). Cùng luật lọc với pi_board.
create or replace function public.pi_rank_of(p_uid uuid, p_kind text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('rank', z.rk, 'value', z.v)
    from (select x.user_id, x.v, row_number() over (order by x.v desc, x.at asc) rk
            from public.pi_board_rows(p_kind, date_trunc('week', public.pet_day())::date) x
            left join public.pi_share s on s.user_id = x.user_id
            left join public.profiles pr on pr.id = x.user_id
           where x.v > 0 and coalesce(s.board_on, true) and not coalesce(pr.is_test, false)) z
   where z.user_id = p_uid
$$;
revoke all on function public.pi_rank_of(uuid, text) from public, anon, authenticated;
grant execute on function public.pi_rank_of(uuid, text) to service_role;

create or replace function public.web_pi_board(p_kind text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_w0 date := date_trunc('week', public.pet_day())::date; v_rows jsonb; v_total int;
begin
  if p_kind not in ('cham', 'vandong', 'hanhtrinh') then raise exception 'Bảng không hợp lệ'; end if;
  with r as (
    select x.user_id, x.v, x.sub, row_number() over (order by x.v desc, x.at asc) rk
      from public.pi_board_rows(p_kind, v_w0) x
      left join public.pi_share s on s.user_id = x.user_id
      left join public.profiles pr on pr.id = x.user_id
     where x.v > 0 and coalesce(s.board_on, true) and not coalesce(pr.is_test, false))
  select (select count(*) from r),
         (select coalesce(jsonb_agg(
            (case when coalesce(s.web_on, false) and s.nick is not null
                  then coalesce(public.pi_card(r.user_id), '{}'::jsonb) || jsonb_build_object('web', true, 'streak', coalesce((public.pet_progress(r.user_id)->>'streak')::int, 0))
                  else jsonb_build_object('web', false, 'name', 'Pi ẩn danh', 'variant', public.pet_variant(r.user_id), 'color', public.pet_color(r.user_id),
                         'level', public.pet_level(coalesce(p.xp, 0)), 'equipped', '{}'::jsonb, 'place', '{}'::jsonb) end)
            || jsonb_build_object('rank', r.rk, 'value', r.v, 'sub', r.sub,
                 'hearts', (select count(*) from public.pi_hearts h where h.to_id = r.user_id and h.day between v_w0 and v_w0 + 6))
            order by r.rk), '[]'::jsonb)
            from r left join public.pi_share s on s.user_id = r.user_id left join public.pet_profiles p on p.user_id = r.user_id
           where r.rk <= 50)
    into v_total, v_rows;
  return jsonb_build_object('kind', p_kind, 'week', v_w0, 'total', v_total, 'rows', v_rows);
end $$;
revoke all on function public.web_pi_board(text) from public;
grant execute on function public.web_pi_board(text) to anon, authenticated, service_role;

-- trang Pi trên web: giữ mọi trường cũ, thêm hạng tuần (Chăm chỉ, Vận động), tim nhận tuần này, số bạn, có nhận lời mời người lạ không
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
    'water', (select count(*) from public.pet_ledger l where l.user_id = s.user_id and l.kind = 'water' and l.day >= date_trunc('week', public.pet_day())::date),
    'ranks', case when coalesce(s.board_on, true) then jsonb_strip_nulls(jsonb_build_object('cham', public.pi_rank_of(s.user_id, 'cham'), 'vandong', public.pi_rank_of(s.user_id, 'vandong'))) else '{}'::jsonb end,
    'hearts', (select count(*) from public.pi_hearts h where h.to_id = s.user_id and h.day between date_trunc('week', public.pet_day())::date and date_trunc('week', public.pet_day())::date + 6),
    'friends', (select count(*) from public.pi_friends f where (f.a = s.user_id or f.b = s.user_id) and f.status = 'ok'),
    'req_on', coalesce(s.stranger_req, true))
  from public.pi_share s join public.pet_profiles p on p.user_id = s.user_id where s.nick = lower(trim(p_nick)) and s.web_on
$$;
grant execute on function public.web_pi(text) to anon, authenticated;
