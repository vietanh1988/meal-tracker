// 31/10 (chủ dự án chốt bản B): 3 ngày làm quen Pi — dải gắn đáy thẻ Pi ở Hôm nay.
// Máy chủ (pet_claim → pet_onboard_tick) chấm việc và cộng Hạt; pet_state_json trả onboard = { n, last, day }
// (n = số việc đã xong, last = ngày Pi của việc xong gần nhất, day = ngày Pi hôm nay; null khi tài khoản quá 14 ngày).
// Ở đây chỉ dựng cái cần hiện, hàm thuần (có test).
export const ONBOARD_TASKS = [
  { n: 1, title: "Ghi 1 bữa · bấm Đã ăn", pts: 30, act: "log", btn: "Ghi bữa" },
  { n: 2, title: "Đã ăn 2 bữa hôm nay", pts: 40, act: "log", btn: "Ghi bữa" },
  { n: 3, title: "Đủ nước hoặc cân", pts: 50, act: "weigh", btn: "Cân" },
];
export const ONBOARD_TOTAL = ONBOARD_TASKS.reduce((a, t) => a + t.pts, 0);

// → null (ẩn) | { kind: "task", n, task } | { kind: "done", n, pts } | { kind: "party", total }
export function onboardView(ob) {
  if (!ob || typeof ob !== "object") return null;
  const n = Math.max(0, Math.min(3, Number(ob.n) || 0));
  const doneToday = !!ob.last && !!ob.day && ob.last === ob.day;
  if (n >= 3) return doneToday ? { kind: "party", total: ONBOARD_TOTAL } : null;
  if (doneToday && n > 0) return { kind: "done", n, pts: ONBOARD_TASKS[n - 1].pts };
  return { kind: "task", n: n + 1, task: ONBOARD_TASKS[n] };
}

// Vừa xong việc 1 trong phiên này (0 → 1) → lúc hỏi bật nhắc giờ ăn
export function justFinishedFirst(prev, next) {
  return !!prev && !!next && (Number(prev.n) || 0) === 0 && (Number(next.n) || 0) >= 1;
}
