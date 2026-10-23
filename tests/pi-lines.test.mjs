// 24/10 — câu thoại Pi theo tình huống (src/pi/piLines.js, bộ câu src/pi/chatLines.json)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { linesIndex, pickLine as pick, fillVars, remember, greetGroup, EVENT_GROUP, insultLevel, insultMuc, isSadSelf, REPEAT_DAYS } from "../src/pi/piLines.js";
const DAY = 86_400_000;
const GROUPS = linesIndex(JSON.parse(readFileSync("src/pi/chatLines.json", "utf8")));
const pickLine = (ma, o) => pick(GROUPS, ma, o);

test("bộ câu đủ nhóm, mỗi câu có mặt hợp lệ", () => {
  for (const g of ["chao_sang", "chao_trua", "chao_toi", "lau_khong_gap", "ghi_bua_an", "uong_nuoc", "truoc_tap", "sau_tap", "can_giam", "can_tang_dung", "nhiem_vu", "len_cap", "mua_do", "streak", "ngay_nghi", "idle", "bi_chui", "buon_ban_than"]) assert.ok(GROUPS[g]?.cau.length, g);
  const faces = ["vui", "cuoilon", "nhaymat", "haohung", "ngacnhien", "yeu", "suynghi", "buon", "ngu"];
  for (const g of Object.values(GROUPS)) for (const c of g.cau) assert.ok(faces.includes(c.mat), c.id);
  for (const k of Object.values(EVENT_GROUP)) assert.ok(GROUPS[k], k);
});

test("thay biến; thiếu biến thì bỏ câu; không lặp câu trong 7 ngày", () => {
  assert.equal(fillVars("Chào {ten}!", { ten: "An" }), "Chào An!");
  assert.equal(fillVars("Còn {ml} ml", {}), null);
  const now = 100 * DAY; let h = {};
  const seen = new Set();
  const n = GROUPS.idle.cau.filter((c) => !/\{(?!ten\})/.test(c.text)).length;
  for (let i = 0; i < n; i++) { const l = pickLine("idle", { vars: { ten: "An" }, history: h, now, rnd: () => 0.5 }); assert.ok(l && !seen.has(l.id), `lặp ${l?.id}`); seen.add(l.id); h = remember(h, l.id, now); assert.ok(!l.text.includes("{")); }
  const later = pickLine("idle", { vars: { ten: "An" }, history: h, now: now + (REPEAT_DAYS + 1) * DAY, rnd: () => 0 });
  assert.ok(later); // qua 7 ngày dùng lại được
  assert.deepEqual(Object.keys(remember(h, null, now + 8 * DAY)), []); // dọn lịch sử cũ
});

test("chào theo giờ mở app", () => {
  assert.equal(greetGroup(6), "chao_sang"); assert.equal(greetGroup(12), "chao_trua"); assert.equal(greetGroup(20), "chao_toi"); assert.equal(greetGroup(16), null);
});

test("bị chửi: phân mức, không bắt nhầm 'đi ngủ'; mức theo số lần trong phiên", () => {
  assert.equal(insultLevel("Pi ngu quá"), 1);
  assert.equal(insultLevel("đồ ngốc"), 1);
  assert.equal(insultLevel("vcl"), 2);
  assert.equal(insultLevel("mẹ mày"), 2);
  assert.equal(insultLevel("may ngu qua"), 1);
  assert.equal(insultLevel("Tối nay mình đi ngủ sớm"), 0);
  assert.equal(insultLevel("toi nay di ngu som"), 0);
  assert.equal(insultLevel("Hôm nay ăn gì?"), 0);
  assert.equal(insultMuc(1), 1); assert.equal(insultMuc(3), 2); assert.equal(insultMuc(2, 2), 3); assert.equal(insultMuc(5), 3);
  for (const m of [1, 2, 3]) { const l = pickLine("bi_chui", { vars: { ten: "An" }, muc: m, now: 1 }); assert.ok(l && GROUPS.bi_chui.cau.find((c) => c.id === l.id).muc === m); }
});

test("chán nản / tự hại / ép cân → nhận ra; câu bình thường không", () => {
  for (const t of ["Mình muốn chết", "toi beo qua, ghet ban than", "Em định nhịn ăn 3 ngày", "chán sống quá", "Mình vô dụng"]) assert.ok(isSadSelf(t), t);
  for (const t of ["Hôm nay ăn gì?", "Tập ngực xong mệt", "Pi giỏi quá"]) assert.ok(!isSadSelf(t), t);
  assert.ok(pickLine("buon_ban_than", { vars: { ten: "An" }, now: 1 }));
});
