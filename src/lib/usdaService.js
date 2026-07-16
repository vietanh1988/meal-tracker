// USDA FoodData Central API Service + Vietnamese → English Translation
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// ============================================================
// BẢNG TRANSLATE VN → EN
// ============================================================

const FOOD_MAP = {
  // --- THỊT GÀ ---
  "ức gà":"chicken breast","đùi gà":"chicken thigh","cánh gà":"chicken wing",
  "gà nguyên con":"chicken whole","lòng gà":"chicken giblet","gà":"chicken",
  // --- THỊT BÒ ---
  "thăn bò":"beef tenderloin","bắp bò":"beef shank","nạm bò":"beef brisket",
  "gân bò":"beef tendon","thịt bò xay":"ground beef","sườn bò":"beef ribs",
  "thịt bò":"beef","bò":"beef",
  // --- THỊT HEO ---
  "thịt lợn nạc":"pork loin","thịt heo xay":"ground pork","thịt lợn xay":"ground pork",
  "ba chỉ":"pork belly","ba rọi":"pork belly","sườn lợn":"pork ribs","sườn heo":"pork ribs",
  "nạc vai heo":"pork shoulder","thịt lợn":"pork","thịt heo":"pork","heo":"pork","lợn":"pork",
  // --- THỊT KHÁC ---
  "thịt vịt":"duck","vịt":"duck","thịt cừu":"lamb","cừu":"lamb",
  "thịt dê":"goat","thịt nai":"venison","thịt thỏ":"rabbit",
  // --- TRỨNG ---
  "lòng trắng trứng":"egg white","lòng đỏ trứng":"egg yolk",
  "trứng gà":"egg","trứng vịt":"duck egg","trứng cút":"quail egg","trứng":"egg",
  // --- HẢI SẢN / CÁ ---
  "cá hồi":"salmon","cá ngừ":"tuna","cá rô phi":"tilapia","cá basa":"pangasius",
  "cá thu":"mackerel","cá chép":"carp","cá trích":"sardine","cá diêu hồng":"red tilapia",
  "cá lóc":"snakehead fish","cá tra":"catfish","cá mú":"grouper",
  "cá saba":"mackerel","cá":"fish",
  "tôm sú":"tiger shrimp","tôm thẻ":"white shrimp","tôm":"shrimp",
  "mực":"squid","ngao":"clam","nghêu":"clam","cua":"crab","sò":"oyster",
  "bạch tuộc":"octopus","hàu":"oyster",
  // --- RAU CỦ ---
  "rau muống":"water spinach","rau cải xanh":"chinese broccoli","rau cải":"bok choy",
  "bông cải xanh":"broccoli","bông cải trắng":"cauliflower","bông cải":"broccoli",
  "cải thảo":"napa cabbage","bắp cải":"cabbage",
  "rau bina":"spinach","chân vịt":"spinach","xà lách":"lettuce",
  "rau dền":"amaranth greens","rau ngót":"sweet leaf","mồng tơi":"malabar spinach",
  "rau má":"pennywort","rau đay":"jute leaves",
  "cà chua":"tomato","dưa chuột":"cucumber","dưa leo":"cucumber",
  "cà rốt":"carrot","hành tây":"onion","ớt chuông":"bell pepper",
  "nấm":"mushroom","đậu bắp":"okra","bí đỏ":"pumpkin",
  "bí xanh":"zucchini","bí ngồi":"zucchini","bí đao":"winter melon",
  "su su":"chayote","su hào":"kohlrabi","củ cải":"radish","củ sen":"lotus root",
  "măng":"bamboo shoot","măng tây":"asparagus",
  "giá đỗ":"bean sprout","rau mùi":"cilantro","ngò":"cilantro",
  "hành lá":"green onion","tỏi":"garlic","gừng":"ginger",
  "đậu cô ve":"green beans","đậu que":"green beans",
  "rau":"vegetable",
  // --- ĐẬU / HẠT ---
  "đậu phụ":"tofu","đậu nành":"soybean","đậu đen":"black bean",
  "đậu xanh":"mung bean","đậu đỏ":"red bean","đậu hà lan":"green pea","đậu lăng":"lentil",
  "edamame":"edamame",
  // --- TINH BỘT ---
  "cơm gạo lứt":"brown rice cooked","cơm trắng":"white rice cooked","cơm":"white rice cooked",
  "gạo lứt":"brown rice","gạo trắng":"white rice","gạo":"white rice",
  "khoai lang":"sweet potato","khoai tây":"potato","khoai mì":"cassava","sắn":"cassava",
  "khoai sọ":"taro","khoai môn":"taro",
  "ngô":"corn","bắp":"corn",
  "yến mạch":"oats","bún":"rice vermicelli","miến":"glass noodle",
  "mì ý":"pasta","mì":"noodle wheat",
  "bánh mì đen":"whole wheat bread","bánh mì":"bread","bánh tráng":"rice paper",
  "bột mì":"wheat flour","bột yến mạch":"oat flour",
  "xôi":"sticky rice cooked","cháo":"rice porridge",
  // --- HOA QUẢ ---
  "chuối":"banana raw","táo":"apple raw","cam":"orange raw","bưởi":"grapefruit raw",
  "xoài":"mango raw","dưa hấu":"watermelon raw","nho":"grape raw","ổi":"guava raw",
  "thanh long":"dragon fruit","bơ quả":"avocado","quả bơ":"avocado",
  "kiwi":"kiwi raw","dâu tây":"strawberry raw","đu đủ":"papaya raw","lê":"pear raw",
  "mận":"plum raw","vải":"lychee","chôm chôm":"rambutan","sầu riêng":"durian",
  "mít":"jackfruit","dừa":"coconut raw","chanh":"lemon raw",
  "việt quất":"blueberry","nam việt quất":"cranberry",
  // --- SỮA ---
  "sữa chua hy lạp":"greek yogurt","sữa chua":"yogurt",
  "sữa tách béo":"skim milk","sữa tươi":"whole milk","sữa đặc":"condensed milk",
  "sữa hạt":"almond milk","sữa đậu nành":"soy milk","sữa hạt sen":"lotus seed milk",
  "sữa":"whole milk",
  "phô mai":"cheese","bơ đậu phộng":"peanut butter",
  "bơ":"butter","kem":"ice cream",
  // --- HẠT KHÔ / DẦU ---
  "lạc":"peanut","đậu phộng":"peanut","hạt điều":"cashew","hạnh nhân":"almond",
  "hạt óc chó":"walnut","hạt chia":"chia seed","hạt lanh":"flax seed",
  "hạt bí":"pumpkin seed","hạt hướng dương":"sunflower seed","mè":"sesame seed","vừng":"sesame seed",
  "hạt mắc ca":"macadamia","hạt dẻ":"chestnut",
  "dầu ô liu":"olive oil","dầu dừa":"coconut oil","dầu ăn":"vegetable oil","dầu mè":"sesame oil",
  // --- GIA VỊ ---
  "nước mắm":"fish sauce","xì dầu":"soy sauce","nước tương":"soy sauce",
  "mật ong":"honey","đường":"sugar","muối":"salt",
  "tương ớt":"chili sauce","tương cà":"ketchup","mayonnaise":"mayonnaise",
  // --- BỔ SUNG GYM ---
  "whey isolate":"whey protein isolate","whey":"whey protein powder","bột whey":"whey protein powder",
  "mass gainer":"mass gainer protein","casein":"casein protein",
  "bcaa":"bcaa supplement","creatine":"creatine","granola":"granola","protein bar":"protein bar",
  "granola bar":"granola bar",
  // --- ĐỒ UỐNG ---
  "nước dừa":"coconut water","nước cam":"orange juice",
  "cà phê đen":"black coffee","cà phê":"coffee","trà xanh":"green tea",
  "nước ngọt":"soda","bia":"beer","sinh tố":"smoothie",
  // --- ĐÓNG GÓI ---
  "cá ngừ hộp":"canned tuna","xúc xích":"sausage","giò":"pork sausage","chả":"pork sausage",
  "chả lụa":"pork roll","nem":"spring roll","patê":"pate",
};

// ============================================================
// BLACKLIST COMBO — món kết hợp USDA không tra được chính xác
// Những món này sẽ LUÔN fallback sang AI
// ============================================================
const COMBO_BLACKLIST = [
  "phở bò","phở gà","phở","bún bò","bún bò huế","bún chả","bún riêu","bún mọc",
  "cơm gà","cơm sườn","cơm rang","cơm chiên","cơm tấm","cơm văn phòng",
  "bún đậu mắm tôm","bún đậu","bánh cuốn","bánh xèo","bánh canh",
  "hủ tiếu","mì quảng","cao lầu","miến gà","miến ngan",
  "lẩu","lẩu thái","lẩu hải sản","lẩu gà",
  "gỏi cuốn","gỏi","nem cuốn","chả giò",
  "cháo gà","cháo lòng","cháo sườn",
  "xôi xéo","xôi gà","xôi lạc",
  "bánh mì thịt","bánh mì kẹp","sandwich",
  "pizza","hamburger","burger","kebab","shawarma",
  "salad","salad ức gà","salad cá hồi",
  "smoothie bowl","poke bowl","burrito",
];

// Cách chế biến
const COOK_MAP = {
  "luộc":"boiled","hấp":"steamed","chiên":"fried","rán":"fried",
  "áp chảo":"pan fried","nướng lò":"baked","nướng":"grilled",
  "kho":"braised","hầm":"stewed","xào":"stir fried",
  "sống":"raw","tươi":"raw","sấy khô":"dried","sấy":"dried",
  "hun khói":"smoked","muối":"pickled","dầm":"pickled","rang":"roasted",
  "om":"braised","rim":"caramelized","quay":"roasted","tần":"double boiled",
};

// ============================================================
// FIX: trước đây UNIT_GRAM áp dụng trọng lượng "1 quả nguyên" cho trái
// cây/trứng BẤT KỂ đơn vị người dùng thực sự chọn trong dropdown (g/ml/quả/
// hộp/lát/bát) — chỉ cần TÊN món khớp là áp dụng. Hậu quả: chọn "Chuối" +
// đơn vị "lát" (lát mỏng) vẫn bị tính như 1 quả chuối NGUYÊN (120g) thay vì
// 1 lát mỏng (~15-30g) — sai lệch 4-8 lần. Giờ tách riêng: nhóm "theo quả"
// chỉ áp dụng khi unit thực sự là "quả", các món còn lại (bánh mì/sữa/đậu
// phụ...) vẫn áp dụng theo tên vì đã khớp hợp lý với đơn vị hộp/lát hiện có.
// ============================================================
const UNIT_GRAM_PER_QUA = {
  "trứng gà":50,"trứng vịt":70,"trứng cút":9,"trứng":50,"lòng trắng trứng":33,"lòng đỏ trứng":17,
  "chuối":120,"táo":180,"cam":150,"bưởi":300,"xoài":200,"ổi":150,"lê":170,
  "mận":80,"kiwi":75,"dâu tây":15,"thanh long":250,"bơ quả":170,"quả bơ":170,
  "sầu riêng":50,"vải":10,"chôm chôm":20,"mít":30,
};
const UNIT_GRAM_ANY_UNIT = {
  "bánh mì":30, // 1 lát
  "bánh tráng":12, // 1 cái
  "sữa tươi":200,"sữa tách béo":200,"sữa chua":100,"sữa chua hy lạp":150,"sữa":200,
  "đậu phụ":100, // 1 miếng
  "xúc xích":50, // 1 cái
  "chả lụa":50,
  "nem":30,
};

// ============================================================
// ĐƠN VỊ MỞ RỘNG — scoop, chén, ly, con, miếng, khúc...
// ============================================================
const UNIT_DEFAULTS = {
  "g": 0, "ml": 0, // user nhập trực tiếp
  "quả": 100, "trái": 100,
  "hộp": 200, "lon": 330,
  "lát": 30, "miếng": 50,
  "bát": 250, "chén": 250, "tô": 350,
  "ly": 200, "cốc": 200,
  "muỗng": 30, "scoop": 30, // scoop whey ~30g
  "muỗng canh": 15, "muỗng cà phê": 5,
  "con": 30, // con tôm ~30g
  "khúc": 150, // khúc cá ~150g
  "bắp": 200, // bắp ngô ~200g
  "củ": 150, // củ khoai ~150g
  "nắm": 30, // nắm rau ~30g
  "bó": 200, // bó rau ~200g
  "thanh": 40, // thanh protein bar ~40g
};

// Keys sorted longest first for greedy matching
const FOOD_KEYS = Object.keys(FOOD_MAP).sort((a, b) => b.length - a.length);
const COOK_KEYS = Object.keys(COOK_MAP).sort((a, b) => b.length - a.length);
const UNIT_GRAM_QUA_KEYS = Object.keys(UNIT_GRAM_PER_QUA).sort((a, b) => b.length - a.length);
const UNIT_GRAM_ANY_KEYS = Object.keys(UNIT_GRAM_ANY_UNIT).sort((a, b) => b.length - a.length);
const COMBO_LOWER = COMBO_BLACKLIST.map(c => c.toLowerCase());

// ============================================================
// CHECK BLACKLIST — combo món không tra USDA được
// ============================================================
function isComboBlacklisted(nameVN) {
  const lower = (nameVN || "").toLowerCase().trim();
  return COMBO_LOWER.some(combo => lower.includes(combo));
}

// ============================================================
// TRANSLATE: Vietnamese food name → English USDA query
// Returns null nếu không translate được hoặc bị blacklist
// ============================================================
export function translateFood(nameVN) {
  const lower = (nameVN || "").toLowerCase().trim();
  if (!lower) return null;

  // Check blacklist trước
  if (isComboBlacklisted(lower)) return null;

  let foodEN = null;
  let cookEN = null;
  let matchedFoodKey = null;

  // 1. Find food match (longest first)
  for (const key of FOOD_KEYS) {
    if (lower.includes(key)) {
      foodEN = FOOD_MAP[key];
      matchedFoodKey = key;
      break;
    }
  }

  // 2. Find cooking method
  for (const key of COOK_KEYS) {
    if (lower.includes(key)) {
      cookEN = COOK_MAP[key];
      break;
    }
  }

  if (!foodEN) return null;

  // 3. Build USDA query
  const query = cookEN ? `${foodEN} ${cookEN}` : foodEN;

  return { query, foodEN, cookEN, matchedFoodKey };
}

// ============================================================
// ESTIMATE GRAM: auto fill gram khi user chọn đơn vị khác g/ml
// ============================================================
export function estimateGram(nameVN, unit, qty) {
  if (!nameVN || !qty || qty <= 0) return 0;
  if (unit === "g" || unit === "ml") return 0;

  const lower = (nameVN || "").toLowerCase().trim();

  // 1. Trọng lượng riêng theo "quả" — CHỈ áp dụng khi đơn vị thực sự là quả/trái
  if (unit === "quả" || unit === "trái") {
    for (const key of UNIT_GRAM_QUA_KEYS) {
      if (lower.includes(key)) {
        return Math.round(UNIT_GRAM_PER_QUA[key] * qty);
      }
    }
  }

  // 2. Trọng lượng riêng áp dụng bất kể đơn vị (đã khớp hợp lý với hộp/lát/miếng)
  for (const key of UNIT_GRAM_ANY_KEYS) {
    if (lower.includes(key)) {
      return Math.round(UNIT_GRAM_ANY_UNIT[key] * qty);
    }
  }

  // 3. Fallback to unit-based default
  const unitGram = UNIT_DEFAULTS[unit] || UNIT_DEFAULTS[unit.toLowerCase()] || 100;
  return Math.round(unitGram * qty);
}

// ============================================================
// VALIDATE USDA RESULT — bỏ qua nếu data bất thường
// ============================================================
function validateUSDAResult(usdaData, searchQuery) {
  if (!usdaData || !usdaData.per100g) return false;
  const p = usdaData.per100g;

  // Rule 1: cal phải > 0
  if (!p.cal || p.cal <= 0) return false;

  // Rule 2: thịt/cá/hải sản phải có protein >= 5g/100g
  const proteinFoods = ["chicken","beef","pork","fish","shrimp","tuna","salmon","tilapia",
    "duck","lamb","egg","crab","squid","turkey","goat","venison","rabbit",
    "mackerel","sardine","catfish","grouper","octopus","oyster"];
  const isProteinFood = proteinFoods.some(f => (searchQuery || "").toLowerCase().includes(f));
  if (isProteinFood && p.protein < 5) return false;

  // Rule 3: cal phải hợp lý (thức ăn thật: 5-900 cal/100g)
  if (p.cal < 5 || p.cal > 900) return false;

  // Rule 4: tổng macro không vượt quá gram (P+C+F <= 100g per 100g food)
  if ((p.protein + p.carb + p.fat) > 105) return false;

  return true;
}

// ============================================================
// SMART SEARCH — chọn kết quả USDA tốt nhất, không mù quáng lấy [0]
// ============================================================
function pickBestUSDAResult(foods, searchQuery) {
  if (!foods || foods.length === 0) return null;

  const query = (searchQuery || "").toLowerCase();
  const queryWords = query.split(/\s+/);

  // Score each result
  let best = null;
  let bestScore = -1;

  for (const food of foods.slice(0, 5)) {
    const desc = (food.description || "").toLowerCase();
    let score = 0;

    // Exact word matches
    queryWords.forEach(w => {
      if (desc.includes(w)) score += 10;
    });

    // Prefer "raw" or "cooked" over processed
    if (desc.includes("raw") && query.includes("raw")) score += 5;
    if (desc.includes("cooked") && (query.includes("cooked") || query.includes("boiled") || query.includes("steamed") || query.includes("grilled"))) score += 5;

    // Penalize processed/mixed items
    if (desc.includes("with sauce")) score -= 3;
    if (desc.includes("coating") || desc.includes("battered")) score -= 5;
    if (desc.includes("baby food") || desc.includes("infant")) score -= 20;
    if (desc.includes("soup") && !query.includes("soup")) score -= 5;

    // Prefer shorter descriptions (more specific)
    if (desc.split(",").length <= 3) score += 2;

    // Prefer Foundation/SR Legacy
    if (food.dataType === "Foundation") score += 3;
    if (food.dataType === "SR Legacy") score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }

  return best || foods[0];
}

// ============================================================
// USDA API: Search + Calculate
// ============================================================
export async function searchUSDA(foodName, apiKey) {
  if (!apiKey || !foodName) return null;

  // Check blacklist
  if (isComboBlacklisted(foodName)) return null;

  try {
    const res = await fetch(`${USDA_BASE}/foods/search?api_key=${apiKey}&query=${encodeURIComponent(foodName)}&pageSize=5&dataType=Foundation,SR Legacy`, {
      method: "GET",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.foods || data.foods.length === 0) return null;

    // Smart pick best result instead of blind [0]
    const food = pickBestUSDAResult(data.foods, foodName);
    if (!food) return null;

    const nutrients = {};
    (food.foodNutrients || []).forEach(n => {
      if (n.nutrientId === 1003 || n.nutrientNumber === "203") nutrients.protein = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1004 || n.nutrientNumber === "204") nutrients.fat = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1005 || n.nutrientNumber === "205") nutrients.carb = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1079 || n.nutrientNumber === "291") nutrients.fiber = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1008 || n.nutrientNumber === "208") nutrients.cal = Math.round(n.value);
    });

    const result = {
      name: food.description,
      source: "USDA",
      fdcId: food.fdcId,
      per100g: {
        protein: nutrients.protein || 0,
        carb: nutrients.carb || 0,
        fat: nutrients.fat || 0,
        fiber: nutrients.fiber || 0,
        cal: nutrients.cal || 0,
      }
    };

    // Validate before returning
    if (!validateUSDAResult(result, foodName)) {
      console.warn("⚠️ USDA result failed validation:", foodName, result.per100g);
      return null;
    }

    return result;
  } catch (e) {
    console.error("USDA search error:", e);
    return null;
  }
}

// ============================================================
// Bổ sung dầu/mỡ theo cách chế biến — chỉ dùng cho USDA items
// (LocalDB đã có macro chế biến sẵn, AI tự biết cộng dầu, Cache
// lưu kết quả đã xử lý → 3 nguồn kia KHÔNG gọi hàm này).
// Bảng tra dựa trên thực tế nấu ăn VN: rán/chiên ngập dầu ~5ml,
// xào/áp chảo ~3ml, rang ~2ml. Luộc/hấp/kho/hầm +0.
// 1ml dầu ăn ≈ 0.92g → fat = ml * 0.92, cal = fat * 9.
// ============================================================
const OIL_ML_BY_COOK = {
  "fried": 5, "pan fried": 4, "stir fried": 3,
  "roasted": 2,  // rang/quay
};

export function adjustCookingOil(macro, cookEN) {
  if (!cookEN) return macro;
  const oilMl = OIL_ML_BY_COOK[cookEN];
  if (!oilMl) return macro;
  const addFat = Math.round(oilMl * 0.92 * 10) / 10;
  const addCal = Math.round(addFat * 9);
  return {
    ...macro,
    fat: Math.round(((macro.fat || 0) + addFat) * 10) / 10,
    cal: Math.round((macro.cal || 0) + addCal),
  };
}

export function calcFromUSDA(usdaData, gram) {
  const p = usdaData.per100g;
  const r = (gram || 100) / 100;
  return {
    protein: Math.round(p.protein * r * 10) / 10,
    carb: Math.round(p.carb * r * 10) / 10,
    fat: Math.round(p.fat * r * 10) / 10,
    fiber: Math.round(p.fiber * r * 10) / 10,
    cal: Math.round(p.cal * r),
  };
}
