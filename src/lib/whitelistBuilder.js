// ============================================================
// whitelistBuilder.js — AI Menu V2 Bước 3
// Lọc LOCAL_FOODS thành whitelist AI được thấy.
// AI không thể chọn sai thứ nó không nhìn thấy.
// Pipeline: Diet(HARD) → Supplement(HARD) → Style(HARD) →
//           avoidFoods(soft) → cap theo score.
// ============================================================

import { LOCAL_FOODS, getFoodRole, getConvenienceScore, getFoodRegion } from "./localFoodDB";
import { getMealScore, MIN_SLOT_SCORE, STYLE_CRITERIA } from "../mealGrammar";

// Config — không hardcode trong logic, đổi model chỉ chỉnh đây
export const AI_LIMITS = {
  maxWhitelistItems: 110,
};

// Diet HARD filter — tinh bột nhanh bị loại hẳn khỏi tầm nhìn AI
const DIET_BLOCK = {
  keto: ["cơm trắng", "cơm", "cơm gạo lứt", "gạo lứt", "bún", "bánh phở", "xôi", "bánh mì", "bánh mì đen", "mì", "miến", "hủ tiếu", "bánh cuốn", "mì ý", "cháo", "bánh tráng", "đường", "mật ong", "mass gainer", "granola", "granola bar",
    // Composite starch dishes
    "phở bò", "phở gà", "bún bò huế", "bún riêu", "bún chả", "bún thịt nướng",
    "hủ tiếu nam vang", "bánh canh", "mì quảng", "cháo gà", "cháo thịt bằm",
    "xôi xéo", "xôi gà", "xôi lạc", "bánh cuốn nhân thịt", "bánh mì thịt", "cơm tấm", "bún đậu mắm tôm",
    // Batch mới — composite tinh bột cao
    "cơm chiên", "cơm gà", "cơm sườn", "cơm chiên dương châu", "cơm chiên trứng",
    "cơm tấm sườn bì chả", "cơm bình dân", "cơm hộp", "cơm văn phòng",
    "bún mọc", "bún cá", "bún ốc", "bún mắm", "bún chả cá", "bún ngan", "bún hải sản",
    "phở xào", "hủ tiếu xào", "mì xào", "miến xào", "miến gà",
    "bánh xèo", "bánh khọt", "bánh chưng", "bánh tét", "bánh giò", "bánh bao",
    "cháo lòng", "cháo hải sản", "cháo sườn", "cháo vịt", "cháo cá",
    "ramen", "pad thái", "tokbokki", "pasta carbonara", "pasta bolognese",
    "sushi", "kimbap", "hamburger", "pizza",
  ],
  low_carb: ["cơm trắng", "cơm", "bún", "bánh phở", "xôi", "mì", "hủ tiếu", "mì ý", "đường", "mass gainer",
    // Batch mới
    "cơm chiên", "cơm gà", "cơm sườn", "cơm tấm", "cơm bình dân", "cơm hộp",
    "bún mọc", "bún cá", "bún ốc", "phở xào", "mì xào", "miến xào",
    "bánh xèo", "bánh chưng", "bánh tét", "cháo",
    "ramen", "pad thái", "tokbokki", "pasta carbonara",
  ],
};

// GOAL BLOCK — items không phù hợp theo mục tiêu
const GOAL_BLOCK = {
  cut: [
    // Hạt/nuts cao calo (>500cal/100g) — giảm mỡ không nên ăn
    "lạc", "đậu phộng", "hạt điều", "hạnh nhân", "hạt óc chó", "hạt chia",
    "hạt lanh", "hạt bí", "hạt hướng dương", "mè", "vừng", "hạt mắc ca",
    "bơ đậu phộng", "hạt dưa", "đậu phộng rang muối", "hạt hướng dương rang",
    "đậu phộng luộc", "hạt bí rang", "bơ hạnh nhân", "đậu phộng rang tỏi ớt",
    "hạt điều rang muối",
    // Thịt mỡ nhiều
    "ba chỉ", "ba rọi", "da gà", "tóp mỡ", "heo quay", "heo quay giòn bì",
    "thịt ba chỉ nướng", "ba chỉ cuộn nấm nướng", "ba chỉ nướng mỡ hành",
    // Đồ chiên ngập dầu
    "khoai tây chiên", "khoai lang chiên", "gà rán", "gà rán cay",
    "cá chiên xù", "tôm chiên xù", "mực chiên giòn",
    // Dessert/ngọt
    "kem", "kem dừa", "kem bơ", "kem trà xanh", "kem ốc quế", "kem que",
    "bánh kem", "tiramisu", "cheesecake", "brownie", "donut", "croissant",
    "bánh bông lan", "cookie", "macaron", "muffin", "waffle", "pancake",
    // Sữa béo
    "sữa đặc", "sữa ông thọ", "phô mai", "cream cheese", "kem tươi",
    // Cơm chiên (dầu mỡ)
    "cơm chiên", "cơm chiên dương châu", "cơm rang dưa bò",
  ],
};

// Supplement HARD filter — dân VN phổ thông không dùng, mặc định loại
const SUPPLEMENT_KEYS = ["whey", "bột whey", "whey isolate", "mass gainer", "casein", "protein bar", "bcaa", "creatine"];

// Không đưa vào whitelist cho AI chọn (gia vị/dầu/sốt/snack/đồ uống có đường — hệ thống tự thêm hoặc không liên quan menu)
const NEVER_LIST = [
  // Dầu mỡ
  "dầu ăn", "dầu ô liu", "dầu dừa", "dầu mè", "mỡ heo", "bơ thực vật", "margarine",
  // Gia vị / nước chấm
  "nước mắm", "xì dầu", "nước tương", "tương ớt", "tỏi", "gừng", "chanh", "đường",
  "mắm tôm", "mắm nêm", "dầu hào", "muối", "bột nêm", "sa tế", "tiêu", "ớt bột",
  "nghệ bột", "giấm", "tương bần", "nước chấm", "sốt mayonnaise", "sốt cà chua",
  "sốt tương đen", "tương ớt sriracha", "nước mắm pha", "muối tiêu chanh",
  "mỡ hành", "hành phi", "sả", "lá chanh", "lá lốt", "lá giang",
  // Supplement
  "creatine", "bcaa", "omega 3", "dầu cá", "pre workout", "collagen",
  // Snack / bánh kẹo — không gợi ý trong menu
  "bim bim", "kẹo", "kẹo dẻo", "chocolate đen", "chocolate sữa", "bánh quy",
  "khoai tây chiên gói", "bánh gạo", "bánh trung thu", "bánh tráng mè",
  // Đồ uống có đường cao
  "coca cola", "nước ngọt", "nước tăng lực", "bia", "bia hơi", "rượu vang",
  "rượu đế", "rượu nếp", "trà sữa", "trà sữa trân châu", "trà sữa matcha", "soda chanh",
  // Nguyên liệu thô không phải món ăn
  "da gà", "xương heo", "tiết canh", "tóp mỡ", "mỡ heo",
  "gạo nếp", "bột sắn dây", "sữa bột", "sữa đặc", "sữa ông thọ",
  "nước cốt dừa", "kem tươi", "kem whipping", "cream cheese",
  // Phô mai / dairy đặc biệt — không phải món chính
  "phô mai con bò cười", "phô mai mozzarella",
  // Đồ khô / sấy — snack không phải món
  "chuối sấy", "mít sấy", "xoài sấy", "nho khô", "táo đỏ khô",
  "hạt dưa", "hạt hướng dương rang",
  // Mì gói
  "mì gói", "phở gói", "cháo gói", "bún gói",
  // Processed không nên gợi ý menu (user tự thêm nếu muốn)
  "xúc xích", "xúc xích nướng", "xúc xích chiên", "xúc xích xiên que",
  "cá viên chiên", "cá viên", "cá viên curry", "tôm viên",
  "bò viên chiên", "thịt hộp", "cá mòi hộp", "pate gan",
  "chả giò rế", "khô gà lá chanh",
  // Đông lạnh
  "pizza đông lạnh",
  // Gia vị/sốt mới
  "sốt phô mai", "sốt bơ tỏi", "nước mắm tỏi ớt", "nước sốt teriyaki", "sốt bbq",
  // Supplement mới
  "plant protein", "thanh protein", "thanh granola", "protein shake",
  "protein shake sữa", "whey isolate", "casein bột", "glutamine",
  // Snack/candy mới
  "rau câu dừa", "thạch rau câu",
  // Nguyên liệu thô mới
  "hạt kê", "ý dĩ", "hạt bo bo", "bột sắn dây", "gạo nếp",
  "bơ hạnh nhân", "tiết lợn luộc", "tiết canh",
  "lưỡi heo", "cật heo", "lưỡi bò", "tai heo",
  "cá cơm khô", "tôm khô", "mực khô", "cá khô",
  "tôm khô rang", "mực khô nướng", "cá khô chiên", "ruốc tôm",
  // Đồ uống thêm
  "espresso", "americano", "trà hoa cúc", "trà ô long", "trà sen", "trà gừng", "trà atiso",
  // Generic keys — chỉ cho photo scanner, không cho AI menu
  "canh chua", "rau xào", "nộm", "lẩu", "salad", "bò xào", "canh bí", "chè", "sinh tố",
  "steak", "gỏi", "canh", "xào",
  // Short raw ingredient keys (≤3 chars) — AI phải trả tên đầy đủ, không key thô
  "mực", "cua", "hàu", "ngô", "bắp", "táo", "cam", "ổi", "nho", "lê",
  "mận", "vải", "mít", "dừa", "na", "nấm", "tỏi", "lạc", "mè", "nem",
  "ếch", "sắn", "dứa", "roi", "đào", "ốc", "bầu", "bia", "kẹo", "sả",
  "nui", "kem", "ghẹ", "hẹ", "me", "khế", "tré",
  // ALL NUTS/SEEDS — không phải món ăn trong bữa cơm VN (đồ ăn vặt)
  // Fat filler (lạc/mè) engine tự thêm riêng, không cần trong whitelist AI
  "đậu phộng", "hạt điều", "hạnh nhân", "hạt óc chó", "hạt chia",
  "hạt lanh", "hạt bí", "hạt hướng dương", "vừng", "hạt mắc ca",
  "bơ đậu phộng", "hạt dưa", "đậu phộng rang muối", "hạt hướng dương rang",
  "đậu phộng luộc", "hạt bí rang", "bơ hạnh nhân", "đậu phộng rang tỏi ớt",
  "hạt điều rang muối", "hạt dẻ", "hạt sen", "edamame",
  "hummus", "falafel",
  // Đậu hạt khô (nguyên liệu, không phải món ăn trực tiếp)
  "đậu nành", "đậu đen", "đậu xanh", "đậu đỏ", "đậu lăng", "đậu gà", "đậu trắng",
  // Dầu mỡ (đã có ở trên nhưng double-check)
  "dầu ô liu", "dầu dừa", "dầu ăn", "dầu mè",
  // Bakery tây — không phải bữa ăn VN
  "croissant", "donut", "muffin", "brownie", "waffle", "pancake",
  "cookie", "macaron", "eclair", "scone", "crêpe", "tiramisu", "cheesecake",
  "bánh kem", "bánh su kem",
  // Fast food — không phải bữa ăn VN (user muốn thì tự nhập)
  "hamburger", "pizza", "hotdog", "gà popcorn", "nugget gà",
  "cheese stick", "onion ring", "chicken wrap", "nachos", "quesadilla",
  // Dairy béo cao
  "phô mai", "bơ lạt", "cream cheese", "kem whipping",
  // Thịt mỡ thô
  "ba chỉ", "ba rọi", "da gà", "mỡ heo", "tóp mỡ",
  // RAW PROTEINS có cooked variant — AI chỉ nên thấy cooked (ức gà nướng, không ức gà raw)
  "ức gà", "đùi gà", "cánh gà", "sườn bò", "thịt bò", "sườn heo", "thịt heo",
  "cá hồi", "cá ngừ", "cá basa", "cá thu", "cá diêu hồng", "cá lóc", "cá tra",
  "cá nục", "cá chép", "cá saba", "nghêu", "bạch tuộc", "cá rô", "cá trê",
  "sò huyết", "tôm hùm", "tim heo", "dạ dày heo", "sườn bò",
  // RAW PROTEINS còn lại (không có cooked variant riêng nhưng vẫn là nguyên liệu thô)
  "gà nguyên con", "lòng gà", "thịt vịt", "thăn bò", "bắp bò", "nạm bò", "gân bò",
  "thịt bò xay", "thịt heo nạc", "thịt lợn nạc", "sườn lợn", "thịt heo xay",
  "thịt lợn xay", "nạc vai heo", "thịt lợn", "cá rô phi", "tôm tươi", "tôm sú",
  "ngao", "thịt đùi heo", "chân giò heo", "thịt đùi gà", "gà ta", "ngan",
  "cá bạc má", "cá cơm", "lươn", "gan heo", "gan gà", "lòng heo", "thịt dê",
  "tôm đồng", "cá chẽm", "cá mú", "cá bống", "sò điệp", "ốc hương", "ốc bươu",
  "cua đồng", "sashimi", "cá quả", "cá mòi", "cá đuối", "thịt vai heo",
  "thịt mông heo", "thịt heo nạc xay", "thịt gà xay", "ba chỉ bò", "nạc dăm heo",
  "lườn gà", "đùi tỏi gà", "vịt nguyên con", "cá hồi sashimi", "cá ngừ sashimi",
  "ếch", "ghẹ",
  // TẤT CẢ DRINKS — AI menu gợi ý thức ăn, KHÔNG gợi ý đồ uống
  "nước dừa", "nước cam", "cà phê đen", "cà phê", "trà xanh", "trà đá", "trà chanh",
  "sương sáo", "sữa hạnh nhân", "trà đào", "nước chanh muối", "nước rau má",
  "nước sâm", "nước chanh đá", "sữa yến mạch", "trà đào cam sả", "trà vải",
  "nước ép bưởi", "nước ép táo", "nước ép dưa hấu", "nước ép cần tây",
  "nước đậu đen", "nước bí đao", "cappuccino", "latte", "nước dừa tươi",
  // Processed ăn vặt (không phải bữa cơm)
  "xiên bẩn", "nem chua rán", "xiên que nướng",
  // Đồ uống có đường (AI menu gợi ý thức ăn, không gợi ý đồ uống)
  "cà phê sữa đá", "cà phê sữa", "bạc xỉu", "cà phê trứng", "cà phê dừa", "cà phê muối",
  "sinh tố bơ", "sinh tố chuối", "sinh tố xoài", "sinh tố dâu", "sinh tố mãng cầu",
  "ca cao", "matcha latte", "mocha", "trà oolong sữa", "sữa tươi trân châu",
  "nước mía", "sữa bắp", "sữa óc chó", "nước ép dứa", "nước ép lựu",
  "sữa đậu nành nóng", "nước ép cà rốt",
];

/**
 * buildWhitelist({ style, diet, goal, usesSupplements, avoidFoods, mealIds })
 * → { items: [{key, display?, role, cal, p, c, f, slots:{...score}}], count }
 * Chỉ trả key + macro + score — display do hệ thống tra sau, AI không cần.
 */
export function buildWhitelist({ style = null, diet = "balanced", goal = null, usesSupplements = false, avoidFoods = [], mealIds = [] } = {}) {
  const dietBlock = new Set(DIET_BLOCK[diet] || []);
  const goalBlock = new Set(GOAL_BLOCK[goal] || []);
  const avoid = new Set((avoidFoods || []).map(s => (s || "").toLowerCase().trim()));
  const never = new Set(NEVER_LIST);
  const suppBlock = usesSupplements ? new Set() : new Set(SUPPLEMENT_KEYS);
  const styleCfg = STYLE_CRITERIA[style] || {};

  let items = [];
  for (const [key, v] of Object.entries(LOCAL_FOODS)) {
    if (never.has(key)) continue;
    if (dietBlock.has(key)) continue;          // HARD
    if (goalBlock.has(key)) continue;          // HARD — goal-based (cut: no nuts/fried/dessert)
    if (suppBlock.has(key)) continue;          // HARD

    // ---- STYLE HARD FILTERS ----
    // VN: food phải có region ∈ ["vn","both"]
    if (styleCfg.regionFilter) {
      const region = getFoodRegion(key);
      if (!region || !styleCfg.regionFilter.includes(region)) continue;
    }
    // Clean: cat ∈ bannedCats → loại
    if (styleCfg.bannedCats && styleCfg.bannedCats.includes(v.cat)) continue;
    // Clean: thêm block list truyền thống (ba chỉ, đường, processed cụ thể)
    if (style === "clean") {
      const cleanExtra = new Set(["ba chỉ", "ba rọi", "mayonnaise", "đường", "sầu riêng", "bò viên", "mì ý"]);
      if (cleanExtra.has(key)) continue;
    }
    // Easy: convenience < minConvenience → loại
    if (styleCfg.minConvenience && getConvenienceScore(key) < styleCfg.minConvenience) continue;
    // VN: bannedKeys (trưa/tối sẽ check riêng ở validator, nhưng cũng hạ điểm ở đây)
    // Không chặn hoàn toàn vì yến mạch VN sáng vẫn OK cho bữa phụ
    const vnBanned = styleCfg.bannedKeys ? new Set(styleCfg.bannedKeys) : null;

    // Score per slot (chỉ slot đang cần) — AI + validator dùng chung
    const slots = {};
    let maxSlotScore = 0;
    (mealIds || []).forEach(m => {
      const s = getMealScore(key, m);
      slots[m] = s;
      if (s > maxSlotScore) maxSlotScore = s;
    });
    // Món không hợp bữa nào đang cần (mọi slot < ngưỡng) → bỏ
    if (mealIds.length > 0 && maxSlotScore < MIN_SLOT_SCORE) continue;

    // Tổng score để cap: hợp bữa + tiện lợi + goal hint + tránh món cũ
    let score = maxSlotScore + getConvenienceScore(key) * (style === "easy" ? 1 : 0.3);
    if (avoid.has(key)) score -= 6; // soft — vừa ăn gần đây, hạ ưu tiên
    if (v.tier === "occasional") score -= 3; // món đắt — hạ ưu tiên, KHÔNG loại hẳn
    if (goal === "cut" && ["poultry", "seafood", "veg", "egg_dairy"].includes(v.cat)) score += 2;
    if (goal === "bulk" && ["starch", "beef", "pork", "egg_dairy"].includes(v.cat)) score += 2;
    // Bulk: hạ điểm carb low-cal / no lâu (gạo lứt, khoai lang) — bulk cần cơm trắng, mì, năng lượng cao
    const BULK_DEMOTE_CARB = new Set(["cơm gạo lứt", "gạo lứt", "bánh mì đen", "quinoa"]);
    if (goal === "bulk" && BULK_DEMOTE_CARB.has(key)) score -= 4;
    // Cut: nâng điểm carb no lâu (gạo lứt, khoai lang) — cut cần low GI
    const CUT_PREFER_CARB = new Set(["cơm gạo lứt", "gạo lứt", "khoai lang"]);
    if (goal === "cut" && CUT_PREFER_CARB.has(key)) score += 2;
    // VN bannedKeys: hạ điểm mạnh (vẫn trong whitelist nhưng AI ít chọn)
    if (vnBanned && vnBanned.has(key)) score -= 5;

    items.push({ key, role: getFoodRole(key), cal: v.cal, p: v.p, c: v.c, f: v.f, slots, _score: score });
  }

  // Cap — prompt không bao giờ phụ thuộc size FoodDB
  if (items.length > AI_LIMITS.maxWhitelistItems) {
    // Giữ cân bằng: rau có quota RIÊNG (không để trái cây conv cao
    // đá rau văng khỏi nhóm fixed — bữa chính VN bắt buộc có rau/canh)
    items.sort((a, b) => b._score - a._score);
    const group = it => it.role === "fixed"
      ? (LOCAL_FOODS[it.key]?.cat === "veg" ? "veg" : "fixedOther")
      : it.role;
    const byGroup = { protein: [], carb: [], veg: [], fixedOther: [], fat: [] };
    items.forEach(it => byGroup[group(it)]?.push(it));
    const quota = { protein: 0.32, carb: 0.22, veg: 0.20, fixedOther: 0.16, fat: 0.10 };
    const capped = [];
    Object.entries(quota).forEach(([g, q]) => {
      capped.push(...byGroup[g].slice(0, Math.ceil(AI_LIMITS.maxWhitelistItems * q)));
    });
    items = capped.slice(0, AI_LIMITS.maxWhitelistItems);
  }

  items.forEach(it => delete it._score);
  return { items, count: items.length };
}
