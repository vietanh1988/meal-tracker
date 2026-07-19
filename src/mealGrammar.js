// ============================================================
// mealGrammar.js — SINGLE SOURCE OF TRUTH cho quy tắc bữa ăn
//
// Chứa: SLOT_RULES (quy tắc từng bữa) + CAT_MEAL_SCORE (điểm hợp
// bữa theo nhóm thực phẩm) + getMealScore().
//
// KHÔNG chứa role definitions — role đã tập trung ở localFoodDB.js
// (getFoodRole/ROLE_BY_CAT/ROLE_OVERRIDE, cạnh food data, 3 file
// đang import). Grammar chỉ THAM CHIẾU role, không duplicate.
//
// Ai dùng file này: buildWhitelist, buildScoringPrompt, validateMenu
// (AI Menu V2). Kho mẫu PT + Template đọc dần ở Phase 2.
// ============================================================

import { LOCAL_FOODS, getFoodRole } from "./lib/localFoodDB";

// Re-export để module V2 import 1 chỗ (grammar), không đổi nguồn gốc
export { getFoodRole };

// 4 role engine xử lý — giá trị PHẢI khớp mealEngine.computeMealGram
export const ROLES = ["protein", "carb", "fat", "fixed"];

// ============================================================
// SLOT_RULES — quy tắc từng bữa theo văn hóa ăn Việt Nam
//
// maxDishes:  số món tối đa (validator chặn cứng)
// minDishes:  số món tối thiểu
// need:       role tối thiểu phải có (validator check) —
//             chỉ liệt kê role BẮT BUỘC, không liệt kê optional
// complexity: 1=nhanh/mua sẵn, 2=vừa, 3=bữa nấu đầy đủ
// hint:       1-2 câu cho AI prompt (tiếng Việt, ngắn)
// ============================================================
export const SLOT_RULES = {
  sang: {
    name: "Bữa sáng",
    maxDishes: 3, minDishes: 1,
    need: { protein: 1 },
    complexity: 1,
    hint: "Sáng VN = nhanh/mua sẵn: phở, bún, bánh mì, xôi, cháo, bánh cuốn, trứng luộc + khoai. KHÔNG BAO GIỜ cơm + món mặn + canh (không ai nấu cơm buổi sáng).",
  },
  phu_sang: {
    name: "Bữa phụ sáng",
    maxDishes: 2, minDishes: 1,
    need: {},
    complexity: 1,
    hint: "Ăn nhẹ giữa buổi: sữa chua, trái cây, khoai, ngô, trứng luộc. 1-2 món gọn.",
  },
  trua: {
    name: "Bữa trưa",
    maxDishes: 5, minDishes: 3,
    need: { protein: 1, carb: 1 },
    complexity: 3,
    hint: "Bữa chính đầy đủ: tinh bột + món mặn (đạm) + rau + canh. Tráng miệng trái cây tách riêng.",
  },
  phu_chieu: {
    name: "Bữa phụ chiều",
    maxDishes: 2, minDishes: 1,
    need: {},
    complexity: 1,
    hint: "Ăn nhẹ buổi chiều: sữa chua, trái cây, khoai, ngô. 1-2 món gọn.",
  },
  pre: {
    name: "Trước tập",
    maxDishes: 2, minDishes: 1,
    need: { carb: 1 },
    complexity: 1,
    hint: "Trước tập ~1h: carb nhanh, nhẹ bụng (chuối, bánh mì, khoai lang). Không đồ béo/khó tiêu.",
  },
  post: {
    name: "Sau tập",
    maxDishes: 2, minDishes: 1,
    need: { protein: 1 },
    complexity: 1,
    hint: "Sau tập: đạm phục hồi + carb (trứng, sữa chua, thịt nạc + tinh bột nhanh).",
  },
  toi: {
    name: "Bữa tối",
    maxDishes: 4, minDishes: 2,
    need: { protein: 1 },
    complexity: 2,
    hint: "Bữa chính nhẹ hơn trưa: đạm + rau + canh, tinh bột ít hơn hoặc bỏ nếu low-carb.",
  },
};

// ============================================================
// CAT_MEAL_SCORE — điểm hợp bữa (0-10) theo NHÓM thực phẩm.
// 13 cat × 7 slot. Món đặc biệt lệch khỏi nhóm → mealOverride
// trong entry LOCAL_FOODS (VD cháo: starch nhưng sáng=10).
//
// Ý nghĩa điểm: 10=đặc trưng của bữa · 5=trung tính · ≤2=lạc lõng
// Ngưỡng validator: món trong bữa phải có score ≥ MIN_SLOT_SCORE.
// ============================================================
export const MIN_SLOT_SCORE = 3;

export const CAT_MEAL_SCORE = {
  //            sang phu_sang trua phu_chieu pre post toi
  poultry:    { sang: 5, phu_sang: 1, trua: 10, phu_chieu: 1, pre: 1, post: 7, toi: 9 },
  beef:       { sang: 6, phu_sang: 1, trua: 10, phu_chieu: 1, pre: 1, post: 7, toi: 9 }, // sáng 6: phở bò
  pork:       { sang: 5, phu_sang: 1, trua: 10, phu_chieu: 1, pre: 1, post: 5, toi: 9 }, // sáng 5: bún/bánh mì thịt
  seafood:    { sang: 3, phu_sang: 1, trua: 10, phu_chieu: 1, pre: 1, post: 5, toi: 10 },
  egg_dairy:  { sang: 9, phu_sang: 8, trua: 6, phu_chieu: 8, pre: 3, post: 9, toi: 6 },
  starch:     { sang: 8, phu_sang: 5, trua: 10, phu_chieu: 5, pre: 8, post: 7, toi: 8 }, // cơm sáng: override=1
  veg:        { sang: 3, phu_sang: 2, trua: 10, phu_chieu: 2, pre: 1, post: 2, toi: 10 },
  fruit:      { sang: 6, phu_sang: 9, trua: 7, phu_chieu: 9, pre: 8, post: 7, toi: 5 },
  nuts:       { sang: 4, phu_sang: 6, trua: 5, phu_chieu: 6, pre: 2, post: 3, toi: 5 },
  supp:       { sang: 5, phu_sang: 8, trua: 2, phu_chieu: 8, pre: 5, post: 10, toi: 3 },
  processed:  { sang: 7, phu_sang: 3, trua: 6, phu_chieu: 3, pre: 1, post: 2, toi: 5 }, // sáng 7: bánh mì patê/giò
  sauce:      { sang: 5, phu_sang: 5, trua: 5, phu_chieu: 5, pre: 5, post: 5, toi: 5 }, // gia vị đi kèm, không chặn
  drink:      { sang: 4, phu_sang: 4, trua: 3, phu_chieu: 4, pre: 3, post: 4, toi: 2 },
};

// ============================================================
// getMealScore(foodKey, slotId) → 0-10
// Ưu tiên: mealOverride trong entry LOCAL_FOODS → CAT_MEAL_SCORE
// theo cat → 5 (trung tính) nếu không xác định được.
// ============================================================
export function getMealScore(foodKey, slotId) {
  const key = (foodKey || "").toLowerCase().trim();
  const item = LOCAL_FOODS[key];
  if (!item) return 5;
  if (item.mealOverride && item.mealOverride[slotId] !== undefined) {
    return item.mealOverride[slotId];
  }
  const catScores = CAT_MEAL_SCORE[item.cat];
  if (catScores && catScores[slotId] !== undefined) return catScores[slotId];
  return 5;
}

// ============================================================
// GOAL_RULES — soft: ưu tiên chọn món, KHÔNG cấm
// goal: "cut" | "bulk" | "maintain"
// ============================================================
export const GOAL_RULES = {
  cut: {
    preferLean: true,        // ưu tiên protein nạc (ức gà, cá, trứng trắng)
    preferHighFiber: true,    // ưu tiên rau xơ, carb no lâu
    eveningCarbOptional: true, // tối: carb không bắt buộc
    snackPreferProtein: true, // bữa phụ: ưu tiên protein snack
    penalize: ["processed"],  // hạ điểm processed, fat đậm đặc
  },
  bulk: {
    preferDenseCarb: true,   // ưu tiên carb năng lượng cao (cơm, mì, khoai)
    eveningCarbRequired: true, // tối: carb bắt buộc
    preStrongCarb: true,     // pre: carb mạnh
  },
  maintain: {
    // cân bằng, linh hoạt nhất — không rule đặc biệt
  },
};

// ============================================================
// DIET_RULES — hard: chỉ áp khi goal = "cut"
// diet: "balanced" | "low_carb" | "keto"
// ============================================================
export const DIET_RULES = {
  balanced: {
    // giữ P/C/F theo tỷ lệ chuẩn, không rule đặc biệt
  },
  low_carb: {
    noEveningCarb: true,       // tối: KHÔNG carb (role=carb)
    noCarbSnack: true,         // bữa phụ: KHÔNG carb
    preferLowGI: true,         // trưa: ưu tiên low GI (khoai lang, gạo lứt)
    preAllowLightCarb: true,   // pre-workout: vẫn cho carb nhẹ
  },
  keto: {
    maxCarbPerDay: 50,         // budget ≤50g carb/ngày — check ở engine dry-run
    noStarchWhitelist: true,   // loại cat=starch khỏi whitelist
    breakfastNoStandaloneCarb: true, // sáng: trứng + protein, không standalone tinh bột
    preAllowLightCarb: true,   // pre vẫn cho carb nhẹ
  },
};

// ============================================================
// STYLE_CRITERIA — hard: filter whitelist + validate combo
// style: "vn" | "easy" | "clean"
// ============================================================
export const STYLE_CRITERIA = {
  vn: {
    regionFilter: ["vn", "both"],  // food phải có region ∈ ["vn","both"]
    breakfastComplexity: 1,        // sáng: standalone dish, complexity ≤ 1
    mealStructure: { trua: ["carb","protein","veg"], toi: ["protein","veg"] },
    bannedKeys: ["granola", "yến mạch", "pasta", "quinoa"], // trưa/tối
  },
  easy: {
    minConvenience: 7,             // food phải có convenience ≥ 7
    breakfastMinConvenience: 8,    // sáng: convenience ≥ 8
    allowProcessed: true,          // cho phép processed nếu convenience cao
    maxDishesOverride: { trua: 3, toi: 3, sang: 2 },
  },
  clean: {
    bannedCats: ["processed"],     // cat ≠ "processed"
    cleanBlockedModifiers: ["chiên", "rán", "chiên giòn", "tẩm bột chiên", "quay"],
    mealStructure: { trua: ["carb","protein","veg"], toi: ["protein","veg"] },
    preferWholeGrain: true,        // carb ưu tiên whole grain
    cleanSafeFat: ["dầu ô liu", "bơ (avocado)", "hạt chia"], // fat filler cho clean
  },
};

// ============================================================
// BASE_RULES — áp tất cả trường hợp (validator dùng)
// ============================================================
export const BASE_RULES = {
  maxCarbPerMeal: 1,          // max 1 role=carb per bữa chính
  maxVegPerMeal: 2,           // max 2 cat=veg per bữa (rau + canh OK)
  maxProteinPerMeal: 2,       // max 2 role=protein per bữa (1 chính + 1 phụ)
  maxStandalonePerMeal: 1,    // max 1 standalone dish per bữa
  noDuplicateProteinGroup: true, // trưa gà → tối không gà
};

// ============================================================
// mergeRules(goal, diet, style) → object tổng hợp tất cả rules
// Consumer: promptBuilderV2, menuValidatorV2, buildWhitelist
// ============================================================
export function mergeRules(goal, diet, style) {
  const g = GOAL_RULES[goal] || GOAL_RULES.maintain || {};
  // diet chỉ áp khi goal = cut
  const d = goal === "cut" ? (DIET_RULES[diet] || DIET_RULES.balanced || {}) : {};
  const s = STYLE_CRITERIA[style] || STYLE_CRITERIA.vn || {};
  return {
    base: { ...BASE_RULES },
    goal: { ...g },
    diet: { ...d },
    style: { ...s },
    // Convenience: merged maxDishes (style override > slot default)
    getMaxDishes: (slotId) => {
      if (s.maxDishesOverride && s.maxDishesOverride[slotId]) return s.maxDishesOverride[slotId];
      return SLOT_RULES[slotId]?.maxDishes || 4;
    },
    // Convenience: check if carb allowed in slot
    isSlotCarbAllowed: (slotId) => {
      if (d.noEveningCarb && slotId === "toi") return false;
      if (d.noCarbSnack && (slotId === "phu_sang" || slotId === "phu_chieu")) return false;
      return true;
    },
  };
}
