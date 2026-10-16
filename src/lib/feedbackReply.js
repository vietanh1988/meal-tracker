// Trả lời thêm góp ý (16/10): user_feedback chỉ có 1 cột admin_reply → lần trả lời sau NỐI vào cuối,
// có dòng mốc giờ VN để người gửi và admin đọc được cả chuỗi. Hàm thuần, có test.
import { toVNDate, fmtVN, nowVNParts } from "./dateVN.js";

export function stampVN(iso) {
  const d = new Date(iso);
  const { hour, minute } = nowVNParts(d);
  return `${fmtVN(toVNDate(d))} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function appendReply(old, text, iso = new Date().toISOString()) {
  const t = String(text || "").trim();
  const o = String(old || "").trim();
  if (!t) return o;
  if (!o) return t;
  return `${o}\n\n— ${stampVN(iso)} —\n${t}`;
}
