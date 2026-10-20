// Fipilot Pet — ghép nhân vật bằng lớp ảnh (spec §5, chốt 20/10).
// Mọi vị trí lấy từ src/pet/catalog.json (anchor: x, y = tâm món theo phần rộng / cao thân; w = rộng món theo phần rộng thân;
// h có thì kéo dãn theo chiều cao — chỉ áo, để che hết áo gốc). Mặc áo → dùng thân đã bỏ áo gốc (file_ao).
// Bản nữ: nơ là lớp riêng (mặc định đeo, khách tháo được), đội mũ thì ẩn.
// Mũ trùm (cover) cắt thân phía trên hat_cut; đồ cầm tay đặt điểm nắm vào tâm bàn tay rồi vẽ lại bàn tay (lớp "tay") đè lên.
import catalog from "./catalog.json";

export const PET_BASE = "/pet/";
export const ITEMS = Object.fromEntries(catalog.items.map((it) => [it.id, it]));
export { catalog };

const FACES = {
  vui: { nam: ["mat-doi/mat-doi-nam-01.webp", "mieng/mieng-to-01.webp"], nu: ["mat-doi/mat-doi-nu-13.webp", "mieng/mieng-to-01.webp"] },
  cuoi: { nam: ["mat-doi/mat-doi-nam-02.webp", "mieng/mieng-to-11.webp"], nu: ["mat-doi/mat-doi-nu-14.webp", "mieng/mieng-to-11.webp"] },
  ngu: { nam: ["mat-doi/mat-doi-nam-07.webp", "mieng/mieng-05.webp"], nu: ["mat-doi/mat-doi-nu-19.webp", "mieng/mieng-05.webp"] },
  hoi: { nam: ["mat-doi/mat-doi-nam-01.webp", "mieng/mieng-04.webp"], nu: ["mat-doi/mat-doi-nu-13.webp", "mieng/mieng-04.webp"] },
  gian: { nam: ["mat-doi/mat-doi-nam-11.webp", "mieng/mieng-to-12.webp"], nu: ["mat-doi/mat-doi-nu-23.webp", "mieng/mieng-to-12.webp"] },
  mung: { nam: ["mat-doi/mat-doi-nam-09.webp", "mieng/mieng-to-01.webp"], nu: ["mat-doi/mat-doi-nu-21.webp", "mieng/mieng-to-01.webp"] },
};
// tâm trạng → mặt + hiệu ứng tâm trạng (không bán)
const MOOD_FX = { ngu: "ngu", hoi: "hoi", gian: "gian" };

function Layer({ file, a, bw, bh, clipTop }) {
  const w = a.w * bw;
  const style = { position: "absolute", left: a.x * bw - w / 2, width: w, pointerEvents: "none", userSelect: "none" };
  if (clipTop) style.clipPath = `inset(${clipTop * 100}% 0 0 0)`; // mũ trùm đầu: bỏ lá + chỏm đầu dưới mũ
  if (a.h) { const h = a.h * bh; Object.assign(style, { top: a.y * bh - h / 2, height: h }); }
  else Object.assign(style, { top: a.y * bh, transform: "translateY(-50%)", height: "auto" });
  return <img src={PET_BASE + file} alt="" draggable="false" style={style} />;
}

/** size = chiều cao thân (px). equipped = { slot: itemId }. mood: vui | cuoi | ngu | hoi | gian | mung. */
export function PetAvatar({ variant = "nam", equipped = {}, mood = "vui", bow = true, size = 220, still = false, label }) {
  const b = catalog.bodies[variant];
  const bh = size, bw = (size * b.w) / b.h;
  const eq = Object.fromEntries(Object.entries(equipped).map(([s, id]) => [s, ITEMS[id]]).filter(([, it]) => it && it.variants.includes(variant)));
  const face = FACES[mood] || FACES.vui;
  const [eyes, mouth] = face[variant];
  const layers = [];
  for (const L of catalog.layers) {
    if (L === "than") layers.push(<Layer key="than" file={eq.ao ? b.file_ao : b.file} a={{ x: 0.5, y: 0.5, w: 1, h: 1 }} bw={bw} bh={bh} clipTop={eq.dau?.cover ? b.hat_cut : 0} />);
    else if (L === "tay") { if (eq.cam_tay && !eq.cam_tay.file_hold) layers.push(<Layer key="tay" file={b.hand.file} a={b.hand} bw={bw} bh={bh} />); } // tay vẽ đè lên đồ → trông như đang cầm
    else if (L === "mat") layers.push(<Layer key="mat" file={eyes} a={b.eyes} bw={bw} bh={bh} />);
    else if (L === "mieng") layers.push(<Layer key="mieng" file={mouth} a={b.mouth} bw={bw} bh={bh} />);
    else if (L === "bow") { if (b.bow && bow && !eq.dau) layers.push(<Layer key="bow" file={b.bow.file} a={b.bow} bw={bw} bh={bh} />); }
    else if (L === "tam_trang") { const m = catalog.moods[MOOD_FX[mood]]; if (m) layers.push(<Layer key="mood" file={m.file} a={m.anchor[variant]} bw={bw} bh={bh} />); }
    else if (eq[L]) layers.push(<Layer key={L} file={eq[L].file_hold || eq[L].file} a={eq[L].anchor[variant]} bw={bw} bh={bh} />); // đồ cầm tay: ảnh kèm bàn tay đang nắm
  }
  return (
    <span role="img" aria-label={label || "Thú cưng"} data-testid="pet-avatar" style={{ position: "relative", display: "inline-block", width: bw, height: bh, flexShrink: 0 }}>
      <span className={still ? undefined : "pet-breathe"} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>{layers}</span>
    </span>
  );
}

// Thở nhẹ (spec §6); máy bật "giảm chuyển động" thì đứng yên
export const PET_CSS = `
@keyframes petBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,.985)}}
.pet-breathe{animation:petBreathe 3.2s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.pet-breathe{animation:none}}
`;

/** Ảnh 1 món (ô cửa hàng / tủ đồ) */
export function ItemImg({ item, size = 72 }) {
  return <img src={PET_BASE + item.file} alt="" draggable="false" style={{ maxWidth: size, maxHeight: size, objectFit: "contain", display: "block" }} />;
}
