// Danh mục khối của trình soạn (menu "/" bản vẽ 138b, 4 nhóm) + khối trống mặc định.
export const BLOCK_GROUPS = [
  ["VĂN BẢN", [["p", "¶", "Đoạn văn", "doan van"], ["h2", "H", "Tiêu đề H2", "tieu de h2 heading"], ["h3", "H", "Tiêu đề H3", "tieu de h3"], ["h4", "H", "Tiêu đề H4", "tieu de h4"], ["list", "⋮≡", "Danh sách chấm", "danh sach cham list"], ["olist", "1≡", "Danh sách số", "danh sach so"], ["quote", "❝", "Trích dẫn", "trich dan quote"], ["tip", "💡", "Hộp mẹo / lưu ý", "hop meo luu y tip"], ["html", "</>", "Đoạn HTML", "doan html code"]]],
  ["ẢNH & VIDEO", [["img", "🖼", "Ảnh · tự nén WebP", "anh hinh image"], ["gallery", "▤", "Bộ ảnh (gallery)", "bo anh gallery"], ["youtube", "▶", "Video YouTube", "video youtube"], ["video", "🎬", "Video tải lên (.mp4)", "video mp4 tai len"]]],
  ["BỐ CỤC", [["cols", "▥", "Chia 2–3 cột", "chia cot columns"], ["button", "⬭", "Nút bấm", "nut bam button"], ["hr", "—", "Đường kẻ / khoảng trống", "duong ke khoang trong"], ["toc", "☷", "Mục lục tự động", "muc luc toc"]]],
  ["RIÊNG FIPILOT", [["calo", "🍜", "Khối calo 1 món", "khoi calo mon"], ["calo_table", "▦", "Bảng calo nhiều món", "bang calo nhieu mon"], ["faq", "?", "Hỏi đáp (tự sinh schema FAQ)", "hoi dap faq"], ["app", "📱", "Hộp mời mở app", "hop moi mo app"], ["table", "≣", "Bảng so sánh", "bang so sanh table"]]],
  // 26/10: chỉ hiện ở mẫu trang "Giới thiệu (landing)" — trang /pi, /huong-dan
  ["TRANG GIỚI THIỆU", [["lp_hero", "★", "Đầu trang lớn", "dau trang hero landing"], ["lp_head", "H", "Tiêu đề mục", "tieu de muc landing"], ["lp_cards", "▦", "Thẻ đánh số", "the danh so buoc landing"], ["lp_feature", "◧", "Tính năng: chữ + ảnh", "tinh nang chu anh landing"], ["lp_tiles", "▤", "Lưới ô ảnh", "luoi o anh thanh tich landing"], ["lp_step", "①", "Bước hướng dẫn", "buoc huong dan landing"]]],
];
export const BLOCK_NAME = { p: "Đoạn văn", h: "Tiêu đề", list: "Danh sách", quote: "Trích dẫn", tip: "Hộp mẹo", html: "HTML", img: "Ảnh", gallery: "Bộ ảnh", youtube: "Video", video: "Video", cols: "Cột", button: "Nút bấm", hr: "Đường kẻ", toc: "Mục lục", calo: "Calo món", calo_table: "Bảng calo", faq: "Hỏi đáp", app: "Mời mở app", table: "Bảng", ref: "Khối dùng lại", lp_hero: "Đầu trang lớn", lp_head: "Tiêu đề mục", lp_cards: "Thẻ đánh số", lp_feature: "Tính năng", lp_tiles: "Lưới ô ảnh", lp_step: "Bước hướng dẫn" };
const T = (key, label, ph) => ({ key, label, ph });
const TA = (key, label, ph) => ({ key, label, ph, kind: "ta" });
const IMGS = (key, label, max) => ({ key, label, kind: "list", item: "ảnh", max, fields: [{ key: "url", label: "Ảnh", kind: "img" }, T("alt", "Mô tả ảnh (alt)")] });
const TITLE = T("title", "Tiêu đề", "Ví dụ: Gặp *Pi*, chú mầm nhỏ|ăn đúng cùng bạn  (*chữ xanh*, | xuống dòng)");
// Trường soạn của từng khối trang giới thiệu (LpEdit.jsx) — web vẽ ở web/components/Landing.js
export const LP_FIELDS = {
  lp_hero: [T("eye", "Nhãn nhỏ trên tiêu đề", "Ví dụ: 🌱 Bạn đồng hành trong app"), TITLE, TA("sub", "Câu mô tả"), T("btn1_label", "Nút chính"), T("btn1_url", "Link nút chính", "Ví dụ: https://app.fipilotai.com/?ref=pi"), T("btn2_label", "Nút phụ"), T("btn2_url", "Link nút phụ", "Ví dụ: #video"), IMGS("images", "Ảnh bên phải (1 ảnh lớn, hoặc 2 ảnh màn hình điện thoại)", 2),
    { key: "chips", label: "Nhãn nổi trên ảnh (khi 1 ảnh)", kind: "list", item: "nhãn", max: 3, fields: [T("icon", "Biểu tượng", "Ví dụ: 🔥 — gõ coin để hiện đồng Hạt"), T("title", "Chữ đậm", "Ví dụ: +10 Hạt"), T("sub", "Chữ nhỏ", "Ví dụ: Đã ăn bữa sáng")] },
    { key: "nav", label: "Hiện hàng nút nhảy tới các Bước hướng dẫn", kind: "bool" }],
  lp_head: [T("eye", "Nhãn nhỏ", "Ví dụ: Nhận Hạt"), TITLE, T("sub", "Câu phụ"), T("anchor", "Mã neo (không bắt buộc)", "Ví dụ: hoi-dap")],
  lp_cards: [{ key: "items", label: "Thẻ", kind: "list", item: "thẻ", max: 8, fields: [T("title", "Tiêu đề thẻ"), T("text", "Mô tả"), T("badge", "Số Hạt (hiện kèm đồng Hạt)", "Ví dụ: +10 / bữa")] }, TA("note", "Dòng chú thích dưới thẻ (được in đậm <b>…</b>)")],
  lp_feature: [T("eye", "Nhãn nhỏ"), TITLE, TA("text", "Đoạn mô tả"), { key: "bullets", label: "Ý gạch đầu dòng (dấu ✓)", kind: "list", item: "ý", fields: [T("text", "Ý")] }, IMGS("images", "Ảnh", 3), { key: "phone", label: "Ảnh là màn hình điện thoại (khung hẹp 220)", kind: "bool" }, T("width", "Độ rộng ảnh % (ảnh thường)", "Ví dụ: 78"), { key: "rev", label: "Ảnh bên phải", kind: "bool" },
    { key: "tiles", label: "Hoặc lưới ô nhỏ thay cho ảnh", kind: "list", item: "ô", max: 4, fields: [{ key: "img", label: "Ảnh", kind: "img" }, T("title", "Tên"), T("sub", "Chữ nhỏ")] }],
  lp_tiles: [{ key: "items", label: "Ô", kind: "list", item: "ô", fields: [{ key: "img", label: "Ảnh", kind: "img" }, T("title", "Tên"), T("sub", "Chữ nhỏ")] }, { key: "cols", label: "Số cột", kind: "select", options: [["3", "3 cột"], ["4", "4 cột"]] }],
  lp_step: [T("title", "Tên bước", "Ví dụ: Ghi bữa ăn: 3 cách"), T("short", "Tên ngắn trên hàng nút (không bắt buộc)"), TA("text", "Mô tả"), { key: "ways", label: "Các cách / lựa chọn", kind: "list", item: "cách", fields: [T("icon", "Số / biểu tượng", "Ví dụ: 1"), T("title", "Tên"), T("text", "Mô tả")] }, TA("tip", "Hộp lưu ý vàng"), IMGS("images", "Ảnh màn hình", 2), T("btn_label", "Nút (không bắt buộc)"), T("btn_url", "Link nút")],
};
let seq = 0;
export const key = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`;
export function newBlock(t) {
  const k = key();
  switch (t) {
    case "h2": case "h3": case "h4": return { _k: k, type: "h", level: +t[1], text: "" };
    case "list": return { _k: k, type: "list", ordered: false, items: [""] };
    case "olist": return { _k: k, type: "list", ordered: true, items: [""] };
    case "img": return { _k: k, type: "img", url: "", alt: "", caption: "" };
    case "gallery": return { _k: k, type: "gallery", images: [] };
    case "youtube": return { _k: k, type: "youtube", id: "", title: "" };
    case "video": return { _k: k, type: "video", url: "", poster: "", title: "", caption: "", vertical: true };
    case "cols": return { _k: k, type: "cols", cols: ["", ""] };
    case "button": return { _k: k, type: "button", label: "Dùng thử miễn phí", url: "https://app.fipilotai.com/?ref=post-button", style: "solid", align: "left" };
    case "calo": return { _k: k, type: "calo", food: "", portion: "" };
    case "calo_table": return { _k: k, type: "calo_table", foods: [] };
    case "faq": return { _k: k, type: "faq", title: "Câu hỏi thường gặp", items: [{ q: "", a: "" }] };
    case "app": return { _k: k, type: "app", title: "", text: "", button: "", url: "" };
    case "table": return { _k: k, type: "table", head: ["", ""], rows: [["", ""], ["", ""]] };
    case "hr": case "toc": return { _k: k, type: t };
    case "lp_hero": case "lp_head": case "lp_cards": case "lp_feature": case "lp_tiles": case "lp_step": return { _k: k, type: t, title: "" };
    case "quote": case "tip": case "html": return { _k: k, type: t, html: "" };
    default: return { _k: k, type: "p", html: "" };
  }
}
export const isText = (b) => ["p", "h", "quote", "tip"].includes(b?.type);
export const withKeys = (blocks) => (blocks || []).map((b) => ({ ...b, _k: b._k || key() }));
// Bỏ khoá nội bộ (_k) và phần web tự tính lúc hiển thị (_food, _rows) trước khi lưu
export const forSave = (blocks) => (blocks || []).map(({ _k, _food, _portion, _rows, ...b }) => b).filter((b) => !(b.type === "p" && !String(b.html || "").replace(/<br\s*\/?>/g, "").trim()));
