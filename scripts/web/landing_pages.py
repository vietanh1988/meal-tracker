#!/usr/bin/env python3
"""26/10: nội dung 2 trang giới thiệu (mẫu trang "landing") theo bản vẽ đã chốt — /pi và /huong-dan.
   python3 scripts/web/landing_pages.py > /tmp/pages.json   (rồi đưa vào web_posts; sau đó sửa trong Quản trị › Trang)"""
import json
C = lambda t, x, b: {"title": t, "text": x, "badge": b}
SH = lambda *n: [{"url": f"/img/huong-dan/{k}.webp", "alt": a} for k, a in n]
PI = [
 {"type": "lp_hero", "eye": "🌱 Bạn đồng hành trong app", "title": "Gặp *Pi*, chú mầm nhỏ|ăn đúng cùng bạn",
  "sub": "Ăn đúng bữa, uống đủ nước, cân đều đặn là Pi nhận Hạt. Dùng Hạt mua đồ, Pi lên cấp và vui cùng bạn mỗi ngày. Miễn phí cho mọi tài khoản.",
  "btn1_label": "Dùng thử miễn phí ›", "btn1_url": "https://app.fipilotai.com/?ref=page-pi", "btn2_label": "▶ Xem video 1 phút", "btn2_url": "#video",
  "images": [{"url": "/img/pi/pi-nam-nu.webp", "alt": "Pi nam và Pi nữ trong phòng mùa hè"}],
  "chips": [{"icon": "coin", "title": "+10 Hạt", "sub": "Đã ăn bữa sáng"}, {"icon": "🔥", "title": "7 ngày liền", "sub": "Chuỗi đang giữ"}, {"icon": "⭐", "title": "Cấp 3", "sub": "Mở thêm đồ mới"}]},
 {"type": "lp_head", "eye": "Xem nhanh", "title": "Nuôi Pi trong 1 phút", "sub": "Video hướng dẫn: làm gì để có Hạt, mua đồ, lên cấp."},
 {"type": "video", "url": "/video/pi-nuoi.mp4", "poster": "/video/pi-nuoi.webp", "title": "Nuôi Pi thế nào? Hướng dẫn 1 phút", "caption": "", "vertical": False, "duration": "PT51S"},
 {"type": "lp_head", "eye": "Nhận Hạt", "title": "Làm việc tốt mỗi ngày, Pi nhận Hạt", "sub": "Hạt cộng ngay khi bạn làm xong, không cần bấm nhận."},
 {"type": "lp_cards", "items": [C("Ăn xong, chạm Đã ăn", "Mỗi bữa từ 100 kcal. Ăn từ 3 bữa được thêm 20.", "+10 / bữa"), C("Uống đủ nước", "Chạm cốc nước ở màn Hôm nay tới khi đủ mục tiêu.", "+15"), C("Cân tuần này", "Cân 1 lần trong tuần, nhập ở thẻ Cân nặng màn Hôm nay.", "+20 / tuần"), C("Giữ chuỗi ngày", "Từ ngày thứ 3 liền có ăn, mỗi ngày giữ chuỗi được thêm. Chụp món được thêm 5.", "+10")],
  "note": "Mỗi ngày tối đa <b>120 Hạt</b>. Chỉ tính việc làm đúng ngày, ghi bù ngày cũ không ra Hạt."},
 {"type": "lp_feature", "eye": "Cửa hàng & Tủ đồ", "title": "Hơn 300 món đồ, mặc thử trước khi mua", "images": [{"url": "/img/pi/pi-mac-do.webp", "alt": "Pi mặc thêm từng món"}],
  "bullets": [{"text": t} for t in ["6 bộ sưu tập: Tết, Trung thu, Halloween, Giáng sinh, Mùa đông, Mùa hè.", "Áo, mũ, kính, khăn, túi, giày, đồ cầm tay, đồ đeo lưng.", "Mặc thử nhiều món cùng lúc, ưng thì <b>Mua cả bộ</b>.", "Đồ đã mua mặc quanh năm, hết Premium cũng không mất."]]},
 {"type": "lp_feature", "eye": "Lên cấp", "title": "Hạt nhận được cũng là kinh nghiệm", "text": "Đủ kinh nghiệm thì Pi lên cấp, Cửa hàng mở thêm đồ mới. Cấp càng cao, đồ càng xịn.", "phone": True, "rev": True,
  "images": [{"url": "/img/huong-dan/pi-cua-hang.webp", "alt": "Cửa hàng đồ của Pi"}, {"url": "/img/huong-dan/pi-tu-do.webp", "alt": "Tủ đồ của Pi"}]},
 {"type": "lp_feature", "eye": "Phòng của Pi", "title": "Phòng tự đổi theo dịp lễ và theo giờ", "width": "78", "images": [{"url": "/img/pi/pi-phong-theo-dip.webp", "alt": "Bốn phòng của Pi theo dịp"}],
  "text": "Tết, Trung thu, Halloween, Giáng sinh thì Pi ở phòng của dịp đó. Ngày thường là phòng mùa đông hoặc mùa hè. Ánh sáng đổi theo sáng, trưa, tối. Phòng miễn phí, không cần mua."},
 {"type": "lp_feature", "eye": "Tâm trạng", "title": "Pi biết bạn đang thế nào", "rev": True, "text": "App tự tính tâm trạng của Pi theo việc bạn làm, bạn không phải chăm. Pi không bao giờ dỗi hay trách mắng, vắng vài ngày quay lại Pi còn mừng.",
  "tiles": [{"img": f"/img/pi/mood-{k}.webp", "title": t, "sub": s} for k, t, s in [("vui", "Vui", "Đang làm tốt"), ("hoi", "Chờ bữa", "Quá giờ ăn"), ("ngu", "Ngủ", "Sau 22:30"), ("mung", "Mừng", "Bạn quay lại")]]},
 {"type": "lp_feature", "eye": "Nói chuyện", "title": "Chạm vào Pi, Pi nói chuyện", "phone": True, "images": [{"url": "/img/huong-dan/pi-man.webp", "alt": "Phòng của Pi và việc hôm nay"}, {"url": "/img/huong-dan/pi-hoi.webp", "alt": "Hỏi Pi bằng AI"}],
  "bullets": [{"text": t} for t in ["Chạm vào Pi là Pi nói, có giọng Pi thu sẵn.", "Pi khen việc tốt bằng số thật của bạn: số bữa, lượng nước, chuỗi ngày.", "<b>Hỏi Pi</b> bằng AI, dùng lượt chat AI của gói."]]},
 {"type": "lp_head", "eye": "Đồ thành tích", "title": "Không bán, ai đạt cũng nhận", "sub": "Kể cả tài khoản miễn phí."},
 {"type": "lp_tiles", "cols": "3", "items": [{"img": f"/img/pi/tr-{k}.webp", "title": t, "sub": s} for k, t, s in [("03", "Lấp lánh vàng", "7 ngày liền đã ăn"), ("06", "Cúp vàng", "30 ngày liền đã ăn"), ("17", "Cầu vồng", "100 ngày liền đã ăn"), ("02", "Ngôi sao", "Cân đủ 4 tuần liền"), ("04", "Tia nước", "Đủ nước 30 ngày"), ("11", "Vương miện vàng", "Đạt cân mục tiêu, giữ 2 tuần")]]},
 {"type": "lp_head", "eye": "Hỏi đáp", "title": "Câu hỏi thường gặp về Pi", "anchor": "hoi-dap"},
 {"type": "faq", "title": "", "items": [{"q": q, "a": a} for q, a in [("Pi có mất phí không?", "Không. Pi miễn phí cho mọi tài khoản, Hạt kiếm từ việc ăn uống hằng ngày như nhau cho mọi gói."), ("Không chơi Pi thì có dùng app được không?", "Được. Pi chỉ là bạn đồng hành, ghi bữa, thực đơn, tiến độ vẫn dùng bình thường."), ("Đổi giới tính trong hồ sơ thì Pi thế nào?", "Pi đổi theo bản mới (giọng và kho đồ). Đồ đã mua của bản cũ vẫn giữ."), ("Ghi bù bữa hôm qua có được Hạt không?", "Không. Bữa ghi bù vẫn vào nhật ký, nhưng Hạt chỉ cộng cho việc làm đúng ngày.")]]},
]
W = lambda *x: [{"icon": i, "title": t, "text": s} for i, t, s in x]
G = [
 {"type": "lp_hero", "eye": "📘 Hướng dẫn sử dụng", "title": "Dùng Fipilot AI|*trong 5 phút*", "sub": "Từ lúc cài app tới lúc xem kết quả cuối tháng. Mỗi bước có ảnh màn hình thật của app.", "nav": True,
  "images": SH(("hom-nay", "Màn Hôm nay của app"), ("ghi-bua", "Màn Ghi bữa"))},
 {"type": "lp_step", "title": "Cài app lên điện thoại", "text": "Fipilot AI chạy trên trình duyệt, cài thẳng ra màn hình chính, không cần CH Play hay App Store.",
  "ways": W(("📱", "iPhone", "Mở app.fipilotai.com bằng Safari › Chia sẻ › <b>Thêm vào MH chính</b>."), ("🤖", "Android", "Mở bằng Chrome › menu ⋮ › <b>Cài đặt ứng dụng</b>.")), "images": SH(("onb-chao", "Màn chào khi mở app lần đầu"))},
 {"type": "lp_step", "title": "Trả lời vài câu, app tính sẵn", "text": "Chọn giảm cân hay tập gym, nhập cân nặng, chiều cao, năm sinh. App tự tính calo và đạm, tinh bột, béo mỗi ngày, rồi hẹn ngày bạn đạt mục tiêu.", "images": SH(("onb-co-the", "Nhập cơ thể"), ("onb-loss-hua", "Kế hoạch giảm cân"))},
 {"type": "lp_step", "title": "Đọc màn Hôm nay", "text": "Vòng tròn lớn là số kcal còn lại. Bốn thanh Đạm, Tinh bột, Béo, Xơ: đỏ là vượt, vàng là thiếu khi ngày đã xong. Thẻ bữa đến giờ có sẵn gợi ý món, bấm Ghi là xong.", "images": SH(("hom-nay", "Màn Hôm nay"), ("goi-y", "Thẻ bữa đến giờ có gợi ý"))},
 {"type": "lp_step", "title": "Ghi bữa ăn: 3 cách", "text": "Chọn cách nhanh nhất với bạn:", "ways": W(("1", "Ghi 1 chạm", "từ gợi ý ở thẻ bữa đến giờ."), ("2", "Tìm từng món", "gõ tên (không dấu cũng được), chọn nhiều món vào giỏ, chỉnh gram rồi Ghi."), ("3", "Tính calo cả bữa", "gõ một dòng \"1 tô phở bò, 1 ly trà đá\".")),
  "tip": "Ghi nhầm thì bấm <b>Hoàn tác</b> ngay. App hiểu cả lợn/heo, rán/chiên, lạc/đậu phộng.", "images": SH(("ghi-bua", "Ghi bữa"), ("tinh-calo", "Tính calo cả bữa"))},
 {"type": "lp_step", "title": "Chụp ảnh món ăn", "text": "Bấm Chụp món, chạm khung để chụp hoặc chọn ảnh có sẵn. AI nhận từng món kèm đơn vị (1 bát, 2 quả…), bạn chỉnh lại rồi ghi. Mỗi lần dùng 1 lượt AI chụp ảnh.", "images": SH(("chup-mon", "Chụp món"))},
 {"type": "lp_step", "title": "Đánh dấu Đã ăn, sửa bữa", "text": "Ăn xong chạm vòng tròn để đánh dấu Đã ăn, số kcal còn lại chỉ trừ bữa đã ăn. Mở bữa để sửa gram, xoá, thêm món, hoặc chuyển sang ngày khác bằng menu ⋯.", "images": SH(("sua-bua", "Sửa bữa"))},
 {"type": "lp_step", "title": "Thực đơn", "text": "AI lên thực đơn cả ngày hoặc các bữa còn lại, theo kiểu ăn và món bạn không ăn. Áp dụng hôm nay, hoặc Lặp lại hằng tuần để app tự áp mỗi sáng. Bản giảm cân: thực đơn tự lên mỗi sáng, không tốn lượt AI.", "images": SH(("thuc-don", "Thực đơn"), ("thuc-don-ai", "AI lên thực đơn"))},
 {"type": "lp_step", "title": "Uống nước, vận động", "text": "Chạm cốc trống để cộng nước, chạm cốc xanh để bỏ. Đi bộ, chạy, đá bóng thì ghi ở Vận động thêm. Tăng cơ hay giữ cân thì app cộng calo để ăn bù.", "images": SH(("van-dong", "Vận động thêm"))},
 {"type": "lp_step", "title": "Cân nặng và số đo", "text": "Cân mỗi sáng sau khi ngủ dậy. Tab Số đo lưu 6 vòng. Mỗi tuần app xem tốc độ thay đổi rồi gợi ý chỉnh calo thêm hoặc bớt 100 kcal.", "images": SH(("can-nang", "Tiến độ cân nặng"), ("so-do", "Số đo"))},
 {"type": "lp_step", "title": "Tổng kết tháng", "text": "Ngày 1 hằng tháng có tổng kết tháng trước: số kg đã giảm, số ngày đúng calo, chuỗi ngày, kèm ảnh khoe thành tích (ẩn được số cân).", "images": SH(("tong-ket", "Tổng kết tháng"))},
 {"type": "lp_step", "title": "Nhắc nhở", "text": "Nhắc bữa (chỉ khi bữa chưa ghi), nhắc uống nước 10:30 · 13:30 · 16:30, nhắc cân và đo sáng thứ Hai. Cho phép thông báo khi điện thoại hỏi, đổi giờ ở Tôi › Nhắc nhở.", "images": SH(("nhac-nho", "Nhắc nhở"))},
 {"type": "lp_step", "title": "Nuôi Pi", "text": "Ăn đúng bữa, uống đủ nước thì Pi nhận Hạt để mua đồ, lên cấp và nói chuyện với bạn mỗi ngày.", "btn_label": "Tìm hiểu về Pi ›", "btn_url": "/pi", "images": SH(("pi-the", "Thẻ Pi ở màn Hôm nay"), ("pi-man", "Phòng của Pi"))},
 {"type": "lp_head", "eye": "Hỏi đáp", "title": "Câu hỏi thường gặp", "anchor": "hoi-dap"},
 {"type": "faq", "title": "", "items": [{"q": q, "a": a} for q, a in [("App có mất phí không?", "Mọi tính năng chính dùng miễn phí: ghi bữa, tính calo, thực đơn tự lên, tiến độ, nhắc nhở, Pi. Premium chỉ thêm lượt AI."), ("Ghi bù bữa ngày hôm qua được không?", "Được, chọn ngày khi ghi bữa (7 ngày gần nhất) hoặc vào Tiến độ › Nhật ký."), ("Dùng trên máy tính được không?", "Được, mở app.fipilotai.com, app hiện giữa màn hình kèm mã QR mở nhanh trên điện thoại."), ("Số calo lấy từ đâu?", "Từ Bảng thành phần thực phẩm Việt Nam của Viện Dinh dưỡng, món không có thì đối chiếu USDA.")]]},
]
print(json.dumps({
 "pi": {"title": "Pi – bạn đồng hành ăn đúng trong app Fipilot AI", "blocks": PI, "seo": {"title": "Pi: chú mầm nhỏ nuôi bằng việc ăn đúng | Fipilot AI", "desc": "Pi là bạn đồng hành trong app Fipilot AI: ăn đúng bữa, uống đủ nước, cân đều là Pi nhận Hạt để mua đồ, lên cấp. Miễn phí cho mọi tài khoản."}},
 "huong-dan": {"title": "Hướng dẫn sử dụng app Fipilot AI", "blocks": G, "seo": {"title": "Hướng dẫn dùng app Fipilot AI trong 5 phút (có ảnh)", "desc": "12 bước dùng Fipilot AI: cài app, tính calo, ghi bữa 3 cách, chụp món, thực đơn, nước, cân nặng, tổng kết tháng, nhắc nhở và nuôi Pi."}},
}, ensure_ascii=False))
