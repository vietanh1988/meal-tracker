// Khối nội dung của bài (trình soạn Quản trị › Soạn bài ghi blocks JSON).
// p · h · list · quote · tip · img · gallery · youtube · video · table · calo · calo_table · faq · app · button · hr · toc · html · ref
import { slugify } from "./slug.js";
import { textOf } from "./sanitize.js";
import { getBlocksById } from "./content.js";
import { getFood, mainPortion } from "./foods.js";
import { q, enc } from "./sb.js";

// Thay khối dùng lại bằng nội dung thật + gắn id cho tiêu đề (mục lục)
export async function prepare(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const refs = list.filter((b) => b?.type === "ref" && b.id).map((b) => b.id);
  const reuse = await getBlocksById([...new Set(refs)]);
  const out = [];
  for (const b of list) {
    if (b?.type === "ref") { for (const x of reuse[b.id] || []) out.push(x); continue; }
    out.push(b);
  }
  const used = new Set();
  for (const b of out) {
    if (b?.type === "h") {
      let id = b.id || slugify(textOf(b.text)) || "muc"; let k = id, n = 2;
      while (used.has(k)) k = `${id}-${n++}`;
      used.add(k); b.id = k;
    }
    if (b?.type === "calo" && b.food) {
      const fd = await getFood(b.food);
      if (fd) { const por = fd.portions.find((p) => p.name === b.portion) || mainPortion(fd); b._food = fd; b._portion = por; }
    }
    if (b?.type === "calo_table" && Array.isArray(b.foods)) {
      b._rows = [];
      for (const key of b.foods) { const fd = await getFood(key); if (fd) b._rows.push({ fd, por: mainPortion(fd) }); }
    }
  }
  // Ảnh thiếu kích thước (ảnh AI vẽ, ảnh chọn từ thư viện cũ): lấy rộng / cao ở Thư viện ảnh → giữ khung, ảnh tải chậm (lazy) không làm trang giật
  const miss = [...new Set(out.filter((b) => b?.type === "img" && b.url && !(b.width && b.height)).map((b) => b.url))].slice(0, 40);
  if (miss.length) {
    const rows = (await q(`web_media?select=url,width,height&url=in.(${miss.map((u) => enc(`"${u.replace(/"/g, "")}"`)).join(",")})`).catch(() => null)) || [];
    const dim = Object.fromEntries(rows.filter((r) => r.width && r.height).map((r) => [r.url, r]));
    for (const b of out) if (b?.type === "img" && !(b.width && b.height) && dim[b.url]) { b.width = dim[b.url].width; b.height = dim[b.url].height; }
  }
  return out;
}

export const toc = (blocks) => blocks.filter((b) => b?.type === "h" && (b.level || 2) <= 3).map((b) => ({ id: b.id, text: textOf(b.text), level: b.level || 2 }));
export const faqs = (blocks) => blocks.filter((b) => b?.type === "faq").flatMap((b) => b.items || []).filter((x) => x?.q && x?.a);
export function wordCount(blocks) {
  return blocks.reduce((n, b) => n + textOf([b.text, b.html, ...(b.items || []).map((x) => (typeof x === "string" ? x : `${x.q} ${x.a}`))].join(" ")).split(" ").filter(Boolean).length, 0);
}
