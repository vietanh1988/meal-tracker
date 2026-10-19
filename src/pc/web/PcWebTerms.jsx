// Quản trị PC › WEB & BÀI VIẾT › Chuyên mục & thẻ (bản vẽ 138h).
//  - Chuyên mục: form Thêm / Sửa bên trái (tên, đường dẫn, mục cha, mô tả, ảnh, SEO riêng, cho Google lập chỉ mục);
//    bảng bên phải (tìm, chọn nhiều → xoá, số bài, đổi thứ tự ▲▼ = thứ tự hiện trên web).
//  - Thẻ: danh sách chip kèm số bài, tìm, bấm để sửa / xoá; "Gộp thẻ trùng" gộp các thẻ chỉ khác dấu (VD "phở bo" → "phở bò").
//  - Xoá chuyên mục / thẻ không xoá bài, chỉ gỡ khỏi bài.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { Btn, Card, SearchBox, ErrorBox, Loading, FilterSelect } from "../pcUI";
import { Check, Tog, Field, Lnk, Modal, inpStyle, BLUE } from "./webUI";
import { slugify } from "./webLib";
import { listTerms, termCounts } from "./webApi";
import { Upload } from "./BlockEdit";

const WEB = "https://fipilotai.com";
const CC = "28px minmax(0,2fr) minmax(0,1.4fr) 0.7fr 0.6fr";
const must = ({ data, error }) => { if (error) throw error; return data; };
const BLANK = { id: null, name: "", slug: "", parent_id: "", description: "", image_url: "", seo: {} };

export function PcWebTerms({ top, showToast }) {
  const [tab, setTab] = useState(0);
  const [cats, setCats] = useState(null);
  const [tags, setTags] = useState([]);
  const [cnt, setCnt] = useState({});
  const [err, setErr] = useState("");
  const [f, setF] = useState(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const [qs, setQs] = useState("");
  const [tq, setTq] = useState("");
  const [sel, setSel] = useState([]);
  const [bulk, setBulk] = useState("");
  const [tagEdit, setTagEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    try { const [c, t, n] = await Promise.all([listTerms("category"), listTerms("tag"), termCounts()]); setCats(c); setTags(t); setCnt(n); setSel([]); }
    catch (e) { setErr("Chưa tải được. " + (e.message || "")); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tree = useMemo(() => (cats || []).filter((c) => !c.parent_id).flatMap((c) => [c, ...(cats || []).filter((x) => x.parent_id === c.id).map((x) => ({ ...x, _sub: c.name }))]), [cats]);
  const list = tree.filter((c) => !qs || c.name.toLowerCase().includes(qs.toLowerCase()));
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  useEffect(() => { if (!slugTouched) setF((x) => ({ ...x, slug: slugify(x.name) })); }, [f.name, slugTouched]);

  const saveCat = async () => {
    if (!f.name.trim() || !f.slug) return showToast?.("Nhập tên chuyên mục.");
    if ((cats || []).some((c) => c.slug === f.slug && c.id !== f.id)) return showToast?.(`Đường dẫn “${f.slug}” đã có chuyên mục khác dùng.`);
    setBusy(true);
    try {
      const row = { kind: "category", name: f.name.trim(), slug: f.slug, parent_id: f.parent_id || null, description: f.description || null, image_url: f.image_url || null, seo: f.seo || {} };
      if (f.id) await supabase.from("web_terms").update(row).eq("id", f.id).then(must);
      else await supabase.from("web_terms").insert({ ...row, sort: (cats || []).length }).then(must);
      showToast?.(f.id ? "Đã lưu chuyên mục." : "Đã thêm chuyên mục.");
      setF(BLANK); setSlugTouched(false); await load();
    } catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };
  const del = async (ids, noun = "chuyên mục") => {
    if (!ids.length || !(await appConfirm(`Xoá ${ids.length} ${noun}? Bài viết không bị xoá, chỉ gỡ ${noun} này khỏi bài.`, { danger: true }))) return;
    try { await supabase.from("web_terms").update({ parent_id: null }).in("parent_id", ids).then(must); await supabase.from("web_posts").update({ primary_term: null }).in("primary_term", ids).then(must); await supabase.from("web_terms").delete().in("id", ids).then(must); showToast?.(`Đã xoá ${ids.length} ${noun}.`); if (ids.includes(f.id)) setF(BLANK); setTagEdit(null); await load(); }
    catch (e) { showToast?.("Chưa xoá được: " + (e.message || "")); }
  };
  // Đổi thứ tự trong cùng cấp
  const move = async (c, d) => {
    const sib = (cats || []).filter((x) => (x.parent_id || null) === (c.parent_id || null));
    const i = sib.findIndex((x) => x.id === c.id), j = i + d;
    if (j < 0 || j >= sib.length) return;
    const arr = [...sib]; [arr[i], arr[j]] = [arr[j], arr[i]];
    try { await Promise.all(arr.map((x, k) => supabase.from("web_terms").update({ sort: k }).eq("id", x.id).then(must))); await load(); } catch (e) { showToast?.("Chưa đổi được thứ tự: " + (e.message || "")); }
  };

  // Kéo thả: thả lên 1 chuyên mục cùng cấp → đứng vào chỗ đó
  const dropOn = async (fromId, target) => {
    const from = (cats || []).find((x) => x.id === fromId);
    if (!from || from.id === target.id || (from.parent_id || null) !== (target.parent_id || null)) return;
    const sib = (cats || []).filter((x) => (x.parent_id || null) === (from.parent_id || null)).filter((x) => x.id !== from.id);
    sib.splice(sib.findIndex((x) => x.id === target.id), 0, from);
    try { await Promise.all(sib.map((x, k) => supabase.from("web_terms").update({ sort: k }).eq("id", x.id).then(must))); await load(); } catch (e) { showToast?.("Chưa đổi được thứ tự: " + (e.message || "")); }
  };
  // Thẻ trùng: cùng đường dẫn khi bỏ dấu → gộp vào thẻ nhiều bài hơn
  const dupes = useMemo(() => {
    const by = {};
    for (const t of tags) (by[slugify(t.name).replace(/-/g, "")] ||= []).push(t);
    return Object.values(by).filter((g) => g.length > 1).map((g) => g.sort((a, b) => (cnt[b.id] || 0) - (cnt[a.id] || 0)));
  }, [tags, cnt]);
  const dupOf = useMemo(() => Object.fromEntries(dupes.flatMap((g) => g.slice(1).map((t) => [t.id, g[0]]))), [dupes]);
  const merge = async () => {
    if (!dupes.length) return showToast?.("Không có thẻ trùng.");
    if (!(await appConfirm(`Gộp ${dupes.reduce((n, g) => n + g.length - 1, 0)} thẻ trùng vào thẻ dùng nhiều nhất? (${dupes.map((g) => g.map((t) => `“${t.name}”`).join(" → ")).join("; ")})`))) return;
    setBusy(true);
    try {
      for (const g of dupes) {
        const keep = g[0];
        for (const t of g.slice(1)) {
          const posts = await supabase.from("web_post_terms").select("post_id").eq("term_id", t.id).then(must);
          if (posts.length) await supabase.from("web_post_terms").upsert(posts.map((p) => ({ post_id: p.post_id, term_id: keep.id })), { onConflict: "post_id,term_id", ignoreDuplicates: true }).then(must);
          await supabase.from("web_terms").delete().eq("id", t.id).then(must);
        }
      }
      showToast?.("Đã gộp thẻ trùng."); await load();
    } catch (e) { showToast?.("Chưa gộp được: " + (e.message || "")); }
    setBusy(false);
  };
  const saveTag = async () => {
    const t = tagEdit; const slug = slugify(t.slug || t.name);
    if (!t.name.trim() || !slug) return;
    if (tags.some((x) => x.slug === slug && x.id !== t.id)) return showToast?.(`Đã có thẻ dùng đường dẫn “${slug}”.`);
    try { if (t.id) await supabase.from("web_terms").update({ name: t.name.trim(), slug, seo: t.seo || {} }).eq("id", t.id).then(must); else await supabase.from("web_terms").insert({ kind: "tag", name: t.name.trim(), slug }).then(must); setTagEdit(null); showToast?.("Đã lưu thẻ."); await load(); }
    catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
  };

  const allOn = list.length > 0 && list.every((c) => sel.includes(c.id));
  const tagList = tags.filter((t) => !tq || t.name.toLowerCase().includes(tq.toLowerCase())).sort((a, b) => (cnt[b.id] || 0) - (cnt[a.id] || 0) || a.name.localeCompare(b.name, "vi"));
  return (
    <>
      {top(null, "Chuyên mục & thẻ", "Chuyên mục = nhóm lớn, có trang riêng · Thẻ = nhãn nhỏ gắn bài")}
      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${PC.headLine}` }}>{[["Chuyên mục", (cats || []).length], ["Thẻ", tags.length]].map(([t, n], i) => <button key={t} type="button" onClick={() => setTab(i)} data-testid={`web-terms-tab-${i}`} style={{ padding: "10px 14px", fontSize: 13.5, fontWeight: i === tab ? 800 : 600, color: i === tab ? BLUE : PC.t3, border: 0, background: "none", borderBottom: `2px solid ${i === tab ? BLUE : "transparent"}`, marginBottom: -1, cursor: "pointer", fontFamily: "inherit" }}>{t} <span style={{ color: PC.t4 }}>({n})</span></button>)}</div>
        {err && <ErrorBox text={err} onRetry={load} />}
        {!cats && !err && <Loading />}
        {cats && tab === 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>
            <Card style={{ padding: 0 }} testid="web-cat-form">
              <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>{f.id ? `Sửa “${f.name}”` : "Thêm chuyên mục mới"}</b>{f.id && <span style={{ marginLeft: "auto" }}><Lnk onClick={() => { setF(BLANK); setSlugTouched(false); }}>+ Thêm mới</Lnk></span>}</div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Tên"><input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="VD: Bài tập tại nhà" data-testid="web-cat-name" className="pc-input" style={inpStyle()} /></Field>
                <Field label="Đường dẫn" hint={`fipilotai.com/chu-de/${f.slug || "…"} · tự tạo từ tên, bỏ dấu`}><input value={f.slug} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} className="pc-input" style={{ ...inpStyle(), fontFamily: "ui-monospace, Menlo, monospace" }} /></Field>
                <Field label="Chuyên mục cha"><select value={f.parent_id || ""} onChange={(e) => set({ parent_id: e.target.value })} className="pc-input" style={inpStyle()}><option value="">Không có (cấp 1)</option>{(cats || []).filter((c) => !c.parent_id && c.id !== f.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
                <Field label="Mô tả" hint="Hiện đầu trang chuyên mục — viết 2–3 câu có từ khoá"><textarea value={f.description || ""} onChange={(e) => set({ description: e.target.value })} placeholder="Mô tả chuyên mục…" className="pc-input" style={{ ...inpStyle(64), height: 64, padding: "8px 12px", resize: "vertical", lineHeight: 1.5 }} /></Field>
                <Field label="Ảnh chuyên mục">{f.image_url ? <span style={{ display: "flex", gap: 8, alignItems: "center" }}><img src={f.image_url} alt="" style={{ width: 90, height: 60, borderRadius: 8, objectFit: "cover" }} /><Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => set({ image_url: "" })}>Gỡ</Btn></span> : <Upload box showToast={showToast} name={f.slug} label="+ Chọn ảnh từ máy (tự đổi WebP)" onDone={(r) => set({ image_url: r.url })} />}</Field>
                <div style={{ borderRadius: 10, background: "#F8FAFC", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <b style={{ fontSize: 12.5 }}>SEO trang chuyên mục</b>
                  <input value={f.seo?.title || ""} onChange={(e) => set({ seo: { ...f.seo, title: e.target.value } })} placeholder="Tiêu đề SEO (để trống: dùng tên)" className="pc-input" style={inpStyle(32)} />
                  <input value={f.seo?.desc || ""} onChange={(e) => set({ seo: { ...f.seo, desc: e.target.value } })} placeholder="Mô tả SEO (để trống: dùng mô tả)" className="pc-input" style={inpStyle(32)} />
                  <Tog on={!f.seo?.noindex} onChange={(v) => set({ seo: { ...f.seo, noindex: !v } })} label="Cho Google lập chỉ mục" />
                </div>
                <span style={{ display: "flex", gap: 8 }}><Btn kind="blue" onClick={saveCat} disabled={busy} testid="web-cat-save">{f.id ? "Lưu chuyên mục" : "Thêm chuyên mục"}</Btn>{f.id && <Btn kind="light" onClick={() => { setF(BLANK); setSlugTouched(false); }}>Huỷ</Btn>}</span>
              </div>
            </Card>
            <Card style={{ padding: 0 }} testid="web-cat-table">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: `1px solid ${PC.headLine}` }}>
                <FilterSelect label="Thao tác hàng loạt" value={bulk} onChange={setBulk} options={[{ v: "", label: "Thao tác hàng loạt" }, { v: "delete", label: "Xoá" }]} /><Btn kind="light" disabled={!bulk || !sel.length} onClick={() => del(sel)}>Áp dụng</Btn>
                <span style={{ marginLeft: "auto" }}><SearchBox value={qs} onChange={setQs} placeholder="Tìm chuyên mục" width={240} /></span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: CC, gap: 12, alignItems: "center", padding: "10px 16px", background: PC.headBg, fontSize: 11.5, fontWeight: 800, color: PC.t3, borderBottom: `1px solid ${PC.headLine}` }}><Check on={allOn} onChange={(v) => setSel(v ? list.map((c) => c.id) : [])} /><span>TÊN</span><span>ĐƯỜNG DẪN</span><span>SỐ BÀI</span><span>THỨ TỰ</span></div>
              {list.map((c) => (
                <div key={c.id} className="web-row" data-testid="web-cat-row" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); dropOn(e.dataTransfer.getData("text/plain"), c); }} style={{ display: "grid", gridTemplateColumns: CC, gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${PC.rowLine}`, background: f.id === c.id ? PC.rowSel : "#FFF" }}>
                  <Check on={sel.includes(c.id)} onChange={(v) => setSel((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: c._sub ? 22 : 0, minWidth: 0 }}>
                    <button type="button" onClick={() => { setF({ ...BLANK, ...c, parent_id: c.parent_id || "" }); setSlugTouched(true); }} style={{ border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: BLUE }}>{c._sub ? "— " : ""}{c.name}</button>
                    <span className="web-acts" style={{ fontSize: 12, gap: 8 }}><Lnk onClick={() => { setF({ ...BLANK, ...c, parent_id: c.parent_id || "" }); setSlugTouched(true); }}>Sửa</Lnk><Lnk red onClick={() => del([c.id])} testid="web-cat-del">Xoá</Lnk><Lnk href={`${WEB}/chu-de/${c.slug}`}>Xem ↗</Lnk></span>
                    {c._sub && <span className="web-url" style={{ fontSize: 11.5, color: PC.t4 }}>thuộc {c._sub}</span>}
                  </span>
                  <span style={{ fontSize: 12.5, color: PC.t3, fontFamily: "ui-monospace,monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/chu-de/{c.slug}</span>
                  <b style={{ fontSize: 13, color: cnt[c.id] ? BLUE : PC.t4 }}>{cnt[c.id] || 0}</b>
                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}><span title="Kéo để đổi thứ tự" style={{ color: PC.t4, fontSize: 13, letterSpacing: -2, cursor: "grab" }}>⋮⋮</span><span className="web-acts" style={{ gap: 2 }}><Btn kind="light" style={{ height: 22, width: 22, padding: 0, fontSize: 10 }} title="Lên" onClick={() => move(c, -1)}>▲</Btn><Btn kind="light" style={{ height: 22, width: 22, padding: 0, fontSize: 10 }} title="Xuống" onClick={() => move(c, 1)}>▼</Btn></span></span>
                </div>
              ))}
              {!list.length && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: PC.t3 }}>{cats.length ? "Không có chuyên mục khớp." : "Chưa có chuyên mục nào. Thêm ở khung bên trái."}</div>}
              <div style={{ padding: "12px 16px", fontSize: 12, color: PC.t3 }}>Xoá chuyên mục không xoá bài — chỉ gỡ chuyên mục khỏi bài. Kéo ⋮⋮ để đổi thứ tự hiện trên web (trong cùng cấp).</div>
            </Card>
          </div>
        )}
        {cats && tab === 1 && (
          <Card style={{ padding: 0 }} testid="web-tag-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>Thẻ ({tags.length})</b><span style={{ marginLeft: "auto", display: "flex", gap: 8 }}><SearchBox value={tq} onChange={setTq} placeholder="Tìm thẻ" width={200} /><Btn kind="light" onClick={() => setTagEdit({ id: null, name: "", slug: "" })}>+ Thêm thẻ</Btn><Btn kind="light" disabled={!dupes.length || busy} onClick={merge} testid="web-tag-merge">Gộp thẻ trùng{dupes.length ? ` (${dupes.reduce((n, g) => n + g.length - 1, 0)})` : ""}</Btn></span></div>
            <div style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tagList.map((t) => { const d = dupOf[t.id]; return <button key={t.id} type="button" onClick={() => setTagEdit({ ...t })} data-testid="web-tag-chip" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 10px", borderRadius: 9, border: `1px solid ${d ? "#FCD34D" : PC.line}`, background: d ? "#FFFBEB" : "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: PC.t1 }}>{t.name}<span style={{ fontSize: 11.5, color: PC.t4 }}>{cnt[t.id] || 0} bài</span>{d && <span style={{ fontSize: 11, color: "#B45309", fontWeight: 800 }}>giống “{d.name}” — gộp?</span>}</button>; })}
              {!tagList.length && <span style={{ fontSize: 13, color: PC.t3 }}>{tags.length ? "Không có thẻ khớp." : "Chưa có thẻ. Thẻ được tạo khi gắn vào bài, hoặc bấm “+ Thêm thẻ”."}</span>}
            </div>
          </Card>
        )}
      </div>
      {tagEdit && <Modal title={tagEdit.id ? `Sửa thẻ “${tagEdit.name}”` : "Thêm thẻ"} onClose={() => setTagEdit(null)} width={460} foot={<>{tagEdit.id && <Btn kind="danger" onClick={() => del([tagEdit.id], "thẻ")} style={{ marginRight: "auto" }}>Xoá thẻ</Btn>}<Btn kind="light" onClick={() => setTagEdit(null)}>Huỷ</Btn><Btn kind="blue" onClick={saveTag} testid="web-tag-save">Lưu</Btn></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Tên thẻ"><input autoFocus value={tagEdit.name} onChange={(e) => setTagEdit({ ...tagEdit, name: e.target.value, slug: tagEdit.id ? tagEdit.slug : slugify(e.target.value) })} className="pc-input" style={inpStyle()} /></Field>
          <Field label="Đường dẫn" hint={`fipilotai.com/the/${slugify(tagEdit.slug || tagEdit.name) || "…"} · trang thẻ mặc định không cho Google lập chỉ mục`}><input value={tagEdit.slug || ""} onChange={(e) => setTagEdit({ ...tagEdit, slug: slugify(e.target.value) })} className="pc-input" style={{ ...inpStyle(), fontFamily: "ui-monospace, Menlo, monospace" }} /></Field>
          {tagEdit.id && <Tog on={tagEdit.seo?.index === true} onChange={(v) => setTagEdit({ ...tagEdit, seo: { ...(tagEdit.seo || {}), index: v } })} label="Cho Google lập chỉ mục trang thẻ này" />}
        </div>
      </Modal>}
      <style>{`.web-row .web-acts{display:none}.web-row:hover .web-acts,.web-row:focus-within .web-acts{display:flex}.web-row:hover .web-url{display:none}`}</style>
    </>
  );
}
