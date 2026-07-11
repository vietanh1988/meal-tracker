// ============================================================
// AI MENU SERVICE — AI CHỈ CHỌN MÓN, KHÔNG TÍNH SỐ.
//
// Luồng: buildPrompt (kèm catalog món từ localFoodDB, nhóm theo 4 nhóm CỐ
// ĐỊNH: Đạm/Tinh bột/Rau/Hoa quả — KHÔNG còn nhóm "chất béo" riêng)
// → gọi ai-proxy (server key) → parse JSON {meals[].items[].food}
// → normalizeMenu: khớp từng món về key trong LOCAL_FOODS, mỗi bữa lấy
// ĐÚNG 1 món/nhóm theo slot cố định (sáng = đạm+carb+rau = 3 món;
// trưa/tối = +1 hoa quả = 4 món), món dư/ngoài 4 nhóm bị bỏ lặng lẽ
// → buildVirtualTemplate: dựng template ảo (gram = refGram mặc định)
// → applyMealEngineToTemplate(virtualTpl, dailyTarget) tính gram thật.
//
// Gram/macro cuối cùng LUÔN từ mealEngine + LOCAL_FOODS (data verify),
// nên khớp target ±5% như mọi template khác trong app. AI sai thì retry
// 1 lần, vẫn sai thì trả {ok:false} để UI fallback về kho mẫu admin.
// ============================================================

import { LOCAL_FOODS, getFoodRole } from "./localFoodDB";
import { applyMealEngineToTemplate, computeMealGram, splitDayIntoMeals } from "../mealEngine";
import { ALL_MEALS, DEFAULT_MEAL_CONFIG } from "../mealConstants";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { MEAL_PATTERNS } from "../mealPatterns";
import { resolveBlueprint } from "../mealBlueprints";

// ============================================================
// DANH SÁCH BỮA THẬT — cùng thứ tự ưu tiên App.jsx/Dashboard.jsx/
// AdminPanel.jsx đang dùng ở mọi nơi khác trong app:
// 1. profile.mealConfig — user TỰ chỉnh riêng (bấm "⚙️ Bật/tắt bữa"
// khi KHÔNG phải admin → lưu vào profile cá nhân, không ảnh hưởng ai)
// 2. appSettings.meal_config — admin đặt làm mặc định CHUNG cho mọi user
// chưa tự chỉnh gì (JSON string, cần parse)
// 3. DEFAULT_MEAL_CONFIG — hằng số cứng trong mealConstants.js, chỉ
// dùng khi cả 2 trên đều không có (tài khoản hoàn toàn mới/lỗi parse)
//
// TRƯỚC ĐÂY AIMenuGenerator.jsx và AICoachPanel.jsx BỎ QUA 2 lớp đầu,
// luôn dùng cứng DEFAULT_MEAL_CONFIG — nghĩa là user tắt bớt bữa (VD tắt
// pre/post-workout) thì AI vẫn cứ sinh đủ 5 bữa mặc định, phớt lờ lựa
// chọn của họ. Giờ dùng chung đúng 1 hàm này ở mọi nơi AI sinh thực đơn.
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
// QUYỀN DÙNG — 2 lớp độc lập:
// 1. Cờ toàn cục "ai_menu_gen" (Quản lý tính năng) — admin tắt thì KHÔNG
// ai dùng được, kể cả Premium. Dùng khi cần dừng khẩn (lỗi AI, quá tải).
// 2. Tier user — Free luôn bị khoá dù cờ có bật, Trial/Premium luôn được
// dùng khi cờ bật. Đây là gate SẢN PHẨM (bán hàng), tách khỏi cờ kỹ
// thuật ở trên để 2 việc không giẫm chân nhau.
//
// @returns {{enabled:boolean, locked:boolean, usable:boolean}}
// enabled = cờ toàn cục đang bật (chưa xét tier)
// locked = cờ bật NHƯNG tier free → hiện nút dạng khoá + gợi ý nâng cấp
// usable = cờ bật VÀ tier trial/premium → dùng bình thường
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
  const role = getFoodRole(key);
  if (role === "protein") return "protein";
  if (role === "carb") return "carb";
  if (item.cat === "veg") return "veg";
  if (item.cat === "fruit") return "fruit";
  if (role === "fat") return "fat";
  return "other";
}

// ============================================================
// PATTERN LIBRARY — ưu tiên số 1 trong Recommendation (Product Principle:
// "Phở bò" là ngôn ngữ của user, "protein+carb+rau" là ngôn ngữ của engine).
// AI được yêu cầu chọn TÊN pattern trước; chỉ ghép nguyên liệu rời (Food
// Pool, dự phòng ẩn) khi KHÔNG pattern nào hợp — dị ứng đặc biệt, phong
// cách khác thường.
// ============================================================

// Lọc pattern KHÔNG dính dị ứng VÀ KHÔNG lặp lại pattern đã dùng gần đây
// (Variety) — dùng chung cho cả lúc build prompt (chỉ cho AI thấy pattern
// hợp lệ) lẫn lúc validate (đề phòng AI chọn tên pattern đã bị loại).
export function getAvailablePatterns(mealId, exclude, avoidPatternNames) {
  const patterns = MEAL_PATTERNS[mealId] || [];
  let result = patterns;
  if (exclude && exclude.size > 0) {
    result = result.filter(p => !Object.values(p.slots).some(foodKey => exclude.has(foodKey)));
  }
  if (avoidPatternNames && avoidPatternNames.size > 0) {
    const stillAvailable = result.filter(p => !avoidPatternNames.has(p.name));
    // Nếu lọc hết sạch (VD chỉ có 1-2 pattern cho bữa đó, đều vừa ăn gần
    // đây) thì THÀ LẶP còn hơn KHÔNG CÓ GÌ — Variety là "nên tránh", không
    // phải luật cứng như dị ứng. Rơi về danh sách trước khi lọc Variety.
    result = stillAvailable.length > 0 ? stillAvailable : result;
  }
  return result;
}

// ============================================================
// VARIETY — không lặp món quá X lần trong Y ngày gần nhất (nguyên tắc
// UX, không phải AI). Suy luận "bữa hôm đó có phải Pattern nào không"
// bằng cách so khớp tập nguyên liệu đã lưu với slots của từng pattern —
// KHÔNG cần thêm cột DB mới (item đã lưu gồm cả filler béo tự thêm, nên
// so khớp kiểu "chứa đủ tất cả nguyên liệu slot", không phải khớp tuyệt
// đối, để không bị filler làm sai lệch kết quả).
// ============================================================

/** Bữa đã lưu (mảng items {food,...}) có khớp đúng 1 pattern nào của mealId không */
export function inferPatternFromItems(mealId, items) {
  const patterns = MEAL_PATTERNS[mealId] || [];
  const foodSet = new Set((items || []).map(it => (it.food || "").toLowerCase().trim()));
  const found = patterns.find(p => Object.values(p.slots).every(f => foodSet.has(f.toLowerCase())));
  return found ? found.name : null;
}

/**
 * Từ raw rows của meal_logs (getMealHistory trong useUserData.js), suy ra
 * tập tên pattern đã dùng trong N ngày gần nhất — dùng để truyền vào
 * generateMenuAI({avoidPatternNames}) tránh AI gợi ý lặp lại.
 * @param {Array} historyRows - kết quả getMealHistory(startDate, endDate)
 * @param {number} days - chỉ tính N ngày gần nhất (mặc định 3)
 */
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
    if (LOCAL_FOODS[key].tier === "occasional") return; // Product Principle: rẻ/phổ thông mặc định, đắt/hiếm chỉ khi user chủ động chọn (chưa có ở Phase 1)
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
function buildMenuPrompt({ profile, macro, dayType, mealIds, prefs, avoidFoods = [], exclude, avoidPatternNames }) {
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

  // Danh sách PATTERN theo từng bữa cần tạo — ưu tiên số 1, AI chỉ cần trả
  // TÊN, không cần liệt kê nguyên liệu (hệ thống tự tra sẵn).
  const patternLines = mealIds.map(mealId => {
    const patterns = getAvailablePatterns(mealId, exclude, avoidPatternNames);
    if (patterns.length === 0) return null;
    return `${mealId}: ${patterns.map(p => p.name).join(", ")}`;
  }).filter(Boolean).join("\n");

  return `Bạn là chuyên gia dinh dưỡng Việt Nam. Hãy CHỌN MÓN xây thực đơn 1 ngày (${dayType === "train" ? "ngày tập" : "ngày nghỉ"}) cho người dùng sau:
- Mục tiêu: ${goalLabel}, target cả ngày ~${target.cal} kcal (P ${target.p}g / C ${target.c}g / F ${target.f}g) — hệ thống sẽ TỰ tính gram, bạn KHÔNG cần tính.
${prefLines.length ? prefLines.join("\n") + "\n" : ""}
QUY TẮC BẮT BUỘC — ƯU TIÊN CHỌN PATTERN (món có tên quen thuộc) TRƯỚC:
1. Với MỖI bữa, xem danh sách PATTERN GỢI Ý bên dưới trước — nếu có pattern hợp phong cách/mục tiêu, trả về "pattern":"<tên pattern đúng chính xác>" cho bữa đó, KHÔNG cần liệt kê "items".
2. CHỈ khi KHÔNG pattern nào trong danh sách hợp (dị ứng đặc biệt, phong cách khác thường) mới tự ghép nguyên liệu: trả "pattern":"custom" kèm "items" chọn từ DANH SÁCH MÓN RỜI bên dưới — CHỈ được chọn món có TÊN CHÍNH XÁC trong danh sách đó, không tự bịa.
3. Nếu tự ghép ("custom"), theo đúng cấu trúc: sáng = ĐÚNG 3 món (1 ĐẠM+1 TINH BỘT+1 RAU, không hoa quả); trưa = ĐÚNG 4 món (+1 HOA QUẢ bắt buộc); tối = 3-4 món (đạm+carb+rau bắt buộc, hoa quả tuỳ chọn); bữa phụ/pre/post = 1-2 món (đạm hoặc carb).
4. KHÔNG chọn dầu ăn, mỡ, bơ hay bất kỳ món nào ngoài ĐẠM/TINH BỘT/RAU/HOA QUẢ dù ở pattern hay tự ghép — hệ thống tự bổ sung chất béo hợp lý phía sau.
5. Đa dạng: không dùng 1 món đạm/1 pattern cho quá 2 bữa trong ngày.
6. Tạo đúng các bữa: ${mealNames}.

PATTERN GỢI Ý THEO TỪNG BỮA (ưu tiên chọn từ đây):
${patternLines || "(không có pattern nào — mọi bữa tự ghép nguyên liệu)"}

DANH SÁCH MÓN RỜI (chỉ dùng khi "pattern":"custom"):
${buildFoodCatalog(exclude)}

Trả về DUY NHẤT JSON sau, không markdown, không giải thích thêm:
{"meals":[{"meal_id":"sang","pattern":"Phở bò"},{"meal_id":"trua","pattern":"custom","items":[{"food":"tên món đúng như danh sách"}]}],"note":"1 câu mô tả ngắn về thực đơn"}`;
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
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI không trả JSON hợp lệ");
  return JSON.parse(clean.slice(start, end + 1));
}

// ============================================================
// 4. NORMALIZE + VALIDATE
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
const FRUIT_MEALS = new Set(["trua"]);

// Filler béo — rẻ, phổ thông, đúng Product Principle (KHÔNG dùng dầu ô
// liu/hạnh nhân/hạt điều nữa — đồ nhập, không rẻ với bữa cơm nhà bình dân).
// Áp cho CẢ bữa phụ/pre/post — trước đây chỉ áp bữa chính, khiến bữa phụ
// (VD "chỉ có whey", "chỉ có bánh mì") hoàn toàn không đóng góp béo, cộng
// dồn lại làm Fat cả ngày hụt tới 15-17% (bug thật, phát hiện qua test
// sống). Vẫn đúng giới hạn "1-2 món" của bữa phụ: base 1 món + filler = 2
// món tối đa, và filler tự vô hình (gram=0, bị strip) nếu không cần tới.
const AUTO_FAT_FILLER = {
  sang: "lạc", trua: "mè", toi: "đậu phộng",
  phu_sang: "lạc", phu_chieu: "mè", pre: "đậu phộng", post: "lạc",
};

// Validate slots đã điền (protein/carb/veg/fruit) + thêm filler béo — dùng
// CHUNG cho cả nhánh pattern lẫn nhánh ghép rời, để 2 đường không lệch luật.
function finalizeMealSlots(mealId, slots, errors) {
  const isMain = MAIN_MEALS.has(mealId);
  const needsFruit = FRUIT_MEALS.has(mealId);
  const foods = [];
  if (slots.protein) foods.push({ key: slots.protein, role: "protein" });
  if (slots.carb) foods.push({ key: slots.carb, role: "carb" });
  if (slots.veg) foods.push({ key: slots.veg, role: "fixed" });
  if (slots.fruit) foods.push({ key: slots.fruit, role: "fixed" });

  const fillerKey = AUTO_FAT_FILLER[mealId];
  if (isMain) {
    if (!slots.protein) errors.push(`Bữa "${mealId}" thiếu món đạm`);
    if (!slots.carb) errors.push(`Bữa "${mealId}" thiếu món tinh bột`);
    if (!slots.veg) errors.push(`Bữa "${mealId}" thiếu món rau`);
    if (needsFruit && !slots.fruit) errors.push(`Bữa "${mealId}" thiếu món hoa quả`);
    if (fillerKey && LOCAL_FOODS[fillerKey]) foods.push({ key: fillerKey, role: "fat" });
  } else if (!slots.protein && !slots.carb) {
    errors.push(`Bữa phụ "${mealId}" không có món đạm hoặc tinh bột nào`);
  } else {
    if (fillerKey && LOCAL_FOODS[fillerKey]) foods.push({ key: fillerKey, role: "fat" });
  }
  if (foods.length === 0) errors.push(`Bữa "${mealId}" rỗng sau khi lọc`);
  return foods;
}

/**
 * Chuẩn hoá output AI — ƯU TIÊN nhận PATTERN nếu AI trả tên hợp lệ (khớp
 * đúng 1 pattern trong getAvailablePatterns, chưa bị lọc dị ứng). CHỈ khi
 * không dùng được pattern (AI trả "custom", tên không khớp, hoặc bị dị
 * ứng lọc mất) mới rơi xuống ghép nguyên liệu rời như cũ.
 */
export function normalizeMenu(raw, mealIds, exclude, avoidPatternNames) {
  const errors = [];
  const wanted = new Set(mealIds);
  const byId = {};
  (raw?.meals || []).forEach(m => { if (wanted.has(m.meal_id)) byId[m.meal_id] = m; });

  const meals = [];
  for (const mealId of mealIds) {
    const m = byId[mealId];
    if (!m) { errors.push(`Thiếu bữa "${mealId}"`); continue; }

    let slots = { protein: null, carb: null, veg: null, fruit: null };
    let usedPattern = null;

    const patternName = (m.pattern || "").trim();
    if (patternName && patternName.toLowerCase() !== "custom") {
      const available = getAvailablePatterns(mealId, exclude, avoidPatternNames);
      const found = available.find(p => p.name.toLowerCase() === patternName.toLowerCase());
      if (found) { slots = { ...found.slots }; usedPattern = found.name; }
      // Không khớp (AI hallucinate tên, hoặc pattern bị lọc dị ứng) → rơi
      // xuống ghép items bên dưới, KHÔNG báo lỗi ngay — items có thể vẫn hợp lệ.
    }

    if (!usedPattern) {
      (m.items || []).forEach(it => {
        const key = matchFoodKey(it.food || it.name);
        if (!key) return;
        if (exclude?.has(key)) return;
        const cat = getFoodDisplayCategory(key);
        if (cat === "other" || cat === "fat") return;
        if (!slots[cat]) slots[cat] = key;
      });
    }

    // BỮA CHÍNH KHÔNG ĐƯỢC PHÉP "custom" — user cần thấy TÊN MÓN CỤ THỂ
    // ("Bún thịt"), không phải danh sách nguyên liệu rời ("rau muống, thịt
    // heo, bún"). AI đôi khi tự quyết "custom" dù pattern vẫn còn (thường
    // vì danh sách pattern hợp lệ bị Variety lọc ngắn lại, AI thấy ít lựa
    // chọn rồi tự ý ghép thay vì chọn) — ép chọn NGẪU NHIÊN 1 pattern còn
    // hợp lệ (đã lọc dị ứng + Variety) thay vì chấp nhận AI tự ghép.
    // getAvailablePatterns LUÔN trả về ít nhất 1 pattern cho bữa chính TRỪ
    // KHI dị ứng loại sạch (an toàn dị ứng > có tên món cụ thể) — lúc đó
    // mới thật sự rơi xuống items AI đã ghép ở trên.
    if (MAIN_MEALS.has(mealId) && !usedPattern) {
      const available = getAvailablePatterns(mealId, exclude, avoidPatternNames);
      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        slots = { ...picked.slots };
        usedPattern = picked.name;
      }
    }

    const foods = finalizeMealSlots(mealId, slots, errors);
    meals.push({ meal_id: mealId, foods, pattern: usedPattern });
  }

  return errors.length ? { ok: false, errors, meals } : { ok: true, meals };
}

// ============================================================
// 5. VIRTUAL TEMPLATE → MEAL ENGINE
// ============================================================

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

function stripZeroGramItems(template) {
  return {
    ...template,
    meals: (template.meals || []).map(m => ({ ...m, items: (m.items || []).filter(it => it.gram > 0) })),
  };
}

// mealEngine.js tính lại gram nên KHÔNG biết/giữ tên pattern đã dùng —
// nối lại bằng meal_id SAU KHI engine chạy xong (post-processing thuần,
// không đụng mealEngine.js). Thiếu bước này thì UI không có gì để hiện
// "Phở bò" — chỉ thấy nguyên liệu rời, đúng bug vừa gặp.
function attachPatternNames(template, norm) {
  const patternByMealId = {};
  (norm.meals || []).forEach(m => { if (m.pattern) patternByMealId[m.meal_id] = m.pattern; });
  return {
    ...template,
    meals: (template.meals || []).map(m => ({ ...m, pattern: patternByMealId[m.meal_id] || null })),
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
  const prompt = buildMenuPrompt({ profile, macro, dayType, mealIds, prefs, avoidFoods, exclude, avoidPatternNames });
  const target = dayTarget(macro, dayType);

  let lastErrors = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const retryHint = attempt === 0 ? "" :
        `\n\nLẦN TRƯỚC BỊ LỖI, hãy sửa: ${lastErrors.join("; ")}. Nhớ: tên món phải ĐÚNG CHÍNH XÁC như danh sách.`;
      const text = await callAI(prompt + retryHint, { provider: prov, model: mdl });
      const raw = parseMenuJSON(text);
      const norm = normalizeMenu(raw, mealIds, exclude, avoidPatternNames);
      if (!norm.ok) { lastErrors = norm.errors; continue; }

      const virtualTpl = buildVirtualTemplate(norm.meals, dayType);
      const template = attachPatternNames(stripZeroGramItems(applyMealEngineToTemplate(virtualTpl, target)), norm);
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

export function swapFoodInTemplate(template, mealId, oldFood, newFoodKey, macro, dayType) {
  if (!LOCAL_FOODS[newFoodKey]) return template;
  const meals = (template.meals || []).map(m => {
    if (m.meal_id !== mealId) return m;
    const items = (m.items || []).map(it =>
      it.food === oldFood ? foodToItem(newFoodKey) : foodToItem(it.food, it.gram)
    );
    // Đổi 1 nguyên liệu → bữa không còn ĐÚNG là món gốc nữa (VD "Bún thịt"
    // nhưng đã đổi thịt heo → cá hồi) — chủ động bỏ tên pattern, tránh hiện
    // sai tên món. Người dùng vẫn thấy nguyên liệu, chỉ mất "tên gọi đẹp".
    return { ...m, items, pattern: null };
  });
  return stripZeroGramItems(applyMealEngineToTemplate({ ...template, meals }, dayTarget(macro, dayType)));
}

/**
 * Đổi CẢ MÓN (không phải 1 nguyên liệu lẻ) — hành vi user làm HẰNG NGÀY:
 * "không thích Phở bò, đổi sang Cơm gà" chứ không phải "tạo lại toàn bộ".
 * Thay slots của bữa đó bằng pattern mới, tính lại gram bằng engine —
 * KHÔNG tốn lượt AI, tái dùng finalizeMealSlots (validate+filler) và
 * attachPatternNames (giữ tên pattern các bữa KHÁC không bị đổi).
 */
export function swapPatternInTemplate(template, mealId, newPatternName, macro, dayType) {
  const newPattern = (MEAL_PATTERNS[mealId] || []).find(p => p.name === newPatternName);
  if (!newPattern) return template;

  const errors = [];
  const foods = finalizeMealSlots(mealId, newPattern.slots, errors); // tự thêm filler béo nếu cần, giống lúc generate

  const meals = (template.meals || []).map(m =>
    m.meal_id === mealId ? { meal_id: mealId, items: foods.map(f => foodToItem(f.key)) } : m
  );
  // Giữ nguyên tên pattern của các bữa KHÔNG bị đổi — chỉ đổi tên bữa vừa swap.
  const patternMap = (template.meals || []).map(m => ({
    meal_id: m.meal_id, pattern: m.meal_id === mealId ? newPattern.name : (m.pattern || null),
  }));

  const recomputed = stripZeroGramItems(applyMealEngineToTemplate({ ...template, meals }, dayTarget(macro, dayType)));
  return attachPatternNames(recomputed, { meals: patternMap });
}

/**
 * Lý do gợi ý TĨNH ("vì sao gợi ý món này") — đọc từ reasonTemplate đã
 * soạn sẵn trong mealPatterns.js, KHÔNG tốn thêm lệnh AI, chỉ chọn câu
 * khớp goalType hiện tại. Không có reasonTemplate hoặc không khớp goal
 * nào → trả null, UI tự ẩn phần lý do (không phải lỗi).
 */
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
// ĐƠN VỊ TỰ NHIÊN — CHỈ dùng để HIỂN THỊ ("3 quả (150g)" thay vì chỉ
// "150g"), KHÔNG đụng gì tới gram/macro thật (vẫn tính bằng gram như cũ,
// đây chỉ là lớp format phía trên). Chỉ định nghĩa cho món có đơn vị tự
// nhiên RÕ RÀNG (đếm được/múc muỗng/múc bát) — món cân theo trọng lượng
// (thịt/cá/rau lá) vẫn hiện gram thẳng, đúng cách app dinh dưỡng VN
// thường làm, không cố ép đơn vị cho mọi món.
// Số liệu hiệu chỉnh theo đúng ảnh mẫu user gửi (trứng 50g/quả, chuối
// 120g/quả, cơm ~150g/bát, bánh mì lát 40g/lát...).
// ============================================================
const DISPLAY_UNIT = {
  "trứng gà": { unit: "quả", gramPerUnit: 50 },
  "trứng gà luộc": { unit: "quả", gramPerUnit: 50 },
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
  "whey": { unit: "muỗng", gramPerUnit: 30 },
  "cơm trắng": { unit: "bát", gramPerUnit: 150 },
  "bún": { unit: "bát", gramPerUnit: 150 },
  "cháo": { unit: "bát", gramPerUnit: 250 },
  "xôi": { unit: "phần", gramPerUnit: 150 },
  "bánh mì": { unit: "lát", gramPerUnit: 40 },
  "dưa hấu": { unit: "miếng", gramPerUnit: 150 },
};

/**
 * Format gram thành đơn vị tự nhiên cho user đọc dễ hơn, VD "3 quả (150g)".
 * Món không có trong bảng (thịt/cá/rau cân theo trọng lượng) → trả thẳng
 * "150g" như trước — không phải lỗi, là thiết kế (đúng cách cân đo thật).
 */
export function formatFoodPortion(foodKey, gram) {
  const key = (foodKey || "").toLowerCase().trim();
  const unit = DISPLAY_UNIT[key];
  if (!unit || !gram) return `${gram}g`;
  const qty = gram / unit.gramPerUnit;
  const rounded = Math.round(qty * 2) / 2; // làm tròn tới 0.5 gần nhất — tự nhiên hơn số lẻ
  const qtyLabel = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  if (rounded <= 0) return `${gram}g`;
  return `${qtyLabel} ${unit.unit} (${gram}g)`;
}

/**
 * Viết hoa CHỈ chữ cái đầu ("Rau muống"), KHÔNG viết hoa mọi từ như CSS
 * text-transform:capitalize ("Rau Muống" — đúng kiểu tiếng Anh, sai kiểu
 * tiếng Việt, không khớp ảnh thiết kế mẫu). Dùng thay text-transform CSS
 * ở mọi nơi hiện tên món.
 */
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
