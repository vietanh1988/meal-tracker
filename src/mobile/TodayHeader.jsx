// Header màn Hôm nay (bản vẽ 41 "Header – Blue / Blue Dark", chốt 14/10):
// nền xanh nhiều lớp + quầng sáng + dải lụa, tự đổi chậm Blue ↔ Blue Dark (mờ dần, 9 s mỗi màu);
// điện thoại bật "Giảm chuyển động" thì đứng yên ở Blue. Ô kính mờ, vòng kcal dày có ánh xanh ngọc,
// 3 dòng Mục tiêu / Đã ăn / Hôm nay xếp dọc cao đúng bằng vòng (bản vẽ 78, 16/10: KHÔNG đóng khung), 4 thẻ macro.
// 16/10: dải lịch giảm nổi khối (kính nhạt, không bóng); thanh macro: bình thường trắng, vượt >110% đỏ,
// thiếu <90% vàng (chỉ khi ngày đã xong: ngày cũ hoặc đã ăn hết các bữa).
import { weekdayStrip, weekDates, fmtInt, macroState } from "../lib/mobileView";
import { AppIcon, IC_COLOR } from "./icons";
import { fmtVN } from "../lib/dateVN";

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

// Đồng bộ nhịp đổi màu Blue ↔ Blue Dark giữa header và dải che vùng thanh giờ iPhone (cùng mốc thời gian)
export const hdrDelay = () => `-${Date.now() % 18000}ms`;
export const HDR_TOP = { blue: "#2C8DFF", dark: "#0F4585" };

export const HEADER_CSS = `
@keyframes fpHdrSwap{0%,40%{opacity:0}50%,90%{opacity:1}100%{opacity:0}}
.fp-hdr-dark{opacity:0;animation:fpHdrSwap 18s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.fp-hdr-dark{animation:none;opacity:0}}
.fp-glass{background:linear-gradient(180deg,rgba(255,255,255,0.19) 0%,rgba(255,255,255,0.07) 100%);border:1px solid rgba(255,255,255,0.24);box-shadow:0 8px 18px rgba(0,20,90,0.22),inset 0 1px 0 rgba(255,255,255,0.26);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
`;

const BG_BLUE = "linear-gradient(165deg,#2C8DFF 0%,#0A6CFD 18%,#0055F0 45%,#0040E0 75%,#0034D6 100%)";
const BG_DARK = "linear-gradient(165deg,#0F4585 0%,#03386F 20%,#022B57 50%,#012244 78%,#011B37 100%)";

const svg = (d, size = 16, sw = 2.3) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const ICON = {
  goal: svg(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>),
  eaten: svg(<><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M12 7V3M8 7l-1-3M16 7l1-3" /></>),
  train: svg(<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />),
  rest: svg(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />),
};
const MACROS = [
  // Bộ icon 14/10: màu macro thống nhất toàn app (Đạm xanh dương, Tinh bột xanh ngọc, Béo vàng cam, Xơ xanh lá)
  { k: "p", ic: "protein", label: "Đạm", c: IC_COLOR.protein, bar: "#9CC2FF" },
  { k: "c", ic: "carb", label: "Tinh bột", c: IC_COLOR.carb, bar: "#8EF0E2" },
  { k: "f", ic: "fat", label: "Béo", c: IC_COLOR.fat, bar: "#FFE08A" },
  { k: "fiber", ic: "fiber", label: "Xơ", c: IC_COLOR.fiber, bar: "#B5F5D0" },
];

// Màu thanh macro ở header: trắng = bình thường, đỏ = vượt >110% mục tiêu, vàng = thiếu <90% khi ngày đã xong
export const MACRO_BAR = { ok: "rgba(255,255,255,0.92)", over: "#FF6B6B", under: "#FACC15" };

function Waves() {
  return (
    <svg aria-hidden="true" width="100%" height="380" viewBox="0 0 390 380" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: 0, pointerEvents: "none" }}>
      <defs>
        <linearGradient id="fpw1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9FD8FF" stopOpacity="0" /><stop offset="0.5" stopColor="#9FD8FF" stopOpacity="0.8" /><stop offset="1" stopColor="#9FD8FF" stopOpacity="0" /></linearGradient>
        <linearGradient id="fpw2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#3FA9FF" stopOpacity="0" /><stop offset="0.6" stopColor="#3FA9FF" stopOpacity="0.45" /><stop offset="1" stopColor="#3FA9FF" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M-20 300 C 60 240, 120 330, 210 290 S 330 220, 420 260 L 420 380 L -20 380 Z" fill="url(#fpw2)" />
      <path d="M-20 318 C 70 262, 130 352, 220 310 S 340 240, 420 282" fill="none" stroke="url(#fpw1)" strokeWidth="1.6" />
      <path d="M-20 330 C 80 276, 140 362, 230 322 S 350 254, 420 296" fill="none" stroke="url(#fpw1)" strokeWidth="1" />
      <path d="M-20 342 C 90 290, 150 372, 240 334 S 360 268, 420 310" fill="none" stroke="url(#fpw1)" strokeWidth="0.8" />
      <path d="M240 120 C 300 90, 340 150, 420 110" fill="none" stroke="url(#fpw1)" strokeWidth="1" />
      <path d="M230 134 C 300 104, 345 166, 420 126" fill="none" stroke="url(#fpw1)" strokeWidth="0.8" />
    </svg>
  );
}

function Ring({ remain, eaten, target }) {
  const r = 54, C = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const over = remain < 0;
  return (
    <div style={{ position: "relative", width: 136, height: 136, flexShrink: 0 }}>
      <svg aria-hidden="true" width="136" height="136" viewBox="0 0 136 136">
        <defs>
          <linearGradient id="fptr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgba(120,200,255,0.55)" /><stop offset="1" stopColor="rgba(60,140,255,0.35)" /></linearGradient>
          <linearGradient id="fppr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={over ? "#FACC15" : "#3FD0FF"} /><stop offset="1" stopColor={over ? "#FDE68A" : "#BFF4FF"} /></linearGradient>
        </defs>
        <circle cx="68" cy="68" r="46" fill="rgba(0,25,110,0.35)" />
        <circle cx="68" cy="68" r={r} fill="none" stroke="url(#fptr)" strokeWidth="15" />
        {pct > 0 && <circle cx="68" cy="68" r={r} fill="none" stroke="url(#fppr)" strokeWidth="15" strokeLinecap="round" strokeDasharray={`${(C * pct).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 68 68)" style={{ filter: "drop-shadow(0 0 8px rgba(80,210,255,0.85))", transition: "stroke-dasharray .4s" }} />}
        <circle cx="68" cy="68" r={r + 7.5} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span data-testid="kcal-remain" data-value={remain} style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: -0.8, textShadow: "0 2px 10px rgba(0,20,80,0.35)" }}>{fmtInt(Math.abs(remain))}</span>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, marginTop: 5 }}>{over ? "kcal vượt" : "kcal còn lại"}</span>
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, children }) {
  return (
    <div data-testid="hdr-stat" style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 2px 0 4px", minHeight: 0 }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.92)", color: "#0A5BFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}>{icon}</span>
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 3 }}>
        <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.82, whiteSpace: "nowrap" }}>{label}</span>
          <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap" }}>{value}</span>
        </span>
        {children}
      </span>
    </div>
  );
}

// planCard (bản vẽ 128): khách không tập → ô thứ 3 bỏ 'Ngày tập / Ngày nghỉ', thay bằng kế hoạch (VD Giảm 0,4 kg/tuần · còn 7 kg)
// status (bản vẽ 131d, flow giảm cân): thay 4 ô macro bằng 1 dòng trả lời "Hôm nay mình ổn không?"
export function TodayHeader({ date, today, onDate, weekDots, name, bell, shortcut, eaten, targets, dayType, planLine, planCard, goalSub, dayDone, status }) {
  const [y, m] = date.split("-");
  const remain = targets.cal - eaten.cal;
  const pct = targets.cal > 0 ? Math.min(100, Math.round((eaten.cal / targets.cal) * 100)) : 0;
  const isToday = date === today;
  return (
    <div data-testid="today-header" style={{ position: "relative", overflow: "hidden", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 12px 16px 12px", borderRadius: "0 0 18px 18px", display: "flex", flexDirection: "column", gap: 14, color: "#FFFFFF", background: BG_BLUE, boxShadow: "0 12px 30px rgba(0,52,214,0.28)" }}>
      <style>{HEADER_CSS}</style>
      <span aria-hidden="true" className="fp-hdr-dark" style={{ position: "absolute", inset: 0, background: BG_DARK, animationDelay: hdrDelay() }} />
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%)" }} />
      <span aria-hidden="true" style={{ position: "absolute", width: 300, height: 300, right: -120, top: -150, borderRadius: 150, background: "radial-gradient(circle, rgba(90,190,255,0.5), rgba(90,190,255,0) 68%)" }} />
      <span aria-hidden="true" style={{ position: "absolute", width: 260, height: 260, left: -110, top: 120, borderRadius: 130, background: "radial-gradient(circle, rgba(0,30,170,0.4), rgba(0,30,170,0) 70%)" }} />
      <Waves />

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Chào {name}</span>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>{MONTHS[Number(m) - 1]}, {y}</span>
        </span>
        {shortcut}
        {bell}
      </div>

      <div role="tablist" aria-label="Chọn ngày" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
        {weekDates(date).map((d) => {
          const sel = d === date, future = d > today;
          const has = (weekDots || {})[d];
          return (
            <button key={d} role="tab" aria-selected={sel} disabled={future} onClick={() => onDate(d)} aria-label={`${weekdayStrip(d)} ${fmtVN(d)}`} data-testid={sel ? "day-sel" : undefined}
              style={{ height: 56, borderRadius: 14, padding: 0, fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                ...(sel ? { background: "#FFFFFF", color: "#0052F0", border: "none", boxShadow: "0 3px 8px rgba(0,15,70,0.18)" } : { color: "#FFFFFF", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", boxShadow: "none", opacity: future ? 0.6 : 1 }) }}>
              <span style={{ fontSize: 11, fontWeight: sel ? 700 : 600, opacity: sel ? 1 : 0.85 }}>{weekdayStrip(d)}</span>
              <span style={{ fontSize: 17, fontWeight: sel ? 900 : 800 }}>{Number(d.slice(8))}</span>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: sel ? (has ? "#2F8CFF" : "#CBD5E1") : has ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }} />
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
        <Ring remain={remain} eaten={eaten.cal} target={targets.cal} />
        <div style={{ flex: 1, height: 136, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <StatCard icon={ICON.goal} label="Mục tiêu" value={`${fmtInt(targets.cal)} kcal`}>
            {goalSub && <span data-testid="goal-sub" style={{ fontSize: 10, opacity: 0.78, whiteSpace: "nowrap" }}>{goalSub}</span>}
          </StatCard>
          <StatCard icon={ICON.eaten} label="Đã ăn" value={<span data-testid="kcal-eaten" data-value={eaten.cal}>{fmtInt(eaten.cal)} kcal</span>}>
            <span style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.18)", overflow: "hidden", display: "block" }}>
              <span style={{ display: "block", width: `${Math.max(pct ? 3 : 0, pct)}%`, height: 5, borderRadius: 3, background: remain < 0 ? "#FACC15" : "linear-gradient(90deg,#3FD0FF,#BFF4FF)", boxShadow: "0 0 6px rgba(80,210,255,0.85)", transition: "width .4s" }} />
            </span>
          </StatCard>
          {planCard ? (
            <StatCard icon={ICON.goal} label="Kế hoạch" value={<span data-testid="plan-card">{planCard.value}</span>}>
              {planCard.sub && <span style={{ fontSize: 10, opacity: 0.78, whiteSpace: "nowrap" }}>{planCard.sub}</span>}
            </StatCard>
          ) : (
            <StatCard icon={dayType === "rest" ? ICON.rest : ICON.train} label={isToday ? "Hôm nay" : "Hôm đó"} value={dayType === "rest" ? "Ngày nghỉ" : "Ngày tập"}>
              {planLine && <span style={{ fontSize: 10, opacity: 0.78, whiteSpace: "nowrap" }}>{planLine}</span>}
            </StatCard>
          )}
        </div>
      </div>

      {status ? (
        <div data-testid="loss-status" data-tone={status.tone} className="fp-glass" style={{ position: "relative", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.92)", color: status.tone === "ok" ? "#047857" : "#B45309", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{svg(status.tone === "ok" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 7v6M12 17h.01" />, 20, 2.8)}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 900 }}>{status.title}</span>
            <span style={{ fontSize: 12.5, opacity: 0.9, lineHeight: 1.4 }}>{status.sub}</span>
          </span>
        </div>
      ) : (
      <div data-testid="macro-strip" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
        {MACROS.map((mc) => {
          const e = eaten[mc.k] || 0, t = targets[mc.k] || 0;
          const w = t > 0 ? Math.max(3, Math.min(100, Math.round((e / t) * 100))) : 0;
          const st = macroState(e, t, dayDone);
          return (
            <div key={mc.k} data-testid={`macro-${mc.k}`} className="fp-glass" style={{ borderRadius: 14, padding: "8px 8px 9px 8px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AppIcon name={mc.ic} color={mc.c} size={24} />
                <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{mc.label}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap" }}>{fmtInt(e)}<span style={{ fontSize: 10, fontWeight: 600, opacity: 0.72 }}>/{fmtInt(t)}g</span></span>
              <span role="progressbar" aria-label={mc.label} aria-valuenow={e} aria-valuemax={t} style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)", overflow: "hidden", display: "block" }}>
                <span data-state={st} style={{ display: "block", width: `${w}%`, height: 4, borderRadius: 2, background: MACRO_BAR[st], transition: "width .3s" }} />
              </span>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
