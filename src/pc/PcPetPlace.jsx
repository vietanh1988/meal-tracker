// Quản trị PC › Thú cưng Pi › Kho đồ › "Chỉnh vị trí" (21/10): kéo thả món đồ trên Pi cho khớp dáng.
// Kéo khung = dời · lăn chuột / kéo góc = to nhỏ · thanh trượt xoay · lật ngang · (mũ) nằm sau đầu, cắt chỏm đầu · đánh dấu "Cần vẽ lại".
// Lưu vào pet_items.place (đè điểm đặt gốc của catalog, từng bản Pi nam / nữ) → app khách nhận ở lần mở sau (usePet → applyItemRows).
import { useEffect, useRef, useState } from "react";
import { PC } from "../theme";
import { Btn, Pill } from "./pcUI";
import { PetAvatar, ITEMS, catalog, shownAnchor, PET_BASE } from "../pet/PetAvatar";
import { applyItemRows } from "../hooks/usePet";

const H = 560; // chiều cao thân trong khung xem
const r4 = (n) => Math.round(n * 10000) / 10000;
const lbl = { fontSize: 12, fontWeight: 800, color: PC.t3 };
export const canPlace = (it) => it && it.slot !== "ao" && it.slot !== "phong" && !!(it.anchor?.nam || it.anchor?.nu);

// 23/10: lệnh nhờ Muse AI vẽ lại các món bộ Pi mới bị soát ra lỗi (scripts/pi/fit_check.py → src/pi/fit.json) hoặc admin đánh dấu "Cần vẽ lại"
export function redrawPrompt(items) {
  const rows = items.map((it, i) => `${i + 1}. ${it.src || it.id} — ${it.name} (${catalog.slots[it.slot]})${it.redraw_note ? ` — lỗi: ${it.redraw_note}` : ""}`);
  return [
    "Bộ pi_assets_clean còn các món dưới đây ghép lệch với body/pi_than.webp. Làm lại đúng các file này, giữ tên file, khung 768x768, nền trong suốt, chân Pi tại (384,720), vẽ trên đúng thân pi_than.",
    "Yêu cầu: (1) chỉ còn món đồ (đồ cầm tay: vật + bàn tay đang nắm, cánh tay nếu giơ lên) — KHÔNG dán kèm mảng đầu / bụng / thân Pi nào; (2) vật vẽ trọn, không bị cắt phẳng ở mép nào;",
    "(3) mũ / đội đầu ôm trọn đầu Pi, không lộ đầu xanh hai bên phía trên vành; (4) vòng cổ / dây chuyền ở giữa cổ; (5) kiểm bằng cách chồng lên body/pi_than.webp + faces/<nam|nu>/vui.webp: không thấy đường nối hay mảng xanh khác màu.",
    "Gửi lại zip chỉ gồm các file này, đúng cấu trúc items/<sukien>/.",
    "",
    ...rows,
  ].join("\n");
}

export function PlaceEditor({ it, onClose, onSave }) {
  const vars = ["nam", "nu"].filter((v) => it.variants.includes(v) && it.anchor?.[v]);
  const [v, setV] = useState(vars[0]);
  const snap = useRef(null);
  if (!it._anchor0) { it._anchor0 = JSON.parse(JSON.stringify(it.anchor)); it._cut0 = it.cut ? { ...it.cut } : null; it._bh0 = !!it.behind_head; } // điểm đặt gốc (chưa đè)
  if (!snap.current) snap.current = { anchor: JSON.parse(JSON.stringify(it.anchor)), cut: it.cut ? { ...it.cut } : undefined, behind_head: it.behind_head };
  const a0 = it._anchor0 || snap.current.anchor; // điểm đặt gốc của catalog
  const [draft, setDraft] = useState(() => ({ ...JSON.parse(JSON.stringify(it.anchor)) }));
  const [cut, setCut] = useState(() => ({ ...(it.cut || {}) }));
  const [behind, setBehind] = useState(!!it.behind_head);
  const [redraw, setRedraw] = useState(!!it.redraw);
  const [note, setNote] = useState(it.redraw_note || "");
  const [ao, setAo] = useState("");
  const [aspect, setAspect] = useState(1);
  const [busy, setBusy] = useState(false);
  const [, bump] = useState(0);
  const b = catalog.bodies[v], bw = (H * b.w) / b.h;
  const aos = catalog.items.filter((x) => x.slot === "ao" && x.body?.[v]);

  // xem trước sống: ghi bản nháp vào món (ITEMS dùng chung), Huỷ thì trả lại như lúc mở
  useEffect(() => { it.anchor = draft; it.cut = Object.keys(cut).length ? cut : snap.current.cut; it.behind_head = behind; bump((n) => n + 1); }, [draft, cut, behind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const img = new Image(); img.onload = () => setAspect(img.naturalHeight / img.naturalWidth || 1); img.src = PET_BASE + (it.file_hold || it.file); }, [it.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cancel = () => { Object.assign(it, snap.current); onClose(); };

  const a = draft[v];
  const set = (patch) => setDraft((d) => ({ ...d, [v]: { ...d[v], ...patch } }));
  const scale = (k) => set({ w: r4(Math.max(0.03, a.w * k)), ...(a.h ? { h: r4(Math.max(0.03, a.h * k)) } : {}) });
  const sh = shownAnchor({ ...it, anchor: draft }, v, ao) || a;
  const hold = it.slot === "cam_tay" ? 1 : 0;
  const boxW = sh.w * bw, boxH = sh.h ? sh.h * H : boxW * aspect;
  const box = { left: sh.x * bw - boxW / 2, top: sh.y * H - boxH / 2, width: boxW, height: boxH };

  const drag = useRef(null);
  const down = (e, mode) => { e.preventDefault(); e.stopPropagation(); drag.current = { mode, x: e.clientX, y: e.clientY, a: { ...a } }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.x) / bw, dy = (e.clientY - d.y) / H;
    if (d.mode === "move") set({ x: r4(d.a.x + dx), y: r4(d.a.y + dy) });
    else { const k = Math.max(0.2, (d.a.w * bw + (e.clientX - d.x) * 2) / (d.a.w * bw)); set({ w: r4(d.a.w * k), ...(d.a.h ? { h: r4(d.a.h * k) } : {}) }); }
  };
  const up = () => { drag.current = null; };
  const key = (e) => {
    const st = e.shiftKey ? 0.01 : 0.002;
    const m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (m) { e.preventDefault(); set({ x: r4(a.x + m[0]), y: r4(a.y + m[1]) }); }
    else if (e.key === "+" || e.key === "=") scale(1.02);
    else if (e.key === "-") scale(1 / 1.02);
  };
  const changed = (k) => JSON.stringify(draft[k]) !== JSON.stringify(a0[k]);

  const save = async () => {
    setBusy(true);
    const place = {};
    for (const k of vars) {
      const d = draft[k], o = a0[k], p = {};
      for (const f of ["x", "y", "w", "h", "r", "fx"]) if (d[f] !== undefined && d[f] !== o?.[f] && !(f === "r" && !d[f] && !o?.[f]) && !(f === "fx" && !d[f] && !o?.[f])) p[f] = d[f];
      if (cut[k] != null && cut[k] !== it._cut0?.[k]) p.cut = cut[k];
      if (Object.keys(p).length) place[k] = p;
    }
    if (it.slot === "dau" && behind !== !!it._bh0) place.behind_head = behind;
    const ok = await onSave(it.id, { place, redraw, redraw_note: note.trim() });
    setBusy(false);
    if (ok) { applyItemRows([{ id: it.id, name: it.name, rarity: it.rarity, price: it.price, level: it.level, hidden: it.hidden, achievement: it.achievement, variants: it.variants, place, redraw, redraw_note: note.trim() }]); onClose(); }
  };

  const num = (label, val, onChange, step, testid, unit = "") => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={lbl}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" data-testid={testid} className="pc-num" step={step} value={val} onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: "100%", height: 34, borderRadius: 9, border: `1px solid ${PC.field}`, padding: "0 10px", fontSize: 13, fontWeight: 800, fontFamily: "inherit", boxSizing: "border-box" }} />
        {unit && <span style={{ fontSize: 12, color: PC.t3 }}>{unit}</span>}
      </span>
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={`Chỉnh vị trí ${it.name}`} data-testid="pc-pet-place" onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 18, width: "min(1040px, 100%)", maxHeight: "100%", overflow: "auto", display: "grid", gridTemplateColumns: "auto 1fr", gap: 0 }}>
        {/* khung xem + kéo */}
        <div style={{ padding: 20, background: "radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EAF4FF 55%, #D6E8FF 100%)", borderRadius: "18px 0 0 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: bw, height: H, touchAction: "none" }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <PetAvatar variant={v} size={H} still bow={it.slot !== "dau"} equipped={{ [it.slot]: it.id, ...(ao ? { ao } : {}) }} />
            <div data-testid="pc-pet-place-box" tabIndex={0} onKeyDown={key} onPointerDown={(e) => down(e, "move")}
              onWheel={(e) => { e.preventDefault(); scale(e.deltaY < 0 ? 1.03 : 1 / 1.03); }}
              title="Kéo để dời · lăn chuột để to / nhỏ · phím mũi tên dời từng chút"
              style={{ position: "absolute", ...box, transform: sh.r ? `rotate(${sh.r}deg)` : undefined, outline: "2px dashed #0062F0", outlineOffset: 2, borderRadius: 6, cursor: "move", background: "rgba(0,98,240,.05)" }}>
              <span onPointerDown={(e) => down(e, "size")} aria-label="Kéo để to / nhỏ" style={{ position: "absolute", right: -9, bottom: -9, width: 16, height: 16, borderRadius: 8, background: "#0062F0", border: "2px solid #FFFFFF", cursor: "nwse-resize" }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: PC.t3, textAlign: "center", maxWidth: bw }}>Kéo khung để dời · lăn chuột hoặc kéo chấm xanh để to / nhỏ · bấm vào khung rồi dùng phím mũi tên (giữ Shift = bước to)</span>
        </div>

        {/* bảng chỉnh */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={PET_BASE + it.file} alt="" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 9, background: "#F4F7FC" }} />
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 16 }}>{it.name}</b>
              <span style={{ fontSize: 12, color: PC.t3 }}>{it.id} · {catalog.slots[it.slot]}{hold ? " · tay phải của Pi (tay trái tự lật theo)" : ""}</span>
            </span>
            {redraw && <Pill tone="amber">Cần vẽ lại</Pill>}
          </div>
          {vars.length > 1 && (
            <span role="group" aria-label="Bản Pi" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {vars.map((k) => <button key={k} aria-pressed={k === v} data-testid={`pc-pet-place-v-${k}`} onClick={() => { setV(k); setAo(""); }} className="pc-btn"
                style={{ height: 34, borderRadius: 10, border: k === v ? "1px solid #BFD4FF" : `1px solid ${PC.field}`, background: k === v ? PC.soft : "#FFFFFF", color: k === v ? PC.softFg : PC.t1, fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>{k === "nam" ? "Pi nam" : "Pi nữ"}{changed(k) ? " · đã chỉnh" : ""}</button>)}
            </span>
          )}
          <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {num("Ngang (%)", r4(a.x * 100), (n) => set({ x: r4(n / 100) }), 0.2, "pc-pet-place-x")}
            {num("Dọc (%)", r4(a.y * 100), (n) => set({ y: r4(n / 100) }), 0.2, "pc-pet-place-y")}
            {num("Rộng (%)", r4(a.w * 100), (n) => n > 0 && scale(n / 100 / a.w), 0.5, "pc-pet-place-w")}
          </span>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={lbl}>Xoay: {a.r || 0}°</span>
            <input type="range" min={-45} max={45} step={1} value={a.r || 0} data-testid="pc-pet-place-r" onChange={(e) => set({ r: Number(e.target.value) || 0 })} />
          </label>
          <span style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, fontWeight: 700 }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!a.fx} onChange={(e) => set({ fx: e.target.checked })} data-testid="pc-pet-place-fx" />Lật ngang</label>
            {it.slot === "dau" && !it.cover && <label style={{ display: "flex", gap: 6, alignItems: "center" }} title="Băng đô / sừng / tai: vẽ sau đầu, chỉ lộ phần trên đỉnh"><input type="checkbox" checked={behind} onChange={(e) => setBehind(e.target.checked)} />Nằm sau đầu</label>}
          </span>
          {it.cover && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={lbl}>Cắt chỏm đầu dưới mũ: {Math.round((cut[v] ?? b.hat_cut) * 100)}% (mũ trùm: phần đầu trên mức này bị giấu)</span>
              <input type="range" min={0} max={0.45} step={0.005} value={cut[v] ?? b.hat_cut} onChange={(e) => setCut((c) => ({ ...c, [v]: Number(e.target.value) }))} />
            </label>
          )}
          {aos.length > 0 && it.slot !== "ao" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={lbl}>Xem kèm áo (chỉ để thử, không lưu)</span>
              <select className="pc-input" value={ao} onChange={(e) => setAo(e.target.value)} style={{ height: 34, borderRadius: 9, border: `1px solid ${PC.field}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit" }}>
                <option value="">Thân gốc</option>
                {aos.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          )}
          <Btn kind="light" testid="pc-pet-place-reset" onClick={() => { setDraft((d) => ({ ...d, [v]: { ...a0[v] } })); setCut((c) => { const n = { ...c }; if (it._cut0?.[v] != null) n[v] = it._cut0[v]; else delete n[v]; return n; }); }}>Về vị trí gốc ({v === "nam" ? "Pi nam" : "Pi nữ"})</Btn>

          <div style={{ borderTop: `1px solid ${PC.rowLine}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 800 }}><input type="checkbox" checked={redraw} data-testid="pc-pet-place-redraw" onChange={(e) => setRedraw(e.target.checked)} />Cần vẽ lại (hình sai góc / sai dáng, chỉnh vị trí không cứu được)</label>
            {redraw && <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Ví dụ: mũ vẽ nhìn từ trên xuống, vành quá to" data-testid="pc-pet-place-note"
              style={{ borderRadius: 10, border: `1px solid ${PC.field}`, padding: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />}
          </div>
          <span style={{ fontSize: 12, color: PC.t3, lineHeight: 1.45 }}>Lưu xong khách thấy vị trí mới ở lần mở app sau. Chỉnh riêng từng bản Pi nam / Pi nữ.</span>
          <span style={{ display: "flex", gap: 8, marginTop: "auto" }}>
            <Btn kind="blue" style={{ flex: 1 }} testid="pc-pet-place-save" disabled={busy} onClick={save}>{busy ? "Đang lưu…" : "Lưu vị trí"}</Btn>
            <Btn kind="light" testid="pc-pet-place-cancel" onClick={cancel}>Huỷ</Btn>
          </span>
        </div>
      </div>
    </div>
  );
}

export function RedrawBox({ items, onCopy }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const text = redrawPrompt(items);
  return (
    <div data-testid="pc-pet-redraw" style={{ borderRadius: 14, border: "1px solid #FCD34D", background: "#FFFBEB", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ flex: 1, fontSize: 13.5 }}>{items.length} món cần vẽ lại: {items.map((x) => x.name).join(", ")}</b>
        <Btn kind="soft" testid="pc-pet-redraw-show" onClick={() => setOpen((o) => !o)}>{open ? "Ẩn lệnh" : "Xem lệnh vẽ lại"}</Btn>
        <Btn kind="blue" testid="pc-pet-redraw-copy" onClick={async () => { try { await navigator.clipboard.writeText(text); onCopy?.(true); } catch (e) { setOpen(true); onCopy?.(false); } }}>Chép lệnh cho ChatGPT</Btn>
      </span>
      {open && <textarea readOnly value={text} rows={Math.min(14, items.length + 6)} data-testid="pc-pet-redraw-text" style={{ borderRadius: 10, border: `1px solid ${PC.field}`, padding: 10, fontSize: 12.5, fontFamily: "inherit", lineHeight: 1.5 }} />}
    </div>
  );
}

export { ITEMS };
