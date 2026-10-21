// node --test tests/ — logic giao diện mobile mới
import test from "node:test";
import assert from "node:assert/strict";
import * as V from "../src/lib/mobileView.js";

const macro = { calTarget: 2391, calRest: 2100, protein: 129, carb: 309, carbRest: 250, fat: 71, fiber: 33 };

test("dayTypeOf / targetsOf theo lịch tập", () => {
  const p = { gymDays: [1, 2, 3, 5, 6], exerciseType: "gym" }; // Ba Tư Năm Bảy CN
  assert.equal(V.dayTypeOf(p, "2026-10-13"), "train"); // T3
  assert.equal(V.dayTypeOf(p, "2026-10-12"), "rest"); // T2
  assert.equal(V.dayTypeOf({ ...p, exerciseType: "none" }, "2026-10-13"), "rest");
  assert.equal(V.targetsOf(macro, "train").cal, 2391);
  assert.equal(V.targetsOf(macro, "rest").c, 250);
});

test("visibleMealIds + timelineIds giữ bữa đã ghi dù đang tắt", () => {
  const ids = V.visibleMealIds({ train: ["toi", "sang", "pre", "trua"] }, "train", "none");
  assert.deepEqual(ids, ["sang", "trua", "toi"]);
  const day = { meals: [{ meal_id: "phu_chieu", items: [{ cal: 100 }] }] };
  assert.deepEqual(V.timelineIds(day, ids), ["sang", "trua", "phu_chieu", "toi"]);
});

test("mealRows: trạng thái eaten/planned/missed/empty, sắp theo giờ", () => {
  const day = {
    meals: [
      { meal_id: "trua", items: [{ cal: 400 }, { cal: 242 }] },
      { meal_id: "sang", items: [{ cal: 300 }] },
    ],
    eaten_meals: ["sang"],
  };
  const rows = V.mealRows(day, ["sang", "trua", "phu_chieu", "toi"], null, 15 * 60 + 10, true, false);
  assert.deepEqual(rows.map((r) => [r.id, r.state, r.cal]), [
    ["sang", "eaten", 300], ["trua", "planned", 642], ["phu_chieu", "empty", 0], ["toi", "empty", 0],
  ]);
  // 17:00 → phụ chiều 15:30 đã qua > 60'
  const later = V.mealRows(day, ["phu_chieu"], null, 17 * 60, true, false);
  assert.equal(later[0].state, "missed");
  // ngày đã qua: trống = missed
  assert.equal(V.mealRows({}, ["toi"], null, 0, false, true)[0].state, "missed");
  // giờ riêng của user
  const own = V.mealRows({}, ["sang", "toi"], { sang: "21:00" }, 0, true, false);
  assert.deepEqual(own.map((r) => r.id), ["toi", "sang"]);
});

test("focusMeal: bữa đang đến giờ chưa ăn; đã ăn → bữa kế", () => {
  const rows = V.mealRows({ meals: [{ meal_id: "trua", items: [{ cal: 1 }] }], eaten_meals: ["trua"] },
    ["sang", "trua", "phu_chieu", "toi"], null, 12 * 60, true, false);
  assert.equal(V.focusMeal(rows, 11 * 60 + 30).id, "phu_chieu"); // trưa đã ăn
  const rows2 = V.mealRows({}, ["sang", "trua", "toi"], null, 11 * 60 + 30, true, false);
  assert.equal(V.focusMeal(rows2, 11 * 60 + 30).id, "trua"); // 12:00 ≤ 11:30+60
  assert.equal(V.focusMeal(rows2, 5 * 60).id, "sang"); // trước bữa đầu
  const all = V.mealRows({ meals: [{ meal_id: "sang", items: [{ cal: 1 }] }], eaten_meals: ["sang"] }, ["sang"], null, 0, true, false);
  assert.equal(V.focusMeal(all, 600), null);
  assert.equal(V.mealWindowLabel("trua", "12:00"), "10:30 – 14:00");
  assert.equal(V.mealWindowLabel("toi", "19:30"), "19:30");
});

test("dayStatus + rangeSummary chỉ tính bữa đã tick", () => {
  const rows = [
    { log_date: "2026-10-13", meals: [{ meal_id: "sang", items: [{ cal: 1000 }] }, { meal_id: "toi", items: [{ cal: 433 }] }], eaten_meals: ["sang", "toi"] },
    { log_date: "2026-10-18", meals: [{ meal_id: "sang", items: [{ cal: 599 }] }], eaten_meals: [] },
    { log_date: "2026-10-14", meals: [{ meal_id: "sang", items: [{ cal: 2300 }] }], eaten_meals: ["sang"] },
  ];
  const dates = V.weekDates("2026-10-15");
  assert.equal(dates[0], "2026-10-12");
  assert.equal(dates[6], "2026-10-18");
  const s = V.rangeSummary(rows, dates, () => 2391);
  assert.equal(s.loggedCount, 2);
  assert.equal(s.avg, Math.round((1433 + 2300) / 2));
  assert.equal(s.okCount, 1);
  const by = Object.fromEntries(s.days.map((d) => [d.date, d.status]));
  assert.equal(by["2026-10-13"], "low");
  assert.equal(by["2026-10-14"], "ok");
  assert.equal(by["2026-10-18"], "planned");
  assert.equal(by["2026-10-12"], "none");
  assert.equal(V.dayStatus(rows[0], 1000).status, "high");
});

test("searchFoods: không dấu, khớp đầu chuỗi trước, có khẩu phần mặc định", () => {
  const r = V.searchFoods("com trang", {});
  assert.ok(r.length > 0);
  assert.equal(r[0].food, "cơm trắng");
  assert.equal(r[0].gram, 100);
  assert.equal(r[0].qty_display, "chén nhỏ");
  assert.ok(r[0].cal > 0);
  const egg = V.searchFoods("trứng gà", {})[0];
  assert.equal(egg.food, "trứng gà");
  assert.equal(egg.gram, 50);
  const cache = V.searchFoods("bánh xyz", { "bánh xyz đặc biệt": { p: 5, c: 30, f: 2, fiber: 1, cal: 160, gram: 120 } });
  assert.equal(cache[0].food, "bánh xyz đặc biệt");
  assert.equal(cache[0].gram, 120);
  assert.deepEqual(V.searchFoods("", {}), []);
});

test("scaleItem: macro theo gram mới", () => {
  const it = { food: "cơm trắng", gram: 200, cal: 260, p: 5.4, c: 56, f: 0.6, fiber: 0.8, qty_display: "chén đầy" };
  const s = V.scaleItem(it, 300);
  assert.equal(s.cal, 390);
  assert.equal(s.c, 84);
  assert.equal(s.gram, 300);
  assert.equal(s.qty_display, undefined);
  assert.equal(V.scaleItem(it, 200).qty_display, "chén đầy");
  assert.equal(V.scaleItem(it, 0).cal, 0);
  // 21/10: xoá trắng ô gram rồi gõ lại → nhân từ số gốc, không nhân từ số đã làm tròn
  let x = { food: "Phở lạ", gram: 300, cal: 450, p: 20, c: 60, f: 10, source: "cache" };
  for (const g of [0, 2, 20, 200]) x = V.scaleItem(x, g);
  assert.deepEqual([x.cal, x.p, x.c, x.f], [300, 13.3, 40, 6.7]);
  assert.equal(V.exactItems([x])[0]._base, undefined);
});

test("exactItem: món kho cùng gram luôn ra cùng số (21/10: trứng 200 g từng ra 300 / 310 / 311)", () => {
  const a = V.exactItem({ food: "trứng gà luộc", gram: 200, cal: 300, p: 30, c: 0, f: 20, source: "localDB" });
  const b = V.scaleItem({ food: "trứng gà luộc", gram: 150, cal: 233, p: 19, c: 1.9, f: 16, source: "localDB" }, 200);
  assert.deepEqual([a.cal, a.p, a.c, a.f], [310, 25.2, 2.2, 21.2]);
  assert.deepEqual([b.cal, b.p, b.c, b.f], [310, 25.2, 2.2, 21.2]);
  const m = V.exactItem({ food: "món tự nhập", gram: 200, cal: 123, p: 1, c: 2, f: 3, source: "manual" });
  assert.equal(m.cal, 123); // món không phải của kho giữ nguyên
});

test("weightSummary + deltaGood", () => {
  const log = [
    { id: 1, logged_date: "2026-06-19", kg: 63.1, delta: null },
    { id: 2, logged_date: "2026-09-15", kg: 64.4, delta: 0.1 },
  ];
  const s = V.weightSummary(log, 65, 63, "2026-10-13");
  assert.equal(s.curKg, 64.4);
  assert.equal(s.change, 1.3);
  assert.equal(s.pct, 68);
  assert.equal(s.sinceLast, 28);
  assert.equal(s.weighedToday, false);
  assert.equal(s.startDate, "19/06");
  assert.equal(s.perWeek, 0.1);
  assert.equal(V.deltaGood(0.1, 65, 63.1), true);
  assert.equal(V.deltaGood(-0.4, 65, 63.1), false);
  assert.equal(V.deltaGood(-0.4, 60, 63.1), true);
  const empty = V.weightSummary([], 65, 63, "2026-10-13");
  assert.equal(empty.curKg, 63);
  assert.equal(empty.sinceLast, null);
});

test("nhãn ngày + định dạng số", () => {
  assert.equal(V.weekdayStrip("2026-10-13"), "Ba");
  assert.equal(V.weekdayStrip("2026-10-18"), "CN");
  assert.equal(V.weekdayFull("2026-10-13"), "Thứ Ba");
  assert.equal(V.fmtInt(2391), "2.391");
  assert.equal(V.fmtDec(2.75, 2), "2,75");
});

test("fmtKg luôn 1 số lẻ", () => {
  assert.equal(V.fmtKg(64), "64,0");
  assert.equal(V.fmtKg(64.45), "64,5");
});

test("searchFoods: khớp theo từ khi không có nguyên cụm ('thịt gà xào' → món gà xào)", () => {
  const r = V.searchFoods("Thịt gà xào", {}, 20);
  assert.ok(r.length > 0, "phải có kết quả");
  assert.ok(r.some((i) => /gà xào/i.test(V.itemName(i))), r.map(V.itemName).join(", "));
  assert.equal(V.searchFoods("zzqx abc", {}, 20).length, 0);
});

test("tìm món không hiện 2 dòng trùng tên (16/10)", async () => {
  const { searchFoods, itemName } = await import("../src/lib/mobileView.js");
  for (const q of ["thịt lợn xào", "thịt heo", "trứng", "rau muống"]) {
    const n = searchFoods(q, {}, 30).map((x) => itemName(x).toLowerCase());
    assert.equal(new Set(n).size, n.length, `${q}: ${n.join(" | ")}`);
  }
});

test("capFirst: viết hoa chữ đầu tên món", () => {
  assert.equal(V.capFirst("sữa chua"), "Sữa chua");
  assert.equal(V.capFirst("ức gà"), "Ức gà");
  assert.equal(V.capFirst(""), "");
  assert.equal(V.capFirst(null), "");
});
