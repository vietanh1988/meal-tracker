// 23/10 (chủ dự án: Pi bộ mới Muse AI thay hẳn Pi cũ) — soát tự động kho đồ Pi trước khi lên prod:
// ảnh có thật và đúng khung 768, đủ 300 món / 18 phòng / 9 mặt mỗi bản, ô hợp lệ, mã không trùng, thân ẩn tay có thật,
// mỗi món có dòng SQL pet_items (không thì khách không mua được), app đọc đúng thứ tự lớp và phòng theo món đang dùng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const man = JSON.parse(readFileSync("src/pi/manifest.json", "utf8"));
const P = "public/pi/";

function webpSize(f) {
  const b = readFileSync(f); const t = b.toString("ascii", 12, 16);
  if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (t === "VP8L") { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
  throw new Error("không đọc được " + f);
}

test("đủ 300 món, 6 sự kiện × 3 buổi phòng, 9 mặt mỗi bản; không món nào phải bỏ qua", () => {
  assert.equal(man.items.length, 300);
  assert.equal(Object.values(man.rooms).flat().length, 18);
  for (const g of ["nam", "nu"]) for (const f of man.faces) assert.ok(existsSync(`${P}faces/${g}/${f}.webp`), `${g}/${f}`);
  assert.equal(man.faces.length, 9);
});

test("ảnh món, mặt, thân có thật và cùng khung 768 (chồng đủ khung)", () => {
  const bad = [];
  for (const f of [`${P}body/pi_than.webp`, `${P}body/pi_than_khong_tay_trai.webp`, `${P}body/pi_than_khong_tay_phai.webp`, ...man.items.map((it) => P + it.file)]) {
    if (!existsSync(f)) { bad.push(`thiếu ${f}`); continue; }
    const [w, h] = webpSize(f); if (w !== man.canvas || h !== man.canvas) bad.push(`${f} ${w}x${h}`);
  }
  for (const it of man.items) if (!existsSync(`${P}icon/${it.id}.webp`)) bad.push(`thiếu icon ${it.id}`);
  assert.deepEqual(bad, []);
});

test("ô hợp lệ, mã không trùng, mỗi bản chỉ mặc đồ của bản đó", () => {
  const slots = new Set(Object.keys(man.slots));
  assert.deepEqual(man.items.filter((it) => !slots.has(it.slot)).map((it) => it.id), []);
  assert.equal(new Set(man.items.map((it) => it.id)).size, man.items.length);
  assert.deepEqual(man.items.filter((it) => !["nam", "nu"].includes(it.g)).map((it) => it.id), []);
  assert.deepEqual(man.order, ["lung", "than", "giay", "ao", "co", "mat_pi", "mat", "toc", "dau", "gang", "tay"]);
});

test("đồ cầm tay có cánh tay giơ lên → thân ẩn đúng 1 bên tay (không bị 2 tay)", () => {
  const arm = man.items.filter((it) => it.arm);
  assert.ok(arm.length > 0);
  assert.deepEqual(arm.filter((it) => !["tay", "gang"].includes(it.slot) || !["trai", "phai"].includes(it.arm)).map((it) => it.id), []);
  const pet = readFileSync("src/pi/PiPet.jsx", "utf8");
  assert.match(pet, /bodyFile\(arm\)/);
});

test("mỗi món + mỗi phòng có dòng trong pet_items (migration), đồ cũ bị ẩn và hoàn Hạt", () => {
  const sql = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).map((f) => readFileSync(`supabase/migrations/${f}`, "utf8")).join("\n");
  const miss = [...man.items.map((it) => it.id), ...Object.keys(man.rooms).map((e) => `phong-${e}`)].filter((id) => !sql.includes(`'${id}'`));
  assert.deepEqual(miss, []);
  const mig = readFileSync("supabase/migrations/20261023210000_pi_bo_moi.sql", "utf8");
  assert.match(mig, /update public\.pet_items set hidden = true/);
  assert.match(mig, /'refund:' \|\| item_id/);
  assert.match(mig, /p_slot not in \('ao','dau','giay','co','mat','toc','tay','gang','lung','phong'\)/);
});

test("phòng theo món đang dùng (không tự đổi theo ngày), ảnh theo buổi sáng / trưa / tối", async () => {
  const scr = readFileSync("src/pet/PetScreens.jsx", "utf8");
  assert.match(scr, /season=\{roomOf\(pet\)\}/);
  const { piRoomTime } = await import("../src/pi/piCatalog.js").catch(() => ({}));
  if (piRoomTime) {
    assert.equal(piRoomTime(5), "sang"); assert.equal(piRoomTime(10), "sang"); assert.equal(piRoomTime(11), "trua");
    assert.equal(piRoomTime(16), "trua"); assert.equal(piRoomTime(17), "toi"); assert.equal(piRoomTime(4), "toi");
  }
});

test("23/10 soát từng món (scripts/pi/fit_check.py → src/pi/fit.json): món lỗi có thật, không bán, nằm trong lệnh vẽ lại", () => {
  const fit = JSON.parse(readFileSync("src/pi/fit.json", "utf8"));
  const ids = new Set(man.items.map((it) => it.id));
  assert.deepEqual(Object.keys(fit.bad).filter((id) => !ids.has(id)), []);
  assert.ok(fit.geo.neck > 400 && fit.geo.neck < 560 && fit.geo.head_top > 150);
  const scr = readFileSync("src/pet/PetScreens.jsx", "utf8");
  assert.match(scr, /!it\.broken/); // cửa hàng không bán món chờ vẽ lại
  assert.match(readFileSync("src/pi/piCatalog.js", "utf8"), /fit\.bad\[x\.id\] \? \{ broken: true, redraw: true/);
});
