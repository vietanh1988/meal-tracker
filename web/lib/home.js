// Trang chủ: chữ mặc định của banner + các khối (Quản trị › Trang › Sửa trang tại chỗ ghi đè ở web_settings.page_home)
export const HOME_HERO = {
  badge: "Miễn phí %trial% ngày · không cần thẻ", // %trial% = số ngày dùng thử trong app
  title: "Giảm cân bằng\n*món Việt* quen thuộc", // *chữ* = tô xanh
  sub: "Phở, bún, cơm tấm vẫn ăn được. App tự lên thực đơn đúng calo mỗi ngày — bạn chỉ việc ăn theo và bấm “Đã ăn”.",
  btn1: "Dùng thử miễn phí", btn1_url: "",
  btn2: "Xem cách hoạt động", btn2_url: "#cach-hoat-dong",
  note: "Không cần cài từ kho ứng dụng · Chạy trên mọi điện thoại",
  img1: "", img1_alt: "Màn Hôm nay của app Fipilot AI: calo còn lại trong ngày",
  bg: "", bg_m: "", // ảnh nền banner (trống = ảnh mặc định public/img/home/hero-bg.webp)
  img2: "", img2_alt: "Màn thực đơn trong ngày của app Fipilot AI",
};
export const HOME_SECTIONS = ["calc", "steps", "feats", "pricing", "posts"];
export const HOME_SECTION_NAME = { calc: "Tính thử", steps: "3 bước", feats: "3 tính năng", pricing: "Bảng giá + Hỏi đáp", posts: "Bài viết mới" };
// Hỏi đáp trang chủ (Quản trị › Trang › Sửa trang chủ tại chỗ › Hỏi đáp ghi đè ở page_home.faq)
export const HOME_FAQ = [{ q: "Ăn phở, bún có giảm cân được không?", a: "Được. Quan trọng là tổng calo cả ngày — app tính sẵn khẩu phần để bạn vẫn ăn món quen." }, { q: "Có phải cài app từ CH Play / App Store không?", a: "Không cần. Mở app.fipilotai.com trên điện thoại rồi bấm “Thêm vào màn hình chính” là dùng như app." }, { q: "Tôi không tập gym thì sao?", a: "Vẫn dùng được. App tính calo theo mức vận động bạn chọn, kể cả ít vận động." }, { q: "App có miễn phí không?", a: "Có gói Miễn phí với thực đơn tự lên mỗi ngày. Premium thêm nhiều lượt AI (chụp ảnh tính calo, hỏi AI), dùng thử %trial% ngày." }];

// Chữ các khối dưới banner (Quản trị › Trang › Sửa trang chủ › ✎ cạnh từng khối) — ghi đè ở page_home.text. [khoá, nhãn trong quản trị, chữ mặc định]
export const HOME_TEXT_FIELDS = {
  calc: [["calc_eye", "Dòng nhỏ trên tiêu đề", "Tính thử trong 10 giây"], ["calc_title", "Tiêu đề", "Bạn cần ăn bao nhiêu để giảm cân?"]],
  steps: [["steps_eye", "Dòng nhỏ trên tiêu đề", "Cách hoạt động"], ["steps_title", "Tiêu đề", "3 bước, không phải tự tính"], ["steps_sub", "Dòng phụ", "Bạn chỉ nhập số đo một lần — phần còn lại app lo."],
    ["step1_t", "Bước 1 · tên", "Nhập cân nặng, chiều cao"], ["step1_x", "Bước 1 · mô tả", "30 giây là xong."],
    ["step2_t", "Bước 2 · tên", "App tự lên thực đơn mỗi ngày"], ["step2_x", "Bước 2 · mô tả", "Món Việt, đúng calo, đổi món 1 chạm."],
    ["step3_t", "Bước 3 · tên", "Ăn theo, bấm “Đã ăn”"], ["step3_x", "Bước 3 · mô tả", "App nhắc đúng giờ, tự chỉnh calo theo cân mỗi tuần."]],
  feats: [["feats_eye", "Dòng nhỏ trên tiêu đề", "Tính năng"], ["feats_title", "Tiêu đề", "3 tính năng giúp bạn giảm cân dễ hơn"],
    ["feat1_t", "Thẻ 1 · tên", "Thực đơn tự lên mỗi ngày"], ["feat1_x", "Thẻ 1 · mô tả", "Sáng phở, trưa cơm gà, tối bún chả — đúng calo cho bạn."],
    ["feat2_t", "Thẻ 2 · tên", "Không thích món nào? Đổi 1 chạm"], ["feat2_x", "Thẻ 2 · mô tả", "Gợi ý món giữ bữa gần bằng calo."], ["feat2_tip", "Thẻ 2 · dòng nhắc", "Bấm Đổi ở món bất kỳ → app gợi ý món khác giữ bữa gần bằng calo"],
    ["feat3_t", "Thẻ 3 · tên", "Thấy rõ kết quả mỗi tháng"], ["feat3_x", "Thẻ 3 · mô tả", "Kg đã giảm, ngày ghi bữa, so tháng trước."]],
  pricing: [["price_eye", "Bảng giá · dòng nhỏ", "Bảng giá"], ["price_title", "Bảng giá · tiêu đề", "Dùng thử %trial% ngày"], ["faq_eye", "Hỏi đáp · dòng nhỏ", "Hỏi đáp"], ["faq_title", "Hỏi đáp · tiêu đề", "Câu hỏi thường gặp"]],
  posts: [["posts_eye", "Dòng nhỏ trên tiêu đề", "Blog"], ["posts_title", "Tiêu đề", "Bài viết mới"], ["posts_all", "Chữ link xem hết", "Xem tất cả →"]],
};
export const HOME_TEXT = Object.fromEntries(Object.values(HOME_TEXT_FIELDS).flat().map(([k, , d]) => [k, d]));
