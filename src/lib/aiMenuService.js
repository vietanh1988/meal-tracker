// ============================================================
// AI MENU SERVICE — AI CHỈ CHỌN MÓN, KHÔNG TÍNH SỐ.
//
// Luồng: buildPrompt (kèm catalog món từ localFoodDB, nhóm theo role)
//   → gọi ai-proxy (server key) → parse JSON {meals[].items[].food}
//   → normalizeMenu: khớp từng món về key trong LOCAL_FOODS, role lấy
//     từ getFoodRole() (KHÔNG tin role AI trả), loại món lạ
//   → validate mỗi bữa đủ protein + carb (fat thiếu thì tự chèn "dầu ăn")
//   → buildVirtualTemplate: dựng template ảo (gram = refGram mặc định)
//   → applyMealEngineToTemplate(virtualTpl, dailyTarget) tính gram thật.
//
// Gram/macro cuối cùng LUÔN từ mealEngine + LOCAL_FOODS (data verify),
// nên khớp target ±5% như mọi template khác trong app. AI sai thì retry
// 1 lần, vẫn sai thì trả {ok:false} để UI fallback về kho mẫu admin.
// ============================================================

import { LOCAL_FOODS, getFoodRole } from "./localFoodDB";
import { applyMealEngineToTemplate, computeMealGram, splitDayIntoMeals } from "../mealEngine";
import { ALL_MEALS } from "../mealConstants";

const AI_PROXY_URL = "https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy";

// refGram mặc định theo role — chỉ là TỈ LỆ khởi điểm cho engine,
// không phải gram cuối (engine scale lại trong [min,max] của từng món).
const DEFAULT_REF_GRAM = { protein: 150, carb: 150, fat: 10, fixed: 100 };

// Món không nên để AI chọn làm nguồn chính (macro ~0 hoặc supplement đo scoop)
const EXCLUDE_FROM_CATALOG = new Set(["creatine", "bcaa", "nước", "trà xanh", "cà phê", "cà phê đen"]);

// ============================================================
// LỌC DỊ ỨNG CỨNG — phòng trường hợp AI lờ đi câu "không dùng" trong
// prompt. Đây là chốt chặn ở CODE, không phụ thuộc AI có tuân thủ hay
// không. Khớp theo CATEGORY (cat trong LOCAL_FOODS) là chính vì user
// gõ tự do ("hải sản", "không ăn thịt đỏ"...) chứ không gõ đúng key.
// ============================================================
const ALLERGY_KEYWORD_TO_CAT = {
  "hải sản": ["seafood"], "tôm cá": ["seafood"], "seafood": ["seafood"],
  "tôm": ["seafood"], "cá": ["seafood"], "mực": ["seafood"], "cua": ["seafood"], "sò": ["seafood"],
  "sữa": ["egg_dairy"], "trứng": ["egg_dairy"], "trứng sữa": ["egg_dairy"], "dairy": ["egg_dairy"],
  "đậu phộng": ["nuts"], "hạt": ["nuts"], "nuts": ["nuts"],
  "thịt bò": ["beef"], "bò": ["beef"], "thịt heo": ["pork"], "heo": ["pork"], "thịt lợn": ["pork"],
  "gà": ["poultry"], "thịt gà": ["poultry"], "vịt": ["poultry"],
  "thịt đỏ": ["beef", "pork"],
  "chay": ["seafood", "beef", "pork", "poultry"], // ăn chay — loại hết đạm động vật
};

// Trả về Set các key trong LOCAL_FOODS cần loại bỏ, dựa trên text tự do user gõ.
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
    // Khớp trực tiếp tên món nằm trong câu user gõ (VD gõ đúng "cá hồi")
    else if (key.length >= 3 && lower.includes(key)) excluded.add(key);
  });
  return excluded;
}

// ============================================================
// 1. CATALOG — danh sách món gửi kèm prompt, nhóm theo role để AI
// bắt buộc chọn trong đây. ~200 key ≈ 1.5k token, gọi 1 lần/generate.
// ============================================================
export function buildFoodCatalog(exclude) {
  const byRole = { protein: [], carb: [], fat: [], fixed: [] };
  Object.keys(LOCAL_FOODS).forEach(key => {
    if (EXCLUDE_FROM_CATALOG.has(key)) return;
    if (exclude?.has(key)) return;
    const role = getFoodRole(key);
    (byRole[role] || byRole.fixed).push(key);
  });
  return [
    `ĐẠM (protein): ${byRole.protein.join(", ")}`,
    `TINH BỘT (carb): ${byRole.carb.join(", ")}`,
    `CHẤT BÉO (fat): ${byRole.fat.join(", ")}`,
    `RAU/PHỤ (fixed): ${byRole.fixed.join(", ")}`,
  ].join("\n");
}

// ============================================================
// 2. PROMPT — không yêu cầu gram/calo. Chỉ chọn món + ghép bữa.
// ============================================================
function buildMenuPrompt({ profile, macro, dayType, mealIds, prefs, avoidFoods = [], exclude }) {
  const goalLabel = { bulk: "tăng cơ", cut: "giảm mỡ", maintain: "duy trì" }[macro.goal] || "duy trì";
  const mealNames = mealIds
    .map(id => { const m = ALL_MEALS.find(x => x.id === id); return m ? `${id} (${m.name})` : id; })
    .join(", ");
  const target = dayTarget(macro, dayType);

  const prefLines = [];
  if (prefs?.avoid?.trim()) prefLines.push(`- KHÔNG dùng (dị ứng/không ăn): ${prefs.avoid}`);
  if (prefs?.style) {
    const styleMap = {
      vn: "cơm nhà Việt Nam (cơm, canh, món mặn quen thuộc)",
      clean: "eat clean (ức gà, khoai lang, yến mạch, rau xanh, ít gia vị)",
      easy: "tiện lợi, ít nấu nướng (trứng, bánh mì, sữa chua, whey, trái cây)",
    };
    prefLines.push(`- Phong cách: ${styleMap[prefs.style] || prefs.style}`);
  }
  if (avoidFoods.length) prefLines.push(`- KHÔNG lặp lại các món: ${avoidFoods.join(", ")}`);

  return `Bạn là chuyên gia dinh dưỡng Việt Nam. Hãy CHỌN MÓN xây thực đơn 1 ngày (${dayType === "train" ? "ngày tập" : "ngày nghỉ"}) cho người dùng sau:
- Mục tiêu: ${goalLabel}, target cả ngày ~${target.cal} kcal (P ${target.p}g / C ${target.c}g / F ${target.f}g) — hệ thống sẽ TỰ tính gram, bạn KHÔNG cần tính.
${prefLines.length ? prefLines.join("\n") + "\n" : ""}
QUY TẮC BẮT BUỘC:
1. CHỈ được chọn món có TÊN CHÍNH XÁC trong DANH SÁCH bên dưới. Không tự bịa món ngoài danh sách.
2. Tạo đúng các bữa: ${mealNames}.
3. Mỗi bữa CHÍNH (sang/trua/toi) phải có: ít nhất 1 món nhóm ĐẠM + 1 món nhóm TINH BỘT + 1 món rau/trái cây nhóm RAU/PHỤ. Bữa phụ/pre/post có thể đơn giản hơn (1-2 món) nhưng vẫn cần 1 món đạm hoặc tinh bột.
4. Món ăn phải HỢP LÝ với bữa (sáng không ăn lẩu, pre-workout ưu tiên carb nhanh + nhẹ bụng, post ưu tiên đạm hấp thu nhanh).
5. Đa dạng: không dùng 1 món đạm cho quá 2 bữa trong ngày.
6. Mỗi bữa tối đa 4 món.

DANH SÁCH MÓN ĐƯỢC PHÉP DÙNG:
${buildFoodCatalog(exclude)}

Trả về DUY NHẤT JSON sau, không markdown, không giải thích thêm:
{"meals":[{"meal_id":"sang","items":[{"food":"tên món đúng như danh sách"}]}],"note":"1 câu mô tả ngắn về thực đơn"}`;
}

// Target cả ngày theo dayType — khớp cách Dashboard đang đọc macro
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
// 3. GỌI AI — qua ai-proxy (dùng CLAUDE_API_KEY phía server, user
// mới onboard chưa có key riêng). Trả text thô, chưa parse.
// ============================================================
async function callAI(prompt, { provider, model } = {}) {
  const res = await fetch(AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: provider || "claude",
      model: model || "claude-sonnet-5",
      maxTokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.text || "";
}

function parseMenuJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  // AI đôi khi thêm câu dẫn trước/sau JSON — cắt từ { đầu đến } cuối
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI không trả JSON hợp lệ");
  return JSON.parse(clean.slice(start, end + 1));
}

// ============================================================
// 4. NORMALIZE + VALIDATE
// ============================================================

// Keys sort dài trước — cùng logic greedy match với lookupLocalFood
const CATALOG_KEYS = Object.keys(LOCAL_FOODS).sort((a, b) => b.length - a.length);

// Khớp tên AI trả về → key chuẩn trong LOCAL_FOODS. null nếu không khớp.
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

/**
 * Chuẩn hoá output AI về danh sách bữa hợp lệ.
 * @returns {{ok:boolean, meals?:Array, errors?:string[]}}
 *   meals[i] = { meal_id, foods: [{key, role}] }
 */
export function normalizeMenu(raw, mealIds, exclude) {
  const errors = [];
  const wanted = new Set(mealIds);
  const byId = {};
  (raw?.meals || []).forEach(m => { if (wanted.has(m.meal_id)) byId[m.meal_id] = m; });

  const meals = [];
  for (const mealId of mealIds) {
    const m = byId[mealId];
    if (!m) { errors.push(`Thiếu bữa "${mealId}"`); continue; }

    const seen = new Set();
    const foods = [];
    (m.items || []).forEach(it => {
      const key = matchFoodKey(it.food || it.name);
      if (!key || seen.has(key)) return; // loại món lạ + món trùng
      if (exclude?.has(key)) return;      // loại món dị ứng dù AI lỡ chọn
      seen.add(key);
      foods.push({ key, role: getFoodRole(key) }); // role từ DB, không tin AI
    });

    const hasP = foods.some(f => f.role === "protein");
    const hasC = foods.some(f => f.role === "carb");
    if (MAIN_MEALS.has(mealId)) {
      if (!hasP) errors.push(`Bữa "${mealId}" thiếu món đạm`);
      if (!hasC) errors.push(`Bữa "${mealId}" thiếu món tinh bột`);
      // Fat thiếu thì engine không có gì để scale F → tự chèn dầu ăn (fix im lặng, không tính là lỗi)
      if (!foods.some(f => f.role === "fat") && LOCAL_FOODS["dầu ăn"]) {
        foods.push({ key: "dầu ăn", role: "fat" });
      }
    } else if (!hasP && !hasC) {
      errors.push(`Bữa phụ "${mealId}" không có món đạm hoặc tinh bột nào`);
    }
    if (foods.length === 0) errors.push(`Bữa "${mealId}" rỗng sau khi lọc`);

    meals.push({ meal_id: mealId, foods: foods.slice(0, 5) });
  }

  return errors.length ? { ok: false, errors, meals } : { ok: true, meals };
}

// ============================================================
// 5. VIRTUAL TEMPLATE → MEAL ENGINE
// ============================================================

// item shape khớp đúng thứ applyMealEngineToTemplate đọc: food/gram/cal/p/c/f/fiber
function foodToItem(key, refGram) {
  const base = LOCAL_FOODS[key];
  const g = refGram ?? DEFAULT_REF_GRAM[getFoodRole(key)] ?? 100;
  const r = g / 100;
  return {
    food: key, gram: g, unit: "g", qty: 1,
    p: Math.round(base.p * r * 10) / 10,
    c: Math.round(base.c * r * 10) / 10,
    f: Math.round(base.f * r * 10) / 10,
    fiber: Math.round((base.fiber || 0) * r * 10) / 10,
    cal: Math.round(base.cal * r),
  };
}

export function buildVirtualTemplate(meals, dayType) {
  return {
    name: `AI · ${dayType === "train" ? "Ngày tập" : "Ngày nghỉ"}`,
    day_type: dayType,
    source: "ai",
    meals: meals.map(m => ({ meal_id: m.meal_id, items: m.foods.map(f => foodToItem(f.key)) })),
  };
}

// ============================================================
// 6. HÀM CHÍNH — generateMenuAI
// ============================================================

/**
 * @param {Object} p
 * @param {Object} p.macro     - output calcMacro() (calTarget, protein, carb, fat, carbRest, calRest, goal)
 * @param {Object} p.profile   - profile user (chỉ đọc, đưa vào prompt)
 * @param {"train"|"rest"} p.dayType
 * @param {string[]} p.mealIds - VD DEFAULT_MEAL_CONFIG[dayType]
 * @param {{avoid?:string, style?:"vn"|"clean"|"easy"}} p.prefs
 * @param {string[]} [p.avoidFoods] - món cần tránh lặp (dùng khi tạo nhiều ngày)
 * @returns {Promise<{ok:true, template:Object, note:string} | {ok:false, error:string}>}
 *   template = đã qua mealEngine, gram thật, đưa thẳng vào applyTemplate/saveWeeklyTemplate được.
 */
export async function generateMenuAI({ macro, profile, dayType = "train", mealIds, prefs, avoidFoods, appSettings, provider, model }) {
  // Theo đúng AI đang cấu hình trong tab AI (app_settings), cùng nguồn
  // với AICoachPanel. Truyền provider/model tường minh sẽ ghi đè.
  const prov = provider || appSettings?.ai_provider || "claude";
  const mdl = model || (
    prov === "claude" ? (appSettings?.ai_model || "claude-sonnet-5")
    : prov === "gemini" ? (appSettings?.gemini_model || "gemini-2.5-flash")
    : (appSettings?.gpt_model || "gpt-4o-mini")
  );
  const exclude = buildExclusionKeys(prefs?.avoid);
  const prompt = buildMenuPrompt({ profile, macro, dayType, mealIds, prefs, avoidFoods, exclude });
  const target = dayTarget(macro, dayType);

  let lastErrors = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const retryHint = attempt === 0 ? "" :
        `\n\nLẦN TRƯỚC BỊ LỖI, hãy sửa: ${lastErrors.join("; ")}. Nhớ: tên món phải ĐÚNG CHÍNH XÁC như danh sách.`;
      const text = await callAI(prompt + retryHint, { provider: prov, model: mdl });
      const raw = parseMenuJSON(text);
      const norm = normalizeMenu(raw, mealIds, exclude);
      if (!norm.ok) { lastErrors = norm.errors; continue; }

      const virtualTpl = buildVirtualTemplate(norm.meals, dayType);
      const template = applyMealEngineToTemplate(virtualTpl, target);
      return { ok: true, template, note: raw.note || "" };
    } catch (e) {
      lastErrors = [e.message || "Lỗi không xác định"];
    }
  }
  return { ok: false, error: lastErrors.join("; ") || "AI không tạo được thực đơn hợp lệ" };
}

// ============================================================
// 7. TIỆN ÍCH CHO PREVIEW — đổi món / tính lại 1 bữa, KHÔNG tốn AI
// ============================================================

/**
 * Đổi 1 món trong 1 bữa rồi tính lại gram bữa đó bằng engine.
 * @param {Object} template  - template hiện tại (đã qua engine)
 * @param {string} mealId
 * @param {string} oldFood   - key món đang có
 * @param {string} newFoodKey- key món mới (phải có trong LOCAL_FOODS, cùng role càng tốt)
 * @param {Object} macro
 * @param {"train"|"rest"} dayType
 */
export function swapFoodInTemplate(template, mealId, oldFood, newFoodKey, macro, dayType) {
  if (!LOCAL_FOODS[newFoodKey]) return template;
  const meals = (template.meals || []).map(m => {
    if (m.meal_id !== mealId) return m;
    const items = (m.items || []).map(it =>
      it.food === oldFood ? foodToItem(newFoodKey) : foodToItem(it.food, it.gram)
    );
    return { ...m, items };
  });
  // Tính lại toàn bộ (engine chia target theo danh sách bữa nên phải chạy cả template)
  return applyMealEngineToTemplate({ ...template, meals }, dayTarget(macro, dayType));
}

/** Gợi ý món thay thế cùng role, loại các món đã có trong bữa */
export function getSwapCandidates(foodKey, currentMealFoods = []) {
  const role = getFoodRole(foodKey);
  const inMeal = new Set(currentMealFoods);
  return Object.keys(LOCAL_FOODS)
    .filter(k => k !== foodKey && !inMeal.has(k) && !EXCLUDE_FROM_CATALOG.has(k) && getFoodRole(k) === role)
    .sort();
}

/** Tổng macro cả ngày của template — dùng cho MacroRing preview */
export function sumTemplate(template) {
  const all = (template.meals || []).flatMap(m => m.items || []);
  return {
    cal: Math.round(all.reduce((s, i) => s + (i.cal || 0), 0)),
    p: Math.round(all.reduce((s, i) => s + (i.p || 0), 0) * 10) / 10,
    c: Math.round(all.reduce((s, i) => s + (i.c || 0), 0) * 10) / 10,
    f: Math.round(all.reduce((s, i) => s + (i.f || 0), 0) * 10) / 10,
  };
}
