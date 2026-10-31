-- 01/11 (chủ dự án: "đã nhấn đồng ý rồi sao lại hiện lại"): trả lời lời mời xong (ở chuông, thông báo nổi, tab Bạn bè hay gửi lời mời ngược)
-- → sửa luôn dòng lời mời trong chuông của người trả lời: bỏ req= khỏi url (hết nút Đồng ý / Từ chối), ghi rõ đã kết bạn / đã từ chối.
create or replace function public.pi_req_done(p_me uuid, p_o uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_nick text := (select nick from public.pi_share where user_id = p_o);
begin
  if v_nick is null then return; end if;
  update public.notifications
     set url = replace(url, '&req=' || v_nick, case when p_ok then '&friend=' || v_nick else '' end),
         title = public.pi_name(p_o) || case when p_ok then ' đã là bạn của bạn' else ' đã xin kết bạn' end,
         body = case when p_ok then 'Bạn đã đồng ý kết bạn' else 'Bạn đã từ chối lời mời' end
   where user_id = p_me and url like '%&req=' || v_nick;
end $$;
revoke all on function public.pi_req_done(uuid, uuid, boolean) from public, anon, authenticated;

-- dọn các dòng lời mời đã trả lời trước bản này (đã là bạn → đã kết bạn; không còn lời mời → đã từ chối / hết hạn)
do $$ declare r record; v_o uuid; begin
  for r in select n.id, n.user_id, substring(n.url from '&req=([a-z0-9-]+)$') nick from public.notifications n where n.url ~ '&req=[a-z0-9-]+$' loop
    select user_id into v_o from public.pi_share where nick = r.nick;
    if v_o is null then continue; end if;
    if public.pi_is_friend(r.user_id, v_o) then perform public.pi_req_done(r.user_id, v_o, true);
    elsif not exists (select 1 from public.pi_friends f where f.a = least(r.user_id, v_o) and f.b = greatest(r.user_id, v_o) and f.status = 'pending' and f.by_user = v_o) then
      perform public.pi_req_done(r.user_id, v_o, false);
    end if;
  end loop;
end $$;

create or replace function public.pi_friend_answer(p_nick text, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_o uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  select user_id into v_o from public.pi_share where nick = lower(trim(coalesce(p_nick, '')));
  if v_o is null then return jsonb_build_object('ok', false); end if;
  if p_accept then
    update public.pi_friends set status = 'ok' where a = least(v_uid, v_o) and b = greatest(v_uid, v_o) and status = 'pending' and by_user = v_o;
    if found then perform public.pi_push(v_o, public.pi_name(v_uid) || ' đã đồng ý kết bạn', 'Ghé phòng Pi của nhau, thả tim, đua xếp hạng tuần nha', '/?pi=social&from=push&friend=' || public.pi_nick(v_uid)); end if;
  else
    delete from public.pi_friends where a = least(v_uid, v_o) and b = greatest(v_uid, v_o) and status = 'pending' and by_user = v_o;
    if found then
      insert into public.pi_friend_no (from_id, to_id, at) values (v_o, v_uid, now()) on conflict (from_id, to_id) do update set at = now();
    end if;
  end if;
  perform public.pi_req_done(v_uid, v_o, public.pi_is_friend(v_uid, v_o));
  return jsonb_build_object('ok', true, 'status', public.pi_fr(v_uid, v_o));
end $$;
revoke all on function public.pi_friend_answer(text, boolean) from public, anon;
grant execute on function public.pi_friend_answer(text, boolean) to authenticated;

create or replace function public.pi_friend_ask(p_me uuid, p_o uuid, p_stranger boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare f public.pi_friends; v_card jsonb;
begin
  if p_o is null then return jsonb_build_object('ok', false, 'why', 'code'); end if;
  if p_o = p_me then return jsonb_build_object('ok', false, 'why', 'self'); end if;
  select * into f from public.pi_friends where a = least(p_me, p_o) and b = greatest(p_me, p_o);
  if found then
    if f.status = 'pending' and f.by_user = p_o then
      update public.pi_friends set status = 'ok' where a = f.a and b = f.b;
      perform public.pi_req_done(p_me, p_o, true);
      perform public.pi_push(p_o, public.pi_name(p_me) || ' đã đồng ý kết bạn', 'Ghé phòng Pi của nhau, thả tim, đua xếp hạng tuần nha', '/?pi=social&from=push&friend=' || public.pi_nick(p_me));
      return jsonb_build_object('ok', true, 'status', 'ok', 'name', public.pi_name(p_o));
    end if;
    return jsonb_build_object('ok', true, 'status', f.status, 'name', public.pi_name(p_o));
  end if;
  if (select count(*) from public.pi_friends where (a = p_me or b = p_me)) >= 200 then return jsonb_build_object('ok', false, 'why', 'full'); end if;
  if p_stranger and not coalesce((select stranger_req from public.pi_share where user_id = p_o), true) then return jsonb_build_object('ok', false, 'why', 'off'); end if;
  if exists (select 1 from public.pi_friend_no n where n.from_id = p_me and n.to_id = p_o and n.at > now() - interval '7 days') then return jsonb_build_object('ok', false, 'why', 'wait'); end if;
  if (select count(*) from public.pi_friends where by_user = p_me and (created_at at time zone 'Asia/Ho_Chi_Minh')::date = (now() at time zone 'Asia/Ho_Chi_Minh')::date) >= 10 then
    return jsonb_build_object('ok', false, 'why', 'limit');
  end if;
  insert into public.pi_friends (a, b, status, by_user) values (least(p_me, p_o), greatest(p_me, p_o), 'pending', p_me);
  v_card := public.pi_card(p_me);
  perform public.pi_push(p_o, public.pi_name(p_me) || ' muốn kết bạn',
    (case when v_card->>'variant' = 'nu' then 'Pi nữ' else 'Pi nam' end) || ' · Cấp ' || coalesce(v_card->>'level', '1') || ' · chạm để trả lời',
    '/?pi=social&from=push&req=' || public.pi_nick(p_me));
  return jsonb_build_object('ok', true, 'status', 'pending', 'name', public.pi_name(p_o));
end $$;
revoke all on function public.pi_friend_ask(uuid, uuid, boolean) from public, anon, authenticated;
