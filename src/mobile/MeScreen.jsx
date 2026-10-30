// Màn 6 · Tôi — bản vẽ 48 (chốt 14/10): nền Blue Dark phủ cả màn, thẻ kính mờ chữ trắng, ô icon đặc màu + icon trắng.
// Nội dung: thẻ hồ sơ, Nhật ký + Hỏi Fipilot AI (chat chuyển từ header Hôm nay sang đây 13/10), nhóm Mục tiêu/Lịch tập/Nhắc nhở/Gói cước,
// nhóm Góp ý/Chia sẻ/Giới thiệu, Quản trị (chỉ admin), Đăng xuất.
import { Icon, DkIcon } from "./ui";
import { DK, dkCard, dkSec } from "../theme";
import { fmtInt, fmtDec } from "../lib/mobileView";
import { appConfirm, appAlert } from "../lib/dialog";
import { normalizeReminders } from "../lib/reminders";
import { useState } from "react";
import { sfxOn, setSfx, sfx } from "../lib/sfx";

const GYM_NAMES = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];
const GOAL = { bulk: "Tăng cơ", cut: "Giảm mỡ", maintain: "Giữ cân", recomp: "Recomp" };
const TIER = { free: "Miễn phí", trial: "Dùng thử", premium: "Premium" };

// Ô icon 32×32 bo 9, nền đặc theo màu mục, icon trắng (kiểu Cài đặt iPhone) — màu thứ 2 (nền nhạt) giữ lại cho chỗ nền sáng
const svg = (d) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ICONS = {
  goals: ["#007AFF", "rgba(0,122,255,0.1)", svg(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>)],
  schedule: ["#00A67E", "rgba(0,200,150,0.12)", svg(<><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></>)],
  reminders: ["#EA580C", "rgba(249,115,22,0.12)", svg(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>)],
  plan: ["#DB2777", "rgba(219,39,119,0.1)", svg(<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z" />)],
  feedback: ["#0891B2", "rgba(8,145,178,0.1)", svg(<path d="M5 5h14v10H9l-4 4z" />)],
  share: ["#2563EB", "rgba(37,99,235,0.1)", svg(<><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></>)],
  account: ["#475569", "rgba(71,85,105,0.1)", svg(<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>)],
  about: ["#64748B", "rgba(100,116,139,0.12)", svg(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>)],
  diary: ["#4F46E5", "rgba(79,70,229,0.1)", svg(<><path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" /><path d="M6 18a2 2 0 0 1 2-2h11M10 8h6M10 11h4" /></>)],
  logout: ["#DC2626", "rgba(220,38,38,0.1)", svg(<><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" /><path d="M14 8l4 4-4 4M18 12H9" /></>)],
  coach: ["#7C3AED", "rgba(124,58,237,0.1)", svg(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />)],
  sound: ["#16A34A", "rgba(22,163,74,0.1)", svg(<><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>)],
  admin: ["#DC2626", "rgba(220,38,38,0.1)", svg(<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />)],
};
export function RowIcon({ name }) {
  const [color, , icon] = ICONS[name];
  return <DkIcon color={color}>{icon}</DkIcon>;
}

const group = { ...dkCard, margin: "0 12px", padding: "0 14px" };
function Row({ icon, label, value, onClick, last, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} className="tap row-hover" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", height: 54, boxSizing: "content-box", borderStyle: "solid", borderColor: DK.line, borderWidth: last ? 0 : "0 0 1px 0", background: "transparent", padding: 0, fontFamily: "inherit", color: DK.t1, textAlign: "left" }}>
      {icon && <RowIcon name={icon} />}
      <span style={{ flexShrink: 0, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: 12, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value || ""}</span>
      {Icon.chev(16, DK.chev)}
    </button>
  );
}
// 31/10: Âm thanh & rung (src/lib/sfx.js) — công tắc kiểu iPhone, đổi là lưu ngay trên máy
function SoundRow({ last }) {
  const [on, setOn] = useState(sfxOn());
  const flip = () => { const v = !on; setSfx(v); setOn(v); if (v) sfx("ting"); };
  return (
    <button type="button" role="switch" aria-checked={on} data-testid="me-sound" onClick={flip} className="tap row-hover" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", height: 54, boxSizing: "content-box", borderStyle: "solid", borderColor: DK.line, borderWidth: last ? 0 : "0 0 1px 0", background: "transparent", padding: 0, fontFamily: "inherit", color: DK.t1, textAlign: "left", cursor: "pointer" }}>
      <RowIcon name="sound" />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>Âm thanh & rung</span>
      <span aria-hidden="true" style={{ width: 51, height: 31, borderRadius: 16, flexShrink: 0, position: "relative", background: on ? "#34C759" : "rgba(255,255,255,0.22)", transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: 14, background: "#FFFFFF", boxShadow: "0 2px 6px rgba(0,0,0,0.25)", transition: "left .2s" }} />
      </span>
    </button>
  );
}
const Sec = ({ children }) => <span style={dkSec}>{children}</span>;

// loss (bản vẽ 134b, 18/10): khách giảm cân — chữ đời thường (bỏ "macro", "lịch tập"); mealInfo: "4 bữa · 7:00–19:30"
export function MeScreen({ name, profile, macro, weight, isAdmin, appVersion, open, openDiary, openCoach, salesEnabled, signOut, bell, loss = false, mealInfo = null }) {
  const tier = profile?.tier || "free";
  const initials = (name || "?").replace(/[^A-Za-zÀ-ỹ0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const gym = (profile?.exerciseType || "gym") === "none" ? "Không tập" : (profile?.gymDays || []).slice().sort((a, b) => a - b).map((i) => GYM_NAMES[i]).join(", ") || "Chưa chọn";
  // Tốc độ cần đạt: (mục tiêu − hiện tại) / số tuần của kế hoạch
  const weeks = (Number(profile?.months) || 0) * 4.33;
  // Giảm mỡ (bản vẽ 126): theo tốc độ đã chọn
  const gPerWeek = macro?.goal === "cut" && macro?.kgWeek ? -Math.round(macro.kgWeek * 1000)
    : weeks > 0 ? Math.round(((Number(weight.goalKg) - Number(weight.curKg)) / weeks) * 1000) : 0;
  const goalVal = gPerWeek ? `≈ ${gPerWeek > 0 ? "+" : "−"}${Math.abs(gPerWeek)} g/tuần` : `${fmtInt(macro?.calTarget)} kcal`;

  const rem = normalizeReminders(profile?.reminderSettings);
  const remVal = [rem.meal.on && rem.meal.slots.length && "Bữa", rem.weigh.on && (rem.weigh.measure ? "Cân & đo" : "Cân"), rem.water.on && "Nước"].filter(Boolean).join(" · ") || "Đang tắt";
  const planLabel = salesEnabled || isAdmin ? "Gói cước" : "Lượt AI";

  const share = async () => {
    const data = { title: "Fipilot AI", text: "Theo dõi bữa ăn, tính macro và lên thực đơn với Fipilot AI", url: "https://app.fipilotai.com" };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(data.url);
      appAlert("Đã sao chép link app.");
    } catch (e) { /* user huỷ */ }
  };
  const logout = async () => { if (await appConfirm("Đăng xuất khỏi Fipilot AI?")) signOut(); };

  return (
    <div data-testid="me-screen" style={{ color: DK.t1 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 16px 18px" }}>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.15 }}>Tôi</span>
          <span style={{ fontSize: 13, color: DK.t2 }}>{loss ? "Kế hoạch, tài khoản và cài đặt" : "Quản lý tài khoản và cài đặt"}</span>
        </span>
        {bell}
      </div>

      <button data-testid="me-profile-card" onClick={() => open("goals")} className="tap" style={{ ...dkCard, borderRadius: 20, margin: "0 12px", width: "calc(100% - 24px)", padding: 14, display: "flex", alignItems: "center", gap: 12, color: DK.t1, fontFamily: "inherit", textAlign: "left", boxSizing: "border-box" }}>
        <span style={{ width: 54, height: 54, borderRadius: 27, background: "linear-gradient(160deg,#2C8DFF,#0040E0)", color: "#FFFFFF", fontSize: 18, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 3px #FFFFFF, 0 6px 14px rgba(0,64,224,0.3)" }}>{initials}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            {tier !== "free" && <span style={{ fontSize: 11, fontWeight: 800, color: "#6D28D9", background: "#FFFFFF", padding: "2px 8px", borderRadius: 999, flexShrink: 0 }}>{TIER[tier] || tier}</span>}
          </span>
          <span style={{ fontSize: 13, color: DK.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{loss ? "Giảm cân" : GOAL[profile?.goalType] || "Mục tiêu"} · {fmtDec(weight.curKg)} → {fmtDec(weight.goalKg)} kg</span>
          <span style={{ fontSize: 13, color: DK.t2 }}>{fmtInt(macro?.calTarget)} kcal/{(profile?.exerciseType || "gym") === "none" ? "ngày" : "ngày tập"}</span>
        </span>
        {Icon.chev(16, DK.chev)}
      </button>

      <Sec>{loss ? "Kế hoạch giảm cân" : "Theo dõi & dinh dưỡng"}</Sec>
      <div style={group}>
        <Row icon="diary" testid="me-diary" label="Nhật ký ăn uống" value="Calo từng ngày" onClick={openDiary} />
        <Row icon="goals" testid="me-goals" label={loss ? "Mục tiêu & tốc độ giảm" : "Mục tiêu & macro"} value={goalVal} onClick={() => open("goals")} />
        <Row icon="schedule" testid="me-schedule" label={loss ? "Giờ ăn" : "Lịch tập & bữa"} value={loss ? mealInfo || "Giờ các bữa" : gym} onClick={() => open("schedule")} />
        <Row icon="reminders" testid="me-reminders" label="Nhắc nhở" value={remVal} onClick={() => open("reminders")} />
        <SoundRow last />
      </div>

      <Sec>AI & hỗ trợ</Sec>
      <div style={group}>
        {openCoach && <Row icon="coach" testid="me-coach" label="Hỏi Fipilot AI" value={loss ? "Hỏi gì về ăn uống, giảm cân" : "Chat về ăn uống, tập"} onClick={openCoach} />}
        <Row icon="feedback" testid="me-feedback" label="Góp ý & báo lỗi" onClick={() => open(isAdmin ? "admin_feedback" : "feedback")} last />
      </div>

      <Sec>Tài khoản & ứng dụng</Sec>
      <div style={group}>
        <Row icon="plan" testid="me-plan" label={planLabel} value={salesEnabled || isAdmin ? TIER[tier] || tier : "Đang miễn phí"} onClick={() => open("plan")} />
        <Row icon="account" testid="me-account" label="Tài khoản" value="Email · mật khẩu" onClick={() => open("account")} />
        <Row icon="share" label="Chia sẻ app" onClick={share} />
        <Row icon="about" testid="me-about" label="Giới thiệu & điều khoản" value={appVersion ? `v${appVersion}` : null} onClick={() => open("about")} last />
      </div>

      {isAdmin && (
        <button data-testid="me-admin" onClick={() => open("admin_home")} className="tap" style={{ ...group, marginTop: 12, width: "calc(100% - 24px)", height: 56, display: "flex", alignItems: "center", gap: 12, color: DK.t1, fontFamily: "inherit", boxSizing: "border-box" }}>
          <RowIcon name="admin" />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: "left" }}>Quản trị</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#FFFFFF", background: "rgba(255,255,255,0.16)", padding: "3px 8px", borderRadius: 6 }}>Chỉ admin</span>
          {Icon.chev(16, DK.chev)}
        </button>
      )}

      <button data-testid="me-logout" onClick={logout} className="tap" style={{ ...group, marginTop: 12, width: "calc(100% - 24px)", height: 56, display: "flex", alignItems: "center", gap: 12, color: DK.red, fontFamily: "inherit", boxSizing: "border-box" }}>
        <RowIcon name="logout" />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: "left" }}>Đăng xuất</span>
      </button>
      <div style={{ height: 24 }} />
    </div>
  );
}
