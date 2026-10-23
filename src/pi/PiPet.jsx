// 23/10 — Pi bộ mới: chồng lớp ảnh vuông (cùng khung, đặt sẵn đúng chỗ) theo thứ tự manifest.order (dưới → trên):
// lung → thân → giày → áo → cổ → mặt Pi → kính / mặt nạ → kẹp tóc → đội đầu → găng → cầm tay. Mỗi ô 1 món; Pi nam chỉ mặc đồ "nam", Pi nữ đồ "nu".
// Hiệu ứng: thở (scaleY ±1,2%, gốc ở chân) · mặc đồ: món rơi xuống nảy rồi Pi phản ứng (biểu cảm tự động, src/pi/piExpr.js) · chạm: Pi nhún.
// Đồ cầm tay có vẽ cánh tay giơ lên (manifest arm) → dùng thân đã ẩn cánh tay gốc bên đó (không bị 2 tay). Ảnh tải sẵn để không nháy.
import { useEffect, useMemo, useRef, useState } from "react";
import { PI_ITEMS, PI_MANIFEST, LAYER_ORDER, bodyFile, faceFile, preload, FACES } from "./piCatalog";
import { equipReaction, tapReaction, idleBase, shownFace, canBlink, pi } from "./piExpr";
export { pi };

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

/** gender: nam | nu · expression: biểu cảm nền (base: khách chọn ở Tủ đồ / tâm trạng app) — vui | cuoilon | nhaymat | haohung | ngacnhien | yeu | suynghi | buon | ngu
 *  equipped: { slot: itemId } · height: chiều cao Pi (px, từ đỉnh lá tới chân) · live: thở, chớp mắt, phản ứng, idle · react: đổi số = vừa chạm vào Pi
 *  talking: miệng mấp máy (đổi mặt base / cười lớn) · still: đứng yên (ô cửa hàng, quản trị) · night: sau 22h (idle là ngủ luôn)
 *  23/10 biểu cảm tự động (src/pi/piExpr.js): mặc món mới haohung 0,4 s → cuoilon 1 s (Halloween: ngacnhien) + nhún · đủ bộ: yeu 1,5 s
 *  · tháo: ngacnhien 0,6 s · chạm: cuoilon | nhaymat | haohung 1 s (đang ngủ: ngacnhien 0,5 s) · idle 30 s suynghi, 2 phút ngu
 *  · chớp mắt 3–5 s (ngu 120 ms, chỉ khi đang vui / haohung) · pi.react(mặt, ms) từ nơi khác · đổi mặt mờ dần 80 ms, 9 mặt tải sẵn */
export function PiPet({ gender = "nam", expression = "vui", equipped = {}, height = 220, live = false, still = false, react = 0, talking = false, night = false, label, dropIn = true }) {
  const g = gender === "nu" ? "nu" : "nam";
  const eq = useMemo(() => shown(equipped, g), [equipped, g]);
  const S = height / (1 - PI_FRAME.top - PI_FRAME.bottom); // cạnh khung ảnh
  const W = S * (1 - PI_FRAME.left - PI_FRAME.right);
  const [drop, setDrop] = useState(null);   // ô vừa mặc → món rơi xuống
  const [hop, setHop] = useState(0);        // nhún
  const [reaction, setReaction] = useState(null); // { face, until }
  const [blink, setBlink] = useState(false);
  const [mouth, setMouth] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prev = useRef(null);
  const timers = useRef([]);
  const lastAct = useRef(Date.now());
  const faceRef = useRef("vui");
  const active = live && !still;

  // chuỗi phản ứng: [{ face, ms }] chạy nối tiếp, phản ứng mới thay phản ứng đang chạy
  const run = (r) => {
    if (!r) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    let at = 0;
    for (const st of r.steps) {
      const t0 = at;
      timers.current.push(setTimeout(() => setReaction({ face: st.face, until: Date.now() + st.ms }), t0));
      at += st.ms;
    }
    timers.current.push(setTimeout(() => { setReaction(null); setNow(Date.now()); }, at + 10));
    if (r.hop) setHop((n) => n + 1);
  };
  const touch = () => { lastAct.current = Date.now(); setNow(lastAct.current); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // tải sẵn: thân, 9 mặt của bản này, đồ đang mặc
  useEffect(() => {
    preload([bodyFile(null), ...FACES.map((f) => faceFile(g, f)), ...Object.values(eq).map((it) => it.file), ...Object.values(eq).filter((it) => it.arm).map((it) => bodyFile(it.arm))]);
  }, [g, eq]);

  // mặc / tháo đồ → món rơi xuống + phản ứng
  useEffect(() => {
    const before = prev.current; prev.current = eq;
    if (!before || still) return;
    touch();
    const r = equipReaction(before, eq);
    const added = Object.keys(eq).find((s) => eq[s] && before[s]?.id !== eq[s].id);
    if (added && dropIn) {
      setDrop(added);
      const t1 = setTimeout(() => { setDrop(null); run(r); }, 560); // món rơi xong mới hào hứng
      return () => clearTimeout(t1);
    }
    run(r);
  }, [eq, dropIn, still]); // eslint-disable-line react-hooks/exhaustive-deps

  // chạm vào Pi (react đổi số)
  useEffect(() => { if (!react || still) return; const f = faceRef.current; touch(); run(tapReaction(f)); }, [react]); // eslint-disable-line react-hooks/exhaustive-deps

  // pi.react(mặt, ms) từ nơi khác (chat, gym…) — chỉ Pi đang "sống" trên màn nhận
  useEffect(() => (active ? pi.subscribe((r) => { touch(); run(r); }) : undefined), [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // idle: dùng app (chạm / gõ) là tính có tương tác; mỗi 5 s soát lại
  useEffect(() => {
    if (!active) return;
    const on = () => { lastAct.current = Date.now(); };
    window.addEventListener("pointerdown", on, true); window.addEventListener("keydown", on, true);
    const iv = setInterval(() => setNow(Date.now()), 5000);
    return () => { window.removeEventListener("pointerdown", on, true); window.removeEventListener("keydown", on, true); clearInterval(iv); };
  }, [active]);

  const base0 = FACES.includes(expression) ? expression : "vui";
  const base = active ? idleBase(base0, now - lastAct.current, { night }) : base0;
  let face = shownFace({ base, reaction, now: Date.now() });
  if (talking && !reaction) face = mouth ? "cuoilon" : base;
  if (blink && !reaction && canBlink(face)) face = "ngu";
  faceRef.current = face;

  // chớp mắt tự nhiên 3–5 s, nhắm 120 ms
  useEffect(() => {
    if (!active) return;
    let t1, t2, off = false;
    const loop = () => { t1 = setTimeout(() => { if (off) return; setBlink(true); t2 = setTimeout(() => { setBlink(false); loop(); }, 120); }, 3000 + Math.random() * 2000); };
    loop();
    return () => { off = true; clearTimeout(t1); clearTimeout(t2); };
  }, [active]);
  useEffect(() => {
    if (!talking) { setMouth(false); return; }
    const t = setInterval(() => setMouth((m) => !m), 280);
    return () => clearInterval(t);
  }, [talking]);

  const arm = eq.tay?.arm || eq.gang?.arm || null;
  const box = { position: "absolute", left: 0, top: 0, width: S, height: S, pointerEvents: "none", userSelect: "none" };
  const img = (key, file, cls) => <img key={key} src={file} alt="" draggable="false" className={cls} data-layer={key} style={box} />;
  // mặt: 9 ảnh chồng sẵn (đã tải), chỉ mặt đang hiện rõ — đổi mặt mờ dần 80 ms, không nháy. Ô đứng yên chỉ vẽ 1 mặt cho nhẹ.
  const faceLayer = still
    ? img("mat_pi", faceFile(g, face))
    : <span key="mat_pi" data-layer="mat_pi" data-face={face} style={{ ...box, display: "block" }}>
        {FACES.map((f) => <img key={f} src={faceFile(g, f)} alt="" draggable="false" style={{ ...box, opacity: f === face ? 1 : 0, transition: "opacity 80ms linear" }} />)}
      </span>;
  const layers = LAYER_ORDER.map((L) => {
    if (L === "than") return img(L, bodyFile(arm));
    if (L === "mat_pi") return faceLayer; // luôn hiện: trên áo / cổ, dưới kính / mũ
    const it = eq[L];
    return it ? img(L, it.file, drop === L ? "pi-drop" : undefined) : null;
  });
  return (
    <span role="img" aria-label={label || "Pi"} data-testid="pet-avatar" data-mood={face} data-pi="2" style={{ position: "relative", display: "inline-block", width: W, height, flexShrink: 0 }}>
      <span key={hop} className={hop && !still ? "pi-hop" : undefined} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
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
