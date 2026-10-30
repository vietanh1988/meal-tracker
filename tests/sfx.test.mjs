// 31/10 tiếng + rung (src/lib/sfx.js): đủ file public/sfx, mọi chỗ gọi sfx("…") dùng đúng tên có file, mặc định bật / tắt được.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { SFX, sfxOn, setSfx, sfx } from "../src/lib/sfx.js";

test("đủ file tiếng, nhẹ (< 20 KB)", () => {
  for (const n of SFX) { const p = `public/sfx/${n}.mp3`; assert.ok(existsSync(p), p); assert.ok(statSync(p).size < 20_000, p); }
});

test("mọi chỗ gọi sfx(\"…\") trong src dùng tên có trong SFX", () => {
  const bad = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|jsx)$/.test(f)) for (const m of readFileSync(p, "utf8").matchAll(/\bsfx\("([a-z]+)"/g)) if (!SFX.includes(m[1])) bad.push(`${p}: ${m[1]}`); } };
  walk("src");
  assert.deepEqual(bad, []);
});

test("mặc định bật, tắt được; không có trình duyệt thì không lỗi", () => {
  assert.equal(sfxOn(), true);
  setSfx(false); assert.equal(sfxOn(), false);
  setSfx(true); assert.equal(sfxOn(), true);
  assert.doesNotThrow(() => sfx("ting"));
});
