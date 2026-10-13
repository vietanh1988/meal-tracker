// bun test tests/integration — chạy hook useUserData với React + Supabase giả
import { test, expect, mock } from "bun:test";

// --- React giả: chạy hook như 1 hàm, state lưu trong mảng ---
let states = [], refs = [], si = 0, ri = 0;
const rerender = () => { si = 0; ri = 0; };
mock.module("react", () => ({
  useState: (init) => { const i = si++; if (!(i in states)) states[i] = typeof init === "function" ? init() : init; return [states[i], (v) => { states[i] = typeof v === "function" ? v(states[i]) : v; }]; },
  useRef: (init) => { const i = ri++; if (!(i in refs)) refs[i] = { current: init }; return refs[i]; },
  useCallback: (fn) => fn,
  useEffect: () => {},
}));

// --- Supabase giả: bảng daily_logs trong bộ nhớ, có độ trễ ngẫu nhiên ---
const db = { daily_logs: [], meal_logs: [] };
const delay = () => new Promise(r => setTimeout(r, Math.random() * 15));
function q(table) {
  const f = {}; let op = "select", payload = null;
  const api = {
    select() { return api; }, eq(k, v) { f[k] = v; return api; }, gte() { return api; }, lte() { return api; }, order() { return api; }, or() { return api; },
    async maybeSingle() { await delay(); const r = db[table].find(x => Object.entries(f).every(([k, v]) => x[k] === v)); return { data: r ? JSON.parse(JSON.stringify(r)) : null, error: null }; },
    upsert(p, o) { op = "upsert"; payload = p; return api.then ? api : api; },
    then(res, rej) {
      return (async () => {
        await delay();
        if (op === "upsert") {
          const keys = table === "daily_logs" ? ["user_id", "log_date"] : ["user_id", "meal_id", "day_type"];
          const i = db[table].findIndex(x => keys.every(k => x[k] === payload[k]));
          if (i >= 0) db[table][i] = { ...db[table][i], ...payload }; else db[table].push({ ...payload });
          return { data: null, error: null };
        }
        return { data: db[table].filter(x => Object.entries(f).every(([k, v]) => x[k] === v)), error: null };
      })().then(res, rej);
    },
  };
  return api;
}
mock.module("../../src/lib/supabase", () => ({ supabase: { from: q } }));
mock.module("../../src/lib/aiMenuService", () => ({ inferPatternFromItems: () => null }));
mock.module("../../src/mealPatterns", () => ({ MEAL_PATTERNS: {} }));

const { useUserData } = await import("../../src/hooks/useUserData.js");
const { todayVN } = await import("../../src/lib/dateVN.js");
const hook = () => { rerender(); return useUserData("u1"); };

test("lưu nhiều bữa liên tiếp không await — không mất bữa nào", async () => {
  const h = hook();
  const ps = ["sang", "phu_sang", "trua", "phu_chieu", "toi"].map((id, k) => h.saveMealToCloud(id, "train", [{ food: id, cal: 100 * (k + 1) }]));
  const res = await Promise.all(ps);
  expect(res.every(r => r.ok)).toBe(true);
  const row = db.daily_logs.find(r => r.log_date === todayVN());
  expect(row.meals.map(m => m.meal_id)).toEqual(["sang", "phu_sang", "trua", "phu_chieu", "toi"]);
  expect(row.total_cal).toBe(1500);
  // state hôm nay khớp DB
  const h2 = hook();
  expect(h2.getTodayMeals("train").filter(m => m.items.length).length).toBe(5);
  expect(h2.hasMealsToday()).toBe(true);
});

test("tick đã ăn dồn dập + sửa bữa đã ăn vẫn giữ tick", async () => {
  const h = hook();
  await Promise.all([h.toggleEaten("sang", true), h.toggleEaten("trua", true), h.toggleEaten("toi", true), h.toggleEaten("toi", false)]);
  let row = db.daily_logs.find(r => r.log_date === todayVN());
  expect(row.eaten_meals.sort()).toEqual(["sang", "trua"]);
  await hook().saveMealToCloud("sang", "train", [{ food: "pho", cal: 450 }]);
  row = db.daily_logs.find(r => r.log_date === todayVN());
  expect(row.eaten_meals).toContain("sang");
  expect(hook().eatenMeals.sort()).toEqual(["sang", "trua"]);
});

test("ghi ngày khác không đụng hôm nay, ảnh tự tick", async () => {
  const before = JSON.stringify(db.daily_logs.find(r => r.log_date === todayVN()));
  const r = await hook().saveMealToCloud("toi", "rest", [{ food: "com", cal: 600 }], false, "2026-01-01", { markEaten: true });
  expect(r.ok).toBe(true);
  expect(JSON.stringify(db.daily_logs.find(r => r.log_date === todayVN()))).toBe(before);
  const old = db.daily_logs.find(r => r.log_date === "2026-01-01");
  expect(old.eaten_meals).toEqual(["toi"]);
  expect(old.day_type).toBe("rest");
});

test("áp thực đơn giữ bữa đã ăn + bữa chưa ăn mà thực đơn không có", async () => {
  const before = db.daily_logs.find(r => r.log_date === todayVN()).meals.filter(m => (m.items || []).length).map(m => m.meal_id);
  await hook().applyTemplate({ day_type: "rest", meals: [{ meal_id: "sang", items: [{ cal: 999 }] }, { meal_id: "pre", items: [{ cal: 200 }] }] });
  const row = db.daily_logs.find(r => r.log_date === todayVN());
  const ids = row.meals.map(m => m.meal_id);
  for (const id of ["sang", "trua", "pre", ...before]) expect(ids).toContain(id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(row.meals.find(m => m.meal_id === "sang").items[0].cal).toBe(450);
  expect(row.day_type).toBe("rest");
});

test("chuyển bữa sang ngày khác + xoá bữa", async () => {
  const r = await hook().moveDayMeal(todayVN(), "2026-01-02", "trua");
  expect(r.ok).toBe(true);
  expect(db.daily_logs.find(x => x.log_date === "2026-01-02").eaten_meals).toEqual(["trua"]);
  expect(db.daily_logs.find(x => x.log_date === todayVN()).meals.some(m => m.meal_id === "trua")).toBe(false);
  await hook().removeDayMeal("2026-01-02", "trua");
  expect(db.daily_logs.find(x => x.log_date === "2026-01-02").meals.length).toBe(0);
});

test("nước: cộng dồn dập không mất, không âm, không đụng bữa", async () => {
  const before = db.daily_logs.find(r => r.log_date === todayVN()).meals.length;
  const h = hook();
  await Promise.all([h.addWater(250), h.addWater(250), h.addWater(500), h.addWater(-100)]);
  const row = db.daily_logs.find(r => r.log_date === todayVN());
  expect(row.water_ml).toBe(900);
  expect(row.meals.length).toBe(before);
  expect(hook().waterToday).toBe(900);
  await hook().addWater(-5000);
  expect(db.daily_logs.find(r => r.log_date === todayVN()).water_ml).toBe(0);
  // ghi bữa sau đó vẫn giữ nước
  await hook().addWater(300);
  await hook().saveMealToCloud("toi", "train", [{ cal: 1 }]);
  expect(db.daily_logs.find(r => r.log_date === todayVN()).water_ml).toBe(300);
});

test("bản tải hôm nay về muộn không đè thao tác ghi mới", async () => {
  const h = hook();
  const slowLoad = h.reloadToday();          // bắt đầu tải (đọc DB cũ)
  await hook().addWater(100);               // ghi trong lúc đang tải
  await slowLoad;
  const w = hook().waterToday;
  expect(w).toBe(db.daily_logs.find(r => r.log_date === todayVN()).water_ml);
});
