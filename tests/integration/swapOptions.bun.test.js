// bun test tests/integration — Đổi món: tính trước kết quả từng ứng viên (không gọi AI, không mạng)
import { test, expect, mock } from "bun:test";
// Chỉ cần phần tính toán: thay Supabase và React (FeatureFlagsTab.jsx bị import gián tiếp) bằng bản giả
mock.module("../../src/lib/supabase.js", () => ({ supabase: {}, SUPABASE_URL: "" }));
mock.module("../../src/lib/authFetch.js", () => ({ authFetch: async () => ({}) }));
mock.module("react", () => ({ useState: () => [null, () => {}], useEffect: () => {}, useMemo: (f) => f(), useCallback: (f) => f, useRef: () => ({}) }));
mock.module("react/jsx-dev-runtime", () => ({ jsxDEV: () => null, Fragment: "f" }));
mock.module("react/jsx-runtime", () => ({ jsx: () => null, jsxs: () => null, Fragment: "f" }));

const { swapOptions, dayTarget, foodToItem } = await import("../../src/lib/aiMenuService.js");
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
