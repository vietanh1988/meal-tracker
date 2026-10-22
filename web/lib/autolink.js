// 23/10: tự gắn link nội bộ lúc hiện bài (server, có trong HTML trả về): cụm chữ trùng từ khoá chính của bài khác đang hiện
// (hoặc trang cố định: bảng calo, máy tính calo) mà chưa có link → bọc <a>. Bài đích mới đăng / tới giờ hẹn là bài cũ tự có link
// (web làm mới mỗi phút), không phải chạy lại AI. Không gắn trong đoạn mở bài, tiêu đề, bảng; mỗi đoạn tối đa 2 link mới,
// mỗi trang đích 1 lần, cả bài tối đa MAX link mới; trang đích bài đã link sẵn thì bỏ qua.
import { q } from "./sb.js";

const MAX = 8;
const STATIC = [["bảng calo món việt", "/bang-calo"], ["bảng calo", "/bang-calo"], ["máy tính calo", "/tinh-calo"], ["công cụ tính calo", "/tinh-calo"]];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

export async function linkTargets() {
  const rows = (await q("web_posts?kind=eq.post&status=in.(published,scheduled)&select=slug,kw:seo->>keyword&limit=3000")) || [];
  const out = [];
  for (const r of rows) {
    const kw = String(r.kw || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!kw || words(kw) < 2 || kw.length < 8) continue;
    out.push([kw, `/${r.slug}`]);
    const short = kw.replace(/\s+là gì$/, "").trim(); // "thâm hụt calo là gì" → cả "thâm hụt calo"
    if (short !== kw && words(short) >= 2 && short.length >= 8) out.push([short, `/${r.slug}`]);
  }
  out.push(...STATIC);
  // cụm dài trước (khớp "thực đơn giảm cân 7 ngày" trước "thực đơn giảm cân")
  return out.sort((a, b) => b[0].length - a[0].length).map(([k, href]) => ({ href, re: new RegExp(`(^|[^\\p{L}\\p{N}])(${esc(k)})(?=$|[^\\p{L}\\p{N}])`, "iu") }));
}

const LINKABLE = new Set(["p", "list", "tip", "quote"]);
// Gắn vào 1 đoạn HTML: chỉ sửa phần chữ nằm ngoài <a>…</a> và ngoài thẻ
function linkHtml(html, t) {
  const parts = String(html || "").split(/(<a\b[\s\S]*?<\/a>|<[^>]*>)/i);
  for (let i = 0; i < parts.length; i += 2) {
    const m = parts[i].match(t.re);
    if (!m) continue;
    const at = m.index + m[1].length;
    parts[i] = parts[i].slice(0, at) + `<a href="${t.href}">${m[2]}</a>` + parts[i].slice(at + m[2].length);
    return parts.join("");
  }
  return null;
}

export function autoLink(blocks, targets, self) {
  const all = JSON.stringify(blocks);
  const done = new Set([self, ...[...all.matchAll(/href=\\?"(\/[^"\\#?]*)/g)].map((m) => m[1].replace(/\/$/, "") || "/")]);
  let n = 0, firstP = true;
  return blocks.map((b) => {
    if (!b || !LINKABLE.has(b.type) || n >= MAX) return b;
    if (b.type === "p" && firstP) { firstP = false; return b; } // đoạn mở bài giữ nguyên
    const tryOne = (html) => {
      for (const t of targets) {
        if (done.has(t.href)) continue;
        const out = linkHtml(html, t);
        if (out) { done.add(t.href); n++; return out; }
      }
      return null;
    };
    if (b.type === "list") {
      let hit = false;
      const items = (b.items || []).map((x) => { if (hit || typeof x !== "string" || n >= MAX) return x; const o = tryOne(x); if (o) { hit = true; return o; } return x; });
      return hit ? { ...b, items } : b;
    }
    let h = b.html, hit = false;
    for (let k = 0; k < 2 && n < MAX; k++) { const o = tryOne(h); if (!o) break; h = o; hit = true; }
    return hit ? { ...b, html: h } : b;
  });
}
