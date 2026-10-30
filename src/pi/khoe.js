// 30/10 (chủ dự án chốt bản vẽ "Khoe Pi" màn 2–3): ảnh khoe 1080×1920 (vừa Story Facebook / Instagram / Zalo) vẽ bằng canvas trên máy, không tốn tiền.
// 3 khung: "phong" (Phòng của Pi, luôn có) · "thanh-tich" (khi chuỗi ≥ 7 ngày hoặc có đồ thành tích) · "dip" (khi đang mặc ≥ 2 món cùng 1 dịp).
// Chân ảnh: logo + mã mời (tắt được) + mã QR mở trang Pi trên web. Không bao giờ có số kg; "Tiến độ cân" chỉ là % chặng đường (khách tự bật).
// Phần tính số (weekStats, khoeFrames, journeyPct) là hàm thuần, có test (tests/pi-khoe.test.mjs).
import { piLayers } from "./piLayers.js";
import { weekRange, diffDays, addDays } from "../lib/dateVN.js";
import { qrMatrix } from "../lib/qr.js";

export const W = 1080, H = 1920;
export const WEB = "https://fipilotai.com";
export const piPageUrl = (nick) => `${WEB}/pi/${nick}`;

/** keys = pet_state_json.keys (sổ Hạt 7 ngày gần nhất) → số bữa đã ăn / ngày đủ nước từ thứ Hai tuần này (cùng cách đếm máy chủ) */
export function weekStats(keys, day) {
  const mon = weekRange(day).start;
  let meals = 0, water = 0;
  for (const k of keys || []) {
    const m = /^(meal|water):(\d{4}-\d{2}-\d{2})/.exec(String(k));
    if (!m || m[2] < mon || m[2] > day) continue;
    if (m[1] === "meal") meals++; else water++;
  }
  return { meals, water, days: Math.min(7, diffDays(mon, day) + 1) };
}

/** khung được chọn: phòng luôn có; thành tích khi chuỗi ≥ 7 hoặc có đồ thành tích; dịp khi mặc ≥ 2 món cùng dịp (lấy dịp nhiều món nhất) */
export function khoeFrames({ streak = 0, trophies = [], equipped = {}, man }) {
  const byId = Object.fromEntries((man?.items || []).map((it) => [it.id, it]));
  const cnt = {};
  for (const [slot, id] of Object.entries(equipped || {})) { const it = byId[id]; if (it && it.slot === slot && it.ev) cnt[it.ev] = (cnt[it.ev] || 0) + 1; }
  const ev = Object.entries(cnt).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return [{ id: "phong", label: "Phòng của Pi" }, ...(streak >= 7 || trophies.length ? [{ id: "thanh-tich", label: "Thành tích" }] : []), ...(ev ? [{ id: "dip", label: man.events[ev] || "Theo dịp", ev }] : [])];
}

/** % chặng đường tới cân mục tiêu (giảm hoặc tăng), từ lần cân đầu trong 120 ngày; mỗi tuần tối đa 1% cân → không thưởng giảm / tăng quá nhanh.
 *  null khi không có mục tiêu giảm / tăng hoặc chưa đủ 2 lần cân */
export function journeyPct({ weights = [], goalType, goalKg, today }) {
  if (!(goalType === "cut" || goalType === "bulk") || !(Number(goalKg) > 0)) return null;
  const from = addDays(today, -120);
  const w = (weights || []).filter((x) => x && x.logged_date >= from && x.logged_date <= today && Number(x.kg) > 0).sort((a, b) => (a.logged_date < b.logged_date ? -1 : 1));
  if (w.length < 2) return null;
  const a = Number(w[0].kg), b = Number(w[w.length - 1].kg), g = Number(goalKg);
  const need = goalType === "cut" ? a - g : g - a;
  if (need <= 0) return null;
  const done = goalType === "cut" ? a - b : b - a;
  const cap = Math.max(1, diffDays(w[0].logged_date, w[w.length - 1].logged_date) / 7) * a * 0.01;
  return Math.max(0, Math.min(100, Math.round((Math.min(done, cap) / need) * 100)));
}

// ---------- vẽ ----------
const FONT = '-apple-system, "system-ui", Inter, "Segoe UI", Roboto, Arial, sans-serif';
const TINT = { halloween: "rgba(46,16,101,0.58)", giangsinh: "rgba(20,83,45,0.55)", tet: "rgba(127,29,29,0.52)", trungthu: "rgba(124,45,18,0.52)", muadong: "rgba(30,58,138,0.52)", muahe: "rgba(14,116,144,0.5)" };
const TITLE_C = { halloween: "#FDBA74", giangsinh: "#FDE68A", tet: "#FDE68A", trungthu: "#FED7AA", muadong: "#BFDBFE", muahe: "#FEF08A" };
const PILL_C = { halloween: "#F97316", giangsinh: "#DC2626", tet: "#DC2626", trungthu: "#EA580C", muadong: "#2563EB", muahe: "#0891B2" };

const loadImg = (src) => new Promise((ok) => { const im = new Image(); im.decoding = "async"; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function center(ctx, t, y, font, color) { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(t, W / 2, y, W - 120); ctx.textAlign = "left"; }
function cover(ctx, im, blur = 0) {
  const k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k;
  if (!blur) { ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); return; }
  // mờ bằng thu nhỏ rồi phóng (Safari cũ không có ctx.filter)
  const t = document.createElement("canvas"); t.width = Math.round(W / blur); t.height = Math.round(H / blur);
  const c2 = t.getContext("2d"); c2.drawImage(im, (t.width - w / blur) / 2, (t.height - h / blur) / 2, w / blur, h / blur);
  ctx.imageSmoothingQuality = "high"; ctx.drawImage(t, 0, 0, W, H);
}
async function drawPi(ctx, layers, base, x, y, size) {
  const ims = await Promise.all(layers.map((L) => loadImg(base + L.src)));
  const k = size / 768;
  layers.forEach((L, i) => {
    const im = ims[i]; if (!im) return;
    if (!L.tf) { ctx.drawImage(im, x, y, size, size); return; }
    const t = L.tf, c = L.c || [384, 384], s = Number(t.s) || 1;
    ctx.save();
    ctx.translate(x + (c[0] + (Number(t.x) || 0)) * k, y + (c[1] + (Number(t.y) || 0)) * k);
    ctx.rotate(((Number(t.r) || 0) * Math.PI) / 180);
    ctx.scale(s * (Number(t.w) || 1) * (t.fx ? -1 : 1), s * (Number(t.h) || 1));
    ctx.drawImage(im, -c[0] * k, -c[1] * k, size, size);
    ctx.restore();
  });
}
function drawQr(ctx, text, x, y, size) {
  const m = qrMatrix(text), n = m.length, q = 2, c = size / (n + 2 * q);
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#0F172A";
  m.forEach((row, r) => row.forEach((v, cI) => { if (v) ctx.fillRect(x + (cI + q) * c, y + (r + q) * c, c + 0.5, c + 0.5); }));
}
async function footer(ctx, d) {
  const y = 1640;
  ctx.fillStyle = "rgba(255,255,255,0.94)"; rr(ctx, 60, y, 960, 230, 40); ctx.fill();
  const logo = await loadImg(d.logo);
  if (logo) ctx.drawImage(logo, 96, y + 40, 96, 96);
  ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.fillStyle = "#0F172A"; ctx.font = `900 44px ${FONT}`; ctx.fillText(d.showCode ? "Nuôi Pi cùng mình nha!" : "Nuôi Pi miễn phí", 212, y + 40, 580);
  ctx.fillStyle = "#475569"; ctx.font = `600 32px ${FONT}`;
  ctx.fillText(d.showCode ? `Mã mời ${d.code} · cả hai nhận 50 Hạt` : "Ăn đúng bữa, Pi lớn mỗi ngày", 212, y + 100, 580);
  ctx.fillStyle = "#0062F0"; ctx.font = `700 32px ${FONT}`; ctx.fillText(`fipilotai.com/pi/${d.nick}`, 212, y + 150, 580);
  drawQr(ctx, piPageUrl(d.nick), 820, y + 30, 170);
}
function statsCard(ctx, stats) {
  const y = 1400;
  ctx.fillStyle = "rgba(255,255,255,0.94)"; rr(ctx, 60, y, 960, 200, 40); ctx.fill();
  const cw = 960 / stats.length;
  stats.forEach(([n, t], i) => {
    const cx = 60 + cw * i + cw / 2;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#0062F0"; ctx.font = `900 64px ${FONT}`; ctx.fillText(n, cx, y + 30, cw - 20);
    ctx.fillStyle = "#475569"; ctx.font = `600 30px ${FONT}`; ctx.fillText(t, cx, y + 120, cw - 24);
    if (i) { ctx.fillStyle = "#E2E8F0"; ctx.fillRect(60 + cw * i - 1.5, y + 40, 3, 120); }
  });
  ctx.textAlign = "left";
}

/** d: { frame, name, level, streak, variant, equipped, face, tf, man, base (vd "/pi/"), ver ("?v=…"), room (ảnh phòng hiện tại), evRoom, logo,
 *       stats: { meals, water, owned }, journey (số % hoặc null), showStats, showJourney, showCode, code, nick, trophy (tên đồ thành tích mới nhất) } */
export async function drawKhoe(d) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const ver = d.ver || "";
  const layers = piLayers({ man: d.man, gender: d.variant, equipped: d.equipped, face: d.face, tf: d.tf }).map((L) => ({ ...L, src: L.src + ver }));
  const fr = d.frame;
  const statRow = [[String(d.stats.meals), "bữa đã ăn tuần này"], [`${d.stats.water}/7`, "ngày đủ nước"], d.showJourney && d.journey != null ? [`${d.journey}%`, "tới cân mục tiêu"] : [String(d.stats.owned), "món sưu tầm"]];
  if (fr.id === "thanh-tich") {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#006CFD"); g.addColorStop(1, "#0036D9");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, 800, 40, W / 2, 800, 500); rg.addColorStop(0, "rgba(255,255,255,0.28)"); rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    center(ctx, "Mình đã chăm Pi", 110, `700 48px ${FONT}`, "rgba(255,255,255,0.9)");
    center(ctx, `${d.streak} ngày liền`, 175, `900 120px ${FONT}`, "#FFFFFF");
    center(ctx, "ăn đúng bữa · uống đủ nước · cân đều mỗi tuần", 330, `600 34px ${FONT}`, "#DBEAFE");
    await drawPi(ctx, layers, d.base, 90, 400, 900);
    const pill = d.trophy ? `Huy hiệu ${d.trophy}` : `Cấp ${d.level}`;
    ctx.font = `900 42px ${FONT}`; const pw = Math.min(900, ctx.measureText(pill).width + 96);
    ctx.fillStyle = "#FACC15"; rr(ctx, (W - pw) / 2, 1270, pw, 90, 45); ctx.fill();
    center(ctx, pill, 1292, `900 42px ${FONT}`, "#713F12");
    if (d.showStats) statsCard(ctx, statRow);
    else { ctx.fillStyle = "rgba(255,255,255,0.18)"; rr(ctx, 60, 1470, 960, 130, 36); ctx.fill(); center(ctx, `${d.name} · Cấp ${d.level} · ${d.stats.owned} món sưu tầm`, 1508, `700 42px ${FONT}`, "#FFFFFF"); }
  } else if (fr.id === "dip") {
    const im = await loadImg(d.evRoom);
    if (im) cover(ctx, im, 14); else { ctx.fillStyle = "#1E293B"; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = TINT[fr.ev] || "rgba(15,23,42,0.5)"; ctx.fillRect(0, 0, W, H);
    center(ctx, `${fr.label} của Pi`, 120, `900 96px ${FONT}`, TITLE_C[fr.ev] || "#FFFFFF");
    const names = Object.values(d.equipped || {}).map((id) => d.man.items.find((x) => x.id === id)).filter((x) => x && x.ev === fr.ev).map((x) => x.name.split(",")[0].split(" ").slice(0, 4).join(" ")).slice(0, 3);
    center(ctx, names.join(" · "), 245, `600 38px ${FONT}`, "rgba(255,255,255,0.88)");
    await drawPi(ctx, layers, d.base, 20, 330, 1040);
    const mine = d.owned.filter((id) => d.man.items.some((x) => x.id === id && x.ev === fr.ev)).length;
    const all = d.man.items.filter((x) => x.ev === fr.ev && x.g === (d.variant === "nu" ? "nu" : "nam")).length;
    const pill = `Bộ ${fr.label} · ${mine}/${all} món`;
    ctx.font = `900 44px ${FONT}`; const pw = Math.min(900, ctx.measureText(pill).width + 110);
    ctx.fillStyle = PILL_C[fr.ev] || "#0062F0"; rr(ctx, (W - pw) / 2, 1440, pw, 100, 50); ctx.fill();
    center(ctx, pill, 1466, `900 44px ${FONT}`, "#FFFFFF");
  } else {
    const im = await loadImg(d.room);
    if (im) cover(ctx, im); else { ctx.fillStyle = "#DBEAFE"; ctx.fillRect(0, 0, W, H); }
    const tg = ctx.createLinearGradient(0, 0, 0, 340); tg.addColorStop(0, "rgba(15,23,42,0.6)"); tg.addColorStop(1, "rgba(15,23,42,0)");
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 340);
    center(ctx, d.name, 90, `900 92px ${FONT}`, "#FFFFFF");
    center(ctx, `Cấp ${d.level}${d.streak >= 2 ? ` · ${d.streak} ngày liền chăm Pi` : ""}`, 205, `700 42px ${FONT}`, "rgba(255,255,255,0.92)");
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.ellipse(W / 2, 1335, 240, 34, 0, 0, Math.PI * 2); ctx.fill();
    await drawPi(ctx, layers, d.base, 40, 400, 1000);
    if (d.showStats) statsCard(ctx, statRow);
  }
  await footer(ctx, d);
  return cv;
}

export const toBlob = (cv, type = "image/png", q) => new Promise((ok) => cv.toBlob((b) => ok(b), type, q));
