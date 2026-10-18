// Dữ liệu dùng chung với app (bảng app_settings, khách đọc được): anh sửa 1 chỗ trong app là web đổi theo.
//  - about_page: tên/vai trò/giới thiệu/ảnh của anh, email, hotline, Zalo, Facebook
//  - terms_content: các trang Điều khoản / Chính sách (soạn ở Quản trị app › Điều khoản)
import { q } from "./sb.js";
import { slugify } from "./slug.js";

async function setting(key) {
  const r = await q(`app_settings?key=eq.${key}&select=value`, { revalidate: 300 });
  try { const v = r?.[0]?.value; return typeof v === "string" ? JSON.parse(v) : v || null; } catch { return null; }
}
export const fmtPhone = (p) => { const d = String(p || "").replace(/\D/g, ""); return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : String(p || "").trim(); };

export async function aboutApp() { return (await setting("about_page")) || {}; }

// Tác giả lấy từ trang Giới thiệu của app (khi chưa tạo tác giả riêng cho web)
export async function appAuthor() {
  const a = await aboutApp();
  if (!a.devName) return null;
  return { id: null, name: a.devName, slug: slugify(a.devName), job_title: a.devRole || null, bio: a.devBio || null, avatar_url: a.devAvatar || null, same_as: [a.facebook].filter(Boolean), show_box: true };
}

// Đường dẫn chuẩn cho các trang điều khoản (khớp link chân trang); trang khác lấy theo tên trang
const CANON = [["dieu-khoan", (p) => p.id === "tos"], ["chinh-sach-rieng-tu", (p) => /riêng tư/i.test(p.label)], ["chinh-sach-bao-mat", (p) => p.id === "privacy"]];
export async function legalPages() {
  const v = await setting("terms_content");
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
// "12/07/2026" → ISO để hiển thị / sitemap
export const vnDateIso = (d) => { const m = String(d || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00+07:00` : null; };
