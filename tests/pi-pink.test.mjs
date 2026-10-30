// 30/10 Pi hồng (scripts/pi/pink.py → public/pi/hong/, src/pi/pink.json): đủ ảnh, không món nữ nào còn lộ da xanh trên thân,
// chồng lớp đúng bộ (Pi nữ hồng → mọi lớp da lấy /hong/, Pi nữ chọn Xanh / Pi nam → không lớp nào lấy /hong/).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { piLayers, isPink } from "../src/pi/piLayers.js";

const man = JSON.parse(readFileSync("src/pi/manifest.json", "utf8"));
const pink = JSON.parse(readFileSync("src/pi/pink.json", "utf8"));
const PI = "public/pi/";

test("mọi món nữ đã qua pink.py (thêm đồ mới → chạy lại python3 scripts/pi/pink.py)", () => {
  const nu = man.items.filter((x) => x.g === "nu").map((x) => x.id);
  const miss = nu.filter((id) => !pink.checked.includes(id));
  assert.deepEqual(miss, []);
  assert.ok(pink.ver && pink.items.length > 0);
});

test("đủ ảnh hồng: thân, đầu, lá, mặt / mắt / miệng nữ, món có bản hồng + icon", () => {
  const need = [];
  for (const f of readdirSync(PI + "body")) if (f.endsWith(".webp")) need.push(`hong/body/${f}`);
  for (const d of ["faces", "eyes", "mouths"]) for (const f of readdirSync(`${PI}${d}/nu`)) if (f.endsWith(".webp")) need.push(`hong/${d}/nu/${f}`);
  const byId = Object.fromEntries(man.items.map((x) => [x.id, x]));
  for (const id of pink.items) { need.push(`hong/${byId[id].file}`); need.push(`hong/icon/${id}.webp`); }
  assert.deepEqual(need.filter((p) => !existsSync(PI + p)), []);
});

test("không món nữ nào còn lộ da xanh trên thân Pi hồng", () => {
  const bad = Object.entries(pink.left).filter(([id, n]) => n > pink.left_max && !(pink.skip || {})[id]);
  assert.deepEqual(bad, []);
});

test("piLayers: Pi nữ hồng lấy bộ hồng, chọn Xanh / Pi nam thì không", () => {
  const tay = man.items.find((x) => x.g === "nu" && x.arm && pink.items.includes(x.id));
  const ao = man.items.find((x) => x.g === "nu" && x.slot === "ao");
  const eq = { tay: tay.id, ao: ao.id };
  const L = piLayers({ man, gender: "nu", equipped: eq, color: null, pink });
  for (const k of ["than", "dau_pi", "mat_pi", "la"]) assert.ok(L.find((l) => l.key === k).src.startsWith("hong/"), k);
  assert.ok(L.find((l) => l.key === "tay").src.startsWith("hong/"));
  assert.equal(L.find((l) => l.key === "ao").src.startsWith("hong/"), pink.items.includes(ao.id));
  assert.ok(piLayers({ man, gender: "nu", equipped: eq, color: "xanh", pink }).every((l) => !l.src.startsWith("hong/")));
  const nam = man.items.find((x) => x.g === "nam" && x.slot === "ao");
  assert.ok(piLayers({ man, gender: "nam", equipped: { ao: nam.id }, color: "hong", pink }).every((l) => !l.src.startsWith("hong/")));
  assert.equal(isPink("nu", null), true); assert.equal(isPink("nu", "xanh"), false); assert.equal(isPink("nam", "hong"), false);
});
