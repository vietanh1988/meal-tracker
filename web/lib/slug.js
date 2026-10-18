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
