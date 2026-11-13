// 13/11 (chủ dự án duyệt bản vẽ "Chỗ đặt công tắc Chế độ ăn" — cách 2): bấm thẻ Mục tiêu trên Hôm nay → chọn chế độ ăn.
// Cùng một nguồn với Tôi › Mục tiêu & macro (profile.dietStrategy / profile.macroManual) — đổi ở đây là đổi ở đó.
// Mỗi dòng hiện trước số của hôm nay (ngày tập / nghỉ). Ít tinh bột / Keto chỉ khi mục tiêu Giảm mỡ (như calcMacro).
// 13/11 (bản vẽ "Tự nhập số ngay trong danh sách"): "Tự nhập số" mở rộng tại chỗ — mẫu nhanh, 4 ô 2×2, tổng kcal,
// thời hạn, Lưu — không sang màn khác. Khi mở rộng, 4 chế độ kia thu gọn 1 dòng (vẫn bấm được để đổi).
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { calcMacro } from "../calcMacro";
import { fmtInt, fmtDec } from "../lib/mobileView";
import { todayVN, addDays, fmtVN } from "../lib/dateVN";
import { FONT, GRAD_BLUE, useLockScroll, useSwipeClose, SheetHandle } from "./ui";
import { PHASE_NAME, presetOf } from "./MacroManualScreen";

export const DIET_MODES = [
  ["balanced", "Cân bằng", "App tự chia đạm · tinh bột · béo", "🍚"],
  ["high_protein", "Nhiều đạm", "Đạm +0,4 g/kg, bớt tinh bột", "🥩"],
  ["low_carb", "Ít tinh bột", "Tinh bột tối đa 100 g, bù béo", "🥑"],
  ["keto", "Keto", "Tinh bột tối đa 50 g", "🥓"],
];
const NAME = Object.fromEntries(DIET_MODES.map(([id, t]) => [id, t]));
const WEEKS = [2, 4, 6, 8];

// Tên chế độ đang dùng (thẻ Mục tiêu): tự nhập → tên giai đoạn; còn lại theo calcMacro
export function dietModeName(macro, profile) {
  if (macro?.manual) return PHASE_NAME[profile?.macroManual?.preset] || "Tự đặt";
  return NAME[macro?.dietStrategy] || "Cân bằng";
}

const radio = (on) => ({ width: 20, height: 20, borderRadius: 10, flexShrink: 0, boxSizing: "border-box", border: on ? "6px solid #0062F0" : "2px solid #CBD5E1" });
const pc = (on) => ({ height: 30, padding: "0 10px", borderRadius: 9, fontFamily: "inherit", fontSize: 12, fontWeight: 700, border: `1.5px solid ${on ? "#0062F0" : "#E2E8F0"}`, background: on ? "#0062F0" : "#F1F5F9", color: on ? "#FFFFFF" : "#334155", whiteSpace: "nowrap" });

function Field({ id, label, value, onChange, warn }) {
  const ref = useRef(null);
  return (
    <label style={{ border: `1.5px solid ${warn ? "#F59E0B" : "#E2E8F0"}`, borderRadius: 12, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}
      onFocus={() => setTimeout(() => ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 250)}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <input ref={ref} data-testid={`mm-${id}`} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
          style={{ width: `${Math.max(1, String(value).length) + 0.6}ch`, maxWidth: "100%", minWidth: 0, border: "none", outline: "none", padding: 0, background: "transparent", fontFamily: "inherit", fontSize: 18, fontWeight: 900, color: "#0F172A" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>g</span>
      </span>
    </label>
  );
}

// Khối tự nhập (mở rộng trong danh sách)
function ManualBlock({ profile, macro, onSave, onAuto }) {
  const today = todayVN();
  const mm = profile?.macroManual || {};
  const on = !!macro?.manual;
  const noEx = (profile?.exerciseType || "gym") === "none";
  const kg = Number(profile?.kg) || 0;
  const base = macro?.manual ? macro.auto : macro;
  const autoCal = macro?.manual ? macro.autoCal : macro?.calTarget;
  const start = mm.p != null ? { p: mm.p, f: mm.f, c: mm.c, cRest: mm.cRest ?? mm.c } : presetOf("app", base, kg);
  const [preset, setPreset] = useState(mm.p != null ? mm.preset || "custom" : "app");
  const [v, setV] = useState({ p: String(start.p ?? ""), f: String(start.f ?? ""), c: String(start.c ?? ""), cRest: String(start.cRest ?? "") });
  const left = mm.until && mm.until >= today ? Math.round((Date.parse(mm.until) - Date.parse(today)) / 86400000) + 1 : null;
  const [weeks, setWeeks] = useState(mm.p != null && !mm.until ? 0 : left ? Math.max(1, Math.round(left / 7)) : 6); // 0 = luôn luôn
  const n = (x) => Math.max(0, Number(x) || 0);
  const calTrain = n(v.p) * 4 + n(v.c) * 4 + n(v.f) * 9;
  const calRest = n(v.p) * 4 + n(noEx ? v.c : v.cRest) * 4 + n(v.f) * 9;
  const floor = macro?.calFloor || 1200;
  const lowCal = calTrain < floor || (!noEx && calRest < floor);
  const lowP = kg > 0 && n(v.p) < kg;
  const until = weeks ? addDays(today, weeks * 7 - 1) : null;
  const ok = v.p !== "" && v.f !== "" && v.c !== "" && (noEx || v.cRest !== "") && calTrain > 0;
  const set = (k) => (x) => { setPreset("custom"); setV((o) => ({ ...o, [k]: x })); };
  const pick = (id) => { setPreset(id); const s = presetOf(id, base, kg); setV({ p: String(s.p), f: String(s.f), c: String(s.c), cRest: String(s.cRest) }); };
  const nextWeeks = () => setWeeks((w) => (w ? WEEKS[(WEEKS.indexOf(w) + 1) % WEEKS.length] || 6 : 6));
  const save = () => ok && onSave({ on: true, preset, p: n(v.p), f: n(v.f), c: n(v.c), cRest: noEx ? n(v.c) : n(v.cRest), until, since: on ? mm.since || today : today, endSeen: null }, calTrain);
  const same = !noEx && v.c === v.cRest;
  return (
    <div data-testid="mm-block" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div role="group" aria-label="Mẫu nhanh" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["app", "Như app tính"], ["mini_cut", "Mini cut (0 tinh bột)"], ["high_pro", "Nhiều đạm"]].map(([id, t]) => (
          <button key={id} type="button" data-testid={`mm-preset-${id}`} aria-pressed={preset === id} onClick={() => pick(id)} className="tap" style={pc(preset === id)}>{t}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field id="p" label={kg && n(v.p) ? `Đạm · ${fmtDec(Math.round(n(v.p) / kg * 10) / 10)} g/kg` : "Đạm"} value={v.p} onChange={set("p")} warn={lowP} />
        <Field id="f" label="Béo" value={v.f} onChange={set("f")} />
        <Field id="c" label={noEx ? "Tinh bột" : "Tinh bột ngày tập"} value={v.c} onChange={set("c")} />
        {!noEx && <Field id="crest" label="Tinh bột ngày nghỉ" value={v.cRest} onChange={set("cRest")} />}
      </div>
      <div data-testid="mm-sum" data-cal={calTrain} style={{ display: "flex", alignItems: "baseline", gap: 8, background: "#F8FAFC", borderRadius: 12, padding: "9px 12px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{noEx || same ? "Mỗi ngày" : "Ngày tập"}</span>
        <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900 }}>{fmtInt(calTrain)} kcal</span>
      </div>
      <span data-testid="mm-compare" style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B", marginTop: -4, padding: "0 2px" }}>
        {!noEx && !same ? `Ngày nghỉ ${fmtInt(calRest)} kcal · ` : ""}App gợi ý {fmtInt(autoCal)} kcal · bạn đặt {calTrain - autoCal >= 0 ? "+" : "−"}{fmtInt(Math.abs(calTrain - autoCal))}
      </span>
      {(lowCal || lowP) && (
        <div data-testid="mm-warn" role="status" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 10, padding: "7px 10px", fontSize: 11.5, fontWeight: 600, lineHeight: 1.4 }}>
          {lowCal ? `Thấp hơn mức tối thiểu an toàn ${fmtInt(floor)} kcal/ngày cho bạn.` : "Đạm dưới 1 g/kg dễ mất cơ khi ăn thiếu."} Vẫn lưu được, nên hỏi HLV hoặc chuyên gia dinh dưỡng.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" data-testid="mm-always" aria-pressed={!weeks} onClick={() => setWeeks(0)} className="tap" style={pc(!weeks)}>Luôn luôn</button>
        <button type="button" data-testid="mm-weeks" aria-pressed={!!weeks} onClick={nextWeeks} className="tap" style={pc(!!weeks)}>{weeks || 6} tuần</button>
        {until && <span data-testid="mm-until" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800 }}>đến {fmtVN(until)}</span>}
      </div>
      {on && <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 10, padding: "7px 10px", fontSize: 11.5, fontWeight: 600, lineHeight: 1.4 }}>Đang tự nhập: Hôm nay không gợi ý món, app không tự chỉnh mỗi tuần.</div>}
      <div style={{ display: "grid", gridTemplateColumns: on ? "1fr 1.3fr" : "1fr", gap: 8 }}>
        {on && <button type="button" data-testid="mm-auto" onClick={onAuto} className="tap" style={{ height: 44, borderRadius: 12, border: "none", background: "#F1F5F9", color: "#475569", fontFamily: "inherit", fontSize: 14, fontWeight: 800 }}>Về app tự tính</button>}
        <button type="button" data-testid="mm-save" disabled={!ok} onClick={save} className="tap" style={{ height: 44, borderRadius: 12, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 800, opacity: ok ? 1 : 0.5 }}>{on ? "Lưu thay đổi" : "Lưu"}</button>
      </div>
    </div>
  );
}

export function DietModeSheet({ profile, macro, dayType, canManual, showManual = true, startManual = false, onPick, onManual, onSaveManual, onAutoManual, onClose }) {
  useLockScroll(true);
  const sw = useSwipeClose(onClose);
  const isCut = (macro?.goal || profile?.goalType) === "cut";
  const rest = dayType === "rest" && (profile?.exerciseType || "gym") !== "none";
  const cur = macro?.manual ? "manual" : macro?.dietStrategy || "balanced";
  const [open, setOpen] = useState(cur === "manual" || (startManual && canManual));
  const base = { ...profile, macroManual: profile?.macroManual ? { ...profile.macroManual, on: false } : undefined };
  const preview = (id) => {
    const m = calcMacro({ ...base, dietStrategy: id });
    return { cal: rest ? m.calRest : m.calTarget, p: m.protein, c: rest ? m.carbRest : m.carb };
  };
  const row = { width: "100%", display: "flex", alignItems: "center", gap: 12, borderRadius: 14, fontFamily: "inherit", textAlign: "left", color: "#0F172A" };
  const tapManual = () => { if (!canManual) { onManual?.(); return; } setOpen(true); };
  return createPortal(
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="diet-sheet" role="dialog" aria-modal="true" aria-label="Chế độ ăn" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", maxHeight: "90vh", overflowY: "auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <SheetHandle />
        <span style={{ fontSize: 18, fontWeight: 900 }}>Chế độ ăn</span>
        <span style={{ fontSize: 12.5, color: "#64748B", marginTop: -4, marginBottom: 2 }}>{open ? `Hôm nay là ${rest ? "ngày nghỉ" : "ngày tập"}.` : `Số dưới đây là của hôm nay (${rest ? "ngày nghỉ" : "ngày tập"}). Đổi lúc nào cũng được.`}</span>
        {DIET_MODES.map(([id, t, sub, em]) => {
          const off = (id === "low_carb" || id === "keto") && !isCut;
          if (open && off) return null; // đang tự nhập: chỉ giữ chế độ bấm được, thu gọn
          const on = cur === id && !open; // đang mở Tự nhập số: chỉ dòng đó được chọn
          const v = off ? null : preview(id);
          return (
            <button key={id} type="button" data-testid={`diet-${id}`} aria-pressed={on} disabled={off} onClick={() => !on && onPick(id, v)} className="tap"
              style={{ ...row, padding: open ? "8px 12px" : "10px 12px", border: `1.5px solid ${on ? "#0062F0" : "#E2E8F0"}`, background: on ? "#EEF4FF" : "#FFFFFF", opacity: off ? 0.6 : 1 }}>
              <span aria-hidden="true" style={radio(on)} />
              {!open && <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{em}</span>}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{t}</span>
                {!open && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{off ? "Chỉ khi mục tiêu Giảm mỡ" : sub}</span>}
              </span>
              <span style={{ textAlign: "right", flexShrink: 0 }}>
                {v ? <><span style={{ display: "block", fontSize: 14, fontWeight: 900 }}>{fmtInt(v.cal)}</span>{!open && <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B" }}>Đ {fmtInt(v.p)} · TB {fmtInt(v.c)}</span>}</>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>Đổi mục tiêu</span>}
              </span>
            </button>
          );
        })}
        {(showManual || cur === "manual") && (
          <div data-testid="diet-manual-wrap" style={{ border: `1.5px solid ${open || cur === "manual" ? "#0062F0" : "#E2E8F0"}`, borderRadius: 14, padding: open ? 12 : 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <button type="button" data-testid="diet-manual" aria-pressed={cur === "manual"} aria-expanded={open} onClick={open ? undefined : tapManual} className="tap"
              style={{ ...row, padding: open ? 0 : "10px 12px", border: "none", background: "transparent" }}>
              <span aria-hidden="true" style={radio(open || cur === "manual")} />
              {!open && <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✍️</span>}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 800 }}>Tự nhập số{cur === "manual" ? ` · ${PHASE_NAME[profile?.macroManual?.preset] || "Tự đặt"}` : ""}{!canManual && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#B45309", background: "#FEF3C7", borderRadius: 999, padding: "2px 7px" }}>Premium</span>}</span>
                {!open && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Mini cut, bỏ tinh bột… theo giai đoạn</span>}
                {open && cur === "manual" && macro?.manualUntil && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>đến {fmtVN(macro.manualUntil)}</span>}
              </span>
              {!open && <span aria-hidden="true" style={{ color: "#94A3B8", fontSize: 18 }}>›</span>}
            </button>
            {open && <ManualBlock profile={profile} macro={macro} onSave={onSaveManual} onAuto={onAutoManual} />}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
