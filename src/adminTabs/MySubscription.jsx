import { useState, useEffect, useCallback } from "react";
import { appAlert, appConfirm } from "../lib/dialog";
import { supabase } from "../lib/supabase";
import { C } from "../theme";
import { parseFeatureFlags } from "./FeatureFlagsTab";

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

export function MySubscription({ userId, mob, isAdmin, appSettings }) {
  const salesEnabled = parseFeatureFlags(appSettings).sales_enabled;
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [settings, setSettings] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [resultBanner, setResultBanner] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState("6m");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const seenKey = (id) => `sub_order_seen_${id}`;

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: p }, { data: s }, { data: orders }] = await Promise.all([
        supabase.from("profiles").select("username,tier,trial_end_date,subscription_end_date,ai_macro_count_this_month,ai_chat_count_today,ai_menu_count_today").eq("id", userId).single(),
        supabase.from("subscription_settings").select("free_ai_macro_limit,free_ai_chat_limit,free_ai_menu_limit,trial_ai_macro_limit,trial_ai_chat_limit,trial_ai_menu_limit,premium_ai_macro_limit,premium_ai_chat_limit,premium_ai_menu_limit,price_3m,price_6m,price_12m,bank_name,bank_account,bank_account_name").eq("id", 1).single(),
        supabase.from("orders").select("id,package,amount,status,created_at,confirmed_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      setSub(p || null);
      setSettings(s || null);
      setOrderHistory(orders || []);
      const latestOrder = orders && orders[0];
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
      if (error) { appAlert("Gửi yêu cầu thất bại: " + error.message); setSubmitting(false); return; }
      setPendingOrder(data);
      setOrderHistory(prev => [data, ...prev]);
      setShowPicker(false);
    } catch (e) { console.error(e); appAlert("Gửi yêu cầu thất bại"); }
    setSubmitting(false);
  };

  if (loading || !sub) return null;

  // Khi TẮT bán hàng: user thường chỉ thấy đúng 1 banner, ẩn hết tier/hết hạn/lịch sử đơn cũ
  // (kể cả dữ liệu test/cũ trong DB) — admin vẫn thấy bình thường để quản lý được.
  if (!isAdmin && !salesEnabled) {
    return (
      <div style={{ background: C.surface, borderRadius: 14, padding: "16px 18px", marginBottom: 16, border: `1.5px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🎁</div>
          <div style={{ fontSize: mob ? 17 : 16, fontWeight: 800, color: C.t1 }}>Hạng thành viên</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#EFFDF5,#E6F7FF)", borderRadius: 14, padding: "18px 20px", border: "1px solid #A7F3D0", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, boxShadow: "0 1px 4px rgba(16,185,129,0.25)" }}>🎁</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#065F46", marginBottom: 5 }}>Fipilot AI hiện đang miễn phí 100%.</div>
            <div style={{ fontSize: 13, color: "#0F766E", lineHeight: 1.6, fontWeight: 600 }}>Chúng mình chưa có kế hoạch thu phí trong thời gian tới. Hãy thoải mái trải nghiệm và góp ý để cùng xây dựng Fipilot AI ngày một tốt hơn! 💙</div>
          </div>
        </div>
      </div>
    );
  }

  const tier = sub.tier || "free";
  const macroLimit = settings?.[`${tier}_ai_macro_limit`] ?? (tier === "premium" ? 1000 : tier === "trial" ? 500 : 100);
  const chatLimit = settings?.[`${tier}_ai_chat_limit`] ?? (tier === "premium" ? 150 : tier === "trial" ? 100 : 20);
  const menuLimit = settings?.[`${tier}_ai_menu_limit`] ?? (tier === "premium" ? 50 : tier === "trial" ? 30 : 5);
  const macroUsed = sub.ai_macro_count_this_month || 0;
  const chatUsed = sub.ai_chat_count_today || 0;
  const menuUsed = sub.ai_menu_count_today || 0;
  const trialDays = daysLeft(sub.trial_end_date);
  const subDays = daysLeft(sub.subscription_end_date);

  const isPremium = tier === "premium";

  const iconBoxBg = { free: C.surface, trial: C.goldBg, premium: C.blueBg }[tier];
  const stateIcon = { free: "📦", trial: "⏳", premium: "⭐" }[tier];
  const badgeStyle = {
    free: { background: C.surface, color: C.t2 },
    trial: { background: C.goldBg, color: "#92400E" },
    premium: { background: C.blueBg, color: C.primary },
  }[tier];
  const badgeLabel = { free: `${stateIcon} Free`, trial: `${stateIcon} Trial`, premium: `${stateIcon} Premium` }[tier];

  const btnStyle = isPremium
    ? { width: "100%", padding: "12px", fontSize: 14, fontWeight: 900, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#EF4444,#DC2626)", color: "#fff", cursor: "pointer" }
    : { width: "100%", padding: "12px", fontSize: 14, fontWeight: 900, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", color: "#fff", cursor: "pointer" };

  const PKG_SHORT = { "3m": "3T", "6m": "6T", "12m": "12T" };
  const transferContent = `FIPILOT ${(sub.username || userId || "").toString().replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase()} ${PKG_SHORT[selectedPkg] || ""}`.trim();

  const copyContent = () => {
    try {
      navigator.clipboard.writeText(transferContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  const copyAccountNumber = () => {
    try {
      navigator.clipboard.writeText(settings?.bank_account || "");
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    } catch (e) {}
  };

  const STATUS_LABEL = { pending: "Chờ duyệt", confirmed: "Đã duyệt", rejected: "Đã từ chối" };
  const STATUS_BG = { pending: C.goldBg, confirmed: C.greenBg, rejected: C.redBg };
  const STATUS_FG = { pending: "#92400E", confirmed: "#14532D", rejected: "#7F1D1D" };

  return (
    <div style={{ background: C.surface, borderRadius: 14, padding: "16px 18px", marginBottom: 16, border: `1.5px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBoxBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{stateIcon}</div>
          <div style={{ fontSize: mob ? 17 : 16, fontWeight: 800, color: C.t1 }}>Hạng thành viên</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, ...badgeStyle }}>{badgeLabel}</span>
      </div>

      {resultBanner && (
        <div style={{ background: resultBanner.status === "confirmed" ? C.greenBg : C.redBg, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: resultBanner.status === "confirmed" ? "#14532D" : "#7F1D1D" }}>
            {resultBanner.status === "confirmed" ? `🎉 Đơn nâng cấp ${PKG_LABEL[resultBanner.package] || resultBanner.package} đã được duyệt! Chào mừng đến với Premium.` : `Đơn nâng cấp ${PKG_LABEL[resultBanner.package] || resultBanner.package} đã bị từ chối. Liên hệ Admin để biết thêm chi tiết.`}
          </div>
          <button onClick={dismissBanner} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: resultBanner.status === "confirmed" ? "#14532D" : "#7F1D1D", flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {tier !== "free" && <div style={{ fontSize: 11, color: C.t3, marginBottom: 10 }}>Hạn mức cao — gần như không đụng tới khi dùng bình thường</div>}
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t2, marginBottom: 6, fontWeight: 600 }}>
              <span>📊 AI tính macro</span><span style={{ color: C.t1, fontWeight: 700 }}>{macroUsed}/{macroLimit}</span>
            </div>
            <div style={{ height: 10, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#36A3FF,#007AFF)", width: `${Math.min(100, (macroUsed / macroLimit) * 100)}%` }} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t2, marginBottom: 6, fontWeight: 600 }}>
              <span>🍽️ AI tạo thực đơn</span><span style={{ color: C.t1, fontWeight: 700 }}>{menuUsed}/{menuLimit}</span>
            </div>
            <div style={{ height: 10, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#36A3FF,#007AFF)", width: `${Math.min(100, (menuUsed / menuLimit) * 100)}%` }} /></div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t2, marginBottom: 6, fontWeight: 600 }}>
              <span>💬 AI Chat</span><span style={{ color: C.t1, fontWeight: 700 }}>{chatUsed}/{chatLimit}</span>
            </div>
            <div style={{ height: 10, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#36A3FF,#007AFF)", width: `${Math.min(100, (chatUsed / chatLimit) * 100)}%` }} /></div>
        </div>
      </div>

      {tier === "trial" && (
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: C.t1 }}>{trialDays !== null ? Math.max(0, trialDays) : "-"} ngày</div>
          <div style={{ fontSize: 13, color: C.t2, marginTop: 4 }}>còn lại · đang dùng đầy đủ quyền Premium</div>
        </div>
      )}

      {tier === "premium" && subDays !== null && subDays <= 7 && (
        <div style={{ background: C.goldBg, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 13, fontWeight: 700, color: "#92400E" }}>
          🕐 {subDays <= 0 ? "Gói Premium đã hết hạn" : `Còn ${subDays} ngày nữa hết hạn (${fmtDMY(sub.subscription_end_date)})`}
        </div>
      )}
      {tier === "premium" && (subDays === null || subDays > 7) && (
        <div style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: C.t2 }}>🕐 Hết hạn: <b style={{ color: C.t1 }}>{fmtDMY(sub.subscription_end_date)}</b></div>
      )}

      {isAdmin ? (
        <div style={{ background: C.blueBg, borderRadius: 10, padding: "10px 14px", textAlign: "center", fontSize: 13, fontWeight: 700, color: C.primary }}>👑 Tài khoản Admin — không cần gia hạn</div>
      ) : pendingOrder ? (
        <div style={{ background: C.greenBg, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#14532D" }}>✓ Đã gửi yêu cầu nâng cấp ({PKG_LABEL[pendingOrder.package] || pendingOrder.package})</div>
          <div style={{ fontSize: 12, color: "#14532D", marginTop: 2 }}>Chờ Admin duyệt trong ít phút</div>
        </div>
      ) : (
        <button onClick={() => setShowPicker(v => !v)} style={btnStyle}>
          {tier === "premium" ? "🔄 Gia hạn" : "⭐ Nâng cấp Premium"}
        </button>
      )}

      {showPicker && !pendingOrder && !isAdmin && salesEnabled && (
        <div style={{ marginTop: 14, background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 10 }}>Chọn gói Premium</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
            {["3m", "6m", "12m"].map(k => (
              <div key={k} onClick={() => setSelectedPkg(k)} style={{ border: selectedPkg === k ? `2px solid ${C.primary}` : `1px solid ${C.border}`, borderRadius: 10, padding: "10px 6px", textAlign: "center", cursor: "pointer", background: selectedPkg === k ? C.blueBg : "#fff" }}>
                <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>{PKG_LABEL[k]}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.t1, marginTop: 2 }}>{fmtVND(settings?.[{ "3m": "price_3m", "6m": "price_6m", "12m": "price_12m" }[k]])}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Chuyển khoản tới</div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "2px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.t2 }}>Ngân hàng</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{settings?.bank_name || "-"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.t2 }}>Số tài khoản</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: C.t1, fontFamily: "monospace", letterSpacing: "0.02em" }}>{settings?.bank_account || "-"}</span>
                <button onClick={copyAccountNumber} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 800, border: "none", borderRadius: 8, background: C.primary, color: "#fff", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>{copiedAcc ? "✓ Đã copy" : "Copy"}</button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.t2 }}>Chủ tài khoản</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{settings?.bank_account_name || "-"}</span>
            </div>
          </div>

          <div style={{ background: C.blueBg, border: `1px solid ${C.primary}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.primary, marginBottom: 10 }}>✏️ Nội dung chuyển khoản</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontSize: 17, fontWeight: 900, color: C.primary, letterSpacing: "0.02em", fontFamily: "monospace", wordBreak: "break-all" }}>{transferContent}</div>
              <button onClick={copyContent} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 800, border: "none", borderRadius: 8, background: C.primary, color: "#fff", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>{copied ? "✓ Đã copy" : "Copy"}</button>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 12, background: C.goldBg, borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#92400E", lineHeight: 1.5 }}>Bắt buộc ghi đúng nội dung này khi chuyển khoản để Admin xác nhận đơn nhanh hơn. Đổi gói ở trên sẽ tự cập nhật lại nội dung — nhớ copy lại nếu vừa đổi gói.</span>
            </div>
          </div>

          <div style={{ height: 14 }}/>

          <button onClick={handleConfirmPaid} disabled={submitting} style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 800, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#15803D,#166534)", color: "#fff", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Đang gửi..." : "✓ Tôi đã chuyển khoản"}
          </button>
        </div>
      )}

      {!isAdmin && orderHistory.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div onClick={() => setShowHistory(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "8px 2px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.t2 }}>📜 Lịch sử đơn hàng ({orderHistory.length})</span>
            <span style={{ fontSize: 12, color: C.t3, transform: showHistory ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
          </div>
          {showHistory && (
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              {orderHistory.map((o, i) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: i < orderHistory.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{PKG_LABEL[o.package] || o.package} · {fmtVND(o.amount)}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                      {fmtDMY(o.created_at ? o.created_at.slice(0, 10) : null)}
                      {o.status === "confirmed" && o.confirmed_at ? ` · duyệt ${fmtDMY(o.confirmed_at.slice(0, 10))}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: STATUS_BG[o.status], color: STATUS_FG[o.status], flexShrink: 0 }}>{STATUS_LABEL[o.status] || o.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
