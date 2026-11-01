// 01/11 (lỗi chủ dự án chụp: nút đáy sheet "Lưu tuỳ chọn & lên thực đơn" bị thanh điều hướng dưới che):
// <main> của 4 tab không được có z-index — z-index tạo lớp riêng, mọi sheet / hộp thoại mở bên trong tab bị kẹt dưới thanh điều hướng (z 90).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("main của tab không đặt z-index (sheet trong tab phải nổi trên thanh điều hướng dưới)", () => {
  const line = readFileSync("src/mobile/MobileApp.jsx", "utf8").split("\n").find((l) => l.includes('data-testid="tab-main"'));
  assert.ok(line, "không thấy <main data-testid=tab-main>");
  assert.ok(!/zIndex/.test(line), "main tab có zIndex → sheet bên trong bị thanh điều hướng che");
});
test("sheet chung của Thực đơn đưa ra ngoài main (createPortal) và là hộp thoại", () => {
  const s = readFileSync("src/mobile/menuUI.jsx", "utf8");
  const sheet = s.slice(s.indexOf("export function Sheet("), s.indexOf("export const CloseX"));
  assert.match(sheet, /createPortal\(/);
  assert.match(sheet, /role="dialog"/);
});
