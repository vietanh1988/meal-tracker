// Fipilot Pet — ghép nhân vật bằng lớp ảnh (spec §5, chốt 20/10).
// Mọi vị trí lấy từ src/pet/catalog.json (anchor: x, y = tâm món theo phần rộng / cao thân; w = rộng món theo phần rộng thân;
// h có thì kéo dãn theo chiều cao). Mặc áo có ảnh liền thân (item.body) → thay cả thân bằng ảnh đó; không có thì dùng thân đã bỏ áo gốc (file_ao) + ảnh áo rời.
// Bản nữ: nơ là lớp riêng (mặc định đeo, khách tháo được), đội mũ thì ẩn.
// Mũ trùm (cover) cắt thân phía trên hat_cut; đồ cầm tay đặt điểm nắm vào tâm bàn tay rồi vẽ lại bàn tay (lớp "tay") đè lên.
import { useEffect, useState } from "react";
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

function Layer({ file, a, bw, bh, clipTop, flip, cls, imgStyle }) {
  const w = a.w * bw;
  const style = { position: "absolute", left: a.x * bw - w / 2, width: w, pointerEvents: "none", userSelect: "none" };
  if (clipTop) style.clipPath = `inset(${clipTop * 100}% 0 0 0)`; // mũ trùm đầu: bỏ lá + chỏm đầu dưới mũ
  const tf = [];
  if (a.h) { const h = a.h * bh; Object.assign(style, { top: a.y * bh - h / 2, height: h }); }
  else { Object.assign(style, { top: a.y * bh, height: "auto" }); tf.push("translateY(-50%)"); }
  if (flip) tf.push("scaleX(-1)");
  if (tf.length) style.transform = tf.join(" ");
  // cls (hiệu ứng động: lá đung đưa, zZ trôi…) đặt ở ảnh bên trong để không đè transform canh vị trí của khung ngoài
  if (cls) return <span style={{ ...style, display: "block" }}><img src={PET_BASE + file} alt="" draggable="false" className={cls} style={{ display: "block", width: "100%", height: a.h ? "100%" : "auto", ...imgStyle }} /></span>;
  return <img src={PET_BASE + file} alt="" draggable="false" style={style} />;
}
const BLINK = { nam: "mat-doi/mat-doi-nam-07.webp", nu: "mat-doi/mat-doi-nu-19.webp" };
// tay trái: dùng ảnh cầm tay phải lật ngang, dời điểm đặt từ tâm bàn tay phải sang tâm bàn tay trái
function leftAnchor(a, b) {
  const [rx, ry] = [b.hand.x, b.hand.y], [lx, ly] = b.hand_left;
  return { ...a, x: lx - (a.x - rx), y: a.y + (ly - ry) };
}

// 20/10: áo liền thân vẽ bàn tay ở chỗ khác thân gốc (catalog body.hand / hand_l, dò từ ảnh) → dời đồ cầm tay theo tay của áo
function shiftHand(a, base, to) {
  if (!to) return a;
  return { ...a, x: a.x + (to[0] - base.x), y: a.y + (to[1] - base.y) };
}

/** size = chiều cao thân (px). equipped = { slot: itemId } (cam_tay = tay phải, cam_tay_trai = tay trái). mood: vui | cuoi | ngu | hoi | mung.
 *  live: chớp mắt, đảo mắt, lá đung đưa, tâm trạng động (spec §6). talking: miệng mấp máy. react: đổi số → nảy + cười tít 1,2 giây. */
export function PetAvatar({ variant = "nam", equipped = {}, mood = "vui", bow = true, size = 220, still = false, label, talking = false, live = false, react = 0 }) {
  const b = catalog.bodies[variant];
  const bh = size, bw = (size * b.w) / b.h;
  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState(0);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!live || mood === "ngu") return;
    let t1, t2, off = false;
    const loop = () => { t1 = setTimeout(() => { if (off) return; setBlink(true); t2 = setTimeout(() => { setBlink(false); loop(); }, 130); }, 3800 + Math.random() * 2200); };
    loop();
    const t3 = setInterval(() => { setLook(Math.random() < 0.5 ? -1 : 1); setTimeout(() => setLook(0), 1300); }, 8000 + Math.random() * 3000);
    return () => { off = true; clearTimeout(t1); clearTimeout(t2); clearInterval(t3); };
  }, [live, mood]);
  useEffect(() => { if (!react) return; setFlash(true); const t = setTimeout(() => setFlash(false), 1200); return () => clearTimeout(t); }, [react]);
  const eq = Object.fromEntries(Object.entries(equipped).map(([s, id]) => [s, ITEMS[id]]).filter(([s, it]) => it && it.variants.includes(variant) && (s !== "cam_tay_trai" || it.slot === "cam_tay")));
  const face = FACES[flash ? "cuoi" : mood] || FACES.vui;
  const [eyes0, mouth] = face[variant];
  const eyes = blink && !flash ? BLINK[variant] : eyes0;
  const behindLeaf = Object.values(eq).some((it) => it.behind_leaf);
  const hideLeaf = !!eq.dau?.hide_leaf; // nón rộng vành (nón lá, nón quai thao, mũ lân): giấu lá, không cắt đầu
  const sepLeaf = (live || behindLeaf || hideLeaf) && !eq.dau?.cover; // lá là lớp riêng (để đung đưa / để đi sau món)
  const aoBody = eq.ao?.body?.[variant]; // 20/10: áo vẽ liền thân → mặc áo thì thay cả thân, không đặt ảnh áo rời
  const holdL = eq.cam_tay_trai, holdR = eq.cam_tay;
  const leaf = <Layer key="la" file={b.leaf.file} a={b.leaf} bw={bw} bh={bh} cls={live ? "pet-leaf" : undefined} imgStyle={{ transformOrigin: `${b.leaf.px * 100}% ${b.leaf.py * 100}%` }} />;
  const layers = [];
  for (const L of catalog.layers) {
    if (L === "than") {
      const f = aoBody ? (sepLeaf ? aoBody.file_nl : aoBody.file) : sepLeaf ? (eq.ao ? b.file_ao_nl : b.file_nl) : (eq.ao ? b.file_ao : b.file);
      layers.push(<Layer key="than" file={f} a={{ x: 0.5, y: 0.5, w: 1, h: 1 }} bw={bw} bh={bh} clipTop={eq.dau?.cover ? (eq.dau.cut?.[variant] ?? b.hat_cut) : 0} />);
      if (sepLeaf && !behindLeaf && !hideLeaf) layers.push(leaf);
    }
    else if (L === "quai") { Object.values(eq).forEach((it) => (it.front || []).forEach((f, i) => layers.push(<Layer key={`quai${it.id}${i}`} file={f.file} a={f} bw={bw} bh={bh} />))); } // quai balo đè lên áo
    else if (L === "cam_tay") {
      if (holdR) layers.push(<Layer key="cam_tay" file={holdR.file_hold || holdR.file} a={shiftHand(holdR.anchor[variant], b.hand, aoBody?.hand)} bw={bw} bh={bh} />);
      if (holdL) layers.push(<Layer key="cam_tay_trai" file={holdL.file_hold || holdL.file} a={shiftHand(leftAnchor(holdL.anchor[variant], b), { x: b.hand_left[0], y: b.hand_left[1] }, aoBody?.hand_l)} bw={bw} bh={bh} flip />);
    }
    else if (L === "tay") {
      if (holdR && !holdR.file_hold) layers.push(<Layer key="tay" file={b.hand.file} a={b.hand} bw={bw} bh={bh} />); // tay vẽ đè lên đồ → trông như đang cầm
      if (eq.ao && !aoBody) { // mặc áo rời: tay áo che tay gốc → vẽ lại bàn tay trần ở tay đang không cầm gì
        if (!holdL) layers.push(<Layer key="tay-trai" file={b.hand_l.file} a={b.hand_l} bw={bw} bh={bh} />);
        if (!holdR) layers.push(<Layer key="tay-phai" file={b.hand.file} a={b.hand} bw={bw} bh={bh} />);
      }
      if (behindLeaf && sepLeaf && !hideLeaf) layers.push(leaf); // băng đô / tai nghe đi sau cuống lá
    }
    else if (L === "mat") layers.push(<span key="mat" className={look ? (look < 0 ? "pet-look-l" : "pet-look-r") : undefined} style={{ position: "absolute", inset: 0, transition: "transform .35s ease" }}><Layer file={eyes} a={b.eyes} bw={bw} bh={bh} /></span>);
    else if (L === "mieng") {
      if (!talking) layers.push(<Layer key="mieng" file={mouth} a={b.mouth} bw={bw} bh={bh} />);
      else { // đang nói: miệng mở / khép xen kẽ
        layers.push(<span key="mieng-mo" className="pet-talk" style={{ position: "absolute", inset: 0 }}><Layer file="mieng/mieng-to-01.webp" a={b.mouth} bw={bw} bh={bh} /></span>);
        layers.push(<span key="mieng-khep" className="pet-talk2" style={{ position: "absolute", inset: 0 }}><Layer file="mieng/mieng-05.webp" a={b.mouth} bw={bw} bh={bh} /></span>);
      }
    }
    else if (L === "bow") { if (b.bow && bow && !eq.dau) layers.push(<Layer key="bow" file={b.bow.file} a={b.bow} bw={bw} bh={bh} />); }
    else if (L === "tam_trang") { const m = catalog.moods[MOOD_FX[mood]]; if (m && !flash) layers.push(<Layer key="mood" file={m.file} a={m.anchor[variant]} bw={bw} bh={bh} cls={live ? `pet-fx-${MOOD_FX[mood]}` : undefined} />); }
    else if (L === "ao" && aoBody) { /* thân đã mặc áo */ }
    else if (eq[L]) layers.push(<Layer key={L} file={eq[L].file_hold || eq[L].file} a={eq[L].anchor[variant]} bw={bw} bh={bh} />);
  }
  return (
    <span role="img" aria-label={label || "Thú cưng"} data-testid="pet-avatar" data-mood={flash ? "cuoi" : mood} style={{ position: "relative", display: "inline-block", width: bw, height: bh, flexShrink: 0 }}>
      <span key={react} className={react ? "pet-hop" : undefined} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
        <span className={still ? undefined : "pet-breathe"} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>{layers}</span>
      </span>
    </span>
  );
}

// Thở nhẹ (spec §6); máy bật "giảm chuyển động" thì đứng yên
export const PET_CSS = `
.pet-noscroll::-webkit-scrollbar{display:none}
@keyframes petBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.015,.985)}}
.pet-breathe{animation:petBreathe 3.2s ease-in-out infinite}
@keyframes petLeaf{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}
.pet-leaf{animation:petLeaf 3.4s ease-in-out infinite}
.pet-look-l{transform:translateX(-3%)}.pet-look-r{transform:translateX(3%)}
@keyframes petHop{0%{transform:translateY(0) scale(1,1)}15%{transform:translateY(2%) scale(1.06,.93)}50%{transform:translateY(-14%) scale(.95,1.06)}82%{transform:translateY(0) scale(1.06,.92)}100%{transform:translateY(0) scale(1,1)}}
.pet-hop{animation:petHop .7s ease-in-out}
@keyframes petHeart{0%{transform:translateY(0) scale(.3);opacity:0}25%{transform:translateY(-20px) scale(1.1);opacity:1}100%{transform:translateY(-90px) scale(.8);opacity:0}}
.pet-heart{animation:petHeart 1.1s ease-out both}
@keyframes petZz{0%,100%{transform:translate(0,0);opacity:1}50%{transform:translate(6%,-18%);opacity:.45}}
.pet-fx-ngu{animation:petZz 2.6s ease-in-out infinite}
@keyframes petQ{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
.pet-fx-hoi{animation:petQ 1.4s ease-in-out infinite}
@keyframes petTalk{0%,49%{opacity:0}50%,100%{opacity:1}}
.pet-talk{animation:petTalk .32s steps(1) infinite}
@keyframes petTalk2{0%,49%{opacity:1}50%,100%{opacity:0}}
.pet-talk2{animation:petTalk2 .32s steps(1) infinite}
@keyframes petDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.pet-dot{display:inline-block;width:7px;height:7px;border-radius:4px;background:#64748B;margin:0 2px;animation:petDot 1s infinite}
.pet-dot:nth-child(2){animation-delay:.15s}.pet-dot:nth-child(3){animation-delay:.3s}
@media (prefers-reduced-motion: reduce){.pet-breathe,.pet-talk,.pet-talk2,.pet-dot,.pet-leaf,.pet-hop,.pet-fx-ngu,.pet-fx-hoi,.pet-heart{animation:none}.pet-talk2{opacity:0}}
`;

/** Ảnh 1 món (ô cửa hàng / tủ đồ) */
export function ItemImg({ item, size = 72 }) {
  return <img src={PET_BASE + item.file} alt="" draggable="false" style={{ maxWidth: size, maxHeight: size, objectFit: "contain", display: "block" }} />;
}
