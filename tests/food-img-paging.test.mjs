// 19/11 (chủ dự án: "vẫn còn 1 số món không có ảnh"): Supabase trả tối đa 1.000 dòng / lần; web_calo_pages đã > 1.300 dòng.
// Mọi chỗ đọc danh sách bảng này phải đọc theo trang (.range / readAll / qAll), không thì sót món.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "node_modules" || e.name === ".next" ? [] : walk(`${d}/${e.name}`)) : [`${d}/${e.name}`]));
test("đọc danh sách web_calo_pages phải theo trang", () => {
  const bad = [];
  for (const f of [...walk("src"), ...walk("web/lib"), ...walk("web/app")].filter((x) => /\.(js|jsx|mjs)$/.test(x))) {
    fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (/from\("web_calo_pages"\)\.select\(/.test(line) && !/readAll\(|\.range\(|\.eq\(|\.in\(|\.limit\(1\)|maybeSingle|single\(/.test(line)) bad.push(`${f}:${i + 1}`);
      if (/q\("web_calo_pages\?select=/.test(line) && !/slug=eq|food_key=eq|limit=1/.test(line)) bad.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(bad, []);
});
