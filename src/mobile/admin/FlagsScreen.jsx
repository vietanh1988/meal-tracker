// Quản trị › Quản lý tính năng (bản vẽ 105, chốt 16/10) — thay tab cũ adminTabs/FeatureFlagsTab.jsx.
//  - 8 cờ thật của appSettings.feature_flags (đọc qua parseFeatureFlags → giữ đúng giá trị mặc định từng cờ),
//    chia 3 nhóm AI / Bán hàng & tài khoản / Khác; mỗi dòng ô icon + tên + mô tả 1 dòng + công tắc.
//  - Bật/tắt lưu ngay (saveSetting("feature_flags", JSON) như cũ) + thông báo nhỏ "Đã bật/Đã tắt …".
//  - Tắt "Cho đăng ký mới" hoặc "AI tạo thực đơn" phải xác nhận trước.
//  - Admin thường: công tắc mờ, bấm không được + dòng chỉ xem (bản cũ bấm không lưu, không báo gì).
import { useEffect, useState } from "react";
import { DK } from "../../theme";
import { parseFeatureFlags } from "../../adminTabs/FeatureFlagsTab";
import { SubPage, Toggle, DkIcon } from "../ui";
import { Sec, Card, Row, ReadOnly, Note, Empty, useConfirm } from "./adminUI";

const svg = (d) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const I = {
  chat: svg(<path d="M5 5h14v10H9l-4 4z" />),
  calc: svg(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>),
  sparkle: svg(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />),
  camera: svg(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  crown: svg(<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />),
  user: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  bell: svg(<><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>),
  layers: svg(<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>),
};

// key = khoá thật trong FLAG_DEFS (adminTabs/FeatureFlagsTab.jsx) — đủ 8 cờ
const GROUPS = [
  { title: "AI", items: [
    { key: "ai_chat", label: "Chat AI", desc: "Hỏi Fipilot AI ở Tôi và thẻ bữa", color: "#7C3AED", icon: I.chat },
    { key: "ai_macro", label: "AI tính macro", desc: "Kiểm tra calo món lạ", color: "#0891B2", icon: I.calc },
    { key: "ai_menu_gen", label: "AI tạo thực đơn", desc: "Gói Free luôn khoá", color: "#6D28D9", icon: I.sparkle, confirmOff: "Mọi gói (kể cả Premium) sẽ không dùng được AI ghép thực đơn ở Onboarding và Hôm nay." },
    { key: "photo_macro", label: "Chụp ảnh món", desc: "AI nhận diện món từ ảnh", color: "#EA580C", icon: I.camera },
  ] },
  { title: "Bán hàng & tài khoản", items: [
    { key: "sales_enabled", label: "Bán gói Premium", desc: "Tắt: user chỉ thấy 'đang miễn phí'", color: "#DB2777", icon: I.crown },
    { key: "registration_enabled", label: "Cho đăng ký mới", desc: "Tắt: màn đăng ký báo chưa nhận", color: "#2563EB", icon: I.user, confirmOff: "Người mới sẽ không tạo được tài khoản cho tới khi bật lại." },
  ] },
  { title: "Khác", items: [
    { key: "push", label: "Thông báo đẩy", desc: "Nhắc bữa, nhắc cân, báo cáo tuần", color: "#0EA5E9", icon: I.bell },
    { key: "template_library", label: "Thực đơn mẫu", desc: "Hiện mục Thực đơn mẫu ở tab Thực đơn", color: "#16A34A", icon: I.layers },
  ] },
];

export function FlagsScreen({ onBack, isAdmin, isSuperAdmin, appSettings = {}, saveSetting, showToast }) {
  const can = !!isSuperAdmin;
  const [confirm, dialog] = useConfirm();
  const [flags, setFlags] = useState(() => parseFeatureFlags(appSettings));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setFlags(parseFeatureFlags(appSettings)); }, [appSettings?.feature_flags]);

  const toggle = async (f) => {
    if (!can || saving) return;
    const nextOn = !flags[f.key];
    if (!nextOn && f.confirmOff) {
      const ok = await confirm({ title: `Tắt "${f.label}"?`, text: f.confirmOff, ok: "Tắt", danger: true });
      if (!ok) return;
    }
    const prev = flags;
    const next = { ...flags, [f.key]: nextOn };
    setFlags(next);
    setSaving(true);
    try {
      await saveSetting("feature_flags", JSON.stringify(next));
      showToast?.({ text: `Đã ${nextOn ? "bật" : "tắt"} ${f.label}` }, 2500);
    } catch (e) {
      console.error(e);
      setFlags(prev);
      showToast?.({ text: "Lưu không được, kiểm tra mạng rồi thử lại." });
    }
    setSaving(false);
  };

  const sub = "Bật / tắt cho toàn app, không cần cập nhật";
  if (!isAdmin) return (
    <SubPage dark title="Quản lý tính năng" subtitle={sub} onBack={onBack}>
      <Empty>Chỉ Admin mới xem được trang này.</Empty>
    </SubPage>
  );

  return (
    <SubPage dark title="Quản lý tính năng" subtitle={sub} onBack={onBack}>
      <div data-testid="adm-flags" style={{ paddingBottom: 32 }}>
        {!can && <ReadOnly />}
        {GROUPS.map((g) => (
          <div key={g.title}>
            <Sec>{g.title}</Sec>
            <Card>
              {g.items.map((f, i) => (
                <Row key={f.key} last={i === g.items.length - 1} style={{ minHeight: 66, gap: 12 }}>
                  <DkIcon color={f.color}>{f.icon}</DkIcon>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, padding: "10px 0" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span>
                    <span style={{ fontSize: 12, color: DK.t3, lineHeight: 1.35 }}>{f.desc}</span>
                  </span>
                  <span aria-disabled={!can || undefined} style={{ display: "flex", flexShrink: 0, opacity: can ? (saving ? 0.7 : 1) : 0.45, pointerEvents: can ? "auto" : "none" }}>
                    <Toggle on={!!flags[f.key]} onClick={() => toggle(f)} label={f.label} testid={`adm-flag-${f.key}`} />
                  </span>
                </Row>
              ))}
            </Card>
            {g.title === "Bán hàng & tài khoản" && flags.sales_enabled === false && (
              <Note>Bán hàng đang TẮT — user không thấy nút mua Premium.</Note>
            )}
          </div>
        ))}
      </div>
      {dialog}
    </SubPage>
  );
}
