"use client";
// Mục lục trang Điều khoản / Chính sách (139w/x): mục đang đọc tô xanh, dính khi cuộn (PC)
import { useEffect, useState } from "react";
export default function LegalToc({ t }) {
  const [on, setOn] = useState(t[0]?.id);
  useEffect(() => {
    const els = t.map((x) => document.getElementById(x.id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setOn(v.target.id); }, { rootMargin: "-90px 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [t]);
  return (
    <nav aria-label="Mục lục" className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 4 }}>
      <b style={{ fontSize: 16, padding: "0 8px 8px" }}>Mục lục</b>
      {t.map((x) => { const a = x.id === on; return <a key={x.id} href={`#${x.id}`} aria-current={a ? "true" : undefined} style={{ fontSize: 14.5, padding: "8px 10px", paddingLeft: x.level === 3 ? 24 : 10, borderRadius: 8, ...(a ? { background: "#E8F0FF", color: "#0062F0", fontWeight: 700 } : { color: "#475569" }) }}>{x.text}</a>; })}
    </nav>
  );
}
