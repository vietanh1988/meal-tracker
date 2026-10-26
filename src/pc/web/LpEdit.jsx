// 26/10: soạn khối trang giới thiệu (lp_*, mẫu trang "landing") — ô nhập theo bảng trường LP_FIELDS (blocksMeta.js)
import { useState } from "react";
import { PC } from "../../theme";
import { inpStyle, BLUE } from "./webUI";
import { uploadImage } from "./webApi";
import { MediaPick } from "./MediaPick";
import { LP_FIELDS, BLOCK_NAME } from "./blocksMeta";

const small = { height: 28, fontSize: 12, padding: "0 10px", borderRadius: 10, border: 0, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
const Lbl = ({ children }) => <span style={{ fontSize: 11.5, fontWeight: 700, color: PC.t3 }}>{children}</span>;
const In = ({ v, on, ph, testid }) => <input value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} data-testid={testid} className="pc-input" style={{ ...inpStyle(32), width: "100%" }} />;
const Ta = ({ v, on, ph }) => <textarea value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} className="pc-input" style={{ ...inpStyle(64), height: 64, padding: "8px 12px", resize: "vertical", lineHeight: 1.5 }} />;

function ImgIn({ v, on, showToast, testid }) {
  const [busy, setBusy] = useState(false);
  const [lib, setLib] = useState(false);
  const pick = async (f) => { if (!f) return; setBusy(true); try { on((await uploadImage(f, f.name.replace(/\.\w+$/, ""))).url); } catch (e) { showToast?.("Chưa tải ảnh lên được: " + (e.message || "")); } setBusy(false); };
  return (
    <span style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
      {v ? <img src={/^\//.test(v) ? `https://fipilotai.com${v}` : v} alt="" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8, background: "#EEF3FA", flexShrink: 0 }} /> : null}
      <In v={v} on={on} ph="Đường dẫn ảnh (/img/… hoặc https://…)" testid={testid} />
      <label style={{ flexShrink: 0 }}><input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} /><span className="pc-btn" style={{ ...small, background: "#F1F5F9", display: "inline-flex", alignItems: "center" }}>{busy ? "Đang tải…" : "Tải ảnh"}</span></label>
      <button type="button" onClick={() => setLib(true)} className="pc-btn" style={{ ...small, background: "#E8F1FF", color: BLUE, flexShrink: 0 }}>Thư viện</button>
      {lib && <MediaPick onClose={() => setLib(false)} onPick={(r) => { on(r.url); setLib(false); }} />}
    </span>
  );
}

function Field({ f, v, on, showToast, testid }) {
  if (f.kind === "bool") return <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><input type="checkbox" checked={!!v} onChange={(e) => on(e.target.checked)} />{f.label}</label>;
  if (f.kind === "select") return <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><Lbl>{f.label}</Lbl><select value={v || f.options[0][0]} onChange={(e) => on(e.target.value)} className="pc-input" style={{ ...inpStyle(32), width: 200 }}>{f.options.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>;
  if (f.kind === "img") return <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><Lbl>{f.label}</Lbl><ImgIn v={v} on={on} showToast={showToast} testid={testid} /></label>;
  if (f.kind === "list") {
    const list = Array.isArray(v) ? v : [];
    const setAt = (k, patch) => on(list.map((x, j) => (j === k ? { ...x, ...patch } : x)));
    const move = (k, d) => { const a = [...list]; const j = k + d; if (j < 0 || j >= a.length) return; [a[k], a[j]] = [a[j], a[k]]; on(a); };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Lbl>{f.label}{f.max ? ` (tối đa ${f.max})` : ""}</Lbl>
        {list.map((x, k) => (
          <div key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FFF", border: `1px solid ${PC.line}`, borderRadius: 10, padding: 8 }}>
            <span style={{ width: 20, fontSize: 12, fontWeight: 800, color: BLUE, paddingTop: 8 }}>{k + 1}</span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>{f.fields.map((g) => <Field key={g.key} f={g} v={x[g.key]} on={(val) => setAt(k, { [g.key]: val })} showToast={showToast} />)}</div>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button type="button" title="Lên" onClick={() => move(k, -1)} style={{ ...small, height: 22, background: "#F1F5F9" }}>↑</button>
              <button type="button" title="Xuống" onClick={() => move(k, 1)} style={{ ...small, height: 22, background: "#F1F5F9" }}>↓</button>
              <button type="button" title="Xoá" onClick={() => on(list.filter((_, j) => j !== k))} style={{ ...small, height: 22, background: "#FEE2E2", color: "#B91C1C" }}>✕</button>
            </span>
          </div>
        ))}
        {(!f.max || list.length < f.max) && <button type="button" onClick={() => on([...list, {}])} data-testid={testid ? `${testid}-add` : undefined} style={{ ...small, alignSelf: "flex-start", background: "#E8F1FF", color: BLUE }}>+ Thêm {f.item || "dòng"}</button>}
      </div>
    );
  }
  return <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><Lbl>{f.label}</Lbl>{f.kind === "ta" ? <Ta v={v} on={on} ph={f.ph} /> : <In v={v} on={on} ph={f.ph} testid={testid} />}</label>;
}

export default function LpEdit({ b, set, showToast }) {
  const fields = LP_FIELDS[b.type] || [];
  return (
    <div data-testid={`web-blk-${b.type}`} style={{ borderRadius: 14, border: "1.5px dashed #BFD4FF", background: "#F5F9FF", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: ".04em" }}>{(BLOCK_NAME[b.type] || b.type).toUpperCase()} · chỉ hiện ở mẫu trang Giới thiệu (landing)</span>
      {fields.map((f) => <Field key={f.key} f={f} v={b[f.key]} on={(v) => set({ [f.key]: v })} showToast={showToast} testid={`web-${b.type}-${f.key}`} />)}
    </div>
  );
}
