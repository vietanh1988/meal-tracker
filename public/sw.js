// Service Worker cho Web Push Notification — FipilotAI
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
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener("install", () => {
  console.log("[SW] Installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activated");
  event.waitUntil(clients.claim());
});
