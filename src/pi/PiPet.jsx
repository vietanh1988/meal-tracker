// 23/10 — Pi bộ mới: chồng lớp ảnh vuông (cùng khung, đặt sẵn đúng chỗ) theo thứ tự manifest.order (dưới → trên):
// lung → thân → giày → áo → cổ → mặt Pi → kính / mặt nạ → kẹp tóc → đội đầu → găng → cầm tay. Mỗi ô 1 món; Pi nam chỉ mặc đồ "nam", Pi nữ đồ "nu".
// Hiệu ứng: thở (scaleY ±1,2%, gốc ở chân) · mặc đồ: món rơi xuống nảy, rồi Pi nhún + cười lớn ~1 giây · chạm: Pi nhún (react đổi số).
// Đồ cầm tay có vẽ cánh tay giơ lên (manifest arm) → dùng thân đã ẩn cánh tay gốc bên đó (không bị 2 tay). Ảnh tải sẵn để không nháy.
import { useEffect, useMemo, useRef, useState } from "react";
import { PI_ITEMS, PI_MANIFEST, LAYER_ORDER, bodyFile, faceFile, preload, FACES } from "./piCatalog";

export const PI_ITEM = Object.fromEntries(PI_ITEMS.map((it) => [it.id, it]));
// khung ảnh: thân Pi nằm trong manifest.bbox (768: x 219–550, y 120–720, chân tại y 720) → phần thừa quanh thân (khung ngoài ôm sát Pi)
const [BX0, BY0, BX1, BY1] = PI_MANIFEST.bbox, CV = PI_MANIFEST.canvas;
export const PI_FRAME = { left: BX0 / CV, right: 1 - BX1 / CV, top: BY0 / CV, bottom: 1 - BY1 / CV };

const shown = (equipped, gender) => {
  const out = {};
  for (const [slot, id] of Object.entries(equipped || {})) {
    const it = PI_ITEM[id];
    if (it && it.slot === slot && it.slot !== "phong" && it.variants.includes(gender)) out[slot] = it;
  }
  return out;
};

/** gender: nam | nu · expression: vui | cuoilon | nhaymat | haohung | ngacnhien | yeu | suynghi | buon | ngu
 *  equipped: { slot: itemId } · height: chiều cao Pi (px, từ đỉnh lá tới chân) · live: thở + chớp mắt · react: đổi số → nhún
 *  talking: miệng mấp máy (đổi mặt vui / cười lớn) · still: đứng yên (ô cửa hàng, quản trị) */
export function PiPet({ gender = "nam", expression = "vui", equipped = {}, height = 220, live = false, still = false, react = 0, talking = false, label, dropIn = true }) {
  const g = gender === "nu" ? "nu" : "nam";
  const eq = useMemo(() => shown(equipped, g), [equipped, g]);
  const S = height / (1 - PI_FRAME.top - PI_FRAME.bottom); // cạnh khung ảnh
  const W = S * (1 - PI_FRAME.left - PI_FRAME.right);
  const [drop, setDrop] = useState(null);   // ô vừa mặc → món rơi xuống
  const [joy, setJoy] = useState(0);        // nhún + cười lớn sau khi mặc
  const [blink, setBlink] = useState(false);
  const [mouth, setMouth] = useState(false);
  const prev = useRef(null);

  // tải sẵn: thân, mặt hiện tại, cười lớn, ngủ (chớp mắt), đồ đang mặc
  useEffect(() => {
    preload([bodyFile(null), faceFile(g, expression), faceFile(g, "cuoilon"), faceFile(g, "ngu"), ...Object.values(eq).map((it) => it.file), ...Object.values(eq).filter((it) => it.arm).map((it) => bodyFile(it.arm))]);
  }, [g, expression, eq]);

  // mặc món mới → rơi xuống + nhún cười
  useEffect(() => {
    const before = prev.current; prev.current = eq;
    if (!before || !dropIn || still) return;
    const added = Object.keys(eq).find((s) => eq[s] && before[s]?.id !== eq[s].id);
    if (!added) return;
    setDrop(added);
    const t1 = setTimeout(() => { setDrop(null); setJoy((n) => n + 1); }, 560);
    return () => clearTimeout(t1);
  }, [eq, dropIn, still]);
  const [happy, setHappy] = useState(false);
  useEffect(() => { if (!joy) return; setHappy(true); const t = setTimeout(() => setHappy(false), 1000); return () => clearTimeout(t); }, [joy]);
  useEffect(() => { if (!react) return; setHappy(true); const t = setTimeout(() => setHappy(false), 900); return () => clearTimeout(t); }, [react]);

  // chớp mắt (mặt "ngủ" 130 ms) khi đang sống, không ngủ
  useEffect(() => {
    if (!live || still || expression === "ngu") return;
    let t1, t2, off = false;
    const loop = () => { t1 = setTimeout(() => { if (off) return; setBlink(true); t2 = setTimeout(() => { setBlink(false); loop(); }, 130); }, 3600 + Math.random() * 2400); };
    loop();
    return () => { off = true; clearTimeout(t1); clearTimeout(t2); };
  }, [live, still, expression]);
  useEffect(() => {
    if (!talking) { setMouth(false); return; }
    const t = setInterval(() => setMouth((m) => !m), 280);
    return () => clearInterval(t);
  }, [talking]);

  const face = happy ? "cuoilon" : blink ? "ngu" : talking ? (mouth ? "cuoilon" : expression) : FACES.includes(expression) ? expression : "vui";
  const arm = eq.tay?.arm || eq.gang?.arm || null;
  const src = { than: bodyFile(arm), mat_pi: faceFile(g, face) };
  const img = (key, file, cls) => <img key={key} src={file} alt="" draggable="false" className={cls} data-layer={key} style={{ position: "absolute", left: 0, top: 0, width: S, height: S, pointerEvents: "none", userSelect: "none" }} />;
  const layers = LAYER_ORDER.map((L) => {
    if (src[L]) return img(L, src[L]);
    const it = eq[L];
    return it ? img(L, it.file, drop === L ? "pi-drop" : undefined) : null;
  });
  return (
    <span role="img" aria-label={label || "Pi"} data-testid="pet-avatar" data-mood={face} data-pi="2" style={{ position: "relative", display: "inline-block", width: W, height, flexShrink: 0 }}>
      <span key={`${react}-${joy}`} className={(react || joy) && !still ? "pi-hop" : undefined} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
        <span className={still || !live ? undefined : "pi-breathe"} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
          <span style={{ position: "absolute", left: -S * PI_FRAME.left, top: -S * PI_FRAME.top, width: S, height: S }}>{layers}</span>
        </span>
      </span>
    </span>
  );
}

export const PI_CSS = `
@keyframes piBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1,1.012)}}
.pi-breathe{animation:piBreathe 3.2s ease-in-out infinite}
@keyframes piHop{0%{transform:translateY(0) scale(1,1)}18%{transform:translateY(0) scale(1.05,.94)}48%{transform:translateY(-9%) scale(.97,1.04)}78%{transform:translateY(0) scale(1.04,.95)}100%{transform:translateY(0) scale(1,1)}}
.pi-hop{animation:piHop .65s ease-in-out}
@keyframes piDrop{0%{transform:translateY(-32%);opacity:0}45%{transform:translateY(0);opacity:1}62%{transform:translateY(-5%)}80%{transform:translateY(0)}90%{transform:translateY(-1.5%)}100%{transform:translateY(0)}}
.pi-drop{animation:piDrop .56s cubic-bezier(.3,.7,.4,1) both}
@media (prefers-reduced-motion: reduce){.pi-breathe,.pi-hop,.pi-drop{animation:none}}
`;
