-- 21/10: tạm ẩn 7 món vẽ không khớp dáng Pi (soát bằng /__pet?s=grid&slot=...): chưa ai sở hữu nên không cần hoàn Hạt.
-- Mũ phù thuỷ (lệch phải), Mũ phượng (lơ lửng trên đầu), Băng đô cổ vũ (nghiêng, không ôm đầu), Kính ngôi sao bóng đá (to, càng kính chĩa lên),
-- Khăn quàng hồng (nằm thấp trước ngực), 2 ván trượt (chân không đứng trên ván). Vẽ lại xong thì mở bán lại trong Quản trị › Thú cưng Pi.
update public.pet_items set hidden = true, updated_at = now()
where id in ('halloween-01', 'co-trang-03', 'bong-da-02', 'bong-da-05', 'phu-kien-13', 'phu-kien-08', 'phu-kien-14');
