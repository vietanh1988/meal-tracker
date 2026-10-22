// 23/10: đoạn văn quá dài (AI hay viết 6-10 câu một đoạn) khó đọc trên điện thoại → khi hiện bài tự chia thành đoạn
// 2-3 câu (≤ ~50 chữ). Chỉ cắt ở chỗ hết câu (". " + chữ hoa) nằm ngoài thẻ in đậm / link, không đụng dữ liệu gốc.
const MAX_WORDS = 55;
const INLINE = /^<\/?(a|strong|b|em|i|u|s|mark|span|sup|sub|code|small)\b/i;
const words = (h) => h.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

function sentences(html) {
  const parts = String(html).split(/(<[^>]+>)/);
  const out = []; let cur = "", depth = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2) { // thẻ
      if (INLINE.test(p)) depth += p.startsWith("</") ? -1 : /\/>$/.test(p) ? 0 : 1;
      if (depth < 0) depth = 0;
      cur += p; continue;
    }
    if (depth > 0) { cur += p; continue; }
    // cắt sau . ! ? khi theo sau là dấu cách + chữ hoa (câu mới)
    let last = 0;
    const re = /[.!?…]["”)]?\s+(?=[\p{Lu}0-9“"])/gu;
    let m;
    while ((m = re.exec(p))) {
      cur += p.slice(last, m.index + m[0].length).trimEnd();
      out.push(cur); cur = ""; last = m.index + m[0].length;
    }
    cur += p.slice(last);
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

export function splitLong(blocks) {
  const out = []; let firstP = true;
  for (const b of blocks) {
    if (b?.type !== "p" || !b.html) { out.push(b); continue; }
    const isSapo = firstP; firstP = false;
    if (isSapo || words(b.html) <= MAX_WORDS || /<(br|img|table|ul|ol|div)\b/i.test(b.html)) { out.push(b); continue; }
    const ss = sentences(b.html);
    if (ss.length < 3) { out.push(b); continue; }
    let buf = [], n = 0;
    const flush = () => { if (buf.length) { out.push({ ...b, html: buf.join(" ") }); buf = []; n = 0; } };
    ss.forEach((s, i) => {
      const w = words(s);
      // đoạn tối thiểu 2 câu; câu cuối lẻ thì gộp vào đoạn trước
      if (buf.length >= 2 && n + w > MAX_WORDS * 0.75 && ss.length - i >= 1) flush();
      buf.push(s); n += w;
    });
    if (buf.length === 1 && out.length && out[out.length - 1].type === "p" && out[out.length - 1] !== b) { const prev = out.pop(); out.push({ ...prev, html: prev.html + " " + buf[0] }); buf = []; }
    flush();
  }
  return out;
}
