// Quản trị › Duyệt đơn hàng (bản vẽ 98, nền tối). Logic giữ như src/adminTabs/OrdersTab.jsx (PC vẫn dùng tab cũ):
// 2 ô số (đơn chờ, doanh thu tháng) · 4 trạng thái · phân trang 20 đơn · duyệt = cộng tháng Premium + nhật ký + push (nếu bật).
// Chỉ Super Admin duyệt / từ chối; admin thường thấy dòng "Chế độ chỉ xem" và không có nút.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { DK } from "../../theme";
import { SubPage, Seg, Icon } from "../ui";
import { Card, Tile, Tiles, Pill, Btn, BtnRow, ReadOnly, Loading, ErrorBox, Empty, useConfirm, fmtVND } from "./adminUI";
import { parseFeatureFlags } from "../../adminTabs/FeatureFlagsTab";
import { toVNDate, todayVN, nowVNParts, fmtVN } from "../../lib/dateVN";
import { transferContent } from "../../lib/aiQuota";

const PKG_LABEL = { "1m": "1 tháng", "3m": "3 tháng", "6m": "6 tháng", "12m": "12 tháng" };
const PKG_MONTHS = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };
const ST = { pending: ["Chờ duyệt", "amber"], confirmed: ["Đã duyệt", "green"], rejected: ["Đã từ chối", "red"] };
const AV_COLORS = ["#7C3AED", "#DB2777", "#0891B2", "#EA580C", "#16A34A", "#2563EB", "#CA8A04"];
const PAGE = 20;

// "YYYY-MM-DD" + n tháng (tràn ngày giống Date.setMonth của tab cũ)
function addMonthsStr(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
}
// ISO → "16/10 · 09:12" theo giờ VN
function fmtDTVN(iso) {
  if (!iso) return "–";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "–";
  const { hour, minute } = nowVNParts(dt);
  return `${fmtVN(toVNDate(dt))} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
const initials = (name) => {
  const parts = String(name || "?").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
  const s = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] || "?").slice(0, 2);
  return s.toUpperCase();
};
const avColor = (key) => { let h = 0; for (const ch of String(key || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return AV_COLORS[h % AV_COLORS.length]; };

const PageBtn = ({ children, disabled, onClick, testid }) => (
  <button data-testid={testid} disabled={disabled} onClick={onClick}
    style={{ height: 26, padding: "0 10px", borderRadius: 13, border: "none", background: disabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)", color: disabled ? "rgba(255,255,255,0.35)" : DK.t1, fontFamily: "inherit", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center" }}>
    {children}
  </button>
);

export function OrdersScreen({ onBack, isAdmin, isSuperAdmin, user, appSettings, showToast }) {
  const currentUserId = user?.id;
  const pushEnabled = parseFeatureFlags(appSettings).push;
  const [confirm, dialog] = useConfirm();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(0);

  const toast = (text) => (showToast ? showToast({ text }) : confirm({ title: text, alert: true, ok: "Đóng" }));
  const alertErr = (text) => confirm({ title: "Có lỗi", text, alert: true, ok: "Đóng" });

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    const { data, error } = await supabase.rpc("admin_order_stats");
    if (error) { console.error("admin_order_stats error:", error); return; }
    setStats((data && data[0]) || { pending_count: 0, revenue_this_month: 0 });
  }, [isAdmin]);

  const loadOrders = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true); setErr(false);
    try {
      const { data, error } = await supabase.rpc("admin_list_orders", { p_status: status === "all" ? null : status, p_limit: PAGE, p_offset: page * PAGE });
      if (error) { console.error("admin_list_orders error:", error); setOrders([]); setTotal(0); setErr(true); }
      else { setOrders(data || []); setTotal((data && data[0] && Number(data[0].total_count)) || 0); }
    } catch (e) { console.error(e); setErr(true); }
    setLoading(false);
  }, [status, page, isAdmin]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const changeStatus = (s) => { setPage(0); setStatus(s); };

  const logAction = async (targetUserId, action, note) => {
    try { await supabase.from("admin_audit_log").insert({ admin_id: currentUserId, target_user_id: targetUserId, action, note: note || null }); } catch (e) { console.error(e); }
  };

  const confirmOrder = async (o) => {
    if (!isSuperAdmin) return;
    const pkg = PKG_LABEL[o.package] || o.package;
    const ok = await confirm({ title: "Xác nhận đã nhận tiền?", text: `Gói ${pkg} (${fmtVND(o.amount)}) từ ${o.username}.\nPremium sẽ được cộng thêm ${PKG_MONTHS[o.package] || 0} tháng.`, ok: "Đã nhận tiền · Duyệt" });
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

      await logAction(o.user_id, "confirm_order", `Duyệt đơn ${pkg} (${fmtVND(o.amount)}) -> Premium hết hạn ${fmtVN(newEndDate, true)}`);
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
      loadOrders(); loadStats();
    } catch (e) { console.error(e); alertErr("Có lỗi xảy ra, thử lại sau."); }
    setBusyId(null);
  };

  const rejectOrder = async (o) => {
    if (!isSuperAdmin) return;
    const ok = await confirm({ title: "Từ chối đơn hàng?", text: `Đơn gói ${PKG_LABEL[o.package] || o.package} (${fmtVND(o.amount)}) của ${o.username}.`, ok: "Từ chối", danger: true });
    if (!ok) return;
    setBusyId(o.id);
    const { error } = await supabase.from("orders").update({ status: "rejected", confirmed_by: currentUserId, confirmed_at: new Date().toISOString() }).eq("id", o.id);
    if (error) { setBusyId(null); alertErr("Thất bại: " + error.message); return; }
    await logAction(o.user_id, "reject_order", `Từ chối đơn ${PKG_LABEL[o.package] || o.package}`);
    toast(`Đã từ chối đơn của ${o.username}`);
    loadOrders(); loadStats();
    setBusyId(null);
  };

  const pendingN = stats?.pending_count;
  const segOpts = [
    { value: "pending", label: pendingN != null ? `Chờ duyệt · ${pendingN}` : "Chờ duyệt", testid: "adm-orders-st-pending" },
    { value: "confirmed", label: "Đã duyệt", testid: "adm-orders-st-confirmed" },
    { value: "rejected", label: "Từ chối", testid: "adm-orders-st-rejected" },
    { value: "all", label: "Tất cả", testid: "adm-orders-st-all" },
  ];

  return (
    <SubPage dark title="Duyệt đơn hàng" subtitle="Chuyển khoản → kiểm tra tiền về → duyệt" onBack={onBack}>
      <div data-testid="adm-orders">
        {!isAdmin ? <Empty>Chỉ Admin mới xem được trang này.</Empty> : (
          <>
            {!isSuperAdmin && <ReadOnly />}
            <Tiles>
              <Tile n={stats ? (stats.pending_count ?? 0) : null} label="Đơn chờ duyệt" color={DK.amber} testid="adm-orders-pending-n" />
              <Tile n={stats ? fmtVND(stats.revenue_this_month) : null} label="Doanh thu tháng này" color={DK.green} testid="adm-orders-revenue" />
            </Tiles>
            <div style={{ margin: "14px 12px 0 12px" }}>
              <Seg dark size="sm" mode="tab" ariaLabel="Trạng thái đơn" opts={segOpts} value={status} onChange={changeStatus} />
            </div>

            {loading ? <Loading rows={2} /> : err ? <ErrorBox onRetry={() => { loadOrders(); loadStats(); }} /> : orders.length === 0 ? <Empty testid="adm-orders-empty">Không có đơn nào</Empty> : (
              <div style={{ margin: "12px 12px 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map((o) => {
                  const [stLabel, stTone] = ST[o.status] || [o.status, "grey"];
                  const busy = busyId === o.id;
                  const by = o.confirmed_by_username;
                  return (
                    <Card key={o.id} testid="adm-order" pad="14px" style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 19, background: avColor(o.user_id || o.username), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#FFFFFF", flexShrink: 0 }}>{initials(o.username)}</span>
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.username || "–"}</span>
                          <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.email || ""}</span>
                        </span>
                        <Pill tone={stTone} h={26}>{stLabel}</Pill>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 13, color: DK.t2, whiteSpace: "nowrap" }}>Premium · <b style={{ color: DK.t1 }}>{PKG_LABEL[o.package] || o.package}</b></span>
                        <span style={{ fontSize: 20, fontWeight: 900, whiteSpace: "nowrap" }}>{fmtVND(o.amount)}</span>
                      </div>
                      <span style={{ fontSize: 12, color: DK.t3, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                        Tạo {fmtDTVN(o.created_at)} · nội dung CK: {transferContent(o.username, o.user_id, o.package)}
                        {o.status === "confirmed" && by ? ` · Duyệt bởi ${by}` : ""}
                        {o.status === "rejected" && by ? ` · Từ chối bởi ${by}` : ""}
                      </span>
                      {o.status === "pending" && isSuperAdmin && (
                        <BtnRow style={{ marginTop: 10 }}>
                          <Btn kind="red" flex={1} disabled={busy} onClick={() => rejectOrder(o)} testid="adm-order-reject">Từ chối</Btn>
                          <Btn kind="green" flex={2} disabled={busy} onClick={() => confirmOrder(o)} testid="adm-order-approve">
                            {busy ? "Đang xử lý..." : <>{Icon.check(16, 2.6)}Đã nhận tiền · Duyệt</>}
                          </Btn>
                        </BtnRow>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && !err && total > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "12px 16px 0 16px", fontSize: 12, color: DK.t3 }}>
                <span>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} trong {total} đơn</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <PageBtn disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} testid="adm-orders-prev">‹ Trước</PageBtn>
                  <PageBtn disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)} testid="adm-orders-next">Sau ›</PageBtn>
                </span>
              </div>
            )}
          </>
        )}
        <div style={{ height: 24 }} />
      </div>
      {dialog}
    </SubPage>
  );
}
