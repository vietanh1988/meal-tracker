// 06/11 (chủ dự án chốt "Cụm chủ đề SEO" + bản vẽ 4 phần): 6 cụm = 6 chuyên mục. Mỗi cụm có 1 bài trụ (★), bộ công cụ dữ liệu app
// và nhóm bài theo ý định tìm kiếm. Bài trong chuyên mục mà chưa gán nhóm → nhóm "Bài khác" (bài mới viết tự vào đây).
// Đổi tên hiển thị của cụm: sửa tên chuyên mục trong Quản trị (web_terms.name); file này chỉ giữ bài trụ, công cụ, nhóm.
export const CLUSTERS = {
  "giam-can": {
    star: "tham-hut-calo-la-gi",
    lead: "Giảm cân bắt đầu từ calo: cơ thể cần bao nhiêu, ăn thiếu bao nhiêu là vừa, giảm bao nhiêu kg mỗi tuần là an toàn.",
    tools: ["tinh-calo", "bang-calo", "app"],
    groups: [
      ["Hiểu calo", ["cach-tinh-calo-giam-can", "calo-la-gi", "bmr-la-gi", "tdee-la-gi", "hieu-ung-nhiet-cua-thuc-an-tef", "neat-la-gi", "1kg-mo-bao-nhieu-calo"]],
      ["Giảm bao nhiêu là vừa", ["giam-can-an-toan-moi-tuan-bao-nhieu-kg", "can-nang-chuan-theo-chieu-cao", "cach-giam-can-trong-1-thang"]],
      ["Khi không giảm được", ["an-it-ma-khong-giam-can", "giam-can-bi-chung"]],
      ["Theo người giảm", ["giam-can-cho-nu", "giam-can-cho-nam-gioi", "giam-can-tuoi-40", "giam-can-sau-sinh", "giam-can-cho-dan-van-phong"]],
    ],
  },
  "co-beo-khong": {
    star: "an-pho-co-beo-khong",
    lead: "Món quen ăn hằng ngày có béo không, ăn bao nhiêu thì vẫn giảm cân. Số calo từng món lấy từ bảng calo của app.",
    tools: ["bang-calo", "tinh-calo", "app"],
    groups: [
      ["Bún, phở, cơm, xôi, bánh", ["an-bun-co-beo-khong", "an-xoi-co-beo-khong", "banh-mi-bao-nhieu-calo", "com-tam-bao-nhieu-calo", "an-mi-tom-co-beo-khong", "an-com-van-giam-can"]],
      ["Trứng, đậu, khoai, trái cây, hạt", ["an-trung-moi-ngay-co-tot-khong", "dau-phu-giam-can", "khoai-lang-giam-can", "yen-mach-giam-can", "an-chuoi-co-giam-can-khong", "trai-cay-it-calo", "an-hat-co-beo-khong"]],
      ["Đồ uống và đồ ngọt", ["uong-tra-sua-co-beo-khong", "uong-bia-co-beo-khong", "uong-ca-phe-co-giam-can-khong", "uong-sua-co-beo-khong", "an-duong-co-beo-khong", "calo-rong-la-gi"]],
      ["Ăn ngoài", ["giam-can-khi-an-ngoai-hang-quan"]],
    ],
  },
  "thuc-don": {
    star: "thuc-don-giam-can-7-ngay",
    lead: "Thực đơn món Việt theo mức calo, theo bữa và theo người ăn. Bắt đầu từ thực đơn 7 ngày, rồi chọn kiểu hợp với bạn.",
    tools: ["tinh-calo", "bang-calo", "app"],
    groups: [
      ["Theo số ngày, số calo", ["thuc-don-giam-can-3-ngay", "thuc-don-giam-can-30-ngay", "thuc-don-giam-can-1200-calo", "thuc-don-giam-can-1500-calo", "thuc-don-giam-can-1800-calo-cho-nam"]],
      ["Theo bữa", ["bua-sang-giam-can", "bua-toi-giam-can-nen-an-gi", "an-vat-giam-can-nen-an-gi", "com-hop-van-phong-giam-can", "mon-canh-giam-can", "salad-giam-can-kieu-viet"]],
      ["Theo kiểu ăn, món chính", ["thuc-don-eat-clean-mon-viet", "thuc-don-low-carb-mon-viet", "thuc-don-keto-mon-viet", "thuc-don-giam-can-voi-uc-ga", "thuc-don-giam-can-voi-trung", "thuc-don-giam-can-voi-gao-lut", "thuc-don-giam-mo-bung"]],
      ["Theo người ăn", ["thuc-don-giam-can-cho-nguoi-an-chay", "thuc-don-giam-can-cho-sinh-vien-gia-re", "thuc-don-giam-can-cho-nguoi-luoi-nau", "thuc-don-giam-can-cho-nguoi-tren-40-tuoi", "thuc-don-giam-can-sau-sinh-cho-me-cho-con-bu", "thuc-don-tang-co-giam-mo", "thuc-don-tang-can-cho-nguoi-gay", "thuc-don-giu-can-sau-khi-giam"]],
    ],
  },
  "kien-thuc": {
    star: "macro-la-gi",
    lead: "Đạm, tinh bột, chất béo, chất xơ trong bữa ăn Việt: cần bao nhiêu mỗi ngày và chọn món thế nào cho đủ.",
    tools: ["bang-calo", "tinh-calo", "app"],
    groups: [
      ["Đạm", ["protein-la-gi-can-bao-nhieu-moi-ngay", "an-nhieu-dam-co-hai-khong", "dam-thuc-vat-va-dam-dong-vat"]],
      ["Tinh bột và đường huyết", ["tinh-bot-tot-va-tinh-bot-xau", "tinh-bot-khang-la-gi", "chi-so-duong-huyet-gi-la-gi", "insulin-va-tich-mo"]],
      ["Chất béo", ["chat-beo-tot-la-gi", "chat-beo-trans-la-gi", "omega-3-la-gi"]],
      ["Xơ, rau, nước, muối", ["chat-xo-la-gi-an-bao-nhieu-moi-ngay", "moi-ngay-nen-an-bao-nhieu-rau", "moi-ngay-nen-uong-bao-nhieu-nuoc", "chat-dien-giai-la-gi", "an-man-co-tang-can-khong"]],
      ["Cách ăn chung", ["cach-doc-nhan-dinh-duong", "che-do-an-dia-trung-hai"]],
    ],
  },
  "tap-luyen": {
    star: "cardio-hay-tap-ta-de-giam-mo",
    lead: "Tập để giảm mỡ, giảm cân: cardio hay tạ, đi bộ bao nhiêu, giảm mỡ từng vùng có được không. Động tác xem ở thư viện bài tập.",
    tools: ["bai-tap", "giao-an", "app"],
    groups: [
      ["Đi bộ và cardio", ["di-bo-bao-nhieu-buoc-de-giam-can", "giam-can-bang-di-bo"]],
      ["Giảm mỡ từng vùng", ["cach-giam-mo-bung", "giam-mo-bap-tay", "giam-mo-dui"]],
      ["Tập tại nhà", ["giam-can-tai-nha-khong-can-gym"]],
      ["Thực phẩm bổ sung", ["whey-protein-la-gi", "creatine-la-gi"]],
    ],
  },
  "thoi-quen": {
    star: "giam-can-xong-bi-tang-lai",
    lead: "Giờ ăn, giấc ngủ, dịp lễ Tết và cách giữ cân sau khi giảm: những thói quen nhỏ quyết định cân nặng lâu dài.",
    tools: ["pi", "tinh-calo", "app"],
    groups: [
      ["Giờ ăn", ["co-nen-bo-bua-sang-de-giam-can", "an-toi-muon-co-beo-khong", "nhin-an-gian-doan-16-8"]],
      ["Giữ cân lâu dài", ["giam-can-khong-can-nhin-an"]],
      ["Sinh hoạt và dịp lễ", ["ngu-it-co-beo-khong", "an-tet-khong-tang-can"]],
    ],
  },
};
export const CLUSTER_ORDER = ["giam-can", "co-beo-khong", "thuc-don", "kien-thuc", "tap-luyen", "thoi-quen"];
// Công cụ dữ liệu app trên trang cụm (bản vẽ: hàng "Dữ liệu app")
export const TOOLS = {
  "tinh-calo": { url: "/tinh-calo", icon: "scale", t: "Tính calo cần ăn", x: "Biết mức calo của bạn trước khi chọn món, chọn thực đơn" },
  "bang-calo": { url: "/bang-calo", icon: "table", t: "Bảng calo món Việt", x: "%n món có calo, đạm, tinh bột, béo theo khẩu phần" },
  "bai-tap": { url: "/bai-tap", icon: "book", t: "Thư viện bài tập", x: "%e bài tập có ảnh động tác, xem theo nhóm cơ" },
  "giao-an": { url: "/bai-tap/giao-an/toan-than", icon: "grid", t: "Giáo án mẫu", x: "4 giáo án 2–6 buổi mỗi tuần, ở phòng gym hoặc tại nhà" },
  pi: { url: "/pi", icon: "star", t: "Pi nhắc thói quen", x: "Pi nhắc giờ ăn, uống nước, tập — chăm Pi là giữ thói quen" },
  app: { url: null, icon: "phone", t: "Để app lên thực đơn", x: "Tự đổi món, giữ đúng calo mỗi ngày" },
};
/** Chia bài của cụm theo nhóm: [{ name, posts }], bài chưa gán vào "Bài khác"; bỏ bài trụ khỏi nhóm */
export function groupPosts(cfg, posts = []) {
  if (!cfg) return [];
  const by = Object.fromEntries(posts.map((p) => [p.slug, p]));
  const used = new Set(cfg.star ? [cfg.star] : []);
  const out = cfg.groups.map(([name, slugs]) => ({ name, posts: slugs.filter((s) => by[s] && !used.has(s)).map((s) => (used.add(s), by[s])) })).filter((g) => g.posts.length);
  const rest = posts.filter((p) => !used.has(p.slug));
  if (rest.length) out.push({ name: "Bài khác", posts: rest });
  return out;
}
/** Bài trụ của cụm mà bài này thuộc (null nếu chính nó là bài trụ hoặc cụm không có) */
export const starOf = (catSlug, selfSlug) => { const s = CLUSTERS[catSlug]?.star; return s && s !== selfSlug ? s : null; };
