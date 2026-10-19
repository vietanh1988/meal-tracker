// Quản trị PC › WEB › Trang › Sửa trang tại chỗ (bản vẽ 138d) — sửa trang chủ ngay trên bản xem trước:
//  bấm vào chữ (huy hiệu, tiêu đề H1, dòng mô tả, nút) để gõ; bấm ảnh → khung phải đổi ảnh (thư viện / tải mới), mô tả ảnh, ảnh riêng cho điện thoại;
//  cột trái: ẩn / hiện + kéo đổi thứ tự khối. Lưu nháp = web_settings.page_home_draft · Đăng = page_home (giữ 10 lần đăng gần nhất ở page_home_hist).
// Màu, cỡ chữ, khoảng cách do giao diện web quyết định — ở đây chỉ đổi chữ, ảnh, link, ẩn / hiện khối.
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { Btn, Loading, secLbl } from "../pcUI";
import { Field, Tog, Modal, inpStyle, BLUE } from "./webUI";
import { Upload } from "./BlockEdit";
import { MediaPick } from "./MediaPick";
import { HOME_HERO, HOME_SECTIONS, HOME_SECTION_NAME, HOME_FAQ, HOME_TEXT_FIELDS } from "../../../web/lib/home.js";

const WEB = "https://fipilotai.com";
const must = ({ data, error }) => { if (error) throw error; return data; };
const OUT = { boxShadow: "0 0 0 2px #1A7CFF", borderRadius: 6 };
const PAGES = [["home", "Trang chủ", "/"], ["pricing", "Bảng giá", "/bang-gia", "web_settings"], ["about", "Giới thiệu", "/gioi-thieu", "web_pages"], ["install", "Cài app lên điện thoại", "/cai-app", null], ["contact", "Liên hệ", "/lien-he", "web_settings"], ["footer", "Chân trang (mọi trang)", "", "web_settings"], ["bar", "Thanh trên (mọi trang)", "", "web_settings"]];
const fmt = (iso) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
const base = () => ({ hero: { ...HOME_HERO }, sections: HOME_SECTIONS.map((id) => ({ id, on: true })) });
const norm = (v) => { const b = base(); const secs = [...(v?.sections || []).filter((x) => HOME_SECTIONS.includes(x.id))]; for (const id of HOME_SECTIONS) if (!secs.some((x) => x.id === id)) secs.push({ id, on: true }); return { hero: { ...b.hero, ...(v?.hero || {}) }, sections: secs, ...(v?.faq?.length ? { faq: v.faq } : {}), ...(v?.text ? { text: v.text } : {}) }; };

// Chữ sửa ngay trên trang: Enter = xuống dòng (chỉ ở tiêu đề), dán chỉ lấy chữ trơn
function Ed({ value, onChange, onFocus, multi, style, testid, sel }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; const txt = multi ? String(value || "").replace(/\n/g, "<br>") : String(value || ""); if (el && document.activeElement !== el && el.innerHTML !== txt) el[multi ? "innerHTML" : "textContent"] = multi ? txt : value || ""; }, [value, multi]);
  return <span ref={ref} contentEditable suppressContentEditableWarning data-testid={testid} onFocus={onFocus}
    onInput={(e) => onChange(multi ? e.currentTarget.innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ") : e.currentTarget.textContent)}
    onKeyDown={(e) => { if (e.key === "Enter" && !multi) e.preventDefault(); }}
    onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
    style={{ outline: "none", cursor: "text", ...(sel ? OUT : {}), ...style }} />;
}

export function PcWebPageBuilder({ top, showToast, onBack, go }) {
  const [v, setV] = useState(null);
  const [live, setLive] = useState(null);
  const [hist, setHist] = useState([]);
  const [sel, setSel] = useState("title"); // badge | title | sub | btn1 | btn2 | note | img1 | img2
  const [dev, setDev] = useState("pc");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [pick, setPick] = useState(null); // "img1" | "img2" | "img1_m"
  const [showHist, setShowHist] = useState(false);
  const [drag, setDrag] = useState(null);
  const [trial, setTrial] = useState(7); // số ngày dùng thử thật của app → thay %trial% khi xem trước
  useEffect(() => { supabase.from("subscription_settings").select("trial_days").eq("id", 1).maybeSingle().then(({ data }) => data?.trial_days > 0 && setTrial(data.trial_days)); }, []);
  useEffect(() => { (async () => {
    try {
      const rows = await supabase.from("web_settings").select("key,value").in("key", ["page_home", "page_home_draft", "page_home_hist"]).then(must);
      const g = (k) => rows.find((r) => r.key === k)?.value;
      setLive(norm(g("page_home"))); setV(norm(g("page_home_draft") || g("page_home"))); setHist(g("page_home_hist")?.list || []);
    } catch (e) { showToast?.("Chưa tải được trang chủ: " + e.message); setV(base()); setLive(base()); }
  })(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);
  const H = v?.hero || {};
  const setH = (patch) => { setV((x) => ({ ...x, hero: { ...x.hero, ...patch } })); setDirty(true); };
  const setSec = (secs) => { setV((x) => ({ ...x, sections: secs })); setDirty(true); };
  const save = async (publish) => {
    if (publish && (!H.img1_alt?.trim() || !H.img2_alt?.trim())) return showToast?.("Điền mô tả ảnh (alt) cho cả 2 ảnh banner trước khi đăng.");
    if (!H.title?.trim() || !H.btn1?.trim()) return showToast?.("Tiêu đề và chữ nút chính không được để trống.");
    setBusy(publish ? "pub" : "draft");
    try {
      const now = new Date().toISOString();
      const up = [{ key: "page_home_draft", value: v, updated_at: now }];
      if (publish) { const list = [{ at: now, value: v }, ...hist].slice(0, 10); up.push({ key: "page_home", value: v, updated_at: now }, { key: "page_home_hist", value: { list }, updated_at: now }); setHist(list); setLive(v); }
      await supabase.from("web_settings").upsert(up, { onConflict: "key" }).then(must);
      setDirty(false); showToast?.(publish ? "Đã đăng trang chủ. Web đổi theo trong khoảng 1 phút." : "Đã lưu nháp — web chưa đổi, bấm Đăng khi xong.");
    } catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy("");
  };
  const back = async () => { if (dirty && !(await appConfirm("Có thay đổi chưa lưu. Bỏ thay đổi?"))) return; setDirty(false); onBack(); };
  const openPage = async (p) => { if (p[0] === "home") return; if (!p[3]) return window.open(WEB + p[2], "_blank", "noopener"); if (dirty && !(await appConfirm("Có thay đổi chưa lưu ở trang chủ. Bỏ thay đổi?"))) return; setDirty(false); go?.(p[3]); };
  if (!v) return <>{top(null, "Sửa trang · Trang chủ")}<Loading /></>;
  const m = dev === "m";
  const draftDiff = JSON.stringify(v) !== JSON.stringify(live);
  const btnSt = (b) => ({ height: m ? 44 : 36, padding: "0 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", ...(b ? { background: "#FFF", border: "1.5px solid #BFD4FF", color: BLUE } : { background: "linear-gradient(180deg,#1A7CFF,#0062F0)", color: "#FFF" }) });
  const imgBox = (k, style) => <button type="button" onClick={() => setSel(k)} data-testid={`web-pb-${k}`} style={{ position: "absolute", padding: 0, border: 0, background: "none", cursor: "pointer", ...style }}><img src={H[k] || `${WEB}/img/${k === "img1" ? "app-today" : "app-menu"}.webp`} alt={H[`${k}_alt`] || ""} style={{ width: "100%", borderRadius: 14, border: "4px solid #0F172A", display: "block" }} /></button>;
  const label = (t, c = "#1A7CFF", right) => <span style={{ position: "absolute", top: -26, [right ? "right" : "left"]: 0, height: 22, display: "flex", alignItems: "center", gap: 6, background: c, color: "#FFF", borderRadius: 6, padding: "0 8px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", zIndex: 2 }}>{t}</span>;
  const TXT = { badge: "Huy hiệu", title: "Tiêu đề H1", sub: "Dòng mô tả", btn1: "Nút chính", btn2: "Nút phụ", note: "Dòng nhỏ dưới nút" };
  return (
    <>
      {top(<span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ display: "flex", padding: 3, background: "#F1F5F9", borderRadius: 10 }}>{[["pc", "Máy tính"], ["m", "Điện thoại"]].map(([k, t]) => <button key={k} type="button" onClick={() => setDev(k)} data-testid={`web-pb-dev-${k}`} style={{ height: 28, padding: "0 12px", borderRadius: 8, border: 0, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800, background: dev === k ? "#FFF" : "transparent", color: dev === k ? PC.t1 : PC.t3, boxShadow: dev === k ? "0 1px 3px rgba(15,23,42,.12)" : "none" }}>{t}</button>)}</span>
        <Btn kind="light" onClick={() => setShowHist(true)} disabled={!hist.length}>↶ Lịch sử</Btn>
        <Btn kind="soft" onClick={() => save(false)} disabled={!!busy || !dirty} testid="web-pb-draft">{busy === "draft" ? "Đang lưu…" : "Lưu nháp"}</Btn>
        <Btn kind="blue" onClick={() => save(true)} disabled={!!busy || (!dirty && !draftDiff)} testid="web-pb-publish">{busy === "pub" ? "Đang đăng…" : "Đăng"}</Btn>
      </span>, "Sửa trang · Trang chủ", "Bấm vào chữ, ảnh, nút trên trang để sửa · bố cục giữ nguyên")}
      <div style={{ display: "flex", minHeight: 840 }}>
        <aside style={{ width: 220, flexShrink: 0, background: "#FFF", borderRight: `1px solid ${PC.line}`, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ ...secLbl, padding: "0 8px 8px 8px" }}>TRANG</span>
          {PAGES.map((p) => <button key={p[0]} type="button" onClick={() => openPage(p)} title={p[0] === "home" ? "" : "Mở chỗ sửa trang này"} style={{ display: "flex", flexDirection: "column", padding: "8px 10px", borderRadius: 10, border: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", background: p[0] === "home" ? PC.soft : "transparent" }}><b style={{ fontSize: 13, color: p[0] === "home" ? BLUE : PC.t1 }}>{p[1]}</b>{p[2] && <span style={{ fontSize: 11.5, color: PC.t4 }}>{p[2]}</span>}</button>)}
          <span style={{ ...secLbl, padding: "16px 8px 8px 8px" }}>KHỐI TRÊN TRANG</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 12.5, borderRadius: 8, background: "#F8FAFD" }}><span style={{ color: PC.t4, opacity: 0.4 }}>⋮⋮</span><span style={{ flex: 1 }}>Banner</span><span title="Banner luôn hiện" style={{ color: PC.t4 }}>👁</span></span>
          {v.sections.map((x, i) => (
            <span key={x.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag == null || drag === i) return; const n = [...v.sections]; const [it] = n.splice(drag, 1); n.splice(i, 0, it); setSec(n); setDrag(null); }} data-testid="web-pb-sec"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", fontSize: 12.5, borderRadius: 8, cursor: "grab", opacity: drag === i ? 0.5 : 1 }}>
              <span style={{ color: PC.t4 }}>⋮⋮</span><span style={{ flex: 1, color: x.on ? PC.t1 : PC.t4, textDecoration: x.on ? "none" : "line-through" }}>{HOME_SECTION_NAME[x.id]}</span>
              {HOME_TEXT_FIELDS[x.id] && <button type="button" title="Sửa chữ của khối này" data-testid={`web-pb-txt-${x.id}`} onClick={() => setSel(`t:${x.id}`)} style={{ border: 0, background: "none", cursor: "pointer", padding: 0, fontSize: 11.5, color: sel === `t:${x.id}` ? BLUE : PC.t3, fontWeight: 800 }}>Chữ</button>}
              {x.id === "pricing" && <button type="button" title="Sửa câu hỏi thường gặp" data-testid="web-pb-faq" onClick={() => setSel("faq")} style={{ border: 0, background: "none", cursor: "pointer", padding: 0, fontSize: 12, color: BLUE, fontWeight: 800 }}>✎</button>}
              <button type="button" title={x.on ? "Đang hiện · bấm để ẩn" : "Đang ẩn · bấm để hiện"} data-testid={`web-pb-eye-${x.id}`} onClick={() => setSec(v.sections.map((y, k) => (k === i ? { ...y, on: !y.on } : y)))} style={{ border: 0, background: "none", cursor: "pointer", padding: 0, fontSize: 13, color: x.on ? PC.t2 : PC.t4, opacity: x.on ? 1 : 0.45 }}>👁</button>
            </span>
          ))}
          <span style={{ padding: "8px 10px", fontSize: 11.5, lineHeight: 1.45, color: PC.t4 }}>Kéo ⋮⋮ để đổi thứ tự · 👁 ẩn / hiện</span>
        </aside>
        <div style={{ flex: 1, minWidth: 0, padding: 20, background: "#E9EEF6", display: "flex", justifyContent: "center" }}>
          <div style={{ width: m ? 390 : "100%", maxWidth: "100%", borderRadius: 14, overflow: "hidden", background: "#FFF", boxShadow: "0 10px 30px rgba(15,23,42,.12)", alignSelf: "flex-start" }}>
            <div style={{ height: 30, background: "#F1F5F9", display: "flex", alignItems: "center", gap: 6, padding: "0 12px", fontSize: 11.5, color: PC.t3 }}><span style={{ width: 9, height: 9, borderRadius: 5, background: "#F87171" }} /><span style={{ width: 9, height: 9, borderRadius: 5, background: "#FBBF24" }} /><span style={{ width: 9, height: 9, borderRadius: 5, background: "#34D399" }} /><span style={{ marginLeft: 10 }}>fipilotai.com · {draftDiff ? "xem trước bản nháp" : "giống bản đang chạy"}</span></div>
            <div style={{ background: `linear-gradient(${m ? "180deg" : "90deg"},rgba(243,247,252,.96) 0%,rgba(243,247,252,.82) ${m ? 46 : 32}%,rgba(243,247,252,0) ${m ? 70 : 60}%),url(${H.bg || `${WEB}/img/home/hero-bg.webp`}) right ${m ? "bottom" : "30%"}/cover no-repeat #EEF3F8`, padding: m ? "34px 18px 24px" : "40px 32px 30px 32px", display: "flex", flexDirection: m ? "column" : "row", gap: 18, alignItems: m ? "stretch" : "center", position: "relative", ...(sel === "bg" ? { boxShadow: "inset 0 0 0 3px #F59E0B" } : {}) }}>
              <button type="button" onClick={() => setSel("bg")} data-testid="web-pb-bg" title="Đổi ảnh nền banner" style={{ position: "absolute", right: 10, top: 10, zIndex: 3, height: 28, padding: "0 10px", borderRadius: 8, border: 0, background: "rgba(15,23,42,.72)", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🖼 Ảnh nền</button>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
                <span style={{ position: "relative", alignSelf: "flex-start", marginBottom: 14 }}>{sel === "badge" && label(`${TXT.badge}${/%trial%/.test(H.badge || "") ? ` · %trial% = ${trial} ngày dùng thử` : ""}`)}<Ed value={H.badge} onChange={(x) => setH({ badge: x })} onFocus={() => setSel("badge")} sel={sel === "badge"} testid="web-pb-badge" style={{ display: "inline-block", minWidth: 40, fontSize: 11, fontWeight: 700, background: "#E8F0FF", color: BLUE, borderRadius: 10, padding: "3px 9px" }} /></span>
                <div style={{ position: "relative", padding: "2px 6px", margin: "0 -6px", ...(sel === "title" ? OUT : {}) }}>
                  {sel === "title" && label(`${TXT.title} · đang sửa · ${String(H.title || "").replace(/\n/g, " ").length}/60 ký tự`)}
                  <Ed multi value={H.title} onChange={(x) => setH({ title: x })} onFocus={() => setSel("title")} testid="web-pb-title" style={{ display: "block", fontSize: m ? 26 : 28, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-.02em" }} />
                </div>
                <span style={{ position: "relative" }}>{sel === "sub" && label(TXT.sub)}<Ed value={H.sub} onChange={(x) => setH({ sub: x })} onFocus={() => setSel("sub")} sel={sel === "sub"} testid="web-pb-sub" style={{ display: "block", fontSize: 13.5, lineHeight: 1.6, color: "#475569", ...(sel === "sub" ? {} : { borderRadius: 6, boxShadow: "0 0 0 1px dashed #BFD4FF" }) }} /></span>
                <span style={{ display: "flex", gap: 8, flexDirection: m ? "column" : "row", position: "relative" }}>
                  {["btn1", "btn2"].map((k) => <span key={k} style={{ position: "relative", display: "flex" }}>{sel === k && label(TXT[k])}<span onClick={() => setSel(k)} data-testid={`web-pb-${k}`} style={{ ...btnSt(k === "btn2"), flex: 1, cursor: "pointer", ...(sel === k ? { boxShadow: "0 0 0 2px #1A7CFF, 0 0 0 4px #FFF" } : {}), ...(k === "btn2" && !H.btn2 ? { opacity: 0.4, borderStyle: "dashed" } : {}) }}>{H[k] || "+ Nút phụ"}</span></span>)}
                </span>
                <span style={{ position: "relative" }}>{sel === "note" && label(TXT.note)}<Ed value={H.note} onChange={(x) => setH({ note: x })} onFocus={() => setSel("note")} sel={sel === "note"} testid="web-pb-note" style={{ display: "block", minHeight: 16, fontSize: 11.5, color: "#64748B" }} /></span>
              </div>
              <div style={{ position: "relative", width: m ? "100%" : 230, height: m ? 220 : 230, flexShrink: 0 }}>
                {(sel === "img1" || sel === "img2") && label("Ảnh · đã chọn", "#F59E0B", true)}
                {imgBox("img1", { left: m ? "18%" : 14, top: 8, width: 104, zIndex: 1, ...(sel === "img1" ? { boxShadow: "0 0 0 3px #F59E0B", borderRadius: 16 } : {}) })}
                {imgBox("img2", { right: m ? "18%" : 12, top: 30, width: 96, ...(sel === "img2" ? { boxShadow: "0 0 0 3px #F59E0B", borderRadius: 16 } : {}) })}
              </div>
            </div>
            {v.sections.map((x) => <div key={x.id} style={{ padding: "14px 36px", display: "flex", alignItems: "center", gap: 10, borderTop: `1px dashed ${PC.field}`, color: x.on ? PC.t3 : PC.t4, fontSize: 12, textDecoration: x.on ? "none" : "line-through" }}>▤ Khối “{HOME_SECTION_NAME[x.id]}”{x.on ? "" : " · đang ẩn"}<span style={{ marginLeft: "auto", fontSize: 11.5 }}>nội dung khối lấy từ kho món / bài viết / bảng giá</span></div>)}
          </div>
        </div>
        <aside style={{ width: 300, flexShrink: 0, background: "#FFF", borderLeft: `1px solid ${PC.line}`, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {String(sel || "").startsWith("t:") ? <>
            <b style={{ fontSize: 14 }}>Chữ khối · {HOME_SECTION_NAME[sel.slice(2)]}</b>
            <span style={{ fontSize: 12, lineHeight: 1.45, color: PC.t3 }}>Để trống ô nào thì web dùng chữ mặc định (chữ mờ trong ô). Gõ %trial% = {trial} ngày dùng thử.</span>
            {HOME_TEXT_FIELDS[sel.slice(2)].map(([k, label, def]) => <Field key={k} label={label}>{/_x$|_sub$|_tip$/.test(k) ? <textarea value={v.text?.[k] || ""} placeholder={def} onChange={(e) => { setV((y) => ({ ...y, text: { ...(y.text || {}), [k]: e.target.value } })); setDirty(true); }} data-testid={`web-pb-t-${k}`} className="pc-input" style={{ ...inpStyle(), height: 58, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.5 }} /> : <input value={v.text?.[k] || ""} placeholder={def} onChange={(e) => { setV((y) => ({ ...y, text: { ...(y.text || {}), [k]: e.target.value } })); setDirty(true); }} data-testid={`web-pb-t-${k}`} className="pc-input" style={{ ...inpStyle(32), fontSize: 12.5 }} />}</Field>)}
            {HOME_TEXT_FIELDS[sel.slice(2)].some(([k]) => v.text?.[k]) && <Btn kind="light" style={{ height: 30, fontSize: 12, alignSelf: "flex-start" }} onClick={() => { setV((y) => ({ ...y, text: Object.fromEntries(Object.entries(y.text || {}).filter(([k]) => !HOME_TEXT_FIELDS[sel.slice(2)].some(([f]) => f === k))) })); setDirty(true); }}>Về chữ mặc định</Btn>}
          </> : sel === "faq" ? <>
            <b style={{ fontSize: 14 }}>Hỏi đáp trên trang chủ</b>
            <span style={{ fontSize: 12, lineHeight: 1.45, color: PC.t3 }}>Hiện cạnh bảng giá và gắn schema Hỏi đáp cho Google. Gõ %trial% = {trial} ngày dùng thử. Giá gói lấy từ Gói cước & giới hạn của app.</span>
            {(v.faq || HOME_FAQ).map((x, i) => { const list = v.faq || HOME_FAQ; const upd = (patch) => { setV((y) => ({ ...y, faq: list.map((z, k) => (k === i ? { ...z, ...patch } : z)) })); setDirty(true); }; return (
              <span key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 10, background: "#F8FAFC" }}>
                <span style={{ display: "flex", gap: 6 }}><input value={x.q} onChange={(e) => upd({ q: e.target.value })} data-testid="web-pb-faq-q" className="pc-input" style={{ ...inpStyle(32), fontWeight: 700, fontSize: 12.5 }} /><button type="button" title="Xoá câu" onClick={() => { setV((y) => ({ ...y, faq: list.filter((_, k) => k !== i) })); setDirty(true); }} style={{ border: 0, background: "none", cursor: "pointer", color: PC.t3 }}>✕</button></span>
                <textarea value={x.a} onChange={(e) => upd({ a: e.target.value })} className="pc-input" style={{ ...inpStyle(), height: 64, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.5 }} />
              </span>); })}
            <span style={{ display: "flex", gap: 8 }}><Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={() => { setV((y) => ({ ...y, faq: [...(y.faq || HOME_FAQ), { q: "", a: "" }] })); setDirty(true); }}>+ Thêm câu</Btn>{v.faq && <Btn kind="light" style={{ height: 30, fontSize: 12 }} onClick={() => { setV((y) => { const { faq, ...r } = y; return r; }); setDirty(true); }}>Về câu mặc định</Btn>}</span>
          </> : sel === "bg" ? <>
            <b style={{ fontSize: 14 }}>Ảnh nền banner</b>
            <span style={{ fontSize: 12, lineHeight: 1.5, color: PC.t3 }}>Ảnh ngang, nửa trái nên trống (chỗ đặt chữ), món ăn ở giữa–phải (2 điện thoại đè lên). Nên ≥ 1600 × 900 px.</span>
            <img src={H.bg || `${WEB}/img/home/hero-bg.webp`} alt="" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 10, border: `1px solid ${PC.line}` }} />
            <span style={{ display: "flex", gap: 8 }}><Btn kind="soft" style={{ flex: 1 }} onClick={() => setPick("bg")} testid="web-pb-bg-lib">Chọn từ thư viện</Btn><span style={{ flex: 1, display: "flex" }}><Upload box={false} name="banner-nen" label="Tải ảnh mới" showToast={showToast} onDone={(r) => setH({ bg: r.url })} /></span></span>
            {H.bg && <button type="button" onClick={() => setH({ bg: "", bg_m: "" })} style={{ alignSelf: "flex-start", border: 0, background: "none", padding: 0, color: PC.t3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Về ảnh mặc định (bàn phở)</button>}
            <Field label="Ảnh nền trên điện thoại"><Tog on={!!H.bg_m} onChange={(on) => on ? setPick("bg_m") : setH({ bg_m: "" })} label="Dùng ảnh khác cho điện thoại (ảnh nhỏ hơn, tải nhanh hơn)" />{H.bg_m && <img src={H.bg_m} alt="" style={{ width: 120, borderRadius: 8, border: `1px solid ${PC.line}` }} />}</Field>
          </> : sel === "img1" || sel === "img2" ? <>
            <b style={{ fontSize: 14 }}>Ảnh đã chọn · Banner ({sel === "img1" ? "ảnh trước" : "ảnh sau"})</b>
            <img src={H[sel] || `${WEB}/img/${sel === "img1" ? "app-today" : "app-menu"}.webp`} alt="" style={{ width: "100%", height: 150, objectFit: "cover", objectPosition: "top", borderRadius: 10, border: `1px solid ${PC.line}` }} />
            <span style={{ display: "flex", gap: 8 }}><Btn kind="soft" style={{ flex: 1 }} onClick={() => setPick(sel)} testid="web-pb-lib">Chọn từ thư viện</Btn><span style={{ flex: 1, display: "flex" }}><Upload box={false} name={`banner-${sel}`} label="Tải ảnh mới" showToast={showToast} onDone={(r) => setH({ [sel]: r.url })} /></span></span>
            {H[sel] && <button type="button" onClick={() => setH({ [sel]: "" })} style={{ alignSelf: "flex-start", border: 0, background: "none", padding: 0, color: PC.t3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Về ảnh mặc định</button>}
            <Field label="Mô tả ảnh (alt) — bắt buộc" hint="Google đọc chữ này để hiểu ảnh"><input value={H[`${sel}_alt`] || ""} onChange={(e) => setH({ [`${sel}_alt`]: e.target.value })} data-testid="web-pb-alt" className="pc-input" style={{ ...inpStyle(), borderColor: H[`${sel}_alt`]?.trim() ? undefined : "#FCA5A5" }} /></Field>
            {sel === "img1" && <Field label="Ảnh trên điện thoại"><Tog on={!!H.img1_m} onChange={(on) => on ? setPick("img1_m") : setH({ img1_m: "" })} label="Dùng ảnh khác cho điện thoại" />{H.img1_m && <img src={H.img1_m} alt="" style={{ width: 90, borderRadius: 8, border: `1px solid ${PC.line}` }} />}</Field>}
          </> : sel === "btn1" || sel === "btn2" ? <>
            <b style={{ fontSize: 14 }}>{TXT[sel]} “{H[sel] || "(trống)"}”</b>
            <Field label="Chữ trên nút" hint={sel === "btn2" ? "Để trống = ẩn nút phụ" : ""}><input value={H[sel] || ""} onChange={(e) => setH({ [sel]: e.target.value })} data-testid="web-pb-btn-label" className="pc-input" style={inpStyle()} /></Field>
            <Field label="Dẫn tới" hint={sel === "btn1" ? "Để trống = app.fipilotai.com/?ref=home-hero (đếm lượt bấm)" : "VD #cach-hoat-dong (cuộn xuống khối 3 bước)"}><input value={H[`${sel}_url`] || ""} onChange={(e) => setH({ [`${sel}_url`]: e.target.value })} placeholder={sel === "btn1" ? "https://app.fipilotai.com/?ref=home" : "#cach-hoat-dong"} className="pc-input" style={{ ...inpStyle(), fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5 }} /></Field>
          </> : <>
            <b style={{ fontSize: 14 }}>{TXT[sel]}</b>
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: PC.t2 }}>Gõ thẳng trên trang ở giữa.{sel === "title" ? " Enter để xuống dòng như bản đang chạy. Bọc chữ trong dấu * để tô xanh, VD *món Việt*. Nên dưới 60 ký tự." : ""}</span>
            {sel === "title" && <span style={{ fontSize: 12, color: String(H.title || "").length > 60 ? "#B45309" : "#15803D", fontWeight: 700 }}>{String(H.title || "").replace(/\n/g, " ").length}/60 ký tự</span>}
          </>}
          <div style={{ height: 1, background: PC.headLine }} />
          <span style={{ fontSize: 11.5, color: PC.t3, lineHeight: 1.5 }}>Màu, cỡ chữ, khoảng cách do giao diện quyết định — đổi chữ, ảnh, link, ẩn / hiện khối ở đây. Lưu nháp chưa đổi web; bấm Đăng thì web đổi trong khoảng 1 phút.</span>
          <span style={{ display: "flex", gap: 8 }}><Btn kind="light" onClick={back}>‹ Về danh sách trang</Btn><Btn kind="light" onClick={() => window.open(WEB, "_blank", "noopener")}>Xem web ↗</Btn></span>
        </aside>
      </div>
      {pick && <MediaPick onClose={() => setPick(null)} onPick={(r) => { setH({ [pick]: r.url, ...(!["img1_m", "bg", "bg_m"].includes(pick) && r.alt && !H[`${pick}_alt`] ? { [`${pick}_alt`]: r.alt } : {}) }); setPick(null); }} />}
      {showHist && <Modal title="Lịch sử đăng trang chủ (10 lần gần nhất)" onClose={() => setShowHist(false)} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{hist.map((h, i) => <div key={h.at} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: i === 0 ? PC.rowSel : "#F8FAFC" }}><span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><b style={{ fontSize: 13 }}>{fmt(h.at)}{i === 0 ? " · đang chạy" : ""}</b><span style={{ fontSize: 12, color: PC.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(h.value?.hero?.title || "").replace(/\n/g, " ")}</span></span>{i > 0 && <Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={() => { setV(norm(h.value)); setDirty(true); setShowHist(false); showToast?.("Đã mở lại bản cũ — bấm Đăng để áp dụng."); }}>Mở lại</Btn>}</div>)}</div>
      </Modal>}
    </>
  );
}

