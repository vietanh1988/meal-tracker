import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Tự cập nhật bản mới (16/10): có SW mới đang chờ thì kích hoạt + tải lại ở lúc an toàn:
//  - 5 s đầu khi mở app (chưa kịp nhập gì), hoặc
//  - khi quay lại app sau ≥ 10 phút chạy nền.
// Đang dùng app thì không tải lại giữa chừng (tránh mất món đang nhập).
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  const bootAt = Date.now();
  let hiddenAt = 0;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloading) { reloading = true; window.location.reload(); } });
  const apply = (reg) => { if (reg && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" }); };
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      const early = () => Date.now() - bootAt < 5000;
      if (early()) apply(reg);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (nw) nw.addEventListener("statechange", () => { if (nw.state === "installed" && early()) apply(reg); });
      });
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
        if (hiddenAt && Date.now() - hiddenAt >= 10 * 60 * 1000) apply(reg);
        reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
}
