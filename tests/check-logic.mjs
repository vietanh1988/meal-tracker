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
// 8. Màn mobile (MobileApp) thiếu props cho AIMenuGenerator
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
  mobile:        read("src/mobile/MobileApp.jsx"),
  menuScreen:    read("src/mobile/MenuScreen.jsx"),
  mobileView:    read("src/lib/mobileView.js"),
  aiCoach:       read("src/AICoachPanel.jsx"),
  onboarding:    read("src/OnboardingWizard.jsx"),
  adminPanel:    read("src/AdminPanel.jsx"),
  mealsTab:      read("src/adminTabs/MealsTab.jsx"),
  useUserData:   read("src/hooks/useUserData.js"),
  aiMenuService: read("src/lib/aiMenuService.js"),
  mealGrammar:   read("src/mealGrammar.js"),
  localFoodDB:   read("src/lib/localFoodDB.js"),
  whitelist:     read("src/lib/whitelistBuilder.js"),
  promptV2:      read("src/lib/promptBuilderV2.js"),
  validatorV2:   read("src/lib/menuValidatorV2.js"),
  useProfile:    read("src/hooks/useProfile.js"),
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
  "MobileApp":     SRC.mobile,
  "App":           SRC.app,
  "AICoachPanel":  SRC.aiCoach,
  "OnboardingWizard": SRC.onboarding,
  "MealsTab":      SRC.mealsTab,
  "MenuScreen":    SRC.menuScreen,
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

test("Onboarding: thực đơn đầu tiên chỉ áp hôm nay, KHÔNG lưu ngầm vào Lặp lại hằng tuần (14/10)", () => {
  assert(!SRC.onboarding.includes("saveWeeklyTemplate("), "OnboardingWizard vẫn gọi saveWeeklyTemplate");
});

test("MobileApp: áp thực đơn AI KHÔNG tự lưu ngầm vào Lịch tuần (chốt 13/10)", () => {
  const i = SRC.mobile.indexOf("const applyAIMenu");
  const body = SRC.mobile.slice(i, SRC.mobile.indexOf("closeLayer();", i));
  assert(i > 0 && !body.includes("saveWeeklyTemplate"), "applyAIMenu vẫn gọi saveWeeklyTemplate");
});

// ============================================================
console.log("\n🔍 2. tplMeals — GIỮ composite + pattern");
console.log("================================================");

for (const [name, src] of Object.entries({
  MobileApp: SRC.mobile, App: SRC.app,
  AICoachPanel: SRC.aiCoach, OnboardingWizard: SRC.onboarding,
})) {
  if (!src.includes("tplMeals")) continue;
  test(`${name}: tplMeals giữ composite + pattern`, () => {
    const flat = src.replace(/\s+/g, "");
    assert(flat.includes("composite:!!m.composite"), `${name} thiếu composite`);
    assert(flat.includes("pattern:m.pattern"), `${name} thiếu pattern`);
  });
}

// ============================================================
console.log("\n🔍 3. Auto-apply — 1 chỗ duy nhất (App), chỉ khi hôm nay chưa có bữa");
console.log("================================================");

test("App: auto-apply chỉ khi nhật ký hôm nay trống, 1 lần/ngày", () => {
  assert(SRC.app.includes("if(hasMealsToday())return;"), "Thiếu check hôm nay đã có bữa");
  assert(SRC.app.includes("autoAppliedRef"), "Thiếu chặn apply lặp");
});
test("MobileApp: KHÔNG tự auto-apply (tránh apply 2 lần)", () => {
  assert(!/useEffect\([^]*?applyTemplate\(/.test(SRC.mobile.split("applyAIMenu")[0]), "MobileApp tự gọi applyTemplate trong useEffect");
});

// ============================================================
console.log("\n🔍 4. AppDialogHost — MOBILE + PC");
console.log("================================================");

test("App: import AppDialogHost", () => {
  assert(SRC.app.includes("AppDialogHost"), "Thiếu import");
});

test("App: AppDialogHost trong mobile layout", () => {
  // Mobile render <MobileApp>, AppDialogHost nằm trong MobileApp
  assert(SRC.app.split("PC LAYOUT")[0].includes("<MobileApp") && SRC.mobile.includes("<AppDialogHost"), "Mobile thiếu → confirm/alert treo");
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
console.log("\n🔍 8. MobileApp — AIMenuGenerator PROPS");
console.log("================================================");

test("MobileApp: lấy getMealHistory từ useUserData (ud)", () => {
  assert(SRC.mobile.includes("getMealHistory={ud.getMealHistory}"), "Thiếu getMealHistory");
});

test("MobileApp: màn Thực đơn AI nhận loại ngày hôm nay + lịch sử ăn (tránh lặp món)", () => {
  const gen = SRC.mobile.match(/<AIMenuScreen[^>]+>/);
  assert(gen, "Không tìm thấy AIMenuScreen");
  assert(gen[0].includes("todayType"), "Thiếu todayType");
  assert(gen[0].includes("getDailyLogs"), "Thiếu getDailyLogs");
});

// ============================================================
console.log("\n🔍 9. App.jsx — TRUYỀN DỮ LIỆU CHO MobileApp");
console.log("================================================");

test("App: MobileApp nhận toàn bộ useUserData (ud)", () => {
  assert(SRC.app.includes("const ud=useUserData(user?.id)"), "App phải giữ object useUserData");
  const block = SRC.app.slice(SRC.app.indexOf("<MobileApp "), SRC.app.indexOf("<MobileApp ") + 600);
  assert(block.includes("ud={ud}"), "Thiếu ud={ud}");
});

test("MobileApp: ghi daily_logs chỉ qua hàm của useUserData", () => {
  assert(!/supabase\.from\(["']daily_logs/.test(SRC.mobile), "MobileApp ghi thẳng daily_logs");
  for (const fn of ["saveMealToCloud", "toggleEaten", "removeDayMeal", "moveDayMeal", "addWater", "applyTemplate", "saveWeeklyTemplate"]) {
    assert(SRC.mobile.includes("ud." + fn), `Thiếu ud.${fn}`);
  }
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
  assert(SRC.mealCard.includes("item.display||getFoodDisplay(item.food)"), "Thiếu display fallback qua DISPLAY_MAP");
});

test("MealCard: hiện pattern + compact view", () => {
  assert(SRC.mealCard.includes("meal.pattern") || SRC.mealCard.includes("patternName"), "Thiếu pattern");
  assert(SRC.mealCard.includes("composite") || SRC.mealCard.includes("showCompact"), "Thiếu compact view");
});

// ============================================================
console.log("\n🔍 12. SYNC dayType SAU APPLY");
console.log("================================================");

test("MobileApp: loại ngày tính theo lịch tập (dayTypeOf), không chọn tay", () => {
  assert(SRC.mobile.includes("dayTypeOf(profile, date)"), "Không dùng dayTypeOf");
  assert(SRC.mobileView.includes("isGymDate("), "dayTypeOf phải dùng isGymDate");
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

test("MobileApp: applyAIMenu có try/catch", () => {
  const h = SRC.mobile.match(/const applyAIMenu[\s\S]*?closeLayer\(\);/);
  assert(h && h[0].includes("catch"), "Thiếu error handling");
});

test("applyTemplate nhận template gốc (tpl), không phải tplMeals", () => {
  for (const [name, src] of Object.entries({MobileApp: SRC.mobile, App: SRC.app, AICoachPanel: SRC.aiCoach})) {
    const calls = lines(src, "applyTemplate(").filter(l => !l.includes("const ") && !l.includes("useCallback") && !l.includes("import"));
    for (const l of calls) {
      assert(!l.includes("applyTemplate(tplMeals"), `${name}: applyTemplate nhận tplMeals thay vì tpl`);
    }
  }
});

// ============================================================
console.log("\n🔍 14. DATA INTEGRITY");
console.log("================================================");

test("useUserData: getTodayMeals đọc từ nhật ký hôm nay (daily_logs, giờ VN)", () => {
  assert(SRC.useUserData.match(/getTodayMeals[\s\S]*?toSlots\(todayLogCurrent\(\)/), "getTodayMeals phải đọc todayLog");
  assert(SRC.useUserData.includes("todayVN"), "Phải dùng ngày VN");
});

test("useUserData: ghi daily_logs qua hàng đợi tuần tự", () => {
  assert(SRC.useUserData.includes("dayQueueRef"), "Thiếu hàng đợi ghi");
});

test("Không dùng ngày UTC cho 'hôm nay' ở các màn chính", () => {
  for (const k of ["app", "mobile", "mobileView", "useUserData"]) {
    assert(!/new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/.test(SRC[k]), `${k} còn dùng ngày UTC`);
    assert(!/new Date\(\)\.getDay\(\)/.test(SRC[k]), `${k} còn dùng getDay() máy`);
  }
});

test("aiMenuService: buildVirtualTemplate set day_type", () => {
  assert(SRC.aiMenuService.includes("day_type: dayType"), "Thiếu day_type");
});

// ============================================================
console.log("\n🔍 15. fetchAllData — KHÔI PHỤC pattern + composite SAU RELOAD");
console.log("================================================");

test("useUserData: import inferPatternFromItems", () => {
  assert(SRC.useUserData.includes("inferPatternFromItems"), "Thiếu import → pattern mất sau reload");
});

test("useUserData: import MEAL_PATTERNS", () => {
  assert(SRC.useUserData.includes("MEAL_PATTERNS"), "Thiếu import → composite mất sau reload");
});

test("useUserData: fetchAllData gọi inferPatternFromItems khi load meals", () => {
  assert(SRC.useUserData.includes("inferPatternFromItems(m.id"),
    "fetchAllData không khôi phục pattern → MealCard hiện nguyên liệu thay vì tên món sau reload");
});

test("useUserData: fetchAllData set m.composite từ MEAL_PATTERNS", () => {
  assert(SRC.useUserData.includes("m.composite") && SRC.useUserData.includes("found.composite"),
    "fetchAllData không khôi phục composite → tô/bún hiện dạng xổ thay vì gọn sau reload");
});

// ============================================================
console.log("\n🔍 16. AI MENU V2 — grammar, whitelist, prompt, validator");
console.log("================================================");

test("mealGrammar: SLOT_RULES đủ 7 bữa + CAT_MEAL_SCORE 13 cat", () => {
  ["sang","phu_sang","trua","phu_chieu","pre","post","toi"].forEach(s =>
    assert(SRC.mealGrammar.includes(`${s}:`), `Thiếu slot ${s}`));
  assert(SRC.mealGrammar.includes("CAT_MEAL_SCORE") && SRC.mealGrammar.includes("getMealScore"),
    "Thiếu CAT_MEAL_SCORE/getMealScore");
});

test("localFoodDB: metadata V2 — mealOverride, convenience, DISPLAY_MAP", () => {
  assert(SRC.localFoodDB.includes("MEAL_OVERRIDE_DATA"), "Thiếu mealOverride");
  assert(SRC.localFoodDB.includes('"cơm trắng":     { sang: 1, pre: 2 }'), "Cơm bữa sáng phải bị chặn (sang:1)");
  assert(SRC.localFoodDB.includes("getConvenienceScore"), "Thiếu convenience score");
  assert(SRC.localFoodDB.includes("DISPLAY_MAP") && SRC.localFoodDB.includes("getFoodDisplay"),
    "Thiếu DISPLAY_MAP — AI không được đặt tên món");
});

test("whitelistBuilder: diet/supplement HARD filter + cap", () => {
  assert(SRC.whitelist.includes("DIET_BLOCK") && SRC.whitelist.includes("keto"),
    "Thiếu diet hard filter");
  assert(SRC.whitelist.includes("SUPPLEMENT_KEYS") && SRC.whitelist.includes("usesSupplements"),
    "Whey phải mặc định loại, chỉ vào khi usesSupplements");
  assert(SRC.whitelist.includes("maxWhitelistItems"),
    "Thiếu cap — prompt sẽ phụ thuộc size FoodDB");
});

test("promptBuilderV2: scoring rubric + AI chỉ trả food key", () => {
  assert(SRC.promptV2.includes("P1.") && SRC.promptV2.includes("35đ"),
    "Thiếu priority + bảng điểm");
  assert(SRC.promptV2.includes("KHÔNG viết ra nháp") || SRC.promptV2.includes("Trả lời NGAY bằng JSON"),
    "Prompt phải cấm AI viết reasoning hiển thị (không có scratchpad riêng, tốn maxTokens)");
  assert(!SRC.promptV2.includes('"display"'), "Prompt không được yêu cầu AI trả display");
});

test("validatorV2: key/slot/diversity + dry-run feedback số thật", () => {
  assert(SRC.validatorV2.includes("nearestKey"), "Thiếu gợi ý key gần nhất khi retry");
  assert(SRC.validatorV2.includes("MIN_SLOT_SCORE"), "Thiếu chặn món lạc bữa (cơm bữa sáng)");
  assert(SRC.validatorV2.includes("checkDryRun") && SRC.validatorV2.includes("MACRO_TOLERANCE"),
    "Thiếu dry-run check");
});

test("generateMenuAI: pipeline V2 + fat filler + display từ CODE", () => {
  assert(SRC.aiMenuService.includes("buildWhitelist(") && SRC.aiMenuService.includes("buildPromptV2("),
    "generateMenuAI chưa chạy pipeline V2");
  assert(SRC.aiMenuService.includes("validateMenuV2(") && SRC.aiMenuService.includes("checkDryRun("),
    "Thiếu validate + dry-run");
  assert(SRC.aiMenuService.includes("AUTO_FAT_FILLER[m.meal_id]"),
    "Thiếu fat filler → engine hụt fat cả ngày");
  assert(SRC.aiMenuService.includes("getFoodDisplay(k)"),
    "Display phải do CODE tra, không phải AI");
  assert(!SRC.aiMenuService.includes("function buildMenuPrompt") && !SRC.aiMenuService.includes("function normalizeMenu"),
    "Code cũ chưa dọn — buildMenuPrompt/normalizeMenu phải xoá");
});

test("useProfile: usesSupplements sync 2 chiều với DB", () => {
  assert(SRC.useProfile.includes("data.uses_supplements"), "Thiếu load uses_supplements");
  assert(SRC.useProfile.includes("payload.uses_supplements"), "Thiếu save uses_supplements");
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
console.log("════════════════════════════════════════════════");
