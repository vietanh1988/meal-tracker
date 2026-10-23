// Cách chế biến → số trên 100 g MÓN ĐÃ NẤU (23/10). Không import file khác (localFoodDB dùng, web chép sang).
//
// Nguyên tắc (theo bảng hệ số thành phẩm khi nấu kiểu USDA "Cooking Yields for Meat and Poultry"):
//  - Thịt / cá / hải sản / trứng SỐNG khi nấu mất nước (và một ít mỡ) → 100 g chín đặc hơn 100 g sống:
//    số / 100 g chín = số sống ÷ y (y = khối lượng chín ÷ khối lượng sống).
//  - Cách nấu có thêm dầu / đường / bột (xào, chiên, kho, rim, tẩm bột…) cộng thêm phần đó trên 100 g món chín.
//  - Rau, củ, tinh bột, trái cây: luộc / hấp gần như không đổi số (hút thêm nước) → chỉ cộng dầu / đường nếu có.
//  - Món đã nấu sẵn (form cooked / composite) → không chia y lần nữa, chỉ cộng dầu / đường.
// y, dầu, đường là số trung bình cách nấu gia đình Việt; món cụ thể trong kho (có số riêng) luôn được ưu tiên hơn ước tính này.

// y: theo nhóm (meat = gia cầm / bò / heo; fish = cá; shell = tôm, mực, nghêu…; egg)
// oil, sugar, flour: g thêm vào trên 100 g món chín; fatKeep: phần mỡ của nguyên liệu còn lại (nướng / quay chảy mỡ)
export const METHODS = {
  "luộc":       { y: { meat: 0.72, fish: 0.85, shell: 0.85, egg: 1 } },
  "hấp":        { y: { meat: 0.75, fish: 0.85, shell: 0.85, egg: 1 } },
  "nướng":      { y: { meat: 0.70, fish: 0.80, shell: 0.80, egg: 1 }, oil: 1 },
  "nướng lò":   { y: { meat: 0.70, fish: 0.80, shell: 0.80, egg: 1 }, oil: 1 },
  "nướng sả":   { y: { meat: 0.70, fish: 0.80, shell: 0.80, egg: 1 }, oil: 2, sugar: 2 },
  "quay":       { y: { meat: 0.65, fish: 0.75, shell: 0.80, egg: 1 }, sugar: 1 },
  "áp chảo":    { y: { meat: 0.75, fish: 0.80, shell: 0.85, egg: 0.95 }, oil: 3 },
  "xào":        { y: { meat: 0.80, fish: 0.82, shell: 0.85, egg: 0.95, plant: 0.9 }, oil: 5, sugar: 1 },
  "xào tỏi":    { y: { meat: 0.80, fish: 0.82, shell: 0.85, egg: 0.95, plant: 0.9 }, oil: 5, sugar: 0.5 },
  "xào sả ớt":  { y: { meat: 0.80, fish: 0.82, shell: 0.85, egg: 0.95, plant: 0.9 }, oil: 6, sugar: 2 },
  "chiên":      { y: { meat: 0.72, fish: 0.75, shell: 0.80, egg: 0.95, plant: 0.8 }, oil: 8 },
  "chiên sả":   { y: { meat: 0.72, fish: 0.75, shell: 0.80, egg: 0.95, plant: 0.8 }, oil: 9, sugar: 1 },
  "chiên giòn": { y: { meat: 0.80, fish: 0.82, shell: 0.85, egg: 0.95, plant: 0.85 }, oil: 12, flour: 8 },
  "tẩm bột chiên": { y: { meat: 0.80, fish: 0.82, shell: 0.85, egg: 0.95, plant: 0.85 }, oil: 12, flour: 10 },
  "chiên xù":   { y: { meat: 0.80, fish: 0.82, shell: 0.85, egg: 0.95, plant: 0.85 }, oil: 13, flour: 12 },
  "chiên nước mắm": { y: { meat: 0.72, fish: 0.75, shell: 0.80, egg: 0.95, plant: 0.8 }, oil: 8, sugar: 4 },
  "kho":        { y: { meat: 0.72, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 3, sugar: 4 },
  "kho tộ":     { y: { meat: 0.72, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 3, sugar: 4 },
  "kho tiêu":   { y: { meat: 0.72, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 3, sugar: 3 },
  "kho gừng":   { y: { meat: 0.72, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 3, sugar: 3 },
  "kho trứng":  { y: { meat: 0.75, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 2, sugar: 3 },
  "kho nước dừa": { y: { meat: 0.75, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 2, sugar: 4 },
  "rim":        { y: { meat: 0.70, fish: 0.80, shell: 0.82, egg: 1, plant: 0.95 }, oil: 3, sugar: 6 },
  "rim mặn":    { y: { meat: 0.70, fish: 0.80, shell: 0.82, egg: 1, plant: 0.95 }, oil: 3, sugar: 4 },
  "rim tiêu":   { y: { meat: 0.70, fish: 0.80, shell: 0.82, egg: 1, plant: 0.95 }, oil: 3, sugar: 4 },
  "rim nước mắm": { y: { meat: 0.70, fish: 0.80, shell: 0.82, egg: 1, plant: 0.95 }, oil: 3, sugar: 5 },
  "rang":       { y: { meat: 0.70, fish: 0.78, shell: 0.75, egg: 0.95 }, oil: 4, sugar: 2 },
  "rang gừng":  { y: { meat: 0.70, fish: 0.78, shell: 0.75, egg: 0.95 }, oil: 4, sugar: 2 },
  "rang muối":  { y: { meat: 0.70, fish: 0.78, shell: 0.75, egg: 0.95 }, oil: 4 },
  "rang me":    { y: { meat: 0.70, fish: 0.78, shell: 0.75, egg: 0.95 }, oil: 4, sugar: 6 },
  "rang thịt":  { y: { meat: 0.70, fish: 0.78, shell: 0.75, egg: 0.95 }, oil: 4, sugar: 1 },
  "sốt cà":     { y: { meat: 0.78, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 4, sugar: 3, carb: 2 },
  "sốt cà chua": { y: { meat: 0.78, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 4, sugar: 3, carb: 2 },
  "sốt chua ngọt": { y: { meat: 0.78, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 4, sugar: 7, carb: 2 },
  "sốt me":     { y: { meat: 0.78, fish: 0.82, shell: 0.85, egg: 1, plant: 0.95 }, oil: 4, sugar: 7, carb: 2 },
  "hầm":        { y: { meat: 0.78, fish: 0.85, shell: 0.85, egg: 1 }, oil: 1 },
  "om":         { y: { meat: 0.78, fish: 0.85, shell: 0.85, egg: 1 }, oil: 2, sugar: 1 },
  "tần":        { y: { meat: 0.80, fish: 0.85, shell: 0.85, egg: 1 } },
  "nấu":        { y: { meat: 0.80, fish: 0.85, shell: 0.85, egg: 1 }, oil: 1 },
  "um":         { y: { meat: 0.78, fish: 0.85, shell: 0.85, egg: 1 }, oil: 2, sugar: 1 },
  "nấu canh":   { y: { meat: 0.85, fish: 0.90, shell: 0.90, egg: 1 } },
  "trộn":       { y: {}, oil: 2, sugar: 2 },
  "gỏi":        { y: {}, oil: 1, sugar: 3 },
  "nộm":        { y: {}, oil: 1, sugar: 3 },
};

// Từ cách nấu viết khác → tên chuẩn ở METHODS (đã qua bỏ dấu ở chỗ gọi nếu cần)
export const METHOD_ALIAS = { "rán": "chiên", "rán giòn": "chiên giòn", "chiên bột": "tẩm bột chiên", "lăn bột chiên": "tẩm bột chiên", "luộc chín": "luộc", "kho tàu": "kho trứng", "kho mặn": "kho", "nướng than": "nướng", "nướng mọi": "nướng", "áp chảo bơ": "áp chảo", "hầm nhừ": "hầm", "xào lăn": "xào", "rang sả": "rang", "chưng": "hấp", "đồ": "hấp", "rim đường": "rim", "rang cháy": "rang", "rang cháy cạnh": "rang", "ram": "rim", "ram mặn": "rim mặn", "thui": "nướng", "tái": "luộc", "chần": "luộc", "nhúng": "luộc" };

const GROUP = { poultry: "meat", beef: "meat", pork: "meat", seafood: "fish", egg_dairy: "egg" };
const SHELL = /^(tôm|tép|mực|bạch tuộc|cua|ghẹ|ngao|nghêu|sò|ốc|hến|hàu|trai|tôm hùm)/;

// Món đã có số nấu (cooked / composite / processed…) thì không chia y nữa
const RAW_FORMS = new Set(["raw"]);

// base: {p,c,f,cal,fiber,form,cat}, key: tên trong kho, m: tên cách nấu (METHODS)
// trả số / 100 g món đã nấu, hoặc null nếu không áp được
export function cookPer100(base, key, m) {
  const M = METHODS[m];
  if (!M || !base) return null;
  let grp = GROUP[base.cat];
  if (grp === "fish" && SHELL.test(key || "")) grp = "shell";
  if (base.cat === "egg_dairy" && !/^(trứng|lòng)/.test(key || "")) grp = null; // sữa, phô mai: không nấu kiểu này
  const plant = !grp;
  let y = 1;
  if (RAW_FORMS.has(base.form)) y = plant ? (M.y.plant || 1) : (M.y[grp] || 1);
  // Mỡ chảy ra khi nấu tỉ lệ với độ béo của miếng thịt (đối chiếu cặp sống / chín của USDA: gà cả da 215 → quay 239, luộc 219;
  // ức gà nạc gần như không mất mỡ). L = phần mỡ mất tối đa của cách nấu; thịt càng béo (tới 15 g / 100 g) càng mất nhiều.
  const L = M.fatLoss ?? (/^(luộc|hấp|hầm|nấu|tần|nướng|quay|áp chảo)/.test(m) ? 0.4 : /^(chiên|xào)/.test(m) ? 0.25 : 0.15);
  const fatKeep = plant ? 1 : (M.fatKeep || 1) * (1 - L * Math.min(1, (base.f || 0) / 15));
  const oil = M.oil || 0, sugar = M.sugar || 0, flour = M.flour || 0, carb = M.carb || 0;
  const fRaw = (base.f || 0) * fatKeep;
  const lostFatKcal = 9 * (base.f || 0) * (1 - fatKeep);
  // phần nguyên liệu trong 100 g món = 100 − dầu − đường − bột thêm vào
  const share = Math.max(0.6, 1 - (oil + sugar + flour + carb) / 100);
  const k = share / y;
  const p = (base.p || 0) * k + flour * 0.1;
  const c = (base.c || 0) * k + sugar + carb + flour * 0.8;
  const f = fRaw * k + oil;
  const fiber = (base.fiber || 0) * k;
  const cal = ((base.cal || 0) - lostFatKcal) * k + 9 * oil + 4 * (sugar + carb) + 3.5 * flour;
  return { p, c, f, fiber, cal };
}

// Tìm cách nấu trong chuỗi (đã viết thường, có dấu): dài trước; trả tên chuẩn
const NAMES = [...Object.keys(METHODS), ...Object.keys(METHOD_ALIAS)].sort((a, b) => b.length - a.length);
export function findMethod(text) {
  const s = ` ${String(text || "").toLowerCase()} `;
  for (const n of NAMES) if (s.includes(` ${n} `)) return { name: METHOD_ALIAS[n] || n, word: n };
  return null;
}

// Như findMethod nhưng nhận cả chữ không dấu ("thit heo rim", "ca kho to")
const plainOf = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const PLAIN_NAMES = NAMES.map((n) => [plainOf(n), n]).sort((a, b) => b[0].length - a[0].length);
export function findMethodAny(text) {
  const hit = findMethod(text);
  if (hit) return { ...hit, plainWord: plainOf(hit.word) };
  const s = ` ${plainOf(text)} `;
  for (const [pn, n] of PLAIN_NAMES) if (pn.length >= 3 && s.includes(` ${pn} `)) return { name: METHOD_ALIAS[n] || n, word: n, plainWord: pn };
  return null;
}
