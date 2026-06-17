// USDA FoodData Central API Service + Vietnamese → English Translation
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// ============================================================
// BẢNG TRANSLATE VN → EN
// ============================================================

// Thực phẩm: key = tiếng Việt (lowercase), value = USDA English keyword
// Sắp xếp dài → ngắn để match "ức gà" trước "gà"
const FOOD_MAP = {
  // --- THỊT ---
  "ức gà":"chicken breast","đùi gà":"chicken thigh","cánh gà":"chicken wing",
  "gà nguyên con":"chicken whole","gà":"chicken",
  "thịt bò xay":"ground beef","thăn bò":"beef tenderloin","thịt bò":"beef","bò":"beef",
  "thịt lợn nạc":"pork loin","ba chỉ":"pork belly","ba rọi":"pork belly",
  "sườn lợn":"pork ribs","thịt lợn":"pork","thịt heo":"pork","heo":"pork","lợn":"pork",
  "thịt vịt":"duck","vịt":"duck","thịt cừu":"lamb","cừu":"lamb",
  // --- TRỨNG ---
  "lòng trắng trứng":"egg white","trứng gà":"egg","trứng vịt":"duck egg","trứng cút":"quail egg","trứng":"egg",
  // --- HẢI SẢN / CÁ ---
  "cá hồi":"salmon","cá ngừ":"tuna","cá rô phi":"tilapia","cá basa":"pangasius",
  "cá thu":"mackerel","cá chép":"carp","cá trích":"sardine","cá":"fish",
  "tôm":"shrimp","mực":"squid","ngao":"clam","nghêu":"clam","cua":"crab","sò":"oyster",
  // --- RAU CỦ ---
  "rau muống":"water spinach","rau cải xanh":"chinese broccoli","rau cải":"bok choy",
  "bông cải xanh":"broccoli","bông cải trắng":"cauliflower","bông cải":"broccoli",
  "cải thảo":"napa cabbage","bắp cải":"cabbage",
  "rau bina":"spinach","chân vịt":"spinach","xà lách":"lettuce",
  "cà chua":"tomato","dưa chuột":"cucumber","dưa leo":"cucumber",
  "cà rốt":"carrot","hành tây":"onion","ớt chuông":"bell pepper",
  "nấm":"mushroom","đậu bắp":"okra","bí đỏ":"pumpkin",
  "bí xanh":"zucchini","bí ngồi":"zucchini","măng":"bamboo shoot",
  "giá đỗ":"bean sprout","rau mùi":"cilantro","ngò":"cilantro",
  "hành lá":"green onion","tỏi":"garlic","gừng":"ginger",
  "rau":"vegetable",
  // --- ĐẬU / HẠT ---
  "đậu phụ":"tofu","đậu nành":"soybean","đậu đen":"black bean",
  "đậu xanh":"mung bean","đậu đỏ":"red bean","đậu hà lan":"green pea","đậu lăng":"lentil",
  // --- TINH BỘT ---
  "cơm gạo lứt":"brown rice cooked","cơm trắng":"white rice cooked","cơm":"white rice cooked",
  "gạo lứt":"brown rice","gạo trắng":"white rice","gạo":"white rice",
  "khoai lang":"sweet potato","khoai tây":"potato","khoai mì":"cassava","sắn":"cassava",
  "ngô":"corn","bắp":"corn",
  "yến mạch":"oats","bún":"rice vermicelli","phở":"rice noodle",
  "mì ý":"pasta","mì":"noodle wheat","miến":"glass noodle",
  "bánh mì đen":"whole wheat bread","bánh mì":"bread",
  "bột mì":"wheat flour",
  // --- HOA QUẢ ---
  "chuối":"banana","táo":"apple","cam":"orange","bưởi":"grapefruit",
  "xoài":"mango","dưa hấu":"watermelon","nho":"grape","ổi":"guava",
  "thanh long":"dragon fruit","bơ quả":"avocado","quả bơ":"avocado",
  "kiwi":"kiwi","dâu tây":"strawberry","đu đủ":"papaya","lê":"pear",
  "mận":"plum","vải":"lychee","chôm chôm":"rambutan","sầu riêng":"durian",
  "mít":"jackfruit","dừa":"coconut","chanh":"lemon",
  // --- SỮA ---
  "sữa chua hy lạp":"greek yogurt","sữa chua":"yogurt",
  "sữa tách béo":"skim milk","sữa tươi":"whole milk","sữa đặc":"condensed milk",
  "sữa hạt":"almond milk","sữa":"whole milk",
  "phô mai":"cheese","bơ đậu phộng":"peanut butter",
  "bơ":"butter","kem":"ice cream",
  // --- HẠT KHÔ / DẦU ---
  "lạc":"peanut","đậu phộng":"peanut","hạt điều":"cashew","hạnh nhân":"almond",
  "hạt óc chó":"walnut","hạt chia":"chia seed","hạt lanh":"flax seed",
  "hạt bí":"pumpkin seed","hạt hướng dương":"sunflower seed","mè":"sesame seed","vừng":"sesame seed",
  "dầu ô liu":"olive oil","dầu dừa":"coconut oil","dầu ăn":"vegetable oil",
  // --- GIA VỊ ---
  "nước mắm":"fish sauce","xì dầu":"soy sauce","nước tương":"soy sauce",
  "mật ong":"honey","đường":"sugar","muối":"salt",
  // --- BỔ SUNG GYM ---
  "whey isolate":"whey protein isolate","whey":"whey protein powder","bột whey":"whey protein powder",
  "mass gainer":"mass gainer protein","casein":"casein protein",
  "bcaa":"bcaa supplement","creatine":"creatine","granola":"granola","protein bar":"protein bar",
  // --- ĐỒ UỐNG ---
  "nước dừa":"coconut water","nước cam":"orange juice",
  "cà phê đen":"black coffee","cà phê":"coffee","trà xanh":"green tea",
  "nước ngọt":"soda","bia":"beer",
  // --- ĐÓNG GÓI ---
  "cá ngừ hộp":"canned tuna","xúc xích":"sausage","giò":"pork sausage","chả":"pork sausage",
};

// Cách chế biến
const COOK_MAP = {
  "luộc":"boiled","hấp":"steamed","chiên":"fried","rán":"fried",
  "áp chảo":"pan fried","nướng lò":"baked","nướng":"grilled",
  "kho":"braised","hầm":"stewed","xào":"stir fried",
  "sống":"raw","tươi":"raw","sấy khô":"dried","sấy":"dried",
  "hun khói":"smoked","muối":"pickled","dầm":"pickled","rang":"roasted",
};

// Estimate gram per đơn vị (khi user không nhập gram)
const UNIT_GRAM = {
  "trứng gà":50,"trứng vịt":70,"trứng cút":9,"trứng":50,"lòng trắng trứng":33,
  "chuối":120,"táo":180,"cam":150,"bưởi":300,"xoài":200,"ổi":150,"lê":170,
  "mận":80,"kiwi":75,"dâu tây":15,"thanh long":250,"bơ quả":170,"quả bơ":170,
  "sầu riêng":50,"vải":10,"chôm chôm":20,"mít":30,
  "bánh mì":30, // 1 lát
  "sữa tươi":200,"sữa tách béo":200,"sữa chua":100,"sữa chua hy lạp":150,"sữa":200,
  "đậu phụ":100, // 1 miếng
  "xúc xích":50, // 1 cái
};

// Keys sorted longest first for greedy matching
const FOOD_KEYS = Object.keys(FOOD_MAP).sort((a, b) => b.length - a.length);
const COOK_KEYS = Object.keys(COOK_MAP).sort((a, b) => b.length - a.length);
const UNIT_KEYS = Object.keys(UNIT_GRAM).sort((a, b) => b.length - a.length);

// ============================================================
// TRANSLATE: Vietnamese food name → English USDA query
// ============================================================
export function translateFood(nameVN) {
  const lower = (nameVN || "").toLowerCase().trim();
  if (!lower) return null;

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
  if (unit === "g" || unit === "ml") return 0; // user nhập gram trực tiếp

  const lower = (nameVN || "").toLowerCase().trim();

  // Find matching estimate
  for (const key of UNIT_KEYS) {
    if (lower.includes(key)) {
      return Math.round(UNIT_GRAM[key] * qty);
    }
  }

  // Default estimates by unit
  const defaults = { "quả": 100, "hộp": 200, "lát": 30, "bát": 250 };
  return Math.round((defaults[unit] || 100) * qty);
}

// ============================================================
// USDA API: Search + Calculate
// ============================================================
export async function searchUSDA(foodName, apiKey) {
  if (!apiKey || !foodName) return null;
  try {
    const res = await fetch(`${USDA_BASE}/foods/search?api_key=${apiKey}&query=${encodeURIComponent(foodName)}&pageSize=5&dataType=Foundation,SR Legacy`, {
      method: "GET",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.foods || data.foods.length === 0) return null;

    const food = data.foods[0];
    const nutrients = {};
    (food.foodNutrients || []).forEach(n => {
      if (n.nutrientId === 1003 || n.nutrientNumber === "203") nutrients.protein = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1004 || n.nutrientNumber === "204") nutrients.fat = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1005 || n.nutrientNumber === "205") nutrients.carb = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1079 || n.nutrientNumber === "291") nutrients.fiber = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1008 || n.nutrientNumber === "208") nutrients.cal = Math.round(n.value);
    });

    if (!nutrients.cal) return null;

    return {
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
  } catch (e) {
    console.error("USDA search error:", e);
    return null;
  }
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
