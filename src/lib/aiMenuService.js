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

import { LOCAL_FOODS, getFoodRole, getGramLimit, getFoodDisplay, isStandaloneDish, lookupLocalFood } from "./localFoodDB";
import { todayVN, addDays } from "./dateVN";
import { buildWhitelist } from "./whitelistBuilder";
import { exclusionKeys, avoidMatcher } from "./allergy.js";
import { buildPromptV2 } from "./promptBuilderV2";
import { validateMenuV2, checkDryRun } from "./menuValidatorV2";
import { buildSlotPlan, resolveSlotAnswers } from "./slotTemplates";
import { buildPromptV3, parseSlotJSON } from "./promptBuilderV3";
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
  let ids = mealConfig[dayType] || DEFAULT_MEAL_CONFIG[dayType];
  // exerciseType=none → loại bỏ pre/post-workout
  if (profile?.exerciseType === "none") {
    ids = ids.filter(id => id !== "pre" && id !== "post");
  }
  return ids;
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
// Khớp theo từ + nhóm món — xem src/lib/allergy.js (có test)
export function buildExclusionKeys(avoidText) {
  return exclusionKeys(avoidText, LOCAL_FOODS);
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
  const cutoffStr = addDays(todayVN(), -days);
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
  const cutoffStr = addDays(todayVN(), -days);
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
    // 18/10: KHÔNG dùng regex lookbehind — Safari < 16.4 (iPhone cũ) báo lỗi cú pháp khi tải cả app → màn trắng
    let quoteCount = 0;
    for (let i = 0; i < fixed.length; i++) if (fixed[i] === '"' && fixed[i - 1] !== "\\") quoteCount++;
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

export function foodToItem(key, refGram, display, role) {
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

// Sàn gram đạm bữa chính — bulk/ăn thật cần thịt/cá đủ chất, engine chia mỏng
// (VD cá hấp 80g = 16g đạm quá ít). Nâng thịt/cá < 120g lên 140g, scale macro.
// Trứng/đậu phụ bỏ qua (đạm phụ, có snapWholeUnit riêng).
function enforceProteinFloor(template, target = null) {
  // (16/10) Mục tiêu ngày thấp (< 1.800 kcal, VD nữ giảm mỡ) không ép 140 g thịt/cá mỗi bữa — làm bữa tối dư 30%+
  if (target && (target.cal || 0) < 1800) return template;
  const meals = (template.meals || []).map(m => {
    if (!MAIN_MEALS.has(m.meal_id)) return m;
    const items = (m.items || []).map(it => {
      const name = (it.food || "").toLowerCase();
      if (it.role !== "protein" || !it.gram || it.gram >= 120) return it;
      if (name.includes("trứng") || name.includes("đậu phụ") || name.includes("đậu hũ")) return it;
      const r = 140 / it.gram;
      return {
        ...it, gram: 140,
        p: Math.round((it.p || 0) * r * 10) / 10,
        c: Math.round((it.c || 0) * r * 10) / 10,
        f: Math.round((it.f || 0) * r * 10) / 10,
        fiber: Math.round((it.fiber || 0) * r * 10) / 10,
        cal: Math.round((it.cal || 0) * r),
      };
    });
    return { ...m, items };
  });
  return { ...template, meals };
}

// ============================================================
// BÙ CALO TỪNG BỮA (rà thuật toán 16/10)
// Mô phỏng 8 kiểu hồ sơ × 3 phong cách: thực đơn thiếu TB 14–25% calo (phong cách Tiện lợi 25–39%), vì
//  - bữa 1 món (1 tô phở/cháo) chạm trần gram, bữa phụ chỉ có món béo nhỏ (lạc 10 g), mealEngine không có
//    món tinh bột để bù; ngày nghỉ 3 bữa không có bữa phụ để nhét món bù cũ.
// Cách bù (sau mealEngine, trước khi trả về):
//  1) bữa thiếu > max(60 kcal, 10%) → tăng khẩu phần món sẵn có tới trần gram: tinh bột trước (bỏ qua khi
//     low-carb/keto), rồi món đạm;
//  2) vẫn thiếu → thêm tối đa 2 món kèm hợp bữa (trứng, sữa, chuối, khoai, bánh mì…), lọc theo kiêng/dị ứng,
//     kiểu ăn (low-carb/keto chỉ món ít tinh bột) và món đã có; gram theo phần còn thiếu, trong khoảng hợp lý.
// ============================================================
const SIDES = {
  sang: [["trứng gà luộc", 50, 100], ["sữa tươi", 200, 300], ["bánh mì", 50, 100], ["chuối", 100, 200], ["sữa chua hy lạp", 100, 200], ["quả bơ", 80, 150]],
  phu_sang: [["sữa chua", 100, 200], ["chuối", 100, 200], ["hạt điều", 15, 30], ["sữa chua hy lạp", 100, 200], ["quả bơ", 80, 150]],
  phu_chieu: [["sữa chua", 100, 200], ["chuối", 100, 200], ["hạt điều", 15, 30], ["sữa chua hy lạp", 100, 200], ["quả bơ", 80, 150]],
  pre: [["chuối", 100, 250], ["khoai lang luộc", 150, 300], ["bánh mì", 50, 100], ["sữa chua", 100, 200], ["sữa chua hy lạp", 100, 200], ["hạt điều", 15, 30]],
  post: [["sữa tươi", 200, 400], ["chuối", 100, 200], ["trứng gà luộc", 50, 100], ["sữa chua hy lạp", 100, 200], ["hạt điều", 15, 30]],
  trua: [["trứng gà luộc", 50, 100], ["đậu phụ", 100, 200], ["khoai lang luộc", 100, 250], ["chuối", 100, 150], ["quả bơ", 80, 150]],
  toi: [["trứng gà luộc", 50, 100], ["đậu phụ", 100, 200], ["khoai lang luộc", 100, 250], ["sữa chua", 100, 200], ["quả bơ", 80, 150]],
};
const scaleTo = (it, g) => {
  const r = g / (it.gram || 1);
  const r1 = (x) => Math.round((Number(x) || 0) * r * 10) / 10;
  return { ...it, gram: g, p: r1(it.p), c: r1(it.c), f: r1(it.f), fiber: r1(it.fiber), cal: Math.round((Number(it.cal) || 0) * r) };
};
// Số bữa trong ngày đã có món cùng "họ" (từ đầu: trứng, sữa, chuối…) — món kèm không lặp quá 2 bữa/ngày
const familyOf = (key) => String(key || "").toLowerCase().split(" ")[0];
const mealsWithFamily = (meals, key) => meals.filter(m => (m.items || []).some(i => familyOf(i.food) === familyOf(key))).length;
export function topUpMeals(template, target, { diet = "balanced", avoidText = "", avoidKeys = null } = {}) {
  const meals = template.meals || [];
  const per = splitDayIntoMeals(target, meals.map(m => m.meal_id));
  const lowCarb = diet === "low_carb" || diet === "keto";
  const banned = avoidKeys || buildExclusionKeys(avoidText);
  const isAvoided = avoidMatcher(avoidText);
  const calOf = (items) => items.reduce((a, i) => a + (Number(i.cal) || 0), 0);
  const addedFam = {};
  const out = meals.map(m => {
    const t = per[m.meal_id];
    if (!t || !t.cal) return m;
    let items = [...(m.items || [])];
    const thr = () => Math.max(60, t.cal * 0.1);
    let gap = t.cal - calOf(items);
    // 0) bữa dư > max(80 kcal, 15%) → giảm khẩu phần về gần mục tiêu: tinh bột → béo → đạm (đạm không dưới
    //    mức đạm của bữa), không dưới sàn gram của món
    if (-gap > Math.max(80, t.cal * 0.15)) {
      for (const role of ["carb", "fat", "protein"]) {
        if (-gap <= t.cal * 0.05) break;
        items = items.map(it => {
          if (-gap <= t.cal * 0.05 || (it.role || getFoodRole(it.food)) !== role || !it.gram || !it.cal) return it;
          const min = getGramLimit(it.food).min || 0;
          const perG = it.cal / it.gram;
          let cut = Math.min(it.gram - min, Math.ceil(-gap / perG));
          if (role === "protein") {
            const pNow = items.reduce((a, i) => a + (Number(i.p) || 0), 0);
            const pPerG = (Number(it.p) || 0) / it.gram;
            if (pPerG > 0) cut = Math.min(cut, Math.floor(Math.max(0, pNow - t.p) / pPerG));
          }
          if (cut <= 4) return it;
          const next = snapWholeUnit(scaleTo(it, Math.max(min, Math.round((it.gram - cut) / 5) * 5)));
          gap += it.cal - next.cal;
          return next;
        });
      }
      return { ...m, items };
    }
    if (gap <= thr()) return m;
    // 1) tăng khẩu phần món sẵn có
    for (const role of lowCarb ? ["protein"] : ["carb", "protein"]) {
      if (gap <= thr() * 0.5) break;
      items = items.map(it => {
        if (gap <= thr() * 0.5 || (it.role || getFoodRole(it.food)) !== role || !it.gram || !it.cal) return it;
        const max = getGramLimit(it.food).max;
        const perG = it.cal / it.gram;
        const add = Math.min(max - it.gram, Math.ceil(gap / perG));
        if (add <= 4) return it;
        const g = Math.round((it.gram + add) / 5) * 5;
        const next = scaleTo(it, Math.min(max, g));
        gap -= next.cal - it.cal;
        return next;
      });
    }
    // 2) thêm món kèm
    let added = 0;
    for (const [key, gMin, gMax] of SIDES[m.meal_id] || []) {
      if (gap <= thr() || added >= 2) break;
      const base = LOCAL_FOODS[key];
      if (!base || banned.has(key) || isAvoided(key)) continue;
      if (lowCarb && base.c > 15) continue;
      if (diet === "keto" && base.c > 9) continue;
      if (items.some(i => i.food === key || familyOf(i.food) === familyOf(key))) continue;
      if (mealsWithFamily(meals, key) + (addedFam[familyOf(key)] || 0) >= 2) continue;
      const g = Math.max(gMin, Math.min(gMax, Math.round((gap / base.cal) * 100 / 10) * 10));
      const it = foodToItem(key, g, getFoodDisplay(key), getFoodRole(key));
      if (!it) continue;
      const snapped = snapWholeUnit(it);
      items.push(snapped);
      gap -= snapped.cal;
      added++;
      addedFam[familyOf(key)] = (addedFam[familyOf(key)] || 0) + 1;
    }
    return { ...m, items };
  });
  return trimDay(balanceProtein({ ...template, meals: out }, per, { banned, isAvoided, diet }), target, diet);
}

// Cả ngày còn dư > 8% (mục tiêu thấp, nhiều bữa: sàn gram 1 tô / 1 bát làm dư) → bớt đều tinh bột rồi béo
// (keto/low-carb: béo trước) ở mọi bữa, cho xuống tới 75% sàn gram ("tô nhỏ", "lưng bát"); đạm giữ nguyên.
// Chốt cuối (16/10): tổng ngày vẫn lệch > 15% → co/giãn đều mọi món (giữ trong khoảng gram cho phép) cho về sát mục tiêu.
// Thà đạm hơi lệch còn hơn đưa thực đơn dư/thiếu 40–60% calo.
// Đạm dư > 30% (hay gặp ở Eat clean / tăng cơ: +40–60%) → bớt món đạm về ~115%, bù calo bằng tinh bột (16/10)
export function capProtein(template, target, diet = "balanced") {
  const all = (template.meals || []).flatMap((m) => m.items || []);
  const P = all.reduce((a, i) => a + (Number(i.p) || 0), 0);
  if (!target?.p || P <= target.p * 1.3) return template;
  const roleOf = (it) => it.role || getFoodRole(it.food);
  const protP = all.filter((i) => roleOf(i) === "protein").reduce((a, i) => a + (Number(i.p) || 0), 0);
  if (protP <= 0) return template;
  const k = Math.max(0.6, 1 - (P - target.p * 1.15) / protP);
  let lost = 0;
  let meals = (template.meals || []).map((m) => ({ ...m, items: (m.items || []).map((it) => {
    if (roleOf(it) !== "protein" || !it.gram || !it.cal) return it;
    const lim = getGramLimit(it.food) || {};
    const g = Math.max(Math.ceil(lim.min || 0), Math.round((it.gram * k) / 5) * 5);
    if (it.gram - g < 5) return it;
    const next = snapWholeUnit(scaleTo(it, g));
    lost += (Number(it.cal) || 0) - (Number(next.cal) || 0);
    return next;
  }) }));
  if (lost > 0 && diet !== "keto" && diet !== "low_carb") {
    const carbCal = meals.flatMap((m) => m.items).filter((i) => roleOf(i) === "carb").reduce((a, i) => a + (Number(i.cal) || 0), 0);
    if (carbCal > 0) {
      const kc = 1 + lost / carbCal;
      meals = meals.map((m) => ({ ...m, items: m.items.map((it) => {
        if (roleOf(it) !== "carb" || !it.gram || !it.cal) return it;
        const lim = getGramLimit(it.food) || {};
        const g = Math.min(lim.max || 3000, Math.round((it.gram * kc) / 5) * 5);
        return g - it.gram < 5 ? it : snapWholeUnit(scaleTo(it, g));
      }) }));
    }
  }
  return { ...template, meals };
}

export function fitDayCal(template, target, diet = "balanced") {
  const t = Number(target?.cal) || 0;
  const sum = (tp) => (tp.meals || []).reduce((a, m) => a + (m.items || []).reduce((b, i) => b + (Number(i.cal) || 0), 0), 0);
  if (!t) return template;
  for (let pass = 0; pass < 3; pass++) {
    const cal = sum(template);
    if (!cal || Math.abs(cal - t) <= t * 0.05) break;
    const k = t / cal;
    template = { ...template, meals: (template.meals || []).map((m) => ({ ...m, items: (m.items || []).map((it) => {
      if (!it.gram || !it.cal) return it;
      // keto / low-carb: thiếu calo thì không nở thêm món tinh bột (giữ trần tinh bột)
      if (k > 1 && (diet === "keto" || diet === "low_carb") && (it.role || getFoodRole(it.food)) === "carb") return it;
      const lim = getGramLimit(it.food) || {};
      const lo = Math.max(5, (lim.min || 0) * 0.75), hi = lim.max || 3000;
      const g = Math.min(hi, Math.max(lo, Math.round((it.gram * k) / 5) * 5));
      return Math.abs(g - it.gram) < 5 ? it : snapWholeUnit(scaleTo(it, g));
    }) })) };
  }
  return template;
}

function trimDay(template, target, diet) {
  const tot = () => (template.meals || []).reduce((a, m) => a + (m.items || []).reduce((b, i) => b + (Number(i.cal) || 0), 0), 0);
  let over = tot() - (target.cal || 0) * 1.03;
  if (!target.cal || over <= (target.cal || 0) * 0.05) return template;
  // Cuối cùng mới cắt món đạm (keto hay ra ba chỉ/trứng 300 g → dư 40–70%), nhưng giữ tổng đạm ≥ 95% mục tiêu
  const totP = () => (template.meals || []).reduce((a, m) => a + (m.items || []).reduce((b, i) => b + (Number(i.p) || 0), 0), 0);
  for (const role of [...(diet === "keto" || diet === "low_carb" ? ["fat", "carb"] : ["carb", "fat"]), "protein"]) {
    if (over <= 0) break;
    const pool = [];
    (template.meals || []).forEach((m, mi) => (m.items || []).forEach((it, ii) => { if ((it.role || getFoodRole(it.food)) === role && it.gram && it.cal) pool.push([mi, ii]); }));
    const room = pool.reduce((a, [mi, ii]) => { const it = template.meals[mi].items[ii]; const min = (getGramLimit(it.food).min || 0) * 0.75; return a + Math.max(0, it.cal - (it.cal / it.gram) * min); }, 0);
    if (room <= 0) continue;
    let k = Math.min(1, over / room);
    if (role === "protein") {
      const pRoom = pool.reduce((a, [mi, ii]) => { const it = template.meals[mi].items[ii]; const min = (getGramLimit(it.food).min || 0) * 0.75; return a + Math.max(0, (Number(it.p) || 0) * (1 - min / it.gram)); }, 0);
      const slack = totP() - (target.p || 0) * 0.95;
      if (pRoom <= 0) break;
      if (slack > 0) k = Math.min(k, slack / pRoom);
      else {
        // Đạm đã thiếu mà calo vẫn dư > 25% (món đạm nhiều mỡ chạm trần 300 g) → chịu thiếu đạm, kéo calo về ~115%
        const hard = tot() - (target.cal || 0) * 1.15;
        if (tot() <= (target.cal || 0) * 1.25 || hard <= 0) break;
        k = Math.min(1, hard / room);
      }
    }
    const meals = template.meals.map(m => ({ ...m, items: [...m.items] }));
    for (const [mi, ii] of pool) {
      const it = meals[mi].items[ii];
      const min = (getGramLimit(it.food).min || 0) * 0.75;
      const perG = it.cal / it.gram;
      const cutCal = Math.max(0, it.cal - perG * min) * k;
      const g = Math.max(Math.ceil(min), Math.round((it.gram - cutCal / perG) / 5) * 5);
      if (it.gram - g < 5) continue;
      const next = snapWholeUnit(scaleTo(it, g));
      over -= it.cal - next.cal;
      meals[mi].items[ii] = next;
    }
    template = { ...template, meals };
  }
  return template;
}

// Bữa đủ calo nhưng thiếu đạm nặng (< 70% đạm của bữa — hay gặp ở món trọn suất phở/bún/cơm tấm khi giảm mỡ):
// thêm 1 món đạm kèm rồi giảm tinh bột tương ứng để giữ calo (rà 16/10)
const PROTEIN_SIDES = {
  sang: [["trứng gà luộc", 50, 150], ["sữa chua hy lạp", 100, 200], ["sữa đậu nành", 200, 400], ["đậu phụ", 100, 200]],
  phu_sang: [["sữa chua hy lạp", 100, 200], ["trứng gà luộc", 50, 100], ["sữa đậu nành", 200, 300]],
  phu_chieu: [["sữa chua hy lạp", 100, 200], ["trứng gà luộc", 50, 100], ["sữa đậu nành", 200, 300]],
  pre: [["sữa chua hy lạp", 100, 200], ["sữa đậu nành", 200, 300]],
  post: [["sữa chua hy lạp", 100, 250], ["trứng gà luộc", 50, 150], ["sữa đậu nành", 200, 400]],
  trua: [["ức gà luộc", 80, 150], ["trứng gà luộc", 50, 150], ["đậu phụ", 100, 250], ["tempeh", 80, 150]],
  toi: [["ức gà luộc", 80, 150], ["trứng gà luộc", 50, 150], ["đậu phụ", 100, 250], ["tempeh", 80, 150]],
};
function balanceProtein(template, per, { banned, isAvoided, diet }) {
  const sum = (items, k) => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);
  return {
    ...template,
    meals: (template.meals || []).map(m => {
      const t = per[m.meal_id];
      if (!t || !t.p) return m;
      let items = [...(m.items || [])];
      let pGap = t.p - sum(items, "p");
      // 16/10: ngưỡng 30% → 15% (giảm mỡ calo thấp thiếu đạm 13–18%, ăn chay chỉ 60–70%)
      if (pGap < Math.max(6, t.p * 0.15)) return m;
      // Trước hết nở món đạm sẵn có trong bữa (gọn hơn thêm món), tới trần gram
      items = items.map(it => {
        if (pGap <= 3 || (it.role || getFoodRole(it.food)) !== "protein" || !it.gram || !(Number(it.p) > 0)) return it;
        const max = getGramLimit(it.food).max || it.gram;
        const want = Math.min(max, Math.round((it.gram * (1 + pGap / it.p)) / 10) * 10);
        if (want - it.gram < 10) return it;
        const next = snapWholeUnit(scaleTo(it, want));
        pGap -= (Number(next.p) || 0) - (Number(it.p) || 0);
        return next;
      });
      for (const [key, gMin, gMax] of pGap >= Math.max(6, t.p * 0.15) ? PROTEIN_SIDES[m.meal_id] || [] : []) {
        const base = LOCAL_FOODS[key];
        if (!base || !base.p || banned.has(key) || isAvoided(key) || items.some(i => familyOf(i.food) === familyOf(key))) continue;
        if (mealsWithFamily(template.meals || [], key) >= 2) continue;
        const g = Math.max(gMin, Math.min(gMax, Math.round((pGap / base.p) * 100 / 10) * 10));
        const it = foodToItem(key, g, getFoodDisplay(key), "protein");
        if (!it) continue;
        items.push(snapWholeUnit(it));
        break;
      }
      // giữ calo: bớt tinh bột (keto/low-carb thì bớt béo) về gần mục tiêu bữa
      let over = sum(items, "cal") - t.cal * 1.05;
      for (const role of diet === "keto" || diet === "low_carb" ? ["fat", "carb"] : ["carb", "fat"]) {
        if (over <= 0) break;
        items = items.map(it => {
          if (over <= 0 || (it.role || getFoodRole(it.food)) !== role || !it.gram || !it.cal) return it;
          const min = getGramLimit(it.food).min || 0;
          const cut = Math.min(it.gram - min, Math.ceil(over / (it.cal / it.gram)));
          if (cut <= 4) return it;
          const next = scaleTo(it, Math.max(min, Math.round((it.gram - cut) / 5) * 5));
          over -= it.cal - next.cal;
          return next;
        });
      }
      return { ...m, items };
    }),
  };
}

// ============================================================
// 6. HÀM CHÍNH — generateMenuAI
// ============================================================

// SLOT MODE: code quyết cấu trúc bữa, AI chỉ chọn món điền slot.
// KHÔNG BAO GIỜ FAIL — AI trả sai/lệch → resolver tự fallback món đầu pool.
const USE_SLOT_MODE = true;

async function generateMenuSlotMode({ target, dayType, mealIds, prefs, avoidFoods, diet, goal, prov, mdl }) {
  const style = prefs?.style || "vn";
  const exclude = buildExclusionKeys(prefs?.avoid);
  const avoidAll = [...(avoidFoods || []), ...exclude];

  // 1. Build plan: slot + pool đã shuffle (goal: bulk=cơm trắng, cut=gạo lứt/khoai)
  const plan = buildSlotPlan(style, mealIds, { diet, avoidFoods: avoidAll, poolSize: 10, goal });
  if (plan.length === 0) return null; // style/mealIds không có template → fallback V2

  // 2. Prompt + gọi AI (1 lần duy nhất — sai thì resolver tự fix, không retry)
  let answers = {};
  try {
    const prompt = buildPromptV3(plan, { style, dayType, avoidRecent: avoidFoods || [] });
    const text = await callAI(prompt, { provider: prov, model: mdl });
    answers = parseSlotJSON(text);
  } catch (e) {
    if (e.quotaExceeded) throw e; // quota — ném lên trên xử lý
    console.warn("[Slot Mode] callAI lỗi, dùng fallback pool:", e.message);
    // answers = {} → resolver lấy món đầu mỗi pool (đã shuffle → vẫn đa dạng)
  }

  // 3. Resolve: enforce rules (đạm khác nhóm, không trùng) + fallback an toàn
  const mealFoods = resolveSlotAnswers(plan, answers);

  // 4. Convert sang norm shape (giống V2)
  const normMeals = Object.entries(mealFoods).map(([meal_id, foods]) => ({
    meal_id,
    foods: foods.map((k) => {
      const lookup = lookupLocalFood(k, 100);
      const baseKey = lookup?.key || k;
      const display = getFoodDisplay(k) !== k ? getFoodDisplay(k) : k.charAt(0).toUpperCase() + k.slice(1);
      return { key: baseKey, display, role: getFoodRole(baseKey), cookKey: lookup?.cookKey || null, fullName: k };
    }),
    dessert: null, pattern: null, composite: false,
  }));

  return normMeals;
}

async function generateMenuAIRaw({ macro, profile, dayType = "train", mealIds, prefs, avoidFoods, avoidPatternNames, appSettings, provider, model }) {
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

  // ===== SLOT MODE (V3): code quyết cấu trúc, AI chỉ chọn món =====
  if (USE_SLOT_MODE) {
    try {
      const normMeals = await generateMenuSlotMode({ target, dayType, mealIds, prefs, avoidFoods, diet, goal: goalType, prov, mdl });
      if (normMeals && normMeals.length > 0) {
        const avoidSet = new Set([...(avoidFoods || []).map(s => (s || "").toLowerCase().trim()), ...buildExclusionKeys(prefs?.avoid)]); // món vừa ăn + món dị ứng/kiêng (cả món độn thêm)
        const styleId = prefs?.style || null;

        // Engine dry-run lần 1 — đo fat gap
        const virtualTpl1 = buildVirtualTemplate(normMeals, dayType);
        const template1 = stripZeroGramItems(applyMealEngineToTemplate(virtualTpl1, target));
        const total1 = sumTemplate(template1);

        // Fat filler (giữ logic V2)
        const fatGap = (target.f || 0) - (total1.f || 0);
        const fillerSlots = fatGap >= 5 ? (fatGap > 30 ? 3 : fatGap > 15 ? 2 : 1) : 0;
        if (fillerSlots > 0) {
          let filled = 0;
          for (const m of normMeals) {
            if (filled >= fillerSlots) break;
            if (!MAIN_MEALS.has(m.meal_id)) continue;
            if (m.foods.some(f => isStandaloneDish(f.key))) continue;
            const filler = AUTO_FAT_FILLER[m.meal_id];
            if (!filler || avoidSet.has(filler.food) || styleId === "clean") continue;
            if (m.foods.some(f => f.key === filler.food)) continue;
            m.foods.push({ key: filler.food, display: filler.display, role: "fat" });
            filled++;
          }
        }

        // (16/10) Bỏ bước nhét lạc/bơ đậu phộng vào bữa phụ khi thiếu calo — topUpMeals bù đúng từng bữa, hợp kiểu ăn.

        // Engine dry-run cuối
        const virtualTpl = buildVirtualTemplate(normMeals, dayType);
        const template = topUpMeals(attachPatternAndDisplay(
          enforceProteinFloor(stripZeroGramItems(applyMealEngineToTemplate(virtualTpl, target)), target),
          { meals: normMeals }
        ), target, { diet, avoidText: prefs?.avoid || "" });
        return { ok: true, template, note: "" };
      }
    } catch (e) {
      if (e.quotaExceeded) return { ok: false, error: e.message, quota: true };
      // (16/10) Không rơi xuống V2: V2 gọi AI thêm 1–2 lần nữa (tốn tiền, có thể trừ thêm lượt).
      // Slot mode đã tự chọn món khi AI lỗi; lỗi tới đây là lỗi tính toán → báo Thử lại.
      console.warn("[Slot Mode] lỗi:", e.message);
      return { ok: false, error: "Chưa tạo được thực đơn. Bấm Thử lại nhé." };
    }
  }


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
      const val = validateMenuV2(raw, { mealIds, whitelist, style: prefs?.style || null });
      if (!val.ok && val.meals.every(m => m.foods.length === 0)) {
        lastErrors = val.errors; continue;
      }

      // Convert sang norm shape — display do CODE tra (AI không đặt tên)
      const avoidSet = new Set([...(avoidFoods || []).map(s => (s || "").toLowerCase().trim()), ...buildExclusionKeys(prefs?.avoid)]); // món vừa ăn + món dị ứng/kiêng (cả món độn thêm)
      const styleId = prefs?.style || null;
      const normMeals = val.meals.map(m => {
        const foods = m.foods.map(k => {
          // AI trả tên đầy đủ ("ức gà nướng") → resolve base key cho role
          const lookup = lookupLocalFood(k, 100);
          const baseKey = lookup?.key || k;
          // Display: ưu tiên tên AI trả (capitalize), fallback getFoodDisplay(k)
          const aiDisplay = k.charAt(0).toUpperCase() + k.slice(1);
          const display = getFoodDisplay(k) !== k ? getFoodDisplay(k) : aiDisplay;
          return { key: baseKey, display, role: getFoodRole(baseKey), cookKey: lookup?.cookKey || null, fullName: k };
        });
        return {
          meal_id: m.meal_id,
          foods,
          dessert: m.dessert ? { key: m.dessert, display: getFoodDisplay(m.dessert) } : null,
          pattern: null, composite: false,
        };
      });

      // Lớp 2: ENGINE DRY-RUN lần 1 — chạy TRƯỚC fat filler để đo fat thiếu bao nhiêu
      const virtualTpl1 = buildVirtualTemplate(normMeals, dayType);
      const template1 = attachPatternAndDisplay(
        stripZeroGramItems(applyMealEngineToTemplate(virtualTpl1, target)),
        { meals: normMeals }
      );
      const total1 = sumTemplate(template1);

      // Fat filler: bù theo tổng fat còn thiếu sau dry-run
      // - Thiếu < 5g → không bù
      // - Thiếu 5-15g → bù 1 bữa chính
      // - Thiếu 15-30g → bù 2 bữa chính
      // - Thiếu > 30g → bù 3 bữa (tất cả bữa chính)
      // BỎ QUA bữa nếu: standalone dish, filler bị avoid, style=clean
      const fatGap = (target.f || 0) - (total1.f || 0);
      const fillerSlots = fatGap >= 5 ? (fatGap > 30 ? 3 : fatGap > 15 ? 2 : 1) : 0;
      if (fillerSlots > 0) {
        let filled = 0;
        for (const m of normMeals) {
          if (filled >= fillerSlots) break;
          if (!MAIN_MEALS.has(m.meal_id)) continue;
          if (m.foods.some(f => isStandaloneDish(f.key))) continue;
          const filler = AUTO_FAT_FILLER[m.meal_id];
          if (!filler || avoidSet.has(filler.food) || styleId === "clean") continue;
          if (m.foods.some(f => f.key === filler.food)) continue; // tránh trùng
          m.foods.push({ key: filler.food, display: filler.display, role: "fat" });
          filled++;
        }
      }

      // Carb filler: bù calo khi P+F đã đủ target nhưng tổng cal còn thiếu >10%
      // SKIP cho low_carb/keto — không bù thêm carb khi user hạn chế carb
      const skipCarbFiller = ["low_carb", "keto"].includes(diet);
      // Chạy dry-run tạm sau fat filler để đo cal gap
      const virtualTplMid = buildVirtualTemplate(normMeals, dayType);
      const templateMid = stripZeroGramItems(applyMealEngineToTemplate(virtualTplMid, target));
      const totalMid = sumTemplate(templateMid);
      const calGap = (target.cal || 0) - (totalMid.cal || 0);
      const calGapPct = target.cal > 0 ? calGap / target.cal : 0;
      const pOk = totalMid.p >= (target.p || 0) * 0.85;
      const fOk = totalMid.f >= (target.f || 0) * 0.85;

      if (calGapPct > 0.10 && pOk && fOk && !skipCarbFiller) {
        // Carb bữa chính — thêm carb vào bữa thiếu calo nhất
        const CARB_FILLER_MAIN = {
          sang: { food: "chuối", display: "Chuối", role: "carb" },
          trua: { food: "cơm trắng", display: "Cơm trắng (thêm)", role: "carb" },
          toi: { food: "khoai lang", display: "Khoai lang", role: "carb" },
        };
        // Hoa quả bữa phụ
        const CARB_FILLER_SNACK = {
          phu_sang: { food: "chuối", display: "Chuối", role: "carb" },
          phu_chieu: { food: "xoài", display: "Xoài", role: "carb" },
        };

        // Tính cal per bữa để tìm bữa thiếu nhất
        const mealWeights = { sang: 25, phu_sang: 10, trua: 30, phu_chieu: 10, pre: 12, post: 15, toi: 25 };
        const totalWeight = normMeals.reduce((s, m) => s + (mealWeights[m.meal_id] || 0), 0);
        const perMealCal = {};
        for (const meal of templateMid.meals || []) {
          perMealCal[meal.meal_id] = (meal.items || []).reduce((s, it) => s + (it.cal || 0), 0);
        }

        // Sort bữa theo cal gap (thiếu nhiều nhất trước)
        const sortedMeals = [...normMeals]
          .filter(m => !m.foods.some(f => isStandaloneDish(f.key)))
          .sort((a, b) => {
            const tA = totalWeight > 0 ? Math.round(target.cal * (mealWeights[a.meal_id] || 0) / totalWeight) : 0;
            const tB = totalWeight > 0 ? Math.round(target.cal * (mealWeights[b.meal_id] || 0) / totalWeight) : 0;
            return (tB - (perMealCal[b.meal_id] || 0)) - (tA - (perMealCal[a.meal_id] || 0));
          });

        let carbFilled = 0;
        for (const m of sortedMeals) {
          if (carbFilled >= 2) break;
          const tgtCal = totalWeight > 0 ? Math.round(target.cal * (mealWeights[m.meal_id] || 0) / totalWeight) : 0;
          const gap = tgtCal - (perMealCal[m.meal_id] || 0);
          if (gap < 50) continue; // bữa đã đủ calo

          // Chọn filler: bữa chính dùng carb, bữa phụ dùng hoa quả
          const filler = MAIN_MEALS.has(m.meal_id) ? CARB_FILLER_MAIN[m.meal_id] : CARB_FILLER_SNACK[m.meal_id];
          if (!filler || avoidSet.has(filler.food)) continue;
          if (m.foods.some(f => f.key === filler.food)) continue; // tránh trùng
          m.foods.push({ key: filler.food, display: filler.display, role: filler.role });
          carbFilled++;
        }
      }

      // Lớp 2b: ENGINE DRY-RUN lần 2 — sau fat+carb filler, kiểm tra macro cuối cùng
      const virtualTpl = buildVirtualTemplate(normMeals, dayType);
      const template = topUpMeals(attachPatternAndDisplay(
        stripZeroGramItems(applyMealEngineToTemplate(virtualTpl, target)),
        { meals: normMeals }
      ), target, { diet, avoidText: prefs?.avoid || "" });
      const total = sumTemplate(template);
      const dry = checkDryRun(total, target);
      const dev = target.cal ? Math.abs(total.cal - target.cal) / target.cal : 0;

      if (!bestCandidate || dev < bestCandidate.dev) {
        bestCandidate = { template, note: raw.note || "", dev };
      }
      if (val.ok && dry.ok) return { ok: true, template, note: raw.note || "" };
      lastErrors = [...val.errors, ...dry.errors];
    } catch (e) {
      if (e.quotaExceeded) return { ok: false, error: e.message, quota: true }; // vĩnh viễn — dừng ngay, không thử lại
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

// Ghi lại display + pattern từng bữa (engine xoá display). swap = { mealId, oldFood, newFoodKey } khi đổi món.
function displayInfo(template, swap = null) {
  const out = {};
  (template.meals || []).forEach(m => {
    const map = {};
    (m.items || []).forEach(it => {
      if (swap && it.food === swap.oldFood && m.meal_id === swap.mealId) map[swap.newFoodKey] = getFoodDisplay(swap.newFoodKey);
      else map[it.food] = it.display; // giữ cả undefined (chưa có tên hiển thị) — chỉ null mới là món ẩn
    });
    out[m.meal_id] = { map, pattern: swap && m.meal_id === swap.mealId ? null : (m.pattern || null) };
  });
  return out;
}
// Gắn lại display + pattern, làm tròn đơn vị nguyên, sắp lại thứ tự món kiểu Việt
function finishMeals(meals, info) {
  return (meals || []).map(m => {
    const inf = info[m.meal_id] || { map: {}, pattern: null };
    const items = (m.items || []).map(it => snapWholeUnit({
      ...it,
      display: Object.prototype.hasOwnProperty.call(inf.map, it.food) ? inf.map[it.food] : undefined,
    }));
    items.sort((a, b) => {
      const ra = DISPLAY_ORDER[a.role || getFoodRole(a.food)] ?? 2;
      const rb = DISPLAY_ORDER[b.role || getFoodRole(b.food)] ?? 2;
      return ra - rb;
    });
    return { ...m, pattern: inf.pattern, items };
  });
}
const mealTotals = (m) => (m?.items || []).reduce((a, i) => ({
  cal: a.cal + (Number(i.cal) || 0), p: a.p + (Number(i.p ?? i.protein) || 0), c: a.c + (Number(i.c ?? i.carb) || 0), f: a.f + (Number(i.f ?? i.fat) || 0),
}), { cal: 0, p: 0, c: 0, f: 0 });

// Đổi 1 món (16/10, chủ dự án chốt): CHỈ tính lại bữa có món đổi, giữ calo/macro của bữa như trước khi đổi —
// "đổi món" không được ngầm nâng/hạ cả bữa về mục tiêu. Các bữa khác giữ nguyên.
// Thiếu/dư so với mục tiêu ngày → rebalanceTemplate (nút "Cân lại cho đủ mục tiêu").
export function swapFoodInTemplate(template, mealId, oldFood, newFoodKey, macro, dayType) {
  if (!LOCAL_FOODS[newFoodKey]) return template;
  void macro; void dayType;
  const meal = (template.meals || []).find(m => m.meal_id === mealId);
  if (!meal) return template;
  const info = displayInfo(template, { mealId, oldFood, newFoodKey });
  const items = (meal.items || []).map(it =>
    it.food === oldFood ? foodToItem(newFoodKey, undefined, undefined, it.role) : foodToItem(it.food, it.gram, undefined, it.role)
  );
  const target = mealTotals(meal);
  const one = stripZeroGramItems(applyMealEngineToTemplate({ meals: [{ ...meal, items, pattern: null }] }, target));
  const fixed = finishMeals(one.meals, info)[0];
  return { ...template, meals: (template.meals || []).map(m => (m.meal_id === mealId ? fixed : m)) };
}

// Cân lại cả thực đơn cho đủ mục tiêu ngày (không gọi AI): chạy mealEngine cho mọi bữa theo mục tiêu ngày tập/nghỉ
export function rebalanceTemplate(template, macro, dayType, { avoidText = "" } = {}) {
  const info = displayInfo(template);
  const meals = (template.meals || []).map(m => ({ ...m, items: (m.items || []).map(it => (LOCAL_FOODS[it.food] ? foodToItem(it.food, it.gram, undefined, it.role) : it)) }));
  const target = dayTarget(macro, dayType);
  const recomputed = stripZeroGramItems(applyMealEngineToTemplate({ ...template, meals }, target));
  const done = { ...recomputed, meals: finishMeals(recomputed.meals, info) };
  // Bù calo từng bữa như lúc tạo (món kèm mới có tên hiển thị riêng)
  return topUpMeals(done, target, { diet: macro?.dietStrategy || "balanced", avoidText });
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
    const today = todayVN();
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
    const today = todayVN();
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

// Thực đơn AI gần nhất (mọi ngày) — cho mục "Đã lưu" ở tab Thực đơn
export async function loadLatestAIMenu(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.from("ai_menu_cache").select("template,menu_date").eq("user_id", userId)
      .order("menu_date", { ascending: false }).limit(1).maybeSingle();
    if (error) { console.error("loadLatestAIMenu DB error:", error); return null; }
    return data?.template ? { template: data.template, date: data.menu_date } : null;
  } catch (e) { console.error("loadLatestAIMenu error:", e); return null; }
}

// N thực đơn AI gần nhất (mỗi ngày 1 bản) — mục "Thực đơn của tôi" ở tab Thực đơn
export async function loadAIMenus(userId, n = 5) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase.from("ai_menu_cache").select("template,menu_date").eq("user_id", userId)
      .order("menu_date", { ascending: false }).limit(n);
    if (error) { console.error("loadAIMenus DB error:", error); return []; }
    return (data || []).filter((r) => r.template && (r.template.meals || []).length).map((r) => ({ template: r.template, date: r.menu_date }));
  } catch (e) { console.error("loadAIMenus error:", e); return []; }
}

export async function clearAIMenu(userId) {
  if (!userId) return;
  try {
    const today = todayVN();
    await supabase.from("ai_menu_cache").delete().eq("user_id", userId).eq("menu_date", today);
  } catch (e) {}
}

// ============================================================
// ĐỔI MÓN — tính trước kết quả cho từng ứng viên (sheet Đổi món mobile)
// Mỗi ứng viên: chạy thật swapFoodInTemplate rồi đọc gram/kcal món mới + kcal bữa sau khi đổi.
// Bỏ: món trùng tên hiển thị, gram vượt trần của món, bữa lệch > maxDev so với bữa cũ.
// Sắp theo |kcal bữa mới − kcal bữa cũ| (gần calo bữa cũ nhất lên trước).
// ============================================================
export function swapOptions(template, mealId, oldFood, macro, dayType, allowedKeys = null, { maxDev = 0.2 } = {}) {
  const meal = (template?.meals || []).find(m => m.meal_id === mealId);
  if (!meal) return { current: null, options: [], hidden: 0 };
  const mealCalOf = (m) => Math.round((m?.items || []).reduce((s, i) => s + (Number(i.cal) || 0), 0));
  const oldMealCal = mealCalOf(meal);
  // Mốc so sánh: chạy lại engine với chính món cũ (cùng cách tính với các ứng viên) — tránh lệch do số cũ tính kiểu khác
  let baseCal = oldMealCal;
  try { baseCal = mealCalOf((swapFoodInTemplate(template, mealId, oldFood, oldFood, macro, dayType).meals || []).find(m => m.meal_id === mealId)) || oldMealCal; } catch (e) { /* giữ số cũ */ }
  const oldItem = (meal.items || []).find(i => i.food === oldFood) || null;
  const carbOf = (m) => (m?.items || []).find(i => (i.role || getFoodRole(i.food)) === "carb" && i.food !== oldFood) || null;
  const seen = new Set();
  const all = [];
  let hidden = 0;
  for (const k of getSwapCandidates(oldFood, (meal.items || []).map(i => i.food), allowedKeys)) {
    const name = String(getFoodDisplay(k) || k).toLowerCase().trim();
    if (seen.has(name)) continue;
    seen.add(name);
    let next;
    try { next = swapFoodInTemplate(template, mealId, oldFood, k, macro, dayType); } catch (e) { hidden++; continue; }
    const nm = (next.meals || []).find(m => m.meal_id === mealId);
    const it = (nm?.items || []).find(i => i.food === k);
    if (!it || !(it.gram > 0)) { hidden++; continue; }
    const mealCal = mealCalOf(nm);
    const limit = getGramLimit(k);
    const tooBig = !!(limit && limit.max && it.gram > limit.max);
    if (tooBig) { hidden++; continue; }
    const dev = baseCal ? Math.abs(mealCal - baseCal) / baseCal : 0;
    const carb = carbOf(nm);
    all.push({ key: k, name: getFoodDisplay(k) || capitalizeFirst(k), gram: Math.round(it.gram), cal: Math.round(it.cal || 0), mealCal, diff: mealCal - oldMealCal, dev, carb: carb ? { name: getFoodDisplay(carb.food) || carb.food, gram: Math.round(carb.gram) } : null, template: next });
  }
  all.sort((a, b) => a.dev - b.dev || a.name.localeCompare(b.name, "vi"));
  // Bỏ món làm bữa lệch quá maxDev; nếu không còn món nào thì vẫn đưa 5 món gần nhất (đánh dấu wide)
  const near = all.filter(o => o.dev <= maxDev);
  if (near.length) { hidden += all.length - near.length; all.length = 0; all.push(...near); }
  else if (all.length) { hidden += Math.max(0, all.length - 5); all.splice(5); all.forEach(o => { o.wide = true; }); }
  return {
    current: oldItem ? { name: oldItem.display || getFoodDisplay(oldFood) || oldFood, gram: Math.round(oldItem.gram || 0), cal: Math.round(oldItem.cal || 0), mealCal: oldMealCal, carb: carbOf(meal) ? Math.round(carbOf(meal).gram) : null } : null,
    options: all, hidden,
  };
}

// ============================================================
// LỚP AN TOÀN CUỐI cho thực đơn AI (Đợt 3):
//  - bỏ mọi món dính kiêng/dị ứng (kể cả món độn code tự thêm), bữa rỗng thì bỏ bữa
//  - bỏ món số liệu vô lý (gram ≤ 0 / > 3000, kcal âm / không phải số)
//  - tổng kcal lệch > 40% mục tiêu → coi là hỏng, báo lỗi để tạo lại thay vì đưa thực đơn sai
// ============================================================
export function sanitizeAIMenu(template, { avoidText, target } = {}) {
  const banned = buildExclusionKeys(avoidText);
  const removed = [];
  const okNum = (it) => Number.isFinite(Number(it.cal)) && Number(it.cal) >= 0 && Number(it.gram) > 0 && Number(it.gram) <= 3000;
  const meals = (template?.meals || []).map((m) => {
    const items = (m.items || []).filter((it) => {
      const k = String(it.food || "").toLowerCase().trim();
      if (banned.has(k) || !okNum(it)) { removed.push(it.display || getFoodDisplay(k) || k); return false; }
      return true;
    });
    return { ...m, items };
  }).filter((m) => m.items.some((i) => i.gram > 0));
  const out = { ...template, meals };
  const cal = sumTemplate(out).cal;
  const t = Number(target?.cal) || 0;
  const broken = !meals.length || (t > 0 && (cal < t * 0.6 || cal > t * 1.4));
  return { template: out, removed, broken, cal };
}

export async function generateMenuAI(args) {
  const res = await generateMenuAIRaw(args);
  if (!res?.ok || !res.template) return res;
  const target = dayTarget(args.macro, args.dayType || "train");
  let s = sanitizeAIMenu(res.template, { avoidText: args.prefs?.avoid, target });
  // Lệch quá xa (hiếm, ~0,5% lần tạo: món quá nhẹ/nặng) → thử cân lại khẩu phần trước khi báo lỗi bắt user tốn thêm lượt
  if (s.broken && (s.template?.meals || []).length) {
    try {
      const fixed = rebalanceTemplate(s.template, args.macro, args.dayType || "train", { avoidText: args.prefs?.avoid || "" });
      const s2 = sanitizeAIMenu(fixed, { avoidText: args.prefs?.avoid, target });
      const off = (x) => Math.abs((x.cal || 0) - (target.cal || 0));
      // Lấy bản gần mục tiêu hơn; vẫn lệch thì KHÔNG báo lỗi (tốn lượt tạo lại) — màn kết quả tự hiện "Thiếu/Dư X%" + đổi món
      if (s2.template.meals.length && off(s2) < off(s)) s = { ...s2, removed: [...s.removed, ...s2.removed] };
      if (off(s) > (target.cal || 0) * 0.1) s = { ...s, template: fitDayCal(s.template, target, args.macro?.dietStrategy || args.profile?.dietStrategy || "balanced") };
      s = { ...s, broken: !s.template.meals.length };
    } catch (e) { /* giữ lỗi cũ */ }
  }
  if (s.broken) return { ok: false, error: "Chưa tạo được thực đơn (các món đều bị loại vì kiêng/dị ứng). Bấm Thử lại nhé." };
  const dietS = args.macro?.dietStrategy || args.profile?.dietStrategy || "balanced";
  try { s = { ...s, template: capProtein(s.template, target, dietS) }; } catch (e) { /* giữ nguyên */ }
  // Còn lệch > 10% (không hỏng) → co/giãn đều về sát mục tiêu (16/10: bỏ lệch TB 12–14% ở hồ sơ 1.200 kcal)
  try {
    const cal = sumTemplate(s.template).cal;
    if (target.cal && Math.abs(cal - target.cal) > target.cal * 0.1) s = { ...s, template: fitDayCal(s.template, target, args.macro?.dietStrategy || args.profile?.dietStrategy || "balanced") };
  } catch (e) { /* giữ nguyên */ }
  const note = s.removed.length ? `Đã bỏ ${s.removed.slice(0, 3).join(", ")}${s.removed.length > 3 ? "…" : ""} vì bạn kiêng/dị ứng.` : res.note;
  return { ...res, template: s.template, note };
}
