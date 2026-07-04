import { useState, useEffect } from "react";
import { C, card } from "../theme";

const FLAG_DEFS = [
  { key: "ai_chat", label: "🤖 AI Chat", desc: "Cho phép user chat với Fipilot AI", default: true },
  { key: "ai_macro", label: "📊 AI tính macro tự động", desc: "Cho phép AI tự tính calo/macro khi nhập món ăn", default: true },
  { key: "push", label: "🔔 Push notification", desc: "Gửi thông báo đẩy (đơn hàng, admin gửi thủ công...)", default: true },
  { key: "sales_enabled", label: "💰 Bán hàng (gói Premium)", desc: "Cho phép nâng cấp/gia hạn Premium qua chuyển khoản. TẮT = ẩn hẳn form mua, hiện banner miễn phí thay thế", default: false },
  { key: "registration_enabled", label: "📝 Cho phép đăng ký mới", desc: "Tắt tạm khi cần dừng nhận user mới (bảo trì, quá tải...)", default: true },
];

// Đọc/ghi appSettings.feature_flags (JSON), dùng chung cơ chế saveSetting() như các trang khác.
// Mỗi cờ có default riêng — nếu key chưa từng lưu, dùng default (sales_enabled mặc định TẮT
// để an toàn pháp lý khi công ty chưa đăng ký, các cờ khác mặc định BẬT để không phá tính năng cũ).
export function parseFeatureFlags(appSettings) {
  let saved = {};
  try { saved = appSettings?.feature_flags ? JSON.parse(appSettings.feature_flags) : {}; } catch (e) { saved = {}; }
  const flags = {};
  FLAG_DEFS.forEach(f => { flags[f.key] = (f.key in saved) ? saved[f.key] : f.default; });
  return flags;
}

export function FeatureFlagsTab({ appSettings, isAdmin, saveSetting }) {
  const [flags, setFlags] = useState(() => parseFeatureFlags(appSettings));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => { setFlags(parseFeatureFlags(appSettings)); }, [appSettings?.feature_flags]);

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;

  const toggle = async (key) => {
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    setSaving(true);
    try {
      await saveSetting("feature_flags", JSON.stringify(next));
      setFlash(`✓ Đã ${next[key] ? "bật" : "tắt"} "${FLAG_DEFS.find(f => f.key === key)?.label}"`);
      setTimeout(() => setFlash(""), 3000);
    } catch (e) { console.error(e); alert("Lưu thất bại"); }
    setSaving(false);
  };

  return (
    <div style={{ ...card, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>🚩 Quản lý tính năng</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Bật/tắt nhanh các tính năng lớn của toàn app, không cần deploy lại code</div>

      {flags.sales_enabled === false && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.goldBg, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 15 }}>⚠️</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#92400E", lineHeight: 1.5 }}>Bán hàng đang TẮT — user không thấy nút mua Premium, chỉ thấy banner "miễn phí". Phù hợp khi công ty chưa đăng ký pháp nhân, tránh rắc rối pháp lý khi thu tiền.</span>
        </div>
      )}

      {flash && <div style={{ marginBottom: 14, padding: "8px 12px", background: C.greenBg, borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#14532D" }}>{flash}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FLAG_DEFS.map(f => {
          const on = flags[f.key];
          return (
            <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 16px", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>{f.desc}</div>
              </div>
              <div onClick={() => !saving && toggle(f.key)} style={{ width: 44, height: 26, borderRadius: 13, background: on ? "#15803D" : "#CBD5E1", position: "relative", cursor: saving ? "default" : "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
