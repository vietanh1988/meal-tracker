// Màn 1 · Hôm nay (bản vẽ 32 "Hôm nay – bản đầy đủ", chốt 13/10).
// Header: TodayHeader.jsx (bản vẽ 41, Blue ↔ Blue Dark).
// Thân (bản vẽ 77, chốt 14/10): nền xanh nhạt từ vỏ app, thẻ trắng phẳng; thẻ bữa đến giờ nổi mềm cùng màu nền;
// danh sách bữa dạng dòng thời gian.
// Thân: thẻ bữa đến giờ, danh sách bữa, nước theo cốc, cân nặng, tuần này.
import { useState, useEffect, useRef } from "react";
import { Icon, GRAD_ORANGE, GRAD_BLUE, Skel } from "./ui";
import { TodayHeader } from "./TodayHeader";
import { weekdayFull, mealWindowLabel, itemName, fmtInt, fmtDec, focusMeal, capFirst } from "../lib/mobileView";
import { AppIcon, MealIcon, IC_COLOR, mix } from "./icons";
import { waterGoalMl, cupsView, CUP_SIZES } from "../lib/dayPlan";
import { fmtVN } from "../lib/dateVN";
import { LT, ltCard } from "../theme";

const WEEK_LBL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const CUP_KEY = "fp_cup_ml";

const plusBtn = { width: 40, height: 40, borderRadius: 20, border: "1.5px solid transparent", background: LT.soft, color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, padding: 0, flexShrink: 0, fontFamily: "inherit" };
const card = { margin: "0 12px", ...ltCard };
const secHead = { padding: "20px 18px 10px 18px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 };
const secTitle = { fontSize: 17, fontWeight: 900, letterSpacing: -0.2 };
const fmtL = (ml) => (Math.round(ml / 10) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export function TodayScreen(p) {
  const { date, today, onDate, rows, eaten, targets, dayType, nowMinutes, name, dayLoaded } = p;
  const isToday = date === today;
  const remain = targets.cal - eaten.cal;
  const focus = isToday && dayLoaded ? focusMeal(rows, nowMinutes) : null;
  const allEaten = isToday && dayLoaded && rows.length > 0 && rows.every((r) => r.state === "eaten");
  const eatenCount = rows.filter((r) => r.state === "eaten").length;
  const w = p.weight;

  return (
    <div data-testid="today-body" style={{ minHeight: "100%" }}>
      <TodayHeader date={date} today={today} onDate={onDate} weekDots={p.weekDots} name={name} bell={p.bell} eaten={eaten} targets={targets} dayType={dayType} planLine={p.planLine} planCard={p.planCard} goalSub={p.goalSub} dayDone={date < today || allEaten} />

      {p.banner}
      {isToday && p.checkin}
      {isToday && p.walkTip}
      {isToday && p.activityAsk}

      {/* ===== Thẻ bữa đang đến giờ ===== */}
      {focus && <FocusCard r={focus} {...p} />}
      {allEaten && (
        <div style={{ margin: "14px 12px 0 12px", ...ltCard, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(0,200,150,0.12)", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.check(24, 2.6)}</span>
          <span style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#047857" }}>ĐÃ GHI ĐỦ BỮA</span>
            <span style={{ fontSize: 16, fontWeight: 900 }}>{fmtInt(eaten.cal)} / {fmtInt(targets.cal)} kcal hôm nay</span>
          </span>
        </div>
      )}

      {allEaten && p.snack}

      {/* ===== Bữa ăn ===== */}
      <div style={secHead}>
        <span style={secTitle}>{isToday ? "Bữa ăn hôm nay" : `${weekdayFull(date)} ${fmtVN(date)}`}</span>
        {rows.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{eatenCount} / {rows.length} bữa</span>}
      </div>
      <div data-testid="meal-timeline" style={{ margin: "0 12px", display: "flex", flexDirection: "column", gap: 14 }}>
        {!dayLoaded && [0, 1, 2, 3].map((k) => (
          // Khung xương khi ngày đang tải (chọn ngày cũ) — thay cho danh sách mờ 50% dễ bấm nhầm
          <div key={`sk${k}`} data-testid="meal-skeleton" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skel w={44} h={44} r={14} />
            <div style={{ flex: 1, minHeight: 64, borderRadius: 18, background: "rgba(255,255,255,0.75)", padding: "0 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}><Skel w="40%" h={12} /><Skel w="65%" h={10} /></div>
          </div>
        ))}
        {dayLoaded && rows.map((r, i) => <MealRow key={r.id} r={r} last={i === rows.length - 1} now={!!focus && focus.id === r.id} {...p} />)}
        {dayLoaded && rows.length === 0 && <div style={{ ...card, margin: 0, minHeight: 56, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 13, color: "#64748B" }}>Chưa bật bữa nào — vào Tôi › Lịch tập & bữa để bật.</div>}
      </div>
      {p.onAIMenu && date >= today && (
        <button onClick={p.onAIMenu} data-testid="today-ai-menu" style={{ margin: "10px 12px 0 12px", width: "calc(100% - 24px)", height: 48, borderRadius: 16, border: "none", background: "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(0,122,255,0.08))", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#6D28D9", fontFamily: "inherit" }}>
          {Icon.sparkle(18)}{eatenCount > 0 ? "AI lên thực đơn các bữa còn lại" : "AI lên thực đơn cả ngày"}
        </button>
      )}

      {/* ===== Nước ===== */}
      <WaterCups waterMl={p.waterMl} addWater={p.addWater} kg={w.curKg} isTrainDay={dayType !== "rest"} goalOverride={p.waterGoalOverride} />

      {/* ===== Cân nặng ===== */}
      {/* 17/10 (bản vẽ 132b): Cân nặng + Vận động thêm chung 1 thẻ; bỏ thẻ "Tuần này" (xem ở Tiến độ) */}
      <div style={secHead}><span style={secTitle}>{isToday && p.activity ? "Cân nặng & vận động" : "Cân nặng"}</span></div>
      <div data-testid="body-card" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <button data-testid="weight-tile" onClick={p.onWeight} className="tap" style={{ width: "100%", padding: 0, border: "none", background: "transparent", display: "flex", flexDirection: "column", gap: 12, color: "#0F172A", fontFamily: "inherit", textAlign: "left", boxSizing: "border-box" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          <AppIcon name="scale" color={IC_COLOR.weight} size={44} />
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1, whiteSpace: "nowrap" }}>{fmtDec(w.curKg)} kg <span style={{ fontSize: 13, fontWeight: 700, color: "#64748B" }}>→ {fmtDec(w.goalKg)} kg</span></span>
            <span style={{ fontSize: 12, fontWeight: 700, color: w.weighedToday ? "#047857" : "#B45309" }}>{w.weighedToday ? "Đã cân hôm nay" : w.sinceLast == null ? "Chưa cân lần nào" : `${w.sinceLast} ngày chưa cân`}</span>
          </span>
          <span style={{ height: 36, padding: "0 12px", borderRadius: 12, background: w.weighedToday ? LT.soft : "#FACC15", color: "#0F172A", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", flexShrink: 0 }}>{w.weighedToday ? "Xem" : "Cân hôm nay"}</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          <span style={{ height: 8, borderRadius: 4, background: LT.soft, overflow: "hidden", display: "block" }}><span style={{ display: "block", width: `${Math.max(2, w.pct)}%`, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#FACC15,#F59E0B)" }} /></span>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
            <span>{w.goalKg > w.startKg ? "Mục tiêu tăng cân" : w.goalKg < w.startKg ? "Mục tiêu giảm cân" : "Giữ cân"}</span>
            <span>{Math.abs(w.goalKg - w.curKg) < 0.05 ? "Đã đạt mục tiêu" : `Còn ${fmtDec(Math.abs(Math.round((w.goalKg - w.curKg) * 10) / 10))} kg`}</span>
          </span>
        </span>
      </button>
      {isToday && p.activity}
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

// Thẻ bữa đến giờ (bản vẽ 77): cùng màu nền, nổi mềm; dải màu của bữa ở mép trên; dòng món lõm vào.
// Gợi ý hợp nhất ghi 1 chạm (16/10): bữa chưa có món + có gợi ý → hiện ngay 1 dòng gợi ý + nút "Ghi · X kcal";
// các lựa chọn khác vẫn mở sheet Gợi ý món (focus-suggest).
function IconTile({ testid, bg, icon, label, onClick }) {
  return (
    <button data-testid={testid} onClick={onClick} aria-label={label} className="tap" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: "none", background: "transparent", padding: 0, fontFamily: "inherit" }}>
      <span style={{ width: 52, height: 52, borderRadius: 16, background: bg, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(15,23,42,0.14)" }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>{label}</span>
    </button>
  );
}
const SUG_SRC = { history: ["Đã ăn", "#047857", "rgba(5,150,105,0.12)"], template: ["Mẫu", "#0062F0", "#EEF4FF"], ai: ["AI", "#6D28D9", "#F3EEFF"] };
function FocusCard({ r, onLog, onPhoto, onEdit, onToggleEaten, suggestInfo, onSuggest, onSuggestApply, busy, nowMinutes, onAskAI, focusBonus }) {
  const planned = r.state === "planned";
  const sug = !planned && suggestInfo ? suggestInfo(r.id) : { n: 0, best: null };
  const nSug = sug.n || 0;
  const best = sug.best;
  const [applying, setApplying] = useState(false);
  const applyBest = async () => {
    if (!best || applying || !onSuggestApply) return;
    setApplying(true);
    try { await onSuggestApply(r.id, best); } finally { setApplying(false); }
  };
  const [srcT, srcC, srcBg] = best ? (SUG_SRC[best.kind] || SUG_SRC.history) : [];
  const srcLabel = best ? (best.kind === "history" ? `${srcT}${best.date ? ` ${fmtVN(best.date)}` : ""}` : srcT) : "";
  const label = r.state === "missed" ? "CHƯA GHI" : (r.minutes ?? 0) > nowMinutes + 60 ? "BỮA TIẾP THEO" : "ĐẾN GIỜ ĂN";
  const c = IC_COLOR[r.id] || "#007AFF";
  const soft = { background: LT.tone, border: "none", fontFamily: "inherit" };
  return (
    <div data-testid="focus-card" data-meal={r.id} style={{ margin: "14px 12px 0 12px", background: LT.tone, borderRadius: 22, boxShadow: LT.raise, overflow: "hidden" }}>
      <span aria-hidden="true" style={{ display: "block", height: 4, background: `linear-gradient(90deg, ${c}, ${mix(c, "#FFFFFF", 0.45)})` }} />
      <div style={{ padding: "20px 16px 14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MealIcon id={r.id} size={48} />
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: mix(c, "#000000", 0.2) }}>{label} · {mealWindowLabel(r.id, r.time)}</span>
            <span style={{ fontSize: 19, fontWeight: 900 }}>{planned ? `${r.name} · ${fmtInt(r.cal)} kcal` : `${r.name} hôm nay ăn gì?`}</span>
          </span>
        </div>
        {focusBonus && !planned && <span data-testid="focus-bonus" style={{ marginTop: -4, borderRadius: 12, background: "#ECFDF5", padding: "8px 12px", fontSize: 13, color: "#047857", fontWeight: 700, lineHeight: 1.45 }}>{focusBonus}</span>}
        {planned && (
          <button data-testid="focus-foods" onClick={() => onEdit(r.id)} className="tap" style={{ ...soft, boxShadow: LT.inset, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, color: "#475569", textAlign: "left" }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.items.map(itemName).join(", ")}</span>
            {Icon.chev(16)}
          </button>
        )}
        {best && onSuggestApply && (
          <div data-testid="focus-suggest-box" style={{ ...soft, boxShadow: LT.inset, borderRadius: 14, padding: "10px 12px 4px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#007AFF", letterSpacing: "0.06em" }}>{Icon.sparkle(13)}GỢI Ý CHO {r.name.toUpperCase()}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 3 }}>
                <span data-testid="focus-suggest-foods" style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{best.items.map((x) => capFirst(itemName(x))).join(", ")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: srcC, background: srcBg, padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0 }}>{srcLabel}</span>
                  <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{best.items.length} món</span>
                </span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>{fmtInt(best.cal)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>kcal</span>
              </span>
            </span>
            <button data-testid="focus-suggest-apply" data-meal={r.id} disabled={busy || applying} onClick={applyBest} style={{ height: 44, borderRadius: 12, background: GRAD_BLUE, color: "#FFFFFF", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", fontFamily: "inherit" }}>{Icon.check(18, 2.6)}{applying ? "Đang ghi…" : `Ghi · ${fmtInt(best.cal)} kcal`}</button>
            {/* Xem các lựa chọn khác: mở sheet Gợi ý món (≤5 lựa chọn, chỉnh khẩu phần) */}
            <button data-testid="focus-suggest" data-meal={r.id} disabled={busy} onClick={() => onSuggest(r.id)} style={{ height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: 0 }}>
              {nSug > 1 ? `Xem ${nSug - 1} lựa chọn khác` : "Xem chi tiết lựa chọn"}{Icon.chev(14, "#007AFF")}
            </button>
          </div>
        )}
        {planned ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <button data-testid={`focus-eat-${r.id}`} disabled={busy} onClick={() => onToggleEaten(r.id, true)} style={{ height: 48, borderRadius: 14, background: GRAD_BLUE, color: "#FFFFFF", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", fontFamily: "inherit" }}>{Icon.check(18, 2.6)}Đã ăn</button>
            <button data-testid="focus-edit" onClick={() => onEdit(r.id)} style={{ ...soft, height: 48, borderRadius: 14, boxShadow: LT.raiseSm, border: "1.5px solid rgba(0,122,255,0.35)", color: "#0057FF", fontSize: 15, fontWeight: 800, boxSizing: "border-box" }}>Sửa món</button>
          </div>
        ) : (
          /* Bản vẽ 121c: 3 ô icon có chữ — Chụp món · Tìm món · Hỏi AI (gộp link Hỏi AI) */
          <div data-testid="focus-actions" style={{ display: "flex", justifyContent: "space-around", gap: 8, paddingTop: 2 }}>
            <IconTile testid="focus-photo" bg={GRAD_ORANGE} icon={Icon.camera(22)} label="Chụp món" onClick={() => onPhoto(r.id)} />
            <IconTile testid="focus-search" bg={GRAD_BLUE} icon={Icon.search(22, "#FFFFFF")} label="Tìm món" onClick={() => onLog(r.id)} />
            {onAskAI && <IconTile testid="focus-ask-ai" bg="linear-gradient(135deg,#A855F7,#7C3AED)" icon={Icon.sparkle(22, "#FFFFFF")} label="Hỏi AI" onClick={() => onAskAI(r)} />}
          </div>
        )}
        {planned && onAskAI && (
          <button data-testid="focus-ask-ai" onClick={() => onAskAI(r)} style={{ alignSelf: "center", height: 32, padding: "0 8px", border: "none", background: "transparent", color: "#7C3AED", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>{Icon.sparkle(16)}Hỏi AI về {r.name.toLowerCase()}</button>
        )}
      </div>
    </div>
  );
}

// Danh sách bữa dạng dòng thời gian (bản vẽ 72b / 77): icon bữa nối bằng đường dọc, mỗi bữa 1 viên bo tròn phẳng.
// Đường nối dưới bữa đã ăn màu xanh lá; dưới bữa đến giờ xanh dương nhạt dần.
function MealRow({ r, last, now, onLog, onEdit, onToggleEaten, busy }) {
  const eaten = r.state === "eaten";
  const hasFood = eaten || r.state === "planned";
  const line = last ? null : (
    <span aria-hidden="true" style={{ position: "absolute", left: 21, top: 50, bottom: -14, width: 2, background: eaten ? "#059669" : now ? "linear-gradient(180deg,#007AFF,#CFE0FB)" : "#C9D8F2" }} />
  );
  const pill = { flex: 1, minWidth: 0, minHeight: 64, borderRadius: 18, background: now ? "#FFFFFF" : "rgba(255,255,255,0.75)", padding: "0 10px 0 14px", display: "flex", alignItems: "center", gap: 10, boxSizing: "border-box" };
  const timeTag = <span style={{ fontSize: 12, fontWeight: 800, color: now ? "#007AFF" : "#64748B", background: now ? "rgba(0,122,255,0.10)" : "#F1F5FB", padding: "4px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{r.time}</span>;
  const tag = eaten
    ? <span style={{ fontSize: 10, fontWeight: 800, color: "#047857", background: "rgba(0,200,150,0.12)", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>Đã ăn</span>
    : <span style={{ fontSize: 10, fontWeight: 800, color: "#B45309", background: "rgba(245,158,11,0.14)", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>Chưa ăn</span>;
  return (
    <div data-testid={now ? "meal-row-now" : undefined} style={{ position: "relative", display: "flex", gap: 12, alignItems: "center" }}>
      {line}
      <span style={{ position: "relative", zIndex: 1, display: "flex" }}><MealIcon id={r.id} size={44} dim={r.state === "missed"} /></span>
      {hasFood ? (
        <div style={pill}>
          <button onClick={() => onEdit(r.id)} className="tap" style={{ flex: 1, minWidth: 0, minHeight: 64, display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap" }}>{r.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", whiteSpace: "nowrap" }}>{r.time}</span>
                {tag}
              </span>
              <span data-testid={`meal-foods-${r.id}`} style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.items.map(itemName).join(", ")}</span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: 15, fontWeight: 900, whiteSpace: "nowrap" }}>{fmtInt(r.cal)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>kcal</span>
            </span>
          </button>
          <button data-testid={`eat-${r.id}`} disabled={busy} onClick={() => onToggleEaten(r.id, !eaten)} aria-label={eaten ? `Bỏ đánh dấu đã ăn ${r.name}` : `Đánh dấu đã ăn ${r.name}`} aria-pressed={eaten}
            style={{ ...plusBtn, background: eaten ? "#059669" : "#FFFFFF", borderColor: eaten ? "#059669" : "#94A3B8", color: eaten ? "#FFFFFF" : "#64748B" }}>{Icon.check(18, 2.8)}</button>
        </div>
      ) : (
        <div style={pill}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap" }}>{r.name}</span>
            {now ? <span style={{ fontSize: 12, fontWeight: 800, color: "#007AFF" }}>Đến giờ ăn</span>
              : <span style={{ fontSize: 12, color: "#64748B" }}>{r.state === "missed" ? "Đã qua giờ · chưa ghi" : "Chưa ghi"}</span>}
          </span>
          {timeTag}
          {/* Giữ nút + cả ở bữa đang trên thẻ đến giờ (chủ dự án 16/10: phải thêm/sửa được ngay ở dòng bữa) */}
          <button onClick={() => onLog(r.id)} aria-label={`Ghi ${r.name.toLowerCase()}`} style={{ ...plusBtn, fontSize: 22 }}>+</button>
        </div>
      )}
    </div>
  );
}

function readCup() { try { return Number(localStorage.getItem(CUP_KEY)) || 250; } catch (e) { return 250; } }

function WaterCups({ waterMl = 0, addWater, kg, isTrainDay, goalOverride }) {
  const goal = waterGoalMl(kg, isTrainDay, goalOverride);
  const [cupMl, setCupMl] = useState(readCup);
  const [busy, setBusy] = useState(false);
  const v = cupsView(waterMl, goal, cupMl);
  const busyRef = useRef(false);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const change = async (ml) => {
    if (!addWater || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await addWater(ml); } finally { busyRef.current = false; setBusy(false); }
  };
  const pickCup = (ml) => { setCupMl(ml); try { localStorage.setItem(CUP_KEY, String(ml)); } catch (e) { /* */ } };
  return (
    <>
      <div style={secHead}>
        <span style={secTitle}>Nước uống</span>
        <label style={{ position: "relative", height: 30, padding: "0 10px", borderRadius: 10, border: "none", background: "#FFFFFF", boxShadow: "0 2px 8px rgba(30,64,175,0.08)", fontSize: 12, fontWeight: 800, color: "#0891B2", display: "flex", alignItems: "center", gap: 4 }}>
          1 cốc = {v.cupMl} ml{Icon.down ? Icon.down(12) : "▾"}
          <select data-testid="water-cup-size" aria-label="Cỡ cốc" value={v.cupMl} onChange={(e) => pickCup(Number(e.target.value))} style={{ position: "absolute", inset: 0, opacity: 0, fontSize: 16, cursor: "pointer" }}>
            {CUP_SIZES.map((s) => <option key={s} value={s}>1 cốc = {s} ml</option>)}
          </select>
        </label>
      </div>
      <div style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(90,200,250,0.16)", color: "#0891B2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span data-testid="water-count" data-ml={waterMl} style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{v.filled} <span style={{ fontSize: 14, fontWeight: 700, color: "#64748B" }}>/ {v.need} cốc</span></span>
            <span style={{ fontSize: 12, color: "#64748B" }}>{fmtL(waterMl)} / {fmtL(goal)} L · {v.done ? "đủ rồi 👍" : `còn ${v.left} cốc`}</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: v.done ? "#047857" : "#0891B2", background: v.done ? "rgba(0,200,150,0.12)" : "rgba(90,200,250,0.14)", padding: "4px 8px", borderRadius: 8 }}>{v.pct}%</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8, opacity: busy ? 0.7 : 1 }}>
          {v.cups.map((c) => {
            const next = !c.full && c.i === v.filled + 1;
            if (c.full) return (
              <button key={c.i} data-testid={`water-cup-${c.i}`} aria-pressed="true" aria-label={`Cốc ${c.i} đã uống, chạm để bỏ`} disabled={busy} onClick={() => change(-(waterMl - (v.filled - 1) * v.cupMl))}
                style={{ height: 58, borderRadius: 12, border: "none", background: "rgba(90,200,250,0.12)", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg aria-hidden="true" width="30" height="38" viewBox="0 0 30 38"><path d="M3 3h24l-3 32H6z" fill="#FFFFFF" stroke="#0891B2" strokeWidth="2.2" strokeLinejoin="round" /><path d="M4.6 12h20.8l-2.2 23H6.8z" fill="#38BDF8" /><path d="M8 17c2-1 4 1 6 0" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" /></svg>
              </button>
            );
            return (
              <button key={c.i} data-testid={next ? "water-cup-next" : `water-cup-${c.i}`} aria-label={`Uống thêm 1 cốc (${v.cupMl} ml)`} disabled={busy} onClick={() => change(v.cupMl)}
                style={{ height: 58, borderRadius: 12, border: next ? "2px dashed #0891B2" : "none", background: next ? "#FFFFFF" : LT.soft, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                <svg aria-hidden="true" width="30" height="38" viewBox="0 0 30 38"><path d="M3 3h24l-3 32H6z" fill={next ? "#F0F9FF" : "#FFFFFF"} stroke={next ? "#0891B2" : "#BAE6FD"} strokeWidth="2.2" strokeLinejoin="round" />{next && <path d="M15 14v12M9 20h12" stroke="#0891B2" strokeWidth="2.6" strokeLinecap="round" />}</svg>
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>Chạm cốc trống để uống thêm 1 cốc. Chạm cốc đã uống (xanh) để bỏ cốc đó.</span>
      </div>
    </>
  );
}

