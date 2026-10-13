// Màn Tôi › Gói cước (bản vẽ GoiCuoc):
//  - Thẻ hạng (ẩn với user thường khi đang tắt bán hàng — như MySubscription cũ)
//  - Lượt AI đã dùng / giới hạn theo hạng (src/lib/aiQuota.js)
//  - Đang miễn phí (tắt bán hàng) hoặc nút mua/gia hạn (mở màn thanh toán cũ)
//  - Lịch sử đơn hàng
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, diffDays, fmtVN, toVNDate } from "../lib/dateVN";
import { aiQuota } from "../lib/aiQuota";
import { fmtInt } from "../lib/mobileView";
import { Icon } from "./ui";

const TIER = { free: "Miễn phí", trial: "Dùng thử", premium: "Premium" };
const PKG = { "3m": "3 tháng", "6m": "6 tháng", "12m": "12 tháng" };
const STATUS = { pending: ["Chờ duyệt", "#92400E", "rgba(245,158,11,0.14)"], confirmed: ["Đã duyệt", "#065F46", "rgba(0,200,150,0.12)"], rejected: ["Từ chối", "#991B1B", "rgba(239,68,68,0.1)"] };
// created_at (timestamptz) → ngày VN
const todayFrom = (ts) => toVNDate(new Date(ts));
const sec = { display: "block", padding: "16px 16px 2px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" };
const box = { margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "0 14px" };

function tierLine(sub, isAdmin, today) {
  const tier = sub?.tier || "free";
  const end = tier === "trial" ? sub?.trial_end_date : tier === "premium" ? sub?.subscription_end_date : null;
  if (end) {
    const left = diffDays(today, String(end).slice(0, 10));
    return left >= 0 ? `${tier === "trial" ? "Dùng thử" : "Hết hạn"} ${fmtVN(String(end).slice(0, 10), true)} · còn ${left} ngày` : `Đã hết hạn ${fmtVN(String(end).slice(0, 10), true)}`;
  }
  if (tier === "premium") return isAdmin ? "Không thời hạn · tài khoản quản trị" : "Không thời hạn";
  return "Gói cơ bản";
}

export function PlanScreen({ userId, isAdmin, salesEnabled, openPayment }) {
  const [state, setState] = useState({ loading: true });
  const [showOrders, setShowOrders] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      const [p, s, o] = await Promise.all([
        supabase.from("profiles").select("tier,trial_end_date,subscription_end_date,ai_macro_count_this_month,ai_macro_count_reset_at,ai_chat_count_today,ai_chat_count_reset_at,ai_menu_count_today,ai_menu_count_reset_at,ai_photo_count_this_month,ai_photo_count_reset_at").eq("id", userId).maybeSingle(),
        supabase.from("subscription_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("orders").select("id,package,amount,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      if (alive) setState({ loading: false, sub: p.data || null, settings: s.data || null, orders: o.data || [], error: p.error ? "Không tải được thông tin gói. Mở lại màn này để thử lại." : "" });
    })().catch(() => alive && setState({ loading: false, error: "Không tải được thông tin gói." }));
    return () => { alive = false; };
  }, [userId]);

  if (state.loading) return <p style={{ margin: 24, textAlign: "center", color: "#64748B", fontSize: 14 }}>Đang tải…</p>;
  const { sub, settings, orders = [], error } = state;
  const today = todayVN();
  const tier = sub?.tier || "free";
  const showTier = isAdmin || salesEnabled;
  const quota = aiQuota(sub, settings);

  return (
    <div style={{ paddingBottom: 32 }}>
      {error && <p style={{ margin: "12px 16px 0 16px", color: "#DC2626", fontSize: 13 }}>{error}</p>}
      {showTier && (
        <div data-testid="plan-tier" style={{ margin: "12px 12px 0 12px", borderRadius: 20, padding: 18, background: "linear-gradient(135deg,#7C3AED,#5B21B6)", color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 6px 20px rgba(124,58,237,0.25)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, letterSpacing: "0.08em" }}>HẠNG CỦA BẠN</span>
          <span style={{ fontSize: 28, fontWeight: 900 }}>{TIER[tier] || tier}</span>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{tierLine(sub, isAdmin, today)}</span>
        </div>
      )}

      <span style={sec}>LƯỢT AI ĐÃ DÙNG</span>
      <div style={box}>
        {quota.map((q, i) => (
          <div key={q.key} data-testid={`quota-${q.key}`} data-used={q.used} style={{ padding: "12px 0", borderBottom: i < quota.length - 1 ? "1px solid #F1F5F9" : "none", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{q.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: q.out ? "#DC2626" : "#475569", whiteSpace: "nowrap" }}>{fmtInt(q.used)} / {fmtInt(q.limit)} {q.period === "day" ? "hôm nay" : "tháng này"}</span>
            </div>
            <div role="progressbar" aria-label={q.label} aria-valuenow={q.used} aria-valuemax={q.limit} style={{ height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${q.pct}%`, background: q.out ? "#EF4444" : q.pct >= 80 ? "#F59E0B" : "#007AFF", borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 16px 0 16px", fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>Lượt theo ngày làm mới lúc 7:00 sáng, lượt theo tháng làm mới đầu tháng.</p>

      {!salesEnabled ? (
        <div data-testid="plan-free" style={{ margin: "12px 12px 0 12px", background: "rgba(0,200,150,0.08)", border: "1.5px solid rgba(0,200,150,0.3)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#065F46" }}>Fipilot AI đang miễn phí 100%</span>
          <span style={{ fontSize: 13, color: "#065F46", lineHeight: 1.5 }}>Chưa thu phí. Khi mở bán, phần chọn gói 3 / 6 / 12 tháng và chuyển khoản sẽ hiện ở đây.</span>
        </div>
      ) : !isAdmin && (
        <button data-testid="plan-buy" onClick={openPayment} style={{ display: "block", margin: "12px 12px 0 12px", width: "calc(100% - 24px)", height: 50, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>
          {tier === "premium" ? "Gia hạn gói" : "Nâng cấp Premium"}
        </button>
      )}

      {showTier && (
        <>
          <button data-testid="plan-orders" onClick={() => setShowOrders((v) => !v)} aria-expanded={showOrders} style={{ margin: "12px 12px 0 12px", width: "calc(100% - 24px)", height: 48, background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "0 14px", display: "flex", alignItems: "center", gap: 10, color: "#0F172A", fontFamily: "inherit", boxSizing: "border-box" }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: "left" }}>Lịch sử đơn hàng</span>
            <span style={{ fontSize: 12, color: "#64748B" }}>{orders.length ? `${orders.length} đơn` : "Chưa có đơn"}</span>
            <span style={{ display: "flex", transform: showOrders ? "rotate(90deg)" : "none", transition: "transform .15s" }}>{Icon.chev(16)}</span>
          </button>
          {showOrders && orders.length > 0 && (
            <div style={{ ...box, marginTop: 8 }}>
              {orders.map((o, i) => {
                const [label, fg, bg] = STATUS[o.status] || [o.status, "#475569", "#F1F5F9"];
                return (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderBottom: i < orders.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <span style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>Gói {PKG[o.package] || o.package}{o.amount ? ` · ${fmtInt(o.amount)}đ` : ""}</span>
                      <span style={{ fontSize: 12, color: "#64748B" }}>{o.created_at ? fmtVN(todayFrom(o.created_at), true) : ""}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: fg, background: bg, padding: "3px 10px", borderRadius: 999 }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
