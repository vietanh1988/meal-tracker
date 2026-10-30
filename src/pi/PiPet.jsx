// 23/10 — Pi bộ mới: chồng lớp ảnh vuông (cùng khung, đặt sẵn đúng chỗ) theo thứ tự manifest.order (dưới → trên):
// lung → thân → giày → áo → đầu gốc (giữ cằm) → cổ → mặt / mắt → miệng (khi nói) → kính → kẹp tóc → đội đầu → lá → găng → cầm tay.
// Mỗi ô 1 món; Pi nam chỉ mặc đồ "nam", Pi nữ đồ "nu". Ảnh tải sẵn để không nháy.
// Hiệu ứng: thở (scaleY ±1,2%, gốc ở chân) · lá đung đưa ±2,5° quanh gốc lá · mặc đồ: món rơi xuống nảy rồi Pi phản ứng (src/pi/piExpr.js) · chạm: nhún.
// 24/10 pi_full mục 4 — NÓI: pi.speak(text, audio) → mắt không miệng (eyes/) + miệng theo âm tiết (src/pi/piLipsync.js), có audio thì
// khớp theo biên độ, thân lắc ±3° chu kỳ 1,6 s, nhún theo biên độ, lá trễ 120 ms. NGHE (pi.listen / prop listening): nghiêng đầu 5°, mắt suy nghĩ, gật nhẹ.
import { useEffect, useMemo, useRef, useState } from "react";
import { layerOrder } from "./layerOrder";
import { PI_ITEMS, PI_MANIFEST, LAYER_ORDER, bodyFile, headOf, leafOf, itemFile, isPink, faceFile, eyesFile, mouthFile, preload, FACES, VISEMES } from "./piCatalog";
import { equipReaction, tapReaction, idleBase, shownFace, canBlink, pi } from "./piExpr";
import { timeline, audioOnsets, textOnsets, visemeAt, restMouth, parseTagged } from "./piLipsync.js";
import { playNow, loadRms, speakTTS, ttsReady } from "./piVoice.js";
export { pi };

export const PI_ITEM = Object.fromEntries(PI_ITEMS.map((it) => [it.id, it]));
/** vị trí Quản trị chỉnh → CSS transform của lớp ảnh (khung S px; x, y tính theo khung 768) */
export function tfStyle(tf, c = [384, 384], S = 768) {
  const k = S / CV, s = Number(tf.s) || 1, w = Number(tf.w) || 1, h = Number(tf.h) || 1;
  const t = `translate(${((Number(tf.x) || 0) * k).toFixed(2)}px, ${((Number(tf.y) || 0) * k).toFixed(2)}px) rotate(${Number(tf.r) || 0}deg) scale(${s * w * (tf.fx ? -1 : 1)}, ${s * h})`;
  return { transform: t, transformOrigin: `${(c[0] / CV) * 100}% ${(c[1] / CV) * 100}%` };
}
export const isTfZero = (tf) => !tf || (!Number(tf.x) && !Number(tf.y) && (Number(tf.s) || 1) === 1 && (Number(tf.w) || 1) === 1 && (Number(tf.h) || 1) === 1 && !Number(tf.r) && !tf.fx);
// khung ảnh: thân Pi nằm trong manifest.bbox (768: x 219–550, y 120–720, chân tại y 720) → phần thừa quanh thân (khung ngoài ôm sát Pi)
const [BX0, BY0, BX1, BY1] = PI_MANIFEST.bbox, CV = PI_MANIFEST.canvas;
export const PI_FRAME = { left: BX0 / CV, right: 1 - BX1 / CV, top: BY0 / CV, bottom: 1 - BY1 / CV };
// gốc lá (điểm xoay khi đung đưa), đo trên body/pi_la.webp: giữa, đáy lá y≈212 / 768
const LEAF_ORIGIN = "50% 27.6%";

const shown = (equipped, gender) => {
  const out = {};
  for (const [slot, id] of Object.entries(equipped || {})) {
    const it = PI_ITEM[id];
    if (it && it.slot === slot && it.slot !== "phong" && it.variants.includes(gender)) out[slot] = it;
  }
  return out;
};

/** chạy 1 câu nói: dòng thời gian miệng + (tuỳ) tiếng. el = thẻ <audio> đã phát sẵn lúc khách bấm (piVoice.playNow);
 *  không có el mà có audio thì tự phát (có thể bị iPhone chặn → chỉ khẩu hình). onFrame({ v, level }) mỗi khung hình; trả { done, stop } */
function startSpeech({ text, audio, el, giong, g }, onFrame) {
  let stopped = false, raf = 0, tts = null;
  if (!el && audio) el = playNow(audio);
  // 24/10: không có file ghi âm → giọng tiếng Việt của máy (piVoice.speakTTS), miệng bám theo từng chữ máy đang đọc
  if (!el && ttsReady()) tts = speakTTS(text, { g, giong, maxMs: textOnsets(text, giong).end * 1.8 + 2500 });
  const done = (async () => {
    let tl = timeline(text, { giong }), rms = null, hop = 10;
    let t0 = performance.now(), shift = 0;
    if (tts) {
      t0 = await Promise.race([tts.started, new Promise((r) => setTimeout(() => r(performance.now()), 1500))]);
      // chữ thứ i máy bắt đầu đọc → kéo đồng hồ khẩu hình về đúng mốc âm tiết của chữ đó
      const starts = wordStarts(text), on = textOnsets(text, giong).onsets;
      tts.onWord((ci) => { let i = 0; while (i + 1 < starts.length && starts[i + 1].ci <= ci) i++; const target = on[starts[i]?.syl ?? 0]; if (target != null) shift = target - (performance.now() - t0); });
    }
    const now = () => (el && !el.paused && el.currentTime > 0 ? el.currentTime * 1000 : performance.now() - t0 + shift);
    if (el && audio) loadRms(audio).then((r) => { if (stopped) return; rms = r.rms; hop = r.hop; tl = timeline(text, { ...audioOnsets(text, r.rms, r.hop), giong }); }).catch(() => {});
    const ended = el ? new Promise((ok) => { el.addEventListener("ended", ok, { once: true }); el.addEventListener("error", ok, { once: true }); }) : tts ? tts.ended : null;
    let fin = false; ended?.then((r) => { if (r === "error" && tts) { tts = null; t0 = performance.now(); shift = 0; } else fin = true; }); // máy không đọc được → khẩu hình theo chữ
    await new Promise((ok) => {
      const step = () => {
        if (stopped) return ok();
        const t = now(), end = tl.length ? tl[tl.length - 1].t : 0;
        const level = rms ? Math.min(1, (rms[Math.floor(t / hop)] || 0) * 4) : tts && !fin ? 0.35 + 0.25 * Math.sin(t / 90) : 0;
        // máy đọc chậm hơn dự tính: hết dòng khẩu hình mà máy chưa đọc xong → mấp máy vừa / hé tới khi xong
        const v = tts && !fin && t > end - 120 ? (Math.floor(t / 160) % 2 ? "vua" : "he") : visemeAt(tl, t);
        onFrame({ v: fin && tts ? "ngam" : v, level });
        const playing = (el && !el.paused && !el.ended && !el.dataset.blocked) || (tts && !fin);
        if ((fin || !playing) && t > (tts ? 0 : end + 30)) return ok();
        raf = requestAnimationFrame(step);
      };
      step();
    });
  })();
  return { done, stop: () => { stopped = true; cancelAnimationFrame(raf); try { el?.pause(); } catch { /* */ } tts?.stop(); } };
}
/** vị trí chữ trong câu → âm tiết thứ mấy (để bám theo sự kiện "đọc tới chữ" của máy) */
function wordStarts(text) {
  const out = []; let syl = 0;
  for (const m of String(text).matchAll(/[0-9A-Za-zÀ-ỹđĐ]+/g)) { out.push({ ci: m.index, syl }); syl += /^\d/.test(m[0]) ? m[0].length : 1; }
  return out;
}

/** gender: nam | nu · expression: biểu cảm nền (base: khách chọn ở Tủ đồ / tâm trạng app) — vui | cuoilon | nhaymat | haohung | ngacnhien | yeu | suynghi | buon | ngu
 *  equipped: { slot: itemId } · height: chiều cao Pi (px, từ đỉnh lá tới chân) · live: thở, chớp mắt, phản ứng, idle, nhận pi.speak · react: đổi số = vừa chạm vào Pi
 *  talking: miệng mấp máy (không có câu cụ thể) · speech: { text, audio, expr, giong, key } nói 1 câu (đổi key = nói lại) · listening: đang nghe
 *  still: đứng yên (ô cửa hàng, quản trị) · night: sau 22h (idle là ngủ luôn)
 *  23/10 biểu cảm tự động (src/pi/piExpr.js): mặc món mới haohung 0,4 s → cuoilon 1 s (Halloween: ngacnhien) + nhún · đủ bộ: yeu 1,5 s
 *  · tháo: ngacnhien 0,6 s · chạm: cuoilon | nhaymat | haohung 1 s (đang ngủ: ngacnhien 0,5 s) · idle 30 s suynghi, 2 phút ngu
 *  · chớp mắt 3–5 s (ngu 120 ms, chỉ khi đang vui / haohung) · pi.react(mặt, ms) từ nơi khác · đổi mặt mờ dần 80 ms, 9 mặt tải sẵn */
export function PiPet({ gender = "nam", expression = "vui", equipped = {}, height = 220, live = false, still = false, react = 0, talking = false, speech = null, listening: listenProp = false, night = false, label, dropIn = true, onSpeakEnd, tfOverride = null, color = null }) {
  const g = gender === "nu" ? "nu" : "nam";
  const hong = isPink(g, color); // 30/10: Pi nữ mặc định hồng (color = "xanh" → bộ xanh)
  const eq = useMemo(() => shown(equipped, g), [equipped, g]);
  const S = height / (1 - PI_FRAME.top - PI_FRAME.bottom); // cạnh khung ảnh
  const W = S * (1 - PI_FRAME.left - PI_FRAME.right);
  const [drop, setDrop] = useState(null);   // ô vừa mặc → món rơi xuống
  const [hop, setHop] = useState(0);        // nhún
  const [reaction, setReaction] = useState(null); // { face, until }
  const [blink, setBlink] = useState(false);
  const [say, setSay] = useState(null);     // đang nói: { v: miệng, expr }
  const [babble, setBabble] = useState(false);
  const [busListen, setBusListen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prev = useRef(null);
  const timers = useRef([]);
  const lastAct = useRef(Date.now());
  const faceRef = useRef("vui");
  const bobRef = useRef(null);
  const speechRef = useRef(null);
  const active = live && !still;
  const listening = !still && (listenProp || busListen);

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
  useEffect(() => () => { timers.current.forEach(clearTimeout); speechRef.current?.stop(); }, []);

  // tải sẵn: thân, lá, 9 mặt của bản này, đồ đang mặc; khi sống thì tải luôn mắt + miệng (để nói không nháy)
  useEffect(() => {
    preload([bodyFile(null, hong), headOf(hong), leafOf(hong), ...FACES.map((f) => faceFile(g, f, hong)), ...Object.values(eq).map((it) => itemFile(it, hong)), ...Object.values(eq).filter((it) => it.arm).map((it) => bodyFile(it.arm, hong))]);
    if (active) preload([...FACES.map((f) => eyesFile(g, f, hong)), ...VISEMES.map((v) => mouthFile(g, v, hong))]);
  }, [g, eq, active, hong]);

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

  // nói 1 câu: { text, audio, expr, giong } — câu AI dạng "[expr] …" tự tách thẻ
  const speak = (sp) => {
    speechRef.current?.stop();
    const tag = parseTagged(sp.text);
    const expr = sp.expr || tag.expr || null, giong = sp.giong || tag.giong || null;
    touch();
    let lastV = null;
    const h = startSpeech({ text: tag.text, audio: sp.audio, el: sp.el, giong, g }, ({ v, level }) => {
      if (v !== lastV) { lastV = v; setSay({ v, expr }); }
      if (bobRef.current) bobRef.current.style.transform = `scale(${1 + level * 0.035}, ${1 - level * 0.02 + level * 0.05})`; // nhún theo biên độ
    });
    speechRef.current = h;
    return h.done.then(() => {
      if (speechRef.current !== h) return;
      speechRef.current = null; setSay(null); touch();
      if (bobRef.current) bobRef.current.style.transform = "";
      onSpeakEnd?.();
    });
  };
  useEffect(() => { if (speech?.text && !still) speak(speech); }, [speech?.key, speech?.text]); // eslint-disable-line react-hooks/exhaustive-deps
  // pi.react / pi.speak / pi.listen từ nơi khác (chat, gym, câu thoại) — chỉ Pi đang "sống" trên màn nhận
  useEffect(() => {
    if (!active) return undefined;
    const a = pi.subscribe((r) => { touch(); run(r); });
    const b = pi.onSpeak((sp) => speak(sp));
    const c = pi.onListen((on) => setBusListen(on));
    return () => { a(); b(); c(); setBusListen(false); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // idle: dùng app (chạm / gõ) là tính có tương tác; mỗi 5 s soát lại
  useEffect(() => {
    if (!active) return;
    const on = () => { lastAct.current = Date.now(); };
    window.addEventListener("pointerdown", on, true); window.addEventListener("keydown", on, true);
    const iv = setInterval(() => setNow(Date.now()), 5000);
    return () => { window.removeEventListener("pointerdown", on, true); window.removeEventListener("keydown", on, true); clearInterval(iv); };
  }, [active]);

  // talking (không có câu cụ thể, VD đang trả lời): miệng mấp máy he ↔ vua
  useEffect(() => {
    if (!talking || say) { setBabble(false); return; }
    const t = setInterval(() => setBabble((m) => !m), 180);
    return () => clearInterval(t);
  }, [talking, !!say]); // eslint-disable-line react-hooks/exhaustive-deps

  const base0 = FACES.includes(expression) ? expression : "vui";
  const base = listening ? "suynghi" : active ? idleBase(base0, now - lastAct.current, { night }) : base0;
  let face = say?.expr && FACES.includes(say.expr) ? say.expr : shownFace({ base, reaction, now: Date.now() });
  const speaking = !!say || (talking && !still);
  if (speaking && face === "ngu") face = "vui"; // đang nói thì không nhắm ngủ
  if (blink && !reaction && canBlink(face)) face = "ngu";
  faceRef.current = face;
  const mouth = say ? (say.v === "ngam" ? restMouth(face === "ngu" ? "vui" : face) : say.v) : talking ? (babble ? "vua" : "he") : null;

  // chớp mắt tự nhiên 3–5 s, nhắm 120 ms
  useEffect(() => {
    if (!active) return;
    let t1, t2, off = false;
    const loop = () => { t1 = setTimeout(() => { if (off) return; setBlink(true); t2 = setTimeout(() => { setBlink(false); loop(); }, 120); }, 3000 + Math.random() * 2000); };
    loop();
    return () => { off = true; clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  const arm = eq.tay?.arm || eq.gang?.arm || null;
  const box = { position: "absolute", left: 0, top: 0, width: S, height: S, pointerEvents: "none", userSelect: "none" };
  const img = (key, file, cls, extra) => <img key={key} src={file} alt="" draggable="false" className={cls} data-layer={key} style={{ ...box, ...extra }} />;
  // mặt: 9 ảnh chồng sẵn (đã tải), chỉ mặt đang hiện rõ — đổi mặt mờ dần 80 ms, không nháy. Đang nói: bộ mắt không miệng. Ô đứng yên chỉ vẽ 1 mặt.
  const faceSet = speaking ? eyesFile : faceFile;
  const faceLayer = still
    ? img("mat_pi", faceFile(g, face, hong))
    : <span key="mat_pi" data-layer="mat_pi" data-face={face} data-speaking={speaking ? "1" : undefined} style={{ ...box, display: "block" }}>
        {FACES.map((f) => <img key={f} src={faceSet(g, f, hong)} alt="" draggable="false" style={{ ...box, opacity: f === face ? 1 : 0, transition: "opacity 80ms linear" }} />)}
      </span>;
  const mouthLayer = !speaking || still ? null
    : <span key="mieng" data-layer="mieng" data-viseme={mouth} style={{ ...box, display: "block" }}>
        {VISEMES.map((v) => <img key={v} src={mouthFile(g, v, hong)} alt="" draggable="false" style={{ ...box, opacity: v === mouth ? 1 : 0 }} />)}
      </span>;
  // 24/10 (chủ dự án: "đội mũ nón thì đè mẹ lá đi cho đỡ lỗi"): có món ô Đầu → lá xếp DƯỚI mũ (mũ trùm che lá; vương miện / băng đô vẫn lộ lá)
  const layers = layerOrder(eq, LAYER_ORDER).map((L) => {
    if (L === "than") return img(L, bodyFile(arm, hong));
    if (L === "dau_pi") return eq.ao ? img(L, headOf(hong)) : null; // đầu gốc đè lên áo → giữ cằm (ảnh áo hay vẽ đè mảng da lên cằm)
    if (L === "mat_pi") return faceLayer; // luôn hiện: trên áo / cổ, dưới kính / mũ
    if (L === "mieng") return mouthLayer;
    if (L === "la") return PI_MANIFEST.leaf ? img(L, leafOf(hong), still ? undefined : speaking ? "pi-leaf pi-leaf-talk" : "pi-leaf", { transformOrigin: LEAF_ORIGIN }) : null; // lá đung đưa; đội mũ thì nằm dưới mũ
    const it = eq[L];
    if (!it) return null;
    // 24/10: Quản trị › Chỉnh vị trí — tf = { x, y (px khung 768), s (cỡ), w (rộng), r (độ), fx (lật) }, gốc tại tâm món
    const tf = (tfOverride && tfOverride[it.id]) || it.tf;
    return img(L, itemFile(it, hong), drop === L ? "pi-drop" : undefined, tf ? tfStyle(tf, it.c, S) : undefined);
  });
  const motion = still ? undefined : speaking ? "pi-talk" : listening ? "pi-listen" : undefined;
  return (
    <span role="img" aria-label={label || "Pi"} data-testid="pet-avatar" data-color={hong ? "hong" : "xanh"} data-mood={face} data-pi="2" data-speaking={speaking ? "1" : undefined} data-listening={listening ? "1" : undefined} style={{ position: "relative", display: "inline-block", width: W, height, flexShrink: 0 }}>
      <span key={hop} className={hop && !still ? "pi-hop" : undefined} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
        <span className={motion} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
          <span ref={bobRef} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", transition: "transform 60ms linear" }}>
            <span className={still || !live ? undefined : "pi-breathe"} style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%" }}>
              <span style={{ position: "absolute", left: -S * PI_FRAME.left, top: -S * PI_FRAME.top, width: S, height: S }}>{layers}</span>
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

export const PI_CSS = `
@keyframes piBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1,1.012)}}
.pi-breathe{animation:piBreathe 3.2s ease-in-out infinite}
@keyframes piLeaf{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
.pi-leaf{animation:piLeaf 2.6s ease-in-out infinite}
@keyframes piTalk{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
.pi-talk{animation:piTalk 1.6s ease-in-out infinite}
/* lá trễ thân 120 ms: lá nằm trong khung thân đang lắc ±3° → phần lệch thêm = góc thân(t − 120 ms) − góc thân(t) ≈ ±1,4°, lệch pha 1/4 chu kỳ */
@keyframes piLeafLag{0%,100%{transform:rotate(1.4deg)}50%{transform:rotate(-1.4deg)}}
.pi-leaf-talk{animation:piLeafLag 1.6s ease-in-out infinite;animation-delay:-0.4s}
@keyframes piListen{0%,100%{transform:rotate(5deg) translateY(0)}45%{transform:rotate(5deg) translateY(0)}55%{transform:rotate(5deg) translateY(1.5%)}65%{transform:rotate(5deg) translateY(0)}}
.pi-listen{animation:piListen 2.5s ease-in-out infinite}
@keyframes piHop{0%{transform:translateY(0) scale(1,1)}18%{transform:translateY(0) scale(1.05,.94)}48%{transform:translateY(-9%) scale(.97,1.04)}78%{transform:translateY(0) scale(1.04,.95)}100%{transform:translateY(0) scale(1,1)}}
.pi-hop{animation:piHop .65s ease-in-out}
@keyframes piDrop{0%{transform:translateY(-32%);opacity:0}45%{transform:translateY(0);opacity:1}62%{transform:translateY(-5%)}80%{transform:translateY(0)}90%{transform:translateY(-1.5%)}100%{transform:translateY(0)}}
.pi-drop{animation:piDrop .56s cubic-bezier(.3,.7,.4,1) both}
@media (prefers-reduced-motion: reduce){.pi-breathe,.pi-hop,.pi-drop,.pi-leaf,.pi-talk,.pi-listen,.pi-leaf-talk{animation:none}}
`;
