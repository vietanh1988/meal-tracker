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
