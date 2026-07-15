// ============================================================
// menuValidatorV2.js — AI Menu V2 Bước 5
// Lớp 1: check nhanh thuần data (key, slot, diversity).
// Lớp 2: ENGINE DRY-RUN — chạy thật mealEngine local (pure, free),
// đo sumTemplate lệch bao nhiêu. Không viết capacity engine riêng
// — MealEngine là single source of truth cho gram/macro.
// FAIL → trả feedback CỤ THỂ để retry AI.
// ============================================================

import { LOCAL_FOODS, getFoodRole } from "./localFoodDB";
import { SLOT_RULES, getMealScore, MIN_SLOT_SCORE } from "../mealGrammar";

// Nhóm đạm để check diversity (P4) — cat là proxy đủ tốt
const PROTEIN_GROUP = { poultry: "gà", beef: "bò", pork: "heo", seafood: "cá/hải sản", egg_dairy: "trứng/sữa" };
const MAIN_MEALS = new Set(["sang", "trua", "toi"]);
const MACRO_TOLERANCE = 0.15; // dry-run lệch >15% → retry

// Tìm key gần nhất trong whitelist cho feedback retry
function nearestKey(bad, wlKeys) {
  const b = bad.toLowerCase();
  let best = null, bestScore = 0;
  for (const k of wlKeys) {
    let s = 0;
    if (k.includes(b) || b.includes(k)) s = Math.min(b.length, k.length);
    else {
      const bw = new Set(b.split(" ")), kw = k.split(" ");
      s = kw.filter(w => bw.has(w)).length;
    }
    if (s > bestScore) { bestScore = s; best = k; }
  }
  return bestScore > 0 ? best : null;
}

/**
 * validateMenuV2(raw, { mealIds, whitelist })  →  { ok, meals, errors }
 * raw = JSON AI trả: {meals:[{meal_id, foods:[key], dessert?}], note}
 * Lớp 1 only — dry-run gọi riêng ở generateMenuV2 (cần engine import).
 */
export function validateMenuV2(raw, { mealIds, whitelist }) {
  const errors = [];
  const wlKeys = new Set(whitelist.items.map(i => i.key));
  const wlArr = [...wlKeys];
  const byId = {};
  (raw?.meals || []).forEach(m => { if (m?.meal_id) byId[m.meal_id] = m; });

  // Đủ bữa
  for (const id of mealIds) {
    if (!byId[id]) errors.push(`Thiếu bữa "${id}" — phải tạo đủ: ${mealIds.join(", ")}.`);
  }

  const meals = [];
  const usedProteinGroups = {}; // group → meal_id đã dùng (bữa chính)

  // AI thật có thể trả foods là string HOẶC object {key}/{food}/{name} — normalize hết
  const toKey = (f) => {
    if (typeof f === "string") return f.toLowerCase().trim();
    if (f && typeof f === "object") return (f.key || f.food || f.name || "").toLowerCase().trim();
    return "";
  };

  for (const id of mealIds) {
    const m = byId[id];
    if (!m) continue;
    const rule = SLOT_RULES[id] || {};
    let foods = Array.isArray(m.foods) ? m.foods.map(toKey).filter(Boolean) : [];

    // Key ∈ whitelist — key lệch nhẹ (không dấu, thừa chữ) → TỰ MAP key gần nhất
    // thay vì loại (cứu menu, giảm retry); không map được mới loại + báo lỗi
    foods = foods.map(k => {
      if (wlKeys.has(k)) return k;
      const near = nearestKey(k, wlArr);
      if (near) {
        console.warn(`[AI Menu V2] auto-map key "${k}" → "${near}"`);
        return near;
      }
      errors.push(`Bữa "${id}": key "${k}" không có trong WHITELIST. Copy nguyên văn key từ whitelist.`);
      return null;
    }).filter(Boolean);
    // Auto-map có thể tạo trùng trong cùng bữa → dedupe
    foods = [...new Set(foods)];

    // Slot rules
    if (rule.maxDishes && foods.length > rule.maxDishes) {
      errors.push(`Bữa "${id}" có ${foods.length} món — tối đa ${rule.maxDishes}. Bỏ bớt.`);
      foods = foods.slice(0, rule.maxDishes);
    }
    if (rule.minDishes && foods.length < rule.minDishes) {
      errors.push(`Bữa "${id}" chỉ ${foods.length} món — cần tối thiểu ${rule.minDishes}.`);
    }
    // need roles
    if (rule.need) {
      const roles = new Set(foods.map(getFoodRole));
      for (const r of Object.keys(rule.need)) {
        if (!roles.has(r)) errors.push(`Bữa "${id}" thiếu món ${r === "protein" ? "đạm" : r === "carb" ? "tinh bột" : r}.`);
      }
    }
    // mealScore ≥ ngưỡng — món lạc bữa (VD cơm bữa sáng)
    foods = foods.filter(k => {
      const s = getMealScore(k, id);
      if (s < MIN_SLOT_SCORE) {
        errors.push(`Bữa "${id}": "${k}" không hợp bữa này (điểm ${s}) — ${rule.hint || "chọn món khác"}`);
        return false;
      }
      return true;
    });

    // Diversity: nhóm đạm không lặp giữa các BỮA CHÍNH
    if (MAIN_MEALS.has(id)) {
      for (const k of foods) {
        if (getFoodRole(k) !== "protein") continue;
        const g = PROTEIN_GROUP[LOCAL_FOODS[k]?.cat];
        if (!g) continue;
        if (usedProteinGroups[g] && usedProteinGroups[g] !== id) {
          errors.push(`Nhóm đạm "${g}" đã dùng ở bữa "${usedProteinGroups[g]}" — bữa "${id}" đổi sang nhóm khác (gà/bò/heo/cá/trứng).`);
        } else {
          usedProteinGroups[g] = id;
        }
      }
    }

    // Dessert
    let dessert = null;
    if (m.dessert) {
      const dk = toKey(m.dessert);
      if (dk && wlKeys.has(dk)) dessert = dk;
      else if (dk) {
        const near = nearestKey(dk, wlArr);
        if (near) dessert = near;
        // dessert sai không đáng fail menu — bỏ qua im lặng nếu không map được
      }
    }

    meals.push({ meal_id: id, foods, dessert });
  }

  return { ok: errors.length === 0, meals, errors };
}

/**
 * checkDryRun(computedTemplate, target) → { ok, errors }
 * Nhận template ĐÃ qua applyMealEngineToTemplate + sumTemplate từ caller
 * (generateMenuV2) — validator không tự import engine để giữ file thuần data-check;
 * caller đưa số thật của engine vào đây để sinh feedback.
 */
export function checkDryRun(total, target) {
  const errors = [];
  const checks = [
    ["cal", "calo", "kcal"], ["p", "protein", "g"], ["c", "carb", "g"], ["f", "fat", "g"],
  ];
  for (const [k, name, unit] of checks) {
    const t = target[k] || 0;
    if (t <= 0) continue;
    const got = total[k] || 0;
    const diff = Math.abs(got - t) / t;
    if (diff > MACRO_TOLERANCE) {
      const dir = got < t ? "THIẾU" : "DƯ";
      errors.push(`Engine chạy thử: ${name} ${dir} — đạt ${Math.round(got)}${unit}/target ${Math.round(t)}${unit} (lệch ${Math.round(diff * 100)}%). ${got < t ? `Thêm 1 nguồn ${name} mạnh vào bữa chính.` : `Bớt món giàu ${name}.`}`);
    }
  }
  return { ok: errors.length === 0, errors };
}
