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
