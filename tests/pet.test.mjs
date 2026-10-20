import { test } from "node:test";
import assert from "node:assert/strict";
import { levelOf, moodOf, eventsFor, pickEvent, weekStart, itemStatus, seasonOf, collectionStatus } from "../src/lib/petMath.js";

test("cấp theo kinh nghiệm (300, +150 mỗi cấp, sau cấp 10 +1.500)", () => {
  assert.deepEqual(levelOf(0), { n: 1, from: 0, to: 300 });
  assert.equal(levelOf(299).n, 1);
  assert.equal(levelOf(300).n, 2);
  assert.deepEqual(levelOf(1620), { n: 4, from: 1350, to: 2100 });
  assert.equal(levelOf(8100).n, 10);
  assert.deepEqual(levelOf(9700), { n: 11, from: 9600, to: 11100 });
});

test("tâm trạng do máy tính", () => {
  const mt = [420, 720, 1170];
  assert.equal(moodOf({ minutes: 600, mealTimes: mt, logged: 0, daysAway: 3 }), "mung");
  assert.equal(moodOf({ minutes: 23 * 60, mealTimes: mt, logged: 3 }), "ngu");
  assert.equal(moodOf({ minutes: 450, mealTimes: mt, logged: 0 }), "ngu"); // chưa quá bữa đầu + 1 giờ
  assert.equal(moodOf({ minutes: 800, mealTimes: mt, logged: 1 }), "hoi"); // quá 2 bữa, mới ghi 1
  assert.equal(moodOf({ minutes: 800, mealTimes: mt, logged: 2 }), "vui");
});

test("việc Pi nói + chọn câu (ưu tiên, không lặp 24 giờ, đủ số câu thì im, giờ yên lặng)", () => {
  const ev = eventsFor({ minutes: 16 * 60, logged: 3, mealsOn: 3, mealTimes: [420, 720], streak: 7, waterMl: 1000, waterGoal: 2500 });
  const keys = ev.map((e) => e.key);
  assert.ok(keys.includes("streak") && keys.includes("full") && keys.includes("water"));
  assert.equal(ev.find((e) => e.key === "water").so, 6);
  const prio = { streak: 3, full: 4, water: 7 };
  assert.equal(pickEvent(ev, { prio, minutes: 960 }).key, "streak");
  assert.equal(pickEvent(ev, { prio, minutes: 960, said: { streak: 1000 }, nowMs: 2000 }).key, "full");
  assert.equal(pickEvent(ev, { prio, minutes: 960, saidToday: 3, perDay: 3 }), null);
  assert.equal(pickEvent(ev, { prio, minutes: 23 * 60 }), null);
});

test("đầu tuần thứ Hai", () => {
  assert.equal(weekStart("2026-10-20"), "2026-10-19");
  assert.equal(weekStart("2026-10-25"), "2026-10-19");
  assert.equal(weekStart("2026-10-19"), "2026-10-19");
});

test("trạng thái món ở cửa hàng", () => {
  const it = { id: "x", variants: ["nam"], rarity: "rare", level: 3 };
  assert.equal(itemStatus(it, { variant: "nu" }), "other");
  assert.equal(itemStatus(it, { variant: "nam", level: 2 }), "level");
  assert.equal(itemStatus(it, { variant: "nam", level: 3, premium: false }), "premium");
  assert.equal(itemStatus(it, { variant: "nam", level: 3, premium: true }), "buy");
  assert.equal(itemStatus(it, { variant: "nam", owned: ["x"] }), "owned");
});

test("phòng theo dịp: Noel 15–31/12, Tết −10…+7 ngày quanh mùng 1", () => {
  assert.equal(seasonOf("2026-12-14"), null);
  assert.equal(seasonOf("2026-12-15"), "noel");
  assert.equal(seasonOf("2026-12-31"), "noel");
  assert.equal(seasonOf("2027-01-01"), null);
  assert.equal(seasonOf("2027-01-26"), null);
  assert.equal(seasonOf("2027-01-27"), "tet");
  assert.equal(seasonOf("2027-02-06"), "tet");
  assert.equal(seasonOf("2027-02-13"), "tet");
  assert.equal(seasonOf("2027-02-14"), null);
  assert.equal(seasonOf("2028-01-16"), "tet");
  assert.equal(seasonOf("2026-10-20"), null);
});

test("bộ sưu tập theo dịp: Noel 1/12–6/1, Tết −21…+15 ngày, Cổ trang luôn mở, admin đổi được", () => {
  assert.deepEqual(collectionStatus("noel", {}, "2026-10-20"), { open: false, label: "Mở bán 1/12 – 6/1" });
  assert.equal(collectionStatus("noel", {}, "2026-12-01").open, true);
  assert.equal(collectionStatus("noel", {}, "2027-01-06").open, true);
  assert.equal(collectionStatus("noel", {}, "2027-01-07").open, false);
  assert.deepEqual(collectionStatus("tet", {}, "2026-10-20"), { open: false, label: "Mở bán 16/1 – 21/2" });
  assert.equal(collectionStatus("tet", {}, "2027-01-16").open, true);
  assert.equal(collectionStatus("tet", {}, "2027-02-22").open, false);
  assert.equal(collectionStatus("co-trang", {}, "2026-10-20").open, true);
  assert.equal(collectionStatus("noel", { collections: { noel: { mode: "open" } } }, "2026-10-20").open, true);
  assert.equal(collectionStatus("co-trang", { collections: { "co-trang": { mode: "closed" } } }, "2026-10-20").open, false);
  assert.equal(collectionStatus("noel", { collections: { noel: { from: "10-15" } } }, "2026-10-20").open, true);
});
