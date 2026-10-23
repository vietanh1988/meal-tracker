// Fipilot Pet — Pi (23/10: thay hẳn bằng bộ mới Muse AI, chủ dự án chốt "thay hẳn Pi cũ").
// Vẽ bằng src/pi/PiPet.jsx (chồng lớp ảnh vuông theo thứ tự cố định). File này giữ tên xuất cũ (PetAvatar, ITEMS, catalog, ItemImg…)
// để các màn Thú cưng / Cửa hàng / Tủ đồ / Quản trị dùng tiếp. Đồ cũ (bản vẽ 20/10) không còn mặc / bán; chỉ giữ ảnh đồ thành tích để trưng.
import oldCatalog from "./catalog.json";
import { PiPet, PI_CSS } from "../pi/PiPet";
export { pi } from "../pi/piExpr";
import { pickFace } from "../pi/piExpr";
import { nowVNParts } from "../lib/dateVN"; // pi.react("yeu", 1500) — nơi khác (chat, gym, mục tiêu) gọi để Pi phản ứng
import { PI_ITEMS, SLOT_NAME, EV_ORDER, EV_NAME } from "../pi/piCatalog";

export const PET_BASE = "/pet/";
// sự kiện (bộ ảnh) → bộ sưu tập (lịch bán, src/lib/petMath.js COL_DEFAULT + SQL pet_col_open)
export const EV_COL = { giangsinh: "noel", tet: "tet", halloween: "halloween", trungthu: "trung-thu", muadong: "mua-dong", muahe: "mua-he" };
// đồ thành tích cũ (nhận theo chuỗi / cân / nước / đạt cân) — chỉ trưng ở danh sách thành tích, không mặc
const TROPHY_IDS = ["hieu-ung-02", "hieu-ung-04", "hieu-ung-05", "hieu-ung-06", "hieu-ung-17", "doi-dau-11"];
const trophies = oldCatalog.items.filter((it) => TROPHY_IDS.includes(it.id)).map((it) => ({
  id: it.id, name: it.name, slot: "thanh_tich", rarity: it.rarity, price: 0, level: 1, variants: ["nam", "nu"], achievement: true, hidden: false,
  legacy: true, icon: PET_BASE + it.file, file: PET_BASE + it.file,
}));
const items = [...PI_ITEMS.map((it) => ({ ...it, collection: EV_COL[it.ev] || null, collection_name: EV_NAME[it.ev] })), ...trophies];
export const ITEMS = Object.fromEntries(items.map((it) => [it.id, it]));
export const catalog = { items, slots: SLOT_NAME, events: EV_NAME, evOrder: EV_ORDER };

// tâm trạng (src/lib/petMath.js moodOf) → biểu cảm của bộ mới. "vui" = biểu cảm khách chọn ở Tủ đồ (mặc định vui)
const MOOD_FACE = { vui: null, cuoi: "cuoilon", ngu: "ngu", hoi: "suynghi", gian: "buon", mung: "haohung" };
// 24/10: face = "auto" (mặc định) → mặt theo giờ VN (src/pi/piExpr.js timeFace); chọn mặt cụ thể ở Tủ đồ thì giữ mặt đó
export const faceOf = (mood, pick, hour = nowVNParts().hour) => MOOD_FACE[mood] || pickFace(pick, hour);

/** size = chiều cao Pi (px). equipped = { slot: itemId }. mood: vui | cuoi | ngu | hoi | gian | mung; face = biểu cảm khách chọn.
 *  live: thở + chớp mắt · talking: miệng mấp máy · react: đổi số → nhún + cười */
export function PetAvatar({ variant = "nam", equipped = {}, mood = "vui", face, size = 220, still = false, label, talking = false, live = false, react = 0, night = false, hour }) {
  return <PiPet gender={variant} expression={faceOf(mood, face, hour)} equipped={equipped} height={size} still={still} live={live} talking={talking} react={react} night={night} label={label || "Thú cưng"} />;
}

// giữ cho màn Quản trị cũ (Chỉnh vị trí): bộ mới không cần điểm đặt
export function shownAnchor() { return null; }

export const PET_CSS = `
.pet-noscroll::-webkit-scrollbar{display:none}
@keyframes petHeart{0%{transform:translateY(0) scale(.3);opacity:0}25%{transform:translateY(-20px) scale(1.1);opacity:1}100%{transform:translateY(-90px) scale(.8);opacity:0}}
.pet-heart{animation:petHeart 1.1s ease-out both}
@keyframes petDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.pet-dot{display:inline-block;width:7px;height:7px;border-radius:4px;background:#64748B;margin:0 2px;animation:petDot 1s infinite}
.pet-dot:nth-child(2){animation-delay:.15s}.pet-dot:nth-child(3){animation-delay:.3s}
@media (prefers-reduced-motion: reduce){.pet-dot,.pet-heart{animation:none}}
${PI_CSS}`;

/** Ảnh 1 món (ô cửa hàng / tủ đồ): icon cắt sẵn vùng có hình */
export function ItemImg({ item, size = 72 }) {
  if (!item) return null;
  return <img src={item.icon || item.file} alt="" draggable="false" loading="lazy" decoding="async" style={{ maxWidth: size, maxHeight: size, width: item.slot === "phong" ? size : undefined, objectFit: item.slot === "phong" ? "cover" : "contain", borderRadius: item.slot === "phong" ? 10 : 0, display: "block" }} />;
}
