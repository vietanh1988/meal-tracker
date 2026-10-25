import { test } from "node:test";
import assert from "node:assert/strict";
import { levelOf, moodOf, eventsFor, pickEvent, weekStart, itemStatus, seasonOf, collectionStatus, isoWeek } from "../src/lib/petMath.js";

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
  assert.equal(seasonOf("2026-10-19"), null);
  assert.equal(seasonOf("2026-10-20"), "halloween");
  assert.equal(seasonOf("2026-10-31"), "halloween");
  assert.equal(seasonOf("2026-11-01"), null);
});

test("bộ Trung thu: 21 ngày trước – 3 ngày sau rằm tháng 8", () => {
  assert.deepEqual(collectionStatus("trung-thu", {}, "2026-10-20"), { open: false, label: "Mở bán 25/8 – 18/9" });
  assert.equal(collectionStatus("trung-thu", {}, "2027-08-25").open, true);
  assert.equal(collectionStatus("trung-thu", {}, "2027-09-18").open, true);
  assert.equal(collectionStatus("trung-thu", {}, "2027-09-19").open, false);
  assert.equal(seasonOf("2027-09-10"), "trung-thu");
});

test("bộ Bóng đá: mặc định đóng, admin mở", () => {
  assert.deepEqual(collectionStatus("bong-da", {}, "2026-10-20"), { open: false, label: "Tạm đóng" });
  assert.equal(collectionStatus("bong-da", { collections: { "bong-da": { mode: "open" } } }, "2026-10-20").open, true);
  assert.equal(collectionStatus("bong-da", { collections: { "bong-da": { mode: "season", from: "11-15", to: "01-10" } } }, "2026-12-20").open, true);
});

test("bộ Halloween: bán 15/10–2/11", () => {
  assert.equal(collectionStatus("halloween", {}, "2026-10-14").open, false);
  assert.deepEqual(collectionStatus("halloween", {}, "2026-10-20"), { open: true, label: "Bán tới 2/11" });
  assert.equal(collectionStatus("halloween", {}, "2026-11-02").open, true);
  assert.deepEqual(collectionStatus("halloween", {}, "2026-11-03"), { open: false, label: "Mở bán 15/10 – 2/11" });
  assert.equal(collectionStatus("halloween", { collections: { halloween: { mode: "closed" } } }, "2026-10-20").open, false);
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

test("tuần ISO khớp máy chủ (IYYY-WIW)", () => {
  assert.equal(isoWeek("2026-10-20"), "2026-W43");
  assert.equal(isoWeek("2026-10-19"), "2026-W43");
  assert.equal(isoWeek("2026-10-18"), "2026-W42");
  assert.equal(isoWeek("2027-01-01"), "2026-W53");
  assert.equal(isoWeek("2024-12-30"), "2025-W01");
});

// 25/10: phòng Pi miễn phí theo khung cảnh (dịp → phòng dịp; ngoài dịp → mùa)
test("sceneOf: phòng theo dịp / mùa", async () => {
  const { sceneOf } = await import("../src/lib/petMath.js");
  assert.equal(sceneOf("2026-10-25"), "halloween");
  assert.equal(sceneOf("2026-12-20"), "giangsinh");
  assert.equal(sceneOf("2027-02-06"), "tet");
  assert.equal(sceneOf("2027-09-14"), "trungthu");
  assert.equal(sceneOf("2026-11-10"), "muadong");
  assert.equal(sceneOf("2027-01-05"), "muadong");
  assert.equal(sceneOf("2027-06-01"), "muahe");
  assert.equal(sceneOf("2027-04-01"), "muahe");
  assert.equal(sceneOf(""), "muahe");
  assert.equal(sceneOf(120), "muahe"); // không phải ngày → không vỡ (lỗi CI 25/10: pet.today là số Hạt)
});
