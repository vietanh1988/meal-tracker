// 31/10 (chủ dự án chốt bản B): vừa xong việc 1 của "3 ngày làm quen" → sheet nhỏ hỏi bật nhắc giờ ăn, chỉ 1 lần (localStorage fp_onb_push).
// Nút theo bản vẽ: cao 44, bo 14, lưới 1fr / 1.4fr, khe 8; "Để sau" #F1F5F9 / #475569, "Bật nhắc" nền xanh app.
import { useState } from "react";
import { createPortal } from "react-dom";
import { FONT, GRAD_BLUE, useLockScroll, useSwipeClose, SheetHandle } from "../mobile/ui";

const btn = { height: 44, borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" };

export function OnboardPushSheet({ variant, onLater, onOn }) {
  useLockScroll(true);
  const sw = useSwipeClose(onLater);
  const [busy, setBusy] = useState(false);
  const on = async () => { if (busy) return; setBusy(true); try { await onOn(); } finally { setBusy(false); } };
  return createPortal(
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="onb-push-sheet" role="dialog" aria-modal="true" aria-label="Bật nhắc giờ ăn" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 16, background: "#EEF4FF", color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Cho Pi nhắc bạn giờ ăn nhé?</span>
            <span style={{ fontSize: 13, color: "#64748B", lineHeight: 1.45 }}>{variant === "nu" ? "Đến giờ ăn Pi gửi 1 thông báo nhỏ nha." : "Đến giờ ăn Pi gửi 1 thông báo nhỏ."} Tắt lúc nào cũng được ở Tôi › Nhắc nhở.</span>
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
          <button type="button" data-testid="onb-push-later" onClick={sw.close} className="tap" style={{ ...btn, background: "#F1F5F9", color: "#475569" }}>Để sau</button>
          <button type="button" data-testid="onb-push-on" onClick={on} disabled={busy} className="tap" style={{ ...btn, background: GRAD_BLUE, color: "#FFFFFF", opacity: busy ? 0.7 : 1 }}>{busy ? "Đang bật…" : "Bật nhắc"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
