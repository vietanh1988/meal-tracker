// bun test — Gợi ý món cho 1 bữa (thay nút "Ăn lại" tự áp): tối đa 5 lựa chọn, theo calo bữa + món không ăn
import { test, expect } from "bun:test";
const { mealSuggestions, mealTargetOf, fitItems } = await import("../../src/lib/mealSuggest.js");
const { avoidMatcher } = await import("../../src/lib/allergy.js");

const macro = { calTarget: 2400, calRest: 2000, protein: 140, carb: 300, carbRest: 220, fat: 70, goal: "bulk" };
const ids = ["sang", "trua", "toi"];
const it = (food, gram, cal, p = 0, c = 0, f = 0) => ({ food, gram, cal, p, c, f });
const hist = (d, mealId, items) => ({ log_date: d, meal_id: mealId, meal_name: "Bữa trưa", items });

test("mục tiêu bữa = mục tiêu ngày chia theo trọng số bữa đang bật", () => {
  const t = mealTargetOf(macro, "train", ids, "trua");
  expect(t.cal).toBe(Math.round(2400 * 30 / 80));
  expect(mealTargetOf(macro, "rest", ids, "trua").cal).toBe(Math.round(2000 * 30 / 80));
});

test("khẩu phần nhân đều về gần calo bữa, giới hạn 0,7–1,4 lần", () => {
  const out = fitItems([it("cơm trắng", 200, 260), it("gà luộc", 150, 250)], 900);
  expect(out[0].gram).toBe(280); // ×1,4
  const same = fitItems([it("cơm trắng", 200, 260)], 262);
  expect(same[0].gram).toBe(200);
});

test("tối đa 5, bỏ trùng, bỏ món đang có, bỏ món không ăn, vừa calo lên trước", () => {
  const history = [
    hist("2026-10-15", "trua", [it("cơm trắng", 250, 325, 6, 70, 1), it("cá kho tộ", 200, 260, 28, 7, 13)]),
    hist("2026-10-14", "trua", [it("cơm trắng", 250, 325), it("cá kho tộ", 200, 260)]), // trùng
    hist("2026-10-13", "trua", [it("bún bò huế", 500, 600)]),
    hist("2026-10-12", "toi", [it("phở gà", 400, 420)]), // khác bữa
    hist("2026-10-11", "trua", [it("cơm tấm", 400, 700)]),
    hist("2026-10-10", "trua", [it("gà luộc", 200, 330), it("cơm trắng", 250, 325)]),
  ];
  const isAvoided = avoidMatcher("hải sản");
  const r = mealSuggestions({ mealId: "trua", mealIds: ids, macro, dayType: "train", history, isAvoided, currentItems: [it("cơm tấm", 400, 700)] });
  const names = r.map((s) => s.items.map((i) => i.food).join("+"));
  expect(names.some((n) => n.includes("cá kho"))).toBe(false); // không ăn hải sản
  expect(names).not.toContain("cơm tấm"); // đang có
  expect(names.filter((n) => n === "bún bò huế").length).toBe(1);
  expect(r.length).toBeLessThanOrEqual(5);
  for (const s of r) expect(Math.abs(s.cal - 900)).toBeLessThan(900 * 0.31);
});

test("thực đơn mẫu chạy lại mealEngine theo calo bữa", () => {
  const tpl = { name: "Tăng cơ cơ bản", meals: [{ meal_id: "trua", items: [{ food: "cơm trắng", gram: 200, cal: 260, p: 5, c: 57, f: 1, role: "carb" }, { food: "ức gà áp chảo", gram: 150, cal: 248, p: 46, c: 0, f: 5, role: "protein" }] }] };
  const r = mealSuggestions({ mealId: "trua", mealIds: ids, macro, dayType: "train", templates: [tpl] });
  expect(r.length).toBe(1);
  expect(r[0].kind).toBe("template");
  expect(Math.abs(r[0].cal - 900) / 900).toBeLessThan(0.2);
});
