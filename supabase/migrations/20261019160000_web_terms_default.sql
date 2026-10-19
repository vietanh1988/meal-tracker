-- 3 chuyên mục mặc định mà menu đầu trang / chân trang (web_cms.sql) đã trỏ tới: /chu-de/giam-can, /chu-de/thuc-don, /chu-de/kien-thuc
-- (trước đây chỉ tạo menu, chưa tạo chuyên mục → 3 link đó báo 404). Có rồi thì bỏ qua.
insert into public.web_terms (kind, name, slug, description, sort) values
  ('category', 'Giảm cân', 'giam-can', 'Cách giảm cân bằng món Việt quen thuộc: ăn bao nhiêu calo, giảm bao nhiêu kg mỗi tuần là an toàn, giữ cân sau khi giảm.', 0),
  ('category', 'Thực đơn giảm cân', 'thuc-don', 'Thực đơn giảm cân toàn món Việt theo mức calo: sáng, trưa, chiều, tối — đổi món mà vẫn đúng calo.', 1),
  ('category', 'Kiến thức dinh dưỡng', 'kien-thuc', 'Kiến thức dinh dưỡng dễ hiểu: calo, đạm, tinh bột, chất béo trong món Việt và cách đọc khẩu phần.', 2)
on conflict (kind, slug) do nothing;
