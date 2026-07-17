import { C } from "./theme";

// Thiết kế mới: icon tròn + số lớn + thanh ngang, thay cho MacroRing (vòng
// tròn) trong Hero card. MacroRing.jsx KHÔNG bị sửa/xoá — vẫn dùng nguyên ở
// App.jsx (PC, chưa đổi) và OnboardingWizard.jsx, tránh ảnh hưởng nơi khác.
//
// Logic nghiệp vụ mang nguyên từ MacroRing (đã audit kỹ trước khi viết):
// - Vượt >115% target → cảnh báo màu cam + icon ⚠️ cạnh số
// - Vượt >140% → màu đỏ đậm hơn (severe)
// - Thanh bar cap tối đa 100% dù tỷ lệ thật vượt xa hơn, tránh tràn khung
// - Số hiển thị luôn làm tròn
export function MacroBar({ icon, iconBg, label, v, max, barColor }) {
  const ratio = max > 0 ? v / max : 0;
  const isSevereOver = ratio > 1.4;
  const isOver = ratio > 1.15;
  const activeColor = isSevereOver ? "#DC2626" : isOver ? "#F59E0B" : barColor;
  const pct = Math.min(ratio * 100, 100);
  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 12, color: C.t2, marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 1, color: isOver ? activeColor : C.t1 }}>{Math.round(v)}g{isOver ? " ⚠" : ""}</div>
      <div style={{ fontSize: 11, color: C.t3, fontWeight: 600 }}>/{max}g</div>
      <div style={{ height: 4, width: 52, background: C.surface, borderRadius: 2, marginTop: 5 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: activeColor, borderRadius: 2, transition: "width 0.4s, background 0.3s" }} />
      </div>
    </div>
  );
}
