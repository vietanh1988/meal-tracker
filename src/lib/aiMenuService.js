// ============================================================
// AI MENU SERVICE — AI CHỈ CHỌN MÓN, KHÔNG TÍNH SỐ.
//
// Luồng: buildPrompt (kèm catalog món từ localFoodDB, nhóm theo 4 nhóm CỐ
//   ĐỊNH: Đạm/Tinh bột/Rau/Hoa quả — KHÔNG còn nhóm "chất béo" riêng)
//   → gọi ai-proxy (server key) → parse JSON {meals[].items[].food}
//   → normalizeMenu: khớp từng món về key trong LOCAL_FOODS, mỗi bữa lấy
//     ĐÚNG 1 món/nhóm theo slot cố định (sáng = đạm+carb+rau = 3 món;
//     trưa/tối = +1 hoa quả = 4 món), món dư/ngoài 4 nhóm bị bỏ lặng lẽ
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
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";

// ============================================================
// QUYỀN DÙNG — 2 lớp độc lập:
// 1. Cờ toàn cục "ai_menu_gen" (Quản lý tính năng) — admin tắt thì KHÔNG
//    ai dùng được, kể cả Premium. Dùng khi cần dừng khẩn (lỗi AI, quá tải).
// 2. Tier user — Free luôn bị khoá dù cờ có bật, Trial/Premium luôn được
//    dùng khi cờ bật. Đây là gate SẢN PHẨM (bán hàng), tách khỏi cờ kỹ
//    thuật ở trên để 2 việc không giẫm chân nhau.
//
// @returns {{enabled:boolean, locked:boolean, usable:boolean}}
//   enabled = cờ toàn cục đang bật (chưa xét tier)
//   locked  = cờ bật NHƯNG tier free → hiện nút dạng khoá + gợi ý nâng cấp
//   usable  = cờ bật VÀ tier trial/premium → dùng bình thường
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
// NHÃN HIỂN THỊ — tách RIÊNG khỏi role tính toán của mealEngine (vốn chỉ
// cần 4 bucket protein/carb/fat/fixed cho toán học scale gram, không cần
// phân biệt đẹp). "Rau" và "Hoa quả" trước đây bị gộp chung "Rau/Phụ" vì
// cùng role="fixed" — giờ tách theo field `cat` thật trong LOCAL_FOODS để
// hiển thị đúng tên user hiểu, dùng cho UI (pill nhãn) + cấu trúc bữa mới
// (bữa chính cần ĐÚNG 1 rau riêng + 1 hoa quả riêng, không lẫn lộn).
const PROTEIN_CATS = new Set(["poultry", "beef", "pork", "seafood", "egg_dairy"]);
export function getFoodDisplayCategory(foodKey) {
  const key = (foodKey || "").toLowerCase().trim();
  const item = LOCAL_FOODS[key];
  if (!item) return "other";
  const role = getFoodRole(key); // vẫn ưu tiên role đã override đúng (VD đậu nành cat=nuts nhưng role=protein)
  if (role === "protein") return "protein";
  if (role === "carb") return "carb";
  if (item.cat === "veg") return "veg";
  if (item.cat === "fruit") return "fruit";
  return "other";
}

// ============================================================
// 1. CATALOG — danh sách món gửi kèm prompt, nhóm theo 4 nhóm CỐ ĐỊNH
// (Đạm/Tinh bột/Rau/Hoa quả). KHÔNG còn nhóm "chất béo" riêng — chất béo
// mục tiêu lấy tự nhiên từ món đạm (trứng, thịt, cá đều có béo sẵn), tránh
// AI phải chọn "dầu ăn" như 1 món ăn độc lập (vô lý — dầu ăn là gia vị nấu
// nướng, không phải món trên mâm cơm).
// ============================================================
export function buildFoodCatalog(exclude) {
  const byCat = { protein: [], carb: [], veg: [], fruit: [] };
  Object.keys(LOCAL_FOODS).forEach(key => {
    if (EXCLUDE_FROM_CATALOG.has(key)) return;
    if (exclude?.has(key)) return;
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
QUY TẮC BẮT BUỘC — SỐ MÓN THEO TỪNG BỮA:
1. CHỈ được chọn món có TÊN CHÍNH XÁC trong DANH SÁCH bên dưới. Không tự bịa món ngoài danh sách.
2. Tạo đúng các bữa: ${mealNames}.
3. Bữa sáng (sang): ĐÚNG 3 món — 1 ĐẠM + 1 TINH BỘT + 1 RAU. KHÔNG thêm hoa quả.
4. Bữa trưa (trua): ĐÚNG 4 món — 1 ĐẠM + 1 TINH BỘT + 1 RAU + 1 HOA QUẢ (bắt buộc).
5. Bữa tối (toi): 3-4 món — BẮT BUỘC 1 ĐẠM + 1 TINH BỘT + 1 RAU, hoa quả TUỲ CHỌN (thêm 1 nếu hợp lý, không bắt buộc).
6. Bữa phụ sáng/chiều, pre-workout, post-workout (nếu có trong danh sách bữa cần tạo): 1-2 món, chọn ĐẠM hoặc TINH BỘT (không cần rau/hoa quả) — pre-workout ưu tiên carb nhanh nhẹ bụng, post-workout ưu tiên đạm hấp thu nhanh.
7. KHÔNG chọn dầu ăn, mỡ, bơ hay bất kỳ món nào ngoài 4 nhóm ĐẠM/TINH BỘT/RAU/HOA QUẢ — hệ thống sẽ tự bổ sung chất béo hợp lý phía sau nếu cần, bạn không cần lo phần này.
8. Món ăn phải HỢP LÝ với bữa (sáng không ăn lẩu).
9. Đa dạng: không dùng 1 món đạm cho quá 2 bữa trong ngày.

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
// Chỉ bữa TRƯA bắt buộc có hoa quả — sáng không cần, tối TUỲ CHỌN (AI có
// thể thêm hoặc không, tuỳ số món 3-4 theo đúng yêu cầu linh hoạt).
const FRUIT_MEALS = new Set(["trua"]);

// ============================================================
// FILLER BÉO — tự động thêm 1 món béo HỢP LÝ cho mỗi bữa chính (KHÔNG để
// AI tự chọn, tránh chọn "dầu ăn" nghe như gia vị chứ không phải món ăn).
// Xoay theo từng bữa cho đỡ lặp lại y hệt cả ngày. mealEngine sẽ tự tính
// ra gram=0 nếu bữa đó KHÔNG thật sự cần thêm béo (đạm đã đủ béo tự
// nhiên) — generateMenuAI lọc bỏ mọi món gram=0 trước khi trả về, nên
// user KHÔNG BAO GIỜ thấy dòng "Dầu ô liu 0g" vô nghĩa.
// ============================================================
const AUTO_FAT_FILLER = { sang: "dầu ô liu", trua: "hạnh nhân", toi: "hạt điều" };

/**
 * Chuẩn hoá output AI về danh sách bữa hợp lệ, theo cấu trúc SLOT CỐ ĐỊNH
 * (không phải "có ít nhất 1 món đạm+carb" như trước): mỗi bữa chính lấy
 * ĐÚNG 1 món cho mỗi nhóm (đạm/carb/rau/[hoa quả]) — món dư ra cùng nhóm
 * (VD AI lỡ chọn 2 món rau) bị bỏ lặng lẽ, không tính là lỗi; món KHÔNG
 * thuộc 4 nhóm cho phép (VD AI lỡ chọn dầu ăn dù đã bị cấm) cũng bị bỏ
 * thẳng — chỉ báo lỗi khi THIẾU hẳn 1 nhóm bắt buộc.
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

    // Mỗi nhóm chỉ giữ ĐÚNG 1 món — món khớp nhóm đến SAU bị bỏ (không lỗi,
    // không cộng dồn); món cat="other" (ngoài 4 nhóm, VD AI lỡ chọn dầu ăn)
    // bị bỏ thẳng ngay từ đầu.
    const slots = { protein: null, carb: null, veg: null, fruit: null };
    (m.items || []).forEach(it => {
      const key = matchFoodKey(it.food || it.name);
      if (!key) return;
      if (exclude?.has(key)) return; // loại món dị ứng dù AI lỡ chọn
      const cat = getFoodDisplayCategory(key);
      if (cat === "other") return; // ngoài 4 nhóm cho phép — bỏ thẳng
      if (!slots[cat]) slots[cat] = key; // slot đã có thì bỏ món dư, không ghi đè
    });

    const isMain = MAIN_MEALS.has(mealId);
    const needsFruit = FRUIT_MEALS.has(mealId);
    const foods = [];
    if (slots.protein) foods.push({ key: slots.protein, role: "protein" });
    if (slots.carb) foods.push({ key: slots.carb, role: "carb" });
    if (slots.veg) foods.push({ key: slots.veg, role: "fixed" });
    // Hoa quả LUÔN được nhận nếu AI có chọn (kể cả bữa không bắt buộc như
    // tối) — chỉ validate lỗi khi bữa THUỘC FRUIT_MEALS mà lại thiếu.
    if (slots.fruit) foods.push({ key: slots.fruit, role: "fixed" });

    if (isMain) {
      if (!slots.protein) errors.push(`Bữa "${mealId}" thiếu món đạm`);
      if (!slots.carb) errors.push(`Bữa "${mealId}" thiếu món tinh bột`);
      if (!slots.veg) errors.push(`Bữa "${mealId}" thiếu món rau`);
      if (needsFruit && !slots.fruit) errors.push(`Bữa "${mealId}" thiếu món hoa quả`);
      // Filler béo — thêm SAU khi validate, không tính vào slot bắt buộc,
      // không phải lỗi nếu thiếu (đây là code tự thêm, không phải AI chọn).
      const fillerKey = AUTO_FAT_FILLER[mealId];
      if (fillerKey && LOCAL_FOODS[fillerKey]) foods.push({ key: fillerKey, role: "fat" });
    } else if (!slots.protein && !slots.carb) {
      errors.push(`Bữa phụ "${mealId}" không có món đạm hoặc tinh bột nào`);
    }
    if (foods.length === 0) errors.push(`Bữa "${mealId}" rỗng sau khi lọc`);

    meals.push({ meal_id: mealId, foods });
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

// Lọc bỏ mọi món gram=0 khỏi template ĐÃ QUA mealEngine — filler béo
// (dầu ô liu/hạnh nhân/hạt điều) được đưa vào engine để CÓ THỂ dùng khi
// cần, nhưng khi đạm tự nhiên đã đủ béo, engine trả gram=0 cho nó. Không
// lọc bước này thì user thấy dòng "Dầu ô liu 0g · 0 kcal" vô nghĩa —
// đúng lỗi UI ban đầu. gram=0 không đóng góp gì vào tổng macro nên lọc
// bỏ an toàn tuyệt đối, không lệch số liệu.
function stripZeroGramItems(template) {
  return {
    ...template,
    meals: (template.meals || []).map(m => ({ ...m, items: (m.items || []).filter(it => it.gram > 0) })),
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
  // Chốt chặn thứ 2 (server-side-ish, chạy trước khi tốn quota/gọi AI) —
  // phòng trường hợp UI bị bypass (devtools gọi thẳng hàm). UI chỉ ẩn/khoá
  // nút là lớp 1; đây là lớp 2, không tin tưởng riêng UI.
  const access = getAIMenuAccess(profile, appSettings);
  if (!access.usable) {
    return {
      ok: false,
      error: !access.enabled
        ? "Tính năng AI tạo thực đơn đang tạm khoá."
        : "Tính năng AI tạo thực đơn dành cho gói Trial/Premium. Nâng cấp để mở khoá.",
    };
  }

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
      const template = stripZeroGramItems(applyMealEngineToTemplate(virtualTpl, target));
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
  return stripZeroGramItems(applyMealEngineToTemplate({ ...template, meals }, dayTarget(macro, dayType)));
}

/** Gợi ý món thay thế cùng NHÓM HIỂN THỊ (đạm/carb/rau/hoa quả), loại các món đã có trong bữa */
export function getSwapCandidates(foodKey, currentMealFoods = []) {
  const cat = getFoodDisplayCategory(foodKey);
  const inMeal = new Set(currentMealFoods);
  return Object.keys(LOCAL_FOODS)
    .filter(k => k !== foodKey && !inMeal.has(k) && !EXCLUDE_FROM_CATALOG.has(k) && getFoodDisplayCategory(k) === cat)
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
