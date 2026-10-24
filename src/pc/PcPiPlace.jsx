// 24/10 (chủ dự án: "cái tính năng sửa ảnh trong admin đâu") — Quản trị › Thú cưng Pi › Kho đồ › Chỉnh vị trí trên Pi (bộ Pi mới).
// Ảnh món của bộ mới đã cùng khung 768 với thân; món Muse vẽ lệch thì admin dời / phóng / kéo rộng / xoay / lật NGAY trên Pi thật,
// lưu vào pet_items.place.tf = { x, y (px khung 768), s (cỡ), w (rộng), r (độ), fx (lật) } → app khách vẽ theo ở lần mở sau
// (usePet → applyItemRows → it.tf → PiPet tfStyle). Không sửa file ảnh. Gốc xoay / phóng = tâm món (manifest c).
import { useEffect, useRef, useState } from "react";
import { PC } from "../theme";
import { Btn } from "./pcUI";
import { PiPet, isTfZero } from "../pi/PiPet";
import { FACES, FACE_NAME } from "../pi/piCatalog";
import { applyItemRows } from "../hooks/usePet";

const ZERO = { x: 0, y: 0, s: 1, w: 1, h: 1, r: 0, fx: false };
const r2 = (n) => Math.round(n * 100) / 100;
const PREVIEW = 420; // chiều cao Pi trong khung chỉnh (px)

export function PiPlaceEditor({ it, onClose, onSave }) {
  const tf0 = useRef({ ...ZERO, ...(it.tf || {}) });
  const [tf, setTf] = useState(tf0.current);
  const [face, setFace] = useState("vui");
  const [redraw, setRedraw] = useState(!!it.redraw && !it.broken);
  const [note, setNote] = useState(it.broken ? "" : it.redraw_note || "");
  const [busy, setBusy] = useState(false);
  const drag = useRef(null);
  const boxRef = useRef(null);
  const set = (p) => setTf((t) => ({ ...t, ...p }));
  // khung 768 → px trên màn: Pi cao PREVIEW ứng với bbox thân (y 120–720 = 600px khung)
  const k = PREVIEW / 600;

  // 24/10 (chủ dự án: "phải chỉnh cả kích thước"): kéo thân món = dời; kéo chấm góc = phóng / thu (giữ tỉ lệ), chấm cạnh = kéo rộng / cao
  const down = (e, mode = "move") => {
    e.preventDefault(); e.stopPropagation(); boxRef.current?.focus();
    drag.current = { x: e.clientX, y: e.clientY, t: tf, mode };
    const mv = (ev) => {
      const d = drag.current; if (!d) return;
      const dx = (ev.clientX - d.x) / k, dy = (ev.clientY - d.y) / k;
      if (d.mode === "move") return set({ x: Math.round(d.t.x + dx), y: Math.round(d.t.y + dy) });
      const bw = Math.max(40, it._bw || 200), bh = Math.max(40, it._bh || 200);
      if (d.mode === "s") return set({ s: r2(Math.min(3, Math.max(0.3, d.t.s * (1 + (dx + dy) / (bw + bh))))) });
      if (d.mode === "w") return set({ w: r2(Math.min(3, Math.max(0.3, d.t.w * (1 + (2 * dx) / bw)))) });
      if (d.mode === "h") return set({ h: r2(Math.min(3, Math.max(0.3, (d.t.h || 1) * (1 + (2 * dy) / bh)))) });
    };
    const up = () => { drag.current = null; window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const key = (e) => {
    const st = e.shiftKey ? 10 : 1;
    const m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (m) { e.preventDefault(); set({ x: tf.x + m[0], y: tf.y + m[1] }); }
    if (e.key === "+" || e.key === "=") set({ s: r2(tf.s + 0.01) });
    if (e.key === "-") set({ s: r2(Math.max(0.3, tf.s - 0.01)) });
  };
  const wheel = (e) => { e.preventDefault(); set({ s: r2(Math.min(3, Math.max(0.3, tf.s * (e.deltaY < 0 ? 1.03 : 1 / 1.03)))) }); };
  // khung bao món (để vẽ chấm kéo): đo vùng có hình của ảnh món một lần
  const [bb, setBb] = useState(null);
  useEffect(() => {
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = c.height = 192; const x = c.getContext("2d"); x.drawImage(im, 0, 0, 192, 192);
        const d = x.getImageData(0, 0, 192, 192).data; let x0 = 192, y0 = 192, x1 = 0, y1 = 0;
        for (let i = 0; i < 192 * 192; i++) if (d[i * 4 + 3] > 40) { const px = i % 192, py = (i / 192) | 0; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
        if (x1 > x0) { const b = [x0 * 4, y0 * 4, (x1 + 1) * 4, (y1 + 1) * 4]; it._bw = b[2] - b[0]; it._bh = b[3] - b[1]; setBb(b); }
      } catch { /* */ }
    };
    im.src = it.file;
  }, [it]);
  useEffect(() => { const esc = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [onClose]);

  const save = async () => {
    setBusy(true);
    const place = isTfZero(tf) ? {} : { tf: { x: tf.x, y: tf.y, s: r2(tf.s), w: r2(tf.w), h: r2(tf.h || 1), r: tf.r, fx: !!tf.fx } };
    const ok = await onSave(it.id, { place, redraw, redraw_note: redraw ? note.trim() : "" });
    setBusy(false);
    if (ok) { applyItemRows([{ id: it.id, name: it.name, rarity: it.rarity, price: it.price, level: it.level, hidden: it.hidden, achievement: it.achievement, variants: it.variants, place, redraw, redraw_note: redraw ? note.trim() : "" }]); onClose(true); }
  };

  const num = (label, val, onChange, step, tid, unit = "") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: PC.t3 }}>{label}{unit && ` (${unit})`}</span>
      <input data-testid={tid} className="pc-num" type="number" step={step} value={val} onChange={(e) => onChange(Number(e.target.value) || 0)} style={{ height: 36, borderRadius: 10, border: `1px solid ${PC.field}`, padding: "0 10px", fontSize: 14, fontWeight: 800, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
    </label>
  );
  const g = it.variants.includes("nu") && !it.variants.includes("nam") ? "nu" : "nam";
  const changed = JSON.stringify(tf) !== JSON.stringify(tf0.current);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Chỉnh vị trí ${it.name}`} data-testid="pc-pet-place" style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 18, width: "min(980px, 100%)", maxHeight: "100%", overflow: "auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", boxShadow: "0 24px 60px rgba(15,23,42,0.3)" }}>
        {/* khung Pi: kéo món để dời; phím mũi tên dời 1px (Shift: 10px), +/- đổi cỡ */}
        <div ref={boxRef} tabIndex={0} onKeyDown={key} data-testid="pc-pet-place-box" onPointerDown={down}
          style={{ position: "relative", minHeight: PREVIEW + 60, background: "repeating-conic-gradient(#EEF2F7 0% 25%, #FFFFFF 0% 50%) 50% / 24px 24px", borderRadius: "18px 0 0 18px", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 24, cursor: "move", outline: "none", touchAction: "none" }}>
          <span style={{ position: "absolute", left: 14, top: 12, right: 14, fontSize: 12, fontWeight: 700, color: PC.t3 }}>Kéo món để dời · kéo chấm GÓC để phóng to / thu nhỏ · chấm CẠNH kéo rộng / cao · lăn chuột đổi cỡ · ← → ↑ ↓ dời 1px</span>
          <span style={{ position: "relative", display: "inline-block" }} onWheel={wheel}>
            <PiPet gender={g} expression={face} equipped={{ [it.slot]: it.id }} height={PREVIEW} still tfOverride={{ [it.id]: tf }} label={`Pi mặc ${it.name}`} />
            {bb && <Handles bb={bb} tf={tf} c={it.c || [384, 384]} k={k} onDown={down} />}
          </span>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 16 }}>Chỉnh vị trí trên Pi</b>
            <span style={{ fontSize: 12, color: PC.t3 }}>{it.name} · {g === "nu" ? "Pi nữ" : "Pi nam"}</span>
          </span>
          <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {num("Ngang", tf.x, (n) => set({ x: Math.round(n) }), 1, "pc-pet-place-x", "px")}
            {num("Dọc", tf.y, (n) => set({ y: Math.round(n) }), 1, "pc-pet-place-y", "px")}
            {num("Cỡ", Math.round(tf.s * 100), (n) => n > 0 && set({ s: r2(n / 100) }), 1, "pc-pet-place-s", "%")}
            {num("Rộng", Math.round(tf.w * 100), (n) => n > 0 && set({ w: r2(n / 100) }), 1, "pc-pet-place-w", "%")}
            {num("Cao", Math.round((tf.h || 1) * 100), (n) => n > 0 && set({ h: r2(n / 100) }), 1, "pc-pet-place-h", "%")}
            <span style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              <Btn kind="light" testid="pc-pet-place-smaller" style={{ flex: 1 }} onClick={() => set({ s: r2(Math.max(0.3, tf.s - 0.05)) })}>− Nhỏ</Btn>
              <Btn kind="light" testid="pc-pet-place-bigger" style={{ flex: 1 }} onClick={() => set({ s: r2(Math.min(3, tf.s + 0.05)) })}>+ To</Btn>
            </span>
          </span>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: PC.t3 }}>Xoay ({tf.r}°)</span>
            <input type="range" min={-30} max={30} step={1} value={tf.r} data-testid="pc-pet-place-r" onChange={(e) => set({ r: Number(e.target.value) || 0 })} />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={!!tf.fx} data-testid="pc-pet-place-fx" onChange={(e) => set({ fx: e.target.checked })} />Lật ngang</label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: PC.t3 }}>Xem với mặt</span>
            <select className="pc-input" value={face} onChange={(e) => setFace(e.target.value)} style={{ height: 36, borderRadius: 10, border: `1px solid ${PC.field}`, padding: "0 8px", fontFamily: "inherit" }}>{FACES.map((f) => <option key={f} value={f}>{FACE_NAME[f]}</option>)}</select>
          </label>
          <Btn kind="light" testid="pc-pet-place-reset" onClick={() => setTf({ ...ZERO })}>Về vị trí gốc</Btn>
          <span style={{ height: 1, background: PC.line || "#E6ECF5" }} />
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={redraw} data-testid="pc-pet-place-redraw" onChange={(e) => setRedraw(e.target.checked)} style={{ marginTop: 3 }} />Cần vẽ lại (hình sai, chỉnh vị trí không cứu được) — tạm không bán</label>
          {redraw && <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Ví dụ: mép mũ bị cắt phẳng" data-testid="pc-pet-place-note" style={{ borderRadius: 10, border: `1px solid ${PC.field}`, padding: 8, fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />}
          {it.broken && <span style={{ fontSize: 12, color: "#B45309" }}>Máy soát ảnh đang báo lỗi: {it._fit_note || it.redraw_note}</span>}
          <span style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <Btn kind="blue" style={{ flex: 1 }} testid="pc-pet-place-save" disabled={busy} onClick={save}>{busy ? "Đang lưu…" : changed ? "Lưu vị trí" : "Lưu"}</Btn>
            <Btn kind="light" testid="pc-pet-place-cancel" onClick={() => onClose()}>Huỷ</Btn>
          </span>
        </div>
      </div>
    </div>
  );
}

/** khung bao + 8 chấm kéo đè lên món (theo đúng vị trí / cỡ đang chỉnh, gốc phóng = tâm món) */
function Handles({ bb, tf, c, k, onDown }) {
  const s = tf.s || 1, sx = s * (tf.w || 1), sy = s * (tf.h || 1);
  const map = (x, y) => [(c[0] + (x - c[0]) * sx + (tf.x || 0) - 219) * k, (c[1] + (y - c[1]) * sy + (tf.y || 0) - 120) * k];
  const [l, t] = map(bb[0], bb[1]), [r, b] = map(bb[2], bb[3]);
  const L = Math.min(l, r), R = Math.max(l, r), T = Math.min(t, b), B = Math.max(t, b);
  const dot = (x, y, mode, cur, tid) => <span key={tid} data-testid={tid} onPointerDown={(e) => onDown(e, mode)} style={{ position: "absolute", left: x - 7, top: y - 7, width: 14, height: 14, borderRadius: 4, background: "#FFFFFF", border: "2px solid #2563EB", cursor: cur, boxShadow: "0 1px 4px rgba(15,23,42,0.3)", touchAction: "none" }} />;
  return (
    <span style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <span style={{ position: "absolute", left: L, top: T, width: R - L, height: B - T, border: "1.5px dashed #2563EB", borderRadius: 4, pointerEvents: "auto", cursor: "move" }} onPointerDown={(e) => onDown(e, "move")} data-testid="pc-pet-place-frame" />
      <span style={{ pointerEvents: "auto" }}>
        {dot(L, T, "s", "nwse-resize", "pc-pet-place-nw")}{dot(R, T, "s", "nesw-resize", "pc-pet-place-ne")}
        {dot(L, B, "s", "nesw-resize", "pc-pet-place-sw")}{dot(R, B, "s", "nwse-resize", "pc-pet-place-se")}
        {dot(R, (T + B) / 2, "w", "ew-resize", "pc-pet-place-e")}{dot(L, (T + B) / 2, "w", "ew-resize", "pc-pet-place-wl")}
        {dot((L + R) / 2, B, "h", "ns-resize", "pc-pet-place-sh")}{dot((L + R) / 2, T, "h", "ns-resize", "pc-pet-place-nh")}
      </span>
    </span>
  );
}
