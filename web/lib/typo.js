// Sửa chữ khi hiện bài (21/10, áp cho mọi bài cũ và mới, không đụng dữ liệu gốc):
// 1) chữ dính số do AI / bước sửa ghép thiếu dấu cách ("tối thiểu1.800" → "tối thiểu 1.800"): chỉ khi cụm chữ có dấu tiếng Việt
//    (không đụng "21h30", "mp3", "B12"…);
// 2) số + đơn vị không bị tách xuống 2 dòng trên điện thoại ("60 g", "1.800 kcal", "30 phút"): thay dấu cách bằng dấu cách không ngắt.
const UNIT = "(?:g|kg|mg|ml|l|lít|kcal|calo|cm|mm|%|phút|giờ|ngày|tuần|tháng|bước|lần|quả|tô|bát|chén|ly|cốc|lát|muỗng|thìa)";
const GLUE = /([\p{L}]*[^\x00-\x7F\d\s][\p{L}]*)(\d)/gu;
const NBSP = new RegExp(`(\\d)[ \\u00a0]+(${UNIT})(?=$|[^\\p{L}\\p{N}])`, "gu");
export function tidyText(t) {
  return String(t ?? "").replace(GLUE, (m, w, d) => (/\p{L}$/u.test(w) ? `${w} ${d}` : m)).replace(NBSP, "$1 $2");
}
// chỉ sửa phần chữ, không đụng thẻ HTML / thuộc tính (href, src…)
export function tidy(html) {
  return String(html ?? "").split(/(<[^>]*>)/).map((p, i) => (i % 2 ? p : tidyText(p))).join("");
}
