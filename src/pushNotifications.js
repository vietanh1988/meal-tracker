import { supabase } from "./lib/supabase";

const VAPID_PUBLIC_KEY = "BGx5Wnwmdb2CMOhqFVYzoF6iw_Ijqd-QHKYQVZGEDngJMye9vk-9G--eevlSJjxm4QzRArZuS-y12JeS3to7uPo";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function getPushPermission() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission; // "granted" | "denied" | "default"
}

export async function enablePushNotifications() {
  if (!isPushSupported()) throw new Error("Trình duyệt không hỗ trợ thông báo đẩy");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bạn chưa cho phép nhận thông báo");

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth_key: json.keys.auth,
  });
  if (error) throw error;

  return true;
}

export async function disablePushNotifications() {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  try { await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint }); } catch (e) { console.error("delete_push_subscription error:", e); }
}
