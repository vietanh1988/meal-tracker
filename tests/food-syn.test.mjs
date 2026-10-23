import { test } from "node:test";
import assert from "node:assert/strict";
import { canonFood, canonPlain, foodEq } from "../src/lib/foodSyn.js";
import { lookupLocalFood, LOCAL_FOODS, canonKeyOf } from "../src/lib/localFoodDB.js";
import { searchFoods } from "../src/lib/mobileView.js";
import { cookPer100 } from "../src/lib/cookMethods.js";

test("23/10 tên vùng miền: lợn = heo, rán = chiên, lạc = đậu phộng, ngô = bắp, nem rán = chả giò", () => {
  assert.equal(canonFood("thịt lợn rim"), canonFood("thịt heo rim"));
  assert.equal(canonFood("trứng rán"), canonFood("trứng chiên"));
  assert.equal(canonFood("lạc rang"), canonFood("đậu phộng rang"));
  assert.equal(canonFood("ngô luộc"), canonFood("bắp luộc"));
  assert.equal(canonFood("nem rán"), canonFood("chả giò"));
  assert.equal(canonPlain("thit lon rim"), canonPlain("thịt heo rim"));
  assert.ok(foodEq("cá quả kho", "cá lóc kho"));
});

test("23/10 bỏ dấu không được gộp 2 món khác nhau (bò khô ≠ bò kho, mè ≠ me, dừa ≠ dứa, gân ≠ gan)", () => {
  for (const [a, b] of [["bò khô", "bò kho"], ["mè", "me"], ["dừa", "dứa"], ["gân bò", "gan bò"], ["cá khô", "cá kho"]]) assert.notEqual(canonFood(a), canonFood(b), `${a} / ${b}`);
  assert.notEqual(LOCAL_FOODS["bò khô"].cal, LOCAL_FOODS["bò kho"].cal);
});

test("23/10 các tên cùng món dùng chung 1 bộ số", () => {
  for (const [a, b] of [["thịt heo", "thịt lợn"], ["ba chỉ", "ba rọi"], ["lạc", "đậu phộng"], ["ngô", "bắp"], ["chả giò", "nem rán"], ["dứa", "thơm"]]) {
    assert.equal(LOCAL_FOODS[a].cal, LOCAL_FOODS[b].cal, `${a} / ${b}`);
    assert.equal(LOCAL_FOODS[a].p, LOCAL_FOODS[b].p, `${a} / ${b}`);
  }
});

test("23/10 số nguyên liệu theo Bảng thành phần thực phẩm VN 2007 (Viện Dinh dưỡng)", () => {
  const raw = (k) => LOCAL_FOODS[k].raw || LOCAL_FOODS[k]; // nguyên liệu hiện tên đã nấu: số sống giữ ở .raw
  assert.deepEqual([raw("trứng gà").cal, raw("trứng gà").p], [166, 14.8]); // 9001
  assert.deepEqual([raw("thịt lợn nạc").cal, raw("thịt lợn nạc").p], [139, 19]); // 7017
  assert.equal(raw("ba chỉ").cal, 260); // 7018 nửa nạc nửa mỡ (trước: 518 theo ba chỉ Mỹ)
  assert.equal(LOCAL_FOODS["bánh phở"].cal, 143); // 1013
  assert.equal(LOCAL_FOODS["ba chỉ"].ref, "vdd:7018");
});

test("23/10 nguyên liệu + cách nấu: tìm được và tính theo hệ số thành phẩm + dầu / đường", () => {
  const r = lookupLocalFood("thịt lợn rim", 100);
  assert.ok(r && r.cal > LOCAL_FOODS["thịt heo"].cal, "rim phải cao hơn thịt sống (mất nước + đường)");
  const g = lookupLocalFood("gà rang gừng", 100);
  assert.ok(g && /gà/.test(g.name), `gà rang gừng phải ra gà, không ra gừng (${g && g.name})`);
  // gà cả da luộc ≈ 219 kcal (USDA stewed meat+skin), quay ≈ 239
  const luoc = cookPer100(LOCAL_FOODS["thịt gà"], "thịt gà", "luộc");
  assert.ok(Math.abs(luoc.cal - 219) < 15, `gà luộc ${luoc.cal}`);
  const res = searchFoods("cá quả kho tộ", {}, 5);
  assert.ok(res.length && /cá lóc|cá quả/i.test(res[0].display));
  const t = searchFoods("thit heo rim", {}, 5);
  assert.ok(t.length && /thịt heo rim/i.test(t[0].display));
});

test("23/10 tên hiện là món đã nấu thì số là món đã nấu (ức gà = Ức gà áp chảo)", () => {
  const r = lookupLocalFood("ức gà", 100);
  assert.ok(r.protein > 28, `ức gà áp chảo phải ~30 g đạm / 100 g (đang ${r.protein})`);
  assert.equal(canonFood("lườn gà"), canonFood("ức gà"));
  assert.equal(canonKeyOf("thit ga"), "thịt gà");
});

test("23/10 thực đơn (đọc LOCAL_FOODS thẳng) và Ghi bữa (lookupLocalFood) ra cùng 1 số", () => {
  for (const k of ["ức gà", "thịt heo", "ba chỉ", "cá basa", "trứng gà", "rau muống"]) {
    const r = lookupLocalFood(k, 100);
    assert.equal(LOCAL_FOODS[k].cal, r.cal, k);
  }
  assert.ok(lookupLocalFood("ức gà nướng", 100).cal < 200, "ghép cách nấu khác tính từ số sống, không nấu chồng");
});

test("23/10 gõ tên nguyên liệu → gợi thêm cách nấu", () => {
  const r = searchFoods("cá lóc", {}, 30).map((x) => x.display.toLowerCase());
  assert.ok(r.some((d) => d.includes("chiên")) && r.some((d) => d.includes("hấp")), r.join(", "));
});
