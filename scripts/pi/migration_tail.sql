
-- ===== Đồ cũ: ẩn, hoàn Hạt, bỏ khỏi tủ + tháo =====
-- đồ thành tích cũ (chuỗi 7/30/100 ngày, cân 4 tuần, nước 30 ngày, đạt cân) giữ để trưng
update public.pet_items set hidden = true, updated_at = now()
  where id not in (__NEW_IDS__)
    and id not in ('hieu-ung-02','hieu-ung-04','hieu-ung-05','hieu-ung-06','hieu-ung-17','doi-dau-11') and not hidden;

with paid as (
  select i.user_id, i.item_id, coalesce(-(select l.amount from public.pet_ledger l where l.user_id = i.user_id and l.key = 'buy:' || i.item_id), it.price) amt
  from public.pet_inventory i join public.pet_items it on it.id = i.item_id
  where i.how = 'buy' and it.id not in (__NEW_IDS__) and not it.achievement
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

delete from public.pet_equipped where item_id not in (__NEW_IDS__);
delete from public.pet_inventory i using public.pet_items it
  where it.id = i.item_id and it.id not in (__NEW_IDS__) and not it.achievement and i.how = 'buy'
    and it.id not in ('hieu-ung-02','hieu-ung-04','hieu-ung-05','hieu-ung-06','hieu-ung-17','doi-dau-11');
