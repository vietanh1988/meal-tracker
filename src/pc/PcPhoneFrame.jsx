// Bản vẽ 120 (chốt 16/10): khách mở trên máy tính thấy CHÍNH app điện thoại đặt giữa màn (khung 400 px).
//  - Khung: viền tối #0F172A dày 10, bo 36 (trong bo 28), bóng 0 30px 80px; cao = màn − 80 (tối đa 860).
//  - Khung là "containing block" cho các lớp position:fixed của MobileApp (transform: translateZ(0) + overflow hidden)
//    → thanh dưới, sheet, màn phụ, toast nằm gọn trong khung; nội dung cuộn trong ô [data-pc-scroll].
//  - Bên trái: lời mời quét mã QR mở trên điện thoại (QR tạo ngay trong trình duyệt, src/lib/qr.js).
//  - Admin: nút "Vào Quản trị ›" góc trên phải → khung Quản trị PC (bản vẽ 117–119).
import { useMemo } from "react";
import { PC } from "../theme";
import { qrMatrix, qrSvgPath } from "../lib/qr";

export const APP_URL = "https://app.fipilotai.com";

// MobileApp gọi khi đổi tab (thay cho window.scrollTo khi chạy trong khung PC)
export function scrollPcFrameTop() {
  try { document.querySelector("[data-pc-scroll]")?.scrollTo?.(0, 0); } catch (e) { /* */ }
}

const CSS = `
.pcf-scroll{scrollbar-width:none;-ms-overflow-style:none}
.pcf-scroll::-webkit-scrollbar{display:none}
.pcf-soft{transition:background .15s ease}
.pcf-soft:hover{background:#E0EBFF !important}
.pcf-soft:focus-visible{outline:2px solid #1A7CFF;outline-offset:2px}
@media (max-width: 1179px){.pcf-invite{display:none !important}}
@media (max-height: 640px){.pcf-wrap{align-items:flex-start !important}}
`;

export function QrCode({ text = APP_URL, size = 120 }) {
  const { n, d } = useMemo(() => { const m = qrMatrix(text); return { n: m.length + 4, d: qrSvgPath(m, 2) }; }, [text]);
  return (
    <svg data-testid="pc-qr" role="img" aria-label={`Mã QR mở ${text}`} width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <rect width={n} height={n} fill="#FFFFFF" />
      <path d={d} fill="#0F172A" />
    </svg>
  );
}

export function PcPhoneFrame({ children, isAdmin, onOpenAdmin }) {
  return (
    <div data-testid="pc-frame-page" className="pcf-wrap" style={{ position: "relative", minHeight: "100vh", background: PC.bg, fontFamily: "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif", color: PC.t1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", boxSizing: "border-box" }}>
      <style>{CSS}</style>
      {/* Lời mời bên trái: rộng 300, cách trái 70, canh giữa theo chiều dọc; ẩn khi màn < 1180 (không đè khung) */}
      <div className="pcf-invite" data-testid="pc-invite" style={{ position: "absolute", left: 70, top: "50%", transform: "translateY(-50%)", width: 300, display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, lineHeight: 1.25, color: PC.t1 }}>Fipilot AI dùng tốt nhất trên điện thoại</h1>
        <p style={{ margin: 0, fontSize: 14, color: PC.t2, lineHeight: 1.6 }}>Trên máy tính bạn vẫn dùng được đầy đủ ở khung bên cạnh. Quét mã để mở trên điện thoại và thêm vào màn hình chính.</p>
        <span style={{ width: 140, height: 140, borderRadius: 16, background: "#FFFFFF", padding: 10, boxSizing: "border-box", boxShadow: "0 6px 20px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrCode size={120} />
        </span>
        <span data-testid="pc-url" style={{ fontSize: 12, color: PC.t3 }}>{APP_URL.replace("https://", "")}</span>
      </div>

      {isAdmin && (
        <button data-testid="pc-open-admin" className="pcf-soft" onClick={onOpenAdmin}
          style={{ position: "absolute", right: 60, top: 60, height: 34, padding: "0 14px", borderRadius: 10, border: "none", background: PC.soft, color: PC.softFg, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap", cursor: "pointer" }}>
          Vào Quản trị ›
        </button>
      )}

      {/* Khung điện thoại 400 × (màn − 80, tối đa 860) */}
      <div data-testid="pc-phone" style={{ width: 400, height: "calc(100vh - 80px)", maxHeight: 860, minHeight: 560, borderRadius: 36, background: "#0F172A", padding: 10, boxSizing: "border-box", boxShadow: "0 30px 80px rgba(15,23,42,0.35)", flexShrink: 0 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 28, overflow: "hidden", position: "relative", transform: "translateZ(0)", background: "#E0EBFF", isolation: "isolate" }}>
          <div data-pc-scroll="" className="pcf-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
