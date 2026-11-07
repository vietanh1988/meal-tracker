import { canonFood } from "./foodSyn.js";
// 07/11: hàm thuần cho ảnh món (có test) — dùng ở foodImages.js.
// Ảnh gốc 800w; ô nhỏ trong app dùng bản 400w (web sinh sẵn cùng lúc).
export const thumbOf = (url) => (url ? String(url).replace(/_800w\.webp$/, "_400w.webp") : null);
export const normKey = (k) => String(k || "").trim().toLowerCase();
// dòng web_calo_pages → { food_key: image_url }; bỏ dòng chưa có ảnh.
// enabled chỉ là bật / tắt TRANG web /calo/<món>: món không có trang web (enabled=false) vẫn có ảnh trong app (07/11, phương án 3).
export function buildMap(rows) {
  const m = {};
  for (const r of rows || []) if (r && r.food_key && r.image_url) m[normKey(r.food_key)] = r.image_url;
  return m;
}

// 07/11 (chủ dự án: "món đồng nghĩa gán cùng 1 ảnh, đừng để ảnh trống quá nhiều"): món chưa có ảnh mượn ảnh của
// (1) món cùng nghĩa theo canonFood (lợn/heo, lạc/đậu phộng, chả giò/nem rán, thơm/dứa…), hoặc
// (2) món gốc là phần đầu tên khi phần sau chỉ là loại / vùng / cách gọi, không đổi hình món (chuối tiêu → chuối,
//     cơm chiên dương châu → cơm chiên, thịt kho tàu → thịt kho). Phần sau là cách nấu / nguyên liệu khác thì không mượn.
const NO_BASE = new Set(["bún"]); // "bún X" là món khác hẳn (bún mọc, bún đậu…), ảnh bún trắng sai
const NO_ALIAS = new Set(["tôm hùm", "mướp đắng", "táo đỏ khô", "cá hồi sashimi", "sữa tươi trân châu", "đu đủ xanh", "xoài xanh"]);
const COOK = /(^| )(xào|chiên|nướng|luộc|hấp|kho|rang|rán|quay|sốt|om|hầm|nấu|canh|nộm|gỏi|trộn|sấy|khô|ép|sinh tố|nước|bột|chả|viên|mắm|muối|ngâm|dầm|lắc|cuốn|xé|rim|tẩm|bỏ lò|áp chảo|nhồi|kẹp|trứng|sữa|bơ|kem|thịt|cá|tôm|gà|bò|heo|vịt)( |$)/;
const OK_REST = /^(nấu chín|chín|trắng|tươi|ta|tây|tiêu|xanh|đỏ|vàng|lớn|nhỏ|vừa|nguyên|loại \d)( |$)/;
export function withAliases(map, keys) {
  const out = { ...map };
  const imaged = Object.keys(map).sort((a, b) => b.length - a.length);
  const byCanon = new Map();
  for (const k of imaged) { const c = canonFood(k); if (!byCanon.has(c)) byCanon.set(c, k); }
  for (const raw of keys || []) {
    const k = normKey(raw);
    if (!k || out[k] || NO_ALIAS.has(k)) continue;
    let src = byCanon.get(canonFood(k));
    if (!src) {
      const b = imaged.find((x) => k.startsWith(x + " "));
      if (b && !NO_BASE.has(b)) { const rest = k.slice(b.length + 1); if (!COOK.test(rest) || OK_REST.test(rest)) src = b; }
    }
    if (src) out[k] = map[src];
  }
  return out;
}
