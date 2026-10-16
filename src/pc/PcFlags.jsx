// Quản trị PC › Quản lý tính năng. Cùng logic & ghi DB với src/mobile/admin/FlagsScreen.jsx (thay tab cũ adminTabs/FeatureFlagsTab.jsx):
//  - 8 cờ thật của appSettings.feature_flags, đọc qua parseFeatureFlags (giữ đúng mặc định từng cờ: sales_enabled / template_library / photo_macro mặc định TẮT).
//  - Bảng: TÍNH NĂNG (tên + mô tả) · ÁP DỤNG CHO (ai thấy) · TRẠNG THÁI · công tắc; chia 3 nhóm AI / Bán hàng & tài khoản / Khác.
//  - Bật/tắt lưu ngay: saveSetting("feature_flags", JSON) + báo nhanh "Đã bật/Đã tắt …"; lỗi → trả lại trạng thái cũ.
//  - Tắt "Cho đăng ký mới" hoặc "AI tạo thực đơn" phải xác nhận trước (hộp thoại app).
//  - Admin thường: công tắc mờ, không bấm được + dải chỉ xem.
import { useEffect, useState } from "react";
import { appConfirm } from "../lib/dialog";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { PC } from "../theme";
import { Pill, Card, headRow, bodyRow, cell, vnInt } from "./pcUI";

const COLS = "2.4fr 1.5fr 0.8fr 64px";
// key = khoá thật trong FLAG_DEFS (adminTabs/FeatureFlagsTab.jsx) — đủ 8 cờ. "who" lấy từ cách app dùng cờ (getAIMenuAccess, PhotoMacroChecker, …)
const GROUPS = [
  { title: "AI", items: [
    { key: "ai_chat", label: "Chat AI", desc: "Hỏi Fipilot AI ở Tôi và thẻ bữa", who: "Mọi gói · theo lượt của gói" },
    { key: "ai_macro", label: "AI tính macro", desc: "Kiểm tra calo món lạ (chưa có trong kho)", who: "Mọi gói · theo lượt của gói" },
    { key: "ai_menu_gen", label: "AI tạo thực đơn", desc: "Ghép thực đơn ở Onboarding và Hôm nay", who: "Trial, Premium · gói Free luôn khoá", confirmOff: "Mọi gói (kể cả Premium) sẽ không dùng được AI ghép thực đơn ở Onboarding và Hôm nay." },
    { key: "photo_macro", label: "Chụp ảnh món", desc: "AI nhận diện món từ ảnh, xem calo nhanh", who: "Mọi gói · chỉ trên điện thoại" },
  ] },
  { title: "Bán hàng & tài khoản", items: [
    { key: "sales_enabled", label: "Bán gói Premium", desc: "Nâng cấp / gia hạn qua chuyển khoản. Tắt: user chỉ thấy 'đang miễn phí'", who: "Mọi user (nút mua / gia hạn)" },
    { key: "registration_enabled", label: "Cho đăng ký mới", desc: "Tắt: màn đăng ký báo chưa nhận người mới", who: "Người chưa có tài khoản", confirmOff: "Người mới sẽ không tạo được tài khoản cho tới khi bật lại." },
  ] },
  { title: "Khác", items: [
    { key: "push", label: "Thông báo đẩy", desc: "Nhắc bữa, nhắc cân, báo cáo tuần, admin gửi thủ công", who: "User đã bật thông báo" },
    { key: "template_library", label: "Thực đơn mẫu", desc: "Hiện mục Thực đơn mẫu ở tab Thực đơn", who: "Mọi user" },
  ] },
];
const ALL = GROUPS.flatMap((g) => g.items);

function Switch({ on, onClick, disabled, label, testid }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} data-testid={testid} onClick={onClick} disabled={disabled} className="pc-btn"
      style={{ width: 42, height: 24, borderRadius: 12, border: "none", padding: 0, position: "relative", flexShrink: 0, cursor: disabled ? "default" : "pointer", background: on ? "#0062F0" : "#CBD5E1", transition: "background .18s ease", fontFamily: "inherit" }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: 9, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(15,23,42,0.3)", transition: "left .18s ease" }} />
    </button>
  );
}

export function PcFlags({ top, isSuperAdmin, appSettings = {}, saveSetting, showToast }) {
  const can = !!isSuperAdmin;
  const [flags, setFlags] = useState(() => parseFeatureFlags(appSettings));
  const [saving, setSaving] = useState(null); // key đang lưu

  useEffect(() => { setFlags(parseFeatureFlags(appSettings)); }, [appSettings?.feature_flags]);

  const toggle = async (f) => {
    if (!can || saving) return;
    const nextOn = !flags[f.key];
    if (!nextOn && f.confirmOff) {
      if (!await appConfirm(f.confirmOff, { title: `Tắt "${f.label}"?`, confirmText: "Tắt", danger: true })) return;
    }
    const prev = flags;
    const next = { ...flags, [f.key]: nextOn };
    setFlags(next);
    setSaving(f.key);
    try {
      await saveSetting("feature_flags", JSON.stringify(next));
      showToast?.({ text: `Đã ${nextOn ? "bật" : "tắt"} ${f.label}` }, 2500);
    } catch (e) {
      console.error(e);
      setFlags(prev);
      showToast?.({ text: "Lưu không được, kiểm tra mạng rồi thử lại." });
    }
    setSaving(null);
  };

  const onCount = ALL.filter((f) => flags[f.key]).length;
  return (
    <>
      {top(<span data-testid="pc-feature_flags-count" style={{ fontSize: 12, color: PC.t3, whiteSpace: "nowrap" }}>Đang bật <b style={{ color: PC.t1 }}>{vnInt(onCount)}</b>/{vnInt(ALL.length)} tính năng</span>, undefined, "Bật / tắt cho toàn app, không cần cập nhật")}
      <div data-testid="pc-feature_flags" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {!can && <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường chỉ xem — Super Admin mới bật / tắt được tính năng.</div>}
        {flags.sales_enabled === false && (
          <div data-testid="pc-feature_flags-sales-off" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px", lineHeight: 1.5 }}>
            Bán hàng đang TẮT — user không thấy nút mua Premium, chỉ thấy dải "miễn phí".
          </div>
        )}
        <Card>
          <div style={headRow(COLS)}><span>TÍNH NĂNG</span><span>ÁP DỤNG CHO</span><span>TRẠNG THÁI</span><span style={{ textAlign: "right" }}>BẬT/TẮT</span></div>
          {GROUPS.map((g, gi) => (
            <div key={g.title}>
              <div style={{ padding: "10px 16px 6px 16px", fontSize: 11, fontWeight: 800, color: PC.t4, letterSpacing: ".05em", background: "#FFFFFF", borderBottom: `1px solid ${PC.rowLine}` }}>{g.title.toUpperCase()}</div>
              {g.items.map((f, i) => {
                const on = !!flags[f.key];
                const last = gi === GROUPS.length - 1 && i === g.items.length - 1;
                return (
                  <div key={f.key} data-testid="pc-feature_flags-row" data-key={f.key} className="pc-row"
                    style={{ ...bodyRow(COLS), minHeight: 58, padding: "8px 16px", borderBottom: last ? "none" : bodyRow(COLS).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                    <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ ...cell, fontSize: 13, fontWeight: 800 }}>{f.label}</span>
                      <span style={{ ...cell, fontSize: 12, color: PC.t3 }} title={f.desc}>{f.desc}</span>
                    </span>
                    <span style={{ ...cell, color: PC.t2 }} title={f.who}>{f.who}</span>
                    <span style={cell}><Pill tone={on ? "green" : "gray"} testid={`pc-feature_flags-state-${f.key}`}>{on ? "đang bật" : "đang tắt"}</Pill></span>
                    <span style={{ display: "flex", justifyContent: "flex-end", opacity: can ? (saving === f.key ? 0.6 : 1) : 0.45 }}>
                      <Switch on={on} onClick={() => toggle(f)} disabled={!can || !!saving} label={f.label} testid={`pc-feature_flags-${f.key}`} />
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
