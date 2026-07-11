// ============================================================
// mealBlueprints.js — Blueprint là IMPLEMENTATION DETAIL, không phải
// trung tâm sản phẩm (Product Principle: user không bao giờ thấy khái
// niệm "slot", chỉ thấy tên món). Vai trò thật của file này:
//   1. Validator — normalizeMenu() đọc slots[] để biết bữa nào cần đủ
//      những gì, KHÔNG hardcode if(mealId==="sang") nữa.
//   2. Dự phòng ẩn — khi không có Pattern nào hợp (dị ứng lạ, phong
//      cách khác thường), hệ thống rơi xuống ghép nguyên liệu rời theo
//      đúng slots[] này.
//
// Phase 1: chỉ 1 bộ "default" (không phân nhánh theo exerciseType/
// goalType). Phase 2 sẽ thêm biến thể — xem cấu trúc key đã chừa chỗ
// bên dưới (object rỗng, không phải cấu trúc phẳng), thêm sau không
// cần viết lại.
// ============================================================

export const MEAL_BLUEPRINTS = {
  default: {
    sang:       { slots: ["protein", "carb", "veg"],              needsFruit: false, maxFoods: 3 },
    trua:       { slots: ["protein", "carb", "veg"],              needsFruit: true,  maxFoods: 4 },
    toi:        { slots: ["protein", "carb", "veg"],              needsFruit: false, maxFoods: 5, fruitOptional: true },
    phu_sang:   { slots: ["protein", "carb"], anyOf: true,        needsFruit: false, maxFoods: 2 },
    phu_chieu:  { slots: ["protein", "carb"], anyOf: true,        needsFruit: false, maxFoods: 2 },
    pre:        { slots: ["carb"],                                needsFruit: false, maxFoods: 2 },
    post:       { slots: ["protein"],                             needsFruit: false, maxFoods: 2 },
  },
  // Phase 2 — chừa chỗ sẵn: MEAL_BLUEPRINTS["gym_bulk"], MEAL_BLUEPRINTS["cardio_cut"]...
  // resolveBlueprint() dưới đây tự fallback về "default" nếu key không tồn tại,
  // nên thêm biến thể mới KHÔNG cần sửa gì ở normalizeMenu/buildMenuPrompt.
};

/**
 * Lấy đúng blueprint theo persona — Phase 1 luôn trả "default", nhưng gọi
 * qua hàm này (không đọc thẳng MEAL_BLUEPRINTS.default) để Phase 2 chỉ cần
 * đổi bên trong hàm này, không phải sửa mọi nơi gọi.
 * @param {string} exerciseType
 * @param {string} goalType
 */
export function resolveBlueprint(exerciseType, goalType) {
  const key = `${exerciseType || "gym"}_${goalType || "maintain"}`;
  return MEAL_BLUEPRINTS[key] || MEAL_BLUEPRINTS.default;
}
