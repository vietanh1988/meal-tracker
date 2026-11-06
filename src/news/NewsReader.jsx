// 06/11 (bản vẽ "Đọc bài trong app", màn 3): mở bài web ngay trong app — cùng nội dung trang bài (web tính sẵn, /api/app-post).
// Thẻ trắng lề 12 bo 20: ảnh bìa 16:9 · tên bài 20/900 · "Chủ đề · N phút đọc"; đoạn 15.5/1.65 #334155; tiêu đề 18/900.
// Món trong bài: dòng nền #EEF4FF bo 12 (tên 14/800 · khẩu phần · kcal · nút + 30 GRAD_BLUE) → Ghi bữa tìm sẵn món.
// Link trong bài: bài khác mở tiếp trong app; /calo/ → Ghi bữa; /bai-tap/ → Tập luyện; link ngoài → trình duyệt.
// Đáy: thanh tiến độ đọc 6 px + nút "Bài tiếp: …" (cùng cụm). Kéo tới cuối bài = đánh dấu Đã đọc (không thưởng gì).
import { useEffect, useRef, useState } from "react";
import { SubPage, GRAD_BLUE, Icon, Skel } from "../mobile/ui";
import { ltCard } from "../theme";
import { track } from "../lib/track";
import { ExPhoto, exOf, exTitle, exSub } from "../workout/exLib.jsx";
import { loadPost, markRead, routeOf, ddmm, WEB } from "./newsData";

const P = { fontSize: 15.5, lineHeight: 1.65, color: "#334155", margin: 0 };
const CSS = `.fp-art a{color:#0062F0;font-weight:700;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}
.fp-art b,.fp-art strong{color:#0F172A}.fp-art ul,.fp-art ol{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px}
.fp-art table{border-collapse:collapse;font-size:13.5px;width:max-content;min-width:100%}.fp-art th{background:#F1F5F9;text-align:left;font-weight:800;color:#0F172A}
.fp-art th,.fp-art td{padding:8px 10px;border-bottom:1px solid #E2E8F0;vertical-align:top;line-height:1.45;min-width:96px;max-width:200px}
.fp-art td:first-child{font-weight:700;color:#0F172A}.fp-art details summary{list-style:none;cursor:pointer}.fp-art details summary::-webkit-details-marker{display:none}`;

function FoodRow({ f, onFood }) {
  const por = f.por ? `${f.por.name}${f.por.gram ? ` ${f.por.gram} g` : ""} · ${f.por.cal} kcal` : "";
  return (
    <button type="button" data-testid="news-food" data-name={f.name} onClick={() => onFood(f.name)} className="tap"
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: "#EEF4FF", borderRadius: 12, padding: "9px 12px", border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800 }}>{f.name}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", whiteSpace: "nowrap" }}>{por}</span>
      <span aria-label={`Ghi ${f.name}`} style={{ width: 30, height: 30, borderRadius: 9, background: GRAD_BLUE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.plus(18, 3)}</span>
    </button>
  );
}
const H = ({ html, as: T = "p", style }) => <T style={style} dangerouslySetInnerHTML={{ __html: html || "" }} />; // html đã lọc ở web (lib/sanitize clean)

function Block({ b, onFood, onEx }) {
  switch (b.t) {
    case "p": return <H html={b.html} style={P} />;
    case "h": return b.level === 2 ? <h2 style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.35, color: "#0F172A", margin: "10px 0 0" }}>{b.text}</h2> : <h3 style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4, color: "#0F172A", margin: "4px 0 0" }}>{b.text}</h3>;
    case "list": { const T = b.ordered ? "ol" : "ul"; return <T style={{ ...P }}>{b.items.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: x }} />)}</T>; }
    case "quote": return <H as="blockquote" html={b.html} style={{ ...P, borderLeft: "3px solid #007AFF", background: "#EEF4FF", borderRadius: 12, padding: "10px 12px" }} />;
    case "tip": return <H as="div" html={b.html} style={{ background: "#EEF4FF", borderRadius: 12, padding: "10px 12px", fontSize: 14, lineHeight: 1.55, color: "#1E3A8A", fontWeight: 600 }} />;
    case "img": return (
      <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <img src={b.url} alt={b.alt} loading="lazy" decoding="async" width={b.w || undefined} height={b.h || undefined} style={{ width: "100%", height: "auto", borderRadius: 14, background: "#E0EBFF", display: "block" }} />
        {b.caption && <figcaption style={{ fontSize: 12.5, color: "#64748B", textAlign: "center", lineHeight: 1.45 }}>{b.caption}</figcaption>}
      </figure>
    );
    case "gallery": return (
      <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {b.images.map((im, i) => <figure key={i} style={{ margin: 0, flexShrink: 0, width: b.phone ? 150 : 200, display: "flex", flexDirection: "column", gap: 6 }}><img src={im.url} alt={im.alt} loading="lazy" style={{ width: "100%", height: b.phone ? "auto" : 150, objectFit: "cover", borderRadius: 12, display: "block" }} />{im.caption && <figcaption style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{im.caption}</figcaption>}</figure>)}
      </div>
    );
    case "table": return (
      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #E2E8F0", margin: "0 -2px" }}>
        <table><thead><tr>{b.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} dangerouslySetInnerHTML={{ __html: c }} />)}</tr>)}</tbody></table>
      </div>
    );
    case "food": return <FoodRow f={b.food} onFood={onFood} />;
    case "foods": return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{b.foods.map((f) => <FoodRow key={f.key || f.name} f={f} onFood={onFood} />)}</div>;
    case "ex": { const e = exOf(b.ex); if (!e) return null; return (
      <button type="button" data-testid="news-ex" onClick={() => onEx(b.ex)} className="tap" style={{ display: "flex", alignItems: "center", gap: 12, background: "#EEF4FF", borderRadius: 14, padding: 10, border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
        <ExPhoto ex={e} w={64} h={48} radius={10} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5, fontWeight: 800 }}>{exTitle(e)}</b><span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{exSub(e) ? `${exSub(e)} · ` : ""}Xem cách tập trong app</span></span>
        {Icon.chev(16)}
      </button>
    ); }
    case "faq": return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {b.title && <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0F172A", margin: "10px 0 0" }}>{b.title}</h2>}
        {b.items.map((x, i) => <details key={i} open={i === 0} style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 12px" }}><summary style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", lineHeight: 1.4 }}>{x.q}</summary><p style={{ ...P, fontSize: 14.5, marginTop: 6 }}>{x.a}</p></details>)}
      </div>
    );
    case "yt": return <a href={`https://www.youtube.com/watch?v=${b.id}`} target="_blank" rel="noopener" style={{ fontSize: 14.5, fontWeight: 800, color: "#0062F0" }}>▶ Xem video {b.title ? `“${b.title}”` : ""} trên YouTube</a>;
    case "hr": return <hr style={{ border: 0, borderTop: "1px solid #E2E8F0", margin: "4px 0", width: "100%" }} />;
    default: return null;
  }
}

export function NewsReader({ slug, onBack, onOpenPost, onFood, onEx, onTool }) {
  const [p, setP] = useState(undefined); // undefined = đang tải · null = không có · false = lỗi
  const [pct, setPct] = useState(0);
  const root = useRef(null), end = useRef(null);
  const load = () => { setP(undefined); loadPost(slug).then((d) => setP(d)).catch(() => setP(false)); };
  useEffect(() => { load(); track("news_read_open", { slug }); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  // thanh tiến độ: theo khung cuộn của SubPage
  useEffect(() => {
    if (!p) return undefined;
    let sc = root.current?.parentElement;
    while (sc && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    if (!sc) return undefined;
    const f = () => { const max = sc.scrollHeight - sc.clientHeight; setPct(max > 0 ? Math.min(1, sc.scrollTop / max) : 1); };
    f(); sc.addEventListener("scroll", f, { passive: true });
    return () => sc.removeEventListener("scroll", f);
  }, [p]);
  // tới cuối bài = đã đọc (chỉ đánh dấu)
  useEffect(() => {
    if (!p || !end.current || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { markRead(slug); window.dispatchEvent(new Event("fp-news-read")); track("news_read_end", { slug }); io.disconnect(); } });
    io.observe(end.current);
    return () => io.disconnect();
  }, [p, slug]);
  const onClick = (e) => {
    const a = e.target.closest?.("a[href]");
    if (!a) return;
    e.preventDefault();
    if (a.dataset.ex) { onEx(a.dataset.ex); return; }
    const r = routeOf(a.getAttribute("href"));
    if (r.k === "post") onOpenPost(r.slug);
    else if (r.k === "food") onFood(r.slug ? a.textContent.trim() : "");
    else if (r.k === "ex" || r.k === "lib") onTool("bai-tap");
    else if (r.k === "plan") onTool("giao-an");
    else if (r.k === "goals") onTool("tinh-calo");
    else if (r.k === "pi") onTool("pi");
    else if (r.k === "out") window.open(r.url, "_blank", "noopener");
  };
  const share = async () => {
    const url = `${WEB}/${slug}`;
    track("news_share", { slug });
    try { if (navigator.share) await navigator.share({ title: p?.title, url }); else await navigator.clipboard.writeText(url); } catch { /* người dùng huỷ */ }
  };
  const next = p?.next?.[0];
  return (
    <SubPage title="Đọc bài" subtitle={p ? `${p.cat?.name ? `${p.cat.name} · ` : ""}${p.min} phút đọc` : "Tin giảm cân"} onBack={onBack}
      right={p ? <button type="button" data-testid="news-share" onClick={share} style={{ fontSize: 13, fontWeight: 800, color: "#0062F0", background: "#EEF4FF", height: 32, padding: "0 10px", borderRadius: 10, border: "none", fontFamily: "inherit", marginRight: 8 }}>Chia sẻ</button> : null}
      footer={p && (
        <div style={{ padding: "8px 12px calc(env(safe-area-inset-bottom, 0px) + 10px)", background: "rgba(255,255,255,0.92)", borderTop: "1px solid #EEF2FA" }}>
          <div aria-hidden="true" style={{ height: 6, borderRadius: 99, background: "#E0EBFF", margin: "0 2px 10px", overflow: "hidden" }}><i data-testid="news-progress" style={{ display: "block", width: `${Math.round(pct * 100)}%`, height: "100%", background: "#007AFF", borderRadius: 99, transition: "width .15s" }} /></div>
          {next
            ? <button type="button" data-testid="news-next" onClick={() => onOpenPost(next.slug, true)} style={{ width: "100%", height: 50, borderRadius: 16, border: "none", background: "#EEF4FF", color: "#0057FF", fontSize: 15, fontWeight: 900, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 14px" }}><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Bài tiếp: {next.title}</span>{Icon.next(16)}</button>
            : <button type="button" onClick={onBack} style={{ width: "100%", height: 50, borderRadius: 16, border: "none", background: "#EEF4FF", color: "#0057FF", fontSize: 15, fontWeight: 900, fontFamily: "inherit" }}>Xong</button>}
        </div>
      )}>
      <style>{CSS}</style>
      <div ref={root} data-testid="news-reader" style={{ padding: "14px 0 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {p === undefined && <div style={{ ...ltCard, margin: "0 12px", overflow: "hidden" }}><Skel h={200} r={0} /><div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}><Skel h={20} /><Skel w="70%" h={20} /><Skel h={12} /><Skel h={12} /><Skel w="80%" h={12} /></div></div>}
        {(p === null || p === false) && (
          <div data-testid="news-read-error" style={{ ...ltCard, margin: "0 12px", padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <b style={{ fontSize: 15 }}>{p === null ? "Bài này không còn trên web" : "Không tải được bài"}</b>
            {p === false && <button type="button" onClick={load} style={{ height: 40, padding: "0 18px", borderRadius: 12, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 14, fontWeight: 800, fontFamily: "inherit" }}>Thử lại</button>}
          </div>
        )}
        {p && <>
          <article className="fp-art" onClick={onClick} style={{ ...ltCard, margin: "0 12px", overflow: "hidden" }}>
            {p.cover && <img src={p.cover} alt={p.cover_alt || ""} style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", background: "#E0EBFF" }} />}
            <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              <h1 data-testid="news-title" style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.3, color: "#0F172A", margin: 0 }}>{p.title}</h1>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748B", marginTop: -4 }}>{[p.author, p.updated ? `Cập nhật ${ddmm(p.updated)}` : ""].filter(Boolean).join(" · ")}</span>
              {p.blocks.map((b, i) => <Block key={i} b={b} onFood={onFood} onEx={onEx} />)}
              {p.foods?.length > 0 && <>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: "#0F172A", margin: "10px 0 0" }}>Calo các món nhắc trong bài</h2>
                <div data-testid="news-foods" style={{ display: "flex", flexDirection: "column", gap: 8 }}>{p.foods.map((f) => <FoodRow key={f.key || f.name} f={f} onFood={onFood} />)}</div>
              </>}
              <span ref={end} aria-hidden="true" style={{ height: 1 }} />
            </div>
          </article>
          {p.next?.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <b style={{ fontSize: 17, fontWeight: 900, margin: "4px 16px 0" }}>Đọc tiếp{p.cat?.name ? ` trong ${p.cat.name}` : ""}</b>
              <div style={{ ...ltCard, margin: "0 12px", padding: "2px 14px" }}>
                {p.next.map((x, i) => (
                  <button key={x.slug} type="button" data-testid="news-rel" onClick={() => onOpenPost(x.slug, true)} className="tap" style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", padding: "11px 0", border: "none", borderBottom: i === p.next.length - 1 ? "none" : "1px solid #EEF2FA", background: "transparent", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
                    {x.cover ? <img src={x.cover} alt="" loading="lazy" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} /> : null}
                    <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}><span style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.title}</span><span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{x.min} phút đọc</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>}
      </div>
    </SubPage>
  );
}
