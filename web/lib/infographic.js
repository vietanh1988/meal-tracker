// 23/10: infographic theo màu thương hiệu, MÁY dựng từ bảng số liệu có sẵn trong bài (không cho AI vẽ chữ / số).
// Tùy bài: chỉ bảng có cột kcal và ≥ 3 dòng có số mới thành hình; bài không có bảng như vậy thì không có infographic.
// Số trên hình lấy nguyên từ ô bảng nên luôn khớp thân bài. Tối đa 2 hình / bài, đặt ngay dưới bảng.
// Ảnh PNG do /i/<slug>/<n>.png vẽ (next/og), cùng 1 hàm infoSpecs → số hình, thứ tự luôn khớp giữa trang và ảnh.

export const INFO_MAX = 2;
const MAX_ROWS = 10;

const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// "340" · "38,8" · "khoảng 153" · "~30" · "1.200" · "120 đến 180" · "450-500" → { lo, hi } ; không có số → null
export function parseNum(cell) {
  const t = strip(cell);
  if (!t || /^n\/?a$|^—$|^-$/i.test(t)) return null;
  const nums = (t.match(/\d+(?:[.,]\d+)*/g) || []).map((s) => (/^\d{1,3}(\.\d{3})+$/.test(s) ? Number(s.replace(/\./g, "")) : Number(s.replace(/\./g, "").replace(",", "."))));
  if (!nums.length || nums.some((n) => !Number.isFinite(n))) return null;
  if (nums.length >= 2 && /\d\s*(đến|tới|-|–)\s*\d/.test(t)) return { lo: Math.min(nums[0], nums[1]), hi: Math.max(nums[0], nums[1]) };
  if (nums.length > 1) return null; // ô có nhiều số không phải khoảng (vd "376 theo app + 150") → không đoán
  return { lo: nums[0], hi: nums[0] };
}
const mid = (v) => (v ? (v.lo + v.hi) / 2 : 0);
export const fmtN = (n) => { const r = Math.round(n * 10) / 10; return (Number.isInteger(r) ? String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : String(r).replace(".", ",")); };
export const fmtV = (v) => (v.lo === v.hi ? fmtN(v.lo) : `${fmtN(v.lo)}–${fmtN(v.hi)}`);

const isKcal = (h) => /kcal|calo/i.test(h) && !/mục tiêu/i.test(h);
const MEAL = /^(bữa\s*)?(sáng|trưa|chiều|tối|phụ|xế|khuya)|^bữa\b|^thứ\s*\d|^chủ nhật|^ngày\s*\d/i;

// Bảng → mô tả hình, hoặc null nếu không hợp làm infographic
export function tableSpec(b, title = "") {
  const head = (b?.head || []).map(strip);
  const rows = (b?.rows || []).map((r) => (r || []).map(strip)).filter((r) => !/^(tổng|cộng)/i.test(r[0] || "")); // dòng tổng: máy tự cộng
  if (head.length < 2 || rows.length < 3) return null;
  const kc = head.map((h, i) => (i > 0 && isKcal(h) ? i : -1)).filter((i) => i >= 0);
  if (!kc.length || kc.length > 2) return null;
  const col = (re) => head.findIndex((h, i) => i > 0 && re.test(h));
  const pi = col(/đạm|protein/i), ci = col(/tinh bột|carb/i), fi = col(/béo|chất béo|fat/i), si = col(/khẩu phần/i);
  const unit = /100\s*g/i.test(head[kc[0]]) ? "kcal/100 g" : "kcal";
  const menu = /^(bữa|ngày)$/i.test(head[0]) || rows.filter((r) => MEAL.test(r[0] || "")).length >= Math.ceil(rows.length * 0.6);
  // 2 cột kcal (vd "Ngày ăn như thường" / "Ngày có thâm hụt"): so sánh từng bữa
  if (kc.length === 2) {
    const name = (k) => head[k - 1] && !isKcal(head[k - 1]) && k - 1 > 0 ? head[k - 1] : head[k];
    const list = rows.map((r) => ({ name: r[0], a: parseNum(r[kc[0]]), b: parseNum(r[kc[1]]) })).filter((x) => x.name && x.a && x.b);
    if (list.length < 3) return null;
    const sum = (k) => list.reduce((t, x) => ({ lo: t.lo + x[k].lo, hi: t.hi + x[k].hi }), { lo: 0, hi: 0 });
    return { kind: "pair", title, unit, legend: [name(kc[0]), name(kc[1])], rows: list.slice(0, MAX_ROWS), total: menu ? { a: sum("a"), b: sum("b") } : null };
  }
  const k = kc[0];
  const list = rows.map((r) => {
    const v = parseNum(r[k]);
    const g = (i) => (i >= 0 ? parseNum(r[i]) : null);
    const extra = menu ? r.filter((c, i) => i > 0 && i !== k && c && !/^\d/.test(c)).join(" · ") : si >= 0 ? r[si] : "";
    return { name: r[0], sub: extra.slice(0, 90), kcal: v, p: g(pi), c: g(ci), f: g(fi) };
  }).filter((x) => x.name && x.kcal);
  if (list.length < 3) return null;
  const top = list.slice(0, MAX_ROWS);
  if (menu) {
    const total = top.reduce((t, x) => ({ lo: t.lo + x.kcal.lo, hi: t.hi + x.kcal.hi }), { lo: 0, hi: 0 });
    return { kind: "menu", title, unit, rows: top, total };
  }
  const macro = top.every((x) => x.p && x.c && x.f);
  return { kind: "bars", title, unit, macro, rows: [...top].sort((a, b) => mid(a.kcal) - mid(b.kcal)) };
}

export const specAlt = (sp) => {
  const names = sp.rows.slice(0, 5).map((x) => x.name).join(", ");
  if (sp.kind === "pair") return `Infographic so sánh ${sp.legend.join(" và ")}: ${names}`;
  if (sp.kind === "menu") return `Infographic thực đơn: ${names}, tổng khoảng ${fmtV(sp.total)} kcal`;
  return `Infographic calo ${names}${sp.rows.length > 5 ? "…" : ""} (${sp.unit})`;
};

// Danh sách hình của bài (theo thứ tự bảng). Tắt riêng 1 bài: seo.no_info = true.
export function infoSpecs(blocks, post = {}) {
  if (post?.seo?.no_info || post?.kind === "page") return [];
  const out = [];
  let heading = "";
  (blocks || []).forEach((b, i) => {
    if (b?.type === "h") heading = strip(b.text || b.html);
    if (b?.type === "table" && out.length < INFO_MAX) {
      const sp = tableSpec(b, heading || post?.title || "");
      if (sp) out.push({ at: i, spec: sp });
    }
  });
  return out.map((x, n) => ({ ...x, n: n + 1, alt: specAlt(x.spec) }));
}

// Chèn khối ảnh infographic ngay dưới bảng
export function addInfographics(blocks, post = {}) {
  const list = infoSpecs(blocks, post);
  if (!list.length) return blocks;
  const out = [];
  blocks.forEach((b, i) => {
    out.push(b);
    const it = list.find((x) => x.at === i);
    if (it) out.push({ type: "info", src: `/i/${post.slug}/${it.n}.png`, alt: it.alt, width: 1200, height: infoHeight(it.spec), caption: "Tóm tắt bảng trên, số theo bài viết" });
  });
  return out;
}

// Chiều cao ảnh theo số dòng (rộng cố định 1200)
export const infoHeight = (sp) => {
  const hasSub = sp.rows.some((x) => x.sub);
  const per = sp.kind === "bars" ? (sp.macro ? 80 : hasSub ? 74 : 56) : sp.kind === "pair" ? 80 : hasSub ? 92 : 70;
  const title = String(sp.title || "").length > 46 ? 48 : 0; // tiêu đề 2 dòng
  return 260 + title + sp.rows.length * per + (sp.total ? 80 : 0) + (sp.kind === "pair" || sp.macro ? 40 : 0);
};
