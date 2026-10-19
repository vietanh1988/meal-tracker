"use client";
import { useEffect } from "react";
export default function Log404() {
  if (typeof window !== "undefined") window.__fp404 = true;
  useEffect(() => {
    try { navigator.sendBeacon?.("/api/log404", JSON.stringify({ path: location.pathname, ref: document.referrer || null })); } catch {}
  }, []);
  return null;
}
