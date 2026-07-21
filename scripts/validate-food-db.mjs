// ============================================================
// VALIDATE FOOD DB — Chạy trước mỗi lần import data mới
// node scripts/validate-food-db.mjs
// ============================================================

import { LOCAL_FOODS, COOK_MODIFIERS, lookupLocalFood, getFoodRole, getGramLimit, getFoodDisplay, getFoodRegion, getConvenienceScore, isStandaloneDish, getAllFoods, getFoodCount } from '../src/lib/localFoodDB.js';

const errors = [];
const warnings = [];
let passed = 0;

const items = Object.entries(LOCAL_FOODS);

console.log(`\n🔍 Validating ${items.length} items in LOCAL_FOODS...\n`);

for (const [key, item] of items) {
  const itemErrors = [];

  // 1. Cal ≈ P×4 + C×4 + F×9 (fiber tính 2cal/g thay vì 4cal/g trong carb)
  const fiberCal = (item.fiber || 0) * 2; // fiber chỉ 2 cal/g
  const calcCal = item.p * 4 + (item.c - (item.fiber || 0)) * 4 + (item.fiber || 0) * 2 + item.f * 9;
  const tolerance = item.form === "composite" ? 0.20 : item.cal < 50 ? 0.30 : 0.12;
  if (item.cal > 0 && calcCal > 0) {
    const diff = Math.abs(item.cal - calcCal) / item.cal;
    if (diff > tolerance) {
      itemErrors.push(`Cal lệch: ghi ${item.cal} nhưng P×4+C×4+F×9 = ${Math.round(calcCal)} (lệch ${Math.round(diff * 100)}%)`);
    }
  }

  // 2. Macro phải dương
  if (item.p < 0 || item.c < 0 || item.f < 0 || item.cal < 0) {
    itemErrors.push("Macro âm");
  }

  // 3. Protein source phải có P > 5g
  const role = getFoodRole(key);
  if (role === "protein" && item.p < 5 && item.form !== "liquid") {
    itemErrors.push(`Protein source chỉ có ${item.p}g protein per 100g`);
  }

  // 4. Cal range hợp lý
  if (item.form !== "composite" && item.form !== "liquid" && item.cal > 900) {
    warnings.push(`[${key}] Cal > 900/100g — chỉ dầu/mỡ/bơ mới cao thế (${item.cal})`);
  }
  if (item.cal < 1 && !["drink", "sauce", "supp"].includes(item.cat) && item.form !== "liquid" && item.form !== "powder") {
    itemErrors.push(`Cal < 1 — có đúng không? (${item.cal})`);
  }

  // 5. Phải có cat
  if (!item.cat) {
    itemErrors.push("Thiếu cat (category)");
  }

  // 6. Tên key ≥ 2 ký tự
  if (key.length < 2) {
    itemErrors.push(`Key quá ngắn: "${key}"`);
  }

  // 7. form phải hợp lệ
  const validForms = ["raw", "cooked", "composite", "liquid", "solid", "dry", "powder"];
  if (item.form && !validForms.includes(item.form)) {
    itemErrors.push(`Form không hợp lệ: "${item.form}"`);
  }

  // 8. Composite phải có region
  if (item.form === "composite" && !item.region) {
    warnings.push(`[${key}] Composite dish không có region`);
  }

  if (itemErrors.length > 0) {
    errors.push({ key, errors: itemErrors });
  } else {
    passed++;
  }
}

// Check trùng key (case-insensitive)
const lowerKeys = items.map(([k]) => k.toLowerCase());
const seen = new Set();
const dupes = [];
for (const k of lowerKeys) {
  if (seen.has(k)) dupes.push(k);
  seen.add(k);
}
if (dupes.length > 0) {
  errors.push({ key: "DUPLICATE", errors: dupes.map(d => `Key trùng: "${d}"`) });
}

// Check COOK_MODIFIERS
const cookKeys = Object.keys(COOK_MODIFIERS);
console.log(`📝 COOK_MODIFIERS: ${cookKeys.length} methods`);

// Check functions work
try {
  const test1 = lookupLocalFood("ức gà", 100);
  if (!test1 || test1.protein < 20) {
    errors.push({ key: "LOOKUP", errors: ["lookupLocalFood('ức gà', 100) trả sai"] });
  }
  const test2 = lookupLocalFood("ức gà nướng", 150);
  if (!test2) {
    errors.push({ key: "LOOKUP", errors: ["lookupLocalFood('ức gà nướng', 150) trả null"] });
  }
  const test3 = lookupLocalFood("xyz không có", 100);
  if (test3 !== null) {
    errors.push({ key: "LOOKUP", errors: ["lookupLocalFood('xyz không có') phải trả null"] });
  }
} catch (e) {
  errors.push({ key: "LOOKUP", errors: [`lookupLocalFood crash: ${e.message}`] });
}

// Report
console.log("════════════════════════════════════════════════");
console.log(`📊 KẾT QUẢ: ${passed} passed, ${errors.length} errors, ${warnings.length} warnings`);

if (warnings.length > 0) {
  console.log("\n⚠️ WARNINGS:");
  warnings.forEach(w => console.log(`  ${w}`));
}

if (errors.length > 0) {
  console.log("\n❌ ERRORS:");
  errors.forEach(e => {
    console.log(`  [${e.key}]`);
    e.errors.forEach(err => console.log(`    → ${err}`));
  });
  console.log("\n❌ CÓ LỖI — kiểm tra trước khi import.");
} else {
  console.log("\n✅ TẤT CẢ OK — an toàn để import.");
}
console.log("════════════════════════════════════════════════\n");

process.exit(errors.length > 0 ? 1 : 0);
