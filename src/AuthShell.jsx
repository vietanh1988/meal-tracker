// Khung chung các màn Đăng nhập / Đăng ký / Quên mật khẩu / Đặt mật khẩu mới (bản vẽ DangNhap, DangKy, QuenMK)
import { useState } from "react";

export const FONT = "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif";
export const field = { height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#F1F5F9", fontFamily: "inherit", fontSize: 16, color: "#0F172A", boxSizing: "border-box", width: "100%", outline: "none" };
export const primaryBtn = (disabled) => ({ height: 52, borderRadius: 14, border: "none", background: disabled ? "#CBD5E1" : "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: disabled ? "none" : "0 4px 12px rgba(0,0,0,0.18)", width: "100%", cursor: disabled ? "default" : "pointer" });
export const linkBtn = { border: "none", background: "transparent", padding: "4px 0", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#007AFF", cursor: "pointer" };

export function AuthShell({ title, subtitle, onBack, children, footer, compact }) {
  return (
    <div style={{ fontFamily: FONT, background: "#F8FAFC", minHeight: "100dvh", color: "#0F172A" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        <div style={{ position: "relative", height: compact ? 200 : 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#FFFFFF", borderRadius: "0 0 32px 32px", backgroundImage: "url('/header-bg.webp'), linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", backgroundSize: "cover", backgroundPosition: "center", paddingTop: "env(safe-area-inset-top, 0px)" }}>
          {onBack && (
            <button onClick={onBack} aria-label="Quay lại" style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 8px)", left: 4, width: 44, height: 44, border: "none", background: "transparent", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
          )}
          <img src="/logo.png" alt="Fipilot AI" style={{ width: compact ? 64 : 80, height: compact ? 64 : 80, borderRadius: 20, objectFit: "cover", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }} />
          <span style={{ fontSize: compact ? 22 : 26, fontWeight: 900, letterSpacing: "0.02em" }}>{title}</span>
          {subtitle && <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.9 }}>{subtitle}</span>}
        </div>
        <div style={{ margin: "-40px 16px 0 16px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 8px 24px rgba(0,87,255,0.1)", position: "relative" }}>
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

export function Field({ label, hint, hintTone, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>
      {label}
      {children}
      {hint && <span style={{ fontSize: 12, fontWeight: 600, color: hintTone === "bad" ? "#DC2626" : hintTone === "ok" ? "#00A67E" : "#64748B" }}>{hint}</span>}
    </label>
  );
}

export function PasswordInput({ value, onChange, onEnter, placeholder = "Tối thiểu 6 ký tự", autoComplete = "current-password", testid }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ display: "flex", alignItems: "center", height: 48, padding: "0 6px 0 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#F1F5F9", boxSizing: "border-box" }}>
      <input data-testid={testid} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 16, color: "#0F172A", outline: "none" }} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} style={{ width: 40, height: 40, border: "none", background: "transparent", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{show && <path d="M4 4l16 16" />}</svg>
      </button>
    </span>
  );
}

export function Notice({ tone, children }) {
  const bad = tone === "bad";
  return <div role={bad ? "alert" : "status"} style={{ padding: "10px 12px", borderRadius: 12, background: bad ? "#FEF2F2" : "rgba(0,200,150,0.1)", color: bad ? "#991B1B" : "#065F46", fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{children}</div>;
}
