import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { C, card, inp } from "../theme";
import { fmtDate } from "../fmtDate";

const ACTION_LABEL = {
  confirm_order: "Duyệt đơn hàng",
  reject_order: "Từ chối đơn hàng",
  lock_account: "Khóa tài khoản",
  unlock_account: "Mở khóa tài khoản",
  grant_admin: "Cấp quyền Admin",
  revoke_admin: "Bỏ quyền Admin",
  update_tier: "Đổi gói cước",
  extend_subscription: "Gia hạn gói",
  reset_password_email: "Gửi email đặt lại mật khẩu",
  update_notes: "Cập nhật ghi chú",
  delete_requested: "Yêu cầu xóa tài khoản",
};

function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}

export function AuditLogTab({ isAdmin }) {
  const [logs, setLogs] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("admin_audit_log").select("id,admin_id,target_user_id,action,note,created_at").order("created_at", { ascending: false }).limit(100);
      if (error) { console.error("admin_audit_log load error:", error); setLogs([]); setLoading(false); return; }
      setLogs(data || []);
      const ids = [...new Set((data || []).flatMap(l => [l.admin_id, l.target_user_id]).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,username").in("id", ids);
        const map = {};
        (profiles || []).forEach(p => { map[p.id] = p.username; });
        setUsernames(map);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;

  const actionOptions = [...new Set(logs.map(l => l.action))].sort();

  const filtered = logs.filter(l => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const adminName = (usernames[l.admin_id] || "").toLowerCase();
      const targetName = (usernames[l.target_user_id] || "").toLowerCase();
      const note = (l.note || "").toLowerCase();
      if (!adminName.includes(s) && !targetName.includes(s) && !note.includes(s)) return false;
    }
    return true;
  });

  return (
    <div style={{ ...card, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.t1 }}>Nhật ký hoạt động</div>
        <button onClick={load} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer" }}>🔄 Tải lại</button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 16 }}>Toàn bộ hành động Admin đã thực hiện, 100 dòng gần nhất</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input placeholder="Tìm theo tên admin, user, hoặc ghi chú" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 260, height: 34, fontSize: 12 }} />
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ ...inp, width: 220, height: 34, fontSize: 12 }}>
          <option value="">Hành động: Tất cả</option>
          {actionOptions.map(a => <option key={a} value={a}>{ACTION_LABEL[a] || a}</option>)}
        </select>
        {(search || actionFilter) && (
          <button onClick={() => { setSearch(""); setActionFilter(""); }} style={{ fontSize: 11, fontWeight: 700, padding: "0 10px", height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer" }}>Xóa lọc</button>
        )}
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Admin</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Hành động</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>User bị tác động</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Ghi chú</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: C.t2 }}>Đang tải...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: C.t2 }}>Không có hoạt động nào khớp bộ lọc</td></tr>}
            {!loading && filtered.map(l => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 12px", fontWeight: 700, color: C.t1 }}>{usernames[l.admin_id] || l.admin_id?.slice(0, 8) || "-"}</td>
                <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: C.blueBg, color: C.primary }}>{ACTION_LABEL[l.action] || l.action}</span></td>
                <td style={{ padding: "10px 12px", color: C.t2 }}>{usernames[l.target_user_id] || l.target_user_id?.slice(0, 8) || "-"}</td>
                <td style={{ padding: "10px 12px", color: C.t2, maxWidth: 320 }}>{l.note || "-"}</td>
                <td style={{ padding: "10px 12px", color: C.t3, whiteSpace: "nowrap" }}>{fmtDT(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
