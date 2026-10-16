// Gộp món tự nhập trên máy với bảng user_foods (hàm thuần, có test).
// rows = [{ food_name, data }] từ server. Server thắng khi trùng tên.
// localOnly = món chỉ có trên máy → cần đẩy lên server.
const valid = (d) => d && typeof d === "object" && Number(d.gram) > 0 && Number.isFinite(Number(d.cal));

export function mergeMyFoods(local, rows) {
  const server = {};
  (rows || []).forEach((r) => { if (r && r.food_name && valid(r.data)) server[r.food_name] = r.data; });
  const localOnly = {};
  Object.entries(local || {}).forEach(([k, v]) => { if (k && valid(v) && !(k in server)) localOnly[k] = v; });
  return { merged: { ...localOnly, ...server }, localOnly };
}
