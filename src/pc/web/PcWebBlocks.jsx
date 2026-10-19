// Quản trị PC › WEB & BÀI VIẾT › Khối dùng lại (bản vẽ 138t) — bảng web_blocks:
//  kind 'block'    = khối dùng lại: bài chèn khối { type: "ref", id } (gõ "/" → nhóm Khối dùng lại); sửa ở đây → mọi bài đang dùng tự đổi (web thay lúc hiển thị).
//  kind 'template' = mẫu bài: khung có sẵn khi viết bài mới (chép khối vào bài, sửa riêng từng bài).
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { toVNDate, todayVN, addDays } from "../../lib/dateVN";
import { Btn, Card, ErrorBox, Loading, headRow, bodyRow, cell } from "../pcUI";
import { Tabs, Field, Lnk, Modal, inpStyle, BLUE } from "./webUI";
import { BLOCK_GROUPS, BLOCK_NAME, newBlock, withKeys, forSave } from "./blocksMeta";
import { Rich, ListEdit, OtherBlock, H_STYLE } from "./BlockEdit";

const WEB = "https://fipilotai.com";
const must = ({ data, error }) => { if (error) throw error; return data; };
const ICON = { app: "📱", tip: "⚠️", calo: "🍜", calo_table: "🍜", faq: "?", img: "🖼", gallery: "▤", youtube: "▶", button: "⬭", table: "≣", list: "⋮≡", quote: "❝", h: "H", p: "¶", html: "</>", cols: "▥", hr: "—", toc: "☷" };
const H = ({ t, r }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</b><span style={{ marginLeft: "auto", flexShrink: 0 }}>{r}</span></div>;
const day = (iso) => { const a = toVNDate(iso), t = todayVN(); return a === t ? "Hôm nay" : a === addDays(t, -1) ? "Hôm qua" : `${a.slice(8, 10)}/${a.slice(5, 7)}`; };
const SAMPLE = {
  block: { name: "Hộp mời mở app", blocks: [{ type: "app", title: "Không muốn tự tính calo từng bữa?", text: "App lên sẵn thực đơn món Việt đúng calo cho cả tuần.", button: "Dùng thử miễn phí", url: "https://app.fipilotai.com/?ref=%bai%" }] },
  template: { name: "Bài calo 1 món", blocks: [{ type: "p", html: "" }, { type: "calo", food: "", portion: "" }, { type: "h", level: 2, text: "Ăn sao khi giảm cân?" }, { type: "p", html: "" }, { type: "faq", title: "Câu hỏi thường gặp", items: [{ q: "", a: "" }] }] },
};

export function PcWebBlocks({ top, showToast }) {
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState(null);
  const [use, setUse] = useState({}); // id → [{ title, slug }]
  const [err, setErr] = useState("");
  const [cur, setCur] = useState(null); // bản đang sửa { id?, kind, name, blocks }
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showUse, setShowUse] = useState(false);
  const kind = tab === 0 ? "block" : "template";

  const load = useCallback(async () => {
    try {
      const [b, posts] = await Promise.all([supabase.from("web_blocks").select("*").order("updated_at", { ascending: false }).then(must), supabase.from("web_posts").select("title,slug,status,blocks").neq("status", "trash").limit(3000).then(must)]);
      const m = {}; for (const p of posts) for (const x of p.blocks || []) if (x?.type === "ref" && x.id) { (m[x.id] ||= []); if (!m[x.id].some((y) => y.slug === p.slug)) m[x.id].push({ title: p.title, slug: p.slug, status: p.status }); }
      setRows(b); setUse(m); return b;
    } catch (e) { setErr("Chưa tải được khối dùng lại. " + (e.message || "")); return null; }
  }, []);
  useEffect(() => { load().then((b) => { const f = b?.find((x) => x.kind === "block"); if (f) setCur({ ...f, blocks: withKeys(f.blocks) }); }); }, [load]);
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);

  const list = useMemo(() => (rows || []).filter((r) => r.kind === kind), [rows, kind]);
  const open = async (r) => { if (dirty && !(await appConfirm("Khối đang sửa chưa lưu. Bỏ thay đổi?"))) return; setCur({ ...r, blocks: withKeys(r.blocks) }); setDirty(false); };
  const switchTab = async (i) => { if (dirty && !(await appConfirm("Khối đang sửa chưa lưu. Bỏ thay đổi?"))) return; setTab(i); setDirty(false); const k = i === 0 ? "block" : "template"; const f = (rows || []).find((x) => x.kind === k); setCur(f ? { ...f, blocks: withKeys(f.blocks) } : null); };
  const create = async () => { if (dirty && !(await appConfirm("Khối đang sửa chưa lưu. Bỏ thay đổi?"))) return; const s = SAMPLE[kind]; const taken = new Set(list.map((r) => r.name)); let name = s.name, n = 2; while (taken.has(name)) name = `${s.name} ${n++}`; setCur({ id: null, kind, name, blocks: withKeys(s.blocks) }); setDirty(true); };
  const upd = (patch) => { setCur((c) => ({ ...c, ...patch })); setDirty(true); };
  const save = async () => {
    if (!cur.name.trim()) return showToast?.("Đặt tên cho khối.");
    const blocks = forSave(cur.blocks);
    if (!blocks.length) return showToast?.("Khối chưa có nội dung.");
    if (blocks.some((b) => b.type === "ref")) return showToast?.("Khối dùng lại không chứa khối dùng lại khác.");
    setBusy(true);
    try {
      const row = { name: cur.name.trim(), kind: cur.kind, blocks, updated_at: new Date().toISOString() };
      const saved = cur.id ? await supabase.from("web_blocks").update(row).eq("id", cur.id).select().single().then(must) : await supabase.from("web_blocks").insert(row).select().single().then(must);
      setCur({ ...saved, blocks: withKeys(saved.blocks) }); setDirty(false); await load();
      const n = (use[saved.id] || []).length;
      showToast?.(cur.kind === "block" ? `Đã lưu khối${n ? ` — ${n} bài đang dùng đổi theo trong khoảng 1 phút` : ""}.` : "Đã lưu mẫu bài.");
    } catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };
  const del = async () => {
    const n = (use[cur.id] || []).length;
    if (!(await appConfirm(n ? `Khối đang dùng ở ${n} bài — xoá thì các bài đó mất phần này. Vẫn xoá “${cur.name}”?` : `Xoá “${cur.name}”?`, { danger: true }))) return;
    try { await supabase.from("web_blocks").delete().eq("id", cur.id).then(must); showToast?.("Đã xoá."); setDirty(false); const b = await load(); const f = b?.find((x) => x.kind === kind); setCur(f ? { ...f, blocks: withKeys(f.blocks) } : null); }
    catch (e) { showToast?.("Chưa xoá được: " + (e.message || "")); }
  };

  if (err) return <>{top(null)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!rows) return <>{top(null)}<Loading /></>;
  const nB = rows.filter((r) => r.kind === "block").length, nT = rows.length - nB;
  const C = "2fr 0.9fr 0.9fr";
  const u = cur?.id ? use[cur.id] || [] : [];
  return (
    <>
      {top(<Btn kind="blue" onClick={create} testid="web-blk-new">{tab === 0 ? "+ Tạo khối" : "+ Tạo mẫu bài"}</Btn>, "Khối dùng lại", "Sửa 1 lần ở đây → mọi bài đang dùng khối tự đổi theo")}
      <div style={{ background: "#FFF", borderBottom: `1px solid ${PC.line}` }}><Tabs items={[`Khối dùng lại (${nB})`, `Mẫu bài (${nT})`]} on={tab} onChange={switchTab} testid="web-blk-tab" /></div>
      <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.64fr)", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ ...headRow(C), background: PC.headBg }}><span>{tab === 0 ? "TÊN KHỐI" : "TÊN MẪU"}</span><span>{tab === 0 ? "ĐANG DÙNG" : "SỐ KHỐI"}</span><span>SỬA LẦN CUỐI</span></div>
          {list.map((r) => (
            <button key={r.id} type="button" onClick={() => open(r)} data-testid="web-blk-row" style={{ ...bodyRow(C, cur?.id === r.id), minHeight: 52, cursor: "pointer" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}><span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{ICON[r.blocks?.[0]?.type] || "▣"}</span><b style={{ ...cell, fontSize: 13, color: BLUE }}>{r.name}</b></span>
              <span style={cell}>{tab === 0 ? `${(use[r.id] || []).length} bài` : `${(r.blocks || []).length} khối`}</span>
              <span style={cell}>{day(r.updated_at)}</span>
            </button>
          ))}
          {cur && !cur.id && cur.kind === kind && <div style={{ ...bodyRow(C, true) }}><span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 15, width: 20, textAlign: "center" }}>＋</span><b style={{ fontSize: 13, color: BLUE }}>{cur.name}</b></span><span style={{ ...cell, color: PC.t3 }}>Chưa lưu</span><span /></div>}
          {!list.length && !(cur && !cur.id) && <div style={{ padding: 20, fontSize: 12.5, color: PC.t3 }}>{tab === 0 ? "Chưa có khối dùng lại nào." : "Chưa có mẫu bài nào."}</div>}
          <div style={{ padding: "12px 16px", fontSize: 12, color: PC.t3, lineHeight: 1.5 }}>Trong trình soạn: gõ “/” → nhóm “Khối dùng lại”. Muốn sửa riêng 1 bài thì bấm “Tách khỏi khối dùng lại”.<br />Mẫu bài: khung có sẵn khi viết bài mới (VD “Bài calo 1 món”: mở bài → khối calo → cách ăn khi giảm cân → hỏi đáp).</div>
        </Card>
        {cur && cur.kind === kind ? (
          <Card style={{ padding: 0 }}>
            <H t={`${cur.id ? "Sửa" : "Tạo"} ${kind === "block" ? "khối" : "mẫu bài"} · ${cur.name || "chưa đặt tên"}`} r={<span style={{ display: "flex", gap: 8, alignItems: "center" }}>{kind === "block" && cur.id && <Lnk onClick={() => setShowUse(true)}>Xem {u.length} bài đang dùng</Lnk>}<Btn kind="blue" style={{ height: 30, fontSize: 12 }} onClick={save} disabled={busy || !dirty} testid="web-blk-save">{busy ? "Đang lưu…" : kind === "block" ? "Lưu khối" : "Lưu mẫu"}</Btn></span>} />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <BlockList blocks={cur.blocks} onChange={(blocks) => upd({ blocks })} showToast={showToast} />
              <div style={{ height: 1, background: PC.headLine }} />
              <Field label={kind === "block" ? "Tên khối (chỉ admin thấy)" : "Tên mẫu"}><input value={cur.name} onChange={(e) => upd({ name: e.target.value })} data-testid="web-blk-name" className="pc-input" style={inpStyle(34)} /></Field>
              {cur.id && <span style={{ display: "flex", justifyContent: "flex-end" }}><Btn kind="light" style={{ height: 30, fontSize: 12, color: PC.danger }} onClick={del} testid="web-blk-del">Xoá {kind === "block" ? "khối" : "mẫu"}</Btn></span>}
            </div>
          </Card>
        ) : <Card style={{ padding: 24, fontSize: 12.5, color: PC.t3 }}>Bấm “{tab === 0 ? "+ Tạo khối" : "+ Tạo mẫu bài"}” để bắt đầu.</Card>}
      </div>
      {showUse && <Modal title={`Bài đang dùng · ${cur.name}`} onClose={() => setShowUse(false)} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{u.map((p) => <a key={p.slug} href={`${WEB}/${p.slug}`} target="_blank" rel="noopener" style={{ fontSize: 13, color: BLUE, fontWeight: 700 }}>{p.title}{p.status !== "published" && <span style={{ color: PC.t3, fontWeight: 500 }}> · chưa đăng</span>}</a>)}{!u.length && <span style={{ fontSize: 12.5, color: PC.t3 }}>Chưa bài nào dùng khối này.</span>}</div>
      </Modal>}
    </>
  );
}

// Danh sách khối gọn (sửa khối dùng lại / mẫu bài): mỗi khối có lên / xuống / xoá; thêm khối theo 4 nhóm của trình soạn
export function BlockList({ blocks, onChange, showToast }) {
  const set = (i, patch) => onChange(blocks.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const tb = { height: 24, minWidth: 24, border: 0, borderRadius: 6, background: "#F1F5F9", color: PC.t2, cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((b, i) => {
        let body;
        if (b.type === "app") body = <><AppPreview b={b} /><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
          <Field label="Tiêu đề"><input value={b.title || ""} onChange={(e) => set(i, { title: e.target.value })} placeholder="Muốn app lên sẵn thực đơn đúng calo?" data-testid="web-blk-app-title" className="pc-input" style={inpStyle(34)} /></Field>
          <Field label="Chữ trên nút"><input value={b.button || ""} onChange={(e) => set(i, { button: e.target.value })} placeholder="Mở app" className="pc-input" style={inpStyle(34)} /></Field>
          <Field label="Dòng phụ"><input value={b.text || ""} onChange={(e) => set(i, { text: e.target.value })} placeholder="Fipilot AI tự lên thực đơn món Việt đúng calo cho bạn — miễn phí." className="pc-input" style={inpStyle(34)} /></Field>
          <Field label="Nút dẫn tới"><input title="%bai% = đường dẫn bài đang chứa khối (đếm lượt bấm theo bài)" value={b.url || ""} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://app.fipilotai.com/?ref=%bai%" className="pc-input" style={{ ...inpStyle(34), fontFamily: "ui-monospace, Menlo, monospace" }} /></Field>
        </div></>;
        else if (b.type === "p") body = <Rich html={b.html} onChange={(v) => set(i, { html: v })} placeholder="Đoạn văn…" style={{ fontSize: 15 }} />;
        else if (b.type === "h") body = <Rich html={b.text} onChange={(v) => set(i, { text: v })} placeholder={`Tiêu đề H${b.level || 2}`} style={H_STYLE[b.level || 2]} />;
        else if (b.type === "quote") body = <Rich html={b.html} onChange={(v) => set(i, { html: v })} placeholder="Trích dẫn…" style={{ borderLeft: `4px solid ${BLUE}`, paddingLeft: 16, fontStyle: "italic", color: PC.t2 }} />;
        else if (b.type === "tip") body = <Rich html={b.html} onChange={(v) => set(i, { html: v })} placeholder="Mẹo / lưu ý…" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 14px", fontSize: 15 }} />;
        else if (b.type === "list") body = <ListEdit b={b} set={(patch) => set(i, patch)} />;
        else body = <OtherBlock b={b} set={(patch) => set(i, patch)} showToast={showToast} slug="khoi" />;
        return (
          <div key={b._k} data-testid="web-blk-item" data-type={b.type} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {blocks.length > 1 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".04em", marginRight: "auto" }}>{(BLOCK_NAME[b.type] || b.type).toUpperCase()}</span><button type="button" title="Lên" style={tb} onClick={() => move(i, -1)}>↑</button><button type="button" title="Xuống" style={tb} onClick={() => move(i, 1)}>↓</button><button type="button" title="Xoá khối" style={{ ...tb, color: PC.danger }} onClick={() => onChange(blocks.filter((_, k) => k !== i))}>✕</button></span>}
            {body}
          </div>
        );
      })}
      <select value="" onChange={(e) => { if (e.target.value) onChange([...blocks, newBlock(e.target.value)]); }} data-testid="web-blk-add" style={{ alignSelf: "flex-start", height: 22, border: 0, padding: 0, background: "none", color: BLUE, fontWeight: 700, fontSize: 12.5, cursor: "pointer", appearance: "none", fontFamily: "inherit" }}>
        <option value="">+ Thêm khối</option>
        {BLOCK_GROUPS.map(([g, l]) => <optgroup key={g} label={g}>{l.filter(([t]) => t !== "toc").map(([t, , name]) => <option key={t} value={t}>{name}</option>)}</optgroup>)}
      </select>
    </div>
  );
}

// Xem trước Hộp mời mở app (bản vẽ 138t)
function AppPreview({ b }) {
  return (
    <div style={{ borderRadius: 18, background: "linear-gradient(135deg,#0B1F45,#0050E6)", color: "#FFF", padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 17 }}>{b.title || "Muốn app lên sẵn thực đơn đúng calo?"}</b><span style={{ fontSize: 13, opacity: 0.85 }}>{b.text || "Fipilot AI tự lên thực đơn món Việt đúng calo cho bạn — miễn phí."}</span><span style={{ alignSelf: "flex-start", marginTop: 4, height: 36, padding: "0 14px", borderRadius: 10, background: "#FFF", color: BLUE, fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center" }}>{b.button || "Mở app"}</span></span>
      <img src={`${WEB}/img/app-today.png`} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 78, borderRadius: 12, border: "3px solid #1E293B" }} />
    </div>
  );
}
