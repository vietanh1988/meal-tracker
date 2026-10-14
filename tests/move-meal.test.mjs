// Gộp món khi chuyển bữa (14/10)
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeIntoMeal, setMeal } from "../src/lib/mealMath.js";

test("gộp vào bữa đã có: giữ món cũ + tên bữa đích, đã ăn theo bữa chuyển", () => {
  const day = { meals: [{ meal_id: "toi", meal_name: "Bữa tối", items: [{ food: "Canh" }] }], eaten_meals: [] };
  const out = mergeIntoMeal(day, "toi", [{ food: "Cơm" }], { name: "Bữa sáng", eaten: true });
  const m = out.meals.find((x) => x.meal_id === "toi");
  assert.deepEqual(m.items.map((i) => i.food), ["Canh", "Cơm"]);
  assert.equal(m.meal_name, "Bữa tối");
  assert.deepEqual(out.eaten_meals, ["toi"]);
});

test("bữa đích trống: tạo bữa mới, chưa ăn nếu bữa chuyển chưa ăn", () => {
  const out = mergeIntoMeal({ meals: [], eaten_meals: ["sang"] }, "toi", [{ food: "Cơm" }], { eaten: false });
  assert.equal(out.meals[0].meal_name, "Bữa tối");
  assert.deepEqual(out.eaten_meals, ["sang"]);
});

test("cùng ngày: bỏ bữa nguồn rồi gộp sang bữa đích", () => {
  const day = { meals: [{ meal_id: "trua", items: [{ food: "Bún" }] }, { meal_id: "toi", items: [{ food: "Cơm" }] }], eaten_meals: ["trua"] };
  const out = mergeIntoMeal(setMeal(day, "trua", []), "toi", [{ food: "Bún" }], { eaten: true });
  assert.deepEqual(out.meals.map((m) => m.meal_id), ["toi"]);
  assert.equal(out.meals[0].items.length, 2);
  assert.deepEqual(out.eaten_meals, ["toi"]);
});
