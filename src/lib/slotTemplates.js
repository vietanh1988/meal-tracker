// ============================================================
// slotTemplates.js — AI Menu SLOT MODE
//
// Nguyên tắc: CODE quyết cấu trúc bữa ăn (slot), AI chỉ chọn món
// điền vào từng slot từ pool đóng. Engine tính gram sau như cũ.
//
// - SLOT_TEMPLATES: cấu trúc bữa theo style (vn/clean/easy)
// - buildSlotPools(): lọc LOCAL_FOODS → pool món cho từng slot
// - Pool snack_A (phụ sáng) và snack_B (phụ chiều) KHÔNG giao nhau
//   → bữa phụ không bao giờ trùng
// ============================================================

import { LOCAL_FOODS } from "./localFoodDB";

// ---------- Phân loại helpers ----------
const isCanh = (k) => k.startsWith("canh ") || k.startsWith("sup ") || k.startsWith("súp ") || k === "súp lơ";

const CLEAN_COOK = ["luộc", "hấp", "nướng", "áp chảo", "bác"];
const DIRTY_COOK = ["chiên", "rán", "quay", "rang muối", "xù", "tempura", "giòn", "popcorn", "nugget", "tóp mỡ", "phô mai"];
const hasCleanCook = (k) => CLEAN_COOK.some((m) => k.includes(m));
const hasDirtyCook = (k) => DIRTY_COOK.some((m) => k.includes(m));

const PROTEIN_CATS = ["pork", "poultry", "beef", "seafood"];

// Key rác — tên cách chế biến trơ trọi, không phải món cụ thể
const JUNK_KEYS = new Set(["canh", "xào", "salad", "rau xào", "kho", "luộc", "hấp", "nướng", "chiên", "gỏi", "nộm", "cháo", "xôi", "cơm", "bún", "miến", "phở", "steak"]);

// Món thật nhưng không hợp gợi ý menu (nội tạng, đặc sản kỳ, fast-food...)
const EXCLUDED_PROTEIN = new Set([
  "chuột đồng quay", "tiết lợn luộc", "trứng vịt lộn", "trứng cút lộn xào me", "tóp mỡ", "bò khô", "cá ngừ hộp", "trứng muối",
  "lòng xào", "dạ dày heo xào", "tim heo xào", "gan xào hành tây", "chân gà rút xương", "chân gà nướng",
  "ốc gạo xào", "ốc len xào dừa", "ốc bươu nhồi thịt", "ốc nhồi", "ốc luộc", "ốc xào me", "ốc nướng tiêu xanh",
  "mực khô nướng", "cá khô chiên", "tôm khô rang", "phô mai que", "sò huyết nướng", "bạch tuộc nướng", "bạch tuộc xào",
  "dê nướng", "dê hấp", "dê xào lăn", "ngan nấu giả cầy", "ếch chiên bơ", "ếch xào lăn", "lươn xào sả ớt", "lươn om chuối đậu",
  "hàu nướng phô mai", "tôm hùm nướng", "bò né", "steak", "tempura", "tom yum", "xíu mại nước", "tép rang",
  "cà ri bò", "cà ri tôm", "cà ri gà", "chạo tôm", "nem lụi", "nem nướng", "nem nướng nha trang", "chả cốm", "xá xíu",
  "bò viên", "gà popcorn", "nugget gà", "gà rán", "gà rán cay", "gà chiên hàn", "heo quay giòn bì", "heo quay", "vịt quay", "gà quay",
  "bò nhúng dấm", "bò tái chanh", "giò heo hầm", "vịt om sấu", "vịt nấu chao", "gà nấu lá é", "cá lóc um rau ngổ", "cá om dưa",
  "gà satay", "thịt nướng hàn", "bò sốt vang", "cá hồi sốt teriyaki", "cá sốt chanh dây", "mực sốt me",
  "tôm sốt trứng muối", "cua sốt trứng muối", "cá kèo kho rau răm", "bò lúc lắc", "thịt bò xào lúc lắc",
  "cua rang muối", "cua rang me",
]);

// Bữa sáng VN — prefix món sáng
const SANG_PREFIX = ["phở", "bún", "hủ tiếu", "bánh canh", "mì quảng", "cháo", "xôi", "bánh mì", "bánh cuốn", "bánh bao", "miến"];
const SANG_BLOCK = new Set([
  "bún đậu mắm tôm", "bún đậu", "mì xào", "bún bò xào", "phở xào", "phở xào singapore", "miến xào", "hủ tiếu xào",
  "mì vịt tiềm", "bún chay", "phở chay", "xôi chè", "xôi ngọt", "cháo trắng", "xôi chiên",
  "bánh mì không nhân", "bánh mì đen", "bánh mì que", "bánh mì bơ tỏi", "phở gói", "cháo gói", "bún gói",
  // key chung chung — chỉ giữ tên đầy đủ
  "bánh mì", "hủ tiếu", "bánh cuốn", "bánh bao", "xôi trắng", "cháo", "miến",
]);
const isSangDish = (k) => SANG_PREFIX.some((p) => k.startsWith(p));

// Món trọn suất trưa/tối (Easy style)
const MAIN_STANDALONE = new Set([
  "cơm tấm", "cơm tấm sườn bì chả", "cơm tấm bì", "cơm gà", "cơm gà xối mỡ", "cơm gà nướng", "cơm gà hải nam",
  "cơm sườn", "cơm sườn nướng", "cơm hộp", "cơm chiên dương châu", "cơm chiên gà", "cơm chiên bò", "cơm chiên hải sản",
  "phở bò", "phở gà", "bún bò huế", "bún chả", "bún riêu", "bún thịt nướng", "bún mọc", "bún cá",
  "hủ tiếu nam vang", "bánh canh", "mì quảng", "cháo gà", "cháo vịt", "miến gà", "bún măng vịt",
]);

// Snack pools (cố định, món phổ biến dễ mua)
const SNACK_A_KEYS = new Set(["trứng gà luộc", "trứng luộc", "sữa tươi", "chuối", "khoai lang luộc", "khoai tây luộc", "ngô luộc", "đậu phộng luộc", "hạt sen luộc", "bánh mì sandwich"]);
const SNACK_B_FRUIT = new Set(["đu đủ", "cam", "bưởi", "thanh long", "dưa hấu", "xoài", "ổi", "quả bơ", "dứa", "chôm chôm", "táo", "măng cụt", "lê"]);
const SNACK_B_OTHER = new Set(["sữa chua", "sữa chua hy lạp", "đậu phộng", "hạt điều"]);

const CARB_VN = new Set(["cơm trắng", "cơm gạo lứt"]);
const CARB_CLEAN = new Set(["cơm gạo lứt", "khoai lang", "yến mạch", "bánh mì đen", "khoai lang luộc", "khoai tây luộc", "bí đỏ hấp"]);
// Đạm bữa sáng clean — nhẹ nhàng, không sườn/thịt nướng nặng
const PROTEIN_CLEAN_SANG = new Set(["trứng gà luộc", "trứng luộc", "trứng vịt luộc", "trứng cút luộc", "trứng bác", "trứng hấp", "trứng luộc lòng đào", "ức gà luộc", "ức gà áp chảo", "cá hồi áp chảo", "sữa chua hy lạp"]);

const VEG_BLOCK = ["lẩu", "salad", "gỏi", "nộm", "som tam", "kim chi", "dưa", "chả giò", "cà ri", "cuốn diếp", "mì căn", "tempeh", "nhồi thịt", "kho quẹt", "cua đồng", "tẩm hành"];

// Alias trùng nghĩa — chỉ giữ 1 bản trong pool (tránh AI thấy 2 dòng cùng món)
const ALIAS_DROP = new Set([
  "thịt lợn nạc", "thịt lợn", "sườn lợn", "thịt lợn xay", // giữ bản "heo"
  "mướp đắng", // giữ "khổ qua"
  "rau mùng tơi", // giữ "mồng tơi"
  "cải bó xôi", // giữ "rau bina"
  "bí ngô", // giữ "bí đỏ"
  "dưa leo", // giữ "dưa chuột"
]);

// ---------- Build pools từ LOCAL_FOODS ----------
// overrides: food_overrides từ Supabase đã apply vào LOCAL_FOODS trước đó (applyOverrides)
export function buildSlotPools() {
  const pools = {
    standalone_sang_vn: [], carb_vn: [], protein_vn: [], veg_vn: [], soup_vn: [],
    carb_clean: [], protein_clean: [], protein_clean_sang: [], veg_clean: [], soup_clean: [],
    standalone_sang_easy: [], standalone_main_easy: [],
    snack_A: [], snack_B: [],
  };

  for (const [k, v] of Object.entries(LOCAL_FOODS)) {
    if (JUNK_KEYS.has(k) || ALIAS_DROP.has(k)) continue;

    // Sáng
    if (isSangDish(k) && !SANG_BLOCK.has(k)) {
      pools.standalone_sang_vn.push(k);
      if ((v.convenience || 0) >= 7) pools.standalone_sang_easy.push(k);
    }
    // Trọn suất trưa/tối (easy)
    if (MAIN_STANDALONE.has(k)) pools.standalone_main_easy.push(k);
    // Canh
    if (isCanh(k) && k !== "canh kimchi") {
      pools.soup_vn.push(k);
      if (!k.includes("sườn") && !k.includes("giò") && !k.includes("xương")) pools.soup_clean.push(k);
    }
    // Đạm
    const isProtein =
      (PROTEIN_CATS.includes(v.cat) && ["cooked", "composite"].includes(v.form)) ||
      (v.cat === "egg_dairy" && k.startsWith("trứng") && v.form === "cooked");
    if (isProtein && !isCanh(k) && !isSangDish(k) && !MAIN_STANDALONE.has(k) && !EXCLUDED_PROTEIN.has(k) &&
        !k.includes("gỏi") && !k.includes("nộm") && !k.includes("salad") && !k.includes("poke") && !k.includes("cơm")) {
      // Pool VN: loại món Tây/fusion + hải sản đắt tiền không phải cơm nhà thường ngày
      const isWestern = v.region === "intl" ||
        /bít tết|steak|beef|bbq|sốt bơ|sốt kem|sốt cay|teriyaki|sốt tiêu|cá hồi|cá ngừ|broccoli|cuốn khoai tây|ba chỉ cuộn|ghẹ|cua biển|cua hấp|tôm hùm|tôm sú|bào ngư|hàu|sò điệp|cá mú|cá chẽm|cá tầm|cá lăng|cá chình/.test(k) ||
        k === "nướng hải sản";
      if (!isWestern) pools.protein_vn.push(k);
      if (hasCleanCook(k) && !hasDirtyCook(k) && !k.includes("kho") && !k.includes("rim") && !k.includes("ba chỉ") && !k.includes("mỡ hành")) {
        pools.protein_clean.push(k); // Clean giữ cá hồi/steak áp chảo — dân eat clean chuộng
      }
    }
    // Rau
    if (v.cat === "veg" && !isCanh(k) && ["composite", "cooked"].includes(v.form)) {
      if (!VEG_BLOCK.some((b) => k.includes(b))) {
        pools.veg_vn.push(k);
        if ((k.includes("luộc") || k.includes("hấp")) && !hasDirtyCook(k)) pools.veg_clean.push(k);
      }
    }
    // Carb
    if (CARB_VN.has(k)) pools.carb_vn.push(k);
    if (CARB_CLEAN.has(k)) pools.carb_clean.push(k);
    // Đạm sáng clean
    if (PROTEIN_CLEAN_SANG.has(k)) pools.protein_clean_sang.push(k);
    // Snacks
    if (SNACK_A_KEYS.has(k)) pools.snack_A.push(k);
    if ((v.cat === "fruit" && SNACK_B_FRUIT.has(k)) || SNACK_B_OTHER.has(k)) pools.snack_B.push(k);
  }

  return pools;
}

// ---------- Nhóm đạm (để enforce đạm trưa ≠ đạm tối) ----------
// KHÔNG dùng regex \b — word boundary fail với ký tự tiếng Việt (ò, ê, ứ...)
const GROUP_KEYWORDS = {
  seafood: ["cá", "tôm", "mực", "cua", "ghẹ", "nghêu", "ngao", "hến", "sò", "ốc", "hải sản", "chả cá", "bề bề", "ruốc"],
  poultry: ["gà", "vịt", "ngan", "chim", "cút"],
  beef: ["bò", "beef", "steak"],
  pork: ["heo", "lợn", "sườn", "ba chỉ", "ba rọi", "chả lụa", "giò lụa", "giò", "chả quế", "nem", "xíu mại", "thịt kho", "thịt luộc", "thịt nướng", "thịt xào", "thịt rang", "thịt hầm", "lạp xưởng", "chân giò"],
  egg: ["trứng"],
};
// Thứ tự ưu tiên khi tên chứa nhiều keyword (VD "tôm rim thịt" → seafood vì tôm là chính)
const GROUP_ORDER = ["seafood", "egg", "poultry", "beef", "pork"];

export function getProteinGroup(key) {
  const k = (key || "").toLowerCase();
  for (const group of GROUP_ORDER) {
    if (GROUP_KEYWORDS[group].some((kw) => k.includes(kw))) return group;
  }
  return "other";
}

// ---------- Slot templates theo style ----------
// Mỗi bữa = mảng slot; slot = { id, pool, label, optional?, count? }
// excludeGroupOf: loại món cùng NHÓM ĐẠM đã chọn ở slot kia
// excludeChosen: loại chính xác món đã chọn ở các slot khác (cho snack/standalone)
export const SLOT_TEMPLATES = {
  vn: {
    sang: [{ id: "sang_main", pool: "standalone_sang_vn", label: "Món sáng (phở/bún/xôi/bánh mì...)" }],
    phu_sang: [{ id: "phu_sang_1", pool: "snack_A", label: "Món phụ sáng" }],
    trua: [
      { id: "trua_carb", pool: "carb_vn", label: "Tinh bột" },
      { id: "trua_protein", pool: "protein_vn", label: "Món mặn" },
      { id: "trua_veg", pool: "veg_vn", label: "Món rau" },
      { id: "trua_soup", pool: "soup_vn", label: "Canh" },
    ],
    phu_chieu: [{ id: "phu_chieu_1", pool: "snack_B", label: "Món phụ chiều" }],
    pre: [{ id: "pre_1", pool: "snack_A", label: "Trước tập (carb nhanh)" }],
    post: [{ id: "post_1", pool: "snack_A", label: "Sau tập (đạm nhanh)" }],
    toi: [
      { id: "toi_carb", pool: "carb_vn", label: "Tinh bột" },
      { id: "toi_protein", pool: "protein_vn", label: "Món mặn", excludeGroupOf: "trua_protein" },
      { id: "toi_veg", pool: "veg_vn", label: "Món rau", excludeChosen: ["trua_veg"] },
      { id: "toi_soup", pool: "soup_vn", label: "Canh", excludeChosen: ["trua_soup"] },
    ],
  },
  clean: {
    sang: [
      { id: "sang_carb", pool: "carb_clean", label: "Tinh bột sạch" },
      { id: "sang_protein", pool: "protein_clean_sang", label: "Đạm nhẹ buổi sáng" },
    ],
    phu_sang: [{ id: "phu_sang_1", pool: "snack_A", label: "Món phụ sáng" }],
    trua: [
      { id: "trua_carb", pool: "carb_clean", label: "Tinh bột sạch" },
      { id: "trua_protein", pool: "protein_clean", label: "Đạm luộc/hấp/nướng" },
      { id: "trua_veg", pool: "veg_clean", label: "Rau luộc/hấp" },
      { id: "trua_soup", pool: "soup_clean", label: "Canh thanh đạm" },
    ],
    phu_chieu: [{ id: "phu_chieu_1", pool: "snack_B", label: "Món phụ chiều" }],
    pre: [{ id: "pre_1", pool: "snack_A", label: "Trước tập (carb nhanh)" }],
    post: [{ id: "post_1", pool: "snack_A", label: "Sau tập (đạm nhanh)" }],
    toi: [
      { id: "toi_carb", pool: "carb_clean", label: "Tinh bột sạch", excludeChosen: ["trua_carb"] },
      { id: "toi_protein", pool: "protein_clean", label: "Đạm luộc/hấp/nướng", excludeGroupOf: "trua_protein" },
      { id: "toi_veg", pool: "veg_clean", label: "Rau luộc/hấp", excludeChosen: ["trua_veg"] },
      { id: "toi_soup", pool: "soup_clean", label: "Canh thanh đạm", excludeChosen: ["trua_soup"] },
    ],
  },
  easy: {
    sang: [{ id: "sang_main", pool: "standalone_sang_easy", label: "Món sáng mua nhanh" }],
    phu_sang: [{ id: "phu_sang_1", pool: "snack_A", label: "Món phụ sáng" }],
    trua: [{ id: "trua_main", pool: "standalone_main_easy", label: "Món trưa trọn suất" }],
    phu_chieu: [{ id: "phu_chieu_1", pool: "snack_B", label: "Món phụ chiều" }],
    pre: [{ id: "pre_1", pool: "snack_A", label: "Trước tập (carb nhanh)" }],
    post: [{ id: "post_1", pool: "snack_A", label: "Sau tập (đạm nhanh)" }],
    toi: [{ id: "toi_main", pool: "standalone_main_easy", label: "Món tối trọn suất", excludeChosen: ["trua_main"] }],
  },
};

// ---------- Shuffle + cắt pool cho prompt ----------
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Diet block (đồng bộ whitelistBuilder — keto/low_carb loại carb slot)
const DIET_NO_CARB = new Set(["keto", "low_carb"]);

/**
 * buildSlotPlan — tạo kế hoạch slot cho 1 lần generate
 * @param {string} style vn|clean|easy
 * @param {string[]} mealIds các bữa user bật
 * @param {object} opts { diet, avoidFoods: string[], poolSize }
 * @returns {Array<{ mealId, slots: Array<{id, pool: string[], label, excludeGroupOf?, excludeChosen?}> }>}
 */
export function buildSlotPlan(style, mealIds, opts = {}) {
  const { diet = "balanced", avoidFoods = [], poolSize = 10, goal = null } = opts;
  const tpl = SLOT_TEMPLATES[style] || SLOT_TEMPLATES.vn;
  const pools = buildSlotPools();
  const avoid = new Set((avoidFoods || []).map((s) => (s || "").toLowerCase().trim()));
  const noCarb = DIET_NO_CARB.has(diet);

  // Goal-based carb filter:
  // - bulk: carb năng lượng cao dễ ăn (cơm trắng) — LOẠI gạo lứt/yến mạch (no lâu, khó đủ surplus)
  // - cut: ưu tiên carb no lâu low-GI (gạo lứt/khoai) — LOẠI cơm trắng nếu pool còn đủ
  const BULK_BLOCK_CARB = new Set(["cơm gạo lứt", "yến mạch", "bánh mì đen", "khoai lang luộc", "khoai lang", "khoai tây luộc", "bí đỏ hấp"]);
  const CUT_BLOCK_CARB = new Set(["cơm trắng", "xôi trắng"]);

  const plan = [];
  for (const mealId of mealIds) {
    const slots = tpl[mealId];
    if (!slots) continue;
    const outSlots = [];
    for (const slot of slots) {
      // keto/low_carb: bỏ slot carb
      if (noCarb && slot.pool.startsWith("carb")) continue;
      let items = (pools[slot.pool] || []).filter((k) => !avoid.has(k));
      // Goal filter cho slot carb
      if (slot.pool.startsWith("carb")) {
        if (goal === "bulk") {
          const f = items.filter((k) => !BULK_BLOCK_CARB.has(k));
          if (f.length > 0) items = f;
        } else if (goal === "cut") {
          const f = items.filter((k) => !CUT_BLOCK_CARB.has(k));
          if (f.length > 0) items = f;
        }
      }
      if (items.length === 0) items = pools[slot.pool] || []; // pool cạn do avoid → nới
      items = shuffleArr(items).slice(0, Math.max(poolSize, 4));
      outSlots.push({ ...slot, items });
    }
    if (outSlots.length > 0) plan.push({ mealId, slots: outSlots });
  }
  return plan;
}

/**
 * resolveSlotAnswers — nhận answers từ AI, enforce rules, fallback an toàn
 * KHÔNG BAO GIỜ FAIL: món lệch pool → lấy món đầu pool; slot thiếu → món đầu pool.
 * @param {Array} plan từ buildSlotPlan
 * @param {object} answers { slotId: "tên món" }
 * @returns {object} { mealId: [foodKey, ...] }
 */
export function resolveSlotAnswers(plan, answers = {}) {
  const chosen = {}; // slotId → foodKey
  const result = {}; // mealId → [foodKey]

  for (const meal of plan) {
    result[meal.mealId] = [];
    for (const slot of meal.slots) {
      let pick = (answers[slot.id] || "").toLowerCase().trim();
      let candidates = slot.items;

      // Rule: excludeChosen — loại chính xác món đã chọn ở slot khác
      if (slot.excludeChosen) {
        const used = new Set(slot.excludeChosen.map((sid) => chosen[sid]).filter(Boolean));
        const filtered = candidates.filter((k) => !used.has(k));
        if (filtered.length > 0) candidates = filtered;
      }
      // Rule: excludeGroupOf — loại món cùng nhóm đạm với slot kia
      if (slot.excludeGroupOf && chosen[slot.excludeGroupOf]) {
        const usedGroup = getProteinGroup(chosen[slot.excludeGroupOf]);
        const filtered = candidates.filter((k) => getProteinGroup(k) !== usedGroup);
        if (filtered.length > 0) candidates = filtered;
      }

      // AI pick hợp lệ trong candidates?
      let final = candidates.find((k) => k === pick);
      // Fuzzy: AI trả gần đúng (VD "cá basa hấp" vs pool có "cá hấp")
      if (!final && pick) {
        final = candidates.find((k) => pick.includes(k) || k.includes(pick));
      }
      // Fallback: món đầu candidates (đã shuffle → vẫn đa dạng giữa các lần)
      if (!final) {
        final = candidates[0];
        if (pick) console.warn(`[Slot Mode] "${pick}" ∉ pool slot ${slot.id} → thay "${final}"`);
      }
      if (final) {
        chosen[slot.id] = final;
        result[meal.mealId].push(final);
      }
    }
  }
  return result;
}
