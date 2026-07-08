import { getFoodRole, getGramLimit } from "./lib/localFoodDB";

// ============================================================
// MEAL ENGINE — tự tính gram từng món trong 1 mẫu (template) sao cho khớp
// đúng target calo/macro của TỪNG USER RIÊNG BIỆT. Template chỉ lưu tên
// món + vai trò (đạm/carb/béo/cố định), không lưu gram cứng — Engine tính
// lại gram mỗi lần áp dụng.
//
// Không đổi gì ở calcMacro.js (nơi tính target cả ngày). Engine này CHỈ
// nhận target đã tính sẵn rồi phân bổ xuống từng bữa, từng món.
// ============================================================

// ============================================================
// BƯỚC A — chia target cả ngày ra từng bữa theo trọng số cố định.
// Trọng số CHỈ cộng với các bữa THỰC SỰ có trong mẫu — mẫu có bao nhiêu bữa
// (3, 4, 5 hay 6) đều tự chia lại đủ 100%, không cần bảng riêng theo số bữa.
// ============================================================
export const MEAL_WEIGHTS = {
  sang: 25,
  phu_sang: 10,
  trua: 30,
  phu_chieu: 10,
  pre: 12,
  post: 15,
  toi: 25,
};

/**
 * @param {{cal:number, p:number, c:number, f:number}} dailyTarget - target cả ngày (từ calcMacro.js)
 * @param {string[]} mealIds - danh sách id bữa CÓ trong mẫu, VD ["sang","trua","toi"]
 * @returns {Object} map mealId -> {cal,p,c,f} target riêng bữa đó
 */
export function splitDayIntoMeals(dailyTarget, mealIds) {
  const ids = (mealIds || []).filter(id => MEAL_WEIGHTS[id] !== undefined);
  if (ids.length === 0) return {};

  const totalWeight = ids.reduce((s, id) => s + MEAL_WEIGHTS[id], 0);
  const result = {};

  ids.forEach(id => {
    const ratio = totalWeight > 0 ? MEAL_WEIGHTS[id] / totalWeight : 1 / ids.length;
    result[id] = {
      cal: Math.round((dailyTarget.cal || 0) * ratio),
      p: Math.round((dailyTarget.p || 0) * ratio * 10) / 10,
      c: Math.round((dailyTarget.c || 0) * ratio * 10) / 10,
      f: Math.round((dailyTarget.f || 0) * ratio * 10) / 10,
    };
  });

  return result;
}

// ============================================================
// BƯỚC B — trong 1 bữa, chia gram từng món theo đúng thứ tự vai trò:
// 1. fixed (rau...)  → giữ nguyên gram tham khảo, không scale
// 2. protein          → scale khớp target Protein của bữa
// 3. fat              → scale bù phần Fat còn thiếu
// 4. carb             → scale bù phần Carb còn lại
//
// Chạy 2 VÒNG: vòng 1 ước lượng thô (giả định carb không có đạm/béo "phụ").
// Vòng 2 dùng đúng số đạm/béo mà carb thực sự đóng góp ở vòng 1 (VD bông
// cải có sẵn chút đạm) để trừ lại cho đúng — không phải optimizer, chỉ lặp
// lại đúng 3 bước cũ thêm 1 lần cho khớp hơn.
//
// Mọi kết quả bị ép trong khoảng [min,max] của từng món. Sai số so với
// target chấp nhận ±5%, không cần khớp tuyệt đối.
// ============================================================

/**
 * @param {{cal:number,p:number,c:number,f:number}} mealTarget - target riêng bữa này (từ splitDayIntoMeals)
 * @param {Array} foods - danh sách món trong bữa, mỗi món:
 *   { name, role: "protein"|"carb"|"fat"|"fixed",
 *     per100: {cal,p,c,f} (macro trên 100g),
 *     refGram: number (gram admin nhập lúc tạo mẫu, dùng làm tỉ lệ ban đầu),
 *     min, max: number (giới hạn gram, từ getGramLimit) }
 * @returns {Array} danh sách món kèm gram cuối cùng + macro thực tế
 */
export function computeMealGram(mealTarget, foods) {
  if (!foods || foods.length === 0) return [];

  const byRole = { fixed: [], protein: [], fat: [], carb: [] };
  foods.forEach(f => {
    const role = byRole[f.role] ? f.role : "fixed";
    byRole[role].push(f);
  });

  // Fixed — tính 1 lần duy nhất, không đổi qua các vòng lặp
  const fixedResults = byRole.fixed.map(food => {
    const gram = Math.max(0, food.refGram || 0);
    return makeResult(food, gram);
  });
  const fixedTotal = sumResults(fixedResults);

  let proteinResults = [], fatResults = [], carbResults = [];
  // Ước lượng ban đầu: carb/fat chưa đóng góp gì thêm (vòng 1)
  let carbSideEffect = { p: 0, f: 0 };
  // Đạm mà nhóm FAT đóng góp (hạnh nhân ~21g đạm/100g, bơ đậu phộng ~25g...)
  // — nhóm fat scale SAU protein nên vòng 1 chưa biết, vòng 2 trừ lại cho đúng.
  // Thiếu hồi tiếp này từng gây dư đạm hệ thống ~6g/bữa khi mẫu có hạt/dầu.
  let fatSideEffect = { p: 0 };

  for (let pass = 0; pass < 2; pass++) {
    const proteinNeeded = Math.max(0, (mealTarget.p || 0) - fixedTotal.p - carbSideEffect.p - fatSideEffect.p);
    proteinResults = scaleGroup(byRole.protein, proteinNeeded, "p");
    const proteinTotal = sumResults(proteinResults);

    const fatNeeded = Math.max(0, (mealTarget.f || 0) - fixedTotal.f - proteinTotal.f - carbSideEffect.f);
    fatResults = scaleGroup(byRole.fat, fatNeeded, "f");
    const fatTotal = sumResults(fatResults);

    const carbNeeded = Math.max(0, (mealTarget.c || 0) - fixedTotal.c - proteinTotal.c - fatTotal.c);
    carbResults = scaleGroup(byRole.carb, carbNeeded, "c");
    const carbTotal = sumResults(carbResults);

    // Chuẩn bị cho vòng lặp kế tiếp: phần đạm/béo mà carb và fat THỰC SỰ đóng góp
    carbSideEffect = { p: carbTotal.p, f: carbTotal.f };
    fatSideEffect = { p: fatTotal.p };
  }

  return [...fixedResults, ...proteinResults, ...fatResults, ...carbResults];
}

// Scale 1 nhóm món (VD tất cả món role=protein trong bữa) để tổng đúng
// `needed` gram-chất-đó, giữ nguyên TỈ LỆ tương đối giữa các món trong nhóm
// (theo refGram admin nhập), ép trong [min,max] từng món.
//
// FIX: nếu `needed<=0` (chất này đã ĐỦ hoặc DƯ ngay từ nhóm xử lý trước —
// VD trứng vốn nhiều béo tự nhiên đã đủ target Fat của bữa), KHÔNG ép món
// còn lại (VD Dầu ăn) lên sàn tối thiểu nữa — cho về 0 thay vì cộng dư
// không cần thiết. Trước đây luôn ép min dù không cần, gây dư béo/carb.
function scaleGroup(foodsInGroup, needed, macroKey) {
  if (foodsInGroup.length === 0) return [];

  const currentTotal = foodsInGroup.reduce((s, f) => s + f.per100[macroKey] * (f.refGram / 100), 0);
  const alreadyEnough = needed <= 0;

  return foodsInGroup.map(food => {
    let gram;
    if (alreadyEnough) {
      gram = 0;
    } else if (currentTotal > 0) {
      gram = food.refGram * (needed / currentTotal);
    } else {
      // Món này vốn không có chất cần bù (VD carb=0) — không scale được theo
      // tỉ lệ, giữ nguyên gram tham khảo
      gram = food.refGram;
    }
    return makeResult(food, gram, alreadyEnough ? 0 : food.min, food.max);
  });
}

function makeResult(food, rawGram, min, max) {
  const gram = Math.min(max ?? 100000, Math.max(min ?? 0, Math.round(rawGram)));
  const r = gram / 100;
  return {
    name: food.name,
    role: food.role,
    gram,
    p: Math.round(food.per100.p * r * 10) / 10,
    c: Math.round(food.per100.c * r * 10) / 10,
    f: Math.round(food.per100.f * r * 10) / 10,
    cal: Math.round(gram * (food.per100.cal / 100)),
  };
}

// ============================================================
// TIỆN ÍCH — áp Meal Engine lên 1 template, trả về template MỚI với
// items đã tính lại gram theo đúng target của user. KHÔNG đụng gì tới
// applyTemplate() trong useUserData.js — hàm đó vẫn nhận vào 1 template
// (có `meals[].items[]`) y hệt như trước, chỉ là giờ ta đưa vào bản đã
// được Meal Engine tính lại thay vì bản gốc admin lưu.
// ============================================================

/**
 * @param {Object} template - mẫu gốc từ Kho mẫu (template.meals[].items[] có gram admin nhập)
 * @param {{cal:number,p:number,c:number,f:number}} dailyTarget - target cả ngày của user (đúng ngày tập/nghỉ của mẫu)
 * @returns {Object} template mới, cùng cấu trúc, gram đã tính lại theo đúng user
 */
export function applyMealEngineToTemplate(template, dailyTarget) {
  const tplMeals = template.meals || [];
  const mealIds = tplMeals.map(m => m.meal_id);
  const perMealTarget = splitDayIntoMeals(dailyTarget, mealIds);

  const newMeals = tplMeals.map(m => {
    const mealTarget = perMealTarget[m.meal_id] || { cal: 0, p: 0, c: 0, f: 0 };

    const foods = (m.items || []).map(it => {
      const name = it.food || it.name || "";
      const refGram = it.gram || 100;
      const per100 = refGram > 0 ? {
        cal: (it.cal || 0) / refGram * 100,
        p: (it.p ?? it.protein ?? 0) / refGram * 100,
        c: (it.c ?? it.carb ?? 0) / refGram * 100,
        f: (it.f ?? it.fat ?? 0) / refGram * 100,
      } : { cal: 0, p: 0, c: 0, f: 0 };
      const fiberPer100 = refGram > 0 ? (it.fiber || 0) / refGram * 100 : 0;
      const limit = getGramLimit(name);
      return { name, role: getFoodRole(name), per100, refGram, min: limit.min, max: limit.max, fiberPer100 };
    });

    const computed = computeMealGram(mealTarget, foods);
    const items = computed.map(r => {
      const src = foods.find(f => f.name === r.name);
      return {
        food: r.name,
        gram: r.gram,
        unit: "g",
        qty: 1,
        p: r.p, c: r.c, f: r.f,
        fiber: Math.round((src?.fiberPer100 || 0) * r.gram / 100 * 10) / 10,
        cal: r.cal,
      };
    });

    return { ...m, items };
  });

  return { ...template, meals: newMeals };
}

function sumResults(results) {
  return results.reduce((a, r) => ({ p: a.p + r.p, c: a.c + r.c, f: a.f + r.f, cal: a.cal + r.cal }), { p: 0, c: 0, f: 0, cal: 0 });
}
