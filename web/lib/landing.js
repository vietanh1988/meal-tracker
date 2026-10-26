// 26/10: trang giới thiệu kiểu landing (mẫu trang "landing": trang /pi, /huong-dan) — hàm thuần, có test
export const LP_TYPES = ["lp_hero", "lp_head", "lp_cards", "lp_feature", "lp_tiles", "lp_step"];
export const isLp = (b) => LP_TYPES.includes(b?.type);

// Tiêu đề: "*chữ*" = chữ xanh, "|" = xuống dòng → [{ t, em }] theo từng dòng
export function emLines(s) {
  return String(s || "").split("|").map((line) => line.split("*").map((t, k) => ({ t, em: k % 2 === 1 })).filter((x) => x.t));
}

// Bước của trang hướng dẫn: số thứ tự + mã neo (#buoc-1) + tên ngắn cho hàng nút (phần trước dấu ":")
export function steps(blocks) {
  let n = 0;
  return (blocks || []).filter((b) => b?.type === "lp_step").map((b) => { n++; return { n, id: `buoc-${n}`, short: String(b.short || b.title || "").split(":")[0].trim() }; });
}

// Danh sách con bỏ dòng trống (khi soạn hay để thừa 1 dòng)
export const rows = (a, key = "title") => (Array.isArray(a) ? a : []).filter((x) => (typeof x === "string" ? x.trim() : String(x?.[key] || x?.img || x?.url || "").trim()));
