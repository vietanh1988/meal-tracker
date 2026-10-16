// bun test tests/integration — Đổi món: tính trước kết quả từng ứng viên (không gọi AI, không mạng)
import { test, expect, mock } from "bun:test";
// Chỉ cần phần tính toán: thay Supabase và React (FeatureFlagsTab.jsx bị import gián tiếp) bằng bản giả
mock.module("../../src/lib/supabase.js", () => ({ supabase: {}, SUPABASE_URL: "" }));
mock.module("../../src/lib/authFetch.js", () => ({ authFetch: async () => ({}) }));
mock.module("react", () => ({ useState: () => [null, () => {}], useEffect: () => {}, useMemo: (f) => f(), useCallback: (f) => f, useRef: () => ({}) }));
mock.module("react/jsx-dev-runtime", () => ({ jsxDEV: () => null, Fragment: "f" }));
mock.module("react/jsx-runtime", () => ({ jsx: () => null, jsxs: () => null, Fragment: "f" }));

const { swapOptions, dayTarget, foodToItem, sanitizeAIMenu, swapFoodInTemplate, rebalanceTemplate, sumTemplate } = await import("../../src/lib/aiMenuService.js");
const { applyMealEngineToTemplate } = await import("../../src/mealEngine.js");

const macro = { calTarget: 2400, calRest: 2083, protein: 130, carb: 300, carbRest: 225, fat: 70, goal: "bulk" };
const base = applyMealEngineToTemplate({ day_type: "rest", meals: [
  { meal_id: "sang", items: [foodToItem("phở bò")] },
  { meal_id: "trua", items: [foodToItem("cơm trắng"), foodToItem("cá kho tộ"), foodToItem("canh rau dền")] },
  { meal_id: "toi", items: [foodToItem("cơm trắng"), foodToItem("thịt rang cháy cạnh"), foodToItem("su su xào")] },
] }, dayTarget(macro, "rest"));

test("swapOptions: sắp gần calo bữa cũ, không trùng tên, không lệch quá 20%, không vượt trần gram", () => {
  const r = swapOptions(base, "trua", "cá kho tộ", macro, "rest");
  console.log("current", r.current, "options", r.options.length, "hidden", r.hidden);
  console.log(r.options.slice(0, 6).map((o) => `${o.name} ${o.gram}g ${o.cal}kcal → bữa ${o.mealCal} (${o.diff}) cơm ${o.carb?.gram}`).join("\n"));
  expect(r.current.name.length).toBeGreaterThan(0);
  expect(r.options.length).toBeGreaterThan(3);
  const devs = r.options.map((o) => o.dev);
  expect(devs).toEqual([...devs].sort((a, b) => a - b));
  expect(new Set(r.options.map((o) => o.name.toLowerCase())).size).toBe(r.options.length);
  for (const o of r.options) {
    expect(o.dev).toBeLessThanOrEqual(0.2);
    expect(o.template.meals.find((m) => m.meal_id === "trua").items.some((i) => i.food === o.key)).toBe(true);
  }
});

test("swapOptions: số cũ lệch cách tính engine (thực đơn lưu từ trước) vẫn ra món để đổi", () => {
  const odd = JSON.parse(JSON.stringify(base));
  odd.meals.find((m) => m.meal_id === "trua").items.forEach((i) => { i.cal = Math.round(i.cal * 0.3); });
  const r = swapOptions(odd, "trua", "cá kho tộ", macro, "rest");
  expect(r.options.length).toBeGreaterThan(0);
});

test("swapOptions: bữa không có → rỗng", () => {
  expect(swapOptions(base, "post", "x", macro, "rest").options).toEqual([]);
});

test("sanitizeAIMenu: bỏ món kiêng (kể cả món độn), bỏ số vô lý, lệch calo quá xa thì báo hỏng", () => {
  const target = dayTarget(macro, "rest");
  const tpl = JSON.parse(JSON.stringify(base));
  tpl.meals.find((m) => m.meal_id === "toi").items.push({ ...foodToItem("lạc"), gram: 20, cal: 115 });
  tpl.meals.find((m) => m.meal_id === "sang").items.push({ food: "x lạ", gram: -5, cal: 10 });
  const r = sanitizeAIMenu(tpl, { avoidText: "dị ứng đậu phộng, không ăn bò", target });
  const all = r.template.meals.flatMap((m) => m.items.map((i) => i.food));
  expect(all).not.toContain("lạc");
  expect(all.some((f) => /bò/.test(f))).toBe(false);
  expect(all).not.toContain("x lạ");
  expect(r.removed.length).toBeGreaterThan(1);
  const empty = sanitizeAIMenu({ meals: [{ meal_id: "sang", items: [{ food: "phở bò", gram: 400, cal: 450 }] }] }, { avoidText: "bò", target });
  expect(empty.broken).toBe(true);
});

test("Đổi món giữ calo bữa (±5%), không đụng bữa khác; Cân lại đưa cả ngày về mục tiêu", () => {
  const cal = (t, id) => Math.round(t.meals.find((m) => m.meal_id === id).items.reduce((a, i) => a + i.cal, 0));
  // Thực đơn hụt 35% (như AI tạo thiếu) → đổi món không được kéo bữa lên mục tiêu
  const short = JSON.parse(JSON.stringify(base));
  short.meals.forEach((m) => m.items.forEach((i) => { for (const k of ["gram", "cal", "p", "c", "f"]) i[k] = Math.round(i[k] * 0.65 * 10) / 10; }));
  const before = cal(short, "trua");
  const next = swapFoodInTemplate(short, "trua", "cá kho tộ", "mực xào", macro, "rest");
  expect(next.meals.find((m) => m.meal_id === "trua").items.some((i) => i.food === "mực xào")).toBe(true);
  expect(Math.abs(cal(next, "trua") - before) / before).toBeLessThan(0.06);
  expect(next.meals.find((m) => m.meal_id === "toi")).toBe(short.meals.find((m) => m.meal_id === "toi"));
  const target = dayTarget(macro, "rest").cal;
  expect(sumTemplate(short).cal / target).toBeLessThan(0.75);
  const fixed = rebalanceTemplate(short, macro, "rest");
  // Cân lại = đúng mức mealEngine đạt được với các món này (bằng thực đơn tính chuẩn ban đầu), không còn hụt 35%
  expect(Math.abs(sumTemplate(fixed).cal - sumTemplate(base).cal) / sumTemplate(base).cal).toBeLessThan(0.03);
  expect(sumTemplate(fixed).cal).toBeGreaterThan(sumTemplate(short).cal * 1.3);
  // Không món nào bị ẩn (display null) chỉ vì thực đơn gốc chưa có tên hiển thị (lỗi CI 16/10: Cân lại làm mất món)
  const disp = (t) => t.meals.flatMap((m) => m.items.map((i) => `${m.meal_id}:${i.food}:${i.display === null}`)).sort();
  expect(disp(fixed)).toEqual(disp(short));
  const noDisp = JSON.parse(JSON.stringify(short)); noDisp.meals.forEach((m) => m.items.forEach((i) => { delete i.display; }));
  expect(rebalanceTemplate(noDisp, macro, "rest").meals.flatMap((m) => m.items).some((i) => i.display === null)).toBe(false);
});
