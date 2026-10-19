"use client";
// Menu mobile: nút 3 gạch ↔ dấu X, khung menu trượt xuống + mờ nền, từng dòng hiện lần lượt. Bấm nền / link / Esc là đóng, mở thì khoá cuộn trang.
import { useEffect, useState } from "react";

const la = (it) => { const rel = [it.new_tab && "noopener", it.nofollow && "nofollow"].filter(Boolean).join(" "); return { ...(it.new_tab ? { target: "_blank" } : {}), ...(rel ? { rel } : {}), ...(it.title ? { title: it.title } : {}) }; };

export default function MobileMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(-1);
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k);
    const o = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.documentElement.style.overflow = o; };
  }, [open]);
  const close = () => setOpen(false);
  let n = 0; // thứ tự hiện lần lượt
  return (
    <div className={`mm only-m${open ? " on" : ""}`}>
      <button type="button" className="mm-btn" aria-label={open ? "Đóng menu" : "Mở menu"} aria-expanded={open} aria-controls="mm-panel" onClick={() => setOpen(!open)} data-testid="web-mnav">
        <span /><span /><span />
      </button>
      <div className="mm-bg" onClick={close} aria-hidden="true" />
      <nav id="mm-panel" className="mm-panel" aria-label="Menu" aria-hidden={!open}>
        {items.map((it, i) => {
          const kids = it.children || [];
          return (
            <div key={i + it.url} className="mm-it" style={{ "--d": `${60 + 35 * n++}ms` }}>
              <span className="mm-row">
                <a href={it.url} {...la(it)} onClick={close}>{it.label}</a>
                {kids.length > 0 && <button type="button" className={`mm-car${sub === i ? " up" : ""}`} aria-label={`Mục con của ${it.label}`} aria-expanded={sub === i} onClick={() => setSub(sub === i ? -1 : i)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></button>}
              </span>
              {kids.length > 0 && <div className={`mm-sub${sub === i ? " show" : ""}`}><div>{kids.map((c, k) => <a key={k + c.url} href={c.url} {...la(c)} onClick={close}>{c.label}</a>)}</div></div>}
            </div>
          );
        })}
        <a href="/tim-kiem" className="mm-it mm-search" style={{ "--d": `${60 + 35 * n++}ms` }} onClick={close}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>Tìm món, bài viết
        </a>
      </nav>
      <style dangerouslySetInnerHTML={{ __html: `
.mm{display:none}
@media(max-width:720px){.mm{display:block}}
.mm-btn{position:relative;z-index:3;width:40px;height:40px;border:0;border-radius:12px;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;transition:background .2s;-webkit-tap-highlight-color:transparent}
.mm-btn:active{background:#EEF4FF}
.mm-btn span{display:block;width:20px;height:2px;border-radius:2px;background:#0F172A;transition:transform .32s cubic-bezier(.4,0,.2,1),opacity .2s,background .2s}
.mm.on .mm-btn span{background:#0062F0}
.mm.on .mm-btn span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.mm.on .mm-btn span:nth-child(2){opacity:0;transform:scaleX(.3)}
.mm.on .mm-btn span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.mm-bg{position:fixed;left:0;right:0;top:56px;bottom:0;background:rgba(15,23,42,.38);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .3s}
.mm.on .mm-bg{opacity:1;pointer-events:auto}
.mm-panel{position:absolute;left:0;right:0;top:56px;max-height:calc(100dvh - 56px);overflow-y:auto;overscroll-behavior:contain;background:#fff;border-radius:0 0 20px 20px;box-shadow:0 18px 40px rgba(15,23,42,.16);padding:6px 16px 18px;transform:translateY(-12px);opacity:0;visibility:hidden;clip-path:inset(0 0 100% 0);transition:transform .34s cubic-bezier(.2,.8,.2,1),opacity .24s,clip-path .38s cubic-bezier(.2,.8,.2,1),visibility 0s .38s}
.mm.on .mm-panel{transform:none;opacity:1;visibility:visible;clip-path:inset(0 0 0 0);transition:transform .34s cubic-bezier(.2,.8,.2,1),opacity .24s,clip-path .38s cubic-bezier(.2,.8,.2,1),visibility 0s}
.mm-it{opacity:0;transform:translateY(-6px);transition:opacity .25s,transform .3s cubic-bezier(.2,.8,.2,1)}
.mm.on .mm-it{opacity:1;transform:none;transition-delay:var(--d)}
.mm-row{display:flex;align-items:center;border-bottom:1px solid #EEF2F7}
.mm-row>a{flex:1;display:block;padding:15px 4px;font-size:17px;font-weight:700;color:#0F172A}
.mm-row>a:active{color:#0062F0}
.mm-car{width:40px;height:40px;border:0;border-radius:10px;background:#F1F5F9;color:#475569;display:flex;align-items:center;justify-content:center;cursor:pointer}
.mm-car svg{transition:transform .25s}
.mm-car.up{background:#E8F1FF;color:#0062F0}.mm-car.up svg{transform:rotate(180deg)}
.mm-sub{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s cubic-bezier(.2,.8,.2,1)}
.mm-sub.show{grid-template-rows:1fr}
.mm-sub>div{overflow:hidden}
.mm-sub a{display:block;padding:12px 4px 12px 18px;font-size:15.5px;font-weight:600;color:#475569;border-bottom:1px solid #EEF2F7}
.mm-search{display:flex!important;gap:10px;align-items:center;margin-top:12px;height:48px;padding:0 14px;border-radius:14px;background:#F1F5F9;font-size:15.5px;font-weight:600;color:#475569}
@media(prefers-reduced-motion:reduce){.mm *,.mm{transition:none!important}}
` }} />
    </div>
  );
}
