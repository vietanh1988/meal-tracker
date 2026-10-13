// Tôi › Tài khoản (bản vẽ 34–35, chốt 14/10) — thay AccountTab cũ trên mobile.
//  - Thẻ hồ sơ: chữ tắt, tên, email, hạng
//  - Thông tin đăng nhập: tên hiển thị, email, Đổi mật khẩu (gửi link qua email, như Quên mật khẩu)
//  - Ứng dụng: thông báo đẩy (bật/tắt), Gói cước / Lượt AI, Cập nhật ứng dụng (xoá bộ nhớ tạm + tải lại)
//  - Đăng xuất; Xoá tài khoản vĩnh viễn (sheet: mật khẩu + gõ "XOA" → edge function delete-account)
import { useEffect, useState } from "react";
import { supabase, SUPABASE_URL } from "../lib/supabase";
import { appAlert, appConfirm } from "../lib/dialog";
import { isPushSupported, getPushStatus, enablePushNotifications, disablePushNotifications } from "../pushNotifications";
import { Icon, useLockScroll, GRAD_BLUE } from "./ui";
import { UpdateFlow } from "./UpdatePopup";

const TIER = { free: "Miễn phí", trial: "Dùng thử", premium: "Premium" };
const sec = { display: "block", padding: "18px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" };
const group = { margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "0 14px" };
const svg = (d) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const IC = {
  user: ["#007AFF", "rgba(0,122,255,0.1)", svg(<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>)],
  mail: ["#0891B2", "rgba(8,145,178,0.1)", svg(<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></>)],
  lock: ["#7C3AED", "rgba(124,58,237,0.1)", svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>)],
  bell: ["#EA580C", "rgba(249,115,22,0.12)", svg(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>)],
  crown: ["#7C3AED", "rgba(124,58,237,0.1)", svg(<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z" />)],
  refresh: ["#00A67E", "rgba(0,200,150,0.12)", svg(<><path d="M4 12a8 8 0 0 1 14-5.3L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-14 5.3L4 15" /><path d="M4 20v-5h5" /></>)],
  out: ["#DC2626", "rgba(220,38,38,0.1)", svg(<><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" /><path d="M14 8l4 4-4 4M18 12H9" /></>)],
  trash: ["#DC2626", "#FFFFFF", svg(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />)],
};
const icon = (k) => { const [c, bg, s] = IC[k]; return <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, background: bg, color: c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s}</span>; };

function Row({ ic, label, sub, value, onClick, last, right, testid, color = "#0F172A", disabled }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag data-testid={testid} onClick={onClick} disabled={disabled} className={onClick ? "tap" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 56, padding: 0, border: "none", borderBottom: last ? "none" : "1px solid #F1F5F9", background: "transparent", fontFamily: "inherit", color, textAlign: "left" }}>
      {icon(ic)}
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color }}>{label}</span>
        {sub && <span style={{ fontSize: 12, color: "#64748B" }}>{sub}</span>}
      </span>
      {value && <span style={{ fontSize: 13, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{value}</span>}
      {right !== undefined ? right : onClick ? Icon.chev(16) : null}
    </Tag>
  );
}

function Toggle({ on, busy, onChange, testid }) {
  return (
    <button data-testid={testid} role="switch" aria-checked={on} disabled={busy} onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{ width: 48, height: 28, borderRadius: 14, border: "none", padding: 0, background: on ? "#00C896" : "#CBD5E1", position: "relative", flexShrink: 0, transition: "background .2s", opacity: busy ? 0.6 : 1 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: 11, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left .2s" }} />
    </button>
  );
}

function DeleteSheet({ email, signOut, onClose }) {
  useLockScroll(true);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ok = pw.trim() && confirm.trim().toUpperCase() === "XOA";
  const run = async () => {
    setErr("");
    if (!pw.trim()) { setErr("Nhập mật khẩu để xác nhận."); return; }
    if (confirm.trim().toUpperCase() !== "XOA") { setErr('Gõ đúng chữ "XOA" để xác nhận.'); return; }
    setBusy(true);
    try {
      // Xác thực lại mật khẩu trước khi xoá — đúng người, không phải ai đó mượn máy đang đăng nhập
      const { error: reAuth } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (reAuth) { setErr("Sai mật khẩu, thử lại nhé."); setBusy(false); return; }
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) { setErr("Không lấy được phiên đăng nhập, tải lại trang rồi thử lại."); setBusy(false); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) { setErr(out.error || "Xoá chưa được, thử lại sau."); setBusy(false); return; }
      await appAlert("Tài khoản đã được xoá vĩnh viễn. Cảm ơn bạn đã dùng Fipilot AI!");
      try { await signOut?.(); } catch (e) { /* */ }
      window.location.reload();
    } catch (e) { console.error(e); setErr("Có lỗi xảy ra, thử lại nhé."); setBusy(false); }
  };
  const inp = { height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#F1F5F9", fontFamily: "inherit", fontSize: 16, color: "#0F172A", boxSizing: "border-box", width: "100%" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div data-testid="delete-sheet" role="dialog" aria-modal="true" aria-label="Xoá tài khoản" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, background: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 20px) 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={{ width: 36, height: 4, borderRadius: 2, background: "#CBD5E1", alignSelf: "center" }} />
        <span style={{ width: 56, height: 56, borderRadius: 18, background: "#FEF2F2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
          <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
        </span>
        <span style={{ fontSize: 19, fontWeight: 900, textAlign: "center" }}>Xoá tài khoản vĩnh viễn?</span>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "#F8FAFC", fontSize: 13, color: "#334155", lineHeight: 1.6 }}>Sẽ xoá: hồ sơ & mục tiêu · nhật ký ăn uống · cân nặng · thực đơn đã lưu · lịch sử chat AI. Không khôi phục được.</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>MẬT KHẨU HIỆN TẠI</span>
          <input data-testid="delete-pass" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} style={inp} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>GÕ CHỮ "XOA" ĐỂ XÁC NHẬN</span>
          <input data-testid="delete-confirm-text" type="text" autoCapitalize="characters" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ ...inp, fontWeight: 800, letterSpacing: "0.1em" }} />
        </label>
        {err && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#DC2626" }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Huỷ</button>
          <button data-testid="delete-go" disabled={!ok || busy} onClick={run} style={{ flex: 1.4, height: 50, borderRadius: 14, border: "none", background: ok ? "#DC2626" : "#FCA5A5", color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>{busy ? "Đang xoá…" : "Xoá vĩnh viễn"}</button>
        </div>
      </div>
    </div>
  );
}

export function AccountScreen({ user, profile, isAdmin, appVersion, salesEnabled, pushFeature, signOut, openPlan, showToast }) {
  const name = user?.user_metadata?.username || user?.email?.split("@")[0] || "bạn";
  const email = user?.email || "";
  const initials = (name || "?").replace(/[^A-Za-zÀ-ỹ0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const tier = profile?.tier || "free";
  const [push, setPush] = useState("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [upd, setUpd] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) { setPush("unsupported"); return; }
    getPushStatus().then(setPush).catch(() => setPush("unsupported"));
  }, []);

  const togglePush = async (on) => {
    setPushBusy(true);
    try {
      if (on) await enablePushNotifications(); else await disablePushNotifications();
    } catch (e) { appAlert(e?.message || "Không bật được thông báo."); }
    setPush(await getPushStatus().catch(() => "unsupported"));
    setPushBusy(false);
  };
  const changePassword = async () => {
    if (!email || resetBusy) return;
    if (!(await appConfirm(`Gửi link đổi mật khẩu tới ${email}?`))) return;
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setResetBusy(false);
    if (error) appAlert("Gửi chưa được, thử lại sau ít phút.");
    else showToast?.({ text: "Đã gửi link đổi mật khẩu — mở email để đặt mật khẩu mới." }, 5000);
  };
  const logout = async () => { if (await appConfirm("Đăng xuất khỏi Fipilot AI?")) signOut(); };

  const pushSub = push === "granted" ? "Đang bật · nhắc bữa, cân, đơn hàng" : push === "denied" ? "Đã chặn — bật lại trong cài đặt trình duyệt" : push === "unsupported" ? "Máy này chưa hỗ trợ (iPhone: thêm app vào Màn hình chính)" : "Nhắc bữa, cân, đơn hàng";
  const tierLabel = isAdmin ? "Admin" : `Thành viên · ${salesEnabled ? TIER[tier] || tier : "Miễn phí"}`;

  return (
    <div style={{ paddingBottom: 32 }}>
      <div data-testid="account-card" style={{ margin: "12px 12px 0 12px", padding: 16, borderRadius: 20, background: GRAD_BLUE, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 20px rgba(0,87,255,0.22)" }}>
        <span style={{ width: 56, height: 56, borderRadius: 28, background: "rgba(255,255,255,0.22)", border: "2px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, flexShrink: 0 }}>{initials}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
          <span style={{ fontSize: 13, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</span>
          <span style={{ alignSelf: "flex-start", marginTop: 4, fontSize: 11, fontWeight: 800, background: "rgba(255,255,255,0.2)", padding: "3px 8px", borderRadius: 999 }}>{tierLabel}</span>
        </span>
      </div>

      <span style={sec}>THÔNG TIN ĐĂNG NHẬP</span>
      <div style={group}>
        <Row ic="user" label="Tên hiển thị" value={name} />
        <Row ic="mail" label="Email" value={email} />
        <Row ic="lock" label="Đổi mật khẩu" value={resetBusy ? "Đang gửi…" : "Gửi link qua email"} onClick={changePassword} testid="account-password" last />
      </div>

      <span style={sec}>ỨNG DỤNG</span>
      <div style={group}>
        {pushFeature !== false && <Row ic="bell" label="Thông báo đẩy" sub={pushSub} right={push === "default" || push === "granted" ? <Toggle testid="account-push" on={push === "granted"} busy={pushBusy} onChange={togglePush} /> : null} />}
        <Row ic="crown" label={salesEnabled || isAdmin ? "Gói cước & lượt AI" : "Lượt AI"} value={salesEnabled || isAdmin ? TIER[tier] || tier : "Đang miễn phí"} onClick={openPlan} testid="account-plan" />
        <Row ic="refresh" label="Cập nhật ứng dụng" sub="Xoá bộ nhớ tạm, tải bản mới nhất" value={appVersion ? `v${appVersion}` : null} onClick={() => setUpd(true)} testid="account-update" last />
      </div>

      <div style={{ ...group, marginTop: 12 }}>
        <Row ic="out" label="Đăng xuất" color="#DC2626" onClick={logout} right={null} testid="account-logout" last />
      </div>

      <span style={sec}>VÙNG NGUY HIỂM</span>
      <button data-testid="account-delete" onClick={() => setDel(true)} className="tap" style={{ margin: "0 12px", width: "calc(100% - 24px)", boxSizing: "border-box", padding: 14, borderRadius: 16, border: "1.5px solid #FECACA", background: "#FEF2F2", display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", textAlign: "left" }}>
        {icon("trash")}
        <span style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#DC2626" }}>Xoá tài khoản vĩnh viễn</span>
          <span style={{ fontSize: 12, color: "#991B1B" }}>Xoá hết nhật ký, cân nặng, thực đơn. Không khôi phục được.</span>
        </span>
        {Icon.chev(16)}
      </button>
      {upd && <UpdateFlow manual toVersion={appVersion} onLater={() => setUpd(false)} />}
      {del && <DeleteSheet email={email} signOut={signOut} onClose={() => setDel(false)} />}
    </div>
  );
}
