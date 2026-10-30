import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { captureInvite } from "./lib/device.js";
import { unlockSfx } from "./lib/sfx.js";
// 18/10: báo cho script cứu màn trắng ở index.html biết JS đã chạy được
try { window.__fpBooted = true; } catch (e) { /* */ }
// 30/10 mã mời Pi: link fipilotai.com/pi/<biệt danh> → app.fipilotai.com/?m=CODE → giữ mã tới khi tài khoản mới nhận
captureInvite();
// 31/10: lần chạm đầu mở khoá tiếng (iPhone chỉ cho phát tiếng sau khi chạm) → tiếng được Hạt / lên cấp phát được về sau
try { window.addEventListener("pointerdown", unlockSfx, { once: true, capture: true }); } catch (e) { /* */ }

// Trang xem bản vẽ Fipilot Pet — CHỈ khi chạy dev (bản build prod bỏ hẳn nhánh này)
const PetPreview = import.meta.env.DEV && typeof location !== "undefined" && location.pathname.startsWith("/__pet")
  ? React.lazy(() => import("./pet/PetPreview.jsx")) : null;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {PetPreview ? <React.Suspense fallback={null}><PetPreview /></React.Suspense> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);

// Tự cập nhật bản mới — 19/10 làm lại cho hết "giật":
//  - SW mới tự cài + kích hoạt ngầm (sw.js skipWaiting + clientsClaim) → lần mở app SAU dùng luôn bản mới, không cần tải lại.
//  - Lần cài SW đầu tiên trên máy (trước đó chưa có SW) → KHÔNG tải lại (trước đây bị tải lại thừa 1 lần).
//  - Bản mới kích hoạt khi app vẫn đang khởi động (≤ 2,5 s) → tải lại ngay (người dùng chưa kịp thấy gì).
//  - Kích hoạt khi đang dùng → không tải lại giữa chừng; chỉ tải lại khi quay lại app sau ≥ 2 phút chạy nền.
//  - App là 1 file JS duy nhất (không tách chunk) nên chạy tiếp bản cũ trong phiên này vẫn an toàn.
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  const bootAt = Date.now();
  const hadController = !!navigator.serviceWorker.controller;
  let hiddenAt = 0, pending = false, reloading = false;
  const reload = () => { if (!reloading) { reloading = true; window.location.reload(); } };
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) return; // lần cài đầu: trang đang chạy chính là bản mới nhất
    if (Date.now() - bootAt < 2500) reload(); else pending = true;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
    if (pending && hiddenAt && Date.now() - hiddenAt >= 2 * 60 * 1000) return reload();
    navigator.serviceWorker.getRegistration().then((reg) => reg && reg.update().catch(() => {})).catch(() => {});
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" }); // SW cũ còn chờ (máy cài bản trước 18/10)
      reg.update().catch(() => {});
    }).catch(() => {});
  });
}
