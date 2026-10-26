// 26/10 (chủ dự án duyệt cách A): ảnh Pi /pi/* được trình duyệt giữ 1 năm (vercel.json) → MỌI link ảnh / giọng Pi phải kèm mã phiên bản ?v=
// (manifest.ver đổi mỗi lần dựng bộ ảnh) để app lên bản mới là tải ảnh mới, không kẹt ảnh cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

test("vercel.json: /pi/ giữ lâu (immutable)", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8"));
  const h = v.headers.find((x) => x.source === "/pi/(.*)");
  assert.ok(h, "thiếu header cho /pi/");
  assert.match(h.headers.find((x) => x.key === "Cache-Control").value, /immutable/);
});

test("mọi link ảnh / giọng Pi trong src có ?v= (PI_VER / man.ver)", () => {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(f)) files.push(p); } };
  walk("src");
  const bad = [];
  for (const f of files) {
    readFileSync(f, "utf8").split("\n").forEach((l, i) => {
      if (/\$\{(PI_BASE|VOICE_BASE)\}/.test(l) && !/PI_VER|man\.ver/.test(l)) bad.push(`${f}:${i + 1}`);
      if (/["'`]\/pi\/[a-z]/.test(l) && !/PI_BASE\s*=|VOICE_BASE\s*=/.test(l)) bad.push(`${f}:${i + 1} (link /pi/ viết cứng)`);
    });
  }
  assert.deepEqual(bad, []);
  assert.match(readFileSync("src/pi/piCatalog.js", "utf8"), /PI_VER = man\.ver \? `\?v=\$\{man\.ver\}`/);
});
