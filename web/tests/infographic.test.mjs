import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNum, tableSpec, infoSpecs, addInfographics, fmtV } from "../lib/infographic.js";

test("23/10 infographic: đọc số trong ô bảng", () => {
  assert.deepEqual(parseNum("340"), { lo: 340, hi: 340 });
  assert.deepEqual(parseNum("38,8"), { lo: 38.8, hi: 38.8 });
  assert.deepEqual(parseNum("khoảng 153"), { lo: 153, hi: 153 });
  assert.deepEqual(parseNum("~30"), { lo: 30, hi: 30 });
  assert.deepEqual(parseNum("1.200"), { lo: 1200, hi: 1200 });
  assert.deepEqual(parseNum("120 đến 180"), { lo: 120, hi: 180 });
  assert.deepEqual(parseNum("450-500"), { lo: 450, hi: 500 });
  assert.equal(parseNum("n/a"), null);
  assert.equal(parseNum("376 theo app + 150"), null);
  assert.equal(fmtV({ lo: 1200, hi: 1350 }), "1.200–1.350");
});

const dishes = { type: "table", head: ["Món", "Khẩu phần", "kcal", "Đạm (g)", "Tinh bột (g)", "Béo (g)"], rows: [["Phở bò", "tô vừa (400 g)", "340", "26", "38,8", "8,4"], ["Bún chả", "suất vừa (400 g)", "440", "30", "39,2", "17,6"], ['<a href="/calo/com-tam">Cơm tấm</a>', "đĩa", "600", "25", "70", "22"]] };

test("23/10 bảng món có kcal + macro → biểu đồ cột xếp theo kcal, số giữ nguyên", () => {
  const sp = tableSpec(dishes, "Calo món sáng");
  assert.equal(sp.kind, "bars"); assert.equal(sp.macro, true);
  assert.deepEqual(sp.rows.map((r) => [r.name, r.kcal.lo]), [["Phở bò", 340], ["Bún chả", 440], ["Cơm tấm", 600]]);
  assert.equal(sp.rows[0].sub, "tô vừa (400 g)");
});

test("23/10 bảng theo bữa → thực đơn có tổng; 2 cột kcal → so sánh", () => {
  const m = tableSpec({ head: ["Bữa", "Năng lượng gợi ý (kcal)", "Gợi ý thành phần"], rows: [["Sáng", "300", "Đạm + ít tinh bột"], ["Trưa", "400", "Cơm"], ["Tối", "350", "Cá"], ["Phụ", "150", "Sữa chua"]] });
  assert.equal(m.kind, "menu"); assert.deepEqual(m.total, { lo: 1200, hi: 1200 });
  const p = tableSpec({ head: ["Bữa", "Ngày ăn như thường", "Kcal", "Ngày có thâm hụt", "Kcal"], rows: [["Sáng", "Bánh mì", "526", "Phở", "340"], ["Trưa", "Cơm tấm", "753", "Cơm", "520"], ["Tối", "Lẩu", "800", "Canh", "500"]] });
  assert.equal(p.kind, "pair"); assert.deepEqual(p.legend, ["Ngày ăn như thường", "Ngày có thâm hụt"]); assert.equal(p.total.a.lo, 2079);
});

test("23/10 tùy bài: bảng không có kcal / ít dòng / bài không bảng → không có hình; tối đa 2 hình", () => {
  assert.equal(tableSpec({ head: ["Nhóm", "Ghi chú"], rows: [["a", "b"], ["c", "d"], ["e", "f"]] }), null);
  assert.equal(tableSpec({ head: ["Món", "kcal"], rows: [["a", "1"], ["b", "2"]] }), null);
  assert.equal(infoSpecs([{ type: "p", html: "x" }], { slug: "a" }).length, 0);
  const blocks = [{ type: "h", level: 2, text: "Bảng 1" }, dishes, { type: "p", html: "x" }, dishes, dishes];
  const out = addInfographics(blocks, { slug: "bai", seo: {} });
  const info = out.filter((b) => b.type === "info");
  assert.equal(info.length, 2);
  assert.equal(out[2].type, "info"); assert.equal(out[2].src, "/i/bai/1.png");
  assert.ok(/Phở bò/.test(out[2].alt));
  assert.equal(addInfographics(blocks, { slug: "bai", seo: { no_info: true } }).length, blocks.length);
});

test("23/10 dòng Tổng trong bảng bị bỏ (máy tự cộng)", () => {
  const p = tableSpec({ head: ["Bữa", "Ngày ăn như thường", "Kcal", "Ngày có thâm hụt", "Kcal"], rows: [["Sáng", "a", "526", "b", "340"], ["Trưa", "a", "753", "b", "520"], ["Xế", "a", "400", "b", "170"], ["Tối", "a", "540", "b", "330"], ["<b>Tổng</b>", "", "<b>2.219</b>", "", "<b>1.360</b>"]] });
  assert.equal(p.rows.length, 4); assert.equal(p.total.a.lo, 2219); assert.equal(p.total.b.lo, 1360);
});
