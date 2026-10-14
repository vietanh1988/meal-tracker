import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ============================================================
// PWAInstallPrompt — Bottom sheet hướng dẫn cài app
//
// Android Chrome/Edge: bắt beforeinstallprompt → nút "Cài đặt ngay"
// iOS Safari: hướng dẫn 3 bước text (Share → Thêm vào MH chính → Thêm)
// iOS in-app browser (Zalo/FB): cảnh báo + nút "Mở bằng Safari"
//
// Điều kiện hiện: mobile + chưa standalone + chưa dismiss 7 ngày + đã login
// ============================================================

const DISMISS_KEY = "pwa_install_dismissed";
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Zalo|Line|MicroMessenger|Messenger/i.test(ua);
}
function isDismissed() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const diff = Date.now() - parseInt(ts, 10);
    return diff < DISMISS_DAYS * 86400000;
  } catch { return false; }
}
function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState(null); // "android" | "ios" | "webview"
  const deferredPrompt = useRef(null);

  useEffect(() => {
    if (!isMobile() || isStandalone() || isDismissed()) return;

    if (isIOS()) {
      if (isInAppBrowser()) setMode("webview");
      else setMode("ios");
      setShow(true);
      return;
    }

    // Android: listen for beforeinstallprompt
    let got = false;
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      got = true;
      setMode("android");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: nếu 10s không bắt được event → hiện hướng dẫn thủ công
    const timer = setTimeout(() => {
      if (!got && !isStandalone()) {
        if (isInAppBrowser()) setMode("webview_android");
        else setMode("android_manual");
        setShow(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") setShow(false);
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    dismiss();
    setShow(false);
  };

  const handleOpenSafari = () => {
    // Attempt to open in Safari — works from some in-app browsers
    window.open(window.location.href, "_system") || window.open(window.location.href, "_blank");
    handleDismiss();
  };

  if (!show) return null;

  const overlay = {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
    background: "rgba(15,23,42,0.5)", top: 0,
    display: "flex", alignItems: "flex-end",
    animation: "pwa-fade-in 0.3s ease",
  };
  const sheet = {
    background: "#fff", borderRadius: "22px 22px 0 0",
    padding: "20px 16px", paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))", width: "100%",
    maxWidth: 500, margin: "0 auto",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
    animation: "pwa-slide-up 0.3s ease",
    position: "relative",
  };
  const closeBtn = {
    position: "absolute", top: 12, right: 12,
    width: 28, height: 28, borderRadius: "50%",
    background: "#F1F5F9", border: "none", cursor: "pointer",
    fontSize: 14, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center",
  };
  const iconRow = { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 };
  // Bản vẽ 64: icon app thật thay emoji, các bước nằm trong khối xám nhạt, nút "Để sau" có viền
  const appIcon = {
    width: 56, height: 56, borderRadius: 15, objectFit: "cover",
    boxShadow: "0 6px 16px rgba(0,64,224,0.3)", flexShrink: 0, background: "#FFFFFF",
  };
  const title = { fontSize: 17, fontWeight: 900, color: "#0F172A" };
  const sub = { fontSize: 13, color: "#64748B", marginTop: 2, lineHeight: 1.4 };
  const primaryBtn = {
    width: "100%", height: 50, border: "none", borderRadius: 14,
    background: "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)",
    color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  };
  const laterBtn = {
    width: "100%", height: 48, border: "1.5px solid #E2E8F0", borderRadius: 14, background: "#FFFFFF",
    color: "#0F172A", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginTop: 10,
  };

  return createPortal(
    <>
      <style>{`
        @keyframes pwa-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pwa-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
      <div style={overlay} onClick={handleDismiss}>
        <div style={sheet} onClick={e => e.stopPropagation()}>
          <button style={closeBtn} onClick={handleDismiss}>✕</button>

          {/* ===== ANDROID ===== */}
          {mode === "android" && <>
            <div style={iconRow}>
              <img src="/icon-192.png" alt="" style={appIcon} />
              <div>
                <div style={title}>Cài Fipilot AI</div>
                <div style={sub}>Thêm vào màn hình chính để truy cập nhanh</div>
              </div>
            </div>
            <button style={primaryBtn} onClick={handleInstall}>📲 Cài đặt ngay</button>
            <button style={laterBtn} onClick={handleDismiss}>Để sau</button>
          </>}

          {/* ===== iOS Safari ===== */}
          {mode === "ios" && <>
            <div style={iconRow}>
              <img src="/icon-192.png" alt="" style={appIcon} />
              <div>
                <div style={title}>Cài Fipilot AI lên iPhone</div>
                <div style={sub}>Mở như app, nhận nhắc nhở · không cần App Store</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 4, background: "#F8FAFC", borderRadius: 14, padding: "4px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, fontSize: 14, color: "#0F172A" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,122,255,0.1)", color: "#007AFF", fontSize: 13, fontWeight: 900, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>1</div>
                <div>Nhấn nút <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "#007AFF", color: "#fff", borderRadius: 4, fontSize: 13, verticalAlign: "middle" }}>⎋</span> <b>Chia sẻ</b> ở thanh dưới</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, fontSize: 14, color: "#0F172A" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,122,255,0.1)", color: "#007AFF", fontSize: 13, fontWeight: 900, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>2</div>
                <div>Cuộn xuống, chọn <b>"Thêm vào MH chính"</b></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, fontSize: 14, color: "#0F172A" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,122,255,0.1)", color: "#007AFF", fontSize: 13, fontWeight: 900, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>3</div>
                <div>Nhấn <b>"Thêm"</b> — xong!</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 10 }}>Trên iPhone phải cài thì mới bật được thông báo nhắc bữa.</div>
            <button style={laterBtn} onClick={handleDismiss}>Đã hiểu, để sau</button>
          </>}

          {/* ===== In-app browser ===== */}
          {(mode === "webview" || mode === "webview_android") && <>
            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              ⚠️ Bạn đang mở trong ứng dụng khác. Cần mở bằng {isIOS() ? "Safari" : "Chrome"} để cài đặt.
            </div>
            <div style={iconRow}>
              <img src="/icon-192.png" alt="" style={appIcon} />
              <div>
                <div style={title}>Mở bằng {isIOS() ? "Safari" : "Chrome"}</div>
                <div style={sub}>Nhấn nút bên dưới để mở trình duyệt</div>
              </div>
            </div>
            <button style={{ ...primaryBtn, background: "linear-gradient(135deg, #F59E0B, #D97706)" }} onClick={handleOpenSafari}>🧭 Mở bằng {isIOS() ? "Safari" : "Chrome"}</button>
            <button style={laterBtn} onClick={handleDismiss}>Để sau</button>
          </>}

          {/* ===== Android manual (không bắt được beforeinstallprompt) ===== */}
          {mode === "android_manual" && <>
            <div style={iconRow}>
              <img src="/icon-192.png" alt="" style={appIcon} />
              <div>
                <div style={title}>Cài Fipilot AI</div>
                <div style={sub}>Thêm vào màn hình chính để truy cập nhanh</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, fontSize: 14, color: "#0F172A" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,122,255,0.1)", color: "#007AFF", fontSize: 13, fontWeight: 900, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>1</div>
                <div>Nhấn <b>⋮</b> (menu 3 chấm) ở góc phải trên</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, fontSize: 14, color: "#0F172A" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,122,255,0.1)", color: "#007AFF", fontSize: 13, fontWeight: 900, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>2</div>
                <div>Chọn <b>"Thêm vào MH chính"</b> hoặc <b>"Cài đặt ứng dụng"</b></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, fontSize: 14, color: "#0F172A" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,122,255,0.1)", color: "#007AFF", fontSize: 13, fontWeight: 900, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>3</div>
                <div>Nhấn <b>"Thêm"</b> — xong!</div>
              </div>
            </div>
            <button style={laterBtn} onClick={handleDismiss}>Đã hiểu, để sau</button>
          </>}
        </div>
      </div>
    </>,
    document.body
  );
}
