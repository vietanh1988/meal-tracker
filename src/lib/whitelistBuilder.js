// ============================================================
// whitelistBuilder.js — AI Menu V2 Bước 3
// Lọc LOCAL_FOODS thành whitelist AI được thấy.
// AI không thể chọn sai thứ nó không nhìn thấy.
// Pipeline: Diet(HARD) → Supplement(HARD) → Style(ngưỡng) →
//           avoidFoods(soft) → cap theo score.
// ============================================================

import { LOCAL_FOODS, getFoodRole, getConvenienceScore } from "./localFoodDB";
import { getMealScore, MIN_SLOT_SCORE } from "../mealGrammar";

// Config — không hardcode trong logic, đổi model chỉ chỉnh đây
export const AI_LIMITS = {
  maxWhitelistItems: 110,
  easyConvenienceMin: 6,
};

// Diet HARD filter — tinh bột nhanh bị loại hẳn khỏi tầm nhìn AI
const DIET_BLOCK = {
  keto: ["cơm trắng", "cơm", "cơm gạo lứt", "gạo lứt", "bún", "bánh phở", "xôi", "bánh mì", "bánh mì đen", "mì", "miến", "hủ tiếu", "bánh cuốn", "mì ý", "cháo", "bánh tráng", "đường", "mật ong", "mass gainer", "granola", "granola bar"],
  low_carb: ["cơm trắng", "cơm", "bún", "bánh phở", "xôi", "mì", "hủ tiếu", "mì ý", "đường", "mass gainer"],
};

// Supplement HARD filter — dân VN phổ thông không dùng, mặc định loại
const SUPPLEMENT_KEYS = ["whey", "bột whey", "whey isolate", "mass gainer", "casein", "protein bar", "bcaa", "creatine"];

// Clean style — loại đồ chiên/chế biến sẵn/béo nặng
const CLEAN_BLOCK = ["xúc xích", "giò", "chả lụa", "chả", "nem", "patê", "ba chỉ", "ba rọi", "bò viên", "mayonnaise", "đường", "cánh gà", "mì ý", "sầu riêng"];

// Không đưa vào whitelist cho AI chọn (gia vị/dầu — hệ thống tự thêm)
const NEVER_LIST = ["dầu ăn", "dầu ô liu", "dầu dừa", "dầu mè", "nước mắm", "xì dầu", "nước tương", "tương ớt", "tỏi", "gừng", "chanh", "đường", "creatine", "bcaa"];

/**
 * buildWhitelist({ style, diet, goal, usesSupplements, avoidFoods, mealIds })
 * → { items: [{key, display?, role, cal, p, c, f, slots:{...score}}], count }
 * Chỉ trả key + macro + score — display do hệ thống tra sau, AI không cần.
 */
export function buildWhitelist({ style = null, diet = "balanced", goal = null, usesSupplements = false, avoidFoods = [], mealIds = [] } = {}) {
  const dietBlock = new Set(DIET_BLOCK[diet] || []);
  const avoid = new Set((avoidFoods || []).map(s => (s || "").toLowerCase().trim()));
  const never = new Set(NEVER_LIST);
  const suppBlock = usesSupplements ? new Set() : new Set(SUPPLEMENT_KEYS);
  const cleanBlock = style === "clean" ? new Set(CLEAN_BLOCK) : new Set();

  let items = [];
  for (const [key, v] of Object.entries(LOCAL_FOODS)) {
    if (never.has(key)) continue;
    if (dietBlock.has(key)) continue;          // HARD
    if (suppBlock.has(key)) continue;          // HARD
    if (cleanBlock.has(key)) continue;         // SEMI (clean)
    if (style === "easy" && getConvenienceScore(key) < AI_LIMITS.easyConvenienceMin) continue; // SEMI (easy ngưỡng)

    // Score per slot (chỉ slot đang cần) — AI + validator dùng chung
    const slots = {};
    let maxSlotScore = 0;
    (mealIds || []).forEach(m => {
      const s = getMealScore(key, m);
      slots[m] = s;
      if (s > maxSlotScore) maxSlotScore = s;
    });
    // Món không hợp bữa nào đang cần (mọi slot < ngưỡng) → bỏ
    if (mealIds.length > 0 && maxSlotScore < MIN_SLOT_SCORE) continue;

    // Tổng score để cap: hợp bữa + tiện lợi + goal hint + tránh món cũ
    let score = maxSlotScore + getConvenienceScore(key) * (style === "easy" ? 1 : 0.3);
    if (avoid.has(key)) score -= 6; // soft — vừa ăn gần đây, hạ ưu tiên
    if (v.tier === "occasional") score -= 3; // món đắt (cá hồi, hạt điều...) — hạ ưu tiên, KHÔNG loại hẳn
    if (goal === "cut" && ["poultry", "seafood", "veg", "egg_dairy"].includes(v.cat)) score += 2;
    if (goal === "bulk" && ["starch", "beef", "pork", "egg_dairy"].includes(v.cat)) score += 2;

    items.push({ key, role: getFoodRole(key), cal: v.cal, p: v.p, c: v.c, f: v.f, slots, _score: score });
  }

  // Cap — prompt không bao giờ phụ thuộc size FoodDB
  if (items.length > AI_LIMITS.maxWhitelistItems) {
    // Giữ cân bằng: rau có quota RIÊNG (không để trái cây conv cao
    // đá rau văng khỏi nhóm fixed — bữa chính VN bắt buộc có rau/canh)
    items.sort((a, b) => b._score - a._score);
    const group = it => it.role === "fixed"
      ? (LOCAL_FOODS[it.key]?.cat === "veg" ? "veg" : "fixedOther")
      : it.role;
    const byGroup = { protein: [], carb: [], veg: [], fixedOther: [], fat: [] };
    items.forEach(it => byGroup[group(it)]?.push(it));
    const quota = { protein: 0.32, carb: 0.22, veg: 0.20, fixedOther: 0.16, fat: 0.10 };
    const capped = [];
    Object.entries(quota).forEach(([g, q]) => {
      capped.push(...byGroup[g].slice(0, Math.ceil(AI_LIMITS.maxWhitelistItems * q)));
    });
    items = capped.slice(0, AI_LIMITS.maxWhitelistItems);
  }

  items.forEach(it => delete it._score);
  return { items, count: items.length };
}
