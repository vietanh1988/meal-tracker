// Quản trị PC › Duyệt món AI. Cùng dữ liệu & ghi DB với src/mobile/admin/PendingFoodsScreen.jsx (+ tab cũ FoodCachePendingTab):
//  - food_cache_pending (món lạ AI/USDA tự tính) → Duyệt = upsert food_cache (onConflict food_name,gram) rồi xoá khỏi hàng chờ;
//    Từ chối = hỏi lại bằng hộp thoại app rồi xoá khỏi hàng chờ.
//  - 3 ô số (chờ duyệt / đã duyệt / kho gốc) + 3 mục: Chờ duyệt · Đã duyệt (food_cache, tải khi mở) · Kho gốc (LOCAL_FOODS trong code).
//  - Bảng chờ duyệt: tên, nguồn, phần (g), đạm / tinh bột / béo / xơ / kcal, người gửi (profiles.username), ngày gửi.
//  - Thêm so với mobile: "Sửa số" mở dòng sửa tại chỗ (như PcFood) → "Lưu" (update hàng chờ) hoặc "Lưu & duyệt" (duyệt bằng số đã sửa).
//  - Mobile không có duyệt hàng loạt → PC cũng không. Quyền như mobile: mọi Admin duyệt được. Gọi refreshCounts() sau mỗi thao tác.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { appAlert, appConfirm } from "../lib/dialog";
import { getAllFoods, getFoodCount } from "../lib/localFoodDB";
import { PC } from "../theme";
import { Btn, Pill, Card, SearchBox, ErrorBox, Loading, headRow, bodyRow, cell, vnInt, vnDec, fmtDT } from "./pcUI";

const LIST_MAX = 200;
const P_COLS = "1.5fr 0.7fr 0.55fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.9fr 0.95fr 220px";
const A_COLS = "2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr 0.8fr 0.9fr";
const L_COLS = "2.4fr 0.7fr 0.7fr 0.7fr 0.8fr";
const PROVIDER = { gpt: "GPT", openai: "GPT", gemini: "Gemini", claude: "Claude", anthropic: "Claude", usda: "USDA", grok: "Grok", deepseek: "DeepSeek" };
const provLabel = (p) => { const k = String(p || "").toLowerCase(); return PROVIDER[k] || (p ? String(p) : "?"); };
const provTone = (p) => { const k = String(p || "").toLowerCase(); return k === "usda" ? "green" : k ? "blue" : "gray"; };
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
const parseNum = (s) => Number(String(s ?? "").replace(",", ".")) || 0;
const EDIT_KEYS = [["protein", "Đạm"], ["carb", "Tinh bột"], ["fat", "Béo"], ["fiber", "Xơ"], ["cal", "kcal"]];

function Tile({ label, value, color, testid }) {
  return (
    <Card testid={testid} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{label}</span>
        <span data-testid={testid ? `${testid}-value` : undefined} style={{ fontSize: 26, fontWeight: 900, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      </div>
    </Card>
  );
}

// Nút phân đoạn (3 mục)
function Seg({ opts, value, onChange }) {
  return (
    <span role="tablist" aria-label="Danh sách món" style={{ display: "inline-flex", gap: 4, padding: 3, borderRadius: 12, background: "#FFFFFF", border: `1px solid ${PC.field}` }}>
      {opts.map((o) => {
        const on = o.v === value;
        return (
          <button key={o.v} type="button" role="tab" aria-selected={on} data-testid={o.testid} onClick={() => onChange(o.v)} className="pc-btn"
            style={{ height: 30, padding: "0 14px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap", background: on ? PC.soft : "transparent", color: on ? PC.softFg : PC.t2 }}>
            {o.label}
          </button>
        );
      })}
    </span>
  );
}

const lastRow = (cols, last, extra) => ({ ...bodyRow(cols, extra), borderBottom: last ? "none" : bodyRow(cols).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0 });
const empty = (text, testid) => <div data-testid={testid} style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>{text}</div>;

export function PcPending({ top, isAdmin = true, showToast, refreshCounts }) {
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [pLoading, setPLoading] = useState(true);
  const [pErr, setPErr] = useState(null);
  const [names, setNames] = useState({}); // created_by → username
  const [approvedCount, setApprovedCount] = useState(null);
  const [approved, setApproved] = useState(null); // null = chưa tải
  const [aLoading, setALoading] = useState(false);
  const [aErr, setAErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [vals, setVals] = useState({});
  const [qA, setQA] = useState("");
  const [qL, setQL] = useState("");
  const localCount = getFoodCount();

  const toast = (text) => (showToast ? showToast({ text }, 3000) : appAlert(text));
  const counts = () => { try { refreshCounts?.(); } catch (e) { /* bỏ qua */ } };

  const loadPending = useCallback(async () => {
    if (!isAdmin) { setPLoading(false); return; }
    setPLoading(true); setPErr(null);
    const { data, error } = await supabase.from("food_cache_pending").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Load all pending food error:", error); setPErr(error.message || "Lỗi tải"); setPLoading(false); return; }
    const rows = data || [];
    setPending(rows);
    setPLoading(false);
    // Tên người gửi (profiles; admin xem được mọi hồ sơ) — lỗi thì để "—"
    const ids = [...new Set(rows.map((r) => r.created_by).filter(Boolean))];
    if (ids.length) {
      const { data: ps, error: pe } = await supabase.from("profiles").select("id,username").in("id", ids);
      if (pe) console.error("Load pending senders error:", pe);
      else setNames(Object.fromEntries((ps || []).map((p) => [p.id, p.username])));
    }
  }, [isAdmin]);

  const loadApprovedCount = useCallback(async () => {
    if (!isAdmin) return;
    const { count, error } = await supabase.from("food_cache").select("*", { count: "exact", head: true });
    if (error) { console.error("Count food_cache error:", error); return; }
    setApprovedCount(count || 0);
  }, [isAdmin]);

  const loadApproved = useCallback(async () => {
    if (!isAdmin) return;
    setALoading(true); setAErr(null);
    const { data, error } = await supabase.from("food_cache").select("*").order("food_name");
    if (error) { console.error("Load food_cache list error:", error); setAErr(error.message || "Lỗi tải"); }
    else setApproved(data || []);
    setALoading(false);
  }, [isAdmin]);

  useEffect(() => { loadPending(); loadApprovedCount(); }, [loadPending, loadApprovedCount]);
  useEffect(() => { if (tab === "approved" && approved === null && !aLoading && !aErr) loadApproved(); }, [tab, approved, aLoading, aErr, loadApproved]);

  const reloadAll = () => { loadPending(); loadApprovedCount(); if (tab === "approved") loadApproved(); else setApproved(null); counts(); };

  const approve = async (row) => {
    setBusyId(row.id);
    try {
      const { error: upErr } = await supabase.from("food_cache").upsert({
        food_name: row.food_name, gram: row.gram || 100,
        protein: row.protein || 0, carb: row.carb || 0, fat: row.fat || 0,
        fiber: row.fiber || 0, cal: row.cal || 0, ai_provider: row.ai_provider || "unknown",
      }, { onConflict: "food_name,gram" });
      if (upErr) { console.error("Approve → food_cache error:", upErr); toast("Duyệt không được, kiểm tra mạng rồi thử lại."); setBusyId(null); return; }
      const { error: delErr } = await supabase.from("food_cache_pending").delete().eq("id", row.id);
      if (delErr) console.error("Approve delete pending error:", delErr);
      setPending((prev) => prev.filter((p) => p.id !== row.id));
      setApprovedCount((n) => (n == null ? n : n + 1));
      setApproved(null); // tải lại danh sách đã duyệt khi mở mục
      if (editId === row.id) setEditId(null);
      toast(delErr ? `Đã duyệt “${row.food_name}” (chưa xoá được khỏi hàng chờ)` : `Đã duyệt “${row.food_name}”`);
      counts();
    } catch (e) { console.error("Approve pending food error:", e); toast("Duyệt không được, kiểm tra mạng rồi thử lại."); }
    setBusyId(null);
  };

  const reject = async (row) => {
    if (!await appConfirm("Món bị xoá khỏi hàng chờ, không đưa vào kho chung.", { title: `Từ chối “${row.food_name}”?`, confirmText: "Từ chối", danger: true })) return;
    setBusyId(row.id);
    try {
      const { error } = await supabase.from("food_cache_pending").delete().eq("id", row.id);
      if (error) { console.error("Reject pending food error:", error); toast("Từ chối không được, kiểm tra mạng rồi thử lại."); setBusyId(null); return; }
      setPending((prev) => prev.filter((p) => p.id !== row.id));
      if (editId === row.id) setEditId(null);
      toast(`Đã từ chối “${row.food_name}”`);
      counts();
    } catch (e) { console.error("Reject pending food error:", e); toast("Từ chối không được, kiểm tra mạng rồi thử lại."); }
    setBusyId(null);
  };

  // Sửa số tại chỗ
  const openEdit = (row) => {
    if (editId === row.id) { setEditId(null); return; }
    setEditId(row.id);
    setVals(Object.fromEntries(EDIT_KEYS.map(([k]) => [k, vnDec(row[k])])));
  };
  const editedRow = (row) => ({ ...row, ...Object.fromEntries(EDIT_KEYS.map(([k]) => [k, parseNum(vals[k])])) });
  const saveEdit = async (row, thenApprove) => {
    const next = editedRow(row);
    setBusyId(row.id);
    const patch = Object.fromEntries(EDIT_KEYS.map(([k]) => [k, next[k]]));
    const { error } = await supabase.from("food_cache_pending").update(patch).eq("id", row.id);
    if (error) { console.error("Update pending food error:", error); setBusyId(null); toast("Lưu số không được, kiểm tra mạng rồi thử lại."); return; }
    setPending((prev) => prev.map((p) => (p.id === row.id ? next : p)));
    setBusyId(null);
    if (thenApprove) { await approve(next); return; }
    setEditId(null);
    toast(`Đã lưu số “${row.food_name}”`);
  };
  const onKey = (row) => (e) => { if (e.key === "Enter") saveEdit(row, false); if (e.key === "Escape") setEditId(null); };

  const approvedRows = useMemo(() => (approved || []).map((f, i) => ({ ...f, key: f.id || `${f.food_name}-${f.gram}-${i}`, _k: norm(f.food_name) })), [approved]);
  const localRows = useMemo(() => (tab === "local" ? getAllFoods().sort((a, b) => a.name.localeCompare(b.name, "vi")).map((f) => ({ ...f, key: f.name, _k: norm(f.name) })) : []), [tab]);
  const aHits = useMemo(() => { const n = norm(qA); return n ? approvedRows.filter((r) => r._k.includes(n)) : approvedRows; }, [approvedRows, qA]);
  const lHits = useMemo(() => { const n = norm(qL); return n ? localRows.filter((r) => r._k.includes(n)) : localRows; }, [localRows, qL]);

  const pendingN = pLoading && pending.length === 0 ? null : pending.length;
  const dash = (n) => (n == null ? "–" : vnInt(n));

  if (!isAdmin) return <>{top(null)}<div data-testid="pc-food_cache_pending" style={{ padding: "20px 24px" }}>{empty("Chỉ Admin mới xem được trang này.")}</div></>;

  const numIn = (row, k, label) => (
    <input key={k} data-testid={`pc-food_cache_pending-in-${k}`} className="pc-num" inputMode="decimal" aria-label={label} value={vals[k] ?? ""} onKeyDown={onKey(row)}
      onChange={(e) => setVals((s) => ({ ...s, [k]: e.target.value }))}
      style={{ width: "100%", minWidth: 0, height: 30, borderRadius: 8, background: "#FFFFFF", border: `1.5px solid ${PC.fieldOn}`, padding: "0 6px", fontWeight: 800, fontSize: 12.5, fontFamily: "inherit", color: PC.t1 }} />
  );
  const smallBtn = { height: 30, padding: "0 10px", fontSize: 12.5 };

  const listNote = (n) => n > LIST_MAX && <span style={{ fontSize: 12, color: PC.t3 }}>Đang hiện {vnInt(LIST_MAX)} / {vnInt(n)} món — gõ tên để tìm nhanh hơn</span>;

  return (
    <>
      {top(<Btn kind="soft" onClick={reloadAll} testid="pc-food_cache_pending-reload">Tải lại</Btn>)}
      <div data-testid="pc-food_cache_pending" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Tile testid="pc-food_cache_pending-n" label="Chờ duyệt" value={dash(pendingN)} color="#B45309" />
          <Tile testid="pc-food_cache_pending-approved-n" label="Đã duyệt (dùng chung)" value={dash(approvedCount)} color="#16A34A" />
          <Tile testid="pc-food_cache_pending-local-n" label="Kho gốc (trong app)" value={vnInt(localCount)} color={PC.t1} />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Seg value={tab} onChange={(v) => { setTab(v); setEditId(null); }} opts={[
            { v: "pending", label: pendingN != null ? `Chờ duyệt · ${vnInt(pendingN)}` : "Chờ duyệt", testid: "pc-food_cache_pending-tab-pending" },
            { v: "approved", label: "Đã duyệt", testid: "pc-food_cache_pending-tab-approved" },
            { v: "local", label: "Kho gốc", testid: "pc-food_cache_pending-tab-local" },
          ]} />
          {tab === "approved" && <SearchBox value={qA} onChange={setQA} placeholder="Tìm món…" width={280} testid="pc-food_cache_pending-search-approved" />}
          {tab === "local" && <SearchBox value={qL} onChange={setQL} placeholder="Tìm món…" width={280} testid="pc-food_cache_pending-search-local" />}
          <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, whiteSpace: "nowrap" }}>
            {tab === "pending" ? "Số theo phần (g) AI đã tính" : tab === "approved" ? `${vnInt(aHits.length)} món` : `${vnInt(lHits.length)} món · số trên 100 g`}
          </span>
        </div>

        {tab === "pending" && (pErr ? <ErrorBox text={`Chưa tải được hàng chờ: ${pErr}`} onRetry={loadPending} /> : (
          <Card testid="pc-food_cache_pending-table">
            <div style={headRow(P_COLS)}><span>TÊN MÓN</span><span>NGUỒN</span><span>PHẦN</span><span>ĐẠM</span><span>TB</span><span>BÉO</span><span>XƠ</span><span>KCAL</span><span>NGƯỜI GỬI</span><span>NGÀY GỬI</span><span /></div>
            {pLoading && pending.length === 0 && <Loading />}
            {!pLoading && pending.length === 0 && empty("Không có món nào đang chờ duyệt.", "pc-food_cache_pending-empty")}
            {pending.map((row, i) => {
              const busy = busyId === row.id;
              const editing = editId === row.id;
              const last = i === pending.length - 1;
              const sender = row.created_by ? (names[row.created_by] || "—") : "—";
              return (
                <div key={row.id}>
                  <div data-testid="pc-food_cache_pending-row" data-id={row.id} className="pc-row" style={lastRow(P_COLS, last && !editing, editing)}>
                    <span style={{ ...cell, fontWeight: 700 }} title={row.food_name}>{row.food_name}</span>
                    <span style={cell}><Pill tone={provTone(row.ai_provider)}>{provLabel(row.ai_provider)}</Pill></span>
                    <span style={cell}>{vnDec(row.gram || 100)} g</span>
                    <span style={cell}>{vnDec(row.protein)}</span>
                    <span style={cell}>{vnDec(row.carb)}</span>
                    <span style={cell}>{vnDec(row.fat)}</span>
                    <span style={cell}>{vnDec(row.fiber)}</span>
                    <span style={{ ...cell, fontWeight: 800 }}>{vnInt(row.cal)}</span>
                    <span style={cell} title={sender}>{sender}</span>
                    <span style={cell}>{fmtDT(row.created_at)}</span>
                    <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn kind="green" style={smallBtn} disabled={busy} onClick={() => approve(row)} testid="pc-food_cache_pending-approve" title="Duyệt vào kho chung">{busy && !editing ? "Đang lưu…" : "Duyệt"}</Btn>
                      <Btn kind={editing ? "blue" : "soft"} style={smallBtn} disabled={busy} onClick={() => openEdit(row)} testid="pc-food_cache_pending-edit" title="Sửa số trước khi duyệt">Sửa số</Btn>
                      <Btn kind="danger" style={smallBtn} disabled={busy} onClick={() => reject(row)} testid="pc-food_cache_pending-reject">Từ chối</Btn>
                    </span>
                  </div>
                  {editing && (
                    <div data-testid="pc-food_cache_pending-editrow" style={{ display: "grid", gridTemplateColumns: P_COLS, gap: "0 12px", padding: "8px 16px", background: PC.editBg, alignItems: "center", fontSize: 13, borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                      <b style={{ ...cell, fontSize: 13 }} title={row.food_name}>{row.food_name}</b>
                      <span style={{ ...cell, gridColumn: "span 2", color: PC.t3 }}>cho {vnDec(row.gram || 100)} g</span>
                      {EDIT_KEYS.map(([k, l]) => numIn(row, k, l))}
                      <span style={{ ...cell, gridColumn: "span 2", color: PC.t3, fontSize: 12 }}>Enter lưu · Esc huỷ</span>
                      <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn kind="soft" style={smallBtn} disabled={busy} onClick={() => saveEdit(row, false)} testid="pc-food_cache_pending-save">Lưu</Btn>
                        <Btn kind="green" style={smallBtn} disabled={busy} onClick={() => saveEdit(row, true)} testid="pc-food_cache_pending-save-approve">{busy ? "Đang lưu…" : "Lưu & duyệt"}</Btn>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        ))}

        {tab === "approved" && (aErr ? <ErrorBox text={`Chưa tải được món đã duyệt: ${aErr}`} onRetry={loadApproved} /> : (
          <>
            <Card testid="pc-food_cache_pending-approved">
              <div style={headRow(A_COLS)}><span>TÊN MÓN</span><span>PHẦN</span><span>ĐẠM</span><span>TB</span><span>BÉO</span><span>KCAL</span><span>NGUỒN</span><span>NGÀY</span></div>
              {(aLoading || approved === null) && <Loading />}
              {!aLoading && approved !== null && aHits.length === 0 && empty(qA ? "Không tìm thấy món nào." : "Chưa có món nào được duyệt.")}
              {!aLoading && aHits.slice(0, LIST_MAX).map((f, i, arr) => (
                <div key={f.key} data-testid="pc-food_cache_pending-approved-row" className="pc-row" style={lastRow(A_COLS, i === arr.length - 1)}>
                  <span style={{ ...cell, fontWeight: 700 }} title={f.food_name}>{f.food_name}</span>
                  <span style={cell}>{vnDec(f.gram)} g</span>
                  <span style={cell}>{vnDec(f.protein)}</span>
                  <span style={cell}>{vnDec(f.carb)}</span>
                  <span style={cell}>{vnDec(f.fat)}</span>
                  <span style={{ ...cell, fontWeight: 800 }}>{vnInt(f.cal)}</span>
                  <span style={cell}><Pill tone={provTone(f.ai_provider)}>{provLabel(f.ai_provider)}</Pill></span>
                  <span style={cell}>{fmtDT(f.created_at, { time: false })}</span>
                </div>
              ))}
            </Card>
            {listNote(aHits.length)}
          </>
        ))}

        {tab === "local" && (
          <>
            <Card testid="pc-food_cache_pending-local">
              <div style={headRow(L_COLS)}><span>TÊN MÓN</span><span>ĐẠM</span><span>TB</span><span>BÉO</span><span>KCAL /100 G</span></div>
              {lHits.length === 0 && empty(qL ? "Không tìm thấy món nào." : "Kho gốc trống.")}
              {lHits.slice(0, LIST_MAX).map((f, i, arr) => (
                <div key={f.key} data-testid="pc-food_cache_pending-local-row" className="pc-row" style={lastRow(L_COLS, i === arr.length - 1)}>
                  <span style={{ ...cell, fontWeight: 700 }} title={f.name}>{f.name}</span>
                  <span style={cell}>{vnDec(f.p)}</span>
                  <span style={cell}>{vnDec(f.c)}</span>
                  <span style={cell}>{vnDec(f.f)}</span>
                  <span style={{ ...cell, fontWeight: 800 }}>{vnInt(f.cal)}</span>
                </div>
              ))}
            </Card>
            {listNote(lHits.length)}
          </>
        )}
      </div>
    </>
  );
}
