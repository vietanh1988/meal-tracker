// 20/10 (chủ dự án: "tránh lỗi item, fit nhân vật như sáng tới giờ") — soát tự động kho đồ Pi trước khi lên prod:
// ảnh có thật, bản nào bán thì có điểm đặt cho bản đó, điểm đặt nằm đúng vùng (đầu / mắt / cổ / tay), áo có ảnh thân,
// phòng theo dịp đủ 3 giờ, mỗi món có dòng SQL pet_items (không thì khách không mua được).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const cat = JSON.parse(readFileSync("src/pet/catalog.json", "utf8"));
const P = "public/pet/";
const items = cat.items;

test("mọi ảnh món + ảnh thân áo có thật", () => {
  const miss = [];
  for (const it of items) {
    if (!existsSync(P + it.file)) miss.push(it.file);
    if (it.file_hold && !existsSync(P + it.file_hold)) miss.push(it.file_hold);
    for (const b of Object.values(it.body || {})) for (const f of [b.file, b.file_nl]) if (f && !existsSync(P + f)) miss.push(f);
  }
  assert.deepEqual(miss, []);
});

test("bản nào bán thì có điểm đặt (áo: có ảnh thân) cho bản đó", () => {
  const bad = items.filter((it) => it.variants.some((v) => (it.slot === "ao" ? !it.body?.[v] && !it.anchor?.[v] : !it.anchor?.[v]))).map((it) => it.id);
  assert.deepEqual(bad, []);
});

// vùng hợp lệ (tỉ lệ khung thân): đo trên 159 món đã soát bằng ảnh ngày 20/10
const ZONE = {
  dau: { x: [0.3, 0.75], y: [-0.05, 0.42] },
  kinh: { x: [0.4, 0.62], y: [0.3, 0.46] },
  tai_nghe: { x: [0.35, 0.65], y: [0.1, 0.45] },
  deo: { x: [0.4, 0.8], y: [0.5, 0.88] },
  cam_tay: { x: [0.45, 1.15], y: [0.55, 1.0] }, // tâm ảnh (cờ, đèn cán dài lệch khỏi bàn tay)
  sau_lung: { x: [0.3, 0.7], y: [0.45, 0.8] },
  duoi_chan: { x: [0.3, 0.7], y: [0.8, 1.1] },
};
test("điểm đặt nằm đúng vùng trên thân (đầu / mắt / cổ / tay)", () => {
  const bad = [];
  for (const it of items) {
    const z = ZONE[it.slot]; if (!z) continue;
    for (const [v, a] of Object.entries(it.anchor || {})) {
      if (it.slot === "dau" && /Trâm|Kẹp/.test(it.name)) continue; // trâm / kẹp cài lệch bên
      if (a.x < z.x[0] || a.x > z.x[1] || a.y < z.y[0] || a.y > z.y[1]) bad.push(`${it.id}/${v} x${a.x} y${a.y}`);
      if (!(a.w > 0.05 && a.w < 1.6)) bad.push(`${it.id}/${v} w${a.w}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("đồ cầm tay có bàn tay theo từng áo (body.hand) để không lệch khỏi tay", () => {
  const aos = items.filter((it) => it.slot === "ao" && it.body);
  // áo găng / tay áo che kín bàn tay xanh → máy không dò được, dùng tay thân gốc (đã xem ảnh 20/10: vẫn khớp)
  const NO_HAND = ["ao-roi-05", "noel-ao-04", "halloween-ao-04", "bong-da-ao-02"];
  const bad = aos.filter((it) => !NO_HAND.includes(it.id) && Object.values(it.body).some((b) => !b.hand)).map((it) => it.id);
  assert.deepEqual(bad, []);
});

test("phòng theo dịp: bản nào bật thì đủ ảnh sáng / chiều / tối", () => {
  const src = readFileSync("src/pet/PetRoom.jsx", "utf8");
  const art = new Function(`return ${src.match(/export const SEASON_ART = (\{[^\n]*\});/)[1]}`)();
  const miss = [];
  for (const [s, vs] of Object.entries(art)) for (const v of Object.keys(vs)) for (const t of ["sang", "chieu", "toi"]) {
    const f = `${P}khong-gian/phong-${t}-${v}-${s}.webp`; if (!existsSync(f)) miss.push(f);
  }
  assert.deepEqual(miss, []);
});

test("mỗi món bán có dòng trong pet_items (migration)", () => {
  const sql = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).map((f) => readFileSync(`supabase/migrations/${f}`, "utf8")).join("\n");
  const miss = items.filter((it) => !sql.includes(`'${it.id}'`)).map((it) => it.id);
  assert.deepEqual(miss, []);
});
