import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

// Không dùng skipWaiting/clientsClaim — để popup update hiện trước
// SW mới sẽ activate khi user bấm "Nâng cấp" (xoá cache + reload)
// 16/10: app tự lên bản mới khi khách mở lại app (main.jsx gửi SKIP_WAITING lúc mở app / app chạy nền) —
// trước đây SW mới chờ tới khi đóng hết tab, iPhone ghim màn hình gần như không bao giờ → khách kẹt bản cũ
self.addEventListener("message", (e) => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// ============================================================
// PUSH NOTIFICATION — FipilotAI
// ============================================================
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received, has data:", !!event.data);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    console.log("[SW] Parsed push data:", data);
  } catch (e) {
    console.error("[SW] Failed to parse push data as JSON:", e);
    data = { title: "FipilotAI", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "FipilotAI";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || "fipilot-default",
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log("[SW] showNotification succeeded"))
      .catch((e) => console.error("[SW] showNotification FAILED:", e))
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // App đang mở: báo app tự chuyển màn theo url (?tab=progress&seg=measure…) rồi đưa lên trước
        if (client.url.includes(self.location.origin) && "focus" in client) { try { client.postMessage({ type: "open-url", url }); } catch (e) { /* */ } return client.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
