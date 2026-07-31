// ============================================================
// BackPill — nút quay lại chuẩn toàn app (Phương án A)
// Pill xám trung tính, cao 36px, vùng chạm ≥44px, hiệu ứng nhún.
// label bỏ trống → chỉ icon (dùng chỗ chật như AI Coach header).
// ============================================================
import { useState } from "react";

export default function BackPill({ label, onClick, style = {} }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 36, padding: label ? "0 14px 0 10px" : "0 10px",
        borderRadius: 999, background: pressed ? "#E2E8F0" : "#F1F5F9",
        border: "1px solid #E2E8F0", color: "#334155",
        fontSize: 13.5, fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit", transition: "all .12s",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label || null}
    </button>
  );
}
