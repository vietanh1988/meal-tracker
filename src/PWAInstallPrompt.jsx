import { useState, useEffect, useRef } from "react";

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
    }

    // Android: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setMode("android");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
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
    background: "rgba(0,0,0,0.3)", top: 0,
    display: "flex", alignItems: "flex-end",
    animation: "pwa-fade-in 0.3s ease",
  };
  const sheet = {
    background: "#fff", borderRadius: "16px 16px 0 0",
    padding: "20px 16px 28px", width: "100%",
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
  const appIcon = {
    width: 48, height: 48, borderRadius: 12,
    background: "linear-gradient(135deg, #36A3FF, #007AFF)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, color: "#fff", flexShrink: 0,
  };
  const title = { fontSize: 16, fontWeight: 800, color: "#0F172A" };
  const sub = { fontSize: 12, color: "#64748B", marginTop: 2 };
  const primaryBtn = {
    width: "100%", padding: 14, border: "none", borderRadius: 12,
    background: "linear-gradient(135deg, #36A3FF, #007AFF)",
    color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  };
  const laterBtn = {
    width: "100%", padding: 10, border: "none", background: "transparent",
    color: "#94A3B8", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4,
  };

  return (
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
              <div style={appIcon}>🍽️</div>
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
              <div style={appIcon}>🍽️</div>
              <div>
                <div style={title}>Cài Fipilot AI</div>
                <div style={sub}>Dùng như app — không cần App Store</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#334155" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#007AFF", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>1</div>
                <div>Nhấn nút <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "#007AFF", color: "#fff", borderRadius: 4, fontSize: 13, verticalAlign: "middle" }}>⎋</span> <b>Chia sẻ</b> ở thanh dưới</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#334155" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#007AFF", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>2</div>
                <div>Cuộn xuống, chọn <b>"Thêm vào MH chính"</b></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#334155" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#007AFF", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>3</div>
                <div>Nhấn <b>"Thêm"</b> — xong!</div>
              </div>
            </div>
            <button style={laterBtn} onClick={handleDismiss}>Đã hiểu, để sau</button>
          </>}

          {/* ===== In-app browser ===== */}
          {mode === "webview" && <>
            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              ⚠️ Bạn đang mở trong ứng dụng khác. Cần mở bằng Safari để cài đặt.
            </div>
            <div style={iconRow}>
              <div style={appIcon}>🍽️</div>
              <div>
                <div style={title}>Mở bằng Safari</div>
                <div style={sub}>Nhấn nút bên dưới để mở trình duyệt Safari</div>
              </div>
            </div>
            <button style={{ ...primaryBtn, background: "linear-gradient(135deg, #F59E0B, #D97706)" }} onClick={handleOpenSafari}>🧭 Mở bằng Safari</button>
            <button style={laterBtn} onClick={handleDismiss}>Để sau</button>
          </>}
        </div>
      </div>
    </>
  );
}
