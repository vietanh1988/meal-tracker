// bun test — Độ chính xác AI lên thực đơn (rà 16/10), KHÔNG gọi AI: ai-proxy giả trả rỗng → slot mode tự chọn món trong pool.
// Trước khi sửa: thiếu TB 14–25% calo (Tiện lợi 25–39%, keto/low-carb hỏng hẳn). Giờ: TB lệch ≤ 12%, không lần nào lệch > 40%.
import { test, expect, mock } from "bun:test";
mock.module("../../src/lib/supabase.js", () => ({ supabase: {}, SUPABASE_URL: "" }));
mock.module("../../src/lib/authFetch.js", () => ({ authFetch: async () => ({ text: "" }) }));
mock.module("react", () => ({ useState: () => [null, () => {}], useEffect: () => {}, useMemo: (f) => f(), useCallback: (f) => f, useRef: () => ({}) }));
mock.module("react/jsx-dev-runtime", () => ({ jsxDEV: () => null, Fragment: "f" }));
mock.module("react/jsx-runtime", () => ({ jsx: () => null, jsxs: () => null, Fragment: "f" }));
const { generateMenuAI, resolveMealIds, sumTemplate, dayTarget } = await import("../../src/lib/aiMenuService.js");
const { calcMacro } = await import("../../src/calcMacro.js");

const APP = { feature_flags: JSON.stringify({ ai_menu_gen: true }) };
const P = (o) => ({ cm: 165, kg: 60, birthYear: 1995, goalKg: 60, months: 4, gender: "female", exerciseType: "gym", frequency: "regular", dietStrategy: "balanced", calorieMode: "standard", tier: "premium", ...o });
const CASES = [
  ["nam tăng cơ", P({ gender: "male", cm: 172, kg: 65, goalKg: 70, goalType: "bulk" }), "train"],
  ["nữ giảm mỡ không tập", P({ kg: 59, goalKg: 54, goalType: "cut", exerciseType: "none" }), "rest"],
  ["nữ giảm mỡ 48kg (sàn 1.200)", P({ cm: 155, kg: 48, goalKg: 45, goalType: "cut", exerciseType: "cardio", frequency: "occasional" }), "train"],
  ["nam giảm mỡ low-carb", P({ gender: "male", cm: 175, kg: 94, goalKg: 80, goalType: "cut", exerciseType: "cardio", frequency: "occasional", dietStrategy: "low_carb" }), "rest"],
  ["nữ keto", P({ kg: 67, goalKg: 58, goalType: "cut", exerciseType: "none", dietStrategy: "keto" }), "rest"],
  ["nam duy trì", P({ gender: "male", cm: 178, kg: 83, goalKg: 83, goalType: "maintain" }), "rest"],
];

for (const [name, prof, dayType] of CASES) {
  test(`thực đơn sát mục tiêu calo: ${name} (${dayType})`, async () => {
    const macro = calcMacro(prof);
    const mealIds = resolveMealIds(dayType, prof, APP);
    const target = dayTarget(macro, dayType);
    for (const style of ["vn", "clean", "easy"]) {
      const devs = [];
      for (let i = 0; i < 5; i++) {
        const r = await generateMenuAI({ macro, profile: prof, dayType, mealIds, prefs: { style, avoid: "" }, avoidFoods: [], appSettings: APP });
        if (!r.ok) continue;
        const t = sumTemplate(r.template);
        const dev = (t.cal - target.cal) / target.cal;
        expect(Math.abs(dev), `${style}: ${Math.round(t.cal)} / ${target.cal}`).toBeLessThan(0.4);
        devs.push(dev);
        if (macro.dietStrategy === "keto") expect(t.c, `keto tinh bột ${style}`).toBeLessThan(target.c * 1.5);
      }
      expect(devs.length, `${style}: số lần tạo được`).toBe(5);
      const avg = devs.reduce((a, b) => a + b, 0) / devs.length;
      expect(Math.abs(avg), `${style}: lệch TB ${Math.round(avg * 100)}%`).toBeLessThan(macro.dietStrategy === "keto" ? 0.2 : 0.12);
    }
  }, 60000);
}

test("ăn chay + dị ứng sữa: không có thịt/cá/sữa (kể cả món kèm bù calo)", async () => {
  const prof = P({ goalType: "cut", goalKg: 55, mealConfig: { train: ["sang", "phu_sang", "trua", "phu_chieu", "pre", "post", "toi"], rest: ["sang", "trua", "toi"] } });
  const macro = calcMacro(prof);
  const mealIds = resolveMealIds("train", prof, APP);
  for (let i = 0; i < 6; i++) {
    const r = await generateMenuAI({ macro, profile: prof, dayType: "train", mealIds, prefs: { style: i % 2 ? "clean" : "vn", avoid: "ăn chay, dị ứng sữa" }, avoidFoods: [], appSettings: APP });
    if (!r.ok) continue;
    const foods = r.template.meals.flatMap((m) => m.items.map((it) => `${it.food} ${it.display || ""}`.toLowerCase().replace(/trứng (gà|vịt|cút)/g, "trứng")));
    for (const f of foods) expect(f, f).not.toMatch(/(^|\s)(gà|bò|heo|lợn|cá|tôm|mực|sữa|xúc xích|thịt)(\s|$)/);
  }
});
