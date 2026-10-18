// Bản vẽ 133b + 133e (18/10) — khách giảm cân: Đổi món (món calo gần bằng lấy từ kho món, KHÔNG gọi AI) và Món bạn không ăn.
import { useState, useMemo } from "react";
import { FONT, GRAD_BLUE, Icon, SheetHandle, useLockScroll, useSwipeClose } from "./ui";
import { swapOptions } from "../lib/aiMenuService";
import { itemName, fmtInt } from "../lib/mobileView";
import { AVOID_CHIPS, avoidList, hasAvoid, toggleAvoid, addAvoid } from "../lib/lossMenu";

const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function Sheet({ testid, label, title, sub, onClose, children }) {
  useLockScroll(true);
  const sw = useSwipeClose(onClose);
  return (
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid={testid} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", maxHeight: "92dvh", overflowY: "auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        <Head title={title} sub={sub} onClose={sw.close} />
        {children}
      </div>
    </div>
  );
}

function Head({ title, sub, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 900 }}>{title}</span>
        {sub && <span style={{ fontSize: 13, color: "#64748B", lineHeight: 1.45 }}>{sub}</span>}
      </span>
      <button onClick={onClose} aria-label="Đóng" style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "#F1F5F9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.close(16)}</button>
    </div>
  );
}

const primaryBtn = (on) => ({ height: 52, borderRadius: 14, border: "none", background: on ? GRAD_BLUE : "#E2E8F0", color: on ? "#FFFFFF" : "#64748B", fontFamily: "inherit", fontSize: 15, fontWeight: 900 });

// 133b — items: món của bữa; food: món đang chọn để đổi (bữa nhiều món → chip chọn món)
export function SwapSheet({ mealName, mealId, items, food, macro, dayType, onPick, onNever, onEdit, onClose }) {
  const list = (items || []).filter((i) => i && i.food);
  // Mặc định đổi món chính của bữa (nhiều calo nhất: phở / món mặn), không phải cơm hay rau
  const main = [...list].sort((a, b) => (Number(b.cal) || 0) - (Number(a.cal) || 0))[0];
  const [cur, setCur] = useState(() => (list.some((i) => i.food === food) ? food : main?.food) || null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const curItem = list.find((i) => i.food === cur) || null;
  const curName = curItem ? capFirst(itemName(curItem)) : "món";
  const opts = useMemo(() => {
    if (!cur) return [];
    try { return swapOptions({ meals: [{ meal_id: mealId, items: list }] }, mealId, cur, macro, dayType).options.slice(0, 4); } catch (e) { return []; }
  }, [cur, mealId, macro, dayType]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = opts[sel] || null;
  const mealCal = Math.round(list.reduce((s, i) => s + (Number(i.cal) || 0), 0));
  const apply = async (never) => {
    if (busy) return;
    setBusy(true);
    if (never) await onNever(itemName(curItem || {}));
    if (pick) {
      const m = (pick.template?.meals || []).find((x) => x.meal_id === mealId);
      if (m) await onPick(m.items, capFirst(pick.name));
    }
    setBusy(false);
    onClose();
  };
  return (
    <Sheet testid="swap-sheet" label={`Đổi món ${mealName}`} title={`Đổi ${curName}`} sub={`${mealName} · ${fmtInt(mealCal)} kcal — các món dưới đây giữ bữa gần bằng calo`} onClose={onClose}>
      {list.length > 1 && (
        <div role="group" aria-label="Đổi món nào" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {list.map((i) => {
            const on = i.food === cur;
            return <button key={i.food} data-testid="swap-item" aria-pressed={on} onClick={() => { setCur(i.food); setSel(0); }}
              style={{ height: 36, padding: "0 12px", borderRadius: 18, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: on ? 900 : 700, background: on ? "#0062F0" : "#F1F5F9", color: on ? "#FFFFFF" : "#334155" }}>{capFirst(itemName(i))}</button>;
          })}
        </div>
      )}
      {opts.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {opts.map((o, i) => {
            const on = i === sel;
            return (
              <button key={o.key} data-testid="swap-opt" aria-pressed={on} onClick={() => setSel(i)}
                style={{ minHeight: 60, borderRadius: 14, border: "none", fontFamily: "inherit", textAlign: "left", background: on ? "#EEF4FF" : "#F6F8FC", boxShadow: on ? "inset 0 0 0 2px #0062F0" : "none", display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", color: "#0F172A" }}>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{capFirst(o.name)}</span>
                  <span style={{ fontSize: 12.5, color: "#64748B" }}>{fmtInt(o.gram)} g{o.carb ? ` · ${o.carb.name.toLowerCase()} ${fmtInt(o.carb.gram)} g` : ""}</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 900 }}>{fmtInt(o.mealCal)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>{o.diff === 0 ? "bằng bữa cũ" : `${o.diff > 0 ? "+" : "−"}${fmtInt(Math.abs(o.diff))} kcal`}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div data-testid="swap-empty" style={{ borderRadius: 14, background: "#F6F8FC", padding: "14px", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
          Chưa có món thay hợp calo cho {curName.toLowerCase()}. Bạn có thể tự chọn món khác.
        </div>
      )}
      {opts.length
        ? <button data-testid="swap-apply" disabled={busy || !pick} onClick={() => apply(false)} style={primaryBtn(!!pick)}>{busy ? "Đang đổi…" : `Đổi sang ${capFirst(pick?.name || "")}`}</button>
        : <button data-testid="swap-edit" onClick={() => { onClose(); onEdit(); }} style={primaryBtn(true)}>Tự chọn món khác</button>}
      {curItem && (
        <button data-testid="swap-never" disabled={busy} onClick={() => apply(true)} style={{ alignSelf: "center", height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#DC2626", padding: "0 8px" }}>
          Không gợi ý {curName.toLowerCase()} nữa
        </button>
      )}
    </Sheet>
  );
}

// 133e — Món bạn không ăn (chip + ô gõ món khác); lưu vào ô "avoid" chung của thực đơn
export function AvoidSheet({ avoid, onSave, onClose }) {
  const [text, setText] = useState(avoid || "");
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const extra = avoidList(text).filter((w) => !AVOID_CHIPS.some((c) => c.toLowerCase() === w.toLowerCase()));
  const save = async () => {
    if (busy) return;
    setBusy(true);
    const final = other.trim() ? avoidList(other).reduce((t, w) => addAvoid(t, w), text) : text;
    await onSave(final);
    setBusy(false);
    onClose();
  };
  const chip = (w, on, onClick, testid) => (
    <button key={w} data-testid={testid} aria-pressed={on} onClick={onClick}
      style={{ height: 40, padding: "0 14px", borderRadius: 20, border: "none", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: on ? 900 : 700, background: on ? "#0062F0" : "#F1F5F9", color: on ? "#FFFFFF" : "#334155" }}>
      {on && Icon.check(14, 2.6)}{w}
    </button>
  );
  return (
    <Sheet testid="avoid-sheet" label="Món bạn không ăn" title="Món bạn không ăn" sub="Thực đơn từ ngày mai sẽ tránh các món này" onClose={onClose}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {AVOID_CHIPS.map((w) => chip(w, hasAvoid(text, w), () => setText((t) => toggleAvoid(t, w)), `avoid-chip-${w}`))}
        {extra.map((w) => chip(w, true, () => setText((t) => toggleAvoid(t, w)), "avoid-extra"))}
      </div>
      <input data-testid="avoid-other" value={other} onChange={(e) => setOther(e.target.value.slice(0, 80))} placeholder="Món khác… (VD: sầu riêng)" aria-label="Món khác"
        style={{ height: 48, borderRadius: 14, border: "none", background: "#F1F5F9", padding: "0 14px", fontFamily: "inherit", fontSize: 15, color: "#0F172A", outline: "none", boxSizing: "border-box" }} />
      <button data-testid="avoid-save" disabled={busy} onClick={save} style={primaryBtn(true)}>{busy ? "Đang lưu…" : "Lưu"}</button>
    </Sheet>
  );
}
