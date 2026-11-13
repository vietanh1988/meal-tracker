// 13/11 (chủ dự án duyệt bản vẽ "Chỗ đặt công tắc Chế độ ăn" — cách 2): bấm thẻ Mục tiêu trên Hôm nay → chọn chế độ ăn.
// Cùng một nguồn với Tôi › Mục tiêu & macro (profile.dietStrategy / profile.macroManual) — đổi ở đây là đổi ở đó.
// Mỗi dòng hiện trước số của hôm nay (ngày tập / nghỉ). Ít tinh bột / Keto chỉ khi mục tiêu Giảm mỡ (như calcMacro).
import { createPortal } from "react-dom";
import { calcMacro } from "../calcMacro";
import { fmtInt } from "../lib/mobileView";
import { FONT, useLockScroll, useSwipeClose, SheetHandle } from "./ui";
import { PHASE_NAME } from "./MacroManualScreen";

export const DIET_MODES = [
  ["balanced", "Cân bằng", "App tự chia đạm · tinh bột · béo", "🍚"],
  ["high_protein", "Nhiều đạm", "Đạm +0,4 g/kg, bớt tinh bột", "🥩"],
  ["low_carb", "Ít tinh bột", "Tinh bột tối đa 100 g, bù béo", "🥑"],
  ["keto", "Keto", "Tinh bột tối đa 50 g", "🥓"],
];
const NAME = Object.fromEntries(DIET_MODES.map(([id, t]) => [id, t]));

// Tên chế độ đang dùng (thẻ Mục tiêu): tự nhập → tên giai đoạn; còn lại theo calcMacro
export function dietModeName(macro, profile) {
  if (macro?.manual) return PHASE_NAME[profile?.macroManual?.preset] || "Tự đặt";
  return NAME[macro?.dietStrategy] || "Cân bằng";
}

export function DietModeSheet({ profile, macro, dayType, canManual, onPick, onManual, onClose }) {
  useLockScroll(true);
  const sw = useSwipeClose(onClose);
  const isCut = (macro?.goal || profile?.goalType) === "cut";
  const rest = dayType === "rest" && (profile?.exerciseType || "gym") !== "none";
  const cur = macro?.manual ? "manual" : macro?.dietStrategy || "balanced";
  const base = { ...profile, macroManual: profile?.macroManual ? { ...profile.macroManual, on: false } : undefined };
  const preview = (id) => {
    const m = calcMacro({ ...base, dietStrategy: id });
    return { cal: rest ? m.calRest : m.calTarget, p: m.protein, c: rest ? m.carbRest : m.carb };
  };
  const row = { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, fontFamily: "inherit", textAlign: "left", color: "#0F172A" };
  return createPortal(
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="diet-sheet" role="dialog" aria-modal="true" aria-label="Chế độ ăn" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", maxHeight: "88vh", overflowY: "auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <SheetHandle />
        <span style={{ fontSize: 18, fontWeight: 900 }}>Chế độ ăn</span>
        <span style={{ fontSize: 12.5, color: "#64748B", marginTop: -4, marginBottom: 2 }}>Số dưới đây là của hôm nay ({rest ? "ngày nghỉ" : "ngày tập"}). Đổi lúc nào cũng được.</span>
        {DIET_MODES.map(([id, t, sub, em]) => {
          const off = (id === "low_carb" || id === "keto") && !isCut;
          const on = cur === id;
          const v = off ? null : preview(id);
          return (
            <button key={id} type="button" data-testid={`diet-${id}`} aria-pressed={on} disabled={off} onClick={() => !on && onPick(id, v)} className="tap"
              style={{ ...row, border: `1.5px solid ${on ? "#0062F0" : "#E2E8F0"}`, background: on ? "#EEF4FF" : "#FFFFFF", opacity: off ? 0.6 : 1 }}>
              <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, boxSizing: "border-box", border: on ? "6px solid #0062F0" : "2px solid #CBD5E1" }} />
              <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{em}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{t}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{off ? "Chỉ khi mục tiêu Giảm mỡ" : sub}</span>
              </span>
              <span style={{ textAlign: "right", flexShrink: 0 }}>
                {v ? <><span style={{ display: "block", fontSize: 14, fontWeight: 900 }}>{fmtInt(v.cal)}</span><span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B" }}>Đ {fmtInt(v.p)} · TB {fmtInt(v.c)}</span></>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>Đổi mục tiêu</span>}
              </span>
            </button>
          );
        })}
        <button type="button" data-testid="diet-manual" aria-pressed={cur === "manual"} onClick={onManual} className="tap"
          style={{ ...row, border: `1.5px solid ${cur === "manual" ? "#0062F0" : "#E2E8F0"}`, background: cur === "manual" ? "#EEF4FF" : "#FFFFFF" }}>
          <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: 10, flexShrink: 0, boxSizing: "border-box", border: cur === "manual" ? "6px solid #0062F0" : "2px solid #CBD5E1" }} />
          <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✍️</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 800 }}>Tự nhập số{!canManual && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#B45309", background: "#FEF3C7", borderRadius: 999, padding: "2px 7px" }}>Premium</span>}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{cur === "manual" ? `${fmtInt(macro.calTarget)} kcal · Đ ${fmtInt(macro.protein)} · TB ${fmtInt(macro.carb)} · B ${fmtInt(macro.fat)}` : "Mini cut, bỏ tinh bột… theo giai đoạn"}</span>
          </span>
          <span aria-hidden="true" style={{ color: "#94A3B8", fontSize: 18 }}>›</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
