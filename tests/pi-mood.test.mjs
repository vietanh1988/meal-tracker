// 31/10 cá tính Pi (src/pi/piMood.js + src/pi/extraLines.json): đoán nhóm món, chạm liền nhột / dỗi, dỗi vì vắng, đủ câu nam / nữ.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { foodGroup, tapKind, awaySulk, FOOD_GROUPS } from "../src/pi/piMood.js";
import { linesIndex, pickLine } from "../src/pi/piLines.js";

test("nhóm món: đúng món, ưu tiên trà sữa / mì tôm / bánh mì, không bắt nhầm", () => {
  assert.equal(foodGroup(["Trà sữa trân châu đường đen"]), "tra_sua");
  assert.equal(foodGroup(["Mì tôm trứng"]), "mi_tom");
  assert.equal(foodGroup(["Bánh mì thịt"]), "banh_mi");
  assert.equal(foodGroup(["Phở bò tái"]), "pho_bun");
  assert.equal(foodGroup(["Cơm tấm sườn bì chả"]), "com_tam");
  assert.equal(foodGroup(["Ức gà áp chảo"]), "ga");
  assert.equal(foodGroup(["Cá hồi nướng"]), "ca");
  assert.equal(foodGroup(["Rau muống xào tỏi"]), "rau");
  assert.equal(foodGroup(["Cà phê sữa đá"]), null); // "cà" không phải cá, "sữa" không phải trà sữa
  assert.equal(foodGroup(["Gạo lứt"]), null);
  assert.equal(foodGroup([]), null);
});

test("chạm liền: 5 lần trong chuỗi → nhột, 10 → dỗi, nghỉ > 4 s thì đếm lại", () => {
  const ts = (n, gap = 300, t0 = 0) => Array.from({ length: n }, (_, i) => t0 + i * gap);
  assert.equal(tapKind(ts(4)).kind, null);
  assert.equal(tapKind(ts(5)).kind, "nhot");
  assert.equal(tapKind(ts(7)).kind, null);
  assert.equal(tapKind(ts(10)).kind, "doi");
  assert.deepEqual(tapKind([...ts(4), 20_000, 20_300]), { n: 2, kind: null });
});

test("dỗi vì vắng: ≥ 2 ngày + chưa ghi bữa + chưa dỗ đủ 3 lần", () => {
  assert.equal(awaySulk({ daysAway: 2, logged: 0, forgiveTaps: 0 }), true);
  assert.equal(awaySulk({ daysAway: 1, logged: 0 }), false);
  assert.equal(awaySulk({ daysAway: 3, logged: 1 }), false);
  assert.equal(awaySulk({ daysAway: 3, logged: 0, forgiveTaps: 3 }), false);
});

test("đủ câu: mỗi nhóm món có câu, mọi câu có bản nữ, mặt hợp lệ, không chê cơ thể", () => {
  const d = JSON.parse(readFileSync("src/pi/extraLines.json", "utf8"));
  const man = JSON.parse(readFileSync("src/pi/manifest.json", "utf8"));
  const G = linesIndex(d), all = d.nhom.flatMap((g) => g.cau);
  for (const [k] of FOOD_GROUPS) assert.ok(G.mon_an.cau.some((c) => c.muc === k), k);
  for (const ma of ["cu_nhot", "doi_cham", "het_doi"]) assert.ok(G[ma]?.cau.length >= 2, ma);
  for (const c of all) {
    assert.ok(c.nu && c.text, c.id);
    assert.ok(man.faces.includes(c.mat), `${c.id} mặt ${c.mat}`);
    for (const t of [c.text, c.nu]) assert.doesNotMatch(t, /béo|mập|xấu|nhịn ăn|bỏ bữa|ăn ít thôi/i, c.id);
  }
  assert.equal(new Set(all.map((c) => c.id)).size, all.length);
  const l = pickLine(G, "mon_an", { muc: "tra_sua", g: "nu", vars: { ten: "bạn" } });
  assert.ok(G.mon_an.cau.some((c) => c.muc === "tra_sua" && c.nu === l.text));
});
