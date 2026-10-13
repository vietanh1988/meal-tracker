// Màn 6 · Tôi (đã chốt): thẻ hồ sơ, nhóm Mục tiêu/Lịch tập/Nhắc nhở/Gói cước,
// nhóm Góp ý/Chia sẻ/Giới thiệu, Quản trị (chỉ admin), Đăng xuất.
import { Icon } from "./ui";
import { fmtInt, fmtDec } from "../lib/mobileView";
import { appConfirm, appAlert } from "../lib/dialog";
import { normalizeReminders } from "../lib/reminders";

const GYM_NAMES = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];
const GOAL = { bulk: "Tăng cơ", cut: "Giảm mỡ", maintain: "Giữ cân", recomp: "Recomp" };
const TIER = { free: "Miễn phí", trial: "Dùng thử", premium: "Premium" };

const group = { margin: "12px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "0 14px" };
// Ô icon 32×32 bo 9, nền màu nhạt, nét icon cùng màu (kiểu danh sách cài đặt của app)
const svg = (d) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ICONS = {
  goals: ["#007AFF", "rgba(0,122,255,0.1)", svg(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>)],
  schedule: ["#00A67E", "rgba(0,200,150,0.12)", svg(<><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></>)],
  reminders: ["#EA580C", "rgba(249,115,22,0.12)", svg(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>)],
  plan: ["#7C3AED", "rgba(124,58,237,0.1)", svg(<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z" />)],
  feedback: ["#0891B2", "rgba(8,145,178,0.1)", svg(<path d="M5 5h14v10H9l-4 4z" />)],
  share: ["#2563EB", "rgba(37,99,235,0.1)", svg(<><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></>)],
  account: ["#475569", "rgba(71,85,105,0.1)", svg(<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>)],
  about: ["#64748B", "rgba(100,116,139,0.12)", svg(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>)],
  diary: ["#4F46E5", "rgba(79,70,229,0.1)", svg(<><path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" /><path d="M6 18a2 2 0 0 1 2-2h11M10 8h6M10 11h4" /></>)],
  logout: ["#DC2626", "rgba(220,38,38,0.1)", svg(<><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" /><path d="M14 8l4 4-4 4M18 12H9" /></>)],
  admin: ["#DC2626", "rgba(220,38,38,0.1)", svg(<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />)],
};
export function RowIcon({ name }) {
  const [color, bg, icon] = ICONS[name];
  return <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>;
}

function Row({ icon, label, value, onClick, last, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} className="tap" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", height: 52, boxSizing: "content-box", borderStyle: "solid", borderColor: "#F1F5F9", borderWidth: last ? 0 : "0 0 1px 0", background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
      {icon && <RowIcon name={icon} />}
      <span style={{ flexShrink: 0, fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value || ""}</span>
      {Icon.chev(16)}
    </button>
  );
}

export function MeScreen({ name, profile, macro, weight, isAdmin, appVersion, open, openDiary, signOut }) {
  const tier = profile?.tier || "free";
  const initials = (name || "?").replace(/[^A-Za-zÀ-ỹ0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const gym = (profile?.exerciseType || "gym") === "none" ? "Không tập" : (profile?.gymDays || []).slice().sort((a, b) => a - b).map((i) => GYM_NAMES[i]).join(", ") || "Chưa chọn";
  // Tốc độ cần đạt: (mục tiêu − hiện tại) / số tuần của kế hoạch
  const weeks = (Number(profile?.months) || 0) * 4.33;
  const gPerWeek = weeks > 0 ? Math.round(((Number(weight.goalKg) - Number(weight.curKg)) / weeks) * 1000) : 0;
  const goalVal = gPerWeek ? `≈ ${gPerWeek > 0 ? "+" : "−"}${Math.abs(gPerWeek)} g/tuần` : `${fmtInt(macro?.calTarget)} kcal`;

  const rem = normalizeReminders(profile?.reminderSettings);
  const remVal = [rem.meal.on && rem.meal.slots.length && "Bữa", rem.weigh.on && "Cân", rem.water.on && "Nước"].filter(Boolean).join(" · ") || "Đang tắt";

  const share = async () => {
    const data = { title: "Fipilot AI", text: "Ghi bữa ăn, tính macro và lên thực đơn với Fipilot AI", url: "https://app.fipilotai.com" };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(data.url);
      appAlert("Đã sao chép link app.");
    } catch (e) { /* user huỷ */ }
  };
  const logout = async () => { if (await appConfirm("Đăng xuất khỏi Fipilot AI?")) signOut(); };

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 10px 16px" }}><span style={{ fontSize: 20, fontWeight: 900 }}>Tôi</span></div>

      <button data-testid="me-profile-card" onClick={() => open("goals")} className="tap" style={{ margin: "0 12px", width: "calc(100% - 24px)", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, color: "#0F172A", fontFamily: "inherit", textAlign: "left", boxSizing: "border-box" }}>
        <span style={{ width: 44, height: 44, borderRadius: 22, background: "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", color: "#FFFFFF", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</span>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            {tier !== "free" && <span style={{ fontSize: 11, fontWeight: 800, color: "#6D28D9", background: "rgba(124,58,237,0.1)", padding: "2px 8px", borderRadius: 999, marginLeft: 4, flexShrink: 0 }}>{TIER[tier] || tier}</span>}
          </span>
          <span style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{GOAL[profile?.goalType] || "Mục tiêu"} · {fmtDec(weight.curKg)} → {fmtDec(weight.goalKg)} kg · {fmtInt(macro?.calTarget)} kcal ngày tập</span>
        </span>
        {Icon.chev(16)}
      </button>

      <div style={group}>
        <Row icon="diary" testid="me-diary" label="Nhật ký ăn uống" value="Calo từng ngày" onClick={openDiary} last />
      </div>

      <div style={group}>
        <Row icon="goals" testid="me-goals" label="Mục tiêu & macro" value={goalVal} onClick={() => open("goals")} />
        <Row icon="schedule" testid="me-schedule" label="Lịch tập & bữa" value={gym} onClick={() => open("schedule")} />
        <Row icon="reminders" testid="me-reminders" label="Nhắc nhở" value={remVal} onClick={() => open("reminders")} />
        <Row icon="plan" testid="me-plan" label="Gói cước" value={TIER[tier] || tier} onClick={() => open("plan")} last />
      </div>

      <div style={group}>
        <Row icon="feedback" testid="me-feedback" label="Góp ý & báo lỗi" onClick={() => open(isAdmin ? "feedback_inline" : "feedback")} />
        <Row icon="share" label="Chia sẻ app" onClick={share} />
        <Row icon="account" testid="me-account" label="Tài khoản" value="Email · xoá tài khoản" onClick={() => open("account")} />
        <Row icon="about" testid="me-about" label="Giới thiệu & điều khoản" value={appVersion ? `v${appVersion}` : null} onClick={() => open("about")} last />
      </div>

      {isAdmin && (
        <button data-testid="me-admin" onClick={() => open("admin_home")} className="tap" style={{ margin: "12px 12px 0 12px", width: "calc(100% - 24px)", height: 56, background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "0 14px", display: "flex", alignItems: "center", gap: 12, color: "#0F172A", fontFamily: "inherit", boxSizing: "border-box" }}>
          <RowIcon name="admin" />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: "left" }}>Quản trị</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", background: "#F1F5F9", padding: "3px 8px", borderRadius: 6 }}>Chỉ admin</span>
          {Icon.chev(16)}
        </button>
      )}

      <button data-testid="me-logout" onClick={logout} className="tap" style={{ margin: "12px 12px 0 12px", width: "calc(100% - 24px)", height: 56, background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "0 14px", display: "flex", alignItems: "center", gap: 12, color: "#DC2626", fontFamily: "inherit", boxSizing: "border-box" }}>
        <RowIcon name="logout" />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: "left" }}>Đăng xuất</span>
      </button>
      <div style={{ height: 24 }} />
    </div>
  );
}
