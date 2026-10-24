-- 24/10: tiền mua đồ chỉ có Hạt — huy hiệu 7 ngày (hieu-ung-05) đổi tên "Đồng xu" → "Lấp lánh vàng" (hình đổi trong code)
update public.pet_items set name = 'Lấp lánh vàng' where id = 'hieu-ung-05' and name = 'Đồng xu';
