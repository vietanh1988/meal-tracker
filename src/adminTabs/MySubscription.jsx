import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { C } from "../theme";

const PKG_LABEL = { "3m": "3 tháng", "6m": "6 tháng", "12m": "12 tháng" };

function fmtVND(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("vi-VN") + "đ";
}
function daysLeft(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}
function fmtDMY(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function MySubscription({ userId, mob }) {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [settings, setSettings] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [resultBanner, setResultBanner] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState("6m");
  const [submitting, setSubmitting] = useState(false);

  const seenKey = (id) => `sub_order_seen_${id}`;

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: p }, { data: s }, { data: latestOrder }] = await Promise.all([
        supabase.from("profiles").select("tier,trial_end_date,subscription_end_date,ai_macro_count_this_month,ai_chat_count_today").eq("id", userId).single(),
        supabase.from("subscription_settings").select("free_ai_macro_limit,free_ai_chat_limit,price_3m,price_6m,price_12m,bank_name,bank_account,bank_account_name").eq("id", 1).single(),
        supabase.from("orders").select("id,package,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setSub(p || null);
      setSettings(s || null);
      if (latestOrder?.status === "pending") {
        setPendingOrder(latestOrder);
      } else if (latestOrder && (latestOrder.status === "confirmed" || latestOrder.status === "rejected")) {
        let seen = false;
        try { seen = localStorage.getItem(seenKey(latestOrder.id)) === "1"; } catch (e) {}
        if (!seen) setResultBanner(latestOrder);
      }
    } catch (e) { console.error("MySubscription load error:", e); }
    setLoading(false);
  }, [userId]);

  const dismissBanner = () => {
    if (resultBanner) { try { localStorage.setItem(seenKey(resultBanner.id), "1"); } catch (e) {} }
    setResultBanner(null);
  };

  useEffect(() => { load(); }, [load]);

  const handleConfirmPaid = async () => {
    if (!userId || !settings) return;
    setSubmitting(true);
    const priceKey = { "3m": "price_3m", "6m": "price_6m", "12m": "price_12m" }[selectedPkg];
    const amount = settings[priceKey];
    try {
      const { data, error } = await supabase.from("orders").insert({
        user_id: userId, package: selectedPkg, amount: amount || null, status: "pending",
      }).select().single();
      if (error) { alert("Gửi yêu cầu thất bại: " + error.message); setSubmitting(false); return; }
      setPendingOrder(data);
      setShowPicker(false);
    } catch (e) { console.error(e); alert("Gửi yêu cầu thất bại"); }
    setSubmitting(false);
  };

  if (loading || !sub) return null;

  const tier = sub.tier || "free";
  const macroLimit = settings?.free_ai_macro_limit ?? 100;
  const chatLimit = settings?.free_ai_chat_limit ?? 20;
  const macroUsed = sub.ai_macro_count_this_month || 0;
  const chatUsed = sub.ai_chat_count_today || 0;
  const trialDays = daysLeft(sub.trial_end_date);
  const subDays = daysLeft(sub.subscription_end_date);

  const badgeStyle = {
    free: { background: C.surface, color: C.t2 },
    trial: { background: C.goldBg, color: "#92400E" },
    premium: { background: C.blueBg, color: C.primary },
  }[tier];
  const badgeLabel = { free: "🆓 Free", trial: "⏳ Trial", premium: "⭐ Premium" }[tier];

  return (
    <div style={{ background: C.surface, borderRadius: 14, padding: "16px 18px", marginBottom: 16, border: `1.5px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: mob ? 17 : 16, fontWeight: 800, color: C.t1 }}>⭐ Gói cước của bạn</div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, ...badgeStyle }}>{badgeLabel}</span>
      </div>

      {resultBanner && (
        <div style={{ background: resultBanner.status === "confirmed" ? C.greenBg : C.redBg, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: resultBanner.status === "confirmed" ? "#14532D" : "#7F1D1D" }}>
            {resultBanner.status === "confirmed" ? `🎉 Đơn nâng cấp ${PKG_LABEL[resultBanner.package] || resultBanner.package} đã được duyệt! Chào mừng đến với Premium.` : `Đơn nâng cấp ${PKG_LABEL[resultBanner.package] || resultBanner.package} đã bị từ chối. Liên hệ Admin để biết thêm chi tiết.`}
          </div>
          <button onClick={dismissBanner} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: resultBanner.status === "confirmed" ? "#14532D" : "#7F1D1D", flexShrink: 0 }}>✕</button>
        </div>
      )}

      {tier === "free" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t2, marginBottom: 4, fontWeight: 600 }}>
              <span>AI tính macro</span><span>{macroUsed}/{macroLimit} lượt tháng này</span>
            </div>
            <div style={{ height: 8, background: C.surface, borderRadius: 4 }}><div style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg,#36A3FF,#007AFF)", width: `${Math.min(100, (macroUsed / macroLimit) * 100)}%` }} /></div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t2, marginBottom: 4, fontWeight: 600 }}>
              <span>AI Chat</span><span>{chatUsed}/{chatLimit} tin hôm nay</span>
            </div>
            <div style={{ height: 8, background: C.surface, borderRadius: 4 }}><div style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg,#36A3FF,#007AFF)", width: `${Math.min(100, (chatUsed / chatLimit) * 100)}%` }} /></div>
          </div>
        </div>
      )}

      {tier === "trial" && (
        <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.t1 }}>{trialDays !== null ? Math.max(0, trialDays) : "-"} ngày</div>
          <div style={{ fontSize: 13, color: C.t2, marginTop: 2 }}>còn lại trong thời gian dùng thử</div>
          <div style={{ fontSize: 13, color: C.t2, marginTop: 10 }}>Bạn đang dùng đầy đủ quyền Premium miễn phí</div>
        </div>
      )}

      {tier === "premium" && subDays !== null && subDays <= 7 && (
        <div style={{ background: C.goldBg, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 13, fontWeight: 700, color: "#92400E" }}>
          {subDays <= 0 ? "Gói Premium đã hết hạn" : `Còn ${subDays} ngày nữa hết hạn (${fmtDMY(sub.subscription_end_date)})`}
        </div>
      )}
      {tier === "premium" && (subDays === null || subDays > 7) && (
        <div style={{ fontSize: 13, color: C.t2, marginBottom: 14 }}>Hết hạn: <b style={{ color: C.t1 }}>{fmtDMY(sub.subscription_end_date)}</b></div>
      )}

      {pendingOrder ? (
        <div style={{ background: C.greenBg, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#14532D" }}>✓ Đã gửi yêu cầu nâng cấp ({PKG_LABEL[pendingOrder.package] || pendingOrder.package})</div>
          <div style={{ fontSize: 12, color: "#14532D", marginTop: 2 }}>Chờ Admin duyệt trong ít phút</div>
        </div>
      ) : (
        <button onClick={() => setShowPicker(v => !v)} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 900, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", color: "#fff", cursor: "pointer" }}>
          {tier === "premium" ? "🔄 Gia hạn" : "⭐ Nâng cấp Premium"}
        </button>
      )}

      {showPicker && !pendingOrder && (
        <div style={{ marginTop: 14, background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 10 }}>Chọn gói Premium</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
            {["3m", "6m", "12m"].map(k => (
              <div key={k} onClick={() => setSelectedPkg(k)} style={{ border: selectedPkg === k ? `2px solid ${C.primary}` : `1px solid ${C.border}`, borderRadius: 10, padding: "10px 6px", textAlign: "center", cursor: "pointer", background: "#fff" }}>
                <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>{PKG_LABEL[k]}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.t1, marginTop: 2 }}>{fmtVND(settings?.[{ "3m": "price_3m", "6m": "price_6m", "12m": "price_12m" }[k]])}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Chuyển khoản tới</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{settings?.bank_name || "-"} · {settings?.bank_account || "-"}</div>
          <div style={{ fontSize: 13, color: C.t2, marginBottom: 14 }}>{settings?.bank_account_name || "-"}</div>
          <button onClick={handleConfirmPaid} disabled={submitting} style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 800, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#15803D,#166534)", color: "#fff", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Đang gửi..." : "✓ Tôi đã chuyển khoản"}
          </button>
        </div>
      )}
    </div>
  );
}
