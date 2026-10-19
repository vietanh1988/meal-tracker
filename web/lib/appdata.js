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

import { legalList, legalToBlocks } from "./legal.js";
export { legalToBlocks };
export async function legalPages() { return legalList(await setting("terms_content")); }

// "12/07/2026" → ISO để hiển thị / sitemap
export const vnDateIso = (d) => { const m = String(d || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00+07:00` : null; };
