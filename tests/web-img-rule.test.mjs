// 21/10 (chủ dự án: ảnh to làm nặng web) — luật cỡ ảnh web một chỗ (src/pc/web/webLib.js IMG_RULE) và máy chủ viết bài dùng đúng số đó;
// ảnh tĩnh của web (web/public) không được quá 300 KB.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
const lib = readFileSync("src/pc/web/webLib.js", "utf8");
const writer = readFileSync("supabase/functions/web-writer/writer.js", "utf8");
test("IMG_RULE: ảnh thường rộng ≤ 1200, ≤ 150 KB; bản nhỏ 400/800 ≤ 40/90 KB", () => {
  assert.match(lib, /IMG_RULE = \{ maxW: 1200, maxH: 1600, maxKB: 150, small: \{ 400: 40, 800: 90 \}/);
});
test("viết bài AI nén ảnh theo cùng luật", () => {
  assert.match(writer, /img\.width > 1200/);
  assert.match(writer, /fit\(img, 150\)/);
  assert.match(writer, /\[\[400, 40\], \[800, 90\]\]/);
});
test("tải ảnh lên luôn qua toWebp có trần KB (không lưu ảnh gốc to)", () => {
  const api = readFileSync("src/pc/web/webApi.js", "utf8");
  assert.match(api, /toWebp\(file, R\.maxW, 0\.82, \{ maxH: R\.maxH, maxKB: R\.maxKB \}\)/);
});
test("ảnh tĩnh web/public ≤ 300 KB", () => {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = `${d}/${n}`; return statSync(p).isDirectory() ? walk(p) : /\.(jpe?g|png|webp|avif|gif)$/i.test(n) ? [p] : []; });
  const big = walk("web/public").filter((p) => statSync(p).size > 300 * 1024).map((p) => `${p} ${Math.round(statSync(p).size / 1024)} KB`);
  assert.deepEqual(big, []);
});
