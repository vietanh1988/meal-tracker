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

// tab mở khi chạm thông báo: lời mời / đã kết bạn / lời nhắn → Bạn bè; tim → Xếp hạng
export function socialTabOf(url) {
  const k = notifKind({ url }).kind;
  if (k === "req" || k === "friend") return "friends";
  if (k === "heart") return "rank";
  return "rank";
}

// dòng lời mời sau khi trả lời (giống máy chủ pi_req_done): hết req= → hết nút; ok = đã kết bạn
export function answeredFields(n, nick, ok) {
  const url = String(n?.url || "").replace(`&req=${nick}`, ok ? `&friend=${nick}` : "");
  const who = String(n?.title || "").replace(/ muốn kết bạn$/, "");
  return { url, is_read: true, title: ok ? `${who} đã là bạn của bạn` : `${who} đã xin kết bạn`, body: ok ? "Bạn đã đồng ý kết bạn" : "Bạn đã từ chối lời mời" };
}
