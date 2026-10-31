// 31/10 (chốt bản vẽ "Thả tim người lạ, xin kết bạn, thông báo"): loại thông báo bạn bè theo url do máy chủ ghi (pi_push):
//   ?pi=social&req=<nick>    → lời mời kết bạn (có nút Đồng ý / Từ chối)
//   ?pi=social&heart=<nick>  → thả tim · &friend=<nick> → đã đồng ý kết bạn · tiêu đề "… nhắn cho Pi" → lời nhắn
export function notifKind(n) {
  let q = null;
  try { q = new URL(String(n?.url || "/"), "https://x.local").searchParams; } catch (e) { q = null; }
  const nick = (k) => { const v = q?.get(k); return v && /^[a-z0-9][a-z0-9-]{1,23}$/.test(v) ? v : null; };
  if (nick("req")) return { kind: "req", nick: nick("req") };
  if (nick("heart")) return { kind: "heart", nick: nick("heart") };
  if (nick("friend")) return { kind: "friend", nick: nick("friend") };
  if (q?.get("pi") === "social") return { kind: / nhắn cho Pi$/.test(String(n?.title || "")) ? "note" : "social", nick: null };
  return { kind: "other", nick: null };
}
