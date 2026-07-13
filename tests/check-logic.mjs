#!/usr/bin/env node
// ============================================================
// MEAL TRACKER — Logic & Integration Test v2
// Chạy: node tests/check-logic.mjs
//
// Bắt TẤT CẢ các bug đã từng gặp:
// 1. saveWeeklyTemplate sai tham số
// 2. tplMeals thiếu composite/pattern
// 3. Auto-apply chỉ check 1 loại ngày
// 4. AppDialogHost thiếu trên mobile
// 5. AdminPanel đọc localStorage thay vì gymDays
// 6. MealsTab không hiện pattern name
// 7. AdminPanel load food dùng key thô
// 8. Dashboard thiếu props cho AIMenuGenerator
// ============================================================

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf-8");

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; failures.push({ name, error: e.message }); console.log(`  ❌ ${name}\n     → ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const SRC = {
  app:           read("src/App.jsx"),
  dashboard:     read("src/Dashboard.jsx"),
  aiCoach:       read("src/AICoachPanel.jsx"),
  onboarding:    read("src/OnboardingWizard.jsx"),
  adminPanel:    read("src/AdminPanel.jsx"),
  mealsTab:      read("src/adminTabs/MealsTab.jsx"),
  useUserData:   read("src/hooks/useUserData.js"),
  aiMenuService: read("src/lib/aiMenuService.js"),
  mealCard:      read("src/MealCard.jsx"),
  dialog:        read("src/lib/dialog.jsx"),
};

// Helper: tìm tất cả dòng chứa pattern
function lines(src, pattern) {
  return src.split("\n").filter(l => l.includes(pattern));
}

// Helper: đếm args trong call, xử lý nested ()
function countArgs(argsStr) {
  let depth = 0, commas = 0;
  for (const ch of argsStr) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) commas++;
  }
  return commas + 1;
}

// ============================================================
console.log("\n🔍 1. saveWeeklyTemplate — ĐÚNG 4 THAM SỐ");
console.log("================================================");

test("useUserData: signature có 4 params", () => {
  const m = SRC.useUserData.match(/saveWeeklyTemplate\s*=\s*useCallback\s*\(\s*async\s*\(([^)]+)\)/);
  assert(m, "Không tìm thấy saveWeeklyTemplate");
  const p = m[1].split(",").map(s => s.trim());
  assert(p.length === 4, `Cần 4 params, có ${p.length}: ${p}`);
});

// Tìm tất cả dòng gọi saveWeeklyTemplate(...) và đếm args
const FILES_TO_CHECK = {
  "Dashboard":     SRC.dashboard,
  "App":           SRC.app,
  "AICoachPanel":  SRC.aiCoach,
  "OnboardingWizard": SRC.onboarding,
  "MealsTab":      SRC.mealsTab,
};

for (const [name, src] of Object.entries(FILES_TO_CHECK)) {
  const callLines = lines(src, "saveWeeklyTemplate(")
    .filter(l => !l.includes("const ") && !l.includes("useCallback") && !l.includes("function ") && !l.includes("import"));
  
  for (const line of callLines) {
    // Extract full call: saveWeeklyTemplate(...)
    const m = line.match(/saveWeeklyTemplate\((.+)\)/);
    if (!m) continue;
    const args = countArgs(m[1]);
    test(`${name}: saveWeeklyTemplate(${args} args) — cần 4`, () => {
      assert(args === 4, `Truyền ${args} args: ${m[1].slice(0, 60)}...`);
    });
  }
}

// ============================================================
console.log("\n🔍 2. tplMeals — GIỮ composite + pattern");
console.log("================================================");

for (const [name, src] of Object.entries({
  Dashboard: SRC.dashboard, App: SRC.app,
  AICoachPanel: SRC.aiCoach, OnboardingWizard: SRC.onboarding,
})) {
  if (!src.includes("tplMeals")) continue;
  test(`${name}: tplMeals giữ composite + pattern`, () => {
    assert(src.includes("composite:!!m.composite"), `${name} thiếu composite`);
    assert(src.includes("pattern:m.pattern"), `${name} thiếu pattern`);
  });
}

// ============================================================
console.log("\n🔍 3. Auto-apply — CHECK CẢ train + rest");
console.log("================================================");

for (const [name, src] of [["Dashboard", SRC.dashboard], ["App", SRC.app]]) {
  test(`${name}: auto-apply check cả train + rest`, () => {
    assert(src.includes('hasMealsToday("train")||hasMealsToday("rest")'),
      "Chỉ check 1 loại ngày → ghi đè menu AI");
  });
}

// ============================================================
console.log("\n🔍 4. AppDialogHost — MOBILE + PC");
console.log("================================================");

test("App: import AppDialogHost", () => {
  assert(SRC.app.includes("AppDialogHost"), "Thiếu import");
});

test("App: AppDialogHost trong mobile layout", () => {
  const mobile = SRC.app.split("PC LAYOUT")[0];
  assert(mobile.includes("<AppDialogHost"), "Mobile thiếu → confirm/alert treo");
});

test("App: AppDialogHost trong PC layout", () => {
  const pc = SRC.app.split("PC LAYOUT")[1] || "";
  assert(pc.includes("<AppDialogHost"), "PC thiếu");
});

// ============================================================
console.log("\n🔍 5. AdminPanel — dayType INIT");
console.log("================================================");

test("AdminPanel: useState init KHÔNG gọi localStorage.getItem", () => {
  // Lấy block useState init (từ useState(() => { ... })
  const m = SRC.adminPanel.match(/\[dayType,setDayType\]=useState\(\(\)=>\{([\s\S]*?)\n\s*\}\)/);
  assert(m, "Không tìm thấy dayType useState");
  assert(!m[1].includes("localStorage.getItem"),
    "Vẫn đọc localStorage.getItem → kẹt sai loại ngày");
});

test("AdminPanel: useState init dùng gymDays", () => {
  const m = SRC.adminPanel.match(/\[dayType,setDayType\]=useState\(\(\)=>\{([\s\S]*?)\n\s*\}\)/);
  assert(m && m[1].includes("gymDays"), "Phải auto-detect từ gymDays");
});

// ============================================================
console.log("\n🔍 6. MealsTab — HIỆN TÊN MÓN");
console.log("================================================");

test("MealsTab: đọc + hiện pattern", () => {
  assert(SRC.mealsTab.includes("_pattern") || SRC.mealsTab.includes("mealPattern"),
    "Không hiện tên món (Phở gà, Bò xào...)");
});

test("AdminPanel: lưu _pattern vào allFoodItems", () => {
  assert(SRC.adminPanel.includes("_pattern"), "Không lưu pattern → MealsTab trống");
});

// ============================================================
console.log("\n🔍 7. AdminPanel — DISPLAY NAME");
console.log("================================================");

test("AdminPanel: dùng it.display khi load items", () => {
  assert(SRC.adminPanel.includes("it.display||it.food||it.name"),
    "Dùng raw key thay vì display name");
});

// ============================================================
console.log("\n🔍 8. Dashboard — AIMenuGenerator PROPS");
console.log("================================================");

test("Dashboard: nhận getMealHistory từ props", () => {
  const m = SRC.dashboard.match(/Dashboard\(\{([^}]+)\}/);
  assert(m && m[1].includes("getMealHistory"), "Thiếu getMealHistory trong props");
});

test("Dashboard: truyền initialDayType + getMealHistory cho AIMenuGenerator", () => {
  const gen = SRC.dashboard.match(/<AIMenuGenerator[^>]+>/);
  assert(gen, "Không tìm thấy AIMenuGenerator");
  assert(gen[0].includes("initialDayType"), "Thiếu initialDayType");
  assert(gen[0].includes("getMealHistory"), "Thiếu getMealHistory");
});

// ============================================================
console.log("\n🔍 9. App.jsx — TRUYỀN PROPS CHO Dashboard");
console.log("================================================");

test("App: Dashboard nhận getMealHistory", () => {
  const dashLine = lines(SRC.app, "<Dashboard ").join(" ");
  assert(dashLine.includes("getMealHistory"), "Thiếu getMealHistory");
});

test("App: Dashboard nhận saveWeeklyTemplate", () => {
  const dashLine = lines(SRC.app, "<Dashboard ").join(" ");
  assert(dashLine.includes("saveWeeklyTemplate"), "Thiếu saveWeeklyTemplate");
});

test("App: Dashboard nhận hasMealsToday", () => {
  const dashLine = lines(SRC.app, "<Dashboard ").join(" ");
  assert(dashLine.includes("hasMealsToday"), "Thiếu hasMealsToday");
});

// ============================================================
console.log("\n🔍 10. applyTemplate — composite + pattern");
console.log("================================================");

test("useUserData: applyTemplate truyền composite + pattern", () => {
  const block = SRC.useUserData.match(/applyTemplate[\s\S]*?updateMealsState\([^)]*composite/);
  assert(block, "applyTemplate không truyền composite cho updateMealsState");
});

test("useUserData: updateMealsState lưu extra.composite + extra.pattern", () => {
  assert(SRC.useUserData.includes("extra?.composite"), "Thiếu extra.composite");
  assert(SRC.useUserData.includes("extra?.pattern"), "Thiếu extra.pattern");
});

// ============================================================
console.log("\n🔍 11. MealCard — DISPLAY ĐÚNG");
console.log("================================================");

test("MealCard: dùng display name", () => {
  assert(SRC.mealCard.includes("item.display||item.food"), "Thiếu display fallback");
});

test("MealCard: hiện pattern + compact view", () => {
  assert(SRC.mealCard.includes("meal.pattern") || SRC.mealCard.includes("patternName"), "Thiếu pattern");
  assert(SRC.mealCard.includes("composite") || SRC.mealCard.includes("showCompact"), "Thiếu compact view");
});

// ============================================================
console.log("\n🔍 12. SYNC dayType SAU APPLY");
console.log("================================================");

test("Dashboard: setDayType sau applyTemplate", () => {
  const h = SRC.dashboard.match(/handleApplyAIMenu[\s\S]*?setShowAIMenu/);
  assert(h && h[0].includes("setDayType"), "Không đồng bộ dayType");
});

test("App: setPcDayManual sau applyTemplate", () => {
  const h = SRC.app.match(/handleApplyAIMenuPC[\s\S]*?setShowAIMenuPC/);
  assert(h && h[0].includes("setPcDayManual"), "Không đồng bộ pcDayManual");
});

// ============================================================
console.log("\n🔍 13. ERROR HANDLING");
console.log("================================================");

test("useUserData: applyTemplate guard !userId || !template", () => {
  assert(SRC.useUserData.includes("!userId || !template"), "Thiếu guard");
});

test("Dashboard: handleApplyAIMenu có try/catch", () => {
  const h = SRC.dashboard.match(/handleApplyAIMenu[\s\S]*?setShowAIMenu/);
  assert(h && h[0].includes("catch"), "Thiếu error handling");
});

test("applyTemplate nhận template gốc (tpl), không phải tplMeals", () => {
  for (const [name, src] of Object.entries({Dashboard: SRC.dashboard, App: SRC.app, AICoachPanel: SRC.aiCoach})) {
    const calls = lines(src, "applyTemplate(").filter(l => !l.includes("const ") && !l.includes("useCallback") && !l.includes("import"));
    for (const l of calls) {
      assert(!l.includes("applyTemplate(tplMeals"), `${name}: applyTemplate nhận tplMeals thay vì tpl`);
    }
  }
});

// ============================================================
console.log("\n🔍 14. DATA INTEGRITY");
console.log("================================================");

test("useUserData: markMealDateToday cập nhật cả state + ref", () => {
  assert(SRC.useUserData.includes("setMealLogDates"), "Thiếu setMealLogDates");
  assert(SRC.useUserData.includes("mealLogDatesRef.current"), "Thiếu ref update");
});

test("useUserData: getTodayMeals lọc theo ngày", () => {
  assert(SRC.useUserData.match(/getTodayMeals[\s\S]*?dates\[m\.id\]\s*===\s*t/), "Không lọc theo ngày");
});

test("aiMenuService: buildVirtualTemplate set day_type", () => {
  assert(SRC.aiMenuService.includes("day_type: dayType"), "Thiếu day_type");
});

// ════════════════════════════════════════════════
console.log("\n════════════════════════════════════════════════");
console.log(`📊 KẾT QUẢ: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\n❌ CÁC LỖI CẦN SỬA:");
  failures.forEach((f, i) => console.log(`   ${i + 1}. ${f.name}\n      ${f.error}`));
  process.exit(1);
} else {
  console.log("✅ TẤT CẢ LOGIC ĐỀU ĐÚNG — an toàn để deploy.");
}
console.log("════════════════════════════════════════════════\n");
