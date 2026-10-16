// Màn 3 · Sửa bữa đã tick (đã chốt): danh sách món + ô gram, xoá món, + Thêm món / chụp,
// nút "Đã ăn", menu ⋯ (chuyển sang ngày/bữa khác, xoá bữa), thanh dưới tổng kcal + macro + Lưu.
// 16/10 (bản vẽ 88): dòng tóm tắt icon bữa + tổng kcal; món có ĐƠN VỊ −/+ (lib/portion.js), chạm đơn vị đổi qua gram.
// 14/10: "Chuyển sang ngày / bữa khác" mở bảng chọn ngày (lùi 7 ngày + ngày mai) và bữa; bữa đích có món thì GỘP (hỏi trước ở MobileApp).
import { useState, useEffect, useRef } from "react";
import { SubPage, Icon, GRAD_BLUE, SR, useSwipeClose, SheetHandle } from "./ui";
import { itemName, fmtInt, fmtDec, weekdayFull } from "../lib/mobileView";
import { portionOf, stepPortion, setPortion, toggleUnit, hasUnit } from "../lib/portion";
import { MealIcon } from "./icons";
import { sumItems } from "../lib/mealMath";
import { fmtVN, addDays, friendlyDate } from "../lib/dateVN";
import { appConfirm } from "../lib/dialog";

// Mỗi dòng: món hiện tại + chữ đang gõ trong ô số lượng (theo đơn vị đang hiện)
const toRow = (it) => ({ item: it, text: portionOf(it).label });
const rowOk = (r) => r.text !== "" && Number(String(r.text).replace(",", ".")) > 0 && Number(r.item.gram) > 0;

export function EditMealScreen({ date, today, mealId, mealName, items, eaten, dayType, onSave, onDelete, onMove, onAddPick, pendingPick, onPhoto, onClose, mealOptions = [] }) {
  const [rows, setRows] = useState(() => (items || []).map(toRow));
  const [isEaten, setIsEaten] = useState(!!eaten);
  const [menu, setMenu] = useState(false);
  const [moving, setMoving] = useState(false);
  const moveSw = useSwipeClose(() => setMoving(false));
  const [toDate, setToDate] = useState(date);
  const [toMeal, setToMeal] = useState(mealId);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Món chọn từ sheet "Thêm món" đưa vào bản nháp
  const seenPick = useRef(pendingPick);
  useEffect(() => {
    if (pendingPick === seenPick.current) return;
    seenPick.current = pendingPick;
    const add = pendingPick ? (pendingPick.items || (pendingPick.item ? [pendingPick.item] : [])) : [];
    if (add.length) { setRows((r) => [...r, ...add.map(toRow)]); setDirty(true); }
  }, [pendingPick]);

  const current = rows.filter(rowOk).map((r) => r.item);
  const tot = sumItems(current);
  const setQty = (i, v) => { const t = v.replace(/[^0-9.,]/g, "").slice(0, 5); setRows((r) => r.map((x, j) => (j === i ? { item: Number(t.replace(",", ".")) > 0 ? setPortion(x.item, t) : x.item, text: t } : x))); setDirty(true); };
  const stepAt = (i, dir) => { setRows((r) => r.map((x, j) => { if (j !== i) return x; const it = stepPortion(x.item, dir); return { item: it, text: portionOf(it).label }; })); setDirty(true); };
  const unitAt = (i) => { setRows((r) => r.map((x, j) => { if (j !== i) return x; const it = toggleUnit(x.item); return { item: it, text: portionOf(it).label }; })); };
  const remove = (i) => { setRows((r) => r.filter((_, j) => j !== i)); setDirty(true); };

  const save = async () => {
    if (busy) return;
    if (current.length === 0) {
      if (!(await appConfirm(`Bữa không còn món nào. Xoá ${mealName.toLowerCase()} khỏi ${friendlyDate(date).toLowerCase()}?`))) return;
      setBusy(true); const ok = await onDelete(); setBusy(false); if (ok) onClose();
      return;
    }
    setBusy(true);
    const ok = await onSave(current, isEaten);
    setBusy(false);
    if (ok) onClose();
  };
  const back = async () => {
    if (dirty && !(await appConfirm("Bỏ các thay đổi chưa lưu?"))) return;
    onClose();
  };
  const del = async () => {
    setMenu(false);
    if (!(await appConfirm(`Xoá ${mealName.toLowerCase()} ${friendlyDate(date).toLowerCase()}?`))) return;
    setBusy(true); const ok = await onDelete(); setBusy(false); if (ok) onClose();
  };
  const move = async () => {
    if (dirty && !(await appConfirm("Bữa đang có thay đổi chưa lưu. Chuyển bữa sẽ bỏ các thay đổi đó, tiếp tục?"))) return;
    setBusy(true); const ok = await onMove(toDate, toMeal); setBusy(false);
    if (ok) { setMoving(false); onClose(); }
  };
  // Ngày chọn được: 7 ngày gần nhất + ngày mai (khớp với lúc ghi bữa)
  const moveDates = [1, 0, -1, -2, -3, -4, -5, -6].map((n) => addDays(today, n));
  const same = toDate === date && toMeal === mealId;


  const chip = (on, extra = {}) => ({ height: 40, padding: "0 12px", borderRadius: 10, border: "none", background: on ? "#0062F0" : "#EEF4FF", color: on ? "#FFFFFF" : "#0F172A", fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 600, whiteSpace: "nowrap", ...extra });
  const moveSheet = moving && (
    <div onClick={() => setMoving(false)} style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div ref={moveSw.ref} {...moveSw.swipe} data-testid="move-sheet" role="dialog" aria-modal="true" aria-label="Chuyển bữa" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "10px 14px calc(env(safe-area-inset-bottom, 0px) + 18px) 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        <span style={{ fontSize: 18, fontWeight: 900 }}>Chuyển {mealName.toLowerCase()}</span>
        <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.45 }}>Ghi nhầm ngày hoặc nhầm bữa thì chọn lại bên dưới. Nếu bữa đích đã có món, các món sẽ được gộp thêm vào.</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>SANG NGÀY</span>
        <div role="group" aria-label="Chọn ngày" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
          {moveDates.map((d) => <button key={d} data-testid={`move-date-${d}`} aria-pressed={toDate === d} onClick={() => setToDate(d)} style={chip(toDate === d, { display: "flex", flexDirection: "column", justifyContent: "center", height: 48 })}>{(() => { const f = friendlyDate(d, today); const rel = !/\d{2}\/\d{2}/.test(f); return <><span>{rel ? f : f.split(" ")[0]}</span><span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{fmtVN(d)}</span></>; })()}</button>)}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>SANG BỮA</span>
        <div role="group" aria-label="Chọn bữa" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {mealOptions.map((m) => <button key={m.id} data-testid={`move-meal-${m.id}`} aria-pressed={toMeal === m.id} onClick={() => setToMeal(m.id)} style={chip(toMeal === m.id)}>{m.name}</button>)}
        </div>
        <button data-testid="move-go" disabled={same || busy} onClick={move} style={{ height: 50, borderRadius: 14, border: "none", background: same ? "#E2E8F0" : GRAD_BLUE, color: same ? "#64748B" : "#FFFFFF", opacity: 1, fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>
          {busy ? "Đang chuyển…" : same ? "Chọn ngày hoặc bữa khác" : `Chuyển sang ${(mealOptions.find((m) => m.id === toMeal)?.name || "").toLowerCase()} · ${friendlyDate(toDate, today).toLowerCase()}`}
        </button>
      </div>
    </div>
  );

  const header = (
    <>
      <button aria-pressed={isEaten} onClick={() => { setIsEaten(!isEaten); setDirty(true); }} style={{ height: 34, padding: "0 12px", borderRadius: 999, border: "none", background: isEaten ? "rgba(5,150,105,0.12)" : "#EEF4FF", color: isEaten ? "#047857" : "#64748B", fontFamily: "inherit", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>{Icon.check(14, 2.8)}{isEaten ? "Đã ăn" : "Chưa ăn"}</button>
      <div style={{ position: "relative" }}>
        <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Thêm tuỳ chọn: chuyển ngày hoặc bữa, xoá bữa" style={{ width: 44, height: 44, borderRadius: 22, border: "none", background: "transparent", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.more(20)}</button>
        {menu && (
          <div role="menu" style={{ position: "absolute", right: 4, top: 46, zIndex: 5, width: 220, background: "#FFFFFF", border: "none", borderRadius: 14, boxShadow: "0 12px 32px rgba(15,23,42,0.16)", padding: 6 }}>
            <button role="menuitem" data-testid="edit-move-open" onClick={() => { setMenu(false); setToDate(date); setToMeal(mealId); setMoving(true); }} className="row-hover" style={menuItem}>Chuyển sang ngày / bữa khác</button>
            <button role="menuitem" data-testid="edit-delete" onClick={del} className="row-hover" style={{ ...menuItem, color: "#DC2626" }}>Xoá bữa</button>
          </div>
        )}
      </div>
    </>
  );

  const footer = (
    <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.94)", borderTop: "1px solid rgba(30,64,175,0.08)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "10px 12px 24px 16px", display: "flex", alignItems: "center", gap: 12, boxSizing: "border-box" }}>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#0062F0" }}>{fmtInt(tot.cal)} kcal</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Đạm {Math.round(tot.p)} · Tinh bột {Math.round(tot.c)} · Béo {Math.round(tot.f)} g</span>
        </span>
        <button onClick={save} disabled={busy} style={{ height: 52, width: 140, borderRadius: 14, background: GRAD_BLUE, color: "#FFFFFF", fontSize: 16, fontWeight: 900, border: "none", fontFamily: "inherit" }}>{busy ? "Đang lưu…" : "Lưu"}</button>
      </div>
    </div>
  );

  return (
    <SubPage title={mealName} subtitle={`${weekdayFull(date)} ${fmtVN(date)} · ${dayType === "rest" ? "Ngày nghỉ" : "Ngày tập"}`} onBack={back} right={header} footer={footer}>
      <div onClick={() => menu && setMenu(false)} style={{ padding: "12px 12px 16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div data-testid="edit-summary" style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 4px 0 4px" }}>
          <MealIcon id={mealId} size={44} />
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, color: "#64748B" }}>{mealName} · {current.length} món</span>
            <span style={{ fontSize: 22, fontWeight: 900 }}>{fmtInt(tot.cal)} kcal</span>
          </span>
        </div>
        <div style={{ background: "#FFFFFF", borderRadius: 20, padding: "0 14px" }}>
          {rows.map((r, i) => {
            const it = r.item;
            const nm = itemName(it);
            const po = portionOf(it);
            const stepBtn = { width: 32, height: 32, borderRadius: 10, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 18, fontWeight: 800, padding: 0, flexShrink: 0, fontFamily: "inherit" };
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 66, borderBottom: "1px solid #EEF2FA" }}>
                <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nm}</span>
                  <span data-testid={`edit-item-macro-${i}`} style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmtInt(it.cal)} kcal · Đ {fmtDec(it.p ?? it.protein)} · TB {fmtDec(it.c ?? it.carb)} · B {fmtDec(it.f ?? it.fat)} g</span>
                </span>
                <button aria-label={`Giảm ${nm.toLowerCase()}`} onClick={() => stepAt(i, -1)} style={stepBtn}>−</button>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 62 }}>
                  <span style={{ height: 32, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", gap: 2, padding: "0 6px" }}>
                    <label style={{ display: "flex" }}>
                      <span style={SR}>{po.mode === "unit" ? `Số ${po.unit}` : "Gram"} {nm.toLowerCase()}</span>
                      <input type="text" inputMode="decimal" value={r.text} onChange={(e) => setQty(i, e.target.value)} onFocus={(e) => e.target.select()}
                        style={{ width: po.mode === "unit" ? 30 : 40, height: 30, background: "transparent", border: "none", textAlign: "right", padding: 0, fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#0F172A", outline: "none" }} />
                    </label>
                    <button disabled={!hasUnit(it)} onClick={() => unitAt(i)} aria-label="Đổi đơn vị" style={{ border: "none", background: "transparent", padding: 0, fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "#0062F0" }}>{po.unit}{hasUnit(it) ? " ▾" : ""}</button>
                  </span>
                  {po.approxG != null && <span style={{ fontSize: 11, color: "#64748B" }}>≈ {fmtInt(po.approxG)} g</span>}
                </span>
                <button aria-label={`Tăng ${nm.toLowerCase()}`} onClick={() => stepAt(i, 1)} style={stepBtn}>+</button>
                <button onClick={() => remove(i)} aria-label={`Xoá ${nm.toLowerCase()}`} style={{ width: 28, height: 40, border: "none", background: "transparent", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(16)}</button>
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ minHeight: 56, display: "flex", alignItems: "center", fontSize: 13, color: "#64748B", borderBottom: "1px solid #EEF2FA" }}>Bữa chưa có món nào.</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 52 }}>
            <button data-testid="edit-add" onClick={onAddPick} style={{ flex: 1, height: 44, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#0062F0", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>{Icon.plus(16)}Thêm món</button>
            {onPhoto && <button onClick={onPhoto} aria-label="Chụp thêm món" style={{ width: 38, height: 38, borderRadius: 12, border: "none", background: "rgba(234,88,12,0.12)", color: "#C2410C", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.camera(17)}</button>}
          </div>
        </div>
      </div>
      {moveSheet}
    </SubPage>
  );
}

const menuItem = { display: "block", width: "100%", textAlign: "left", minHeight: 44, padding: "0 12px", border: "none", background: "transparent", borderRadius: 10, fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#0F172A" };
