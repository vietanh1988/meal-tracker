// Danh mục khối của trình soạn (menu "/" bản vẽ 138b, 4 nhóm) + khối trống mặc định.
export const BLOCK_GROUPS = [
  ["VĂN BẢN", [["p", "¶", "Đoạn văn", "doan van"], ["h2", "H", "Tiêu đề H2", "tieu de h2 heading"], ["h3", "H", "Tiêu đề H3", "tieu de h3"], ["h4", "H", "Tiêu đề H4", "tieu de h4"], ["list", "⋮≡", "Danh sách chấm", "danh sach cham list"], ["olist", "1≡", "Danh sách số", "danh sach so"], ["quote", "❝", "Trích dẫn", "trich dan quote"], ["tip", "💡", "Hộp mẹo / lưu ý", "hop meo luu y tip"], ["html", "</>", "Đoạn HTML", "doan html code"]]],
  ["ẢNH & VIDEO", [["img", "🖼", "Ảnh · tự nén WebP", "anh hinh image"], ["gallery", "▤", "Bộ ảnh (gallery)", "bo anh gallery"], ["youtube", "▶", "Video YouTube", "video youtube"]]],
  ["BỐ CỤC", [["cols", "▥", "Chia 2–3 cột", "chia cot columns"], ["button", "⬭", "Nút bấm", "nut bam button"], ["hr", "—", "Đường kẻ / khoảng trống", "duong ke khoang trong"], ["toc", "☷", "Mục lục tự động", "muc luc toc"]]],
  ["RIÊNG FIPILOT", [["calo", "🍜", "Khối calo 1 món", "khoi calo mon"], ["calo_table", "▦", "Bảng calo nhiều món", "bang calo nhieu mon"], ["faq", "?", "Hỏi đáp (tự sinh schema FAQ)", "hoi dap faq"], ["app", "📱", "Hộp mời mở app", "hop moi mo app"], ["table", "≣", "Bảng so sánh", "bang so sanh table"]]],
];
export const BLOCK_NAME = { p: "Đoạn văn", h: "Tiêu đề", list: "Danh sách", quote: "Trích dẫn", tip: "Hộp mẹo", html: "HTML", img: "Ảnh", gallery: "Bộ ảnh", youtube: "Video", cols: "Cột", button: "Nút bấm", hr: "Đường kẻ", toc: "Mục lục", calo: "Calo món", calo_table: "Bảng calo", faq: "Hỏi đáp", app: "Mời mở app", table: "Bảng", ref: "Khối dùng lại" };
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
    case "cols": return { _k: k, type: "cols", cols: ["", ""] };
    case "button": return { _k: k, type: "button", label: "Dùng thử miễn phí", url: "https://app.fipilotai.com/?ref=post-button", style: "solid", align: "left" };
    case "calo": return { _k: k, type: "calo", food: "", portion: "" };
    case "calo_table": return { _k: k, type: "calo_table", foods: [] };
    case "faq": return { _k: k, type: "faq", title: "Câu hỏi thường gặp", items: [{ q: "", a: "" }] };
    case "app": return { _k: k, type: "app", title: "", text: "", button: "", url: "" };
    case "table": return { _k: k, type: "table", head: ["", ""], rows: [["", ""], ["", ""]] };
    case "hr": case "toc": return { _k: k, type: t };
    case "quote": case "tip": case "html": return { _k: k, type: t, html: "" };
    default: return { _k: k, type: "p", html: "" };
  }
}
export const isText = (b) => ["p", "h", "quote", "tip"].includes(b?.type);
export const withKeys = (blocks) => (blocks || []).map((b) => ({ ...b, _k: b._k || key() }));
// Bỏ khoá nội bộ (_k) và phần web tự tính lúc hiển thị (_food, _rows) trước khi lưu
export const forSave = (blocks) => (blocks || []).map(({ _k, _food, _portion, _rows, ...b }) => b).filter((b) => !(b.type === "p" && !String(b.html || "").replace(/<br\s*\/?>/g, "").trim()));
