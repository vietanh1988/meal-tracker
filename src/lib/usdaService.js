// USDA FoodData Central API Service
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// Search for a food item and return macro per 100g
export async function searchUSDA(foodName, apiKey) {
  if (!apiKey || !foodName) return null;
  try {
    const res = await fetch(`${USDA_BASE}/foods/search?api_key=${apiKey}&query=${encodeURIComponent(foodName)}&pageSize=5&dataType=Foundation,SR Legacy`, {
      method: "GET",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.foods || data.foods.length === 0) return null;

    // Pick best match (first result)
    const food = data.foods[0];
    const nutrients = {};
    (food.foodNutrients || []).forEach(n => {
      // Nutrient IDs: 1003=Protein, 1004=Fat, 1005=Carb, 1079=Fiber, 1008=Energy(kcal)
      if (n.nutrientId === 1003 || n.nutrientNumber === "203") nutrients.protein = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1004 || n.nutrientNumber === "204") nutrients.fat = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1005 || n.nutrientNumber === "205") nutrients.carb = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1079 || n.nutrientNumber === "291") nutrients.fiber = Math.round(n.value * 10) / 10;
      if (n.nutrientId === 1008 || n.nutrientNumber === "208") nutrients.cal = Math.round(n.value);
    });

    // Must have at least calories
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

// Calculate macro for a food item using USDA data
export function calcFromUSDA(usdaData, gram, qty, unit) {
  const isWeight = !unit || unit === "g" || unit === "ml";
  const p = usdaData.per100g;

  if (isWeight && gram > 0) {
    const r = gram / 100;
    return {
      protein: Math.round(p.protein * r * 10) / 10,
      carb: Math.round(p.carb * r * 10) / 10,
      fat: Math.round(p.fat * r * 10) / 10,
      fiber: Math.round(p.fiber * r * 10) / 10,
      cal: Math.round(p.cal * r),
    };
  }

  // For non-gram units, estimate: 1 egg ~50g, 1 banana ~120g, etc.
  // Fallback: use qty * per100g (rough estimate)
  const estimatedGram = qty * 100;
  const r = estimatedGram / 100;
  return {
    protein: Math.round(p.protein * r * 10) / 10,
    carb: Math.round(p.carb * r * 10) / 10,
    fat: Math.round(p.fat * r * 10) / 10,
    fiber: Math.round(p.fiber * r * 10) / 10,
    cal: Math.round(p.cal * r),
  };
}
