// ============================================================
// whitelistBuilder.js — AI Menu V2 Bước 3
// Lọc LOCAL_FOODS thành whitelist AI được thấy.
// AI không thể chọn sai thứ nó không nhìn thấy.
// Pipeline: Diet(HARD) → Supplement(HARD) → Style(HARD) →
//           avoidFoods(soft) → cap theo score.
// ============================================================

import { LOCAL_FOODS, getFoodRole, getConvenienceScore, getFoodRegion } from "./localFoodDB";
import { getMealScore, MIN_SLOT_SCORE, STYLE_CRITERIA } from "../mealGrammar";

// Config — không hardcode trong logic, đổi model chỉ chỉnh đây
export const AI_LIMITS = {
  maxWhitelistItems: 110,
};

// Diet HARD filter — tinh bột nhanh bị loại hẳn khỏi tầm nhìn AI
const DIET_BLOCK = {
  keto: ["cơm trắng", "cơm", "cơm gạo lứt", "gạo lứt", "bún", "bánh phở", "xôi", "bánh mì", "bánh mì đen", "mì", "miến", "hủ tiếu", "bánh cuốn", "mì ý", "cháo", "bánh tráng", "đường", "mật ong", "mass gainer", "granola", "granola bar",
    // Composite starch dishes
    "phở bò", "phở gà", "bún bò huế", "bún riêu", "bún chả", "bún thịt nướng",
    "hủ tiếu nam vang", "bánh canh", "mì quảng", "cháo gà", "cháo thịt bằm",
    "xôi xéo", "xôi gà", "xôi lạc", "bánh cuốn nhân thịt", "bánh mì thịt", "cơm tấm", "bún đậu mắm tôm",
  ],
  low_carb: ["cơm trắng", "cơm", "bún", "bánh phở", "xôi", "mì", "hủ tiếu", "mì ý", "đường", "mass gainer"],
};

// Supplement HARD filter — dân VN phổ thông không dùng, mặc định loại
const SUPPLEMENT_KEYS = ["whey", "bột whey", "whey isolate", "mass gainer", "casein", "protein bar", "bcaa", "creatine"];

// Không đưa vào whitelist cho AI chọn (gia vị/dầu/sốt/snack/đồ uống có đường — hệ thống tự thêm hoặc không liên quan menu)
const NEVER_LIST = [
  // Dầu mỡ
  "dầu ăn", "dầu ô liu", "dầu dừa", "dầu mè", "mỡ heo", "bơ thực vật", "margarine",
  // Gia vị / nước chấm
  "nước mắm", "xì dầu", "nước tương", "tương ớt", "tỏi", "gừng", "chanh", "đường",
  "mắm tôm", "mắm nêm", "dầu hào", "muối", "bột nêm", "sa tế", "tiêu", "ớt bột",
  "nghệ bột", "giấm", "tương bần", "nước chấm", "sốt mayonnaise", "sốt cà chua",
  "sốt tương đen", "tương ớt sriracha", "nước mắm pha", "muối tiêu chanh",
  "mỡ hành", "hành phi", "sả", "lá chanh", "lá lốt", "lá giang",
  // Supplement
  "creatine", "bcaa", "omega 3", "dầu cá", "pre workout", "collagen",
  // Snack / bánh kẹo — không gợi ý trong menu
  "bim bim", "kẹo", "kẹo dẻo", "chocolate đen", "chocolate sữa", "bánh quy",
  "khoai tây chiên gói", "bánh gạo", "bánh trung thu", "bánh tráng mè",
  // Đồ uống có đường cao
  "coca cola", "nước ngọt", "nước tăng lực", "bia", "bia hơi", "rượu vang",
  "rượu đế", "rượu nếp", "trà sữa", "trà sữa trân châu", "trà sữa matcha", "soda chanh",
  // Nguyên liệu thô không phải món ăn
  "da gà", "xương heo", "tiết canh", "tóp mỡ", "mỡ heo",
  "gạo nếp", "bột sắn dây", "sữa bột", "sữa đặc", "sữa ông thọ",
  "nước cốt dừa", "kem tươi", "kem whipping", "cream cheese",
  // Phô mai / dairy đặc biệt — không phải món chính
  "phô mai con bò cười", "phô mai mozzarella",
  // Đồ khô / sấy — snack không phải món
  "chuối sấy", "mít sấy", "xoài sấy", "nho khô", "táo đỏ khô",
  "hạt dưa", "hạt hướng dương rang",
  // Mì gói
  "mì gói", "phở gói", "cháo gói", "bún gói",
  // Processed không nên gợi ý menu (user tự thêm nếu muốn)
  "xúc xích", "xúc xích nướng", "xúc xích chiên", "xúc xích xiên que",
  "cá viên chiên", "cá viên", "cá viên curry", "tôm viên",
  "bò viên chiên", "thịt hộp", "cá mòi hộp", "pate gan",
  "chả giò rế", "khô gà lá chanh",
  // Đông lạnh
  "pizza đông lạnh",
  // Gia vị/sốt mới
  "sốt phô mai", "sốt bơ tỏi", "nước mắm tỏi ớt", "nước sốt teriyaki", "sốt bbq",
  // Supplement mới
  "plant protein", "thanh protein", "thanh granola", "protein shake",
  "protein shake sữa", "whey isolate", "casein bột", "glutamine",
  // Snack/candy mới
  "rau câu dừa", "thạch rau câu",
  // Nguyên liệu thô mới
  "hạt kê", "ý dĩ", "hạt bo bo", "bột sắn dây", "gạo nếp",
  "bơ hạnh nhân", "tiết lợn luộc", "tiết canh",
  "lưỡi heo", "cật heo", "lưỡi bò", "tai heo",
  "cá cơm khô", "tôm khô", "mực khô", "cá khô",
  "tôm khô rang", "mực khô nướng", "cá khô chiên", "ruốc tôm",
  // Đồ uống thêm
  "espresso", "americano", "trà hoa cúc", "trà ô long", "trà sen", "trà gừng", "trà atiso",
];

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
  const styleCfg = STYLE_CRITERIA[style] || {};

  let items = [];
  for (const [key, v] of Object.entries(LOCAL_FOODS)) {
    if (never.has(key)) continue;
    if (dietBlock.has(key)) continue;          // HARD
    if (suppBlock.has(key)) continue;          // HARD

    // ---- STYLE HARD FILTERS ----
    // VN: food phải có region ∈ ["vn","both"]
    if (styleCfg.regionFilter) {
      const region = getFoodRegion(key);
      if (!region || !styleCfg.regionFilter.includes(region)) continue;
    }
    // Clean: cat ∈ bannedCats → loại
    if (styleCfg.bannedCats && styleCfg.bannedCats.includes(v.cat)) continue;
    // Clean: thêm block list truyền thống (ba chỉ, đường, processed cụ thể)
    if (style === "clean") {
      const cleanExtra = new Set(["ba chỉ", "ba rọi", "mayonnaise", "đường", "sầu riêng", "bò viên", "mì ý"]);
      if (cleanExtra.has(key)) continue;
    }
    // Easy: convenience < minConvenience → loại
    if (styleCfg.minConvenience && getConvenienceScore(key) < styleCfg.minConvenience) continue;
    // VN: bannedKeys (trưa/tối sẽ check riêng ở validator, nhưng cũng hạ điểm ở đây)
    // Không chặn hoàn toàn vì yến mạch VN sáng vẫn OK cho bữa phụ
    const vnBanned = styleCfg.bannedKeys ? new Set(styleCfg.bannedKeys) : null;

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
    if (v.tier === "occasional") score -= 3; // món đắt — hạ ưu tiên, KHÔNG loại hẳn
    if (goal === "cut" && ["poultry", "seafood", "veg", "egg_dairy"].includes(v.cat)) score += 2;
    if (goal === "bulk" && ["starch", "beef", "pork", "egg_dairy"].includes(v.cat)) score += 2;
    // Bulk: hạ điểm carb low-cal / no lâu (gạo lứt, khoai lang) — bulk cần cơm trắng, mì, năng lượng cao
    const BULK_DEMOTE_CARB = new Set(["cơm gạo lứt", "gạo lứt", "bánh mì đen", "quinoa"]);
    if (goal === "bulk" && BULK_DEMOTE_CARB.has(key)) score -= 4;
    // Cut: nâng điểm carb no lâu (gạo lứt, khoai lang) — cut cần low GI
    const CUT_PREFER_CARB = new Set(["cơm gạo lứt", "gạo lứt", "khoai lang"]);
    if (goal === "cut" && CUT_PREFER_CARB.has(key)) score += 2;
    // VN bannedKeys: hạ điểm mạnh (vẫn trong whitelist nhưng AI ít chọn)
    if (vnBanned && vnBanned.has(key)) score -= 5;

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
