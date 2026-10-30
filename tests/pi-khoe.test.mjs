// 30/10 Khoe Pi: số trên ảnh khoe (tuần này), khung được chọn, % chặng đường cân (có trần tốc độ), lớp ảnh Pi (dùng chung app + web)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weekStats, khoeFrames, journeyPct } from "../src/pi/khoe.js";
import { piLayers, tfCss } from "../src/pi/piLayers.js";

const man = JSON.parse(readFileSync(new URL("../src/pi/manifest.json", import.meta.url)));

test("weekStats: chỉ đếm từ thứ Hai tuần này, không đếm ngày sau hôm nay", () => {
  // 30/10/2026 là thứ Sáu → tuần từ 26/10
  const keys = ["meal:2026-10-25:sang", "meal:2026-10-26:sang", "meal:2026-10-26:trua", "meal:2026-10-30:toi", "water:2026-10-26", "water:2026-10-29", "weigh:2026-W44", "active:2026-10-30", "meal:2026-10-31:sang"];
  assert.deepEqual(weekStats(keys, "2026-10-30"), { meals: 3, water: 2, days: 5 });
  assert.deepEqual(weekStats(null, "2026-10-26"), { meals: 0, water: 0, days: 1 });
});

test("khoeFrames: phòng luôn có; thành tích khi chuỗi ≥ 7 hoặc có đồ thành tích; dịp khi mặc ≥ 2 món cùng dịp", () => {
  const ids = (ev, g) => man.items.filter((x) => x.ev === ev && x.g === g);
  const [ao] = ids("halloween", "nu").filter((x) => x.slot === "ao");
  const [dau] = ids("halloween", "nu").filter((x) => x.slot === "dau");
  assert.deepEqual(khoeFrames({ streak: 3, man }).map((f) => f.id), ["phong"]);
  assert.deepEqual(khoeFrames({ streak: 7, man }).map((f) => f.id), ["phong", "thanh-tich"]);
  assert.deepEqual(khoeFrames({ streak: 0, trophies: ["hieu-ung-05"], man }).map((f) => f.id), ["phong", "thanh-tich"]);
  const one = khoeFrames({ equipped: { ao: ao.id }, man });
  assert.equal(one.length, 1);
  const two = khoeFrames({ equipped: { ao: ao.id, dau: dau.id }, man });
  assert.equal(two[1].id, "dip"); assert.equal(two[1].ev, "halloween"); assert.equal(two[1].label, man.events.halloween);
});

test("journeyPct: % tới mục tiêu, giảm / tăng, trần 1% cân / tuần, không có mục tiêu → null", () => {
  const w = (d, kg) => ({ logged_date: d, kg });
  // giảm 80 → 76, mục tiêu 70, 4 tuần: trần 4 tuần × 0,8 = 3,2 kg → 32%
  assert.equal(journeyPct({ weights: [w("2026-10-01", 80), w("2026-10-29", 76)], goalType: "cut", goalKg: 70, today: "2026-10-30" }), 32);
  // giảm chậm 80 → 79 trong 4 tuần → 10%
  assert.equal(journeyPct({ weights: [w("2026-10-01", 80), w("2026-10-29", 79)], goalType: "cut", goalKg: 70, today: "2026-10-30" }), 10);
  // tăng cân 55 → 56, mục tiêu 60 → 20%
  assert.equal(journeyPct({ weights: [w("2026-10-01", 55), w("2026-10-29", 56)], goalType: "bulk", goalKg: 60, today: "2026-10-30" }), 20);
  // đi ngược hướng → 0
  assert.equal(journeyPct({ weights: [w("2026-10-01", 80), w("2026-10-29", 81)], goalType: "cut", goalKg: 70, today: "2026-10-30" }), 0);
  assert.equal(journeyPct({ weights: [w("2026-10-01", 80), w("2026-10-29", 76)], goalType: "maintain", goalKg: 70, today: "2026-10-30" }), null);
  assert.equal(journeyPct({ weights: [w("2026-10-29", 76)], goalType: "cut", goalKg: 70, today: "2026-10-30" }), null);
  // cân cũ hơn 120 ngày không tính
  assert.equal(journeyPct({ weights: [w("2026-05-01", 90), w("2026-10-29", 76)], goalType: "cut", goalKg: 70, today: "2026-10-30" }), null);
});

test("piLayers: cùng luật PiPet — đầu gốc khi mặc áo, mũ trùm bỏ lá, thân cụt tay khi cầm đồ cần, đồ sai bản bị bỏ", () => {
  const plain = piLayers({ man, gender: "nam", face: "vui" }).map((L) => L.key);
  assert.ok(plain.includes("than") && plain.includes("mat_pi") && plain.includes("la") && !plain.includes("dau_pi") && !plain.includes("mieng"));
  const ao = man.items.find((x) => x.g === "nu" && x.slot === "ao");
  const cover = man.items.find((x) => x.g === "nu" && x.slot === "dau" && x.cover);
  const L = piLayers({ man, gender: "nu", equipped: { ao: ao.id, dau: cover.id }, face: "yeu" });
  const keys = L.map((x) => x.key);
  assert.ok(keys.includes("dau_pi") && keys.includes("ao") && keys.includes("dau") && !keys.includes("la"));
  assert.equal(L.find((x) => x.key === "mat_pi").src, "faces/nu/yeu.webp");
  assert.ok(keys.indexOf("ao") < keys.indexOf("dau_pi") && keys.indexOf("dau_pi") < keys.indexOf("mat_pi"));
  // đồ bản nữ cho Pi nam → bỏ
  assert.ok(!piLayers({ man, gender: "nam", equipped: { ao: ao.id } }).some((x) => x.key === "ao"));
  const hand = man.items.find((x) => x.slot === "tay" && x.arm);
  assert.equal(piLayers({ man, gender: hand.g, equipped: { tay: hand.id } }).find((x) => x.key === "than").src, `body/pi_than_khong_tay_${hand.arm}.webp`);
  // mặt lạ → vui; tf → CSS transform
  assert.equal(piLayers({ man, gender: "nam", face: "xyz" }).find((x) => x.key === "mat_pi").src, "faces/nam/vui.webp");
  assert.match(tfCss({ x: 10, y: -5, s: 1.1 }, [384, 384], 384).transform, /^translate\(5\.00px, -2\.50px\) rotate\(0deg\) scale\(1\.1, 1\.1\)$/);
  assert.equal(tfCss(null), null);
});
