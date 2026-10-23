// 24/10 — Khẩu hình Pi khi nói (hàm thuần, có test tests/pi-lipsync.test.mjs).
// Theo bảng game của Muse: pi_assets_clean/pi_lipsync_map.json (7 miệng: ngam, he, vua, to, o, meu, ngu; meu / ngu KHÔNG dùng khi nói).
// Đầu vào: câu tiếng Việt + (tuỳ có) mốc bắt đầu âm tiết lấy từ biên độ audio. Đầu ra: dòng thời gian [{ t, v }] (ms, mã miệng).

const VOWEL = { i: "he", y: "he", e: "he", ê: "he", a: "to", ă: "vua", â: "vua", ơ: "vua", o: "o", ô: "o", u: "o", ư: "o" };
const DIPH = {
  ai: ["to", "he"], ay: ["vua", "he"], ây: ["vua", "he"], ao: ["to", "o"], au: ["vua", "o"], âu: ["vua", "o"], eo: ["he", "o"], êu: ["he", "o"],
  ia: ["he", "vua"], iê: ["he", "vua"], yê: ["he", "vua"], iu: ["he", "o"], oa: ["o", "vua"], oe: ["o", "he"], oi: ["o", "he"], ôi: ["o", "he"], ơi: ["vua", "he"],
  ua: ["o", "vua"], uô: ["o", "vua"], ưa: ["o", "vua"], ươ: ["o", "vua"], ui: ["o", "he"], ưi: ["o", "he"], ưu: ["o", "o"], uy: ["o", "he"], uơ: ["o", "vua"],
};
const INIT = ["ngh", "ng", "gh", "gi", "kh", "nh", "ph", "qu", "th", "tr", "ch", "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "x"];
const INIT_V = { m: "ngam", b: "ngam", p: "ngam", kh: "vua", h: "vua", qu: "o" }; // còn lại: he
const FINAL = ["ch", "nh", "ng", "c", "m", "n", "p", "t"];
const FINAL_V = { m: "ngam", p: "ngam", t: "he", c: "he", ch: "he" }; // n / ng / nh: giữ khuôn nguyên âm
export const MIN_HOLD = 60, MERGE_BELOW = 90, GAP_TO_REST = 120, END_HOLD = 120, LABIAL_MS = 60;

/** bỏ dấu thanh (giữ ă â ê ô ơ ư đ): thanh điệu không ảnh hưởng khuôn miệng */
export function stripTone(s) {
  return String(s).normalize("NFD").replace(/[̣̀́̃̉]/g, "").normalize("NFC").toLowerCase();
}

/** 1 âm tiết → { init, nuc: [1–2 khuôn], fin } (khuôn miệng; null = không có / giữ khuôn) */
export function syllableParts(word) {
  const w = stripTone(word).replace(/[^a-zăâêôơưđ]/g, "");
  if (!w) return null;
  let init = INIT.find((c) => w.startsWith(c)) || "";
  if (init === "gi" && (w.length === 2 || /^gi[nmcptg]/.test(w))) init = "g"; // "gì", "gìn": i là nguyên âm
  const rest = w.slice(init.length);
  const fin = FINAL.find((c) => rest.endsWith(c) && rest.length > c.length) || "";
  const nucS = rest.slice(0, rest.length - fin.length);
  let nuc = [];
  if (nucS.length >= 2) {
    const d = DIPH[nucS] || DIPH[nucS.slice(0, 2)];
    nuc = d ? [d[0], nucS.length >= 3 ? VOWEL[nucS[nucS.length - 1]] || d[1] : d[1]] : [...nucS].map((ch) => VOWEL[ch]).filter(Boolean).slice(0, 2);
  } else if (nucS) nuc = [nucS === "a" && ["m", "p", "t", "c", "ch"].includes(fin) ? "vua" : VOWEL[nucS] || "he"]; // a ngắn (âm tiết khép) → vua
  if (nuc.length === 2 && nuc[0] === nuc[1]) nuc = [nuc[0]];
  if (!nuc.length && !init) return null;
  return { init: init ? INIT_V[init] || "he" : null, nuc: nuc.length ? nuc : [INIT_V[init] || "he"], fin: FINAL_V[fin] || null };
}
/** dãy miệng của 1 âm tiết, VD "chào" → ["he","to","o"], "buổi" → ["ngam","o","he"], "giảm" → ["he","vua","ngam"] */
export function syllableVisemes(word) {
  const p = syllableParts(word);
  return p ? [p.init, ...p.nuc, p.fin].filter(Boolean) : [];
}

/** tách câu thành âm tiết + chỗ ngắt (dấu câu): [{ w, pause }] — pause: ms nghỉ sau âm tiết */
export function syllables(text) {
  const out = [];
  for (const m of String(text).matchAll(/([0-9A-Za-zÀ-ỹđĐ]+)|([,;:–—-])|([.!?…]+)/g)) {
    if (m[1]) {
      if (/^\d/.test(m[1])) { for (const d of m[1]) out.push({ w: NUM[d] || "", pause: 0 }); continue; } // số đọc từng chữ số
      out.push({ w: m[1], pause: 0 });
    } else if (out.length) out[out.length - 1].pause = Math.max(out[out.length - 1].pause, m[2] ? 250 : 420);
  }
  return out.filter((x) => x.w);
}
const NUM = { 0: "không", 1: "một", 2: "hai", 3: "ba", 4: "bốn", 5: "năm", 6: "sáu", 7: "bảy", 8: "tám", 9: "chín" };

// cường độ theo nhãn giọng (pi_chat_lines.json "giong")
const UP = { vua: "to", he: "vua" }, DOWN = { to: "vua", vua: "he" };
export function intensity(v, giong) {
  if (giong === "hao_hung") return UP[v] || v;
  if (giong === "diu_dang") return DOWN[v] || v;
  if (giong === "an_ui") return v === "to" ? "vua" : v;
  return v;
}
export const SPEED = { diu_dang: 1.2, an_ui: 1.2, hao_hung: 0.9 };

/** mốc âm tiết khi KHÔNG có audio: ~190 ms / âm tiết (dịu dàng / an ủi chậm hơn 20%), nghỉ theo dấu câu */
export function textOnsets(text, giong) {
  const k = SPEED[giong] || 1, syl = syllables(text), on = [];
  let t = 0;
  for (const s of syl) { on.push(t); t += 190 * k + s.pause * k; }
  return { syl, onsets: on, end: t };
}

/** đỉnh biên độ → mốc âm tiết. rms: mảng biên độ mỗi `hop` ms. Gán đều số âm tiết lên phần CÓ TIẾNG (khoảng lặng > 120 ms là ngắt). */
export function onsetsFromRms(rms, hop, count) {
  const max = Math.max(1e-6, ...rms), th = Math.max(0.015, max * 0.12);
  const voiced = rms.map((x) => x >= th);
  // vùng có tiếng (lặng ngắn < 120 ms vẫn tính liền)
  const segs = []; let s = -1, lastOn = -1;
  for (let i = 0; i <= voiced.length; i++) {
    if (i < voiced.length && voiced[i]) { if (s < 0) s = i; lastOn = i; }
    else if (s >= 0 && (i === voiced.length || (i - lastOn) * hop > GAP_TO_REST)) { segs.push([s, lastOn + 1]); s = -1; }
  }
  if (!segs.length || !count) return { onsets: [], end: rms.length * hop, segs: [] };
  const total = segs.reduce((n, [a, b]) => n + (b - a), 0);
  const onsets = [];
  for (let k = 0; k < count; k++) {
    let pos = (k / count) * total; // vị trí trên trục "chỉ phần có tiếng"
    for (const [a, b] of segs) { if (pos < b - a) { onsets.push(Math.round((a + pos) * hop)); break; } pos -= b - a; }
  }
  // kéo mốc về đỉnh / sườn lên gần nhất (± 60 ms) cho khớp tiếng hơn
  const snap = onsets.map((t) => {
    const i0 = Math.round(t / hop), r = Math.round(60 / hop);
    let best = i0;
    for (let i = Math.max(0, i0 - r); i <= Math.min(rms.length - 2, i0 + r); i++) if (rms[i + 1] - rms[i] > rms[best + 1] - rms[best]) best = i;
    return best * hop;
  });
  for (let i = 1; i < snap.length; i++) if (snap[i] <= snap[i - 1] + 40) snap[i] = snap[i - 1] + 40;
  return { onsets: snap, end: segs[segs.length - 1][1] * hop, segs: segs.map(([a, b]) => [a * hop, b * hop]) };
}

/** mốc âm tiết từ audio cho cả câu: số cụm (ngắt bởi dấu câu) = số vùng có tiếng → chia âm tiết từng cụm vào đúng vùng đó */
export function audioOnsets(text, rms, hop) {
  const syl = syllables(text);
  const base = onsetsFromRms(rms, hop, syl.length);
  const groups = []; let n = 0;
  for (const x of syl) { n++; if (x.pause >= 250) { groups.push(n); n = 0; } }
  if (n) groups.push(n);
  if (groups.length > 1 && groups.length === base.segs.length) {
    const on = [];
    groups.forEach((cnt, g) => { const [a, b] = base.segs[g]; for (let k = 0; k < cnt; k++) on.push(Math.round(a + ((b - a) * k) / cnt)); });
    return { ...base, onsets: on };
  }
  return base;
}

/** dòng thời gian miệng: [{ t, v }] tăng dần, kết thúc bằng "ngam". onsets[i] = ms bắt đầu âm tiết i; end = ms hết tiếng. */
export function timeline(text, { onsets, end, giong, segs } = {}) {
  const base = onsets ? { syl: syllables(text), onsets, end } : textOnsets(text, giong);
  const { syl } = base, on = base.onsets, stop = base.end ?? (on.length ? on[on.length - 1] + 220 : 0);
  const out = [];
  const push = (t, v) => { t = Math.round(t); if (out.length && out[out.length - 1].v === v) return; out.push({ t, v }); };
  const n = Math.min(syl.length, on.length);
  const lv = (v) => (v === "ngam" ? v : intensity(v, giong));
  for (let i = 0; i < n; i++) {
    const p = syllableParts(syl[i].w);
    if (!p) continue;
    const t0 = on[i], t1 = i + 1 < n ? on[i + 1] : stop;
    const pause = segs ? 0 : syl[i].pause * (SPEED[giong] || 1);
    const dur = Math.max(1, t1 - t0 - (pause > GAP_TO_REST ? pause : 0));
    const nuc = p.nuc.map(lv);
    if (dur < MERGE_BELOW) { push(t0, nuc[0]); } // âm tiết quá ngắn: chỉ khuôn chính
    else {
      let t = t0, endT = t0 + dur;
      if (p.init === "ngam") { push(t, "ngam"); t += Math.min(LABIAL_MS, dur * 0.3); } // m / b / p: ngậm 60 ms trước nguyên âm
      else if (p.init && p.init !== nuc[0]) { push(t, lv(p.init)); t += Math.min(70, dur * 0.25); }
      const finT = p.fin ? Math.min(60, dur * 0.22) : 0;
      const bodyT = endT - finT - t;
      push(t, nuc[0]);
      if (nuc.length > 1) push(t + bodyT * 0.6, nuc[1]); // nguyên âm đôi: 60 % khuôn đầu, 40 % khuôn sau
      if (p.fin) push(endT - finT, p.fin);
    }
    // nghỉ > 120 ms (dấu câu, hoặc khoảng lặng trong audio) → về ngậm; nói liền thì chuyển thẳng âm tiết sau
    if (pause > GAP_TO_REST) push(t0 + dur, "ngam");
    else if (segs) { const e = gapEnd(segs, t0, t1); if (e != null) push(Math.max(e, out[out.length - 1].t + MIN_HOLD), "ngam"); }
  }
  if (out.length) push(stop + END_HOLD, "ngam");
  // giữ mỗi khuôn tối thiểu 60 ms: khuôn đến sớm quá thì lùi lại (không bỏ khuôn)
  const keep = [];
  for (const x of out) {
    const prev = keep[keep.length - 1];
    if (prev && prev.v === x.v) continue;
    keep.push(prev ? { t: Math.max(x.t, prev.t + MIN_HOLD), v: x.v } : x);
  }
  return keep;
}
/** trong âm tiết [a, b) có chỗ hết tiếng mà lặng > 120 ms tới vùng tiếng sau → ms hết tiếng */
function gapEnd(segs, a, b) {
  for (let k = 0; k < segs.length; k++) {
    const e = segs[k][1], next = segs[k + 1] ? segs[k + 1][0] : Infinity;
    if (e > a && e < b && next - e > GAP_TO_REST) return e;
  }
  return null;
}

/** miệng tại thời điểm t (ms) */
export function visemeAt(tl, t) {
  let v = "ngam";
  for (const x of tl) { if (x.t > t) break; v = x.v; }
  return v;
}

/** không có chữ (chỉ có tiếng): theo biên độ — im → ngam, nhỏ → he, vừa → vua, to → to */
export function visemeFromRms(x, max = 1) {
  const r = max > 0 ? x / max : 0;
  return r < 0.12 ? "ngam" : r < 0.35 ? "he" : r < 0.65 ? "vua" : "to";
}

/** miệng nghỉ khi đang ở chế độ nói mà im: buồn → mếu, ngủ → miệng ngủ */
export const restMouth = (face) => (face === "buon" ? "meu" : face === "ngu" ? "ngu" : "ngam");

/** câu AI trả về "[haohung] {vui_tuoi} Oa giỏi quá" / "[haohung] Oa…" → { expr, giong, text } */
const FACE_TAGS = ["vui", "cuoilon", "nhaymat", "haohung", "ngacnhien", "yeu", "suynghi", "buon", "ngu"];
const GIONG = ["vui_tuoi", "hao_hung", "diu_dang", "an_ui", "tu_hao"];
export function parseTagged(raw) {
  let s = String(raw || "").trim(), expr = null, giong = null;
  for (let k = 0; k < 3; k++) {
    const m = s.match(/^[[({]\s*([a-z_]+)\s*[\])}]\s*/i);
    if (!m) break;
    const tag = m[1].toLowerCase();
    if (FACE_TAGS.includes(tag) && !expr) expr = tag;
    else if (GIONG.includes(tag) && !giong) giong = tag;
    else break;
    s = s.slice(m[0].length);
  }
  return { expr, giong, text: s.replace(/\s*[[(](vui_tuoi|hao_hung|diu_dang|an_ui|tu_hao)[\])]\s*/gi, " ").trim() };
}
