// ============================================================
// promptBuilderV2.js — AI Menu V2 Bước 4
// Prompt kiểu scoring: priority + rubric thay rule cấm.
// AI CHỈ trả food key — không đặt tên, không tính gram.
// Prompt không biết FoodDB có bao nhiêu món (whitelist đã cap).
// ============================================================

import { SLOT_RULES } from "../mealGrammar";

const STYLE_LABEL = {
  vn: "Cơm nhà Việt Nam — bữa cơm truyền thống tự nấu (cơm/canh/món mặn/rau)",
  clean: "Eat clean — nguyên liệu sạch, nấu đơn giản (luộc/hấp/nướng), không chiên rán",
  easy: "Tiện lợi — mua sẵn hoặc chuẩn bị dưới 10 phút (bánh mì, xôi, trứng luộc, cơm hộp, sữa chua)",
};

const GOAL_LABEL = { bulk: "Tăng cơ (surplus)", cut: "Giảm mỡ (deficit)", maintain: "Duy trì" };
const DIET_LABEL = { keto: "Keto (≤50g carb/ngày)", low_carb: "Low-carb (≤100g carb/ngày)", balanced: "" };

/**
 * buildPromptV2({ profile, target, dayType, mealIds, whitelist, prefs })
 * target = {cal,p,c,f} từ dayTarget(). whitelist từ buildWhitelist().
 */
export function buildPromptV2({ profile = {}, target, dayType, mealIds, whitelist, prefs = {}, avoidFoods = [] }) {
  const style = prefs.style || null;
  const goal = profile.goalType || "maintain";
  const diet = profile.dietStrategy || "balanced";

  // Slot rules — data từ grammar, không prose dài
  const slotLines = mealIds.map(m => {
    const r = SLOT_RULES[m];
    if (!r) return null;
    const need = Object.keys(r.need).length ? ` — bắt buộc có: ${Object.keys(r.need).join("+")}` : "";
    return `${m} (${r.name}): tối đa ${r.maxDishes} món${need}. ${r.hint}`;
  }).filter(Boolean).join("\n");

  // Whitelist — nhóm theo role, kèm macro + điểm hợp bữa cao nhất
  const byRole = { protein: [], carb: [], fixed: [], fat: [] };
  whitelist.items.forEach(it => byRole[it.role]?.push(it));
  const fmtItem = it => {
    const bestSlots = Object.entries(it.slots || {}).filter(([, s]) => s >= 8).map(([k]) => k);
    return `${it.key} (${it.cal}cal/${it.p}P/${it.c}C/${it.f}F${bestSlots.length ? " · hợp: " + bestSlots.join(",") : ""})`;
  };
  const wlText = [
    `ĐẠM: ${byRole.protein.map(fmtItem).join("; ")}`,
    `TINH BỘT: ${byRole.carb.map(fmtItem).join("; ")}`,
    `RAU/CANH/TRÁI CÂY: ${byRole.fixed.map(fmtItem).join("; ")}`,
    byRole.fat.length ? `BÉO/HẠT: ${byRole.fat.map(fmtItem).join("; ")}` : null,
  ].filter(Boolean).join("\n");

  const prefLines = [];
  if (style) prefLines.push(`- Phong cách: ${STYLE_LABEL[style] || style}`);
  if (DIET_LABEL[diet]) prefLines.push(`- Chế độ: ${DIET_LABEL[diet]} — whitelist đã lọc sẵn, cứ chọn thoải mái trong danh sách`);
  if (prefs.avoid?.trim()) prefLines.push(`- KHÔNG dùng (dị ứng): ${prefs.avoid}`);
  const avoidList = (avoidFoods || []).filter(k => whitelist.items.some(it => it.key === k));
  if (avoidList.length) prefLines.push(`- HẠN CHẾ lặp món vừa ăn gần đây (ưu tiên chọn khác): ${avoidList.slice(0, 20).join(", ")}`);

  return `Bạn là chuyên gia dinh dưỡng Việt Nam. Soạn thực đơn 1 ngày (${dayType === "train" ? "ngày tập" : "ngày nghỉ"}).

USER: ${profile.gender === "male" ? "Nam" : "Nữ"}, mục tiêu ${GOAL_LABEL[goal] || goal}.
TARGET NGÀY: ~${target.cal} kcal · P ${target.p}g · C ${target.c}g · F ${target.f}g (hệ thống TỰ tính gram từng món — bạn KHÔNG tính gram).
${prefLines.length ? prefLines.join("\n") + "\n" : ""}
QUY TẮC TỪNG BỮA:
${slotLines}

PRIORITY (vi phạm P1 = menu bị loại):
P1. Chỉ dùng food key CHÍNH XÁC từ WHITELIST (copy nguyên văn, kể cả dấu). Đúng JSON schema. Tuân thủ quy tắc từng bữa.
P2. Tổng macro ước tính (theo khẩu phần thông thường) gần TARGET nhất.
P3. Hợp phong cách${style ? ` "${STYLE_LABEL[style]}"` : ""}.
P4. Không lặp nhóm đạm giữa các bữa (gà/bò/heo/cá/tôm/trứng — mỗi nhóm tối đa 1 bữa chính).
P5. Bữa ăn tự nhiên kiểu Việt (món đi với nhau hợp lý).

BẢNG ĐIỂM (để bạn tự cân nhắc khi chọn món, KHÔNG viết ra):
- Macro accuracy: 35đ · Style matching: 25đ · VN naturalness: 15đ
- Slot-fit (sáng nhanh, phụ nhẹ, chính đủ): 15đ · Protein diversity: 10đ

QUAN TRỌNG: Suy nghĩ trong đầu, KHÔNG viết ra nháp/phương án/giải thích/lý do.
Trả lời NGAY bằng JSON — không có bất kỳ ký tự nào trước dấu { đầu tiên hoặc sau dấu } cuối cùng.

WHITELIST (chỉ chọn từ đây):
${wlText}

JSON SCHEMA (foods = mảng food key, dessert chỉ bữa trưa nếu hợp):
{"meals":[{"meal_id":"sang","foods":["trứng gà","khoai lang"]},{"meal_id":"trua","foods":["cơm trắng","ức gà nướng","rau muống","bí đỏ"],"dessert":"cam"}],"note":"1 câu mô tả thực đơn"}`;
}
