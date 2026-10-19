// Quản trị PC › WEB & BÀI VIẾT › Thư viện ảnh (bản vẽ 138e).
// Ảnh tải lên tự nén WebP ≤1600 px + 3 bản nhỏ 400/800/1200 (web dùng srcset), tên không dấu; link ảnh trên tên miền fipilotai.com/anh/…
// Thông tin ảnh ở bảng web_media (mô tả alt, chú thích, gốc / sau nén, người tải). "Đang dùng ở" = quét bài, trang, trang calo, tác giả, cài đặt web.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { toVNDate } from "../../lib/dateVN";
import { Btn, Pill, SearchBox, FilterSelect, ErrorBox, Loading } from "../pcUI";
import { Field, inpStyle, BLUE } from "./webUI";
import { uploadImage, SIZES } from "./webApi";

const must = ({ data, error }) => { if (error) throw error; return data; };
const mono = { fontFamily: "ui-monospace, Menlo, monospace" };
const kb = (n) => (n == null ? "—" : n >= 1048576 ? `${String(Math.round((n / 1048576) * 10) / 10).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const dmy = (iso) => { const d = toVNDate(iso); return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`; };
const stem = (p) => String(p || "").split("/").pop().replace(/_\d{2,4}w\.webp$/, "").replace(/\.\w+$/, "");
const QUOTA = 1024 * 1048576; // gói Supabase miễn phí: 1 GB lưu trữ

export function PcWebMedia({ top, showToast, user }) {
  const [rows, setRows] = useState(null);
  const [noTable, setNoTable] = useState(false);
  const [err, setErr] = useState("");
  const [use, setUse] = useState({}); // stem → [{ t, k }]
  const [cur, setCur] = useState(null);
  const [form, setForm] = useState({ alt: "", caption: "" });
  const [ft, setFt] = useState(""); const [fu, setFu] = useState(""); const [noAlt, setNoAlt] = useState(false); const [q, setQ] = useState("");
  const [up, setUp] = useState(null); // "2/5"
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await supabase.from("web_media").select("*").order("created_at", { ascending: false }).limit(2000);
      if (r.error) { if (!/web_media|relation|schema cache/i.test(r.error.message || "")) throw r.error; setNoTable(true); setRows(await fromStorage()); }
      else setRows(r.data);
    } catch (e) { setErr("Chưa tải được thư viện ảnh. " + (e.message || "")); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // Ảnh đang được dùng ở đâu (so theo tên file, bỏ đuôi cỡ)
  useEffect(() => { (async () => {
    try {
      const [posts, calo, authors, sets] = await Promise.all([supabase.from("web_posts").select("title,kind,cover_url,blocks").neq("status", "trash").limit(3000).then(must), supabase.from("web_calo_pages").select("food_key,image_url").then(must), supabase.from("web_authors").select("name,avatar_url").then(must), supabase.from("web_settings").select("key,value").then(must)]);
      const m = {}; const add = (url, t, k) => { const s = stem(url); if (!s) return; (m[s] ||= []); if (!m[s].some((x) => x.t === t)) m[s].push({ t, k }); };
      for (const p of posts) { const kind = p.kind === "page" ? "Trang" : "Bài"; if (p.cover_url) add(p.cover_url, `${kind}: ${p.title} (ảnh đại diện)`, "post"); for (const u of JSON.stringify(p.blocks || []).match(/[\w./:%-]+\.(webp|jpe?g|png|gif|svg)/gi) || []) add(u, `${kind}: ${p.title}`, "post"); }
      for (const c of calo) if (c.image_url) add(c.image_url, `Trang calo món: ${c.food_key.charAt(0).toUpperCase() + c.food_key.slice(1)}`, "calo");
      for (const a of authors) if (a.avatar_url) add(a.avatar_url, `Tác giả: ${a.name}`, "other");
      for (const s of sets) for (const u of JSON.stringify(s.value || {}).match(/[\w./:%-]+\.(webp|jpe?g|png|gif|svg)/gi) || []) add(u, "Cài đặt web", "other");
      setUse(m);
    } catch (e) { /* không chặn thư viện */ }
  })(); }, [rows]);

  const list = useMemo(() => (rows || []).filter((r) => {
    const t = (r.name || "").split(".").pop();
    if (ft && !(ft === "webp" ? t === "webp" : t !== "webp")) return false;
    const u = use[stem(r.path)] || [];
    if (fu && !(fu === "none" ? !u.length : u.some((x) => x.k === fu))) return false;
    if (noAlt && r.alt?.trim()) return false;
    const s = q.trim().toLowerCase(); return !s || `${r.name} ${r.alt || ""} ${r.caption || ""}`.toLowerCase().includes(s);
  }), [rows, use, ft, fu, noAlt, q]);
  const c = cur && (rows || []).find((r) => r.path === cur);
  useEffect(() => { if (!cur && rows?.length) setCur(rows[0].path); }, [rows, cur]);
  useEffect(() => { if (c) setForm({ alt: c.alt || "", caption: c.caption || "" }); }, [cur, rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = c && (form.alt !== (c.alt || "") || form.caption !== (c.caption || ""));
  useEffect(() => { window.__fpWebDirty = !!dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);

  const upload = async (files) => {
    const fs = [...(files || [])].filter((f) => /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name));
    if (!fs.length) return showToast?.("Chỉ nhận file ảnh (JPG, PNG, WebP, HEIC).");
    let ok = 0, last = null;
    for (let i = 0; i < fs.length; i++) {
      setUp(`${i + 1}/${fs.length}`);
      try { const r = await uploadImage(fs[i], fs[i].name.replace(/\.\w+$/, ""), { uid: user?.id }); ok++; last = r.path; } catch (e) { showToast?.(`${fs[i].name}: ${e.message || "chưa tải được"}`); }
    }
    setUp(null);
    if (ok) { showToast?.(`Đã tải ${ok} ảnh lên — nhớ điền mô tả ảnh.`); await load(); if (last) setCur(last); }
  };
  const save = async () => {
    try { await supabase.from("web_media").update({ alt: form.alt.trim() || null, caption: form.caption.trim() || null }).eq("path", c.path).then(must); showToast?.("Đã lưu mô tả ảnh."); setRows((rs) => rs.map((r) => (r.path === c.path ? { ...r, alt: form.alt.trim() || null, caption: form.caption.trim() || null } : r))); }
    catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
  };
  const del = async () => {
    const u = use[stem(c.path)] || [];
    if (!(await appConfirm(u.length ? `Ảnh đang dùng ở ${u.length} chỗ — xoá thì các chỗ đó mất ảnh. Vẫn xoá ${c.name}?` : `Xoá hẳn ảnh ${c.name}?`, { danger: true }))) return;
    try {
      const m = c.path.match(/^(.*)_\d{2,4}w\.webp$/); const paths = [c.path, ...(m ? (c.sizes?.length ? c.sizes : SIZES).map((w) => `${m[1]}_${w}w.webp`) : [])];
      const { error } = await supabase.storage.from("web").remove(paths); if (error) throw error;
      if (!noTable) await supabase.from("web_media").delete().eq("path", c.path).then(must);
      showToast?.("Đã xoá ảnh."); setCur(null); load();
    } catch (e) { showToast?.("Chưa xoá được: " + (e.message || "")); }
  };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); showToast?.("Đã chép đường dẫn ảnh."); } catch (e) { showToast?.(t); } };

  const total = (rows || []).reduce((n, r) => n + (r.size || 0) * (1 + (r.sizes?.length ? 0.55 : 0)), 0);
  const nNoAlt = (rows || []).filter((r) => !r.alt?.trim()).length;
  const uploadBtn = <Btn kind="blue" onClick={() => fileRef.current?.click()} disabled={!!up} testid="web-media-up">{up ? `Đang tải ${up}…` : "⤒ Tải ảnh lên"}</Btn>;
  if (err) return <>{top(null)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  const u = c ? use[stem(c.path)] || [] : [];
  return (
    <>
      {top(uploadBtn, "Thư viện ảnh", `Ảnh tải lên tự nén WebP, tạo sẵn 4 cỡ · ${rows ? rows.length : "…"} ảnh · ${kb(total)} / 1 GB`)}
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple style={{ display: "none" }} data-testid="web-media-file" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <div style={{ display: "flex", minHeight: 820 }}>
        <div style={{ flex: 1, minWidth: 0, padding: "18px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {noTable && <div style={{ borderRadius: 12, background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", fontSize: 12.5, color: "#92400E" }}>Chưa có bảng thông tin ảnh — chủ dự án chạy SQL <span style={mono}>supabase/migrations/20261019120000_web_media_meta.sql</span>. Trong lúc chờ: xem / tải / xoá ảnh được, chưa lưu được mô tả.</div>}
          <div onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }} data-testid="web-media-drop"
            style={{ borderRadius: 14, border: `2px dashed ${drag ? BLUE : "#BFD4FF"}`, background: drag ? "#E8F1FF" : "#F5F9FF", padding: 18, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
            <span style={{ fontSize: 26 }}>⤒</span><span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14 }}>{up ? `Đang nén và tải ${up}…` : "Kéo thả ảnh vào đây"}</b><span style={{ fontSize: 12, color: PC.t3 }}>JPG, PNG, WebP, HEIC · tối đa 10 MB · tự đổi tên theo chữ không dấu (bat-pho-bo.webp)</span></span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FilterSelect label="Loại" value={ft} onChange={setFt} options={[{ v: "", label: "Tất cả ảnh" }, { v: "webp", label: "WebP" }, { v: "other", label: "PNG, SVG, GIF" }]} />
            <FilterSelect label="Dùng ở" value={fu} onChange={setFu} options={[{ v: "", label: "Mọi nơi" }, { v: "post", label: "Bài / trang" }, { v: "calo", label: "Trang calo món" }, { v: "other", label: "Tác giả, cài đặt" }, { v: "none", label: "Chưa dùng" }]} />
            <Btn kind={noAlt ? "blue" : "soft"} onClick={() => setNoAlt((x) => !x)} testid="web-media-noalt">Chưa có mô tả ({nNoAlt})</Btn>
            <span style={{ marginLeft: "auto" }}><SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên, mô tả…" width={220} /></span>
          </div>
          {!rows ? <Loading /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
              {list.map((r) => { const on = r.path === cur; return (
                <button key={r.path} type="button" onClick={() => setCur(r.path)} data-testid="web-media-item" title={r.name} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", boxShadow: on ? "0 0 0 3px #1A7CFF" : PC.shadow, background: "#FFF", border: 0, padding: 0, cursor: "pointer" }}>
                  <img src={r.url} alt={r.alt || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {!noTable && !r.alt?.trim() && <span style={{ position: "absolute", left: 6, top: 6 }}><Pill tone="amber">Thiếu mô tả</Pill></span>}
                  {on && <span style={{ position: "absolute", right: 6, top: 6, width: 22, height: 22, borderRadius: 11, background: "#1A7CFF", color: "#FFF", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                </button>); })}
            </div>
          )}
          {rows && !list.length && <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: PC.t3 }}>{rows.length ? "Không có ảnh khớp bộ lọc." : "Chưa có ảnh nào — kéo thả ảnh vào ô phía trên."}</div>}
        </div>
        <aside style={{ width: 320, flexShrink: 0, background: "#FFF", borderLeft: `1px solid ${PC.line}`, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {!c ? <span style={{ fontSize: 12.5, color: PC.t3 }}>Chọn 1 ảnh để xem và sửa mô tả.</span> : <>
            <img src={c.url} alt="" style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: 10 }} />
            <b style={{ fontSize: 13.5, wordBreak: "break-all" }}>{c.name}</b>
            <div style={{ borderRadius: 10, background: "#F8FAFD", padding: 10, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12 }}>
              {[["Gốc", c.orig_name ? `${c.orig_name}${c.orig_w ? ` · ${c.orig_w} × ${c.orig_h}` : ""} · ${kb(c.orig_size)}` : "—"], ["Sau nén", `${(c.name.split(".").pop() || "").toUpperCase().replace("WEBP", "WebP")}${c.width ? ` · ${c.width} × ${c.height}` : ""} · ${kb(c.size)}${c.orig_size && c.size ? ` (−${Math.max(0, Math.round((1 - c.size / c.orig_size) * 100))}%)` : ""}`], ["Cỡ tạo sẵn", c.width ? [...(c.sizes || []), c.width].join(" · ") + " px" : "—"], ["Tải lên", `${c.created_at ? dmy(c.created_at) : "—"}${c.uploader ? ` · ${c.uploader}` : ""}`]].map(([a, b]) => [<span key={a} style={{ color: PC.t3 }}>{a}</span>, <span key={a + "v"} style={{ fontWeight: 600, minWidth: 0, overflowWrap: "anywhere" }}>{b}</span>])}
            </div>
            <Field label="Mô tả ảnh (alt)"><input value={form.alt} onChange={(e) => setForm({ ...form, alt: e.target.value })} disabled={noTable} placeholder="VD: Tô phở bò tái nạm cỡ vừa" data-testid="web-media-alt" className="pc-input" style={inpStyle()} /></Field>
            <Field label="Chú thích dưới ảnh"><input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} disabled={noTable} placeholder="Không bắt buộc" className="pc-input" style={inpStyle()} /></Field>
            <Field label="Đường dẫn ảnh"><span style={{ position: "relative", display: "block" }}><input value={c.url} readOnly onFocus={(e) => e.target.select()} className="pc-input" style={{ ...inpStyle(), ...mono, paddingRight: 52, fontSize: 12 }} /><button type="button" onClick={() => copy(c.url)} style={{ position: "absolute", right: 10, top: 0, height: 36, border: 0, background: "none", fontSize: 11.5, color: BLUE, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Chép</button></span></Field>
            <Field label={u.length ? `Đang dùng ở ${u.length} chỗ` : "Chưa dùng ở đâu"}>{u.length > 0 && <span style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: BLUE }}>{u.slice(0, 8).map((x) => <span key={x.t}>{x.t}</span>)}</span>}</Field>
            <span style={{ display: "flex", gap: 8, marginTop: 4 }}><Btn kind="blue" style={{ flex: 1 }} onClick={save} disabled={!dirty || noTable} testid="web-media-save">Lưu</Btn><Btn kind="danger" onClick={del} testid="web-media-del">Xoá</Btn></span>
          </>}
        </aside>
      </div>
    </>
  );
}

// Chưa có bảng web_media: đọc thẳng kho 'web' (img/năm/tháng/…), bỏ bản nhỏ _400w/_800w/_1200w
async function fromStorage() {
  const st = supabase.storage.from("web"); const out = [];
  const ls = async (p) => { const { data, error } = await st.list(p, { limit: 1000, sortBy: { column: "created_at", order: "desc" } }); if (error) throw error; return data || []; };
  for (const y of await ls("img")) { if (y.id) continue; for (const m of await ls(`img/${y.name}`)) { if (m.id) continue; for (const f of await ls(`img/${y.name}/${m.name}`)) { if (!f.id || /_(400|800|1200)w\.webp$/.test(f.name)) continue; const path = `img/${y.name}/${m.name}/${f.name}`; out.push({ path, name: f.name, url: `https://fipilotai.com/anh/${y.name}/${m.name}/${f.name}`, size: f.metadata?.size, created_at: f.created_at, sizes: [] }); } } }
  return out.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}
