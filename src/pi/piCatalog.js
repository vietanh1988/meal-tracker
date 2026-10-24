// 23/10 — Pi bộ mới (Muse AI): danh mục món dựng từ src/pi/manifest.json (sinh bởi scripts/pi/build.py).
// Mọi ảnh cùng khung vuông 768 (chân Pi tại 384,720), đã đặt đúng chỗ trên thân và đã làm sạch → chồng đủ khung theo thứ tự lớp.
// Tên / giá / độ hiếm / cấp / ẩn: Quản trị sửa ở bảng pet_items (usePet → applyItemRows đè lên đây).
import man from "./manifest.json";
import fit from "./fit.json"; // scripts/pi/fit_check.py: món ghép lệch / dán kèm mảng thân → chờ vẽ lại, không bán

export const PI_BASE = "/pi/";
// 24/10 (chủ dự án xem trên điện thoại vẫn thấy mũ / giày lệch): ảnh mới trùng tên ảnh cũ → app cài trên điện thoại giữ ảnh cũ.
// Gắn mã phiên bản bộ ảnh (manifest.ver, scripts/pi/build.py tính từ nội dung ảnh) vào mọi đường dẫn → đổi bộ ảnh là tải ảnh mới.
export const PI_VER = man.ver ? `?v=${man.ver}` : "";
export const PI_MANIFEST = man;
export const EV_ORDER = ["tet", "trungthu", "halloween", "giangsinh", "muadong", "muahe"].filter((e) => man.events[e]);
export const EV_NAME = man.events;
// thứ tự chồng (dưới → trên); "than" = thân Pi, "mat_pi" = mặt (biểu cảm)
export const LAYER_ORDER = man.order;
export const SLOT_NAME = { ...man.slots, phong: "Phòng" };
export const SLOT_ORDER = ["ao", "dau", "giay", "co", "mat", "toc", "tay", "gang", "lung", "phong"];
export const FACES = man.faces; // vui, cuoilon, nhaymat, haohung, ngacnhien, yeu, suynghi, buon, ngu
export const FACE_NAME = { vui: "Vui", cuoilon: "Cười lớn", nhaymat: "Nháy mắt", haohung: "Hào hứng", ngacnhien: "Ngạc nhiên", yeu: "Yêu", suynghi: "Suy nghĩ", buon: "Buồn", ngu: "Ngủ" };

// giá mặc định theo ô (Hạt) — Quản trị đổi được từng món
export const PRICE = { giay: 80, toc: 100, gang: 100, co: 100, mat: 120, tay: 150, dau: 150, lung: 200, ao: 250, phong: 400 };

const item = (x, i) => ({
  id: x.id, name: x.name, slot: x.slot, ev: x.ev, collection: x.ev, variants: [x.g],
  rarity: "common", price: PRICE[x.slot] ?? 100, level: 1, achievement: false, hidden: false, sort: i,
  file: `${PI_BASE}${x.file}${PI_VER}`, icon: `${PI_BASE}icon/${x.id}.webp${PI_VER}`, arm: x.arm || null, src: x.file, c: x.c || [384, 384], ...(x.tf0 ? { tf: x.tf0, tf0: x.tf0 } : {}), // 24/10: mũ tự canh vừa đầu (Quản trị chỉnh tay thì đè)
  ...(fit.bad[x.id] ? { broken: true, redraw: true, redraw_note: fit.bad[x.id].join("; ") } : {}),
});
// 23/10: mỗi món Phòng có đủ 3 ảnh theo giờ (times: sang / trua / toi → đúng file rooms/phong_<chude>_<giờ>.webp).
// Ảnh đại diện (cửa hàng, quản trị) = bản trưa. Thiếu bản nào thì times[giờ] = null (test báo).
export const ROOM_TIMES = ["sang", "trua", "toi"];
export const TIME_NAME = { sang: "Sáng", trua: "Trưa", toi: "Tối" };
const room = (ev, i) => {
  const times = Object.fromEntries(ROOM_TIMES.map((t) => [t, (man.rooms[ev] || []).includes(t) ? `${PI_BASE}rooms/phong_${ev}_${t}.webp${PI_VER}` : null]));
  const pic = times.trua || times.sang || times.toi;
  return {
    id: `phong-${ev}`, name: `Phòng ${EV_NAME[ev]}`, slot: "phong", ev, collection: ev, variants: ["nam", "nu"],
    rarity: "common", price: PRICE.phong, level: 1, achievement: false, hidden: false, sort: 1000 + i,
    file: pic, icon: pic, times,
  };
};
export const PI_ITEMS = [...man.items.map(item), ...EV_ORDER.filter((e) => man.rooms[e]?.length).map(room)];

export const bodyFile = (arm) => `${PI_BASE}body/pi_than${arm ? `_khong_tay_${arm}` : ""}.webp${PI_VER}`;
export const headFile = `${PI_BASE}body/pi_dau.webp${PI_VER}`; // lớp đầu gốc vẽ đè lên áo (giữ cằm), scripts/pi/build.py
// 24/10 pi_full: lá là lớp riêng (đè lên mũ, đung đưa); khi nói dùng mắt không miệng (eyes/) + 7 miệng (mouths/)
export const leafFile = `${PI_BASE}body/pi_la.webp${PI_VER}`;
export const VISEMES = man.visemes || [];
export const eyesFile = (g, f) => `${PI_BASE}eyes/${g === "nu" ? "nu" : "nam"}/${FACES.includes(f) ? f : "vui"}.webp${PI_VER}`;
export const mouthFile = (g, v) => `${PI_BASE}mouths/${g === "nu" ? "nu" : "nam"}/${VISEMES.includes(v) ? v : "ngam"}.webp${PI_VER}`;
export const faceFile = (g, f) => `${PI_BASE}faces/${g === "nu" ? "nu" : "nam"}/${FACES.includes(f) ? f : "vui"}.webp${PI_VER}`;

/** giờ (0–23, giờ máy người dùng) → buổi của ảnh phòng: sáng 5–11, trưa 11–17, tối 17–5 */
export const piRoomTime = (h) => (h >= 5 && h < 11 ? "sang" : h >= 11 && h < 17 ? "trua" : "toi");
export const roomFile = (ev, t) => `${PI_BASE}rooms/phong_${ev}_${(man.rooms[ev] || []).includes(t) ? t : (man.rooms[ev] || ["sang"])[0]}.webp${PI_VER}`;
// tâm thảm trên ảnh phòng (phần rộng / cao ảnh) — đo trên 6 ảnh phòng 23/10; Pi đứng giữa thảm
export const RUG = { tet: [0.5, 0.83], trungthu: [0.55, 0.785], halloween: [0.5, 0.79], giangsinh: [0.55, 0.84], muadong: [0.55, 0.79], muahe: [0.5, 0.8] };

// tải sẵn ảnh (không nháy khi đổi đồ / đổi mặt)
const seen = new Set();
export function preload(urls) {
  if (typeof Image === "undefined") return;
  for (const u of urls) { if (!u || seen.has(u)) continue; seen.add(u); const im = new Image(); im.decoding = "async"; im.src = u; }
}
