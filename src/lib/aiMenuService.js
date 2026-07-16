// ============================================================
// AI MENU SERVICE — V2: AI chỉ là Food Selector.
//
// Pipeline:
// 1. buildWhitelist   — CODE lọc food theo diet/style/supplement TRƯỚC
// 2. buildPromptV2    — scoring rubric, AI CHỈ trả food key
// 3. validateMenuV2   — key/slot/diversity, feedback cụ thể để retry
// 4. AUTO_FAT_FILLER  — thêm lạc/vừng cho bữa chính (engine cần fat)
// 5. Engine dry-run   — mealEngine chạy thật, checkDryRun đo lệch
// 6. DISPLAY_MAP      — CODE đặt tên món, AI không bao giờ đặt tên
//
// Grammar (slot rules, meal score): src/mealGrammar.js
// Menu lưu Supabase (saveAIMenu) để reload không mất.
// ============================================================

import { LOCAL_FOODS, getFoodRole, getGramLimit, getFoodDisplay, isStandaloneDish } from "./localFoodDB";
import { buildWhitelist } from "./whitelistBuilder";
import { buildPromptV2 } from "./promptBuilderV2";
import { validateMenuV2, checkDryRun } from "./menuValidatorV2";
import { applyMealEngineToTemplate } from "../mealEngine";
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

// V2 variety: lấy FOOD KEY đã ăn gần đây (thay pattern name) —
// whitelist builder hạ ưu tiên các key này để menu mới khác menu cũ.
// Chỉ lấy nguồn chính (protein/carb) — rau/gia vị lặp lại là bình thường.
export function getRecentFoodKeys(historyRows, days = 3) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const keys = new Set();
  (historyRows || []).forEach(row => {
    if (!row.log_date || row.log_date < cutoffStr) return;
    (row.items || []).forEach(it => {
      const k = (it.food || "").toLowerCase().trim();
      if (!k) return;
      const role = getFoodRole(k);
      if (role === "protein" || role === "carb") keys.add(k);
    });
  });
  return keys;
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
async function callAI(prompt, { provider, model } = {}, _retriesLeft = 1) {
  const d = await authFetch("ai-proxy", {
    provider: provider || "claude",
    model: model || "claude-sonnet-5",
    maxTokens: 1800, // đủ buffer JSON (whitelist gọn sau khi bỏ macro dư thừa)
                     // không quá cao để tránh cost lãng phí nếu model verbose
    feature: "menu_gen",
    messages: [{ role: "user", content: prompt }],
  });
  if (d.error) {
    const err = new Error(d.error);
    // Server chặn bởi quota (403, vĩnh viễn trong phiên này) — khác lỗi
    // mạng/API tạm thời. Đánh dấu để tầng gọi ngoài KHÔNG retry vô ích
    // (biết chắc lần sau vẫn bị chặn y hệt, tốn round-trip không cần).
    if (d.quotaExceeded) err.quotaExceeded = true;
    throw err;
  }
  const text = d.text || "";
  // Response rỗng = lỗi tạm thời phía provider (rate limit/overload không set
  // d.error rõ ràng) — retry NGAY LẬP TỨC, không tính vào vòng validate-feedback.
  if (!text.trim() && _retriesLeft > 0) {
    console.warn("[AI Menu V2] callAI: response rỗng (lỗi tạm thời) — retry ngay");
    return callAI(prompt, { provider, model }, _retriesLeft - 1);
  }
  return text;
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

const MAIN_MEALS = new Set(["sang", "trua", "toi"]);

const AUTO_FAT_FILLER = {
  sang: { food: "lạc", display: "Lạc rang" },
  trua: { food: "mè", display: "Muối vừng" },
  toi: { food: "đậu phộng", display: "Lạc rang" },
  phu_sang: { food: "lạc", display: "Lạc rang" },
  phu_chieu: { food: "lạc", display: "Lạc rang" },
  pre: { food: "đậu phộng", display: "Lạc rang" },
  post: { food: "lạc", display: "Lạc rang" },
};

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
  // ===== V2 PIPELINE: whitelist → scoring prompt → validate → engine dry-run =====
  const target = dayTarget(macro, dayType);
  const goalType = macro?.goal || profile?.goalType || null;
  const diet = macro?.dietStrategy || profile?.dietStrategy || "balanced";

  // Whitelist: code lọc TRƯỚC — AI không thấy được nguyên liệu sai.
  // avoid dị ứng (prefs.avoid) cũng chặn cứng khỏi whitelist.
  const exclude = buildExclusionKeys(prefs?.avoid);
  const whitelist = buildWhitelist({
    style: prefs?.style || null,
    diet,
    goal: goalType,
    usesSupplements: profile?.usesSupplements === true,
    avoidFoods: avoidFoods || [],
    mealIds,
  });
  whitelist.items = whitelist.items.filter(it => !exclude.has(it.key));

  const prompt = buildPromptV2({ profile, target, dayType, mealIds, whitelist, prefs: prefs || {}, avoidFoods: avoidFoods || [] });

  let lastErrors = [];
  let bestCandidate = null; // best-of-2: giữ bản lệch target ít nhất
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const retryHint = attempt === 0 ? "" :
        `\n\nLẦN TRƯỚC BỊ LỖI — SỬA CHÍNH XÁC THEO TỪNG DÒNG SAU:\n- ${lastErrors.join("\n- ")}`;
      const text = await callAI(prompt + retryHint, { provider: prov, model: mdl });
      const raw = parseMenuJSON(text);

      // Lớp 1: key ∈ whitelist, slot rules, diversity — feedback cụ thể
      const val = validateMenuV2(raw, { mealIds, whitelist });
      if (!val.ok && val.meals.every(m => m.foods.length === 0)) {
        lastErrors = val.errors; continue;
      }

      // Convert sang norm shape — display do CODE tra (AI không đặt tên)
      const normMeals = val.meals.map(m => {
        const foods = m.foods.map(k => ({ key: k, display: getFoodDisplay(k), role: getFoodRole(k) }));
        // Fat filler: bữa chính thêm lạc/vừng (món VN thật, có tên) —
        // engine cần nhóm fat để scale, thiếu là hụt fat cả ngày.
        // BỎ QUA nếu:
        // - Bữa có standalone dish (phở/bún/cháo — trọn suất, không kèm lạc)
        // - Filler food nằm trong danh sách avoid (dị ứng đậu phộng/lạc)
        // - Style = clean (lạc rang = đồ chế biến)
        const hasStandalone = foods.some(f => isStandaloneDish(f.key));
        const filler = AUTO_FAT_FILLER[m.meal_id];
        const avoidSet = new Set((avoidFoods || []).map(s => (s || "").toLowerCase().trim()));
        const styleId = prefs?.style || null;
        const fillerBlocked = !filler || hasStandalone
          || avoidSet.has(filler.food)
          || styleId === "clean";
        if (MAIN_MEALS.has(m.meal_id) && !fillerBlocked && !foods.some(f => f.role === "fat")) {
          foods.push({ key: filler.food, display: filler.display, role: "fat" });
        }
        return {
          meal_id: m.meal_id,
          foods,
          dessert: m.dessert ? { key: m.dessert, display: getFoodDisplay(m.dessert) } : null,
          pattern: null, composite: false,
        };
      });

      // Lớp 2: ENGINE DRY-RUN — chạy thật, số thật, không capacity engine riêng
      const virtualTpl = buildVirtualTemplate(normMeals, dayType);
      const template = attachPatternAndDisplay(
        stripZeroGramItems(applyMealEngineToTemplate(virtualTpl, target)),
        { meals: normMeals }
      );
      const total = sumTemplate(template);
      const dry = checkDryRun(total, target);
      const dev = target.cal ? Math.abs(total.cal - target.cal) / target.cal : 0;

      if (!bestCandidate || dev < bestCandidate.dev) {
        bestCandidate = { template, note: raw.note || "", dev };
      }
      if (val.ok && dry.ok) return { ok: true, template, note: raw.note || "" };
      lastErrors = [...val.errors, ...dry.errors];
    } catch (e) {
      if (e.quotaExceeded) return { ok: false, error: e.message }; // vĩnh viễn — dừng ngay, không thử lại
      lastErrors = [e.message || "Lỗi không xác định"];
    }
  }
  if (bestCandidate) return { ok: true, template: bestCandidate.template, note: bestCandidate.note };
  console.warn("[AI Menu V2] fail detail:", lastErrors.join(" | "));
  return { ok: false, error: "AI chưa tạo được thực đơn phù hợp. Bấm Thử lại — mỗi lần tạo sẽ ra kết quả khác nhau." };
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
      if (it.food === oldFood && m.meal_id === mealId) map[newFoodKey] = getFoodDisplay(newFoodKey);
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

export function getSwapCandidates(foodKey, currentMealFoods = [], allowedKeys = null) {
  const cat = getFoodDisplayCategory(foodKey);
  const inMeal = new Set(currentMealFoods);
  return Object.keys(LOCAL_FOODS)
    .filter(k => k !== foodKey && !inMeal.has(k) && !EXCLUDE_FROM_CATALOG.has(k) && getFoodDisplayCategory(k) === cat
      && (!allowedKeys || allowedKeys.has(k)))  // tôn trọng diet/style/supplement — không gợi ý món whitelist đã chặn
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
