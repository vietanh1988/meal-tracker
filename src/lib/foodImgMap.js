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
