// 13/11 (chủ dự án duyệt bản vẽ "Tự nhập macro theo giai đoạn", khách tập gym hỏi): người dùng tự nhập đạm / béo /
// tinh bột (ngày tập, ngày nghỉ riêng — được để 0), áp dụng luôn luôn hoặc đến 1 ngày (vd mini cut 6 tuần).
// Calo = tổng 3 chất (calcMacro.manualActive), app chỉ hiện số gợi ý để so. Lưu vào profile.macroManual.
// Hết hạn → MacroPhaseEndSheet hỏi về số app tự tính / gia hạn 2 tuần.
import { useState } from "react";
import { createPortal } from "react-dom";
import { DK, dkCard } from "../theme";
import { fmtInt, fmtDec } from "../lib/mobileView";
import { todayVN, addDays, fmtVN } from "../lib/dateVN";
import { FONT, GRAD_BLUE, useLockScroll, useSwipeClose, SheetHandle } from "./ui";

const sec = { display: "block", padding: "16px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const box = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
const chip = (on) => ({ height: 34, padding: "0 12px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 700, border: `1.5px solid ${on ? "#FFFFFF" : DK.chipLine}`, background: on ? "#FFFFFF" : DK.chip, color: on ? "#0040E0" : DK.t1 });
const btn = { flex: 1, height: 48, borderRadius: 14, fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" };
export const PHASE_NAME = { app: "Tự đặt", mini_cut: "Mini cut", high_pro: "Nhiều đạm", custom: "Tự đặt" };

const r5 = (v) => Math.max(0, Math.round(v / 5) * 5);
// Mẫu nhanh: số khởi đầu, người dùng sửa tiếp được
export function presetOf(id, macro, kg) {
  const m = macro || {};
  const w = Number(kg) || 65;
  if (id === "mini_cut") return { p: r5(w * 2.6), f: r5(w * 1.2), c: 0, cRest: 0 };
  if (id === "high_pro") {
    const p = r5((m.protein || w * 2) + w * 0.4);
    const drop = p - (m.protein || 0); // gam đạm thêm → bớt đúng chừng ấy gam tinh bột (cùng 4 kcal/g)
    return { p, f: m.fat || r5(w), c: Math.max(0, (m.carb || 0) - drop), cRest: Math.max(0, (m.carbRest ?? m.carb ?? 0) - drop) };
  }
  return { p: m.protein || 0, f: m.fat || 0, c: m.carb || 0, cRest: m.carbRest ?? m.carb ?? 0 };
}

function Num({ id, label, sub, value, onChange, warn }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 54, borderBottom: `1px solid ${DK.line}` }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: DK.t3 }}>{sub}</span>
      </span>
      <span style={{ width: 104, height: 40, borderRadius: 10, background: DK.field, border: `1px solid ${warn ? "rgba(252,211,77,0.7)" : DK.fieldLine}`, display: "flex", alignItems: "center", padding: "0 10px", gap: 4 }}>
        <input data-testid={`mm-${id}`} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
          style={{ flex: 1, minWidth: 0, width: "100%", background: "transparent", border: "none", outline: "none", color: DK.t1, fontFamily: "inherit", fontSize: 17, fontWeight: 800, textAlign: "right" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3 }}>g</span>
      </span>
    </label>
  );
}

export function MacroManualScreen({ profile, setProfile, macro, onDone, showToast }) {
  const today = todayVN();
  const mm = profile?.macroManual || {};
  const noEx = (profile?.exerciseType || "gym") === "none";
  const kg = profile?.kg;
  // Số gợi ý của app (không tính phần tự nhập)
  const autoCal = macro?.manual ? macro.autoCal : macro?.calTarget;
  const autoCalRest = macro?.manual ? macro.autoCalRest : macro?.calRest;
  const start = mm.p != null ? { p: mm.p, f: mm.f, c: mm.c, cRest: mm.cRest ?? mm.c } : presetOf("app", macro?.manual ? macro.auto : macro, kg);
  const [preset, setPreset] = useState(mm.preset || "app");
  const [v, setV] = useState({ p: String(start.p ?? ""), f: String(start.f ?? ""), c: String(start.c ?? ""), cRest: String(start.cRest ?? "") });
  const [mode, setMode] = useState(mm.until ? "until" : mm.p != null ? "always" : "until");
  const [until, setUntil] = useState(mm.until && mm.until >= today ? mm.until : addDays(today, 6 * 7 - 1));
  const n = (x) => Math.max(0, Number(x) || 0);
  const calTrain = n(v.p) * 4 + n(v.c) * 4 + n(v.f) * 9;
  const calRest = n(v.p) * 4 + n(noEx ? v.c : v.cRest) * 4 + n(v.f) * 9;
  const floor = macro?.calFloor || 1200;
  const lowCal = calTrain < floor || (!noEx && calRest < floor);
  const lowP = kg && n(v.p) < kg * 1;
  const weeks = Math.max(1, Math.round((Date.parse(until) - Date.parse(today)) / 86400000 / 7));
  const ok = v.p !== "" && v.f !== "" && v.c !== "" && (noEx || v.cRest !== "") && calTrain > 0 && (mode === "always" || until >= today);

  const pick = (id) => {
    setPreset(id);
    const s = presetOf(id, macro?.manual ? macro.auto : macro, kg);
    setV({ p: String(s.p), f: String(s.f), c: String(s.c), cRest: String(s.cRest) });
  };
  const save = () => {
    if (!ok) return;
    const next = { on: true, preset, p: n(v.p), f: n(v.f), c: n(v.c), cRest: noEx ? n(v.c) : n(v.cRest), until: mode === "until" ? until : null, since: mm.on ? mm.since || today : today, endSeen: null };
    setProfile({ ...profile, macroManual: next });
    showToast?.({ text: `Đã lưu: ${fmtInt(calTrain)} kcal${noEx ? "" : " ngày tập"}${mode === "until" ? ` đến ${fmtVN(until)}` : ""}` });
    onDone?.();
  };
  const backToAuto = () => {
    setProfile({ ...profile, macroManual: { ...mm, on: false } });
    showToast?.({ text: "Đã về số app tự tính" });
    onDone?.();
  };

  return (
    <div data-testid="mm-screen" style={{ paddingBottom: 110, color: DK.t1 }}>
      <div role="group" aria-label="Mẫu nhanh" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 12px 0 12px" }}>
        {[["app", "Như app tính"], ["mini_cut", "Mini cut · bỏ tinh bột"], ["high_pro", "Nhiều đạm"]].map(([id, t]) => (
          <button key={id} type="button" data-testid={`mm-preset-${id}`} aria-pressed={preset === id} onClick={() => pick(id)} className="tap" style={chip(preset === id)}>{t}</button>
        ))}
      </div>

      <span style={sec}>SỐ MỖI NGÀY</span>
      <div style={box}>
        <Num id="p" label="Đạm" sub={kg && n(v.p) ? `4 kcal / g · ${fmtDec(Math.round(n(v.p) / kg * 10) / 10)} g/kg` : "4 kcal / g"} value={v.p} onChange={(x) => { setPreset("custom"); setV({ ...v, p: x }); }} warn={lowP} />
        <Num id="f" label="Béo" sub="9 kcal / g" value={v.f} onChange={(x) => { setPreset("custom"); setV({ ...v, f: x }); }} />
        <Num id="c" label={noEx ? "Tinh bột" : "Tinh bột ngày tập"} sub="4 kcal / g · được để 0" value={v.c} onChange={(x) => { setPreset("custom"); setV({ ...v, c: x }); }} />
        {!noEx && (
          <div style={{ borderBottom: "none" }}>
            <Num id="crest" label="Tinh bột ngày nghỉ" sub={v.cRest === v.c ? "Giống ngày tập" : "4 kcal / g"} value={v.cRest} onChange={(x) => { setPreset("custom"); setV({ ...v, cRest: x }); }} />
          </div>
        )}
      </div>

      <div data-testid="mm-sum" data-cal={calTrain} style={{ ...dkCard, margin: "12px 12px 0 12px", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>{noEx ? "Tổng tự cộng" : "Ngày tập"}</span>
          <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 900 }}>{fmtInt(calTrain)} <span style={{ fontSize: 12, fontWeight: 700 }}>kcal</span></span>
        </div>
        {!noEx && <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Ngày nghỉ</span><span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800 }}>{fmtInt(calRest)} kcal</span></div>}
        {autoCal > 0 && <span data-testid="mm-compare" style={{ fontSize: 12.5, fontWeight: 600, color: DK.t2 }}>App gợi ý <b style={{ color: DK.t1 }}>{fmtInt(autoCal)} kcal</b>{noEx ? "" : ` (nghỉ ${fmtInt(autoCalRest)})`} · bạn đặt <b style={{ color: DK.t1 }}>{calTrain - autoCal >= 0 ? "+" : "−"}{fmtInt(Math.abs(calTrain - autoCal))}</b></span>}
      </div>
      {(lowCal || lowP) && (
        <div data-testid="mm-warn" role="status" style={{ margin: "12px 12px 0 12px", padding: "10px 12px", borderRadius: 12, background: "rgba(245,158,11,0.18)", border: "1px solid rgba(252,211,77,0.4)", color: DK.amber, fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>
          {lowCal ? `Thấp hơn mức tối thiểu an toàn ${fmtInt(floor)} kcal/ngày cho bạn.` : "Đạm dưới 1 g/kg dễ mất cơ khi ăn thiếu."} Vẫn lưu được, nhưng nên hỏi HLV hoặc chuyên gia dinh dưỡng.
        </div>
      )}

      <span style={sec}>ÁP DỤNG</span>
      <div style={{ ...box, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div role="group" aria-label="Áp dụng" style={{ display: "flex", gap: 8 }}>
          <button type="button" data-testid="mm-always" aria-pressed={mode === "always"} onClick={() => setMode("always")} className="tap" style={chip(mode === "always")}>Luôn luôn</button>
          <button type="button" data-testid="mm-until" aria-pressed={mode === "until"} onClick={() => setMode("until")} className="tap" style={chip(mode === "until")}>Đến ngày</button>
        </div>
        {mode === "until" && (
          <label style={{ display: "flex", alignItems: "center", minHeight: 40, fontSize: 14, fontWeight: 600, gap: 10 }}>
            <span style={{ flex: 1 }}>Đến hết</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: DK.t2 }}>{weeks} tuần</span>
            <input data-testid="mm-date" type="date" value={until} min={today} onChange={(e) => e.target.value && setUntil(e.target.value)}
              style={{ height: 36, borderRadius: 10, border: `1px solid ${DK.fieldLine}`, background: DK.field, color: DK.t1, fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 8px", colorScheme: "dark" }} />
          </label>
        )}
        <span style={{ fontSize: 12, color: DK.t3, lineHeight: 1.45 }}>Trong thời gian này app dùng đúng số bạn đặt cho Hôm nay, chụp ảnh, ghi bữa, thực đơn AI và không tự chỉnh mỗi tuần.{mode === "until" ? " Hết hạn sẽ hỏi bạn về số app tự tính hay gia hạn." : ""}</span>
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 14px) 12px", display: "flex", gap: 10, background: "linear-gradient(180deg, rgba(1,27,55,0) 0%, rgba(1,27,55,0.92) 35%)" }}>
        {mm.on
          ? <button type="button" data-testid="mm-auto" onClick={backToAuto} className="tap" style={{ ...btn, background: DK.chip, border: `1px solid ${DK.fieldLine}`, color: DK.t1 }}>Về app tự tính</button>
          : <button type="button" data-testid="mm-cancel" onClick={onDone} className="tap" style={{ ...btn, background: DK.chip, border: `1px solid ${DK.fieldLine}`, color: DK.t1 }}>Huỷ</button>}
        <button type="button" data-testid="mm-save" disabled={!ok} onClick={save} className="tap" style={{ ...btn, background: "#FFFFFF", border: "none", color: "#0040E0", opacity: ok ? 1 : 0.5 }}>Lưu</button>
      </div>
    </div>
  );
}

// Hết giai đoạn: hiện 1 lần (macroManual.endSeen) — về số app tự tính hoặc gia hạn 2 tuần
export function MacroPhaseEndSheet({ mm, autoCal, onAuto, onExtend }) {
  useLockScroll(true);
  const sw = useSwipeClose(onAuto);
  const name = PHASE_NAME[mm?.preset] || "Tự đặt";
  const wk = mm?.since && mm?.until ? Math.max(1, Math.round((Date.parse(mm.until) - Date.parse(mm.since)) / 86400000 / 7)) : null;
  const b = { height: 46, borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" };
  return createPortal(
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="mm-end-sheet" role="dialog" aria-modal="true" aria-label="Hết giai đoạn tự đặt macro" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <SheetHandle />
        <span style={{ fontSize: 18, fontWeight: 900 }}>Xong {wk ? `${wk} tuần ` : ""}{name.toLowerCase() === "tự đặt" ? "tự đặt macro" : name}</span>
        <span style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5 }}>Từ hôm nay app quay về số tự tính{autoCal ? `: ${fmtInt(autoCal)} kcal ngày tập` : ""}. Bạn muốn giữ số tự đặt thêm thì gia hạn.</span>
        <button type="button" data-testid="mm-end-auto" onClick={onAuto} className="tap" style={{ ...b, background: GRAD_BLUE, color: "#FFFFFF" }}>Về số app tự tính</button>
        <button type="button" data-testid="mm-end-extend" onClick={onExtend} className="tap" style={{ ...b, background: "#F1F5F9", color: "#475569" }}>Gia hạn thêm 2 tuần</button>
      </div>
    </div>,
    document.body,
  );
}
