"use client";
// Mục lục bài viết (bản vẽ "Mục lục bài viết" đã chốt 19/10): số trong ô tròn + vạch dọc, mục đang đọc tô xanh,
// H3 chỉ hiện dưới H2 đang đọc, tiêu đề dài cắt 2 dòng, "Đã đọc %". PC: dính khi cuộn, nút thu gọn. Điện thoại: thanh gập, bấm mục thì tự gập.
import { useEffect, useMemo, useState } from "react";

const C = { blue: "#0062F0", ink: "#0F172A", ink2: "#475569", mut: "#64748B", line: "#E6ECF5", line2: "#EEF2F7", soft: "#EEF4FF", done: "#DCE8FF", grey: "#F1F5F9" };

export default function PostToc({ t, mobile = false }) {
  const groups = useMemo(() => {
    const g = [];
    for (const x of t) { if (x.level === 3 && g.length) g[g.length - 1].kids.push(x); else g.push({ ...x, kids: [] }); }
    return g;
  }, [t]);
  const [on, setOn] = useState(groups[0]?.id);
  const [pct, setPct] = useState(0);
  const [open, setOpen] = useState(!mobile);
  useEffect(() => {
    const ids = groups.flatMap((x) => [x.id, ...x.kids.map((k) => k.id)]);
    const owner = {}; groups.forEach((x) => { owner[x.id] = x.id; x.kids.forEach((k) => { owner[k.id] = x.id; }); });
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const art = document.querySelector(".art") || document.body;
    const onScroll = () => {
      let cur = groups[0]?.id;
      for (const e of els) { if (e.getBoundingClientRect().top < 120) cur = owner[e.id]; else break; }
      setOn(cur);
      const r = art.getBoundingClientRect(), h = r.height - window.innerHeight;
      setPct(Math.max(0, Math.min(100, Math.round(h > 0 ? (-r.top / h) * 100 : 100))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [groups]);
  const idx = Math.max(0, groups.findIndex((x) => x.id === on));
  const pick = () => { if (mobile) setOpen(false); };

  const list = (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 2, ...(mobile ? { padding: "8px 8px 10px", borderTop: `1px solid ${C.line}` } : {}) }}>
      {!mobile && <span aria-hidden="true" style={{ position: "absolute", left: 24, top: 16, bottom: 16, width: 2, borderRadius: 1, background: C.line2 }} />}
      {groups.map((x, i) => {
        const cur = i === idx, done = i < idx;
        return (
          <div key={x.id} style={{ display: "flex", flexDirection: "column", position: "relative" }}>
            <a href={`#${x.id}`} onClick={pick} className="toc-row" aria-current={cur ? "true" : undefined} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: mobile ? 8 : "6px 8px 6px 14px", minHeight: mobile ? 40 : undefined, boxSizing: "border-box", borderRadius: 10, background: cur ? C.soft : undefined, textDecoration: "none" }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 11, fontSize: 11.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", background: cur ? C.blue : done ? C.done : C.grey, color: cur ? "#fff" : done ? C.blue : C.mut, boxShadow: mobile ? undefined : "0 0 0 3px #fff" }}>{i + 1}</span>
              <span className="toc-clamp" style={{ fontSize: 14, lineHeight: 1.45, paddingTop: 1, color: cur ? C.ink : done ? C.ink2 : C.mut, fontWeight: cur ? 700 : 400 }}>{x.text}</span>
            </a>
            {cur && x.kids.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", padding: "2px 0 4px 46px" }}>
                {x.kids.map((k) => <a key={k.id} href={`#${k.id}`} onClick={pick} className="toc-row" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 8px", borderRadius: 8, fontSize: 13, lineHeight: 1.45, color: C.mut, textDecoration: "none" }}><span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 2, background: "#94A3B8", marginTop: 8, flexShrink: 0 }} /><span className="toc-clamp">{k.text}</span></a>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  const css = <style dangerouslySetInnerHTML={{ __html: `.toc-clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.toc-row{transition:background .12s}.toc-row:hover{background:#F5F8FD}.toc-row[aria-current]{background:${C.soft}}.toc-btn{transition:background .12s}.toc-btn:hover{background:${C.soft}}.toc-row:focus-visible,.toc-btn:focus-visible{outline:2px solid ${C.blue};outline-offset:2px}` }} />;

  if (mobile) return (
    <nav aria-label="Mục lục" data-testid="post-toc-m" style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: "#F8FBFF", display: "flex", flexDirection: "column" }}>
      {css}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 14px", border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: C.ink }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
          <b style={{ fontSize: 14.5 }}>Mục lục · {groups.length} phần</b>
          <span style={{ fontSize: 12.5, color: C.mut, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Đang đọc: {idx + 1}. {groups[idx]?.text}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mut} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && list}
    </nav>
  );
  return (
    <nav aria-label="Mục lục" data-testid="post-toc" className="card" style={{ padding: "18px 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {css}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px" }}>
        <b style={{ fontSize: 15, fontWeight: 800 }}>Mục lục</b>
        <span style={{ height: 22, padding: "0 8px", borderRadius: 11, background: C.grey, color: C.mut, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>{groups.length} phần</span>
        <span style={{ flexGrow: 1 }} />
        <button type="button" className="toc-btn" aria-label={open ? "Thu gọn mục lục" : "Mở mục lục"} aria-expanded={open} onClick={() => setOpen(!open)} data-testid="post-toc-toggle" style={{ width: 30, height: 30, border: 0, borderRadius: 8, background: "transparent", color: C.mut, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? "none" : "rotate(180deg)" }}><path d="M6 15l6-6 6 6" /></svg>
        </button>
      </div>
      {open && list}
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 6px 0", borderTop: `1px solid ${C.line2}` }}>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.mut }}><span>Đã đọc</span><b style={{ color: C.ink }}>{pct}%</b></span>
          <span style={{ height: 4, borderRadius: 2, background: C.line2, display: "block" }}><span style={{ display: "block", height: 4, borderRadius: 2, background: C.blue, width: `${pct}%`, transition: "width .15s" }} /></span>
        </div>
      )}
    </nav>
  );
}
