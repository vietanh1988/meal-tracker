import { test } from "node:test";
import assert from "node:assert/strict";
import { qrMatrix, qrSvgPath } from "../src/lib/qr.js";

// Mã QR mời mở app trên điện thoại (bản vẽ 120). Đã kiểm giải mã bằng OpenCV khi viết; ở đây kiểm cấu trúc chuẩn.
test("QR app.fipilotai.com: phiên bản 2 (25×25), có 3 ô định vị + vạch thời gian", () => {
  const m = qrMatrix("https://app.fipilotai.com");
  assert.equal(m.length, 25);
  assert.ok(m.every((r) => r.length === 25));
  const finder = (x0, y0) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.max(Math.abs(x - 3), Math.abs(y - 3)); assert.equal(m[y0 + y][x0 + x], d !== 2, `ô định vị ${x0},${y0}`); } };
  finder(0, 0); finder(18, 0); finder(0, 18);
  for (let i = 8; i < 17; i++) { assert.equal(m[6][i], i % 2 === 0); assert.equal(m[i][6], i % 2 === 0); }
  assert.equal(m[25 - 8][8], true); // ô đen cố định
});

test("QR: chuỗi dài chọn phiên bản lớn hơn, quá dài thì báo lỗi; SVG có đường vẽ", () => {
  assert.equal(qrMatrix("x".repeat(150)).length, 49); // v8
  assert.throws(() => qrMatrix("x".repeat(400)));
  assert.match(qrSvgPath(qrMatrix("hi")), /^M\d+ \d+h1v1h-1z/);
});
