// Quản trị PC › WEB & BÀI VIẾT › Bài viết (bản vẽ 138a): danh sách kiểu WordPress + mở trình soạn (138b).
//  - Đếm theo trạng thái (Tất cả / Đã đăng / Hẹn giờ / Bản nháp / Thùng rác), tìm theo tiêu đề, lọc chuyên mục / tháng / điểm SEO.
//  - Chọn nhiều → hành động hàng loạt: Đăng, Chuyển về nháp, Bỏ vào thùng rác, Khôi phục, Xoá hẳn (chỉ trong Thùng rác).
//  - Rê chuột dòng: Sửa · Xem trên web ↗ · Nhân bản · Bỏ vào thùng rác. Bấm tiêu đề = Sửa.
import { useCallback, useEffect, useMemo, useState } from "react";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { Btn, Pill, Card, SearchBox, FilterSelect, ErrorBox, Loading, headRow, bodyRow, cell, fmtDT } from "../pcUI";
import { Check, Score, Lnk, Modal, Field, inpStyle, BLUE } from "./webUI";
import { supabase } from "../../lib/supabase";
import { STATUS, slugify } from "./webLib";
import { listPosts, listTerms, setStatus, deleteForever, duplicatePost } from "./webApi";
import { PcWebEditor } from "./PcWebEditor";
import { PcWebPageBuilder } from "./PcWebPageBuilder";

const COLS = "28px minmax(0,2.6fr) minmax(0,1fr) 0.7fr 0.9fr 1.1fr";
const WEB = "https://fipilotai.com";
// "18/10/2026 09:00" (giờ VN) · bản nháp: "Sửa 2 giờ trước" / "Sửa hôm qua"
export const fullDT = (iso) => (iso ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", "").replace(/^(\d{2}:\d{2}) (.+)$/, "$2 $1") : "—");
const ago = (iso) => { const m = Math.round((Date.now() - new Date(iso)) / 60000); if (m < 1) return "Sửa vừa xong"; if (m < 60) return `Sửa ${m} phút trước`; if (m < 24 * 60) return `Sửa ${Math.round(m / 60)} giờ trước`; if (m < 48 * 60) return "Sửa hôm qua"; return `Sửa ${fullDT(iso).slice(0, 10)}`; };
const monthOf = (iso) => (iso ? new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", month: "2-digit", year: "numeric" }) : "");

export function PcWebPosts({ top, showToast, user, appSettings, kind = "post", go }) {
  const [builder, setBuilder] = useState(false); // Trang › Sửa trang chủ tại chỗ (138d)
  const [rows, setRows] = useState(null);
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("all");
  const [qs, setQs] = useState("");
  const [cat, setCat] = useState("");
  const [month, setMonth] = useState("");
  const [score, setScore] = useState("");
  const [sel, setSel] = useState([]);
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  // Mở thẳng trình soạn khi trang khác (Công cụ › Link nội bộ) gửi id qua sessionStorage
  const [edit, setEdit] = useState(() => { try { const v = sessionStorage.getItem("fp_web_open"); if (v) { sessionStorage.removeItem("fp_web_open"); return v; } } catch (e) { /* */ } return null; }); // id | "new" | null
  const [quick, setQuick] = useState(null); // sửa nhanh: tiêu đề, đường dẫn, trạng thái, ngày đăng
  const noun = kind === "page" ? "trang" : "bài";

  const load = useCallback(async () => {
    setErr("");
    try { const [p, c] = await Promise.all([listPosts(kind), listTerms("category")]); setRows(p); setCats(c); setSel([]); }
    catch (e) { setErr("Chưa tải được danh sách. " + (e.message || "")); }
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: 0, published: 0, scheduled: 0, draft: 0, trash: 0 };
    for (const r of rows || []) { c[r.status] = (c[r.status] || 0) + 1; if (r.status !== "trash") c.all++; }
    return c;
  }, [rows]);
  const months = useMemo(() => [...new Set((rows || []).map((r) => monthOf(r.published_at || r.updated_at)).filter(Boolean))], [rows]);
  const list = useMemo(() => {
    const s = qs.trim().toLowerCase();
    return (rows || []).filter((r) => (tab === "all" ? r.status !== "trash" : r.status === tab)
      && (!s || r.title.toLowerCase().includes(s) || r.slug.includes(s))
      && (!cat || r.terms.includes(cat))
      && (!month || monthOf(r.published_at || r.updated_at) === month)
      && (!score || (score === "good" ? (r.seo?.score ?? 0) >= 80 : score === "ok" ? (r.seo?.score ?? 0) >= 50 && (r.seo?.score ?? 0) < 80 : (r.seo?.score ?? 0) < 50)));
  }, [rows, tab, qs, cat, month, score]);
  const catName = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.name])), [cats]);

  const act = async (what, ids) => {
    if (!ids.length) return;
    if (what === "delete" && !(await appConfirm(`Xoá hẳn ${ids.length} ${noun}? Không khôi phục được.`, { danger: true }))) return;
    setBusy(true);
    try {
      if (what === "delete") await deleteForever(ids);
      else await setStatus(ids, what === "restore" ? "draft" : what);
      showToast?.({ published: "Đã đăng.", draft: "Đã chuyển về bản nháp.", trash: "Đã bỏ vào thùng rác.", restore: "Đã khôi phục về bản nháp.", delete: "Đã xoá hẳn." }[what]);
      await load();
    } catch (e) { showToast?.("Chưa làm được: " + (e.message || "")); }
    setBusy(false);
  };
  const saveQuick = async () => {
    const q = quick; if (!q.title.trim() || !q.slug) return showToast?.("Cần tiêu đề và đường dẫn.");
    if ((rows || []).some((r) => r.slug === q.slug && r.id !== q.id)) return showToast?.(`Đường dẫn “${q.slug}” đã có bài khác dùng.`);
    let status = q.status, pub = q.published_at;
    if (status === "published" && !pub) pub = new Date().toISOString();
    if (status === "scheduled" && (!pub || new Date(pub) <= new Date())) return showToast?.("Hẹn giờ cần chọn giờ đăng trong tương lai.");
    setBusy(true);
    try { const { error } = await supabase.from("web_posts").update({ title: q.title.trim(), slug: q.slug, status, published_at: pub, updated_at: new Date().toISOString(), updated_by: user?.id || null }).eq("id", q.id); if (error) throw error; setQuick(null); showToast?.("Đã lưu."); await load(); }
    catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };
  const dup = async (id) => { setBusy(true); try { await duplicatePost(id, user?.id); showToast?.("Đã nhân bản thành bản nháp."); await load(); } catch (e) { showToast?.("Chưa nhân bản được: " + (e.message || "")); } setBusy(false); };

  if (builder) return <PcWebPageBuilder top={top} showToast={showToast} go={go} onBack={() => setBuilder(false)} />;
  if (edit) return <PcWebEditor top={top} id={edit === "new" ? null : edit} kind={kind} user={user} appSettings={appSettings} showToast={showToast} onBack={() => { setEdit(null); load(); }} />;

  const allOn = list.length > 0 && list.every((r) => sel.includes(r.id));
  const BULK = tab === "trash" ? [["restore", "Khôi phục"], ["delete", "Xoá hẳn"]] : [["published", "Đăng ngay"], ["draft", "Chuyển về nháp"], ["trash", "Bỏ vào thùng rác"]];
  return (
    <>
      {top(<span style={{ display: "flex", gap: 8 }}>{kind === "page" && <Btn kind="soft" testid="web-page-builder" onClick={() => setBuilder(true)}>✎ Sửa trang chủ tại chỗ</Btn>}<Btn kind="blue" testid="web-post-new" onClick={() => setEdit("new")}>+ {kind === "page" ? "Thêm trang mới" : "Viết bài mới"}</Btn></span>)}
      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, flexWrap: "wrap" }}>
          {[["all", "Tất cả"], ["published", "Đã đăng"], ["scheduled", "Hẹn giờ"], ["draft", "Bản nháp"], ["trash", "Thùng rác"]].map(([k, t]) => (
            <button key={k} type="button" data-testid={`web-tab-${k}`} onClick={() => { setTab(k); setSel([]); }} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: tab === k ? 900 : 600, color: tab === k ? PC.t1 : BLUE }}>{t} <span style={{ color: PC.t4, fontWeight: 600 }}>({counts[k] || 0})</span></button>
          ))}
          <span style={{ marginLeft: "auto" }}><SearchBox value={qs} onChange={setQs} placeholder={`Tìm ${noun} theo tiêu đề…`} width={260} testid="web-post-search" /></span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <FilterSelect label="Hành động" value={bulk} onChange={setBulk} testid="web-bulk" options={[{ v: "", label: "Hành động hàng loạt" }, ...BULK.map(([v, l]) => ({ v, label: l }))]} />
          <Btn kind="light" testid="web-bulk-apply" disabled={!bulk || !sel.length || busy} onClick={() => act(bulk, sel)}>Áp dụng</Btn>
          <span style={{ width: 8 }} />
          {kind === "post" && <FilterSelect label="Chuyên mục" value={cat} onChange={setCat} options={[{ v: "", label: "Tất cả chuyên mục" }, ...cats.map((c) => ({ v: c.id, label: c.name }))]} />}
          <FilterSelect label="Tháng" value={month} onChange={setMonth} options={[{ v: "", label: "Tất cả ngày" }, ...months.map((m) => ({ v: m, label: `Tháng ${m}` }))]} />
          <FilterSelect label="Điểm SEO" value={score} onChange={setScore} options={[{ v: "", label: "Mọi điểm SEO" }, { v: "good", label: "Tốt (≥ 80)" }, { v: "ok", label: "Tạm được (50–79)" }, { v: "bad", label: "Cần sửa (< 50)" }]} />
          <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>{list.length} {noun}{sel.length ? ` · đã chọn ${sel.length}` : ""}</span>
        </div>
        {err && <ErrorBox text={err} onRetry={load} />}
        {!rows && !err && <Loading />}
        {rows && (
          <Card testid="web-post-table">
            <div style={{ ...headRow(COLS), background: PC.headBg, borderRadius: "14px 14px 0 0" }}>
              <Check on={allOn} onChange={(v) => setSel(v ? list.map((r) => r.id) : [])} testid="web-sel-all" /><span>Tiêu đề</span><span>{kind === "page" ? "Mẫu" : "Chuyên mục"}</span><span>SEO</span><span>Trạng thái</span><span>Ngày</span>
            </div>
            {list.length === 0 && <div style={{ padding: 28, textAlign: "center", color: PC.t3, fontSize: 13 }}>{rows.length === 0 ? `Chưa có ${noun} nào. Bấm “${kind === "page" ? "Thêm trang mới" : "Viết bài mới"}” để bắt đầu.` : "Không có kết quả khớp bộ lọc."}</div>}
            {list.map((r, i) => {
              const [st, tone] = STATUS[r.status] || STATUS.draft;
              const on = sel.includes(r.id);
              const d = r.status === "published" || r.status === "scheduled" ? fullDT(r.published_at) : ago(r.updated_at);
              return (
                <div key={r.id} className="pc-row web-row" data-testid="web-post-row" style={{ ...bodyRow(COLS, on), minHeight: 64, borderBottom: i < list.length - 1 ? `1px solid ${PC.rowLine}` : "none", background: on ? PC.rowSel : "transparent" }}>
                  <Check on={on} onChange={(v) => setSel((s) => (v ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {r.cover_url ? <img src={r.cover_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 40, height: 40, borderRadius: 8, background: "#EEF4FF", flexShrink: 0 }} />}
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <button type="button" onClick={() => setEdit(r.id)} data-testid="web-post-title" style={{ ...cell, fontSize: 13.5, fontWeight: 700, color: BLUE, border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>{r.title}{r.pinned ? " 📌" : ""}</button>
                      <span className="web-url" style={{ ...cell, fontSize: 12, color: PC.t4 }}>fipilotai.com/{r.slug}</span>
                      <span className="web-acts" style={{ fontSize: 12, gap: 10 }}>
                        {r.status === "trash" ? <><Lnk onClick={() => act("restore", [r.id])}>Khôi phục</Lnk><Lnk red onClick={() => act("delete", [r.id])}>Xoá hẳn</Lnk></> : <>
                          <Lnk onClick={() => setEdit(r.id)} testid="web-act-edit">Sửa</Lnk>
                          <Lnk onClick={() => setQuick({ id: r.id, title: r.title, slug: r.slug, status: r.status, published_at: r.published_at })} testid="web-act-quick">Sửa nhanh</Lnk>
                          {r.status === "published" && <Lnk href={`${WEB}/${r.slug}`}>Xem trên web ↗</Lnk>}
                          <Lnk onClick={() => dup(r.id)} testid="web-act-dup">Nhân bản</Lnk>
                          <Lnk red onClick={() => act("trash", [r.id])} testid="web-act-trash">Bỏ vào thùng rác</Lnk>
                        </>}
                      </span>
                    </span>
                  </span>
                  <span style={cell}>{kind === "page" ? (r.template === "legal" ? "Điều khoản" : "Mặc định") : (catName[r.primary_term] || r.terms.map((t) => catName[t]).filter(Boolean)[0] || "—")}</span>
                  <span><Score n={r.seo?.score} /></span>
                  <span><Pill tone={tone}>{st}</Pill></span>
                  <span style={{ ...cell, fontSize: 12, color: PC.t2 }}>{d}</span>
                </div>
              );
            })}
          </Card>
        )}
      </div>
      {quick && <Modal title="Sửa nhanh" onClose={() => setQuick(null)} width={520} testid="web-quick" foot={<><Btn kind="light" onClick={() => setQuick(null)}>Huỷ</Btn><Btn kind="blue" disabled={busy} onClick={saveQuick} testid="web-quick-save">Lưu</Btn></>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Tiêu đề"><input value={quick.title} onChange={(e) => setQuick({ ...quick, title: e.target.value })} className="pc-input" style={inpStyle()} /></Field>
          <Field label="Đường dẫn" hint="Đổi đường dẫn bài đã đăng: web tự chuyển hướng 301 từ link cũ"><input value={quick.slug} onChange={(e) => setQuick({ ...quick, slug: slugify(e.target.value.replace(/\s/g, "-")) })} className="pc-input" style={{ ...inpStyle(), fontFamily: "ui-monospace, Menlo, monospace" }} /></Field>
          <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Trạng thái"><select value={quick.status} onChange={(e) => setQuick({ ...quick, status: e.target.value })} className="pc-input" style={inpStyle()}>{["published", "scheduled", "draft"].map((k) => <option key={k} value={k}>{STATUS[k][0]}</option>)}</select></Field>
            <Field label="Đăng lúc (giờ VN)"><input type="datetime-local" value={quick.published_at ? new Date(new Date(quick.published_at).getTime() + 7 * 3600e3).toISOString().slice(0, 16) : ""} onChange={(e) => setQuick({ ...quick, published_at: e.target.value ? new Date(`${e.target.value}:00+07:00`).toISOString() : null })} className="pc-input" style={inpStyle()} /></Field>
          </span>
        </div>
      </Modal>}
      <style>{`.web-row .web-acts{display:none}.web-row:hover .web-acts,.web-row:focus-within .web-acts{display:flex}.web-row:hover .web-url,.web-row:focus-within .web-url{display:none}`}</style>
    </>
  );
}
