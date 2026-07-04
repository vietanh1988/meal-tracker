import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { C, card, inp } from "../theme";
import { fmtDate } from "../fmtDate";
import { useIsMobile } from "../hooks/useIsMobile";

const PKG_LABEL = { "3m": "3 tháng", "6m": "6 tháng", "12m": "12 tháng" };
const PKG_MONTHS = { "3m": 3, "6m": 6, "12m": 12 };
const STATUS_LABEL = { pending: "Chờ duyệt", confirmed: "Đã duyệt", rejected: "Đã từ chối" };
const STATUS_ICON = { pending: "⏳", confirmed: "✅", rejected: "❌" };
const STATUS_BG = { pending: "#FEF3C7", confirmed: "#DCFCE7", rejected: "#FEE2E2" };
const STATUS_FG = { pending: "#92400E", confirmed: "#14532D", rejected: "#7F1D1D" };

function fmtVND(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("vi-VN") + "đ";
}
function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}

export function OrdersTab({ isAdmin, currentUserId }) {
  const mob = useIsMobile();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_order_stats");
    if (error) { console.error("admin_order_stats error:", error); return; }
    setStats((data && data[0]) || { pending_count: 0, revenue_this_month: 0 });
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_orders", {
        p_status: status || null, p_limit: pageSize, p_offset: page * pageSize,
      });
      if (error) { console.error("admin_list_orders error:", error); setOrders([]); setTotal(0); }
      else { setOrders(data || []); setTotal((data && data[0] && Number(data[0].total_count)) || 0); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [status, page]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { setPage(0); }, [status]);

  const logAction = async (targetUserId, action, note) => {
    try { await supabase.from("admin_audit_log").insert({ admin_id: currentUserId, target_user_id: targetUserId, action, note: note || null }); } catch (e) { console.error(e); }
  };

  const confirmOrder = async (o) => {
    if (!window.confirm(`Xác nhận đã nhận tiền gói ${PKG_LABEL[o.package] || o.package} (${fmtVND(o.amount)}) từ ${o.username}?`)) return;
    setBusyId(o.id);
    try {
      const { data: profile, error: pErr } = await supabase.from("profiles").select("tier,subscription_end_date").eq("id", o.user_id).single();
      if (pErr) { alert("Lỗi đọc profile: " + pErr.message); setBusyId(null); return; }
      const months = PKG_MONTHS[o.package] || 0;
      const base = (profile.subscription_end_date && new Date(profile.subscription_end_date) > new Date()) ? new Date(profile.subscription_end_date) : new Date();
      base.setMonth(base.getMonth() + months);
      const newEndDate = base.toISOString().slice(0, 10);

      const { error: uErr } = await supabase.from("profiles").update({ tier: "premium", subscription_end_date: newEndDate }).eq("id", o.user_id);
      if (uErr) { alert("Cập nhật profile thất bại: " + uErr.message); setBusyId(null); return; }

      const { error: oErr } = await supabase.from("orders").update({ status: "confirmed", confirmed_by: currentUserId, confirmed_at: new Date().toISOString() }).eq("id", o.id);
      if (oErr) { alert("Cập nhật đơn thất bại: " + oErr.message); setBusyId(null); return; }

      await logAction(o.user_id, "confirm_order", `Duyệt đơn ${PKG_LABEL[o.package] || o.package} (${fmtVND(o.amount)}) -> Premium hết hạn ${fmtDT(newEndDate)}`);
      try {
        await supabase.rpc("admin_send_push_notification", {
          p_user_id: o.user_id,
          p_title: "🎉 Đơn hàng đã được duyệt!",
          p_body: `Gói ${PKG_LABEL[o.package] || o.package} đã kích hoạt. Premium hết hạn ${fmtDT(newEndDate)}.`,
          p_url: "/",
        });
      } catch (e) { console.error("Push notification error:", e); }
      loadOrders(); loadStats();
    } catch (e) { console.error(e); alert("Có lỗi xảy ra"); }
    setBusyId(null);
  };

  const rejectOrder = async (o) => {
    if (!window.confirm(`Từ chối đơn hàng của ${o.username}?`)) return;
    setBusyId(o.id);
    const { error } = await supabase.from("orders").update({ status: "rejected", confirmed_by: currentUserId, confirmed_at: new Date().toISOString() }).eq("id", o.id);
    if (error) { alert("Thất bại: " + error.message); setBusyId(null); return; }
    await logAction(o.user_id, "reject_order", `Từ chối đơn ${PKG_LABEL[o.package] || o.package}`);
    loadOrders(); loadStats();
    setBusyId(null);
  };

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;

  const statusTabs = [["pending", "Chờ duyệt"], ["confirmed", "Đã duyệt"], ["rejected", "Đã từ chối"], ["", "Tất cả"]];

  return (
    <div style={{ ...card, maxWidth: mob ? "100%" : 1100, margin: "0 auto" }}>
      <div style={{ fontSize: mob ? 18 : 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>📋 Duyệt đơn hàng</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>User bấm "Tôi đã chuyển khoản" sẽ tạo đơn ở đây, kiểm tra tiền về rồi xác nhận</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>Đơn chờ duyệt</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#92400E" }}>{stats?.pending_count ?? "-"}</div>
          </div>
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>💰</span>
          <div>
            <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>Doanh thu tháng này</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{fmtVND(stats?.revenue_this_month)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {statusTabs.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} style={{ fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: `1px solid ${status === k ? C.primary : C.border}`, background: status === k ? C.blueBg : "#fff", color: status === k ? C.primary : C.t2, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{l}</button>
        ))}
      </div>

      {loading && <div style={{ padding: 20, textAlign: "center", color: C.t2 }}>Đang tải...</div>}
      {!loading && orders.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.t2 }}>Không có đơn nào</div>}

      {!loading && orders.length > 0 && mob && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map(o => (
            <div key={o.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.t1, fontSize: 14 }}>{o.username}</div>
                  <div style={{ color: C.t3, fontSize: 12 }}>{o.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: STATUS_BG[o.status], color: STATUS_FG[o.status], flexShrink: 0, whiteSpace: "nowrap" }}>{STATUS_ICON[o.status]} {STATUS_LABEL[o.status] || o.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t2, marginBottom: 4 }}>
                <span>Gói {PKG_LABEL[o.package] || o.package}</span>
                <span style={{ fontWeight: 700, color: C.t1 }}>{fmtVND(o.amount)}</span>
              </div>
              <div style={{ fontSize: 11, color: C.t3, marginBottom: o.status === "pending" ? 10 : 0 }}>🕐 {fmtDT(o.created_at)}{o.confirmed_by_username ? ` · bởi ${o.confirmed_by_username}` : ""}</div>
              {o.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => rejectOrder(o)} disabled={busyId === o.id} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer" }}>Từ chối</button>
                  <button onClick={() => confirmOrder(o)} disabled={busyId === o.id} style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#15803D,#166534)", color: "#fff", cursor: "pointer" }}>{busyId === o.id ? "Đang xử lý..." : "✓ Xác nhận"}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length > 0 && !mob && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
                <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>User</th>
                <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Gói</th>
                <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Số tiền</th>
                <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Trạng thái</th>
                <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, color: C.t1 }}>{o.username}</div>
                    <div style={{ color: C.t3, fontSize: 12 }}>{o.email}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: C.t1, fontWeight: 600 }}>{PKG_LABEL[o.package] || o.package}</td>
                  <td style={{ padding: "10px 12px", color: C.t1, fontWeight: 700 }}>{fmtVND(o.amount)}</td>
                  <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: STATUS_BG[o.status], color: STATUS_FG[o.status] }}>{STATUS_ICON[o.status]} {STATUS_LABEL[o.status] || o.status}</span></td>
                  <td style={{ padding: "10px 12px", color: C.t2 }}>{fmtDT(o.created_at)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    {o.status === "pending" ? (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => rejectOrder(o)} disabled={busyId === o.id} style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer" }}>Từ chối</button>
                        <button onClick={() => confirmOrder(o)} disabled={busyId === o.id} style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#15803D,#166534)", color: "#fff", cursor: "pointer" }}>{busyId === o.id ? "Đang xử lý..." : "Xác nhận"}</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: C.t3 }}>{o.confirmed_by_username ? `bởi ${o.confirmed_by_username}` : ""}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13, color: C.t2 }}>
        <span>{total > 0 ? `Hiển thị ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} trong ${total}` : ""}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.5 : 1 }}>Trước</button>
          <button disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: (page + 1) * pageSize >= total ? "default" : "pointer", opacity: (page + 1) * pageSize >= total ? 0.5 : 1 }}>Sau</button>
        </div>
      </div>
    </div>
  );
}
