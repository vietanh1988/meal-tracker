"use client";
// Form Gửi lời nhắn (139q/r)
import { useRef, useState } from "react";

const lab = { display: "flex", flexDirection: "column", gap: 8, fontSize: 14, fontWeight: 700, color: "#475569" };
const inp = { height: 52, borderRadius: 12, border: "1px solid #DCE4F0", background: "#fff", padding: "0 16px", fontSize: 15, fontWeight: 500, color: "#0F172A", fontFamily: "inherit", outline: "none", width: "100%" };
const MSG = { contact: "Nhập email hoặc số điện thoại để chúng tôi trả lời.", content: "Nội dung cần từ 5 đến 2.000 chữ.", fast: "Bạn gửi hơi nhanh, đợi vài giây rồi bấm lại nhé.", busy: "Đang có nhiều lời nhắn, thử lại sau ít phút nhé." };

export default function ContactForm({ fallback }) {
  const t0 = useRef(Date.now());
  const [v, setV] = useState({ name: "", contact: "", content: "", website: "" });
  const [st, setSt] = useState(null); // null | sending | ok | lỗi
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (st === "sending") return;
    if (v.contact.trim().length < 5) return setSt("contact");
    if (v.content.trim().length < 5) return setSt("content");
    setSt("sending");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, t: Date.now() - t0.current }) });
      const j = await r.json().catch(() => ({}));
      setSt(j.ok ? "ok" : j.err || "fail");
    } catch { setSt("fail"); }
  };
  if (st === "ok") return (
    <div className="card cf" data-testid="contact-done" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
      <b className="cf-t" style={{ fontSize: 22 }}>Đã nhận lời nhắn ✓</b>
      <span style={{ fontSize: 15.5, color: "#475569", lineHeight: 1.6 }}>Cảm ơn bạn. Fipilot AI sẽ trả lời qua email hoặc số điện thoại bạn để lại, thường trong ngày làm việc.</span>
    </div>
  );
  const err = st && st !== "sending" ? MSG[st] || `Chưa gửi được. Bạn nhắn ${fallback} giúp nhé.` : "";
  return (
    <form className="card cf" onSubmit={submit} noValidate style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
      <b className="cf-t" style={{ fontSize: 22 }}>Gửi lời nhắn</b>
      <label style={lab}>Tên của bạn<input name="name" value={v.name} onChange={set("name")} placeholder="VD: Lan" maxLength={80} autoComplete="name" style={inp} data-testid="contact-name" /></label>
      <label style={lab}>Email hoặc số điện thoại<input name="contact" value={v.contact} onChange={set("contact")} placeholder="Để chúng tôi trả lời" maxLength={120} autoComplete="email" style={inp} data-testid="contact-contact" /></label>
      <label style={lab}>Nội dung<textarea name="content" value={v.content} onChange={set("content")} placeholder="Bạn cần hỗ trợ gì?" maxLength={2000} style={{ ...inp, height: 140, padding: "14px 16px", resize: "vertical", lineHeight: 1.5 }} data-testid="contact-content" /></label>
      <input name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
      {err && <span role="alert" style={{ fontSize: 14, color: "#B45309" }}>{err}</span>}
      <button type="submit" className="btn b1" disabled={st === "sending"} data-testid="contact-send" style={{ height: 52, fontSize: 16, borderRadius: 12, border: 0, fontFamily: "inherit", cursor: "pointer" }}>{st === "sending" ? "Đang gửi…" : "Gửi"}</button>
      <span style={{ fontSize: 13, color: "#94A3B8" }}>Lời nhắn về thẳng hộp thư của Fipilot AI. Có chống spam tự động.</span>
      <style>{`.cf input::placeholder,.cf textarea::placeholder{color:#94A3B8}.cf input:focus,.cf textarea:focus{border-color:#0062F0!important;box-shadow:0 0 0 3px rgba(0,98,240,.12)}@media(max-width:720px){.cf{padding:20px!important}.cf-t{font-size:20px!important}}`}</style>
    </form>
  );
}
