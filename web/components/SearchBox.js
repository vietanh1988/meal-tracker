"use client";
// 31/10 (chủ dự án: "bấm tìm kiếm phải nhảy sang trang khác; cho gõ luôn, gõ tới đâu kết quả ra tới đó, không chuyển trang"):
// bấm kính lúp trên đầu trang → khung tìm thả xuống ngay dưới thanh đầu trang (máy tính: khung 560 px canh phải; điện thoại: phủ ngang màn
// như menu mobile), con trỏ vào ô gõ sẵn. Gõ ≥ 2 ký tự → sau 250 ms gọi /api/tim → 2 nhóm Món ăn (kèm calo) · Bài viết.
// ↑/↓ chọn dòng, Enter mở dòng đang chọn (không chọn → trang /tim-kiem đầy đủ), Esc / bấm nền / bấm lại kính lúp là đóng.
// Menu mobile có dòng "Tìm món, bài viết" → mở khung này (sự kiện fp:search).
import { useEffect, useRef, useState } from "react";

const ico = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

export default function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null); // { q, foods, posts }
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(-1);
  const inp = useRef(null), ctl = useRef(null), tm = useRef(0);

  useEffect(() => {
    const o = () => setOpen(true);
    window.addEventListener("fp:search", o);
    return () => window.removeEventListener("fp:search", o);
  }, []);
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inp.current?.focus(), 30);
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open]);
  useEffect(() => {
    clearTimeout(tm.current); ctl.current?.abort?.();
    const s = q.trim();
    if (s.length < 2) { setRes(null); setBusy(false); setSel(-1); return; }
    setBusy(true);
    tm.current = setTimeout(async () => {
      const c = new AbortController(); ctl.current = c;
      try {
        const r = await fetch(`/api/tim?q=${encodeURIComponent(s)}`, { signal: c.signal });
        const d = await r.json();
        setRes(d); setSel(-1);
      } catch (e) { if (e.name !== "AbortError") setRes({ q: s, foods: [], posts: [], err: true }); }
      finally { if (ctl.current === c) setBusy(false); }
    }, 250);
  }, [q]);

  const rows = res ? [...res.foods.map((f) => ({ href: `/calo/${f.s}`, f })), ...res.posts.map((p) => ({ href: `/${p.s}`, p }))] : [];
  const full = `/tim-kiem?q=${encodeURIComponent(q.trim())}`;
  const go = (href) => { window.location.href = href; };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(rows.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(-1, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (sel >= 0 && rows[sel]) go(rows[sel].href); else if (q.trim()) go(full); }
  };
  let ix = -1;
  const item = (r, body) => { ix += 1; const i = ix; return <a key={r.href} href={r.href} className={`sb-row${sel === i ? " on" : ""}`} onMouseEnter={() => setSel(i)} data-testid="web-search-row">{body}</a>; };
  const s = q.trim();
  return (
    <div className={`sb${open ? " on" : ""}`}>
      <button type="button" className="sb-btn" aria-label={open ? "Đóng tìm kiếm" : "Tìm kiếm"} aria-expanded={open} aria-controls="sb-panel" onClick={() => setOpen(!open)} data-testid="web-search-btn">{ico}</button>
      <div className="sb-bg" onClick={() => setOpen(false)} aria-hidden="true" />
      <div id="sb-panel" className="sb-panel" role="search" aria-hidden={!open}>
        <div className="sb-field">
          {ico}
          <input ref={inp} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Tìm món ăn, bài viết…" aria-label="Tìm món ăn, bài viết" autoComplete="off" enterKeyHint="search" data-testid="web-search-input" />
          {busy && <span className="sb-spin" aria-hidden="true" />}
          {q && <button type="button" className="sb-x" aria-label="Xoá chữ đã gõ" onClick={() => { setQ(""); inp.current?.focus(); }}>×</button>}
        </div>
        <div className="sb-body" data-testid="web-search-results" data-ready={res && res.q === s ? "1" : undefined}>
          {s.length < 2 && <p className="sb-hint">Gõ tên món (ví dụ: phở, cơm tấm) hoặc chủ đề bài viết.</p>}
          {res && res.q === s && rows.length === 0 && <p className="sb-hint">{res.err ? "Chưa tìm được, kiểm tra mạng rồi thử lại." : `Không thấy kết quả cho “${s}”.`}</p>}
          {res && res.foods.length > 0 && <><b className="sb-h">Món ăn</b>{res.foods.map((f) => item({ href: `/calo/${f.s}` }, <><span className="sb-t"><b>{f.n}</b><small>{f.sub}</small></span><b className="sb-cal">{f.cal} kcal</b></>))}</>}
          {res && res.posts.length > 0 && <><b className="sb-h">Bài viết</b>{res.posts.map((p) => item({ href: `/${p.s}` }, <>{p.img ? <img src={p.img} alt="" width={48} height={48} loading="lazy" className="sb-img" /> : <span className="sb-img" />}<span className="sb-t"><b>{p.t}</b>{p.c && <small>{p.c}</small>}</span></>))}</>}
          {s.length >= 2 && <a href={full} className="sb-all" data-testid="web-search-all">Xem tất cả kết quả cho “{s}” →</a>}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
.sb-btn{width:40px;height:40px;border:0;border-radius:12px;background:transparent;color:#334155;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation}
.sb-btn:hover,.sb.on .sb-btn{background:#F1F5F9;color:#0062F0}
.sb-bg{position:fixed;left:0;right:0;top:64px;bottom:0;background:rgba(15,23,42,.38);opacity:0;pointer-events:none;transition:opacity .25s;z-index:41}
.sb.on .sb-bg{opacity:1;pointer-events:auto}
.sb-panel{position:absolute;right:max(16px,calc((100vw - 1200px)/2));top:72px;width:560px;max-width:calc(100vw - 32px);background:#fff;border:1px solid #E6ECF5;border-radius:16px;box-shadow:0 18px 40px rgba(15,23,42,.18);z-index:42;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .2s,transform .25s cubic-bezier(.2,.8,.2,1),visibility 0s .25s;overflow:hidden}
.sb.on .sb-panel{opacity:1;visibility:visible;transform:none;transition:opacity .2s,transform .25s cubic-bezier(.2,.8,.2,1),visibility 0s}
.sb-field{display:flex;align-items:center;gap:10px;height:56px;padding:0 14px;border-bottom:1px solid #EEF2F7;color:#64748B}
.sb-field input{flex:1;min-width:0;height:100%;border:0;outline:0;font:inherit;font-size:16px;color:#0F172A;background:transparent}
.sb-field input::-webkit-search-cancel-button{display:none}
.sb-x{width:32px;height:32px;border:0;border-radius:10px;background:#F1F5F9;color:#475569;font-size:20px;line-height:1;cursor:pointer}
.sb-spin{width:16px;height:16px;border-radius:50%;border:2px solid #CBD5E1;border-top-color:#0062F0;animation:sbs .7s linear infinite}
@keyframes sbs{to{transform:rotate(360deg)}}
.sb-body{max-height:min(520px,calc(100dvh - 160px));overflow-y:auto;overscroll-behavior:contain;padding:6px 8px 10px}
.sb-hint{margin:0;padding:14px 8px;font-size:14px;color:#64748B}
.sb-h{display:block;padding:12px 8px 6px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748B}
.sb-row{display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:12px;color:#0F172A}
.sb-row.on,.sb-row:hover{background:#F1F5F9}
.sb-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.sb-t b{font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-t small{font-size:13px;color:#64748B}
.sb-cal{font-size:15px;color:#0062F0;white-space:nowrap}
.sb-img{width:48px;height:48px;flex-shrink:0;border-radius:10px;object-fit:cover;background:#EEF2F7}
.sb-all{display:block;margin-top:6px;padding:12px 8px;border-top:1px solid #EEF2F7;font-size:14px;font-weight:700;color:#0062F0}
@media(max-width:720px){
.sb-btn{width:44px;height:44px}
.sb-bg{top:56px}
.sb-panel{left:0;right:0;top:56px;width:auto;max-width:none;border:0;border-radius:0 0 20px 20px}
.sb-body{max-height:calc(100dvh - 140px)}
}
@media(prefers-reduced-motion:reduce){.sb *,.sb{transition:none!important;animation:none!important}}
` }} />
    </div>
  );
}
