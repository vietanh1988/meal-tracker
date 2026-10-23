// 21/10 (chủ dự án: ảnh to làm nặng web) — luật cỡ ảnh web một chỗ (src/pc/web/webLib.js IMG_RULE) và máy chủ viết bài dùng đúng số đó;
// ảnh tĩnh của web (web/public) không được quá 300 KB.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
const lib = readFileSync("src/pc/web/webLib.js", "utf8");
const writer = readFileSync("supabase/functions/web-writer/writer.js", "utf8");
test("23/10 IMG_RULE: ảnh trong bài rộng ≤ 800, WebP ≤ 90 KB; bản nhỏ 400 ≤ 40 KB", () => {
  assert.match(lib, /IMG_RULE = \{ maxW: 800, maxH: 1600, maxKB: 90, small: \{ 400: 40 \}/);
});
test("23/10 viết bài AI nén ảnh theo cùng luật, lưu WebP (lỗi bộ mã thì JPEG)", () => {
  assert.match(writer, /img\.width > 800/);
  assert.match(writer, /fitW\(img, 90\)/);
  assert.match(writer, /const rules = \[\[400, 40\]\]/);
  assert.match(readFileSync("supabase/functions/web-writer/index.ts", "utf8"), /@jsquash\/webp/);
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
