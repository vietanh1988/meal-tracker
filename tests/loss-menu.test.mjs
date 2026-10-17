// node --test tests/ — thực đơn tự lên cho khách giảm cân (bản vẽ 133)
import test from "node:test";
import assert from "node:assert/strict";
import { addAvoid, toggleAvoid, hasAvoid, avoidList, shouldAutoPlan, markPlanned } from "../src/lib/lossMenu.js";
import { exclusionKeys } from "../src/lib/allergy.js";

test("món không ăn: thêm / bỏ / không trùng", () => {
  assert.equal(addAvoid("", "Hải sản"), "Hải sản");
  assert.equal(addAvoid("Hải sản", "hải sản"), "Hải sản");
  assert.equal(toggleAvoid("Hải sản, Thịt bò", "thịt bò"), "Hải sản");
  assert.equal(toggleAvoid("Hải sản", "Trứng"), "Hải sản, Trứng");
  assert.ok(hasAvoid("Hải sản, Phở bò tái", "phở bò tái"));
  assert.deepEqual(avoidList(" a ,b;; c\n"), ["a", "b", "c"]);
});

test("chip món không ăn chặn được món trong kho", () => {
  const foods = { "cá kho tộ": { cat: "seafood" }, "thịt bò xào": { cat: "beef" }, "gà luộc": { cat: "poultry" } };
  const k = exclusionKeys("Hải sản, Thịt bò", foods);
  assert.ok(k.has("cá kho tộ") && k.has("thịt bò xào") && !k.has("gà luộc"));
});

test("tự lên thực đơn: chỉ ngày trống, chỉ 1 lần, chỉ chế độ giảm cân", () => {
  const empty = { meals: [] }, has = { meals: [{ meal_id: "sang", items: [{ food: "phở" }] }] };
  assert.equal(shouldAutoPlan({ lossMode: true, date: "2026-10-18", day: empty }), true);
  assert.equal(shouldAutoPlan({ lossMode: true, date: "2026-10-18", day: has }), false);
  assert.equal(shouldAutoPlan({ lossMode: false, date: "2026-10-18", day: empty }), false);
  assert.equal(shouldAutoPlan({ lossMode: true, date: "2026-10-18", day: empty, done: ["2026-10-18"] }), false);
  assert.equal(shouldAutoPlan({ lossMode: true, date: "2026-10-18", day: null }), false);
  assert.deepEqual(markPlanned(["a", "b"], "a"), ["b", "a"]);
  assert.equal(markPlanned([1, 2, 3, 4, 5, 6, 7], 8).length, 7);
});
