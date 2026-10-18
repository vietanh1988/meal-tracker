// Cân hôm nay (bản vẽ 115, 17/10): bấm thẻ Cân nặng ở Hôm nay → sheet nổi ngay đó (không nhảy sang Tiến độ).
// Số điền sẵn (hôm nay đã cân → số hôm nay; chưa → lần trước; chưa cân lần nào → cân nặng hồ sơ), −/+ mỗi lần 0,1 kg
// (giữ để chạy nhanh) hoặc gõ số; chênh lệch so với lần trước hiện ngay. Lưu = 1 lần cân / ngày (useWeightLog.addWeight).
import { useState, useRef, useEffect } from "react";
import { Icon, FONT, GRAD_BLUE, SR, useLockScroll, useSwipeClose, SheetHandle } from "./ui";
import { fmtKg, fmtDec, weekdayFull, deltaGood } from "../lib/mobileView";
import { fmtVN } from "../lib/dateVN";
import { parseKg } from "../lib/weightMath";

const round1 = (n) => Math.round(n * 10) / 10;
const stepBtn = { width: 52, height: 52, borderRadius: 26, border: "none", background: "#EEF4FF", color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, padding: 0, flexShrink: 0, fontFamily: "inherit", touchAction: "manipulation", userSelect: "none" };

export function WeightSheet({ today, weightLog, profileKg, goalKg, startKg, onSave, onClose, onChart }) {
  useLockScroll(true);
  const log = weightLog || [];
  const todayRow = log.find((w) => w.logged_date === today) || null;
  const prev = [...log].reverse().find((w) => w.logged_date < today) || null;
  const init = todayRow?.kg ?? prev?.kg ?? (Number(profileKg) || null);
  const [val, setVal] = useState(init ? fmtKg(init) : "");
  const [busy, setBusy] = useState(false);
  const kg = parseKg(val);
  const inputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select?.(); }, 150); return () => clearTimeout(t); }, []);

  // −/+: bấm 1 lần = 0,1 kg; giữ = chạy nhanh. Bàn phím (Enter/Space) đi qua onClick (detail = 0).
  const cur = useRef(kg);
  cur.current = kg;
  const step = (d) => setVal((v) => { const base = parseKg(v) ?? cur.current ?? init ?? 60; return fmtKg(Math.min(250, Math.max(30, round1(base + d)))); });
  const hold = useRef(null);
  const stop = () => { clearTimeout(hold.current?.t); clearInterval(hold.current?.i); hold.current = null; };
  useEffect(() => stop, []);
  const press = (d) => (e) => {
    if (e.button != null && e.button !== 0) return;
    step(d);
    stop();
    hold.current = { t: setTimeout(() => { hold.current = { ...hold.current, i: setInterval(() => step(d), 90) }; }, 400) };
  };
  const stepProps = (d) => ({ onPointerDown: press(d), onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop, onClick: (e) => { if (e.detail === 0) step(d); }, onContextMenu: (e) => e.preventDefault() });

  const delta = kg != null && prev ? round1(kg - prev.kg) : null;
  const good = delta ? deltaGood(delta, goalKg, startKg) : null;
  const pill = delta == null ? null
    : { text: `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${fmtDec(Math.abs(delta))} kg so với lần trước (${fmtVN(prev.logged_date)})`,
      bg: good == null ? "#F1F5F9" : good ? "rgba(5,150,105,0.12)" : "rgba(245,158,11,0.14)", c: good == null ? "#475569" : good ? "#047857" : "#B45309" };

  const save = async () => {
    if (kg == null || busy) return;
    setBusy(true);
    const ok = await onSave(kg, prev);
    setBusy(false);
    if (ok !== false) onClose();
  };

  const sw = useSwipeClose(onClose);
  return (
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="weight-sheet" role="dialog" aria-modal="true" aria-label="Cân hôm nay" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 16px) 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, fontWeight: 900 }}>Cân hôm nay</span>
            <span data-testid="weight-sub" style={{ fontSize: 12, color: "#64748B" }}>{weekdayFull(today)} {fmtVN(today)} · {prev ? `lần trước ${fmtKg(prev.kg)} kg (${fmtVN(prev.logged_date)})` : "lần cân đầu tiên"}</span>
          </span>
          <button onClick={sw.close} aria-label="Đóng" style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "#F1F5F9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.close(16)}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <button data-testid="weight-minus" aria-label="Bớt 0,1 kg" {...stepProps(-0.1)} style={stepBtn}>−</button>
          <label style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={SR}>Cân nặng hôm nay (kg)</span>
            <input ref={inputRef} data-testid="weight-input" type="text" inputMode="decimal" enterKeyHint="done" value={val} placeholder="0,0"
              onChange={(e) => setVal(e.target.value.replace(/[^\d.,]/g, "").replace(/\./g, ",").slice(0, 5))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              style={{ width: `${Math.max(3, val.length) * 0.62 + 0.2}em`, minWidth: 0, padding: 0, border: "none", borderRadius: 8, background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 48, fontWeight: 900, letterSpacing: -1, color: kg == null && val ? "#DC2626" : "#0F172A", outline: "none", boxSizing: "content-box" }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#64748B" }}>kg</span>
          </label>
          <button data-testid="weight-plus" aria-label="Thêm 0,1 kg" {...stepProps(0.1)} style={stepBtn}>+</button>
        </div>

        {pill
          ? <span data-testid="weight-delta" style={{ alignSelf: "center", height: 28, padding: "0 12px", borderRadius: 14, background: pill.bg, color: pill.c, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center" }}>{pill.text}</span>
          : kg == null && val ? <span style={{ alignSelf: "center", fontSize: 13, fontWeight: 700, color: "#DC2626" }}>Cân nặng 30–250 kg</span> : null}

        <button data-testid="weight-save" disabled={kg == null || busy} onClick={save}
          style={{ height: 52, borderRadius: 14, border: "none", background: kg == null ? "#E2E8F0" : GRAD_BLUE, color: kg == null ? "#64748B" : "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {Icon.check(18)}{busy ? "Đang lưu…" : kg == null ? "Nhập cân nặng" : `Lưu ${fmtKg(kg)} kg`}
        </button>
        {onChart && <button data-testid="weight-chart-link" onClick={onChart} style={{ alignSelf: "center", height: 36, padding: "0 12px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#0062F0" }}>Xem biểu đồ ›</button>}
      </div>
    </div>
  );
}
