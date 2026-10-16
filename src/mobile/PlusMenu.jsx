// Nút + giữa thanh dưới → 3 lựa chọn (bản vẽ 116, 17/10): Ghi bữa · Chụp món · Kiểm tra calo.
// Mờ nền, 3 thẻ to nằm ngay trên thanh dưới (thanh dưới vẫn hiện, nút + thành ×). Chạm ngoài / × để đóng.
import { useEffect } from "react";
import { Icon, FONT, GRAD_BLUE, GRAD_ORANGE, NAV_BOTTOM } from "./ui";

const CY = "linear-gradient(135deg,#0E9FC0,#0369A1)";
const card = { display: "flex", alignItems: "center", gap: 14, width: "100%", padding: 14, borderRadius: 18, border: "none", background: "#FFFFFF", boxShadow: "0 6px 18px rgba(15,23,42,0.08)", fontFamily: "inherit", color: "#0F172A", textAlign: "left", boxSizing: "border-box" };
const ic = (bg) => ({ width: 48, height: 48, borderRadius: 15, background: bg, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 });

export function PlusMenu({ onClose, onLog, onPhoto, onCalc }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const opts = [
    { id: "plus-log", title: "Ghi bữa", sub: "Tìm món trong kho, chọn gram, ghi vào bữa · gõ được cả bữa", bg: GRAD_BLUE, icon: Icon.search(22), on: onLog },
    onPhoto && { id: "plus-photo", title: "Chụp món", sub: "AI nhận ra món và gram từ ảnh", bg: GRAD_ORANGE, icon: Icon.camera(22), on: onPhoto },
    { id: "plus-calc", title: "Kiểm tra calo", sub: "Gõ món đang định ăn, xem calo trước khi ăn — không cần ghi", bg: CY, icon: Icon.calc(22), on: onCalc },
  ].filter(Boolean);
  return (
    <div className="fpm" data-testid="plus-menu" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 89, background: "rgba(15,23,42,0.62)", WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)", fontFamily: FONT, animation: "fpmFade .15s ease" }}>
      <div role="menu" aria-label="Bạn muốn làm gì?" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 12, right: 12, bottom: `calc(${NAV_BOTTOM} + 86px)`, maxWidth: 536, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10, animation: "fpmSheetUp .2s ease" }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", padding: "0 6px", textShadow: "0 1px 6px rgba(0,0,0,0.45)" }}>Bạn muốn làm gì?</span>
        {opts.map((o) => (
          <button key={o.id} role="menuitem" data-testid={o.id} onClick={o.on} style={card}>
            <span style={ic(o.bg)}>{o.icon}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 900 }}>{o.title}</span>
              <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{o.sub}</span>
            </span>
            <span aria-hidden="true" style={{ color: "#94A3B8", display: "flex" }}>{Icon.chev(18)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
