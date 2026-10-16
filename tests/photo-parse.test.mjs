// node --test tests/ — đọc kết quả AI nhận diện ảnh
import test from "node:test";
import assert from "node:assert/strict";
import { parsePhotoDishes } from "../src/lib/photoParse.js";

test("parsePhotoDishes: lấy mảng JSON trong câu trả lời, làm tròn, bỏ món vô lý", () => {
  const txt = 'Đây là kết quả:\n[{"name":"cơm trắng","gram":180.4,"cal":234.6,"p":4.33,"c":51,"f":0.5,"fiber":0.7},{"name":"","gram":100,"cal":10},{"name":"thịt kho","gram":-5,"cal":200},{"name":"nước","gram":9000,"cal":0}]';
  const out = parsePhotoDishes(txt);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { food: "cơm trắng", display: "Cơm trắng", gram: 180, unit: "g", cal: 235, p: 4.3, c: 51, f: 0.5, fiber: 0.7, source: "photo" });
});

test("parsePhotoDishes: không có JSON → lỗi dễ hiểu", () => {
  assert.throws(() => parsePhotoDishes("xin lỗi tôi không thấy"), /định dạng/);
});

test("parsePhotoDishes: đọc số lượng + đơn vị (16/10)", async () => {
  const { parsePhotoDishes } = await import("../src/lib/photoParse.js");
  const r = parsePhotoDishes('[{"name":"cơm trắng","qty":1.5,"unit":"bát","gram":250,"cal":325,"p":6,"c":71,"f":1,"fiber":1},{"name":"sữa đậu nành","qty":250,"unit":"ml","gram":250,"cal":90,"p":7,"c":8,"f":4,"fiber":0},{"name":"thịt kho","qty":150,"unit":"g","gram":150,"cal":248,"p":22,"c":3,"f":16,"fiber":0}]');
  assert.equal(r[0].unit, "bát"); assert.equal(r[0].unit_g, 166.7);
  assert.equal(r[1].unit, "ml"); assert.equal(r[1].unit_g, undefined);
  assert.equal(r[2].unit, "g");
});
