import { test } from "node:test";
import assert from "node:assert/strict";
import { portionOf, stepPortion, setPortion, toggleUnit, hasUnit } from "../src/lib/portion.js";

const rice = { food: "cơm trắng", gram: 250, cal: 325, p: 6, c: 71, f: 1, unit: "bát", unit_g: 166.7 };
test("hiện theo đơn vị, làm tròn ½", () => {
  const p = portionOf(rice);
  assert.equal(p.mode, "unit"); assert.equal(p.label, "1,5"); assert.equal(p.unit, "bát");
});
test("+/− theo đơn vị giữ unit và tính lại macro", () => {
  const up = stepPortion(rice, 1);
  assert.equal(portionOf(up).label, "2,5"); assert.equal(up.unit, "bát");
  assert.ok(up.cal > rice.cal);
  const one = { ...rice, gram: 167 };
  assert.equal(portionOf(stepPortion(one, -1)).label, "0,5");
  assert.equal(portionOf(stepPortion({ ...rice, gram: 83 }, -1)).label, "0,5");
});
test("đổi sang gram và gõ số", () => {
  const g = toggleUnit(rice);
  assert.equal(portionOf(g).mode, "g"); assert.equal(portionOf(g).label, "250");
  assert.equal(setPortion(rice, "2").gram, 333);
  assert.equal(setPortion(g, "300").gram, 300);
});
test("ml cho đồ uống, món không đơn vị theo gram", () => {
  assert.equal(portionOf({ gram: 250, unit: "ml" }).unit, "ml");
  assert.equal(portionOf({ gram: 150 }).mode, "g");
  assert.equal(hasUnit({ unit: "g", unit_g: 1 }), false);
  assert.equal(stepPortion({ gram: 150, cal: 300 }, 1).gram, 160);
});
