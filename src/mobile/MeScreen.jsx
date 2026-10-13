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
function Row({ label, value, onClick, last }) {
  return (
    <button onClick={onClick} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: 48, boxSizing: "content-box", borderStyle: "solid", borderColor: "#F1F5F9", borderWidth: last ? 0 : "0 0 1px 0", background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{label}</span>
      {value && <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{value}</span>}
      {Icon.chev(16)}
    </button>
  );
}

export function MeScreen({ name, profile, macro, weight, isAdmin, appVersion, open, signOut }) {
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
        <Row label="Mục tiêu & macro" value={goalVal} onClick={() => open("goals")} />
        <Row label="Lịch tập & bữa" value={gym} onClick={() => open("schedule")} />
        <Row label="Nhắc nhở" value={remVal} onClick={() => open("reminders")} />
        <Row label="Gói cước" value={TIER[tier] || tier} onClick={() => open("account")} last />
      </div>

      <div style={group}>
        <Row label="Góp ý & báo lỗi" onClick={() => open("feedback_inline")} />
        <Row label="Chia sẻ app" onClick={share} />
        <Row label="Giới thiệu · Điều khoản" value={appVersion ? `v${appVersion}` : null} onClick={() => open("about")} last />
      </div>

      {isAdmin && (
        <button onClick={() => open("admin_home")} className="tap" style={{ margin: "12px 12px 0 12px", width: "calc(100% - 24px)", height: 48, background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "0 14px", display: "flex", alignItems: "center", gap: 10, color: "#0F172A", fontFamily: "inherit", boxSizing: "border-box" }}>
          <img src="/icons/nav_settings.png" alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, textAlign: "left" }}>Quản trị</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", background: "#F1F5F9", padding: "3px 8px", borderRadius: 6 }}>Chỉ admin</span>
          {Icon.chev(16)}
        </button>
      )}

      <button onClick={logout} style={{ display: "block", margin: "10px auto 0 auto", height: 44, padding: "0 20px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#DC2626" }}>Đăng xuất</button>
      <div style={{ height: 24 }} />
    </div>
  );
}
