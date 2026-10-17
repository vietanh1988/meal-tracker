// Vận động thêm hôm nay (bản vẽ 130a–c, 17/10): dòng ở Hôm nay + sheet chọn nhanh + thẻ bữa phụ khi đã ăn hết bữa.
// Tính calo ở src/lib/activity.js. Tăng cơ cộng hết vào mục tiêu, Duy trì ½, Giảm mỡ không cộng (> 300 kcal mới ½).
import { useState } from "react";
import { Icon, FONT, GRAD_BLUE, useLockScroll, useSwipeClose, SheetHandle } from "./ui";
import { ACTS, MINUTES, actKcal, actOf, actSummary, activityBonus, dayBurn, stepsToMin, SNACKS, DAY_CAP } from "../lib/activity";
import { fmtInt, fmtDec } from "../lib/mobileView";
import { AppIcon, IC_COLOR } from "./icons";

const GREEN = "#047857";
const card = { margin: "14px 12px 0 12px", background: "#FFFFFF", borderRadius: 20, color: "#0F172A" };

// Dòng ở Hôm nay
export function ActivityRow({ items, goal, onOpen, onClear, inline }) {
  const has = (items || []).length > 0;
  const burn = dayBurn(items);
  const bonus = activityBonus(burn, goal);
  // Chưa ghi: hỏi thẳng + giải thích ghi vào thì được gì (theo mục tiêu)
  const emptySub = goal === "bulk" ? "Đi bộ, chạy, đá bóng… nếu có thì ghi vào để app cộng thêm calo cho bạn ăn bù"
    : goal === "maintain" ? "Đi bộ, chạy, đá bóng… nếu có thì ghi vào để app cộng thêm một phần calo"
    : "Đi bộ, chạy, đá bóng… nếu có thì ghi vào — app ghi nhận, giúp bạn giảm nhanh hơn";
  const sub = !has ? emptySub
    : bonus > 0 ? `${actSummary(items)} · +${fmtInt(bonus)} kcal vào mục tiêu`
    : `${actSummary(items)} · đã đốt thêm ~${fmtInt(burn)} kcal 👍 không cần ăn bù`;
  return (
    <div data-testid="activity-row" style={inline ? { padding: "12px 0 0 0", borderTop: "1px solid #EEF2FA", display: "flex", alignItems: "center", gap: 12, color: "#0F172A" } : { ...card, padding: "12px 10px 12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <button onClick={onOpen} data-testid="activity-open" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, border: "none", background: "transparent", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
        <AppIcon name="walk" color={IC_COLOR.activity} size={44} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span data-testid="activity-title" style={{ fontSize: 15, fontWeight: 900 }}>{has ? "Vận động thêm hôm nay" : inline ? "Vận động thêm" : "Hôm nay bạn có vận động thêm không?"}</span>
          <span data-testid="activity-sub" style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.4 }}>{sub}</span>
        </span>
      </button>
      {has
        ? <button data-testid="activity-clear" aria-label="Xoá vận động hôm nay" onClick={onClear} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.close(16)}</button>
        : <button data-testid="activity-add" onClick={onOpen} style={{ height: 34, padding: "0 12px", borderRadius: 17, border: "none", background: "#EEF4FF", color: "#0062F0", fontFamily: "inherit", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>+ Thêm</button>}
    </div>
  );
}

// Bản vẽ 132a: hỏi ở đầu Hôm nay đúng lúc (chiều tối, đã ghi ≥ 2 bữa, chưa trả lời) — Không = ẩn tới mai
export function ActivityAsk({ goal, onYes, onNo }) {
  const sub = goal === "cut" ? "Đi bộ, đá bóng, cầu lông… — có thì ghi vào, app ghi nhận giúp bạn giảm nhanh hơn"
    : "Đi bộ, đá bóng, cầu lông… — có thì app cộng calo vào bữa tối cho bạn";
  return (
    <section data-testid="activity-ask" aria-label="Hỏi vận động thêm" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 12, border: "1.5px solid #A7F3D0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AppIcon name="walk" color={IC_COLOR.activity} size={44} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.3 }}>Hôm nay bạn có vận động thêm không?</span>
          <span style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.4 }}>{sub}</span>
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button data-testid="activity-ask-no" onClick={onNo} style={{ flex: 1, height: 44, borderRadius: 14, border: "none", background: "#F1F5F9", color: "#334155", fontFamily: "inherit", fontSize: 14, fontWeight: 900 }}>Không</button>
        <button data-testid="activity-ask-yes" onClick={onYes} style={{ flex: 1.4, height: 44, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 900 }}>Có, ghi vào</button>
      </div>
    </section>
  );
}

// Sheet chọn nhanh
export function ActivitySheet({ kg, goal, items, baseTarget, onSave, onClose }) {
  useLockScroll(true);
  const sw = useSwipeClose(onClose);
  const [type, setType] = useState("walk");
  const [mode, setMode] = useState("min");
  const [min, setMin] = useState(30);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const minutes = mode === "steps" ? stepsToMin(custom) : custom !== "" ? Number(custom) || 0 : min;
  const kcal = actKcal(type, minutes, kg);
  const list = items || [];
  const total = Math.min(DAY_CAP, dayBurn(list) + kcal);
  const bonus = activityBonus(total, goal);
  const note = goal === "bulk" ? `Tăng cơ: cộng vào mục tiêu hôm nay → ${fmtInt(baseTarget + bonus)} kcal, dồn vào bữa còn lại.`
    : goal === "maintain" ? `Duy trì: cộng ½ vào mục tiêu → ${fmtInt(baseTarget + bonus)} kcal.`
    : bonus > 0 ? `Giảm mỡ: vận động nhiều nên cộng ½ → ${fmtInt(baseTarget + bonus)} kcal, đỡ đói.` : "Giảm mỡ: không cộng vào mục tiêu — phần đốt thêm giúp bạn giảm nhanh hơn.";
  const add = async () => {
    if (busy || minutes <= 0 || kcal <= 0) return;
    setBusy(true);
    const ok = await onSave([...list, { id: `${Date.now()}`, type, min: minutes, kcal }]);
    setBusy(false);
    if (ok !== false) onClose();
  };
  const remove = (id) => onSave(list.filter((i) => i.id !== id));
  const chip = (on) => ({ height: 40, borderRadius: 12, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 900 : 700, background: on ? "#0062F0" : "#F1F5F9", color: on ? "#FFFFFF" : "#334155" });
  return (
    <div className="fpm" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="activity-sheet" role="dialog" aria-modal="true" aria-label="Vận động thêm hôm nay" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", maxHeight: "92dvh", overflowY: "auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 900 }}>Vận động thêm hôm nay</span>
          <button onClick={onClose} aria-label="Đóng" style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "#F1F5F9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(16)}</button>
        </div>
        {list.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map((i) => (
              <div key={i.id} data-testid="activity-item" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 4px 0 12px", borderRadius: 12, background: "#F6F8FC", fontSize: 13.5 }}>
                <span style={{ flex: 1 }}>{actOf(i.type).emoji} {actOf(i.type).label} {i.min} phút · {fmtInt(i.kcal)} kcal</span>
                <button aria-label="Xoá" onClick={() => remove(i.id)} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(14)}</button>
              </div>
            ))}
          </div>
        )}
        <div role="group" aria-label="Loại vận động" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {ACTS.map((a) => {
            const on = a.id === type;
            return (
              <button key={a.id} data-testid={`activity-type-${a.id}`} aria-pressed={on} onClick={() => { setType(a.id); if (a.id !== "walk" && mode === "steps") { setMode("min"); setCustom(""); } }}
                style={{ minHeight: 64, borderRadius: 14, border: "none", padding: "8px 4px", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, background: on ? "#EEF4FF" : "#F6F8FC", boxShadow: on ? "inset 0 0 0 2px #0062F0" : "none", color: on ? "#0062F0" : "#334155" }}>
                <span aria-hidden="true" style={{ fontSize: 22 }}>{a.emoji}</span>{a.label}
              </button>
            );
          })}
        </div>
        {type === "walk" && (
          <div role="group" aria-label="Nhập theo" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 3, borderRadius: 999, background: "rgba(15,23,42,0.05)" }}>
            {[["min", "Số phút"], ["steps", "Số bước"]].map(([k, t]) => (
              <button key={k} data-testid={`activity-mode-${k}`} aria-pressed={mode === k} onClick={() => { setMode(k); setCustom(""); }}
                style={{ height: 32, borderRadius: 999, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: mode === k ? 800 : 600, background: mode === k ? "#FFFFFF" : "transparent", color: mode === k ? "#0F172A" : "#64748B" }}>{t}</button>
            ))}
          </div>
        )}
        {mode === "min" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
            {MINUTES.map((m) => <button key={m} data-testid={`activity-min-${m}`} aria-pressed={custom === "" && min === m} onClick={() => { setMin(m); setCustom(""); }} style={chip(custom === "" && min === m)}>{m}</button>)}
            <input data-testid="activity-min-custom" aria-label="Số phút khác" inputMode="numeric" placeholder="Khác" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
              style={{ height: 40, minWidth: 0, borderRadius: 12, border: custom ? "2px solid #0062F0" : "none", background: "#F1F5F9", textAlign: "center", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#0F172A", outline: "none", boxSizing: "border-box" }} />
          </div>
        ) : (
          <label style={{ height: 48, borderRadius: 14, background: "#F1F5F9", display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
            <input data-testid="activity-steps" aria-label="Số bước" inputMode="numeric" placeholder="VD 6000" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#0F172A", outline: "none" }} />
            <span style={{ fontSize: 13, color: "#64748B" }}>bước ≈ {minutes} phút</span>
          </label>
        )}
        <div data-testid="activity-result" data-kcal={kcal} style={{ borderRadius: 14, background: "#ECFDF5", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, color: GREEN, fontWeight: 700 }}>{actOf(type).label} {minutes} phút · {fmtDec(kg)} kg</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: GREEN }}>≈ +{fmtInt(kcal)} kcal</span>
          <span style={{ fontSize: 12.5, color: "#065F46", lineHeight: 1.45 }}>Đã tính thấp cho an toàn. {note}{dayBurn(list) + kcal > DAY_CAP ? ` Mỗi ngày tính tối đa ${DAY_CAP} kcal.` : ""}</span>
        </div>
        <button data-testid="activity-save" onClick={add} disabled={busy || kcal <= 0}
          style={{ height: 52, borderRadius: 14, border: "none", background: kcal > 0 ? GRAD_BLUE : "#E2E8F0", color: kcal > 0 ? "#FFFFFF" : "#64748B", fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>{busy ? "Đang lưu…" : "Thêm vào hôm nay"}</button>
      </div>
    </div>
  );
}

// Bản vẽ 130c: đã ăn hết bữa nhưng còn calo do vận động thêm → gợi ý bữa phụ nhẹ
export function SnackCard({ remain, onPick, onSkip }) {
  const [busy, setBusy] = useState(null);
  return (
    <section data-testid="snack-card" aria-label="Gợi ý bữa phụ" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 6, boxShadow: "inset 0 0 0 1.5px #A7F3D0" }}>
      <span style={{ fontSize: 16, fontWeight: 900 }}>Còn {fmtInt(remain)} kcal từ vận động — thêm bữa phụ nhẹ?</span>
      <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.45 }}>Chọn 1 món, ghi thêm vào bữa tối.</span>
      {SNACKS.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: "1px solid #EEF2FA" }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{s.name}</span>
            <span style={{ fontSize: 12, color: "#64748B" }}>≈ {fmtInt(s.cal)} kcal · Đ {fmtInt(s.p)} g</span>
          </span>
          <button data-testid={`snack-${s.id}`} aria-label={`Ghi ${s.name}`} disabled={!!busy} onClick={async () => { setBusy(s.id); try { await onPick(s); } finally { setBusy(null); } }}
            style={{ width: 36, height: 36, borderRadius: 18, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{busy === s.id ? "…" : "+"}</button>
        </div>
      ))}
      <button data-testid="snack-skip" onClick={onSkip} style={{ alignSelf: "center", height: 34, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#64748B" }}>Không cần, để sau</button>
    </section>
  );
}
