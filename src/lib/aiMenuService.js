// ============================================================
// AI MENU SERVICE — AI sinh MÓN ĂN THẬT, engine tính macro.
//
// Luồng mới (v2):
// 1. buildMenuPrompt — gửi AI danh sách pattern + food catalog
// 2. AI trả JSON: mỗi bữa = danh sách dishes (tên hiển thị + food key)
// 3. normalizeMenu — validate food keys, fallback về pattern nếu sai
// 4. buildVirtualTemplate — giữ display name qua template
// 5. applyMealEngineToTemplate — engine tính gram (không đổi)
// 6. UI hiển thị DISPLAY NAME (có cách nấu) thay vì food key sống
//
// fruit tách riêng thành dessert — không nhét vào bữa chính.
// Menu lưu localStorage để reload không mất.
// ============================================================

import { LOCAL_FOODS, getFoodRole, getGramLimit } from "./localFoodDB";
import { applyMealEngineToTemplate, splitDayIntoMeals } from "../mealEngine";
import { ALL_MEALS, DEFAULT_MEAL_CONFIG } from "../mealConstants";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { MEAL_PATTERNS, MEAL_TIMES } from "../mealPatterns";
import { supabase } from "./supabase";
import { authFetch } from "./authFetch";

// ============================================================
// DANH SÁCH BỮA THẬT — cùng thứ tự ưu tiên App/Dashboard/AdminPanel
// ============================================================
export function resolveMealIds(dayType, profile, appSettings) {
  let mealConfig;
  if (profile?.mealConfig) {
    mealConfig = profile.mealConfig;
  } else {
    try { mealConfig = appSettings?.meal_config ? JSON.parse(appSettings.meal_config) : DEFAULT_MEAL_CONFIG; }
    catch (e) { mealConfig = DEFAULT_MEAL_CONFIG; }
  }
  return mealConfig[dayType] || DEFAULT_MEAL_CONFIG[dayType];
}

// ============================================================
// QUYỀN DÙNG — 2 lớp: cờ toàn cục + tier user
// ============================================================
export function getAIMenuAccess(profile, appSettings) {
  const flags = parseFeatureFlags(appSettings);
  const tier = profile?.tier || "free";
  const unlocked = tier !== "free";
  return {
    enabled: !!flags.ai_menu_gen,
    locked: !!flags.ai_menu_gen && !unlocked,
    usable: !!flags.ai_menu_gen && unlocked,
  };
}


const DEFAULT_REF_GRAM = { protein: 150, carb: 150, fat: 10, fixed: 100 };

const EXCLUDE_FROM_CATALOG = new Set(["creatine", "bcaa", "nước", "trà xanh", "cà phê", "cà phê đen"]);

// ============================================================
// LỌC DỊ ỨNG
// ============================================================
const ALLERGY_KEYWORD_TO_CAT = {
  "hải sản": ["seafood"], "tôm cá": ["seafood"], "seafood": ["seafood"],
  "tôm": ["seafood"], "cá": ["seafood"], "mực": ["seafood"], "cua": ["seafood"], "sò": ["seafood"],
  "sữa": ["egg_dairy"], "trứng": ["egg_dairy"], "trứng sữa": ["egg_dairy"], "dairy": ["egg_dairy"],
  "đậu phộng": ["nuts"], "hạt": ["nuts"], "nuts": ["nuts"],
  "thịt bò": ["beef"], "bò": ["beef"], "thịt heo": ["pork"], "heo": ["pork"], "thịt lợn": ["pork"],
  "gà": ["poultry"], "thịt gà": ["poultry"], "vịt": ["poultry"],
  "thịt đỏ": ["beef", "pork"],
  "chay": ["seafood", "beef", "pork", "poultry"],
};

export function buildExclusionKeys(avoidText) {
  const excluded = new Set();
  const lower = (avoidText || "").toLowerCase();
  if (!lower.trim()) return excluded;
  const cats = new Set();
  Object.entries(ALLERGY_KEYWORD_TO_CAT).forEach(([kw, catList]) => {
    if (lower.includes(kw)) catList.forEach(c => cats.add(c));
  });
  Object.entries(LOCAL_FOODS).forEach(([key, item]) => {
    if (cats.has(item.cat)) excluded.add(key);
    else if (key.length >= 3 && lower.includes(key)) excluded.add(key);
  });
  return excluded;
}

// ============================================================
// NHÃN HIỂN THỊ
// ============================================================
export function getFoodDisplayCategory(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  const item = LOCAL_FOODS[key];
  if (!item) return "other";
  const role = getFoodRole(key);
  if (role === "protein") return "protein";
  if (role === "carb") return "carb";
  if (item.cat === "veg") return "veg";
  if (item.cat === "fruit") return "fruit";
  if (role === "fat") return "fat";
  return "other";
}

// ============================================================
// PATTERN LIBRARY — dishes format (v2)
// ============================================================

// Sức chứa đạm tối đa của 1 pattern = tổng (trần gram × mật độ đạm) các món protein
// — profile cần nhiều đạm (giảm mỡ 2.2g/kg) mà trúng pattern đạm yếu (trứng, đậu phụ)
// thì engine bị trần gram chặn, hụt hệ thống ~40-50g đạm/ngày.
export function patternProteinCapacity(pattern) {
  let cap = 0;
  for (const d of pattern.dishes || []) {
    const role = d.role || getFoodRole(d.food);
    if (role !== "protein") continue;
    const lim = getGramLimit(d.food);
    const per100 = LOCAL_FOODS[d.food]?.p || 0;
    cap += ((lim?.max || 300) * per100) / 100;
  }
  return cap;
}

// Lọc pattern: dị ứng + không lặp gần đây + đủ sức chứa đạm cho bữa
export function getAvailablePatterns(mealId, exclude, avoidPatternNames, minProteinPerMeal = 0, goalType = null, style = null) {
  const patterns = MEAL_PATTERNS[mealId] || [];
  let result = patterns;

  // ── Style filter: lọc pattern theo phong cách ăn TRƯỚC KHI gửi AI ──
  // Data đã có sẵn metadata (prepMinutes, buyable, composite) — tận dụng
  // để AI chỉ thấy pattern phù hợp, không cần đoán.
  if (style === "easy") {
    // Tiện lợi: mua sẵn HOẶC nấu ≤10 phút HOẶC tô/bát (composite)
    const quick = result.filter(p => p.buyable || (p.prepMinutes && p.prepMinutes <= 10) || p.composite);
    if (quick.length > 0) result = quick;
  } else if (style === "clean") {
    // Eat clean: ưu tiên pattern không có composite (tô bún phở = nhiều carb),
    // và prepMinutes ≤ 20 (eat clean thường nấu nhanh gọn)
    const clean = result.filter(p => !p.composite && (!p.prepMinutes || p.prepMinutes <= 20));
    if (clean.length > 0) result = clean;
  }
  // style === "vn" hoặc null → không lọc thêm, giữ nguyên tất cả

  // Pattern có tag goals chỉ hiện cho đúng mục tiêu (VD whey: bulk+cut, không maintain
  // — người duy trì thường không sắm whey; giảm mỡ NGƯỢC LẠI rất cần đạm rẻ calo)
  if (goalType) {
    result = result.filter(p => !p.goals || p.goals.includes(goalType));
  }
  if (exclude && exclude.size > 0) {
    result = result.filter(p => {
      const foods = (p.dishes || []).map(d => d.food);
      if (p.dessert) foods.push(p.dessert.food);
      return !foods.some(f => exclude.has(f));
    });
  }
  // Lọc theo sức chứa đạm (nhân 0.8 khoan dung — filler + carb phụ gánh phần còn lại).
  // Nếu lọc xong rỗng → giữ nguyên (an toàn hơn là không có gì).
  if (minProteinPerMeal > 0) {
    const strong = result.filter(p => patternProteinCapacity(p) >= minProteinPerMeal * 0.8);
    if (strong.length > 0) result = strong;
  }
  if (avoidPatternNames && avoidPatternNames.size > 0) {
    const still = result.filter(p => !avoidPatternNames.has(p.name));
    result = still.length > 0 ? still : result;
  }
  return result;
}

// ============================================================
// VARIETY
// ============================================================

export function inferPatternFromItems(mealId, items) {
  const patterns = MEAL_PATTERNS[mealId] || [];
  const foodSet = new Set((items || []).map(it => (it.food || "").toLowerCase().trim()));
  const found = patterns.find(p => (p.dishes || []).every(d => foodSet.has(d.food.toLowerCase())));
  return found ? found.name : null;
}

export function getRecentPatternNames(historyRows, days = 3) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const names = new Set();
  (historyRows || []).forEach(row => {
    if (!row.log_date || row.log_date < cutoffStr) return;
    const name = inferPatternFromItems(row.meal_id, row.items);
    if (name) names.add(name);
  });
  return names;
}

// ============================================================
// 1. FOOD CATALOG — gửi AI
// ============================================================
export function buildFoodCatalog(exclude) {
  const byCat = { protein: [], carb: [], veg: [], fruit: [] };
  Object.keys(LOCAL_FOODS).forEach(key => {
    if (EXCLUDE_FROM_CATALOG.has(key)) return;
    if (exclude?.has(key)) return;
    if (LOCAL_FOODS[key].tier === "occasional") return;
    const cat = getFoodDisplayCategory(key);
    if (byCat[cat]) byCat[cat].push(key);
  });
  return [
    `ĐẠM: ${byCat.protein.join(", ")}`,
    `TINH BỘT: ${byCat.carb.join(", ")}`,
    `RAU: ${byCat.veg.join(", ")}`,
    `HOA QUẢ: ${byCat.fruit.join(", ")}`,
  ].join("\n");
}

// ============================================================
// 2. PROMPT — AI sinh món ăn thật, không slot
// ============================================================
function buildMenuPrompt({ profile, macro, dayType, mealIds, prefs, avoidFoods = [], exclude, avoidPatternNames, pNeedByMeal = {}, goalType = null }) {
  const goalLabel = { bulk: "tăng cơ", cut: "giảm mỡ", maintain: "duy trì" }[macro.goal] || "duy trì";
  const mealNames = mealIds
    .map(id => { const m = ALL_MEALS.find(x => x.id === id); return m ? `${id} (${m.name})` : id; })
    .join(", ");
  const target = dayTarget(macro, dayType);

  const prefLines = [];
  if (prefs?.avoid?.trim()) prefLines.push(`- KHÔNG dùng (dị ứng/không ăn): ${prefs.avoid}`);
  if (prefs?.style) {
    const styleMap = {
      vn: "cơm nhà Việt Nam (cơm, canh, món mặn, rau luộc — bữa ăn thật)",
      clean: "eat clean (ức gà nướng, khoai lang, yến mạch, rau xanh — vẫn dùng nguyên liệu Việt)",
      easy: "tiện lợi Việt Nam, ít nấu nướng (trứng luộc, bánh mì Việt, xôi, whey, trái cây, cơm hộp). ƯU TIÊN chọn PATTERN có sẵn (bánh mì trứng, xôi trứng, whey chuối...) — PHẢI là món Việt, KHÔNG dùng sandwich/toast/smoothie/salad",
    };
    prefLines.push(`- Phong cách: ${styleMap[prefs.style] || prefs.style}`);
  }
  if (avoidFoods.length) prefLines.push(`- KHÔNG lặp lại các món: ${avoidFoods.join(", ")}`);

  // Keto/low-carb context: khi user chọn giảm mỡ + keto/low-carb,
  // hướng dẫn AI ưu tiên tinh bột chậm thay vì cơm trắng/bánh phở
  const dietStrategy = profile?.dietStrategy || "balanced";
  if (profile?.goalType === "cut" && dietStrategy !== "balanced") {
    if (dietStrategy === "keto") {
      prefLines.push(`- Chế độ KETO (≤50g carb/ngày): ưu tiên khoai lang, yến mạch, gạo lứt. TRÁNH cơm trắng, bánh phở, bún, bánh mì trắng.`);
    } else if (dietStrategy === "low_carb") {
      prefLines.push(`- Chế độ LOW-CARB (≤100g carb/ngày): ưu tiên tinh bột chậm (khoai lang, gạo lứt, yến mạch). Hạn chế cơm trắng, bánh phở, bún.`);
    }
  }

  const patternLines = mealIds.map(mealId => {
    const patterns = getAvailablePatterns(mealId, exclude, avoidPatternNames, pNeedByMeal[mealId] || 0, goalType, prefs?.style);
    if (patterns.length === 0) return null;
    const pList = patterns.map(p => {
      const dishNames = (p.dishes || []).map(d => d.display).join(", ");
      const dessertStr = p.dessert ? ` + tráng miệng: ${p.dessert.display}` : "";
      return `"${p.name}" (${dishNames}${dessertStr})`;
    }).join("; ");
    return `${mealId}: ${pList}`;
  }).filter(Boolean).join("\n");

  // Style easy: ép chọn pattern, không cho custom → bỏ food catalog
  const showFoodCatalog = prefs?.style !== "easy";

  return `Bạn là chuyên gia dinh dưỡng Việt Nam. Soạn thực đơn 1 ngày (${dayType === "train" ? "ngày tập" : "ngày nghỉ"}) cho:
- Mục tiêu: ${goalLabel}, ~${target.cal} kcal (P${target.p}g/C${target.c}g/F${target.f}g) — hệ thống TỰ tính gram.
${prefLines.length ? prefLines.join("\n") + "\n" : ""}
QUY TẮC:
1. ${prefs?.style === "easy" ? "BẮT BUỘC chọn PATTERN từ danh sách dưới — trả \"pattern\":\"<tên chính xác>\". KHÔNG ĐƯỢC dùng \"custom\". Mọi bữa PHẢI là pattern có sẵn." : "ƯU TIÊN chọn PATTERN từ danh sách dưới — trả \"pattern\":\"<tên chính xác>\", hệ thống tự tra dishes."}
2. ${prefs?.style === "easy" ? "KHÔNG tự soạn món. KHÔNG trả \"pattern\":\"custom\". Chỉ chọn từ danh sách PATTERN bên dưới." : "CHỈ khi không pattern nào hợp mới TỰ SOẠN: trả \"pattern\":\"custom\" kèm \"dishes\" — mỗi dish gồm \"display\" (tên MÓN ĂN có cách nấu: \"Gà luộc\", \"Rau muống xào tỏi\", \"Canh bí đỏ\") và \"food\" (tên NGUYÊN LIỆU CHÍNH XÁC từ danh sách món rời dưới đây)."}
3. BẮT BUỘC 100% món VIỆT NAM thuần (luộc/xào/kho/nướng/hấp/canh/bánh mì Việt/xôi/whey). CẤM TUYỆT ĐỐI món Tây/fusion: salad, pasta, soup kem, smoothie, bowl, steak. "display" không được bỏ trống.
4. Bữa chính: 3-4 món (đạm+carb+rau+canh). Bữa phụ/pre/post: chọn PATTERN trong danh sách (đã có sẵn), chỉ custom khi thật cần.
5. Tráng miệng (fruit) tách riêng: "dessert":{"display":"Chuối","food":"chuối"} — chỉ bữa trưa cần.
6. KHÔNG chọn dầu ăn/mỡ/bơ — hệ thống tự bổ sung.
7. Đa dạng: không lặp protein giữa các bữa.
8. Tạo đúng: ${mealNames}.

QUAN TRỌNG: chỉ trả JSON, KHÔNG viết gì khác. Không giải thích, không markdown.

PATTERN (${prefs?.style === "easy" ? "BẮT BUỘC chọn từ đây" : "ưu tiên"}):
${patternLines || "(không có)"}
${showFoodCatalog ? `
NGUYÊN LIỆU RỜI (chỉ cho custom):
${buildFoodCatalog(exclude)}` : ""}
JSON duy nhất:
{"meals":[{"meal_id":"sang","pattern":"Phở bò"},{"meal_id":"trua","pattern":"${prefs?.style === "easy" ? "Cơm gà nướng" : "custom\",\"dishes\":[{\"display\":\"Cơm trắng\",\"food\":\"cơm trắng\"},{\"display\":\"Gà luộc\",\"food\":\"ức gà luộc\"},{\"display\":\"Rau muống xào\",\"food\":\"rau muống\"},{\"display\":\"Canh bí đỏ\",\"food\":\"bí đỏ\"}],\"dessert\":{\"display\":\"Chuối\",\"food\":\"chuối\"}"}"}],"note":"mô tả ngắn"}`;
}

export function dayTarget(macro, dayType) {
  const isTrain = dayType !== "rest";
  return {
    cal: isTrain ? macro.calTarget : macro.calRest,
    p: macro.protein,
    c: isTrain ? macro.carb : macro.carbRest,
    f: macro.fat,
  };
}

// ============================================================
// 3. GỌI AI
// ============================================================
async function callAI(prompt, { provider, model } = {}) {
  const d = await authFetch("ai-proxy", {
    provider: provider || "claude",
    model: model || "claude-sonnet-5",
    maxTokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  if (d.error) throw new Error(d.error);
  return d.text || "";
}

function parseMenuJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) {
    console.error("parseMenuJSON: no JSON object found in AI response:", clean.slice(0, 200));
    throw new Error("AI không trả JSON hợp lệ");
  }
  const jsonStr = clean.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // JSON bị cắt do maxTokens — thử sửa: đóng ngoặc còn thiếu
    console.warn("parseMenuJSON: JSON.parse failed, attempting truncation fix:", e.message);
    let fixed = jsonStr;
    // Đóng string đang mở
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    // Đếm và đóng ngoặc còn thiếu
    let brackets = 0, braces = 0;
    for (const ch of fixed) {
      if (ch === "[") brackets++;
      else if (ch === "]") brackets--;
      else if (ch === "{") braces++;
      else if (ch === "}") braces--;
    }
    while (brackets > 0) { fixed += "]"; brackets--; }
    while (braces > 0) { fixed += "}"; braces--; }
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      console.error("parseMenuJSON: even truncation fix failed:", e2.message, "original:", jsonStr.slice(0, 300));
      throw new Error("AI không trả JSON hợp lệ");
    }
  }
}

// ============================================================
// 4. NORMALIZE — dishes format (v2)
// ============================================================

const CATALOG_KEYS = Object.keys(LOCAL_FOODS).sort((a, b) => b.length - a.length);

export function matchFoodKey(name) {
  const lower = (name || "").toLowerCase().trim();
  if (!lower) return null;
  if (LOCAL_FOODS[lower]) return lower;
  for (const key of CATALOG_KEYS) {
    if (lower.includes(key) || key.includes(lower)) return key;
  }
  return null;
}

const MAIN_MEALS = new Set(["sang", "trua", "toi"]);

// Filler béo = MÓN VIỆT THẬT có tên (Muối vừng, Lạc rang) — user thấy và ăn
// được, không giấu. Muối vừng/lạc rang là cách ăn kèm cơm kinh điển của VN.
const AUTO_FAT_FILLER = {
  sang: { food: "lạc", display: "Lạc rang" },
  trua: { food: "mè", display: "Muối vừng" },
  toi: { food: "đậu phộng", display: "Lạc rang" },
  phu_sang: { food: "lạc", display: "Lạc rang" },
  phu_chieu: { food: "lạc", display: "Lạc rang" },
  pre: { food: "đậu phộng", display: "Lạc rang" },
  post: { food: "lạc", display: "Lạc rang" },
};

// HARD BLOCK món Tây — display chứa từ này bị coi là không hợp lệ,
// bữa chính rơi về force-pick pattern Việt, bữa phụ fallback tên nguyên liệu.
const NON_VIETNAMESE_DISH_WORDS = [
  "salad", "sandwich", "pasta", "pizza", "burger", "hamburger", "steak",
  "smoothie", "sốt kem", "soup kem", "taco", "sushi", "kimbap", "wrap",
  "toast", "pancake", "waffle", "cereal", "bowl", "salat", "spaghetti",
  "mì ý", "risotto", "lasagna", "hotdog", "bbq kiểu mỹ",
];
export function isVietnameseDish(display) {
  const lower = (display || "").toLowerCase();
  return !NON_VIETNAMESE_DISH_WORDS.some(w => lower.includes(w));
}

// Dựng danh sách dishes từ pattern (v2)
function patternToDishes(pattern) {
  const dishes = (pattern.dishes || []).map(d => ({
    display: d.display, food: d.food, role: d.role || getFoodRole(d.food) || "fixed",
  }));
  return { dishes, dessert: pattern.dessert || null, composite: !!pattern.composite };
}

// Finalize — validate dishes + thêm filler béo
function finalizeMealDishes(mealId, dishes, dessert, errors, skipFiller = false) {
  const isMain = MAIN_MEALS.has(mealId);
  const foods = [];

  for (const d of dishes) {
    const key = matchFoodKey(d.food);
    if (!key) { errors.push(`"${d.food}" không có trong danh sách`); continue; }
    const role = d.role || getFoodRole(key) || "fixed";
    // HARD BLOCK món Tây: display kiểu Tây → thay bằng tên nguyên liệu Việt
    let display = d.display || capitalizeFirst(key);
    if (!isVietnameseDish(display)) {
      errors.push(`"${display}" không phải món Việt`);
      display = capitalizeFirst(key);
    }
    foods.push({ key, role, display });
  }

  if (isMain) {
    const hasProtein = foods.some(f => f.role === "protein");
    const hasCarb = foods.some(f => f.role === "carb");
    if (!hasProtein) errors.push(`Bữa "${mealId}" thiếu món đạm`);
    if (!hasCarb) errors.push(`Bữa "${mealId}" thiếu món tinh bột`);
  } else if (foods.length === 0) {
    errors.push(`Bữa "${mealId}" rỗng`);
  }

  // Filler béo = món Việt thật có tên (Muối vừng, Lạc rang...).
  // CHỈ thêm cho bữa chính dạng CƠM (không có pattern sẵn — pattern đã có
  // đủ thành phần, thêm lạc vào phở/bún/bánh mì = sai văn hoá).
  // KHÔNG thêm cho pre/post/snack — bữa phụ không ai ăn kèm lạc rang.
  const filler = AUTO_FAT_FILLER[mealId];
  const shouldAddFiller = !skipFiller && isMain && filler && LOCAL_FOODS[filler.food]
    && !foods.some(f => f.role === "fat"); // đã có fat item (VD nước dùng) thì thôi
  if (shouldAddFiller) {
    foods.push({ key: filler.food, role: "fat", display: filler.display });
  }

  // Dessert riêng
  let dessertItem = null;
  if (dessert && dessert.food) {
    const dk = matchFoodKey(dessert.food);
    if (dk) dessertItem = { key: dk, role: "fixed", display: dessert.display || capitalizeFirst(dk) };
  }

  return { foods, dessert: dessertItem };
}

// Main normalize — ưu tiên pattern, fallback custom dishes
export function normalizeMenu(raw, mealIds, exclude, avoidPatternNames, pNeedByMeal = {}, goalType = null, style = null) {
  const errors = [];
  const wanted = new Set(mealIds);
  const byId = {};
  (raw?.meals || []).forEach(m => { if (wanted.has(m.meal_id)) byId[m.meal_id] = m; });

  const meals = [];
  for (const mealId of mealIds) {
    const m = byId[mealId];
    if (!m) { errors.push(`Thiếu bữa "${mealId}"`); continue; }

    let dishes = [];
    let dessert = null;
    let usedPattern = null;
    let composite = false;

    const patternName = (m.pattern || "").trim();
    if (patternName && patternName.toLowerCase() !== "custom") {
      const available = getAvailablePatterns(mealId, exclude, avoidPatternNames, pNeedByMeal[mealId] || 0, goalType, style);
      const found = available.find(p => p.name.toLowerCase() === patternName.toLowerCase());
      if (found) {
        const pd = patternToDishes(found);
        dishes = pd.dishes;
        dessert = pd.dessert;
        composite = pd.composite;
        usedPattern = found.name;
      }
    }

    // Custom dishes from AI
    if (!usedPattern && m.dishes && m.dishes.length > 0) {
      dishes = m.dishes.map(d => ({
        display: d.display || d.dish || d.food,
        food: d.food,
        role: d.role || null,
      }));
      if (m.dessert) dessert = m.dessert;
    }

    // Fallback: old items format
    if (!usedPattern && dishes.length === 0 && m.items) {
      dishes = (m.items || []).map(it => ({
        display: it.dish || it.display || it.food || it.name,
        food: it.food || it.name,
        role: null,
      }));
    }

    // HARD BLOCK: bữa chính custom có món Tây → vứt toàn bộ custom,
    // rơi xuống force-pick pattern Việt bên dưới
    if (!usedPattern && (MEAL_PATTERNS[mealId] || []).length > 0 && dishes.length > 0) {
      const hasWestern = dishes.some(d => !isVietnameseDish(d.display));
      if (hasWestern) {
        errors.push(`Bữa "${mealId}" có món không thuần Việt — thay bằng pattern`);
        dishes = [];
        dessert = null;
      }
    }

    // Bữa có pattern library PHẢI ra pattern — nếu AI không chọn, ép 1 pattern
    // ngẫu nhiên (bữa phụ giờ cũng có pattern, hết cảnh AI tự chế món quái)
    if ((MEAL_PATTERNS[mealId] || []).length > 0 && !usedPattern && dishes.length === 0) {
      const available = getAvailablePatterns(mealId, exclude, avoidPatternNames, pNeedByMeal[mealId] || 0, goalType, style);
      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        const pd = patternToDishes(picked);
        dishes = pd.dishes;
        dessert = pd.dessert;
        composite = pd.composite;
        usedPattern = picked.name;
      }
    }

    const finalized = finalizeMealDishes(mealId, dishes, dessert, errors, composite);
    meals.push({
      meal_id: mealId,
      foods: finalized.foods,
      dessert: finalized.dessert,
      pattern: usedPattern,
      composite,
    });
  }

  return errors.length > 2 ? { ok: false, errors, meals } : { ok: true, meals };
}

// ============================================================
// 5. VIRTUAL TEMPLATE → MEAL ENGINE (giữ display name)
// ============================================================

function foodToItem(key, refGram, display, role) {
  const base = LOCAL_FOODS[key];
  if (!base) return null;
  const effRole = role || getFoodRole(key);
  const limit = getGramLimit(key);
  // Clamp refGram NGAY theo gram limit — tránh mật ong 100g (max 30g),
  // dầu ăn 100g (max 30g), hay bất kỳ fixed item nào vượt trần thực tế.
  const raw = refGram ?? DEFAULT_REF_GRAM[effRole] ?? 100;
  const g = Math.min(limit.max, Math.max(limit.min, raw));
  const r = g / 100;
  return {
    food: key, gram: g, unit: "g", qty: 1,
    role: effRole,
    display: display || null,
    p: Math.round(base.p * r * 10) / 10,
    c: Math.round(base.c * r * 10) / 10,
    f: Math.round(base.f * r * 10) / 10,
    fiber: Math.round((base.fiber || 0) * r * 10) / 10,
    cal: Math.round(base.cal * r),
  };
}

// Thứ tự hiển thị tự nhiên cho bữa ăn Việt: cơm → đạm → rau/canh → tráng miệng → filler
export function buildVirtualTemplate(meals, dayType) {
  return {
    name: `AI · ${dayType === "train" ? "Ngày tập" : "Ngày nghỉ"}`,
    day_type: dayType,
    source: "ai",
    meals: meals.map(m => {
      const items = m.foods
        .map(f => foodToItem(f.key, undefined, f.display, f.role))
        .filter(Boolean);
      if (m.dessert) {
        const di = foodToItem(m.dessert.key, undefined, m.dessert.display, "fixed");
        if (di) items.push(di);
      }
      return { meal_id: m.meal_id, items };
    }),
  };
}

function stripZeroGramItems(template) {
  return {
    ...template,
    meals: (template.meals || []).map(m => ({
      ...m, items: (m.items || []).filter(it => it.gram > 0),
    })),
  };
}


// Món đếm nguyên (trứng, lát bánh mì): snap gram về bội số nguyên đơn vị
// SAU engine — không ai ăn 1.5 quả trứng. Macro scale lại theo gram mới.
function snapWholeUnit(item) {
  const unit = DISPLAY_UNIT[(item.food || "").toLowerCase().trim()];
  if (!unit?.whole || !item.gram) return item;
  const qty = Math.max(1, Math.round(item.gram / unit.gramPerUnit));
  const newGram = qty * unit.gramPerUnit;
  if (newGram === item.gram) return item;
  const r = newGram / item.gram;
  return {
    ...item, gram: newGram,
    p: Math.round((item.p || 0) * r * 10) / 10,
    c: Math.round((item.c || 0) * r * 10) / 10,
    f: Math.round((item.f || 0) * r * 10) / 10,
    fiber: Math.round((item.fiber || 0) * r * 10) / 10,
    cal: Math.round((item.cal || 0) * r),
  };
}

// Attach pattern + display names AFTER engine recalculates grams,
// then SORT by Vietnamese meal order (carb → protein → rau → filler)
// Engine reorders by role internally, so sorting before engine is useless.
const DISPLAY_ORDER = { carb: 0, protein: 1, fixed: 2, fat: 9 };

function attachPatternAndDisplay(template, norm) {
  const infoByMealId = {};
  (norm.meals || []).forEach(m => {
    const displayMap = {};
    const roleMap = {};
    (m.foods || []).forEach(f => {
      if (f.display) displayMap[f.key] = f.display;
      if (f.role) roleMap[f.key] = f.role;
    });
    if (m.dessert && m.dessert.display) displayMap[m.dessert.key] = m.dessert.display;
    infoByMealId[m.meal_id] = { pattern: m.pattern, displayMap, roleMap, composite: !!m.composite };
  });
  return {
    ...template,
    meals: (template.meals || []).map(m => {
      const info = infoByMealId[m.meal_id] || {};
      const items = (m.items || []).map(it => snapWholeUnit({
        ...it,
        display: it.display || info.displayMap?.[it.food] || null,
      }));
      // Sort: carb (cơm/bún) → protein (thịt/cá) → fixed (rau/canh) → fat (filler)
      items.sort((a, b) => {
        const ra = DISPLAY_ORDER[a.role || info.roleMap?.[a.food] || getFoodRole(a.food)] ?? 2;
        const rb = DISPLAY_ORDER[b.role || info.roleMap?.[b.food] || getFoodRole(b.food)] ?? 2;
        return ra - rb;
      });
      return { ...m, items, pattern: info.pattern || null, composite: !!info.composite };
    }),
  };
}

// ============================================================
// 6. HÀM CHÍNH — generateMenuAI
// ============================================================

export async function generateMenuAI({ macro, profile, dayType = "train", mealIds, prefs, avoidFoods, avoidPatternNames, appSettings, provider, model }) {
  const access = getAIMenuAccess(profile, appSettings);
  if (!access.usable) {
    return {
      ok: false,
      error: !access.enabled
        ? "Tính năng AI tạo thực đơn đang tạm khoá."
        : "Tính năng AI tạo thực đơn dành cho gói Trial/Premium. Nâng cấp để mở khoá.",
    };
  }

  const prov = provider || appSettings?.ai_provider || "claude";
  const mdl = model || (
    prov === "claude" ? (appSettings?.ai_model || "claude-sonnet-5")
    : prov === "gemini" ? (appSettings?.gemini_model || "gemini-2.5-flash")
    : (appSettings?.gpt_model || "gpt-4o-mini")
  );
  const exclude = buildExclusionKeys(prefs?.avoid);
  const target = dayTarget(macro, dayType);
  // Sức chứa đạm cần thiết mỗi bữa — dùng ĐÚNG cách chia engine dùng,
  // để lọc pattern đạm yếu ngay từ khâu chọn (fix hụt đạm profile giảm mỡ)
  const perMeal = splitDayIntoMeals(target, mealIds);
  const pNeedByMeal = {};
  mealIds.forEach(id => { pNeedByMeal[id] = perMeal[id]?.p || 0; });
  const goalType = macro?.goal || null;
  const prompt = buildMenuPrompt({ profile, macro, dayType, mealIds, prefs, avoidFoods, exclude, avoidPatternNames, pNeedByMeal, goalType });

  let lastErrors = [];
  let bestCandidate = null; // best-of-2: giữ bản lệch target ít nhất
  const localAvoid = new Set(avoidPatternNames || []);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const retryHint = attempt === 0 ? "" :
        `\n\nLẦN TRƯỚC BỊ LỖI: ${lastErrors.join("; ")}. Hãy sửa lại.`;
      const text = await callAI(prompt + retryHint, { provider: prov, model: mdl });
      const raw = parseMenuJSON(text);
      const norm = normalizeMenu(raw, mealIds, exclude, localAvoid, pNeedByMeal, goalType, prefs?.style);
      if (!norm.ok) { lastErrors = norm.errors; continue; }

      const virtualTpl = buildVirtualTemplate(norm.meals, dayType);
      const template = attachPatternAndDisplay(
        stripZeroGramItems(applyMealEngineToTemplate(virtualTpl, target)),
        norm
      );
      const total = sumTemplate(template);
      const dev = target.cal ? Math.abs(total.cal - target.cal) / target.cal : 0;
      if (!bestCandidate || dev < bestCandidate.dev) {
        bestCandidate = { template, note: raw.note || "", dev };
      }
      // Khớp tốt (≤10%) → dùng luôn. Lệch nhiều → thử lại 1 lần với combo
      // pattern khác (avoid pattern vừa dùng), giữ bản nào lệch ít hơn.
      if (dev <= 0.10) return { ok: true, template, note: raw.note || "" };
      norm.meals.forEach(m => { if (m.pattern) localAvoid.add(m.pattern); });
      lastErrors = [`Lệch ${Math.round(dev * 100)}% so với target`];
    } catch (e) {
      lastErrors = [e.message || "Lỗi không xác định"];
    }
  }
  if (bestCandidate) return { ok: true, template: bestCandidate.template, note: bestCandidate.note };
  return { ok: false, error: lastErrors.join("; ") || "AI không tạo được thực đơn hợp lệ" };
}

// ============================================================
// 7. TIỆN ÍCH — đổi món / swap / swap pattern
// ============================================================

export function swapFoodInTemplate(template, mealId, oldFood, newFoodKey, macro, dayType) {
  if (!LOCAL_FOODS[newFoodKey]) return template;

  // Ghi lại display map TOÀN template trước khi chạy engine (engine xoá display)
  const displayByMeal = {};
  (template.meals || []).forEach(m => {
    const map = {};
    (m.items || []).forEach(it => {
      if (it.food === oldFood && m.meal_id === mealId) map[newFoodKey] = capitalizeFirst(newFoodKey);
      else if (it.display !== undefined) map[it.food] = it.display;
    });
    displayByMeal[m.meal_id] = { map, pattern: m.meal_id === mealId ? null : (m.pattern || null) };
  });

  const meals = (template.meals || []).map(m => {
    if (m.meal_id !== mealId) return m;
    const items = (m.items || []).map(it =>
      it.food === oldFood ? foodToItem(newFoodKey, undefined, undefined, it.role) : foodToItem(it.food, it.gram, undefined, it.role)
    );
    return { ...m, items, pattern: null };
  });

  const recomputed = stripZeroGramItems(
    applyMealEngineToTemplate({ ...template, meals }, dayTarget(macro, dayType))
  );

  // Re-attach display + pattern (engine đã xoá) + sort lại đúng thứ tự Việt
  return {
    ...recomputed,
    meals: (recomputed.meals || []).map(m => {
      const info = displayByMeal[m.meal_id] || { map: {}, pattern: null };
      const items = (m.items || []).map(it => snapWholeUnit({
        ...it,
        display: info.map[it.food] !== undefined ? info.map[it.food] : null,
      }));
      items.sort((a, b) => {
        const ra = DISPLAY_ORDER[a.role || getFoodRole(a.food)] ?? 2;
        const rb = DISPLAY_ORDER[b.role || getFoodRole(b.food)] ?? 2;
        return ra - rb;
      });
      return { ...m, pattern: info.pattern, items };
    }),
  };
}

export function getPatternReason(mealId, patternName, goalType) {
  const pattern = (MEAL_PATTERNS[mealId] || []).find(p => p.name === patternName);
  return pattern?.reasonTemplate?.[goalType] || null;
}

export function getSwapCandidates(foodKey, currentMealFoods = []) {
  const cat = getFoodDisplayCategory(foodKey);
  const inMeal = new Set(currentMealFoods);
  return Object.keys(LOCAL_FOODS)
    .filter(k => k !== foodKey && !inMeal.has(k) && !EXCLUDE_FROM_CATALOG.has(k) && getFoodDisplayCategory(k) === cat)
    .sort();
}

// ============================================================
// ĐƠN VỊ TỰ NHIÊN
// ============================================================
const DISPLAY_UNIT = {
  "trứng gà": { unit: "quả", gramPerUnit: 50, whole: true },
  "trứng gà luộc": { unit: "quả", gramPerUnit: 50, whole: true },
  "trứng": { unit: "quả", gramPerUnit: 50, whole: true },
  "trứng luộc": { unit: "quả", gramPerUnit: 50, whole: true },
  "trứng vịt": { unit: "quả", gramPerUnit: 60, whole: true },
  "chuối": { unit: "quả", gramPerUnit: 120 },
  "cam": { unit: "quả", gramPerUnit: 150 },
  "táo": { unit: "quả", gramPerUnit: 150 },
  "ổi": { unit: "quả", gramPerUnit: 150 },
  "dưa leo": { unit: "quả", gramPerUnit: 100 },
  "cà chua": { unit: "quả", gramPerUnit: 80 },
  "khoai lang": { unit: "củ", gramPerUnit: 100 },
  "lạc": { unit: "muỗng", gramPerUnit: 10 },
  "đậu phộng": { unit: "muỗng", gramPerUnit: 10 },
  "mè": { unit: "muỗng", gramPerUnit: 5 },
  "whey": { unit: "muỗng", gramPerUnit: 30, whole: true },
  "bột whey": { unit: "muỗng", gramPerUnit: 30, whole: true },
  "whey isolate": { unit: "muỗng", gramPerUnit: 30, whole: true },
  "casein": { unit: "muỗng", gramPerUnit: 30, whole: true },
  "cơm trắng": { unit: "bát", gramPerUnit: 150 },
  "bún": { unit: "bát", gramPerUnit: 150 },
  "cháo": { unit: "bát", gramPerUnit: 250 },
  "xôi": { unit: "phần", gramPerUnit: 150 },
  "bánh mì": { unit: "lát", gramPerUnit: 40, whole: true },
  "dưa hấu": { unit: "miếng", gramPerUnit: 150 },
};

export function formatFoodPortion(foodKey, gram) {
  const key = (foodKey || "").toLowerCase().trim();
  const unit = DISPLAY_UNIT[key];
  if (!unit || !gram) return `${gram}g`;
  const qty = gram / unit.gramPerUnit;
  const rounded = Math.round(qty * 2) / 2;
  const qtyLabel = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  if (rounded <= 0) return `${gram}g`;
  return `${qtyLabel} ${unit.unit} (${gram}g)`;
}

export function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function sumTemplate(template) {
  const all = (template.meals || []).flatMap(m => m.items || []);
  return {
    cal: Math.round(all.reduce((s, i) => s + (i.cal || 0), 0)),
    p: Math.round(all.reduce((s, i) => s + (i.p || 0), 0) * 10) / 10,
    c: Math.round(all.reduce((s, i) => s + (i.c || 0), 0) * 10) / 10,
    f: Math.round(all.reduce((s, i) => s + (i.f || 0), 0) * 10) / 10,
  };
}

// ============================================================
// 8. PERSISTENCE — lưu menu qua Supabase (mọi thiết bị đều thấy)
// ============================================================

export async function saveAIMenu(template, userId) {
  if (!userId || !template) { console.warn("saveAIMenu: missing userId or template"); return; }
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("ai_menu_cache").upsert({
      user_id: userId,
      menu_date: today,
      template,
    }, { onConflict: "user_id,menu_date" });
    if (error) console.error("saveAIMenu DB error:", error);
    else console.log("✅ AI menu saved to cache:", today);
  } catch (e) { console.error("saveAIMenu error:", e); }
}

export async function loadAIMenu(userId) {
  if (!userId) return null;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("ai_menu_cache")
      .select("template")
      .eq("user_id", userId)
      .eq("menu_date", today)
      .maybeSingle();
    if (error) { console.error("loadAIMenu DB error:", error); return null; }
    if (data) console.log("✅ AI menu restored from cache:", today);
    return data?.template || null;
  } catch (e) { console.error("loadAIMenu error:", e); return null; }
}

export async function clearAIMenu(userId) {
  if (!userId) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("ai_menu_cache").delete().eq("user_id", userId).eq("menu_date", today);
  } catch (e) {}
}
