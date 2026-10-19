// Bỏ dấu tiếng Việt → đường dẫn: "Phở bò" → "pho-bo"
export function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
// Tên riêng trong tên món: "bún bò huế" → "Bún bò Huế"
const PROPER = [["huế", "Huế"], ["hà nội", "Hà Nội"], ["sài gòn", "Sài Gòn"], ["nam vang", "Nam Vang"], ["hải phòng", "Hải Phòng"], ["quảng", "Quảng"], ["thái", "Thái"], ["hàn quốc", "Hàn Quốc"], ["nhật", "Nhật"]];
export const cap = (s) => {
  if (!s) return s;
  let t = s.charAt(0).toUpperCase() + s.slice(1);
  for (const [a, b] of PROPER) t = t.replace(new RegExp(`(^|\\s)${a}(?=\\s|$)`, "gi"), (m, sp) => sp + b);
  return t;
};
export const vnInt = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
export const vnDec = (n, d = 1) => String(Math.round((Number(n) || 0) * 10 ** d) / 10 ** d).replace(".", ",");
// Đường dẫn trang calo không trùng: "phở bò" và "pho bo" cùng ra pho-bo → tên có dấu giữ pho-bo, tên kia thành pho-bo-2 (thứ tự theo kho món)
export function foodSlugs(keys) {
  const by = {};
  keys.forEach((k, i) => (by[slugify(k)] ||= []).push([k, i]));
  const out = {};
  for (const [s, ks] of Object.entries(by)) ks.sort((a, b) => (/[^\x00-\x7f]/.test(b[0]) - /[^\x00-\x7f]/.test(a[0])) || a[1] - b[1]).forEach(([k], n) => { out[k] = n ? `${s}-${n + 1}` : s; });
  return out;
}
