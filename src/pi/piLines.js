// 24/10 — Câu thoại Pi theo tình huống (hàm thuần, có test tests/pi-lines.test.mjs). Bộ câu: src/pi/chatLines.json
// (game/pi_chat_lines.json của Muse, scripts/pi/build.py chép vào). Luật của bộ câu:
//  - mỗi lần kích hoạt 1 câu, chọn ngẫu nhiên trong nhóm, KHÔNG lặp câu đã dùng trong 7 ngày (lịch sử id → thời điểm);
//  - câu có biến {…} chỉ chọn khi đủ dữ liệu biến đó; "mat" = biểu cảm, "giong" = nhãn giọng (cường độ khẩu hình);
//  - bi_chui: chọn theo "muc" + số lần trong phiên (lần 1–2 → mức 1, 3–4 → mức 2, chửi nặng liên tục → mức 3: Pi ngủ, im 1–2 phút). Pi không bao giờ chửi lại;
//  - buon_ban_than: ưu tiên cao nhất, tắt đùa + tắt nhắc nhiệm vụ trong phiên.
// (file này không import JSON để test node chạy được; app nạp bộ câu qua src/pi/piBank.js)
import { stripTone } from "./piLipsync.js";

/** bộ câu → { ma: nhóm } */
export const linesIndex = (bank) => Object.fromEntries((bank?.nhom || []).map((g) => [g.ma, g]));
export const REPEAT_DAYS = 7;
const DAY = 86_400_000;

/** thay biến {ten}… ; thiếu biến nào (null / undefined / "") thì trả null (bỏ câu đó) */
export function fillVars(text, vars = {}) {
  let miss = false;
  const out = String(text).replace(/\{([a-z_]+)\}/g, (_, k) => {
    const v = vars[k];
    if (v === undefined || v === null || v === "") { miss = true; return ""; }
    return typeof v === "number" ? v.toLocaleString("vi-VN") : String(v);
  });
  // 30/10: {ten} = "bạn" mà đứng đầu câu → viết hoa ("Bạn ơi…", "… rồi. Bạn …")
  return miss ? null : out.replace(/(^|[.!?…]\s+)bạn/g, (_, a) => `${a}Bạn`);
}

/** 30/10 (chủ dự án: Pi nói máy móc): tên Pi gọi user. Tên tài khoản kiểu "vietanh1988", "e2e_tester" (có số, gạch dưới, @,
 *  viết liền không dấu) nghe như máy → gọi "bạn". Tên thật có dấu / có khoảng trắng → giữ (3 chữ trở lên lấy 2 chữ cuối). */
export function piName(...cands) {
  for (const raw of cands) {
    const n = String(raw || "").trim().replace(/\s+/g, " ");
    if (!n || n.length > 30 || /[\d_@.]/.test(n)) continue;
    const real = /\s/.test(n) || /[à-ỹđ]/i.test(n.normalize("NFC"));
    if (!real) continue;
    const w = n.split(" ").map((x) => x.charAt(0).toUpperCase() + x.slice(1));
    return (w.length >= 3 ? w.slice(-2) : w).join(" ");
  }
  return "bạn";
}

/** 31/10: câu theo Pi nam / nữ — c.nu = bản Pi nữ (scripts/pi/chat_v2.py), không có thì dùng c.text */
export const lineText = (c, g) => (g === "nu" && c.nu ? c.nu : c.text);
/** chọn 1 câu của nhóm `ma`. history: { id: epochMs lần dùng gần nhất }. g = "nam" | "nu". → { id, text, mat, giong, ma } hoặc null */
export function pickLine(groups, ma, { vars = {}, history = {}, now = 0, rnd = Math.random, muc = null, g: gender = "nam" } = {}) {
  const g = groups[ma];
  if (!g) return null;
  let pool = g.cau.filter((c) => (muc == null || c.muc == null || c.muc === muc)).map((c) => ({ ...c, filled: fillVars(lineText(c, gender), vars) })).filter((c) => c.filled);
  if (!pool.length) return null;
  const fresh = pool.filter((c) => !history[c.id] || now - history[c.id] >= REPEAT_DAYS * DAY);
  // hết câu mới trong 7 ngày → lấy câu dùng lâu nhất (vẫn không lặp câu vừa nói)
  if (fresh.length) pool = fresh;
  else pool = [...pool].sort((a, b) => (history[a.id] || 0) - (history[b.id] || 0)).slice(0, 1);
  const c = pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
  return { id: c.id, text: c.filled, mat: c.mat, giong: c.giong, ma };
}

/** lấy đúng 1 câu theo id (VD BUON-03: gợi ý đường dây hỗ trợ khi có ý tự hại) */
export function lineById(groups, id, vars = {}, gender = "nam") {
  for (const g of Object.values(groups)) {
    const c = g.cau.find((x) => x.id === id);
    if (c) { const text = fillVars(lineText(c, gender), vars); return text ? { id: c.id, text, mat: c.mat, giong: c.giong, ma: g.ma } : null; }
  }
  return null;
}

/** lịch sử: ghi id vừa dùng, bỏ id quá 7 ngày (giữ gọn localStorage / settings) */
export function remember(history = {}, id, now) {
  const out = {};
  for (const [k, t] of Object.entries(history)) if (now - t < REPEAT_DAYS * DAY) out[k] = t;
  if (id) out[id] = now;
  return out;
}

// ---- Nhóm theo việc thật của app (kich_hoat trong bộ câu) ----
/** mở app theo giờ: 5–10h chào sáng, 10–14h chào trưa, sau 19h chào tối */
export function greetGroup(hour) {
  if (hour >= 5 && hour < 10) return "chao_sang";
  if (hour >= 10 && hour < 14) return "chao_trua";
  if (hour >= 19 || hour < 5) return "chao_toi";
  return null;
}
// việc của app (src/lib/petMath.js eventsFor) → nhóm câu
export const EVENT_GROUP = { back: "lau_khong_gap", level: "len_cap", streak: "streak", full: "nhiem_vu", weight: "can_giam", meal_late: "ghi_bua_an", water: "uong_nuoc", gym: "truoc_tap", rest: "ngay_nghi", night: "chao_toi" };

// ---- Nhận biết lời xúc phạm / tiêu cực về bản thân ----
// Gõ có dấu → so theo từ có dấu ("ngủ" ≠ "ngu"); gõ không dấu → chỉ bắt cụm rõ nghĩa (tránh "di ngu" = "đi ngủ")
const words = (s) => ` ${String(s).toLowerCase().normalize("NFC").replace(/[^0-9a-zà-ỹđ]+/g, " ").trim()} `;
const FOLD = { ă: "a", â: "a", ê: "e", ô: "o", ơ: "o", ư: "u", đ: "d" };
const plain = (s) => ` ${stripTone(s).replace(/[ăâêôơưđ]/g, (c) => FOLD[c]).replace(/[^a-z0-9]+/g, " ").trim()} `;
const hasDiacritics = (s) => /[à-ỹđ]/i.test(String(s).normalize("NFC").replace(/[a-z0-9\s.,!?]/gi, "")) || /[\u00C0-\u1EF9đĐ]/.test(String(s));
const has = (t, list) => list.some((w) => t.includes(` ${w} `));
const HEAVY_A = ["đm", "đmm", "đcm", "dm", "dmm", "vcl", "vkl", "vl", "clm", "địt", "đéo", "đù má", "đụ má", "mẹ mày", "con chó", "óc chó", "đồ chó", "súc vật", "chó chết", "lồn", "cút", "cút đi", "khốn nạn", "mất dạy", "thằng ngu", "con ngu"];
const HEAVY_U = ["dm", "dmm", "dcm", "vcl", "vkl", "vl", "clm", "dit me", "deo", "du ma", "me may", "con cho", "oc cho", "do cho", "suc vat", "cho chet", "khon nan", "mat day", "thang ngu", "con ngu", "cut di"];
const MILD_A = ["ngu", "ngu quá", "đồ ngu", "ngốc", "đồ ngốc", "đần", "đồ đần", "vô dụng", "im đi", "im mồm", "xấu xí", "phiền quá", "nhảm", "nhảm nhí", "nhàm chán", "ghét mày", "ghét pi", "biến đi", "kém cỏi", "dở ẹc", "dở hơi", "láo", "đồ tệ", "điên à"];
const MILD_U = ["ngu qua", "do ngu", "may ngu", "pi ngu", "ngoc", "do ngoc", "do dan", "vo dung", "im di", "im mom", "xau xi", "phien qua", "nham nhi", "nham chan", "ghet may", "ghet pi", "bien di", "kem coi", "do hoi", "dien a"];
/** → 0 (không), 1 (gắt / chê), 2 (tục / lăng mạ) */
export function insultLevel(text) {
  const acc = hasDiacritics(text), t = acc ? words(text) : plain(text);
  if (has(t, acc ? HEAVY_A : HEAVY_U)) return 2;
  if (has(t, acc ? MILD_A : MILD_U)) return 1;
  return 0;
}
/** mức câu bi_chui theo số lần trong phiên (đã gồm lần này) và số lần chửi nặng: 1–2 → 1, 3–4 → 2, nặng liên tục (≥ 2 lần nặng) hoặc ≥ 5 → 3 */
export function insultMuc(count, heavyCount = 0) {
  if (heavyCount >= 2 || count >= 5) return 3;
  return count >= 3 ? 2 : 1;
}
export const SULK_MS = 90_000; // mức 3: Pi ngủ, im 90 s (1–2 phút)

// chán nản / chê bản thân / tự hại / ép cân nguy hiểm — so không dấu theo CỤM (đủ rõ nghĩa)
const SAD = [
  "muon chet", "tu tu", "khong muon song", "chan song", "chet di cho roi", "tu lam dau", "tu hai", "cat tay", "rach tay", "ket thuc tat ca", "bien mat khoi",
  "ghet ban than", "ghet chinh minh", "minh vo dung", "toi vo dung", "tao vo dung", "em vo dung", "minh that bai", "toi that bai", "khong ai can", "chan nan qua", "buon qua", "met moi qua", "bat luc qua",
  "beo qua", "minh beo", "toi beo", "em beo", "xau xi qua", "ghe tom ban than", "kinh tom ban than", "nhin an", "bo bua", "nhin doi", "moc hong", "non ra", "ep can", "thuoc giam can", "thuoc xo", "khong an gi ca",
];
export const isSadSelf = (text) => has(plain(text), SAD);
// có ý tự hại → câu có gợi ý đường dây hỗ trợ (BUON-03) trước
const HARM = ["muon chet", "tu tu", "khong muon song", "chan song", "chet di cho roi", "tu lam dau", "tu hai", "cat tay", "rach tay", "ket thuc tat ca", "bien mat khoi"];
export const isSelfHarm = (text) => has(plain(text), HARM);
