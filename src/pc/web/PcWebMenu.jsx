// Quản trị PC › WEB & BÀI VIẾT › Menu (bản vẽ 138g), kiểu WordPress:
//  - Chọn menu đang sửa (đầu trang, 3 cột chân trang, điện thoại). Trái: thêm mục từ Trang / Bài viết / Chuyên mục / Trang calo món / Link tự nhập.
//  - Giữa: cấu trúc menu, nắm ⋮⋮ kéo lên xuống; kéo lệch sang phải 1 nấc = menu con (tối đa 2 cấp). Bấm mục để sửa chữ, link,
//    chữ khi rê chuột, kiểu (chữ thường / nút nổi bật), mở tab mới, nofollow; nút Lên · Xuống · Vào trong · Ra ngoài thay cho kéo.
//  - Dưới: xem trước thanh menu trên web. Phải: "Hiện menu này ở" (lưu cùng nội dung vào các vị trí được chọn).
//  - Lưu → web_menus (web đổi theo trong khoảng 1 phút).
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { Btn, Card, ErrorBox, Loading } from "../pcUI";
import { Check, Field, Lnk, inpStyle, BLUE } from "./webUI";
import { slugify } from "./webLib";
import { listTerms } from "./webApi";
import { FOODS } from "./BlockEdit";

const WEB = "https://fipilotai.com";
const must = ({ data, error }) => { if (error) throw error; return data; };
const LOCS = [["header", "Menu đầu trang", "Đầu trang (máy tính)"], ["footer_1", "Chân trang · Chủ đề", "Chân trang · cột 1"], ["footer_2", "Chân trang · Fipilot AI", "Chân trang · cột 2"], ["footer_3", "Chân trang · Chính sách", "Chân trang · cột 3"], ["mobile", "Menu điện thoại", "Menu ☰ trên điện thoại"]];
const STATIC = [["Trang chủ", "/"], ["Bài viết (blog)", "/bai-viet"], ["Bảng calo món", "/bang-calo"], ["Công cụ tính calo", "/tinh-calo"], ["Bảng giá", "/bang-gia"], ["Giới thiệu", "/gioi-thieu"], ["Liên hệ", "/lien-he"], ["Tìm kiếm", "/tim-kiem"], ["Điều khoản sử dụng", "/dieu-khoan"], ["Chính sách riêng tư", "/chinh-sach-rieng-tu"]];
const ICONS = [["", "Không"], ["scale", "Cân"], ["menu", "Danh sách"], ["table", "Bảng"], ["book", "Sách"], ["info", "Thông tin"], ["tag", "Nhãn giá"], ["phone", "Điện thoại"], ["chat", "Tin nhắn"], ["doc", "Tài liệu"], ["shield", "Khiên"], ["grid", "Lưới"], ["star", "Ngôi sao"], ["mail", "Thư"], ["call", "Gọi"], ["bowl", "Tô"]];
const TYPE = { page: "Trang", post: "Bài viết", category: "Chuyên mục", calo: "Trang calo", link: "Link" };
let seq = 0; const k = () => `m${Date.now().toString(36)}${seq++}`;
// cây ↔ danh sách phẳng có cấp (0 / 1)
const flat = (items) => (items || []).flatMap((it) => [{ ...it, children: undefined, _k: k(), lv: 0 }, ...(it.children || []).map((c) => ({ ...c, children: undefined, _k: k(), lv: 1 }))]);
const tree = (list) => { const out = []; for (const { _k, lv, _open, ...it } of list) { const clean = Object.fromEntries(Object.entries(it).filter(([, v]) => v !== "" && v !== false && v != null)); if (lv === 1 && out.length) (out[out.length - 1].children ||= []).push(clean); else out.push(clean); } return out; };
const typeOf = (it) => (it.style === "button" ? "Nút nổi bật" : TYPE[it.type] || (it.url?.startsWith("/chu-de/") ? "Chuyên mục" : it.url?.startsWith("/calo/") ? "Trang calo" : /^https?:/.test(it.url || "") ? "Link" : "Trang"));

function Acc({ t, open, onToggle, children, testid }) {
  return (
    <div style={{ borderBottom: `1px solid ${PC.headLine}` }} data-testid={testid}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", padding: "12px 14px", fontSize: 13, fontWeight: 800, border: 0, background: "none", cursor: "pointer", fontFamily: "inherit", color: PC.t1 }}>{t}<span style={{ marginLeft: "auto", color: PC.t4 }}>{open ? "⌃" : "⌄"}</span></button>
      {open && <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 9 }}>{children}</div>}
    </div>
  );
}

// Danh sách có ô chọn + "Thêm vào menu (n)"
function PickList({ rows, onAdd, ph, testid }) {
  const [q, setQ] = useState(""); const [sel, setSel] = useState([]);
  const list = rows.filter((r) => !q || r.label.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  return <>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ph} className="pc-input" style={inpStyle(30)} />
    <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 220, overflowY: "auto" }}>{list.map((r) => <Check key={r.url} on={sel.includes(r.url)} onChange={(v) => setSel((s) => (v ? [...s, r.url] : s.filter((x) => x !== r.url)))} label={r.label} testid={testid ? `${testid}-${slugify(r.label)}` : undefined} />)}{!list.length && <span style={{ fontSize: 12, color: PC.t4 }}>Không có kết quả</span>}</div>
    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><Lnk onClick={() => setSel(sel.length === list.length ? [] : list.map((r) => r.url))}>{sel.length === list.length && list.length ? "Bỏ chọn" : "Chọn tất cả"}</Lnk><Btn kind="soft" style={{ height: 30, fontSize: 12 }} disabled={!sel.length} testid={testid ? `${testid}-add` : undefined} onClick={() => { onAdd(rows.filter((r) => sel.includes(r.url))); setSel([]); }}>Thêm vào menu{sel.length ? ` (${sel.length})` : ""}</Btn></span>
  </>;
}

export function PcWebMenu({ top, showToast }) {
  const [menus, setMenus] = useState(null);
  const [err, setErr] = useState("");
  const [loc, setLoc] = useState("header");
  const [list, setList] = useState([]);
  const [places, setPlaces] = useState(["header"]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acc, setAcc] = useState(["page", "link"]);
  const tog = (x) => setAcc((a) => (a.includes(x) ? a.filter((y) => y !== x) : [...a, x]));
  const [src, setSrc] = useState({ pages: [], posts: [], cats: [] });
  const [custom, setCustom] = useState({ url: "", label: "" });
  const [drag, setDrag] = useState(null); // { from, to, lv }
  const box = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [m, pages, posts, cats] = await Promise.all([
          supabase.from("web_menus").select("*").then(must),
          supabase.from("web_posts").select("title,slug").eq("kind", "page").eq("status", "published").then(must),
          supabase.from("web_posts").select("title,slug").eq("kind", "post").eq("status", "published").order("published_at", { ascending: false }).limit(200).then(must),
          listTerms("category"),
        ]);
        const by = Object.fromEntries(m.map((x) => [x.location, x]));
        setMenus(by); setList(flat(by.header?.items)); setPlaces(["header"]);
        setSrc({ pages: [...STATIC.map(([label, url]) => ({ label, url, type: "page" })), ...pages.filter((p) => !STATIC.some(([, u]) => u === `/${p.slug}`)).map((p) => ({ label: p.title, url: `/${p.slug}`, type: "page" }))], posts: posts.map((p) => ({ label: p.title, url: `/${p.slug}`, type: "post" })), cats: cats.map((c) => ({ label: c.name, url: `/chu-de/${c.slug}`, type: "category" })) });
      } catch (e) { setErr("Chưa tải được menu. " + (e.message || "")); }
    })();
  }, []);
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);

  const pick = async (l) => {
    if (l === loc) return;
    if (dirty && !(await appConfirm("Menu đang sửa chưa lưu. Bỏ thay đổi và chuyển menu khác?", { danger: true }))) return;
    setLoc(l); setList(flat(menus[l]?.items)); setPlaces([l]); setDirty(false);
  };
  const edit = (fn) => { setList(fn); setDirty(true); };
  const add = (rows) => edit((L) => [...L, ...rows.map((r) => ({ label: r.label, url: r.url, type: r.type, _k: k(), lv: 0 }))]);
  const setIt = (i, patch) => edit((L) => L.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  // Di chuyển cả mục cha kèm các mục con của nó
  const span = (L, i) => { let n = 1; if (L[i].lv === 0) while (L[i + n]?.lv === 1) n++; return n; };
  const moveBlock = (from, to, lv) => edit((L) => {
    const n = span(L, from); const blk = L.slice(from, from + n); const rest = [...L.slice(0, from), ...L.slice(from + n)];
    const at = to > from ? to - n : to;
    const ins = Math.max(0, Math.min(rest.length, at));
    const canChild = lv === 1 && ins > 0 && n === 1;
    blk[0] = { ...blk[0], lv: canChild ? 1 : 0 };
    const out = [...rest.slice(0, ins), ...blk, ...rest.slice(ins)];
    if (out[0]) out[0] = { ...out[0], lv: 0 };
    return out;
  });
  const up = (i) => { const L = list; if (i === 0) return; let j = i - 1; if (L[i].lv === 0) while (j > 0 && L[j].lv === 1) j--; moveBlock(i, j, L[i].lv); };
  const down = (i) => { const L = list; const n = span(L, i); const nx = i + n; if (nx >= L.length) return; const m = span(L, nx); moveBlock(i, nx + m, L[i].lv); };
  const indent = (i, lv) => { if (lv === 1 && (i === 0 || span(list, i) > 1)) return showToast?.(i === 0 ? "Mục đầu tiên không thể thành menu con." : "Mục này đang có menu con, không lồng thêm được (tối đa 2 cấp)."); setIt(i, { lv }); };
  const remove = (i) => edit((L) => { const n = span(L, i); return [...L.slice(0, i), ...L.slice(i + n)]; });

  // Kéo thả: vị trí theo chiều dọc, cấp theo độ lệch ngang (> 34 px sang phải = menu con)
  const onOver = (e, i) => {
    e.preventDefault(); if (!drag) return;
    const r = e.currentTarget.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2;
    const left = box.current?.getBoundingClientRect().left || r.left;
    const lv = e.clientX - left - 16 > 34 + (list[i].lv === 1 ? 34 : 0) - 10 ? 1 : 0;
    const to = after ? i + 1 : i;
    if (drag.to !== to || drag.lv !== lv) setDrag({ ...drag, to, lv });
  };
  const onDrop = (e) => { e.preventDefault(); if (drag && drag.to != null) moveBlock(drag.from, drag.to, loc.startsWith("footer") ? 0 : drag.lv); setDrag(null); };

  const save = async () => {
    if (!places.length) return showToast?.("Chọn ít nhất 1 chỗ hiện menu.");
    const items = tree(list);
    const bad = list.find((x) => !String(x.label || "").trim() || !String(x.url || "").trim());
    if (bad) return showToast?.("Có mục thiếu chữ hiển thị hoặc đường dẫn.");
    setBusy(true);
    try {
      await supabase.from("web_menus").upsert(places.map((l) => ({ location: l, name: LOCS.find((x) => x[0] === l)[1], items, updated_at: new Date().toISOString() })), { onConflict: "location" }).then(must);
      setMenus((m) => ({ ...m, ...Object.fromEntries(places.map((l) => [l, { ...(m[l] || {}), location: l, items }])) }));
      setDirty(false); showToast?.(`Đã lưu menu${places.length > 1 ? ` vào ${places.length} vị trí` : ""}. Web đổi theo trong khoảng 1 phút.`);
    } catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };

  const foods = useMemo(() => FOODS.filter((f) => f.vn).map((f) => ({ label: `Calo ${f.name.toLowerCase()}`, url: `/calo/${f.slug}`, type: "calo" })), []);
  const prev = tree(list);
  const footer = loc.startsWith("footer");
  const curName = LOCS.find((x) => x[0] === loc)?.[1];

  if (err) return <>{top(null)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!menus) return <>{top(null)}<Loading /></>;
  return (
    <>
      {top(<span style={{ display: "flex", gap: 8 }}><Btn kind="light" onClick={() => window.open(WEB, "_blank", "noopener")}>Xem trước ↗</Btn><Btn kind="blue" onClick={save} disabled={busy} testid="web-menu-save">{busy ? "Đang lưu…" : "Lưu menu"}</Btn></span>, "Menu", "Kéo thả để đổi thứ tự · kéo sang phải để thành menu con · đổi xong bấm Lưu")}
      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, flexWrap: "wrap" }}>
          <span style={{ color: PC.t3, fontWeight: 700 }}>Đang sửa:</span>
          {LOCS.map(([l, t]) => <button key={l} type="button" onClick={() => pick(l)} data-testid={`web-menu-loc-${l}`} style={{ height: 32, padding: "0 12px", borderRadius: 9, display: "inline-flex", alignItems: "center", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", background: l === loc ? BLUE : "#FFF", color: l === loc ? "#FFF" : PC.t2, border: `1px solid ${l === loc ? BLUE : PC.line}` }}>{t}</button>)}
          {dirty && <span style={{ fontSize: 12, color: "#B45309", fontWeight: 700, marginLeft: 6 }}>Có thay đổi chưa lưu</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr) 280px", gap: 16, alignItems: "start" }}>
          <Card style={{ padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>Thêm mục vào menu</b></div>
            <Acc t="Trang" open={acc.includes("page")} onToggle={() => tog("page")}><PickList rows={src.pages} onAdd={add} ph="Tìm trang" testid="web-menu-page" /></Acc>
            <Acc t="Bài viết" open={acc.includes("post")} onToggle={() => tog("post")}><PickList rows={src.posts} onAdd={add} ph="Tìm bài" /></Acc>
            <Acc t="Chuyên mục" open={acc.includes("cat")} onToggle={() => tog("cat")}><PickList rows={src.cats} onAdd={add} ph="Tìm chuyên mục" /></Acc>
            <Acc t="Trang calo món" open={acc.includes("calo")} onToggle={() => tog("calo")}><PickList rows={foods} onAdd={add} ph="Tìm món: phở bò…" /></Acc>
            <Acc t="Link tự nhập" open={acc.includes("link")} onToggle={() => tog("link")}>
              <Field label="Đường dẫn"><input value={custom.url} onChange={(e) => setCustom({ ...custom, url: e.target.value.trim() })} placeholder="https://app.fipilotai.com" data-testid="web-menu-link-url" className="pc-input" style={inpStyle(32)} /></Field>
              <Field label="Chữ hiển thị"><input value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} placeholder="Mở app" data-testid="web-menu-link-label" className="pc-input" style={inpStyle(32)} /></Field>
              <Btn kind="soft" style={{ height: 30, fontSize: 12, alignSelf: "flex-end" }} disabled={!custom.url || !custom.label.trim()} testid="web-menu-link-add" onClick={() => { add([{ label: custom.label.trim(), url: custom.url, type: "link" }]); setCustom({ url: "", label: "" }); }}>Thêm vào menu</Btn>
            </Acc>
          </Card>
          <Card style={{ padding: 0 }} testid="web-menu-tree">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>Cấu trúc menu · {curName}</b><span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>{list.length} mục · {footer ? "1 cấp" : "tối đa 2 cấp"}</span></div>
            <div ref={box} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, background: "#FBFCFE", minHeight: 120 }}>
              {!list.length && <span style={{ fontSize: 13, color: PC.t3, padding: 12, textAlign: "center" }}>Menu trống. Thêm mục ở khung bên trái.</span>}
              {list.map((it, i) => {
                const ghost = drag && drag.from === i; const mark = drag && drag.to === i && drag.from !== i;
                return (
                  <div key={it._k}>
                    {mark && <div style={{ marginLeft: drag.lv * 34, height: 4, borderRadius: 2, background: "#1A7CFF", marginBottom: 6 }} />}
                    <div data-testid="web-menu-item" draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); setDrag({ from: i, to: null, lv: it.lv }); }} onDragEnd={() => setDrag(null)} onDragOver={(e) => onOver(e, i)}
                      style={{ marginLeft: it.lv * 34, borderRadius: 10, border: `1px solid ${it._open ? "#BFD4FF" : PC.line}`, background: ghost ? "#F1F5F9" : "#FFF", opacity: ghost ? 0.45 : 1, boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 12px", cursor: "pointer" }} onClick={() => setIt(i, { _open: !it._open })}>
                        <span title="Nắm để kéo" style={{ color: PC.t4, fontSize: 13, letterSpacing: -2, cursor: "grab" }}>⋮⋮</span>{it.lv > 0 && <span style={{ color: PC.t4, fontSize: 12 }}>↳</span>}
                        <b style={{ fontSize: 13.5 }}>{it.label || "(chưa có chữ)"}</b><span style={{ marginLeft: "auto" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: PC.t3, background: "#F1F5F9", borderRadius: 6, padding: "2px 7px" }}>{typeOf(it)}</span><span style={{ color: PC.t4, fontSize: 12 }}>{it._open ? "⌃" : "⌄"}</span>
                      </div>
                      {it._open && (
                        <div style={{ padding: "12px 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: `1px solid ${PC.headLine}` }} onClick={(e) => e.stopPropagation()}>
                          <Field label="Chữ hiển thị"><input value={it.label || ""} onChange={(e) => setIt(i, { label: e.target.value })} data-testid="web-menu-it-label" className="pc-input" style={inpStyle(34)} /></Field>
                          <Field label="Chữ khi rê chuột (title)"><input value={it.title || ""} onChange={(e) => setIt(i, { title: e.target.value })} placeholder="Không bắt buộc" className="pc-input" style={inpStyle(34)} /></Field>
                          <Field label="Trỏ tới"><input value={it.url || ""} onChange={(e) => setIt(i, { url: e.target.value.trim() })} className="pc-input" style={{ ...inpStyle(34), fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5 }} /></Field>
                          {footer ? <Field label="Biểu tượng trước chữ"><select value={it.icon || ""} onChange={(e) => setIt(i, { icon: e.target.value })} className="pc-input" style={inpStyle(34)}>{ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                            : <Field label="Kiểu hiển thị"><select value={it.style || ""} onChange={(e) => setIt(i, { style: e.target.value })} disabled={it.lv === 1} className="pc-input" style={inpStyle(34)}><option value="">Chữ thường</option><option value="button">Nút nổi bật (góc phải)</option></select></Field>}
                          <span style={{ display: "flex", gap: 16, alignItems: "center", gridColumn: "1/-1" }}><Check on={it.new_tab} onChange={(v) => setIt(i, { new_tab: v })} label="Mở tab mới" /><Check on={it.nofollow} onChange={(v) => setIt(i, { nofollow: v })} label="nofollow" /></span>
                          <span style={{ gridColumn: "1/-1", display: "flex", gap: 8, alignItems: "center", color: PC.t3, fontWeight: 700, fontSize: 12 }}>Di chuyển: <Lnk onClick={() => up(i)}>Lên</Lnk>·<Lnk onClick={() => down(i)}>Xuống</Lnk>{!footer && <>·<Lnk onClick={() => indent(i, 1)} testid="web-menu-in">Vào trong</Lnk>·<Lnk onClick={() => indent(i, 0)}>Ra ngoài</Lnk></>}</span>
                          <span style={{ gridColumn: "1/-1", display: "flex", gap: 8 }}><Lnk red onClick={() => remove(i)} testid="web-menu-it-del">Gỡ khỏi menu{span(list, i) > 1 ? " (kèm menu con)" : ""}</Lnk><span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>{typeOf(it)} · {it.url}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {drag && drag.to === list.length && <div style={{ marginLeft: drag.lv * 34, height: 4, borderRadius: 2, background: "#1A7CFF" }} onDragOver={(e) => e.preventDefault()} />}
              {drag && <div onDragOver={(e) => { e.preventDefault(); if (drag.to !== list.length) setDrag({ ...drag, to: list.length, lv: 0 }); }} style={{ height: 28 }} />}
            </div>
            <div style={{ padding: 16, borderTop: `1px solid ${PC.headLine}` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".06em" }}>XEM TRƯỚC TRÊN WEB</span>
              {footer ? (
                <div style={{ marginTop: 10, borderRadius: 12, background: "linear-gradient(180deg,#0B1F45,#081631)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>{prev.map((it) => <span key={it.url + it.label} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "rgba(255,255,255,.82)" }}><span style={{ color: "#7CC2FF" }}>•</span>{it.label}</span>)}</div>
              ) : (
                <div style={{ marginTop: 10, borderRadius: 12, border: `1px solid ${PC.line}`, minHeight: 160, position: "relative", background: "#FFF" }}>
                  <div style={{ height: 54, display: "flex", alignItems: "center", gap: 16, padding: "0 14px", borderBottom: "1px solid #E6ECF5", fontSize: 12.5, whiteSpace: "nowrap", fontWeight: 600, color: "#334155", overflow: "hidden" }}>
                    <b style={{ display: "flex", alignItems: "center", gap: 8, color: PC.t1 }}><span style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#1A7CFF,#0050E6)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13 }}>F</span>Fipilot AI</b>
                    {prev.filter((x) => x.style !== "button").map((it, n) => <span key={n} style={{ color: it.children?.length ? BLUE : undefined }}>{it.label}{it.children?.length ? " ⌄" : ""}</span>)}
                    {prev.filter((x) => x.style === "button").slice(0, 1).map((it) => <span key="cta" style={{ marginLeft: "auto", height: 32, padding: "0 14px", borderRadius: 10, background: BLUE, color: "#FFF", display: "inline-flex", alignItems: "center", fontWeight: 800 }}>{it.label}</span>)}
                  </div>
                  {(() => { const p = prev.find((x) => x.children?.length && x.style !== "button"); if (!p) return null; const idx = prev.filter((x) => x.style !== "button").indexOf(p); return <div style={{ position: "absolute", left: 118 + idx * 90, top: 58, width: 260, background: "#FFF", borderRadius: 12, boxShadow: "0 12px 28px rgba(15,23,42,.16)", border: `1px solid ${PC.line}`, padding: 6, fontSize: 13 }}>{p.children.map((c, n) => <span key={n} style={{ display: "block", padding: "8px 10px", borderRadius: 8, color: "#334155", fontWeight: 600 }}>{c.label}</span>)}</div>; })()}
                </div>
              )}
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>Hiện menu này ở</b></div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {["header", "mobile", "footer_1", "footer_2", "footer_3"].map((l) => LOCS.find((x) => x[0] === l)).map(([l, , t]) => <Check key={l} on={places.includes(l)} onChange={(v) => { setPlaces((p) => (v ? [...p, l] : p.filter((x) => x !== l))); setDirty(true); }} label={t} testid={`web-menu-place-${l}`} />)}
                <span style={{ fontSize: 11.5, color: PC.t3 }}>Một vị trí chỉ gắn 1 menu — lưu sẽ thay menu đang ở các vị trí được chọn. Menu ☰ điện thoại để trống thì dùng menu đầu trang.</span>
              </div>
            </Card>
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>Cách dùng</b></div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9, fontSize: 12.5, color: PC.t2, lineHeight: 1.5 }}>
                {[["⋮⋮", "Nắm vào đây rồi kéo lên / xuống để đổi thứ tự"], ["→", "Kéo lệch sang phải 1 nấc để thành menu con"], ["⌄", "Bấm vào mục để đổi chữ, link, mở tab mới"], ["⌨", "Không kéo được? Dùng nút Lên · Xuống · Vào trong"]].map(([ic, t]) => <span key={t} style={{ display: "flex", gap: 10 }}><span style={{ width: 24, height: 24, borderRadius: 7, background: "#F1F5F9", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, color: PC.t3 }}>{ic}</span>{t}</span>)}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
