// 14/11 (Vercel free sắp hết CPU): trang danh sách đọc ?trang= / ?nhom= nên Next dựng lại mỗi lượt mở → chuyển thầm sang
// đường dẫn riêng có lưu đệm (app/bai-viet/trang/[n], app/chu-de/[slug]/trang/[n], app/bang-calo/xem/[g]/[n]). URL khách thấy giữ nguyên.
// Có ?q= (tìm trong Bảng calo) hoặc số trang / nhóm lạ → để trang gốc xử lý như cũ.
export function listRewrite(path, sp) {
  if (sp.has("q")) return null;
  const n = sp.get("trang") ?? "1";
  if (!/^[1-9]\d{0,3}$/.test(n)) return null;
  if (path === "/bai-viet") return `/bai-viet/trang/${n}`;
  if (path === "/bang-calo") {
    const g = sp.get("nhom") || "_";
    return /^[a-z0-9_-]{1,40}$/.test(g) ? `/bang-calo/xem/${g}/${n}` : null;
  }
  const m = /^\/chu-de\/([a-z0-9-]{1,80})$/.exec(path);
  return m ? `/chu-de/${m[1]}/trang/${n}` : null;
}
