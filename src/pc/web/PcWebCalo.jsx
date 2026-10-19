// Quản trị PC › WEB & BÀI VIẾT › Trang calo món (bản vẽ 138j).
// Mỗi món trong kho thực phẩm của app có thể thành 1 trang /calo/<ten-mon>. Số calo luôn lấy từ kho (LOCAL_FOODS + food_overrides) — không sửa ở đây.
// Mặc định: món Việt có khẩu phần = có trang. Dòng web_calo_pages ghi đè: bật / tắt, ảnh, đoạn giới thiệu riêng, khẩu phần hiện, bài liên quan, hỏi đáp, cho Google lập chỉ mục.
// Tắt trang → tự thêm chuyển hướng 410 (nguồn calo_off) để Google bỏ link; bật lại → xoá quy tắc đó.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { LOCAL_FOODS, UNIT_MAP } from "../../lib/localFoodDB";
import { Btn, Pill, Card, SearchBox, ErrorBox, Loading, headRow, bodyRow, cell, vnInt } from "../pcUI";
import { Check, Tog, Field, Lnk, Modal, inpStyle, BLUE } from "./webUI";
import { slugify } from "./webLib";
import { foodSlugs } from "../../../web/lib/slug.js";

const SLUG = foodSlugs(Object.keys(LOCAL_FOODS));
import { Upload } from "./BlockEdit";

const WEB = "https://fipilotai.com";
const must = ({ data, error }) => { if (error) throw error; return data; };
const mono = { fontFamily: "ui-monospace, Menlo, monospace" };
const vn = (n) => String(n).replace(".", ",");
const r1 = (n) => Math.round(n * 10) / 10;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const H = ({ t, r }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</b><span style={{ marginLeft: "auto" }}>{r}</span></div>;
const Stat = ({ n, l, s, c = PC.t1 }) => <Card style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{l}</span><b style={{ fontSize: 24, fontWeight: 900, color: c }}>{n}</b>{s && <span style={{ fontSize: 11.5, color: PC.t4 }}>{s}</span>}</Card>;
const sel = { ...inpStyle(34), width: 150 };
const PAGE = 60;

// Kho món như web đọc (giống web/lib/foods.js): số / 100 g đã áp chỉnh sửa admin
function shape(key, f) {
  const portions = (UNIT_MAP[key] || []).map((u) => ({ name: u.name, gram: u.gram, cal: Math.round((f.cal * u.gram) / 100) }));
  return { key, slug: SLUG[key] || slugify(key), name: cap(key), vn: f.region === "vn", per100: { cal: f.cal, p: f.p, c: f.c, f: f.f }, portions };
}
const mainPor = (fd) => fd.portions.find((p) => /vừa/.test(p.name)) || fd.portions[0] || null;
export const autoIntro = (fd) => { const p = mainPor(fd); return p ? `${cap(p.name)} ${fd.name.toLowerCase()} (${p.gram} g) khoảng ${p.cal} kcal. Xem calo theo từng khẩu phần, lượng đạm, tinh bột, chất béo và so với món tương tự.` : `100 g ${fd.name.toLowerCase()} có ${fd.per100.cal} kcal. Xem calo theo từng khẩu phần, lượng đạm, tinh bột, chất béo và so với món tương tự.`; };
// Món có trang hay không: có dòng → theo dòng; chưa có → món Việt có khẩu phần
export const pageOn = (fd, row) => (row ? !!row.enabled : fd.vn && fd.portions.length > 0);

export function PcWebCalo({ top, showToast }) {
  const [foods, setFoods] = useState(null);
  const [rows, setRows] = useState({}); // food_key → dòng đã lưu
  const [edit, setEdit] = useState({}); // food_key → bản đang sửa (chưa lưu)
  const [err, setErr] = useState("");
  const [cur, setCur] = useState(null);
  const [pick, setPick] = useState([]);
  const [fr, setFr] = useState("vn"); const [fs, setFs] = useState(""); const [fi, setFi] = useState(""); const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [posts, setPosts] = useState([]);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => { (async () => {
    try {
      const [ov, pages, ps] = await Promise.all([supabase.from("food_overrides").select("key,p,c,f,cal").then(must), supabase.from("web_calo_pages").select("*").then(must), supabase.from("web_posts").select("id,title,slug").eq("kind", "post").neq("status", "trash").order("updated_at", { ascending: false }).limit(500).then(must)]);
      const o = Object.fromEntries((ov || []).map((x) => [String(x.key || "").toLowerCase().trim(), x]));
      const list = Object.entries(LOCAL_FOODS).map(([k, v]) => { const f = { ...v }; const x = o[k]; if (x) for (const n of ["p", "c", "f", "cal"]) if (x[n] != null) f[n] = +x[n]; return shape(k, f); });
      const rich = (k) => { const r = pages.find((x) => x.food_key === k); return r ? (r.intro ? 2 : 0) + (r.image_url ? 1 : 0) : -1; };
      list.sort((a, b) => (b.vn - a.vn) || (b.portions.length > 0) - (a.portions.length > 0) || rich(b.key) - rich(a.key) || a.name.localeCompare(b.name, "vi"));
      setFoods(list); setRows(Object.fromEntries(pages.map((r) => [r.food_key, r]))); setPosts(ps);
      const first = list.find((f) => pageOn(f, pages.find((r) => r.food_key === f.key)));
      setCur(first?.key || list[0]?.key);
    } catch (e) { setErr("Chưa tải được trang calo. " + (e.message || "")); }
  })(); }, []);
  const dirty = Object.keys(edit).length > 0;
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);

  const byKey = useMemo(() => Object.fromEntries((foods || []).map((f) => [f.key, f])), [foods]);
  const val = (k) => { const fd = byKey[k]; const r = rows[k]; return { food_key: k, slug: r?.slug || fd?.slug, enabled: pageOn(fd, r), intro: "", image_url: "", image_alt: "", portions: null, faq: [], related: [], noindex: false, ...(r || {}), ...(edit[k] || {}), ...(edit[k]?.enabled != null ? { enabled: edit[k].enabled } : {}) }; };
  const set = (k, patch) => setEdit((e) => ({ ...e, [k]: { ...(e[k] || {}), ...patch } }));

  const list = useMemo(() => {
    if (!foods) return [];
    const s = q.trim().toLowerCase();
    return foods.filter((f) => { const v = val(f.key); return (fr !== "vn" || f.vn) && (!fs || (fs === "on" ? v.enabled : !v.enabled)) && (!fi || (fi === "img" ? !!v.image_url : !v.image_url)) && (!s || f.key.includes(s) || f.slug.includes(slugify(s))); });
  }, [foods, rows, edit, fr, fs, fi, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    try {
      const keys = Object.keys(edit);
      const up = keys.map((k) => { const v = val(k); return { food_key: k, slug: v.slug, enabled: !!v.enabled, intro: v.intro?.trim() || null, image_url: v.image_url || null, image_alt: v.image_alt || null, portions: v.portions?.length ? v.portions : null, faq: (v.faq || []).filter((x) => x.q?.trim() && x.a?.trim()), related: v.related || [], noindex: !!v.noindex, updated_at: new Date().toISOString() }; });
      const saved = await supabase.from("web_calo_pages").upsert(up, { onConflict: "food_key" }).select().then(must);
      // Tắt trang → link trả 410 (Google bỏ khỏi kết quả); bật lại → xoá quy tắc
      const off = up.filter((r) => !r.enabled).map((r) => `/calo/${r.slug}`); const on = up.filter((r) => r.enabled).map((r) => `/calo/${r.slug}`);
      if (on.length) await supabase.from("web_redirects").delete().eq("source", "calo_off").in("src", on).then(must);
      if (off.length) { const have = new Set((await supabase.from("web_redirects").select("src").in("src", off).then(must)).map((x) => x.src)); const add = off.filter((s) => !have.has(s)).map((src) => ({ src, dest: null, code: 410, match: "exact", source: "calo_off" })); if (add.length) await supabase.from("web_redirects").insert(add).then(must); }
      setRows((r) => ({ ...r, ...Object.fromEntries(saved.map((x) => [x.food_key, x])) })); setEdit({});
      showToast?.(`Đã lưu ${up.length} trang calo. Web đổi theo trong khoảng 5 phút.`);
    } catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };
  const bulkSet = async (on) => {
    const ks = pick.length ? pick : list.map((f) => f.key);
    if (!on && !(await appConfirm(`Tắt ${ks.length} trang calo? Link các trang này sẽ báo 410 cho Google.`, { danger: true }))) return;
    setEdit((e) => { const n = { ...e }; for (const k of ks) n[k] = { ...(n[k] || {}), enabled: on }; return n; });
    setBulk(false); setPick([]); showToast?.(`Đã ${on ? "bật" : "tắt"} ${ks.length} trang — bấm Lưu để áp dụng.`);
  };

  if (err) return <>{top(null)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!foods) return <>{top(null)}<Loading /></>;
  const allV = foods.map((f) => ({ f, v: val(f.key) }));
  const onCount = allV.filter((x) => x.v.enabled).length;
  const noImg = allV.filter((x) => x.v.enabled && !x.v.image_url).length;
  const wrote = allV.filter((x) => x.v.enabled && x.v.intro?.trim()).length;
  const fd = cur && byKey[cur]; const v = fd && val(cur); const mp = fd && mainPor(fd);
  const porList = fd ? [{ name: "100 g", gram: 100 }, ...fd.portions] : [];
  const shown = (n) => !v.portions?.length || v.portions.includes(n);
  const C = "28px 1.5fr 1.4fr 1.4fr 0.7fr 0.8fr 0.6fr 50px";
  return (
    <>
      {top(<span style={{ display: "flex", gap: 8, position: "relative" }}><Btn kind="light" onClick={() => setBulk((x) => !x)} testid="web-calo-bulk">Bật hàng loạt…</Btn><Btn kind="blue" onClick={save} disabled={busy || !dirty} testid="web-calo-save">{busy ? "Đang lưu…" : "Lưu"}</Btn>
        {bulk && <span style={{ position: "absolute", top: 40, right: 60, zIndex: 9, width: 260, background: "#FFF", borderRadius: 12, border: `1px solid ${PC.line}`, boxShadow: "0 10px 28px rgba(15,23,42,.14)", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: PC.t3, padding: "4px 6px" }}>{pick.length ? `${pick.length} món đã chọn` : `${list.length} món đang lọc`}</span>
          <Btn kind="soft" onClick={() => bulkSet(true)} testid="web-calo-bulk-on">Bật trang</Btn><Btn kind="light" onClick={() => bulkSet(false)}>Tắt trang</Btn>
        </span>}
      </span>, "Trang calo món", "Mỗi món trong kho có thể thành 1 trang /calo/… · số calo luôn lấy từ kho món, sửa kho là trang tự đổi")}
      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat l="Món trong kho" n={vnInt(foods.length)} s="lấy từ Kho thực phẩm của app" />
          <Stat l="Đang có trang" n={vnInt(onCount)} c={BLUE} s={`${vnInt(allV.filter((x) => x.v.enabled && x.f.vn).length)} món Việt`} />
          <Stat l="Chưa có ảnh" n={vnInt(noImg)} c="#B45309" s="trang không ảnh vẫn chạy, nhưng kém hơn" />
          <Stat l="Đã viết giới thiệu riêng" n={vnInt(wrote)} c="#15803D" s="còn lại dùng đoạn tự sinh từ số liệu" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 16, alignItems: "start" }}>
          <Card style={{ padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: `1px solid ${PC.headLine}` }}>
              <select value={fr} onChange={(e) => { setFr(e.target.value); setLimit(PAGE); }} className="pc-input" style={sel}><option value="vn">Món Việt</option><option value="">Mọi món</option></select>
              <select value={fs} onChange={(e) => { setFs(e.target.value); setLimit(PAGE); }} className="pc-input" style={sel} data-testid="web-calo-fs"><option value="">Tất cả</option><option value="on">Đang có trang</option><option value="off">Chưa có / đã tắt</option></select>
              <select value={fi} onChange={(e) => { setFi(e.target.value); setLimit(PAGE); }} className="pc-input" style={sel}><option value="">Có / chưa có ảnh</option><option value="img">Có ảnh</option><option value="noimg">Chưa có ảnh</option></select>
              <span style={{ marginLeft: "auto" }}><SearchBox value={q} onChange={(x) => { setQ(x); setLimit(PAGE); }} placeholder="Tìm món…" width={200} testid="web-calo-q" /></span>
            </div>
            <div style={{ ...headRow(C), borderRadius: 0 }}><Check on={list.length > 0 && list.slice(0, limit).every((f) => pick.includes(f.key))} onChange={(x) => setPick(x ? list.slice(0, limit).map((f) => f.key) : [])} /><span>Món</span><span>Đường dẫn</span><span>Calo</span><span>Ảnh</span><span>Giới thiệu</span><span>Xem 30 ngày</span><span>Trang</span></div>
            {list.slice(0, limit).map((f, i) => { const x = val(f.key); const p = mainPor(f); return (
              <div key={f.key} data-testid="web-calo-row" data-key={f.key} onClick={() => setCur(f.key)} style={{ ...bodyRow(C, f.key === cur), minHeight: 56, cursor: "pointer" }}>
                <span onClick={(e) => e.stopPropagation()}><Check on={pick.includes(f.key)} onChange={(on) => setPick((s) => (on ? [...s, f.key] : s.filter((k) => k !== f.key)))} /></span>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>{x.image_url ? <img src={x.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 36, height: 36, borderRadius: 8, border: "1.5px dashed #FCD34D", background: "#FFFBEB", flexShrink: 0 }} />}<b style={{ fontSize: 13.5, color: BLUE, ...cell }}>{f.name}</b>{edit[f.key] && <span title="Chưa lưu" style={{ width: 7, height: 7, borderRadius: 4, background: "#F59E0B", flexShrink: 0 }} />}</span>
                <span style={{ ...cell, ...mono, color: PC.t3 }}>/calo/{x.slug}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}><b style={{ fontSize: 12.5 }}>{f.per100.cal} kcal / 100 g</b><span style={{ ...cell, fontSize: 11.5, color: PC.t3 }}>{p ? `${p.name} ${p.gram} g = ${p.cal}` : "chưa có khẩu phần"}</span></span>
                <span>{x.image_url ? <Pill tone="green">Có</Pill> : <Pill tone="amber">Chưa có</Pill>}</span>
                <span>{x.intro?.trim() ? <Pill tone="blue">Đã viết</Pill> : <span style={{ fontSize: 12, color: PC.t3 }}>Tự sinh</span>}</span>
                <span style={{ ...cell, color: PC.t2 }}>—</span>
                <span onClick={(e) => e.stopPropagation()}><Tog on={x.enabled} onChange={(on) => set(f.key, { enabled: on })} testid={`web-calo-on-${f.slug}`} /></span>
              </div>); })}
            {!list.length && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: PC.t3 }}>Không có món khớp bộ lọc.</div>}
            {list.length > limit && <div style={{ padding: "10px 16px", borderTop: `1px solid ${PC.rowLine}` }}><Btn kind="light" onClick={() => setLimit((n) => n + PAGE)}>Xem thêm ({vnInt(list.length - limit)} món)</Btn></div>}
            <div style={{ padding: "12px 16px", fontSize: 12, color: PC.t3 }}>Lượt xem hiện khi có Thống kê web. Tắt trang → đường dẫn trả lỗi 410 và tự bỏ khỏi sitemap.</div>
          </Card>
          {fd && (
            <Card style={{ padding: 0, position: "sticky", top: 12 }}>
              <H t={`${fd.name} · trang /calo/${v.slug}`} r={v.enabled ? <Lnk onClick={() => window.open(`${WEB}/calo/${v.slug}`, "_blank", "noopener")}>Xem ↗</Lnk> : <Pill tone="gray">Đang tắt</Pill>} />
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ borderRadius: 10, background: "#F5F9FF", padding: 10, fontSize: 12.5, lineHeight: 1.6 }}><b>Số liệu từ kho món (không sửa ở đây)</b><br />100 g: {fd.per100.cal} kcal · đạm {vn(fd.per100.p)} g · tinh bột {vn(fd.per100.c)} g · béo {vn(fd.per100.f)} g{mp && <><br />{cap(mp.name)} {mp.gram} g: {mp.cal} kcal</>}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {v.image_url ? <img src={v.image_url} alt="" style={{ width: 88, height: 60, objectFit: "cover", borderRadius: 8 }} /> : <span style={{ width: 88, height: 60, borderRadius: 8, border: "1.5px dashed #FCD34D", background: "#FFFBEB", flexShrink: 0 }} />}
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}><span style={{ fontSize: 12, color: PC.t3, ...cell }}>{v.image_url ? decodeURIComponent(v.image_url.split("/").pop()) : "Chưa có ảnh"}</span><span style={{ display: "flex", gap: 6 }}><Upload showToast={showToast} name={v.slug} label={v.image_url ? "Đổi ảnh" : "Tải ảnh"} onDone={(r) => set(cur, { image_url: r.url, image_alt: v.image_alt || `${fd.name} bao nhiêu calo` })} />{v.image_url && <Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => set(cur, { image_url: "" })}>Bỏ</Btn>}</span></span>
                </div>
                <Field label="Đoạn giới thiệu riêng" hint="Để trống: tự viết từ số liệu (không gọi AI)">
                  <textarea value={v.intro || ""} onChange={(e) => set(cur, { intro: e.target.value })} placeholder={autoIntro(fd)} data-testid="web-calo-intro" className="pc-input" style={{ ...inpStyle(), height: 78, padding: "8px 12px", lineHeight: 1.55, resize: "vertical" }} />
                </Field>
                <Field label="Khẩu phần hiện trên trang">
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{porList.map((p) => { const on = p.name === "100 g" ? v.portions?.includes("100 g") || (!fd.portions.length) : shown(p.name); return <button key={p.name} type="button" onClick={() => { const cur0 = v.portions?.length ? v.portions : fd.portions.map((x) => x.name); const nx = cur0.includes(p.name) ? cur0.filter((x) => x !== p.name) : [...cur0, p.name]; if (!nx.filter((x) => x !== "100 g").length && fd.portions.length) return showToast?.("Cần hiện ít nhất 1 khẩu phần."); set(cur, { portions: nx.length === fd.portions.length && !nx.includes("100 g") ? null : nx }); }} title="Bấm để ẩn / hiện khẩu phần này trên trang" style={{ fontSize: 12, borderRadius: 8, padding: "4px 9px", border: 0, cursor: "pointer", fontFamily: "inherit", background: on ? BLUE : "#F1F5F9", color: on ? "#FFF" : PC.t2, fontWeight: 700 }}>{p.name === "100 g" ? "100 g" : `${cap(p.name)} ${p.gram} g`}</button>; })}</span>
                </Field>
                <Field label="Bài liên quan">
                  <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(v.related || []).map((id) => { const p = posts.find((x) => x.id === id); return <span key={id} style={{ fontSize: 12.5, padding: "6px 8px", borderRadius: 8, background: "#F8FAFC", display: "flex", gap: 6 }}><span style={{ flex: 1, minWidth: 0, ...cell }}>{p?.title || "Bài đã xoá"}</span><button type="button" onClick={() => set(cur, { related: v.related.filter((x) => x !== id) })} style={{ border: 0, background: "none", cursor: "pointer", color: PC.t3 }}>×</button></span>; })}
                    <select value="" onChange={(e) => e.target.value && set(cur, { related: [...(v.related || []), e.target.value].slice(0, 6) })} style={{ height: 18, border: 0, padding: 0, background: "none", fontSize: 12.5, color: BLUE, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", appearance: "none", width: "fit-content" }}><option value="">+ Thêm bài</option>{posts.filter((p) => !(v.related || []).includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
                  </span>
                </Field>
                <Field label="Hỏi đáp riêng cho món"><span style={{ fontSize: 12.5, color: PC.t2 }}>{(v.faq || []).length} câu · <Lnk onClick={() => setFaqOpen(true)}>Sửa</Lnk></span></Field>
                <Tog on={!v.noindex} onChange={(on) => set(cur, { noindex: !on })} label="Cho Google lập chỉ mục" />
              </div>
            </Card>
          )}
        </div>
      </div>
      {faqOpen && fd && <FaqModal faq={v.faq || []} name={fd.name} onClose={() => setFaqOpen(false)} onSave={(faq) => { set(cur, { faq }); setFaqOpen(false); }} />}
    </>
  );
}

function FaqModal({ faq, name, onClose, onSave }) {
  const [list, setList] = useState(faq.length ? faq : [{ q: `Ăn ${name.toLowerCase()} có béo không?`, a: "" }]);
  const upd = (i, p) => setList((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <Modal title={`Hỏi đáp · ${name}`} onClose={onClose} width={560} foot={<><Btn kind="light" onClick={onClose}>Huỷ</Btn><Btn kind="blue" onClick={() => onSave(list.filter((x) => x.q.trim() && x.a.trim()))}>Xong</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((x, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 10, background: "#F8FAFC" }}>
            <span style={{ display: "flex", gap: 6 }}><input value={x.q} onChange={(e) => upd(i, { q: e.target.value })} placeholder="Câu hỏi" className="pc-input" style={{ ...inpStyle(34), fontWeight: 700 }} /><Btn kind="light" style={{ height: 34 }} onClick={() => setList((l) => l.filter((_, k) => k !== i))}>Xoá</Btn></span>
            <textarea value={x.a} onChange={(e) => upd(i, { a: e.target.value })} placeholder="Câu trả lời (ngắn, trả lời thẳng)" className="pc-input" style={{ ...inpStyle(), height: 64, padding: "8px 12px", lineHeight: 1.5 }} />
          </div>
        ))}
        {list.length < 8 && <Lnk onClick={() => setList((l) => [...l, { q: "", a: "" }])}>+ Thêm câu</Lnk>}
        <span style={{ fontSize: 11.5, color: PC.t3 }}>Câu bỏ trống sẽ bị bỏ. Hiện trên trang và gắn schema Hỏi đáp (FAQPage).</span>
      </div>
    </Modal>
  );
}
