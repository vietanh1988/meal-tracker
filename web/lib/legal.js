// Trang Điều khoản / Chính sách (app_settings.terms_content, dùng chung app + web): đường dẫn chuẩn + HTML → khối web. Hàm thuần — app quản trị cũng dùng.
import { slugify } from "./slug.js";

// Đường dẫn chuẩn cho các trang điều khoản (khớp link chân trang); trang khác lấy theo tên trang
const CANON = [["dieu-khoan", (p) => p.id === "tos"], ["chinh-sach-rieng-tu", (p) => /riêng tư/i.test(p.label)], ["chinh-sach-bao-mat", (p) => p.id === "privacy"]];
export function legalList(v) {
  const pages = (Array.isArray(v?.pages) ? v.pages : []).filter((p) => p?.label && String(p.html || "").replace(/<[^>]+>/g, "").trim());
  const used = new Set();
  return pages.map((p) => {
    let slug = (CANON.find(([s, f]) => !used.has(s) && f(p)) || [])[0] || slugify(p.label);
    used.add(slug);
    return { ...p, slug };
  });
}

// HTML trang điều khoản (Quill) → khối web: bỏ H1 (dùng làm tiêu đề), tách dòng "Cập nhật lần cuối", H1/H2/H3 trong bài → tiêu đề mục
export function legalToBlocks(html) {
  let s = String(html || "").replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g, "").replace(/<hr\s*\/?>/gi, "");
  let title = null, updated = null;
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/i, (_, t) => { title = t.replace(/<[^>]+>/g, "").trim(); return ""; });
  s = s.replace(/<p[^>]*>(?:(?!<\/p>)[\s\S])*?Cập nhật lần cuối(?:(?!<\/p>)[\s\S])*?(\d{1,2}\/\d{1,2}\/\d{4})(?:(?!<\/p>)[\s\S])*?<\/p>/i, (_, d) => { updated = d; return ""; });
  const blocks = [];
  const re = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let last = 0, m;
  const push = (chunk) => { if (chunk.replace(/<[^>]+>/g, "").trim()) blocks.push({ type: "html", html: chunk.trim() }); };
  while ((m = re.exec(s))) {
    push(s.slice(last, m.index));
    const lv = Math.max(2, Math.min(3, +m[1]));
    blocks.push({ type: "h", level: lv, text: m[2].replace(/<\/?(strong|b|em|i|u)>/gi, "").trim() });
    last = re.lastIndex;
  }
  push(s.slice(last));
  return { title, updated, blocks };
}
