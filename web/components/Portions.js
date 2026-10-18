"use client";
import { useState } from "react";
const vn = (n) => String(n).replace(".", ",");
export default function Portions({ fd }) {
  const list = fd.portions.length ? fd.portions : [{ name: "100 g", gram: 100, ...fd.per100 }];
  const def = Math.max(0, list.findIndex((p) => /vừa/.test(p.name)));
  const [i, setI] = useState(def);
  const p = list[i];
  const tot = p.p * 4 + p.c * 4 + p.f * 9 || 1;
  const mac = [["Đạm", p.p, (p.p * 4) / tot, "#2563EB"], ["Tinh bột", p.c, (p.c * 4) / tot, "#F59E0B"], ["Chất béo", p.f, (p.f * 9) / tot, "#EF4444"], ["Chất xơ", p.fiber || 0, null, "#16A34A"]];
  return (
    <div className="card por" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }} id="khau-phan">
      <div role="tablist" aria-label="Khẩu phần" style={{ display: "flex", gap: 8, maxWidth: 480 }}>
        {list.map((x, k) => <button key={x.name} role="tab" aria-selected={k === i} onClick={() => setI(k)} style={{ flex: 1, minWidth: 0, height: 52, padding: "0 6px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", ...(k === i ? { background: "linear-gradient(180deg,#1A7CFF,#0062F0)", color: "#fff", border: 0, boxShadow: "0 4px 10px rgba(0,98,240,.25)" } : { background: "#F5F8FD", color: "#334155", border: "1px solid #E6ECF5" }) }}>{x.name.charAt(0).toUpperCase() + x.name.slice(1)}<span style={{ fontWeight: 500, fontSize: 12.5, opacity: 0.85 }}>{x.gram} g</span></button>)}
      </div>
      <div><b style={{ fontSize: 56, lineHeight: 1 }}>{p.cal} kcal</b></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 480 }}>
        {mac.map(([a, g, w, c]) => <div key={a} className="card" style={{ padding: 14, borderRadius: 14, display: "flex", flexDirection: "column", gap: 6 }}><span className="lbl">{a}</span><b style={{ fontSize: 19 }}>{vn(g)} g</b>{w != null && <div className="bar"><span style={{ width: `${Math.round(w * 100)}%`, background: c }} /></div>}</div>)}
      </div>
      <span className="mut" style={{ fontSize: 13.5 }}>100 g {fd.name.toLowerCase()}: {fd.per100.cal} kcal · đạm {vn(fd.per100.p)} g · tinh bột {vn(fd.per100.c)} g · chất béo {vn(fd.per100.f)} g · thanh màu = % năng lượng</span>
      <style>{`@media(max-width:720px){.por{padding:20px!important}.por b[style*="56px"]{font-size:44px!important}}`}</style>
    </div>
  );
}
