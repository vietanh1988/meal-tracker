// ============================================================
// promptBuilderV3.js — Prompt SLOT MODE
//
// AI chỉ chọn 1 món cho mỗi slot từ danh sách của slot đó.
// Không tính macro, không tuân cấu trúc — code đã quyết hết.
// Prompt ngắn ~70% so với V2.
// ============================================================

const STYLE_LABEL = {
  vn: "Cơm nhà Việt Nam — bữa cơm truyền thống tự nấu",
  clean: "Eat clean — nấu đơn giản (luộc/hấp/nướng), không chiên rán",
  easy: "Tiện lợi — mua sẵn hoặc chuẩn bị dưới 10 phút",
};

const MEAL_LABEL = {
  sang: "Bữa sáng", phu_sang: "Bữa phụ sáng", trua: "Bữa trưa",
  phu_chieu: "Bữa phụ chiều", pre: "Trước tập", post: "Sau tập", toi: "Bữa tối",
};

const DAY_NAMES = ["chủ nhật", "thứ 2", "thứ 3", "thứ 4", "thứ 5", "thứ 6", "thứ 7"];

/**
 * buildPromptV3 — prompt slot mode
 * @param {Array} plan từ buildSlotPlan: [{ mealId, slots: [{id, items, label, excludeGroupOf?}] }]
 * @param {object} opts { style, dayType, avoidRecent: string[] }
 */
export function buildPromptV3(plan, { style = "vn", dayType = "train", avoidRecent = [] } = {}) {
  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}`;

  const lines = [];
  lines.push(`Bạn là đầu bếp Việt. Chọn ĐÚNG 1 món cho MỖI slot bên dưới, chỉ chọn từ danh sách của slot đó. Trả về DUY NHẤT JSON, không giải thích.`);
  lines.push(``);
  lines.push(`Phong cách: ${STYLE_LABEL[style] || style}`);
  lines.push(`Hôm nay: ${dayName}, ${dateStr} — ${dayType === "train" ? "ngày tập" : "ngày nghỉ"}. Chọn linh hoạt, tránh combo lặp lại quen thuộc.`);
  if (avoidRecent && avoidRecent.length > 0) {
    lines.push(`Món vừa ăn gần đây (ưu tiên chọn KHÁC): ${avoidRecent.slice(0, 15).join(", ")}`);
  }
  lines.push(``);

  const slotIds = [];
  for (const meal of plan) {
    lines.push(`--- ${MEAL_LABEL[meal.mealId] || meal.mealId} ---`);
    for (const slot of meal.slots) {
      slotIds.push(slot.id);
      let note = "";
      if (slot.excludeGroupOf) note = " (chọn NHÓM ĐẠM KHÁC với món mặn bữa trưa: gà/bò/heo/cá-tôm/trứng)";
      if (slot.excludeChosen) note += " (KHÁC món đã chọn ở bữa trước)";
      lines.push(`${slot.id} — ${slot.label}${note}:`);
      lines.push(`  [${slot.items.join(" | ")}]`);
    }
    lines.push(``);
  }

  lines.push(`Trả JSON đúng format (key = slot id, value = tên món y hệt trong danh sách):`);
  lines.push(`{${slotIds.map((id) => `"${id}":"..."`).join(",")}}`);

  return lines.join("\n");
}

/**
 * parseSlotJSON — parse response AI thành answers { slotId: món }
 * Chấp nhận JSON lẫn text rác xung quanh. Fail → trả {} (resolver tự fallback).
 */
export function parseSlotJSON(text) {
  if (!text) return {};
  try {
    // Cắt lấy JSON object đầu tiên
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return {};
    const obj = JSON.parse(m[0]);
    if (typeof obj !== "object" || Array.isArray(obj)) return {};
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") out[k] = v;
      else if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0];
    }
    return out;
  } catch (e) {
    console.warn("[Slot Mode] parseSlotJSON fail:", e.message);
    return {};
  }
}
