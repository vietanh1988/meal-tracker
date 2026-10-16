// Quản trị PC › Đơn hàng. Logic giữ như src/mobile/admin/OrdersScreen.jsx (+ tab cũ src/adminTabs/OrdersTab.jsx):
//  - 2 ô số (admin_order_stats): đơn chờ duyệt, doanh thu tháng này.
//  - Nút phân đoạn 4 trạng thái (Chờ duyệt / Đã duyệt / Đã từ chối / Tất cả) → admin_list_orders, 20 đơn/trang.
//  - Bảng: NGƯỜI DÙNG · GÓI (+ nội dung chuyển khoản) · SỐ TIỀN · NGÀY TẠO · TRẠNG THÁI · NGƯỜI DUYỆT · thao tác.
//  - Super Admin: Duyệt (cộng tháng Premium vào profiles, đổi đơn confirmed, nhật ký, push nếu bật) / Từ chối — hỏi xác nhận bằng hộp thoại app.
//    Xong → tải lại bảng + ô số + refreshCounts() (số chờ trên thanh bên).
//  - Admin thường: chỉ xem (dải vàng), không có nút thao tác.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { appAlert, appConfirm } from "../lib/dialog";
import { todayVN, fmtVN } from "../lib/dateVN";
import { transferContent } from "../lib/aiQuota";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { PC } from "../theme";
import { Btn, Pill, Card, ErrorBox, headRow, bodyRow, cell, vnd, vnInt, fmtDT } from "./pcUI";

const COLS = "1.8fr 1.3fr 0.9fr 0.9fr 0.9fr 1fr 184px";
const PAGE = 20;
const PKG_LABEL = { "1m": "1 tháng", "3m": "3 tháng", "6m": "6 tháng", "12m": "12 tháng" };
const PKG_MONTHS = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };
const ST = { pending: ["Chờ duyệt", "amber"], confirmed: ["Đã duyệt", "green"], rejected: ["Đã từ chối", "red"] };
const AVA = ["#7C3AED", "#DB2777", "#0891B2", "#EA580C", "#16A34A", "#2563EB", "#CA8A04"];
const avaColor = (key) => { let h = 0; for (const ch of String(key || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AVA[h % AVA.length]; };
const initials = (name) => {
  const parts = String(name || "?").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
  const s = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || "?").slice(0, 2);
  return s.toUpperCase();
};
// "YYYY-MM-DD" + n tháng (tràn ngày giống Date.setMonth của tab cũ / màn điện thoại)
function addMonthsStr(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
}

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

function Seg({ opts, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} style={{ display: "inline-flex", gap: 2, height: 36, padding: 3, borderRadius: 10, background: "#FFFFFF", border: `1px solid ${PC.field}` }}>
      {opts.map((o) => {
        const on = o.v === value;
        return (
          <button key={o.v} type="button" role="tab" aria-selected={on} data-testid={o.testid} onClick={() => onChange(o.v)} className="pc-btn"
            style={{ height: 28, padding: "0 12px", borderRadius: 8, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 700, whiteSpace: "nowrap", cursor: "pointer", background: on ? PC.soft : "transparent", color: on ? PC.softFg : PC.t2 }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PcOrders({ top, isAdmin = true, isSuperAdmin, user, appSettings, showToast, refreshCounts }) {
  const currentUserId = user?.id;
  const pushEnabled = parseFeatureFlags(appSettings).push;
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState(null);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(0);

  const toast = (text) => (showToast ? showToast({ text }) : appAlert(text));
  const alertErr = (text) => appAlert(text, { title: "Có lỗi" });

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    setStatsErr(null);
    const { data, error } = await supabase.rpc("admin_order_stats");
    if (error) { console.error("admin_order_stats error:", error); setStatsErr(error.message || "Lỗi tải"); return; }
    setStats((data && data[0]) || { pending_count: 0, revenue_this_month: 0 });
  }, [isAdmin]);

  const loadOrders = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase.rpc("admin_list_orders", { p_status: status === "all" ? null : status, p_limit: PAGE, p_offset: page * PAGE });
      if (error) { console.error("admin_list_orders error:", error); setOrders([]); setTotal(0); setErr(error.message || "Lỗi tải"); }
      else { setOrders(data || []); setTotal((data && data[0] && Number(data[0].total_count)) || 0); }
    } catch (e) { console.error(e); setErr(e.message || "Lỗi tải"); }
    setLoading(false);
  }, [status, page, isAdmin]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const reloadAll = () => { loadOrders(); loadStats(); if (refreshCounts) refreshCounts(); };
  const changeStatus = (s) => { setPage(0); setStatus(s); };

  const logAction = async (targetUserId, action, note) => {
    try { await supabase.from("admin_audit_log").insert({ admin_id: currentUserId, target_user_id: targetUserId, action, note: note || null }); } catch (e) { console.error(e); }
  };

  const confirmOrder = async (o) => {
    if (!isSuperAdmin) return;
    const pkg = PKG_LABEL[o.package] || o.package;
    const ok = await appConfirm(`Gói ${pkg} (${vnd(o.amount)}) từ ${o.username}.\nPremium sẽ được cộng thêm ${PKG_MONTHS[o.package] || 0} tháng.`, { title: "Xác nhận đã nhận tiền?", confirmText: "Đã nhận tiền · Duyệt" });
    if (!ok) return;
    setBusyId(o.id);
    try {
      const { data: profile, error: pErr } = await supabase.from("profiles").select("tier,subscription_end_date").eq("id", o.user_id).single();
      if (pErr) { setBusyId(null); alertErr("Lỗi đọc profile: " + pErr.message); return; }
      const months = PKG_MONTHS[o.package] || 0;
      const today = todayVN();
      const end = profile?.subscription_end_date ? String(profile.subscription_end_date).slice(0, 10) : null;
      const base = end && end > today ? end : today;
      const newEndDate = addMonthsStr(base, months);

      const { error: uErr } = await supabase.from("profiles").update({ tier: "premium", subscription_end_date: newEndDate }).eq("id", o.user_id);
      if (uErr) { setBusyId(null); alertErr("Cập nhật profile thất bại: " + uErr.message); return; }

      const { error: oErr } = await supabase.from("orders").update({ status: "confirmed", confirmed_by: currentUserId, confirmed_at: new Date().toISOString() }).eq("id", o.id);
      if (oErr) { setBusyId(null); alertErr("Cập nhật đơn thất bại: " + oErr.message); return; }

      await logAction(o.user_id, "confirm_order", `Duyệt đơn ${pkg} (${vnd(o.amount)}) -> Premium hết hạn ${fmtVN(newEndDate, true)}`);
      if (pushEnabled) {
        try {
          await supabase.rpc("admin_send_push_notification", {
            p_user_id: o.user_id,
            p_title: "🎉 Đơn hàng đã được duyệt!",
            p_body: `Gói ${pkg} đã kích hoạt. Premium hết hạn ${fmtVN(newEndDate, true)}.`,
            p_url: "/",
          });
        } catch (e) { console.error("Push notification error:", e); }
      }
      toast(`Đã duyệt đơn của ${o.username} · Premium đến ${fmtVN(newEndDate, true)}`);
      reloadAll();
    } catch (e) { console.error(e); alertErr("Có lỗi xảy ra, thử lại sau."); }
    setBusyId(null);
  };

  const rejectOrder = async (o) => {
    if (!isSuperAdmin) return;
    const ok = await appConfirm(`Đơn gói ${PKG_LABEL[o.package] || o.package} (${vnd(o.amount)}) của ${o.username}.`, { title: "Từ chối đơn hàng?", confirmText: "Từ chối", danger: true });
    if (!ok) return;
    setBusyId(o.id);
    const { error } = await supabase.from("orders").update({ status: "rejected", confirmed_by: currentUserId, confirmed_at: new Date().toISOString() }).eq("id", o.id);
    if (error) { setBusyId(null); alertErr("Thất bại: " + error.message); return; }
    await logAction(o.user_id, "reject_order", `Từ chối đơn ${PKG_LABEL[o.package] || o.package}`);
    toast(`Đã từ chối đơn của ${o.username}`);
    reloadAll();
    setBusyId(null);
  };

  const pendingN = stats?.pending_count;
  const segOpts = [
    { v: "pending", label: pendingN != null ? `Chờ duyệt · ${vnInt(pendingN)}` : "Chờ duyệt", testid: "pc-orders-st-pending" },
    { v: "confirmed", label: "Đã duyệt", testid: "pc-orders-st-confirmed" },
    { v: "rejected", label: "Đã từ chối", testid: "pc-orders-st-rejected" },
    { v: "all", label: "Tất cả", testid: "pc-orders-st-all" },
  ];
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const from = total > 0 ? page * PAGE + 1 : 0;
  const to = Math.min((page + 1) * PAGE, total);

  return (
    <>
      {top(<Btn kind="soft" onClick={reloadAll} disabled={loading} testid="pc-orders-reload">Làm mới</Btn>)}
      <div data-testid="pc-orders" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {!isAdmin ? <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Chỉ Admin mới xem được trang này.</div> : <>
          <div style={{ display: "flex", gap: 14 }}>
            <Tile testid="pc-orders-pending-n" label="Đơn chờ duyệt" value={stats ? vnInt(stats.pending_count ?? 0) : "–"} color="#B45309" />
            <Tile testid="pc-orders-revenue" label="Doanh thu tháng này" value={stats ? vnd(stats.revenue_this_month) : "–"} color="#16A34A" />
          </div>
          {statsErr && <ErrorBox text={`Chưa tải được số tổng: ${statsErr}`} onRetry={loadStats} />}
          {!isSuperAdmin && <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường chỉ xem — Super Admin mới duyệt / từ chối được đơn.</div>}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Seg label="Trạng thái đơn" opts={segOpts} value={status} onChange={changeStatus} />
            <span data-testid="pc-orders-count" style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {total > 0 ? `${vnInt(from)}–${vnInt(to)} trong ${vnInt(total)} đơn · trang ${page + 1}/${pages}` : "0 đơn"}
              <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={loading || page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} testid="pc-orders-prev" title="Trang trước">‹</Btn>
              <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={loading || (page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)} testid="pc-orders-next" title="Trang sau">›</Btn>
            </span>
          </div>

          {err ? <ErrorBox text={`Chưa tải được danh sách đơn: ${err}`} onRetry={reloadAll} /> : (
            <Card testid="pc-orders-table">
              <div style={headRow(COLS)}><span>NGƯỜI DÙNG</span><span>GÓI</span><span>SỐ TIỀN</span><span>NGÀY TẠO</span><span>TRẠNG THÁI</span><span>NGƯỜI DUYỆT</span><span /></div>
              {loading && orders.length === 0 && <div data-testid="pc-loading" role="status" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Đang tải…</div>}
              {!loading && orders.length === 0 && <div data-testid="pc-orders-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Không có đơn nào.</div>}
              {orders.map((o, i) => {
                const [stLabel, stTone] = ST[o.status] || [o.status, "gray"];
                const busy = busyId === o.id;
                const last = i === orders.length - 1;
                const pkg = PKG_LABEL[o.package] || o.package;
                const ck = transferContent(o.username, o.user_id, o.package);
                const by = o.status !== "pending" ? o.confirmed_by_username : null;
                return (
                  <div key={o.id} data-testid="pc-order-row" data-status={o.status} className="pc-row"
                    style={{ ...bodyRow(COLS), minHeight: 56, opacity: loading ? 0.6 : 1, borderBottom: last ? "none" : bodyRow(COLS).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                    <span style={{ ...cell, display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 16, background: avaColor(o.user_id || o.username), color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{initials(o.username)}</span>
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <b style={{ ...cell, fontSize: 13 }} title={o.username || ""}>{o.username || "–"}</b>
                        <span style={{ ...cell, fontSize: 12, color: PC.t3 }} title={o.email || ""}>{o.email || ""}</span>
                      </span>
                    </span>
                    <span style={{ ...cell, display: "flex", flexDirection: "column" }}>
                      <span style={cell}>Premium · <b>{pkg}</b></span>
                      <span data-testid="pc-order-ck" style={{ ...cell, fontSize: 12, color: PC.t3 }} title={`Nội dung chuyển khoản: ${ck}`}>CK: {ck}</span>
                    </span>
                    <b style={{ ...cell, fontSize: 13 }}>{vnd(o.amount)}</b>
                    <span style={cell}>{fmtDT(o.created_at)}</span>
                    <span style={cell}><Pill tone={stTone}>{stLabel}</Pill></span>
                    <span style={{ ...cell, color: by ? PC.t1 : PC.t4 }} title={by && o.confirmed_at ? `${by} · ${fmtDT(o.confirmed_at)}` : undefined}>{by || "—"}</span>
                    <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {o.status === "pending" && isSuperAdmin && <>
                        <Btn kind="danger" disabled={busy} onClick={() => rejectOrder(o)} testid="pc-order-reject">Từ chối</Btn>
                        <Btn kind="green" disabled={busy} onClick={() => confirmOrder(o)} testid="pc-order-approve" title="Đã nhận tiền · Duyệt">{busy ? "Đang xử lý…" : "Duyệt"}</Btn>
                      </>}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
        </>}
      </div>
    </>
  );
}
