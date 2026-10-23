// 23/10 — biểu cảm tự động của Pi (src/pi/piExpr.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import { equipReaction, tapReaction, idleBase, shownFace, canBlink, fullSet, lateNight, pi, TAP_FACES } from "../src/pi/piExpr.js";

const it = (id, slot, ev) => ({ id, slot, ev });

test("mặc món mới: haohung 0,4 s → cuoilon 1 s + nhún; Halloween: ngacnhien thay cuoilon", () => {
  assert.deepEqual(equipReaction({}, { ao: it("a", "ao", "tet") }), { steps: [{ face: "haohung", ms: 400 }, { face: "cuoilon", ms: 1000 }], hop: true });
  assert.deepEqual(equipReaction({}, { dau: it("h", "dau", "halloween") }).steps[1], { face: "ngacnhien", ms: 1000 });
});

test("mặc đủ bộ cùng sự kiện (áo + đội đầu + giày): yeu 1,5 s", () => {
  const before = { ao: it("a", "ao", "tet"), dau: it("d", "dau", "tet") };
  const after = { ...before, giay: it("g", "giay", "tet") };
  assert.ok(fullSet(after) && !fullSet(before));
  assert.deepEqual(equipReaction(before, after).steps.at(-1), { face: "yeu", ms: 1500 });
  assert.ok(!fullSet({ ...before, giay: it("g", "giay", "muahe") }));
});

test("tháo đồ: ngacnhien 0,6 s, không nhún; không đổi gì: không phản ứng", () => {
  assert.deepEqual(equipReaction({ ao: it("a", "ao", "tet") }, {}), { steps: [{ face: "ngacnhien", ms: 600 }], hop: false });
  assert.equal(equipReaction({ ao: it("a", "ao", "tet") }, { ao: it("a", "ao", "tet") }), null);
});

test("chạm: ngẫu nhiên cuoilon | nhaymat | haohung 1 s; đang ngủ thì tỉnh (ngacnhien 0,5 s)", () => {
  for (const r of [0, 0.4, 0.99]) { const x = tapReaction("vui", r); assert.ok(TAP_FACES.includes(x.steps[0].face)); assert.equal(x.steps[0].ms, 1000); }
  assert.deepEqual(tapReaction("ngu").steps, [{ face: "ngacnhien", ms: 500 }]);
});

test("idle: 30 s suynghi, 2 phút ngu; sau 22h idle là ngủ luôn", () => {
  assert.equal(idleBase("vui", 10_000), "vui");
  assert.equal(idleBase("vui", 31_000), "suynghi");
  assert.equal(idleBase("vui", 121_000), "ngu");
  assert.equal(idleBase("vui", 31_000, { night: true }), "ngu");
  assert.ok(lateNight(22) && lateNight(3) && !lateNight(21) && !lateNight(5));
});

test("mặt hiển thị = phản ứng còn hạn, hết hạn về base; chớp mắt chỉ khi vui / haohung", () => {
  assert.equal(shownFace({ base: "vui", reaction: { face: "yeu", until: 100 }, now: 50 }), "yeu");
  assert.equal(shownFace({ base: "vui", reaction: { face: "yeu", until: 100 }, now: 150 }), "vui");
  assert.ok(canBlink("vui") && canBlink("haohung") && !canBlink("buon") && !canBlink("ngu"));
});

test("pi.react(mặt, ms) gửi tới mọi Pi đang hiện; mặt lạ bị bỏ", () => {
  const got = []; const off = pi.subscribe((r) => got.push(r));
  assert.equal(pi.react("yeu", 1500), true);
  assert.equal(pi.react("khong-co", 500), false);
  off();
  pi.react("buon", 800);
  assert.deepEqual(got, [{ steps: [{ face: "yeu", ms: 1500 }], hop: true }]);
});
