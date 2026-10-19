"use client";
// Đếm lượt xem trang + lượt bấm sang app (Quản trị › Thống kê web). Không cookie, không lưu IP:
// nguồn khách lấy từ trang dẫn tới lúc vào web (giữ trong phiên), "khách" = lần mở đầu tiên trong ngày của trình duyệt.
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const dayVN = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
function source() {
  try {
    const old = sessionStorage.getItem("fp_src"); if (old) return old;
    let s = "direct"; const r = document.referrer;
    if (r) { const h = new URL(r).hostname; s = h === location.hostname ? "direct" : /(^|\.)google\./.test(h) ? "google" : /facebook\.com$|(^|\.)fb\.|messenger\.com$/.test(h) ? "facebook" : /zalo/.test(h) ? "zalo" : "other"; }
    const u = new URLSearchParams(location.search).get("utm_source"); if (u) s = /google/i.test(u) ? "google" : /face|fb/i.test(u) ? "facebook" : /zalo/i.test(u) ? "zalo" : "other";
    sessionStorage.setItem("fp_src", s); return s;
  } catch { return "other"; }
}
const send = (body) => { try { const j = JSON.stringify(body); if (!navigator.sendBeacon?.("/api/hit", new Blob([j], { type: "text/plain" }))) fetch("/api/hit", { method: "POST", body: j, keepalive: true }); } catch {} };

export default function Track() {
  const path = usePathname();
  useEffect(() => {
    if (navigator.webdriver) return;
    if (window.__fp404) { window.__fp404 = false; return; } // trang lỗi 404 đã ghi ở nhật ký 404
    let isNew = false; try { const d = dayVN(); if (localStorage.getItem("fp_vday") !== d) { localStorage.setItem("fp_vday", d); isNew = true; } } catch {}
    send({ path, src: source(), kind: "view", new: isNew });
  }, [path]);
  useEffect(() => {
    const h = (e) => { const a = e.target.closest?.("a[href]"); if (a && /\/\/app\.fipilotai\.com/.test(a.href)) send({ path: location.pathname, src: source(), kind: "app" }); };
    document.addEventListener("click", h, true);
    return () => document.removeEventListener("click", h, true);
  }, []);
  return null;
}
