// 01/11 (chủ dự án chốt bản vẽ "Tập luyện"): giáo án mẫu + phép tính buổi tập (hàm thuần, có test).
// Giáo án: { name, tpl, days: { "0".."6": { title, items: [{ ex, sets, reps }] } } } — 0 = T2 (giống profile.gymDays); thiếu ngày = nghỉ.
// Buổi tập: { day, title, items: [{ ex, sets: [{ kg, reps, done }] }], started_at, ended_at }.
import { gymIdxOf } from "../lib/dateVN.js";

export const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
export const DOW_LONG = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];
const it = (ex, sets, reps) => ({ ex, sets, reps });

// Buổi mẫu (tên bài = id trong src/workout/exercises.js)
const S = {
  fullA: { title: "Toàn thân A", items: [it("barbell-back-squat", 3, 8), it("barbell-bench-press", 3, 8), it("barbell-row", 3, 10), it("dumbbell-shoulder-press", 3, 10), it("plank", 3, 40)] },
  fullB: { title: "Toàn thân B", items: [it("romanian-deadlift", 3, 10), it("incline-dumbbell-press", 3, 10), it("lat-pulldown", 3, 10), it("walking-lunge", 3, 12), it("hanging-leg-raise", 3, 12)] },
  upper: { title: "Thân trên", items: [it("barbell-bench-press", 4, 8), it("barbell-row", 4, 8), it("dumbbell-shoulder-press", 3, 10), it("lat-pulldown", 3, 10), it("dumbbell-curl", 3, 12), it("triceps-pushdown", 3, 12)] },
  lower: { title: "Thân dưới", items: [it("barbell-back-squat", 4, 8), it("romanian-deadlift", 3, 10), it("leg-press", 3, 12), it("lying-leg-curl", 3, 12), it("standing-calf-raise", 4, 15), it("plank", 3, 45)] },
  push: { title: "Ngực – Vai – Tay sau", items: [it("barbell-bench-press", 4, 8), it("incline-dumbbell-press", 3, 10), it("dumbbell-shoulder-press", 3, 10), it("lateral-raise", 3, 15), it("triceps-pushdown", 3, 12), it("overhead-triceps-extension", 3, 12)] },
  pull: { title: "Lưng – Tay trước", items: [it("pull-up", 4, 8), it("barbell-row", 4, 10), it("seated-cable-row", 3, 12), it("face-pull", 3, 15), it("dumbbell-curl", 3, 12), it("hammer-curl", 3, 12)] },
  legs: { title: "Chân – Mông", items: [it("barbell-back-squat", 4, 8), it("romanian-deadlift", 3, 10), it("leg-press", 3, 12), it("hip-thrust", 3, 12), it("leg-extension", 3, 15), it("standing-calf-raise", 4, 15)] },
  homeA: { title: "Toàn thân tại nhà", items: [it("goblet-squat", 3, 15), it("push-up", 3, 10), it("glute-bridge", 3, 15), it("walking-lunge", 3, 12), it("plank", 3, 30)] },
  homeB: { title: "Đốt mỡ tại nhà", items: [it("jump-rope", 3, 60), it("mountain-climber", 3, 30), it("burpee", 3, 10), it("russian-twist", 3, 20), it("crunch", 3, 15)] },
  walk: { title: "Đi bộ nhanh", items: [it("treadmill-walk", 1, 30)] },
};

// Mẫu giáo án: cycle = các buổi lặp lại theo các ngày tập (theo thứ tự trong tuần)
export const TEMPLATES = [
  { id: "toan-than", name: "Toàn thân", hint: "2–3 buổi/tuần · gym", cycle: ["fullA", "fullB"] },
  { id: "tren-duoi", name: "Thân trên · Thân dưới", hint: "4 buổi/tuần · gym", cycle: ["upper", "lower"] },
  { id: "day-keo-chan", name: "Đẩy · Kéo · Chân", hint: "5–6 buổi/tuần · gym", cycle: ["push", "pull", "legs"] },
  { id: "giam-can-nha", name: "Giảm cân tại nhà", hint: "3–5 buổi/tuần · không cần dụng cụ", cycle: ["homeA", "walk", "homeB"] },
];
export const tplOf = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

/** mẫu hợp với khách: không tập gym / giảm cân → tại nhà; theo số buổi */
export function defaultTpl({ days = 3, exerciseType = "gym", loss = false } = {}) {
  if (exerciseType === "none" || loss) return "giam-can-nha";
  if (days >= 5) return "day-keo-chan";
  if (days === 4) return "tren-duoi";
  return "toan-than";
}

const clone = (x) => JSON.parse(JSON.stringify(x));
/** dựng giáo án từ mẫu + các ngày tập (0 = T2); không có ngày thì T2 / T4 / T6 */
export function buildPlan(tplId, gymDays) {
  const t = tplOf(tplId);
  const ds = [...new Set((gymDays && gymDays.length ? gymDays : [0, 2, 4]).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
  const days = {};
  ds.forEach((d, i) => { days[String(d)] = clone(S[t.cycle[i % t.cycle.length]]); });
  return { name: t.name, tpl: t.id, days };
}

export const planDays = (plan) => Object.keys(plan?.days || {}).map(Number).filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
/** buổi của 1 ngày (dateStr VN) theo giáo án; null = nghỉ */
export function sessionOfDate(plan, dateStr) {
  const d = plan?.days?.[String(gymIdxOf(dateStr))];
  return d && Array.isArray(d.items) && d.items.length ? d : null;
}

/** các hiệp lần gần nhất của 1 bài (buổi đã xong, mới nhất trước) */
export function lastSets(sessions, ex) {
  for (const s of [...(sessions || [])].filter((x) => x.ended_at).sort((a, b) => String(b.day).localeCompare(String(a.day)) || String(b.ended_at).localeCompare(String(a.ended_at)))) {
    const i = (s.items || []).find((x) => x.ex === ex);
    const done = (i?.sets || []).filter((x) => x.done);
    if (done.length) return done.map((x) => ({ kg: Number(x.kg) || 0, reps: Number(x.reps) || 0 }));
  }
  return null;
}
/** kỷ lục: hiệp nặng nhất (kg cao nhất, cùng kg thì nhiều lần hơn) */
export function bestSet(sessions, ex, exceptId) {
  let best = null;
  for (const s of sessions || []) {
    if (!s.ended_at || s.id === exceptId) continue;
    for (const i of s.items || []) {
      if (i.ex !== ex) continue;
      for (const x of i.sets || []) {
        if (!x.done) continue;
        const kg = Number(x.kg) || 0, reps = Number(x.reps) || 0;
        if (!best || kg > best.kg || (kg === best.kg && reps > best.reps)) best = { kg, reps, day: s.day };
      }
    }
  }
  return best;
}

/** buổi mới từ giáo án: điền sẵn kg / lần theo lần trước (không có thì 0 kg + số lần mục tiêu) */
export function newSession(dayPlan, sessions, day) {
  return {
    day, title: dayPlan?.title || "Buổi tập", ended_at: null,
    items: (dayPlan?.items || []).map((p) => {
      const prev = lastSets(sessions, p.ex);
      const n = Math.max(1, Number(p.sets) || 3);
      return { ex: p.ex, sets: Array.from({ length: n }, (_, k) => ({ kg: prev ? prev[Math.min(k, prev.length - 1)].kg : 0, reps: prev ? prev[Math.min(k, prev.length - 1)].reps : Number(p.reps) || 10, done: false })) };
    }),
  };
}

export const setsDone = (s) => (s?.items || []).reduce((a, i) => a + (i.sets || []).filter((x) => x.done).length, 0);
export const setsTotal = (s) => (s?.items || []).reduce((a, i) => a + (i.sets || []).length, 0);
export const volume = (s) => Math.round((s?.items || []).reduce((a, i) => a + (i.sets || []).filter((x) => x.done).reduce((b, x) => b + (Number(x.kg) || 0) * (Number(x.reps) || 0), 0), 0));
export function minutesOf(s, now = Date.now()) {
  const a = Date.parse(s?.started_at || ""), b = s?.ended_at ? Date.parse(s.ended_at) : now;
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / 60000)) : 0;
}
/** kỷ lục mới trong buổi này so với các buổi trước */
export function newRecords(session, sessions) {
  const out = [];
  for (const i of session?.items || []) {
    const top = (i.sets || []).filter((x) => x.done && Number(x.kg) > 0).sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0];
    if (!top) continue;
    const old = bestSet(sessions, i.ex, session.id);
    if (old && (top.kg > old.kg || (top.kg === old.kg && top.reps > old.reps))) out.push({ ex: i.ex, kg: Number(top.kg), reps: Number(top.reps), was: old.kg });
  }
  return out;
}

/** đổi thứ tự 1 phần tử */
export function move(arr, from, to) {
  const a = [...arr];
  if (from < 0 || from >= a.length) return a;
  const [x] = a.splice(from, 1);
  a.splice(Math.max(0, Math.min(a.length, to)), 0, x);
  return a;
}

/** tìm bài không dấu, theo tên Việt hoặc tên Anh */
export const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();
export function searchEx(list, q, muscle) {
  const f = fold(q);
  return (list || []).filter((e) => (!muscle || e.muscle === muscle) && (!f || fold(e.vi).includes(f) || fold(e.en).includes(f)));
}
