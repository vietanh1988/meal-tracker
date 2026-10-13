// node --test tests/ — món không ăn / dị ứng / ăn chay
import test from "node:test";
import assert from "node:assert/strict";
import { avoidGroups, exclusionKeys } from "../src/lib/allergy.js";
import { LOCAL_FOODS } from "../src/lib/localFoodDB.js";

const ex = (t) => exclusionKeys(t, LOCAL_FOODS);
const has = (set, k) => assert.ok(set.has(k), `phải chặn "${k}"`);
const not = (set, k) => assert.ok(!set.has(k), `không được chặn "${k}"`);
const pick = (re) => Object.keys(LOCAL_FOODS).find((k) => re.test(k));

test("khớp theo từ: 'các loại hạt' không chặn cá, 'bỏ' không phải bò", () => {
  assert.deepEqual([...avoidGroups("không ăn các loại hạt")], ["nuts"]);
  assert.equal(avoidGroups("bỏ hành").size, 0);
  const s = ex("các loại hạt");
  const fish = pick(/^cá /);
  if (fish) not(s, fish);
});

test("kiêng bò: chặn cả món nước có bò (phở bò)", () => {
  const s = ex("bò");
  const pho = pick(/^phở bò/);
  if (pho) has(s, pho);
  not(s, "cơm trắng");
});

test("ăn chay: chặn thịt cá, vẫn cho trứng sữa; thuần chay chặn luôn trứng sữa", () => {
  const veg = ex("tôi ăn chay");
  const egg = pick(/^trứng gà luộc$/) || pick(/^trứng/);
  const chicken = pick(/^ức gà/) || pick(/ gà/);
  if (chicken) has(veg, chicken);
  if (egg) not(veg, egg);
  const vegan = ex("thuần chay");
  if (egg) has(vegan, egg);
  not(vegan, "cơm trắng");
});

test("hải sản / sữa", () => {
  const s = ex("dị ứng hải sản, sữa");
  const shrimp = pick(/^tôm/);
  if (shrimp) has(s, shrimp);
  const milk = pick(/^sữa/);
  if (milk) has(s, milk);
});

test("trống → không chặn gì", () => {
  assert.equal(ex("").size, 0);
  assert.equal(ex("   ").size, 0);
});

test("kiêng cá không chặn tôm; kiêng bò không chặn thịt dê; kiêng hạt không chặn đậu", () => {
  const fish = ex("không ăn cá");
  const shrimp = Object.keys(LOCAL_FOODS).find((k) => /^tôm/.test(k));
  if (shrimp) assert.ok(!fish.has(shrimp));
  const beef = ex("bò");
  if (LOCAL_FOODS["thịt dê"]) assert.ok(!beef.has("thịt dê"));
  const nuts = ex("dị ứng hạt");
  if (LOCAL_FOODS["đậu đen"]) assert.ok(!nuts.has("đậu đen"));
  assert.ok(nuts.has("lạc") || nuts.has("đậu phộng"));
});
