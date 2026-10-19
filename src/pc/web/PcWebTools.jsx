// Quản trị PC › WEB & BÀI VIẾT › Công cụ (bản vẽ 138v) — việc làm 1 lần cho nhiều bài:
//  Tìm & thay chữ (tiêu đề, nội dung, mô tả SEO, khối dùng lại; bỏ tick chỗ không muốn thay; mỗi bài đổi ghi 1 bản lịch sử)
//  Link nội bộ (bài mồ côi chưa bài nào trỏ tới + gợi ý bài nên chèn link) · Xuất / nhập (file .json của Fipilot, file .xml của WordPress)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { Btn, Pill, Card, Loading, headRow, bodyRow, cell, vnInt } from "../pcUI";
import { Check, Tabs, Field, Lnk, Radio, inpStyle, BLUE } from "./webUI";
import { slugify, htmlToBlocks, textOf, wordCount } from "./webLib";
import { createTerm, freeSlug, uploadImage } from "./webApi";

const must = ({ data, error }) => { if (error) throw error; return data; };
const H = ({ t, r }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>{t}</b><span style={{ marginLeft: "auto" }}>{r}</span></div>;
const HL = { background: "#FEF08A", borderRadius: 3, padding: "0 2px" };
const TABS = ["Tìm & thay chữ", "Link nội bộ", "Xuất / nhập"];

// ===== Tìm & thay: các ô chữ của 1 bài / khối, kèm "đường dẫn" để ghi lại đúng chỗ =====
function textFields(blocks, base) {
  const out = [];
  (blocks || []).forEach((b, i) => {
    const p = [...base, i];
    for (const k of ["html", "text", "title", "alt", "caption", "label", "button"]) if (typeof b[k] === "string") out.push([[...p, k], b[k]]);
    (b.items || []).forEach((x, j) => { if (typeof x === "string") out.push([[...p, "items", j], x]); else { if (x?.q) out.push([[...p, "items", j, "q"], x.q]); if (x?.a) out.push([[...p, "items", j, "a"], x.a]); } });
    (b.head || []).forEach((x, j) => out.push([[...p, "head", j], x]));
    (b.rows || []).forEach((r, j) => r.forEach((x, k) => out.push([[...p, "rows", j, k], x])));
    (b.cols || []).forEach((x, j) => typeof x === "string" && out.push([[...p, "cols", j], x]));
  });
  return out;
}
// Vị trí chữ cần tìm, bỏ qua chỗ nằm trong thẻ HTML (<a href="…">) để không làm hỏng link
function findAll(str, q, cs) {
  const s = String(str || ""), hay = cs ? s : s.toLowerCase(), needle = cs ? q : q.toLowerCase(); const out = [];
  if (!needle) return out;
  let i = hay.indexOf(needle);
  while (i >= 0) { const lt = s.lastIndexOf("<", i), gt = s.lastIndexOf(">", i); if (!(lt > gt)) out.push(i); i = hay.indexOf(needle, i + needle.length); }
  return out;
}
const getIn = (o, p) => p.reduce((x, k) => (x == null ? x : x[k]), o);
const setIn = (o, p, v) => { const c = Array.isArray(o) ? [...o] : { ...o }; if (p.length === 1) { c[p[0]] = v; return c; } c[p[0]] = setIn(o[p[0]] ?? (typeof p[1] === "number" ? [] : {}), p.slice(1), v); return c; };
const plain = (x) => x.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const ctx = (s, i, n) => { const t = String(s); const a = plain(t.slice(Math.max(0, i - 160), i)).slice(-40), m = t.slice(i, i + n), b = plain(t.slice(i + n, i + n + 160)).slice(0, 40); return [a ? `…${a}` : "", m, b ? `${b}…` : ""]; };

export function PcWebTools({ top, showToast, user, go }) {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const load = async () => {
    const [posts, blocks, terms, links] = await Promise.all([supabase.from("web_posts").select("*").neq("status", "trash").limit(3000).then(must), supabase.from("web_blocks").select("*").then(must), supabase.from("web_terms").select("*").then(must), supabase.from("web_post_terms").select("post_id,term_id").limit(20000).then(must)]);
    setData({ posts, blocks, terms, links });
  };
  useEffect(() => { load().catch((e) => showToast?.("Chưa tải được: " + e.message)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const open = (id) => { try { sessionStorage.setItem("fp_web_open", id); } catch (e) { /* */ } go?.("web_posts"); };
  return (
    <>
      {top(null, "Công cụ", "Việc làm 1 lần cho nhiều bài")}
      <div style={{ background: "#FFF", borderBottom: `1px solid ${PC.line}` }}><Tabs items={TABS} on={tab} onChange={setTab} testid="web-tools-tab" /></div>
      {!data ? <Loading /> : (
        <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: tab === 0 ? "minmax(0,1.3fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
          {tab === 0 && <><Replace data={data} reload={load} showToast={showToast} user={user} /><div style={{ display: "flex", flexDirection: "column", gap: 16 }}><Orphans data={data} open={open} short onMore={() => setTab(1)} /><ExportImport data={data} reload={load} showToast={showToast} user={user} short onMore={() => setTab(2)} /></div></>}
          {tab === 1 && <Orphans data={data} open={open} />}
          {tab === 2 && <ExportImport data={data} reload={load} showToast={showToast} user={user} />}
        </div>
      )}
    </>
  );
}

function Replace({ data, reload, showToast, user }) {
  const [q, setQ] = useState(""); const [to, setTo] = useState("");
  const [f, setF] = useState({ title: true, body: true, seo: true, reuse: false, cs: false });
  const [off, setOff] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const hits = useMemo(() => {
    const s = q.trim(); if (s.length < 2) return [];
    const out = [];
    const add = (table, row, name, path, str) => { for (const i of findAll(str, s, f.cs)) out.push({ k: `${table}|${row.id}|${path.join(".")}|${i}`, table, row, name, path, i }); };
    for (const p of data.posts) {
      if (f.title) add("post", p, p.title, ["title"], p.title);
      if (f.body) for (const [path, v] of textFields(p.blocks, ["blocks"])) add("post", p, p.title, path, v);
      if (f.seo) { add("post", p, p.title, ["seo", "title"], p.seo?.title); add("post", p, p.title, ["seo", "desc"], p.seo?.desc); add("post", p, p.title, ["excerpt"], p.excerpt); }
    }
    if (f.reuse) for (const b of data.blocks) for (const [path, v] of textFields(b.blocks, ["blocks"])) add("block", b, `${b.kind === "template" ? "Mẫu bài" : "Khối dùng lại"}: ${b.name}`, path, v);
    return out.slice(0, 500);
  }, [q, f, data]);
  useEffect(() => setOff(new Set()), [q, f]);
  const picked = hits.filter((h) => !off.has(h.k));
  const rowsN = new Set(picked.map((h) => `${h.table}|${h.row.id}`)).size;
  const run = async () => {
    if (!picked.length) return;
    if (!(await appConfirm(`Thay “${q.trim()}” → “${to}” ở ${picked.length} chỗ trong ${rowsN} bài / khối?`))) return;
    setBusy(true);
    try {
      const by = {}; for (const h of picked) (by[`${h.table}|${h.row.id}`] ||= []).push(h);
      for (const list of Object.values(by)) {
        let row = list[0].row; const len = q.trim().length;
        const byPath = {}; for (const h of list) (byPath[h.path.join(".")] ||= []).push(h);
        for (const hs of Object.values(byPath)) { let v = String(getIn(row, hs[0].path)); for (const h of hs.sort((a, b) => b.i - a.i)) v = v.slice(0, h.i) + to + v.slice(h.i + len); row = setIn(row, hs[0].path, v); }
        if (list[0].table === "post") {
          const patch = { title: row.title, blocks: row.blocks, seo: row.seo, excerpt: row.excerpt, word_count: wordCount(row.blocks), updated_at: new Date().toISOString(), updated_by: user?.id || null };
          await supabase.from("web_posts").update(patch).eq("id", row.id).then(must);
          const terms = data.links.filter((l) => l.post_id === row.id).map((l) => l.term_id);
          await supabase.from("web_revisions").insert({ post_id: row.id, snapshot: { ...row, ...patch, terms }, reason: "replace", created_by: user?.id || null }).then(must);
        } else await supabase.from("web_blocks").update({ blocks: row.blocks, updated_at: new Date().toISOString() }).eq("id", row.id).then(must);
      }
      showToast?.(`Đã thay ${picked.length} chỗ trong ${rowsN} bài / khối. Web đổi theo trong khoảng 1 phút.`); setQ(""); await reload();
    } catch (e) { showToast?.("Chưa thay xong: " + (e.message || "")); }
    setBusy(false);
  };
  return (
    <Card style={{ padding: 0 }}>
      <H t="Tìm & thay chữ trên toàn bộ bài" />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
          <Field label="Tìm"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: Dùng thử 3 ngày" data-testid="web-rp-find" className="pc-input" style={inpStyle()} /></Field>
          <Field label="Thay bằng"><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="VD: Dùng thử 7 ngày" data-testid="web-rp-to" className="pc-input" style={inpStyle()} /></Field>
        </div>
        <span style={{ display: "flex", gap: 16, fontSize: 12.5, flexWrap: "wrap" }}>{[["title", "Tiêu đề"], ["body", "Nội dung"], ["seo", "Mô tả SEO"], ["reuse", "Khối dùng lại"], ["cs", "Phân biệt hoa / thường"]].map(([k, t]) => <Check key={k} on={f[k]} onChange={(v) => setF({ ...f, [k]: v })} label={t} />)}</span>
        {q.trim().length >= 2 && <span style={{ fontSize: 12.5, fontWeight: 800 }}>{hits.length ? `Tìm thấy ${hits.length} chỗ trong ${new Set(hits.map((h) => `${h.table}|${h.row.id}`)).size} bài — bỏ tick chỗ không muốn thay` : "Không tìm thấy chỗ nào."}</span>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
          {hits.map((h) => { const [a, m, b] = ctx(getIn(h.row, h.path), h.i, q.trim().length); return (
            <label key={h.k} data-testid="web-rp-hit" style={{ display: "flex", gap: 10, padding: 10, borderRadius: 10, border: `1px solid ${PC.line}`, cursor: "pointer" }}>
              <Check on={!off.has(h.k)} onChange={(v) => setOff((s) => { const n = new Set(s); if (v) n.delete(h.k); else n.add(h.k); return n; })} />
              <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><b style={{ fontSize: 12.5 }}>{h.name}{h.path[0] !== "blocks" && <span style={{ fontWeight: 500, color: PC.t3 }}> · {h.path[0] === "title" ? "tiêu đề" : h.path[0] === "excerpt" ? "đoạn trích" : h.path[1] === "title" ? "tiêu đề SEO" : "mô tả SEO"}</span>}</b><span style={{ fontSize: 12.5, lineHeight: 1.5, color: PC.t2 }}>{a}<span style={HL}>{m}</span>{b}</span></span>
            </label>); })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><span style={{ fontSize: 11.5, lineHeight: 1.45, color: PC.t3 }}>Mỗi bài được thay ghi 1 bản trong Lịch sử — bản trước đó vẫn khôi phục được. Chữ nằm trong link (href) không bị đụng tới.</span><Btn kind="blue" disabled={busy || !picked.length || !q.trim()} onClick={run} testid="web-rp-run">{busy ? "Đang thay…" : `Thay ${picked.length} chỗ`}</Btn></div>
      </div>
    </Card>
  );
}

// ===== Link nội bộ: bài chưa có bài nào trỏ tới (mồ côi) + gợi ý bài nên chèn link =====
function Orphans({ data, open, short, onMore }) {
  const res = useMemo(() => {
    const live = data.posts.filter((p) => p.status === "published");
    const inb = Object.fromEntries(live.map((p) => [p.slug, new Set()])); const outN = {};
    for (const p of live) { const html = JSON.stringify(p.blocks || []); const seen = new Set(); for (const m of html.matchAll(/href=\\"(?:https?:\/\/(?:www\.)?fipilotai\.com)?\/([a-z0-9-]+)\/?(?:[#?][^"\\]*)?\\"/g)) { if (m[1] !== p.slug && inb[m[1]]) { inb[m[1]].add(p.id); seen.add(m[1]); } } outN[p.id] = seen.size; }
    const cat = Object.fromEntries(data.links.map((l) => [`${l.post_id}|${l.term_id}`, 1]));
    const words = (t) => new Set(slugify(t).split("-").filter((w) => w.length > 2));
    const sug = (p) => { const W = words(p.title); let best = null, sc = 0; for (const x of live) { if (x.id === p.id) continue; let v = 0; for (const w of words(x.title)) if (W.has(w)) v++; if (p.primary_term && (x.primary_term === p.primary_term || cat[`${x.id}|${p.primary_term}`])) v += 2; if (v > sc) { sc = v; best = x; } } return best; };
    const orph = live.filter((p) => p.kind === "post" && !inb[p.slug].size).map((p) => ({ p, s: sug(p) }));
    return { live, inb, outN, orph };
  }, [data]);
  if (short) return (
    <Card style={{ padding: 0 }}>
      <H t="Link nội bộ" r={<Lnk onClick={onMore}>Xem hết</Lnk>} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
        <b>Bài mồ côi — chưa bài nào trỏ link tới ({res.orph.length})</b>
        {res.orph.slice(0, 3).map(({ p, s }) => <div key={p.id} style={{ padding: 10, borderRadius: 10, background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 3 }}><b style={{ color: BLUE }}>{p.title}</b><span style={{ color: PC.t3, lineHeight: 1.45 }}>{s ? <>Gợi ý chèn vào: {s.title} · <Lnk onClick={() => open(s.id)}>Mở để chèn</Lnk></> : "Chưa có bài phù hợp để chèn"}</span></div>)}
        {!res.orph.length && <span style={{ color: "#15803D", fontWeight: 700 }}>✓ Bài nào cũng có ít nhất 1 link trỏ tới.</span>}
      </div>
    </Card>
  );
  const C = "minmax(0,2fr) 90px 90px minmax(0,1.6fr)";
  return (
    <Card style={{ padding: 0 }}>
      <H t="Link nội bộ giữa các bài đã đăng" r={<span style={{ fontSize: 12, color: PC.t3 }}>Bài có nhiều link trỏ tới được Google coi là quan trọng hơn</span>} />
      <div style={{ ...headRow(C), background: PC.headBg }}><span>BÀI</span><span>LINK TỚI</span><span>LINK ĐI</span><span>GỢI Ý</span></div>
      {[...res.live].sort((a, b) => res.inb[a.slug].size - res.inb[b.slug].size).map((p) => { const n = res.inb[p.slug].size; const s = res.orph.find((o) => o.p.id === p.id)?.s; return (
        <div key={p.id} data-testid="web-link-row" style={{ ...bodyRow(C), minHeight: 52 }}>
          <b style={{ ...cell, fontSize: 13, color: BLUE }}>{p.title}</b>
          <span>{n ? vnInt(n) : <Pill tone="amber">0 · mồ côi</Pill>}</span><span style={cell}>{vnInt(res.outN[p.id] || 0)}</span>
          <span style={{ ...cell, color: PC.t3 }}>{!n && s ? <>Chèn link từ “{s.title}” · <Lnk onClick={() => open(s.id)}>Mở để chèn</Lnk></> : (res.outN[p.id] || 0) < 2 ? <>Bài này nên có ≥ 2 link đi · <Lnk onClick={() => open(p.id)}>Mở</Lnk></> : "—"}</span>
        </div>); })}
      {!res.live.length && <div style={{ padding: 20, fontSize: 12.5, color: PC.t3 }}>Chưa có bài nào đăng.</div>}
    </Card>
  );
}

// ===== Xuất / nhập =====
const KEYS = ["web_posts", "web_post_terms", "web_terms", "web_authors", "web_menus", "web_settings", "web_blocks", "web_redirects", "web_calo_pages", "web_media"];
function ExportImport({ data, reload, showToast, user, short, onMore }) {
  const [busy, setBusy] = useState("");
  const [mode, setMode] = useState("add"); // add | overwrite
  const [wpImg, setWpImg] = useState(true);
  const [log, setLog] = useState("");
  const exportAll = async () => {
    setBusy("export");
    try {
      const out = { app: "fipilot-web", version: 1, exported_at: new Date().toISOString() };
      for (const k of KEYS) { const r = await supabase.from(k).select("*").limit(20000); out[k] = r.error ? [] : r.data; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" })); a.download = `fipilotai-web-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      showToast?.(`Đã xuất ${out.web_posts.length} bài / trang, ${out.web_terms.length} chuyên mục & thẻ, ${out.web_media.length} ảnh (link ảnh).`);
    } catch (e) { showToast?.("Chưa xuất được: " + e.message); }
    setBusy("");
  };
  // Nhập file .json đã xuất: chỉ thêm mới (bỏ qua bài trùng đường dẫn) hoặc ghi đè
  const importOwn = async (file) => {
    if (!file) return; setBusy("own"); setLog("");
    try {
      const j = JSON.parse(await file.text()); if (j.app !== "fipilot-web") throw new Error("Không phải file xuất từ Fipilot.");
      const ow = mode === "overwrite"; const n = {};
      const up = async (t, rows, conflict) => { if (!rows?.length) return; const r = ow ? await supabase.from(t).upsert(rows, { onConflict: conflict }) : await supabase.from(t).upsert(rows, { onConflict: conflict, ignoreDuplicates: true }); if (r.error) throw r.error; n[t] = rows.length; };
      await up("web_terms", j.web_terms, "id"); await up("web_authors", j.web_authors, "id");
      const have = new Set(data.posts.map((p) => p.slug));
      const posts = ow ? j.web_posts : (j.web_posts || []).filter((p) => !have.has(p.slug));
      await up("web_posts", posts, "id"); await up("web_post_terms", (j.web_post_terms || []).filter((l) => posts.some((p) => p.id === l.post_id)), "post_id,term_id");
      for (const [t, c] of [["web_menus", "location"], ["web_settings", "key"], ["web_blocks", "id"], ["web_redirects", "src"], ["web_calo_pages", "food_key"], ["web_media", "path"]]) await up(t, j[t], c);
      setLog(`Đã nhập: ${posts.length} bài / trang${ow ? " (ghi đè bài trùng)" : `, bỏ qua ${(j.web_posts || []).length - posts.length} bài trùng đường dẫn`}.`); await reload();
    } catch (e) { setLog("Chưa nhập được: " + (e.message || "")); }
    setBusy("");
  };
  // Nhập từ WordPress (Công cụ › Xuất → file .xml): bài + trang + chuyên mục + thẻ, giữ đường dẫn, thử tải ảnh về kho web
  const importWp = async (file) => {
    if (!file) return; setBusy("wp"); setLog("Đang đọc file…");
    try {
      const doc = new DOMParser().parseFromString(await file.text(), "text/xml");
      if (doc.querySelector("parsererror")) throw new Error("File .xml bị lỗi.");
      const tx = (el, tag) => el.getElementsByTagName(tag)[0]?.textContent || "";
      const items = [...doc.getElementsByTagName("item")].filter((it) => ["post", "page"].includes(tx(it, "wp:post_type")) && tx(it, "wp:status") !== "trash");
      const terms = { category: Object.fromEntries(data.terms.filter((t) => t.kind === "category").map((t) => [t.slug, t.id])), tag: Object.fromEntries(data.terms.filter((t) => t.kind === "tag").map((t) => [t.slug, t.id])) };
      const have = new Set(data.posts.map((p) => p.slug)); let added = 0, skipped = 0, imgOk = 0, imgKeep = 0;
      for (const [k, it] of items.entries()) {
        setLog(`Đang nhập ${k + 1}/${items.length}…`);
        const slug0 = slugify(decodeURIComponent(tx(it, "wp:post_name") || tx(it, "title"))) || `bai-${k + 1}`;
        if (have.has(slug0) && mode !== "overwrite") { skipped++; continue; }
        let html = tx(it, "content:encoded").replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "").replace(/\[\/?[a-z_]+[^\]]*\]/g, "").replace(/\n{2,}/g, "</p><p>");
        if (!/<p[\s>]/i.test(html)) html = `<p>${html}</p>`;
        let blocks = htmlToBlocks(html, (h) => new DOMParser().parseFromString(h, "text/html"));
        if (wpImg) for (const b of blocks) if (b.type === "img" && /^https?:/.test(b.url)) { try { const r = await fetch(b.url, { mode: "cors" }); if (!r.ok) throw 0; const bl = await r.blob(); const up = await uploadImage(new File([bl], b.url.split("/").pop().split("?")[0] || "anh.jpg", { type: bl.type || "image/jpeg" }), b.alt || slug0, { uid: user?.id }); b.url = up.url; b.width = up.width; b.height = up.height; imgOk++; } catch (e) { imgKeep++; } }
        const ids = [];
        for (const c of [...it.getElementsByTagName("category")]) { const kind = c.getAttribute("domain") === "post_tag" ? "tag" : c.getAttribute("domain") === "category" ? "category" : null; if (!kind) continue; const s = slugify(c.getAttribute("nicename") || c.textContent); if (!terms[kind][s]) terms[kind][s] = (await createTerm(kind, c.textContent.trim())).id; ids.push(terms[kind][s]); }
        const st = tx(it, "wp:status"); const gmt = tx(it, "wp:post_date_gmt");
        const row = { kind: tx(it, "wp:post_type") === "page" ? "page" : "post", title: tx(it, "title").trim() || "Bài chưa có tiêu đề", slug: have.has(slug0) ? slug0 : await freeSlug(slug0), status: st === "publish" ? "published" : st === "future" ? "scheduled" : "draft", blocks, excerpt: textOf(tx(it, "excerpt:encoded")).slice(0, 300) || null, published_at: gmt && !gmt.startsWith("0000") ? new Date(gmt.replace(" ", "T") + "Z").toISOString() : null, word_count: wordCount(blocks), primary_term: ids.find((id) => Object.values(terms.category).includes(id)) || null, seo: {}, updated_at: new Date().toISOString(), updated_by: user?.id || null };
        const ex = data.posts.find((p) => p.slug === row.slug);
        const saved = ex ? await supabase.from("web_posts").update(row).eq("id", ex.id).select().single().then(must) : await supabase.from("web_posts").insert(row).select().single().then(must);
        await supabase.from("web_post_terms").delete().eq("post_id", saved.id).then(must);
        if (ids.length) await supabase.from("web_post_terms").insert([...new Set(ids)].map((term_id) => ({ post_id: saved.id, term_id }))).then(must);
        await supabase.from("web_revisions").insert({ post_id: saved.id, snapshot: { ...row, terms: ids }, reason: "replace", created_by: user?.id || null }).then(() => {}, () => {});
        have.add(row.slug); added++;
      }
      setLog(`Đã nhập ${added} bài / trang từ WordPress${skipped ? `, bỏ qua ${skipped} bài trùng đường dẫn` : ""}. Ảnh: ${imgOk} tải về kho web${imgKeep ? `, ${imgKeep} giữ link cũ (web cũ chặn tải)` : ""}.`); await reload();
    } catch (e) { setLog("Chưa nhập được: " + (e.message || "")); }
    setBusy("");
  };
  const FileBtn = ({ accept, onPick, label, testid, dis }) => <label className="pc-btn" style={{ height: 32, padding: "0 14px", borderRadius: 10, background: PC.soft, color: PC.softFg, display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 800, cursor: dis ? "default" : "pointer", opacity: dis ? 0.5 : 1, whiteSpace: "nowrap" }}>{label}<input type="file" accept={accept} disabled={dis} data-testid={testid} style={{ display: "none" }} onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} /></label>;
  const rows = [["Xuất toàn bộ web", "Bài, trang, chuyên mục, thẻ, menu, cài đặt + danh sách ảnh → 1 file .json", <Btn kind="soft" style={{ height: 32, fontSize: 12 }} disabled={!!busy} onClick={exportAll} testid="web-exp">{busy === "export" ? "Đang xuất…" : "Xuất file"}</Btn>], ["Nhập từ WordPress", "File .xml (Công cụ › Xuất của WordPress) — giữ đường dẫn, tự tải ảnh về", <FileBtn accept=".xml,text/xml" onPick={importWp} label={busy === "wp" ? "Đang nhập…" : "Chọn file"} testid="web-imp-wp" dis={!!busy} />], ["Nhập lại bản đã xuất", "Từ file .json của Fipilot — chọn ghi đè hoặc chỉ thêm mới", <FileBtn accept=".json,application/json" onPick={importOwn} label={busy === "own" ? "Đang nhập…" : "Chọn file"} testid="web-imp-own" dis={!!busy} />]];
  return (
    <Card style={{ padding: 0 }}>
      <H t="Xuất / nhập" r={short ? <Lnk onClick={onMore}>Tuỳ chọn</Lnk> : null} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(([t, s, b]) => <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, border: `1px solid ${PC.line}` }}><span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><b style={{ fontSize: 13 }}>{t}</b><span style={{ fontSize: 12, lineHeight: 1.45, color: PC.t3 }}>{s}</span></span>{b}</div>)}
        {!short && <div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 12.5, flexWrap: "wrap" }}><b style={{ fontSize: 12.5 }}>Khi nhập, bài trùng đường dẫn:</b><Radio name="impmode" on={mode === "add"} onChange={() => setMode("add")} label="Bỏ qua (chỉ thêm mới)" /><Radio name="impmode" on={mode === "overwrite"} onChange={() => setMode("overwrite")} label="Ghi đè" /><Check on={wpImg} onChange={setWpImg} label="Tải ảnh từ web WordPress cũ về kho ảnh" /></div>}
        {log && <div data-testid="web-imp-log" style={{ borderRadius: 10, background: "#F5F9FF", padding: "10px 12px", fontSize: 12.5, lineHeight: 1.5 }}>{log}</div>}
      </div>
    </Card>
  );
}
