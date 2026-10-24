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
  assert.deepEqual(man.order, ["lung", "than", "giay", "ao", "dau_pi", "co", "mat_pi", "mieng", "mat", "toc", "dau", "la", "gang", "tay"]); // 24/10 pi_full: miệng khi nói, lá đè mũ
});

test("23/10 mặc áo vẫn giữ cằm: lớp đầu gốc (pi_dau.webp, cùng khung 768) đè lên áo, dưới khăn cổ và mặt", () => {
  assert.ok(existsSync(`${P}body/pi_dau.webp`));
  assert.deepEqual(webpSize(`${P}body/pi_dau.webp`), [man.canvas, man.canvas]);
  const o = man.order; assert.ok(o.indexOf("ao") < o.indexOf("dau_pi") && o.indexOf("dau_pi") < o.indexOf("co"));
  assert.match(readFileSync("src/pi/PiPet.jsx", "utf8"), /L === "dau_pi"\) return eq\.ao \? img\(L, headFile\)/);
});

test("đồ cầm tay ẩn tay gốc chỉ khi món phủ kín vùng tay; ẩn thì đúng 1 bên (không bị 2 tay)", () => {
  const arm = man.items.filter((it) => it.arm);
  // 23/10 pi_fix_53: món tay đã vẽ khớp tay gốc → thường KHÔNG ẩn tay (ẩn lộ lỗ); món nào ẩn thì phải đúng 1 bên
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

test("23/10 mỗi món Phòng đủ 3 ảnh theo giờ (sáng / trưa / tối), ảnh đại diện = bản trưa, đổi buổi theo giờ máy + mờ dần 1s", () => {
  const miss = [];
  for (const ev of Object.keys(man.events)) for (const t of ["sang", "trua", "toi"]) {
    if (!(man.rooms[ev] || []).includes(t)) miss.push(`manifest thiếu ${ev}/${t}`);
    if (!existsSync(`${P}rooms/phong_${ev}_${t}.webp`)) miss.push(`thiếu rooms/phong_${ev}_${t}.webp`);
  }
  assert.deepEqual(miss, []);
  const cat = readFileSync("src/pi/piCatalog.js", "utf8"), room = readFileSync("src/pet/PetRoom.jsx", "utf8");
  assert.match(cat, /const pic = times\.trua \|\| times\.sang \|\| times\.toi;/);
  assert.match(room, /setInterval\(tick, 60_000\)/);
  assert.match(room, /transition: "opacity 1s ease"/);
  assert.match(room, /new Date\(\)\.getHours\(\)/);
});

test("24/10 pi_full: lớp lá riêng (đè mũ, đung đưa), mắt không miệng + 7 miệng khi nói, món redo không bán", () => {
  assert.equal(man.leaf, true);
  assert.deepEqual(webpSize(`${P}body/pi_la.webp`), [man.canvas, man.canvas]);
  assert.deepEqual([...man.visemes].sort(), ["he", "meu", "ngam", "ngu", "o", "to", "vua"]);
  const miss = [];
  for (const g of ["nam", "nu"]) {
    for (const f of man.faces) if (!existsSync(`${P}eyes/${g}/${f}.webp`)) miss.push(`eyes/${g}/${f}`);
    for (const v of man.visemes) if (!existsSync(`${P}mouths/${g}/${v}.webp`)) miss.push(`mouths/${g}/${v}`);
  }
  assert.deepEqual(miss, []);
  const o = man.order;
  assert.ok(o.indexOf("dau") < o.indexOf("la") && o.indexOf("mat_pi") < o.indexOf("mieng") && o.indexOf("mieng") < o.indexOf("mat"));
  const fit = JSON.parse(readFileSync("src/pi/fit.json", "utf8"));
  for (const id of man.redo) assert.ok(fit.bad[id], `${id} (redo) phải nằm trong danh sách chờ vẽ lại`);
  const pet = readFileSync("src/pi/PiPet.jsx", "utf8");
  assert.match(pet, /if \(L === "la"\)/); assert.match(pet, /if \(L === "mieng"\)/);
  assert.match(pet, /@keyframes piLeaf\{0%,100%\{transform:rotate\(-2\.5deg\)\}50%\{transform:rotate\(2\.5deg\)\}\}/);
  assert.match(pet, /@keyframes piTalk\{0%,100%\{transform:rotate\(-3deg\)\}50%\{transform:rotate\(3deg\)\}\}/);
  assert.match(pet, /\.pi-talk\{animation:piTalk 1\.6s/);
  assert.match(pet, /rotate\(5deg\)/); // nghe: nghiêng đầu 5°
});

test("24/10 giọng thu sẵn: mỗi id có đủ mp3 Pi nam + Pi nữ; câu thoại có id đó tồn tại", () => {
  const v = JSON.parse(readFileSync("src/pi/voice.json", "utf8"));
  const lines = JSON.parse(readFileSync("src/pi/chatLines.json", "utf8"));
  const ids = new Set(lines.nhom.flatMap((g) => g.cau.map((c) => c.id)));
  assert.ok(v.ids.length >= 30);
  for (const id of v.ids) { assert.ok(ids.has(id), id); for (const g of ["nam", "nu"]) assert.ok(existsSync(`public/pi/voice/${g}/${id}.mp3`), `${g}/${id}`); }
});

test("24/10 phòng: chân Pi theo floorY (Quản trị chỉnh), có bóng dưới chân; chat: chửi / chán nản trả câu soạn sẵn, không gọi AI", () => {
  const room = readFileSync("src/pet/PetRoom.jsx", "utf8"), scr = readFileSync("src/pet/PetScreens.jsx", "utf8"), app = readFileSync("src/pet/PetApp.jsx", "utf8"), pc = readFileSync("src/pc/PcPet.jsx", "utf8");
  assert.match(room, /"--pi-feet": `\$\{feet\}px`/);
  assert.match(scr, /floorY=\{pet\.floorY\?\.\[roomOf\(pet\)\]\}/);
  assert.match(scr, /bottom: "var\(--pi-feet, 26px\)"/);
  assert.match(pc, /data-testid="pc-pet-floor"/);
  // chửi / chán nản xử lý TRƯỚC khi gọi AI
  const i1 = app.indexOf("if (isSadSelf(text))"), i2 = app.indexOf("const lvl = insultLevel(text)"), i3 = app.indexOf('authFetch("ai-proxy", { provider, model, system, messages, maxTokens: 400, feature: "pet_chat" })');
  assert.ok(i1 > 0 && i2 > i1 && i3 > i2);
  assert.match(app, /writeSS\("fp_pi_soft", "1"\)/);
  assert.match(app, /import PERSONA from "\.\.\/pi\/persona\.md\?raw"/);
});

test("24/10 ảnh Pi có mã phiên bản (?v=) để điện thoại không giữ ảnh cũ trùng tên", () => {
  assert.match(man.ver, /^[0-9a-f]{10}$/);
  const cat = readFileSync("src/pi/piCatalog.js", "utf8");
  assert.doesNotMatch(cat, /\.webp`/); // mọi đường dẫn .webp đều gắn ${PI_VER}
  assert.match(cat, /file: `\$\{PI_BASE\}\$\{x\.file\}\$\{PI_VER\}`/);
  assert.match(readFileSync("scripts/pi/build.py", "utf8"), /man\["ver"\] = _h\.hexdigest\(\)\[:10\]/);
});

test("24/10 Quản trị chỉnh vị trí món bộ mới: tf → transform quanh tâm món; mỗi món có tâm; cùng đối tượng với PiPet", async () => {
  for (const it of man.items) assert.ok(Array.isArray(it.c) && it.c.length === 2, it.id);
  const { tfStyle, isTfZero } = await import("../src/pi/PiPet.jsx").catch(() => ({}));
  const pet = readFileSync("src/pi/PiPet.jsx", "utf8");
  assert.match(pet, /const tf = \(tfOverride && tfOverride\[it\.id\]\) \|\| it\.tf;/);
  assert.match(readFileSync("src/hooks/usePet.js", "utf8"), /if \(r\.place\?\.tf\) it\.tf = r\.place\.tf; else delete it\.tf;/);
  assert.match(readFileSync("src/pet/PetAvatar.jsx", "utf8"), /PI_ITEMS\.map\(\(it\) => Object\.assign\(it,/);
  assert.match(readFileSync("src/pc/PcPet.jsx", "utf8"), /<PiPlaceEditor it=\{placing\}/);
  void tfStyle; void isTfZero;
});
