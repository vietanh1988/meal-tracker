// 06/11 (bản vẽ "Cụm chủ đề", phần 2–4): nối 2 chiều bài viết ↔ trang dữ liệu.
// - Trong bài: "Calo các món nhắc trong bài" = món có trang /calo/ mà tên xuất hiện trong bài (máy tự tìm, không chọn tay).
// - Trang món / trang bài tập: bài viết có nhắc tên món / có khối Bài tập hoặc tên bài tập (hàm web_mentions trong DB).
import { textOf } from "./sanitize.js";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s) => String(s || "").toLowerCase().normalize("NFC").replace(/\s+/g, " ");
/** chữ thường của mọi khối chữ trong bài (đoạn, tiêu đề, danh sách, bảng, mẹo, hỏi đáp) */
export function postText(blocks = []) {
  const out = [];
  for (const b of blocks || []) {
    if (!b) continue;
    for (const k of ["html", "text", "caption", "title"]) if (typeof b[k] === "string") out.push(textOf(b[k]));
    for (const x of b.items || []) out.push(typeof x === "string" ? textOf(x) : `${textOf(x?.q)} ${textOf(x?.a)}`);
    for (const h of b.head || []) out.push(textOf(h));
    for (const r of b.rows || []) for (const c of r || []) out.push(textOf(c));
    if (b._food?.name) out.push(b._food.name);
  }
  return norm(out.join(" \n "));
}
/** Món có trang /calo/ được nhắc trong bài: tên dài khớp trước, tên ngắn chỉ tính khi còn xuất hiện ngoài tên dài
 * (bài nói "phở bò tái" không kéo thêm "phở bò"). foods: [{ name, slug, noindex }] · trả tối đa max món, theo lần nhắc đầu tiên. */
export function foodsInText(text, foods = [], max = 8) {
  let t = norm(text);
  const hits = [];
  for (const f of [...foods].filter((f) => f?.name && f?.slug && !f.noindex).sort((a, b) => b.name.length - a.name.length)) {
    const n = norm(f.name);
    if (n.split(" ").length < 2 && n.length < 5) continue; // tên 1 chữ ngắn ("bia") dễ khớp nhầm
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${esc(n)}(?=$|[^\\p{L}\\p{N}])`, "giu");
    let first = -1;
    t = t.replace(re, (m, pre, at) => { if (first < 0) first = at; return pre + " ".repeat(m.length - pre.length); });
    if (first >= 0) hits.push({ ...f, at: first });
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, max).map(({ at, ...f }) => f);
}
/** cụm chữ gửi web_mentions cho 1 món: tên viết thường + viết hoa chữ đầu (ilike của DB không chắc hạ chữ hoa tiếng Việt) */
export const namePats = (...names) => [...new Set(names.filter(Boolean).flatMap((n) => { const s = norm(n).trim(); return s.length >= 3 ? [s, s[0].toUpperCase() + s.slice(1)] : []; }))];
/** cụm chữ cho 1 bài tập: khối "Bài tập" trong bài ("ex": "<mã>") + tên Việt (≥ 2 chữ) */
export const exPats = (e) => (e ? [`"ex": "${e.id}"`, ...(norm(e.vi).split(" ").length >= 2 ? namePats(e.vi) : [])] : []);
