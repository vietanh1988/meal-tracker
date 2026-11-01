// 01/11 (bản vẽ "Pi và Bài tập trên web"): Thư viện bài tập trên web đọc CHUNG dữ liệu với app (src/workout → lib/app/workout, chép lúc dựng).
// Link theo tên Việt: "Gánh tạ" → /bai-tap/ganh-ta (trùng thì thêm -2). Ảnh lấy từ app (app.fipilotai.com/ex/…), không chép 2 bản.
import { EXERCISES, EX_BY_ID, MUSCLES, EQUIPS } from "./app/workout/exercises.js";
import { EX_PHOTOS } from "./app/workout/exPhotos.js";
import { TEMPLATES, fold } from "./app/workout/plan.js";
import { slugify } from "./slug.js";

export { EXERCISES, MUSCLES, EQUIPS, TEMPLATES };
export const APP = "https://app.fipilotai.com";
export const MUSCLE_NAME = Object.fromEntries(MUSCLES);
export const MUSCLE_SLUG = { nguc: "nguc", lung: "lung", vai: "vai", tay_truoc: "tay-truoc", tay_sau: "tay-sau", chan: "chan", mong: "mong", bung: "bung", cardio: "cardio" };
export const muscleOfSlug = (s) => Object.keys(MUSCLE_SLUG).find((k) => MUSCLE_SLUG[k] === s) || null;
export const MUSCLE_TONE = {
  nguc: ["#FFE4E6", "#BE123C"], lung: ["#DBEAFE", "#1D4ED8"], vai: ["#FEF3C7", "#B45309"], tay_truoc: ["#DCFCE7", "#15803D"], tay_sau: ["#E0E7FF", "#4338CA"],
  chan: ["#FCE7F3", "#BE185D"], mong: ["#FFEDD5", "#C2410C"], bung: ["#CCFBF1", "#0F766E"], cardio: ["#F3EEFF", "#6D28D9"],
};
export const LEVEL_NAME = { co_ban: "Cơ bản", nang_cao: "Nâng cao" };
// nhóm dụng cụ cho chip lọc (gộp tạ đơn / tạ ấm…)
export const EQUIP_CHIPS = [["", "Mọi dụng cụ"], ["khong", "Không dụng cụ (tập ở nhà)"], ["ta_don_tay", "Tạ đơn"], ["ta_don", "Tạ đòn"], ["may", "Máy"], ["cap", "Máy cáp"], ["xa", "Xà"]];

// slug duy nhất theo tên Việt, thứ tự theo thư viện (bài trước giữ slug gọn)
const SLUG = {}; const BY_SLUG = {};
// "tạ đòn" và "tạ đơn" bỏ dấu đều ra "ta-don" → tạ đơn viết "ta-tay" (cách gọi quen: tạ tay)
for (const e of EXERCISES) { const b = slugify(e.vi.replace(/tạ đơn/gi, "tạ tay")) || e.id; let s = b, n = 2; while (BY_SLUG[s]) s = `${b}-${n++}`; SLUG[e.id] = s; BY_SLUG[s] = e; }
export const exSlug = (id) => SLUG[id] || id;
export const exBySlug = (s) => BY_SLUG[s] || null;
export const exById = (id) => EX_BY_ID[id] || null;
export const exUrl = (id) => `/bai-tap/${exSlug(id)}`;
export const hasPhoto = (id) => EX_PHOTOS.has(id);
/** ảnh 2 khung: to 480 px · nhỏ 128×96 */
export const photoUrls = (id, big = true) => (hasPhoto(id) ? [0, 1].map((f) => `${APP}/ex/${big ? "" : "t/"}${id}-${f}.webp`) : null);

export const countBy = (key) => EXERCISES.reduce((m, e) => { m[e[key]] = (m[e[key]] || 0) + 1; return m; }, {});

// Giáo án mẫu: buổi theo vòng (cycle) — đọc thẳng từ plan.js của app qua buildPlan với các ngày giả 0..n
import { buildPlan } from "./app/workout/plan.js";
export const TPL_DAYS = { "toan-than": [0, 2, 4], "tren-duoi": [0, 1, 3, 4], "day-keo-chan": [0, 1, 2, 3, 4, 5], "giam-can-nha": [0, 2, 4] };
/** các buổi KHÁC NHAU của 1 giáo án mẫu, đúng thứ tự: [{ title, items: [{ ex, sets, reps }] }] */
export function tplSessions(tplId) {
  const p = buildPlan(tplId, TPL_DAYS[tplId] || [0, 2, 4]);
  const seen = new Set(), out = [];
  for (const d of Object.keys(p.days).sort()) { const s = p.days[d]; if (!seen.has(s.title)) { seen.add(s.title); out.push(s); } }
  return out;
}
export const tplOf = (id) => TEMPLATES.find((t) => t.id === id) || null;
export const TPL_INTRO = {
  "toan-than": "2–3 buổi mỗi tuần, mỗi buổi tập cả người. Hợp người mới tập gym hoặc bận, ít buổi.",
  "tren-duoi": "4 buổi mỗi tuần, xen kẽ thân trên và thân dưới. Hợp người đã tập vài tháng muốn tăng cơ đều.",
  "day-keo-chan": "5–6 buổi mỗi tuần ở phòng gym. Mỗi nhóm cơ tập 2 lần/tuần, hợp người đã tập trên 6 tháng muốn tăng cơ.",
  "giam-can-nha": "3–5 buổi mỗi tuần tại nhà, không cần dụng cụ. Kết hợp bài toàn thân, đi bộ nhanh và bài đốt mỡ.",
};
/** bài nằm trong giáo án mẫu nào: [{ tpl, name, title, sets, reps }] */
export function inTemplates(exId) {
  const out = [];
  for (const t of TEMPLATES) for (const s of tplSessions(t.id)) { const it = s.items.find((i) => i.ex === exId); if (it) out.push({ tpl: t.id, name: t.name, title: s.title, sets: it.sets, reps: it.reps }); }
  return out;
}
const TIME_SEC = new Set(["plank", "jump-rope", "mountain-climber", "side-plank", "wall-sit", "dead-hang"]);
/** đơn vị: lần · giây · phút (giống app) */
export function unitOf(e) {
  if (!e) return "lần";
  if (TIME_SEC.has(e.id)) return "giây";
  if (e.pattern === "cardio" && !/burpee|climber|jack/.test(e.id)) return "phút";
  return "lần";
}
export const setsText = (sets, reps, e) => `${sets} × ${reps}${unitOf(e) !== "lần" ? ` ${unitOf(e)}` : ""}`;
/** bài cùng nhóm cơ (khác bài này), ưu tiên cùng kiểu động tác */
export const related = (e, n = 4) => EXERCISES.filter((x) => x.id !== e.id && x.muscle === e.muscle).sort((a, b) => (b.pattern === e.pattern) - (a.pattern === e.pattern)).slice(0, n);
export const searchKey = (e) => fold(`${e.vi} ${e.en}`);
