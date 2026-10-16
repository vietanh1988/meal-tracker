// Quản trị PC › Nhật ký admin. Cùng nguồn với tab cũ src/adminTabs/AuditLogTab.jsx (bảng admin_audit_log + tên từ profiles):
//  - Bảng THỜI GIAN · ADMIN · THAO TÁC · ĐỐI TƯỢNG · CHI TIẾT (ghi chú), mới nhất trên cùng.
//  - Lọc theo thao tác + tìm theo tên admin / tên user bị tác động / ghi chú, nút "Xoá lọc".
//  - Khác bản cũ: bản cũ chỉ lấy 100 dòng mới nhất rồi lọc trên máy; bản này lọc ngay trên DB và phân trang 50 dòng/trang
//    (đếm tổng bằng count) → xem được cả nhật ký cũ hơn 100 dòng. Bấm 1 dòng mở ghi chú đầy đủ + mã admin / user.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { PC } from "../theme";
import { Btn, Pill, Card, SearchBox, FilterSelect, ErrorBox, Loading, headRow, bodyRow, cell, secLbl, vnInt, fmtDT } from "./pcUI";

const COLS = "120px 1fr 1.3fr 1fr 2.2fr";
const PER_PAGE = 50;
// Nhãn + màu từng thao tác (khoá = giá trị thật cột action; các nơi ghi: PcUsers / UsersTab / OrdersTab)
const ACTION = {
  confirm_order: ["Duyệt đơn hàng", "green"],
  reject_order: ["Từ chối đơn hàng", "red"],
  lock_account: ["Khoá tài khoản", "red"],
  unlock_account: ["Mở khoá tài khoản", "green"],
  grant_admin: ["Cấp quyền Admin", "violet"],
  revoke_admin: ["Bỏ quyền Admin", "amber"],
  change_admin_role: ["Đổi quyền", "violet"],
  update_tier: ["Đổi gói cước", "blue"],
  extend_subscription: ["Gia hạn gói", "blue"],
  reset_password_email: ["Gửi email đặt lại mật khẩu", "gray"],
  update_notes: ["Cập nhật ghi chú", "gray"],
  delete_requested: ["Yêu cầu xoá tài khoản", "red"],
};
const actLabel = (a) => ACTION[a]?.[0] || a || "—";
// Bỏ ký tự làm hỏng chuỗi bộ lọc .or() của PostgREST
const clean = (s) => s.replace(/[,()*%"\\]/g, " ").trim();

export function PcAudit({ top }) {
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState(""); // search sau khi gõ xong 300 ms
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [names, setNames] = useState({});
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [seen, setSeen] = useState([]); // thao tác lạ (không có trong ACTION) gặp trong dữ liệu

  useEffect(() => { const t = setTimeout(() => setQ(clean(search)), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(0); }, [action, q]);

  const reqId = useRef(0); // chỉ nhận kết quả của lần tải mới nhất (đổi lọc nhanh không bị kết quả cũ ghi đè)
  const load = useCallback(async () => {
    const my = ++reqId.current;
    setErr(null); setRows(null); setOpenId(null);
    try {
      let query = supabase.from("admin_audit_log").select("id,admin_id,target_user_id,action,note,created_at", { count: "exact" }).order("created_at", { ascending: false });
      if (action !== "all") query = query.eq("action", action);
      if (q) {
        const { data: hit } = await supabase.from("profiles").select("id").ilike("username", `%${q}%`).limit(200);
        const ids = (hit || []).map((p) => p.id);
        const ors = [`note.ilike.*${q}*`];
        if (ids.length) { ors.push(`admin_id.in.(${ids.join(",")})`, `target_user_id.in.(${ids.join(",")})`); }
        query = query.or(ors.join(","));
      }
      const { data, error, count } = await query.range(page * PER_PAGE, page * PER_PAGE + PER_PAGE - 1);
      if (my !== reqId.current) return;
      if (error) { setErr(error.message || "Lỗi tải"); setRows([]); return; }
      setRows(data || []);
      setTotal(count || 0);
      const odd = (data || []).map((l) => l.action).filter((a) => a && !ACTION[a]);
      if (odd.length) setSeen((prev) => [...new Set([...prev, ...odd])].sort());
      const ids = [...new Set((data || []).flatMap((l) => [l.admin_id, l.target_user_id]).filter(Boolean))];
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id,username").in("id", ids);
        setNames((prev) => { const m = { ...prev }; (profiles || []).forEach((p) => { m[p.id] = p.username; }); return m; });
      }
    } catch (e) { if (my === reqId.current) { setErr(e.message || "Lỗi tải"); setRows([]); } }
  }, [action, q, page]);
  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const nameOf = (id) => (id ? names[id] || id.slice(0, 8) : "—");
  const filtering = action !== "all" || !!search;
  const opts = [{ v: "all", label: "Tất cả", full: "Tất cả thao tác" }, ...Object.entries(ACTION).map(([v, [l]]) => ({ v, label: l })), ...seen.map((v) => ({ v, label: v }))];

  return (
    <>
      {top(<Btn kind="soft" onClick={load} disabled={rows == null} testid="pc-audit_log-reload">Tải lại</Btn>)}
      <div data-testid="pc-audit_log" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên admin, user hoặc ghi chú…" width={320} testid="pc-audit_log-search" />
          <FilterSelect fontSize={13} label="Thao tác" value={action} onChange={setAction} options={opts} testid="pc-audit_log-f-action" />
          {filtering && <Btn kind="light" onClick={() => { setSearch(""); setAction("all"); }} testid="pc-audit_log-clear">Xoá lọc</Btn>}
          <span data-testid="pc-audit_log-count" style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {vnInt(total)} dòng · trang {page + 1}/{pages}
            <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={page === 0 || rows == null} onClick={() => setPage((p) => p - 1)} testid="pc-audit_log-prev" title="Trang trước">‹</Btn>
            <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={page >= pages - 1 || rows == null} onClick={() => setPage((p) => p + 1)} testid="pc-audit_log-next" title="Trang sau">›</Btn>
          </span>
        </div>
        {err && <ErrorBox text={`Chưa tải được nhật ký: ${err}`} onRetry={load} />}
        <Card>
          <div style={headRow(COLS)}><span>THỜI GIAN</span><span>ADMIN</span><span>THAO TÁC</span><span>ĐỐI TƯỢNG</span><span>CHI TIẾT</span></div>
          {rows == null && <Loading />}
          {rows && rows.length === 0 && !err && <div data-testid="pc-audit_log-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>{filtering ? "Không có thao tác nào khớp bộ lọc." : "Chưa có thao tác nào."}</div>}
          {(rows || []).map((l, i, arr) => {
            const open = openId === l.id;
            const last = i === arr.length - 1;
            const [, tone] = ACTION[l.action] || [null, "gray"];
            return (
              <div key={l.id}>
                <button data-testid="pc-audit_log-row" aria-expanded={open} onClick={() => setOpenId(open ? null : l.id)} className="pc-row pc-click"
                  style={{ ...bodyRow(COLS, open), cursor: "pointer", borderBottom: last && !open ? "none" : bodyRow(COLS).borderBottom, borderRadius: last && !open ? "0 0 14px 14px" : 0 }}>
                  <span style={{ ...cell, color: PC.t3 }}>{fmtDT(l.created_at)}</span>
                  <span style={{ ...cell, fontWeight: 700 }} title={nameOf(l.admin_id)}>{nameOf(l.admin_id)}</span>
                  <span style={cell}><Pill tone={tone}>{actLabel(l.action)}</Pill></span>
                  <span style={cell} title={nameOf(l.target_user_id)}>{nameOf(l.target_user_id)}</span>
                  <span style={{ ...cell, color: l.note ? PC.t2 : PC.t4 }} title={l.note || ""}>{l.note || "—"}</span>
                </button>
                {open && (
                  <div data-testid="pc-audit_log-detail" style={{ padding: "12px 16px 14px 16px", background: PC.editBg, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 12.5, borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                    <span style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={secLbl}>GHI CHÚ</span>
                      <span style={{ color: PC.t1, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.5 }}>{l.note || "Không có ghi chú."}</span>
                    </span>
                    <span style={{ minWidth: 0, color: PC.t3, overflowWrap: "anywhere" }}>Admin: <b style={{ color: PC.t1 }}>{nameOf(l.admin_id)}</b> · {l.admin_id || "—"}</span>
                    <span style={{ minWidth: 0, color: PC.t3, overflowWrap: "anywhere" }}>Đối tượng: <b style={{ color: PC.t1 }}>{nameOf(l.target_user_id)}</b> · {l.target_user_id || "—"}</span>
                    <span style={{ minWidth: 0, color: PC.t3 }}>Mã thao tác: {l.action}</span>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
