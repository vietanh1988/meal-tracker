// Màn 2 · Ghi bữa (đã chốt) — sheet trượt lên: chọn ngày, chip bữa, ô tìm + nút chụp,
// tab Tìm món | Kiểm tra calo (mở màn CalcCheckScreen), AI gợi ý / Từ thực đơn tuần, danh sách GẦN ĐÂY (ăn lại cả bữa + món hay ăn).
// pickMode: dùng từ Sửa bữa để chọn 1 món đưa về bản nháp (không lưu ngay).
import { useState, useMemo, useRef, useEffect } from "react";
import { Icon, GRAD_ORANGE, SR, useLockScroll, FONT } from "./ui";
import { MEAL_SHORT, searchFoods, itemName, itemPortion, fmtInt } from "../lib/mobileView";
import { fmtVN } from "../lib/dateVN";

// 16/10 (bản vẽ 82–83): nút bữa / + nền xanh nhạt không viền, "Ăn lại" thành khối riêng, khối Kiểm tra calo tím nhạt bỏ viền chấm.
const chip = (on) => ({ flexShrink: 0, height: 36, padding: "0 12px", borderRadius: 12, border: "none", background: on ? "#0062F0" : "#EEF4FF", fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 600, color: on ? "#FFFFFF" : "#334155", whiteSpace: "nowrap" });
const addBtn = (done) => ({ width: 40, height: 40, borderRadius: 20, border: "none", background: done ? "#059669" : "#EEF4FF", color: done ? "#FFFFFF" : "#0062F0", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0, fontFamily: "inherit" });

export function LogMealSheet(p) {
  const { pickMode, date, mealId, mealIds, dateOptions, recentMeals, frequent, foodCache, onClose } = p;
  useLockScroll(true);
  const [q, setQ] = useState("");
  const [done, setDone] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const inputRef = useRef(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (pickMode) setTimeout(() => inputRef.current?.focus(), 150); }, [pickMode]);

  const results = useMemo(() => (q.trim() ? searchFoods(q, foodCache, 30) : null), [q, foodCache]);
  const sameMeal = (recentMeals || []).filter((r) => r.meal_id === mealId).slice(0, 1);
  const otherMeals = pickMode ? [] : (sameMeal.length ? sameMeal : (recentMeals || []).slice(0, 1));

  const flash = (key) => {
    setDone((d) => ({ ...d, [key]: true }));
    timers.current.push(setTimeout(() => setDone((d) => { const n = { ...d }; delete n[key]; return n; }), 1800));
  };
  const add = async (key, fn) => {
    if (busyKey) return;
    setBusyKey(key);
    try { const ok = await fn(); if (ok !== false) flash(key); } finally { setBusyKey(null); }
  };

  const list = results || (frequent || []).map((f) => f.item);
  const shortName = (id) => MEAL_SHORT[id] || id;

  return (
    <div className="fpm" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.5)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div role="dialog" aria-modal="true" aria-label={pickMode ? "Thêm món" : "Ghi bữa"} onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, top: "max(96px, calc(env(safe-area-inset-top, 0px) + 56px))", bottom: 0, maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px 0 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, animation: "fpmSheetUp .2s ease" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#CBD5E1", alignSelf: "center", flexShrink: 0 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px", flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 900 }}>{pickMode ? `Thêm món · ${p.pickTitle || ""}` : "Ghi bữa"}</span>
          {!pickMode && (
            <label style={{ position: "relative", height: 34, padding: "0 12px", borderRadius: 17, border: "none", background: "#EEF4FF", fontSize: 13, fontWeight: 800, color: "#0062F0", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={SR}>Ngày ghi</span>
              {(dateOptions.find((o) => o.value === date) || { label: fmtVN(date) }).label}{Icon.down(14)}
              <select value={date} onChange={(e) => p.onDate(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", fontSize: 16 }}>
                {dateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          )}
          <button onClick={onClose} aria-label="Đóng" style={{ width: 40, height: 40, borderRadius: 20, background: "#F1F5F9", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", border: "none", padding: 0 }}>{Icon.close(18)}</button>
        </div>

        {!pickMode && (mealIds.length <= 5 ? (
            // ≤5 bữa: chia đều 1 hàng như bản vẽ (tên dài như "Phụ chiều" rộng 1,3)
            <div role="group" aria-label="Chọn bữa" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {mealIds.map((id) => <button key={id} className="chip-hover" aria-pressed={id === mealId} onClick={() => p.onMeal(id)} style={{ ...chip(id === mealId), flex: shortName(id).length > 5 ? 1.3 : 1, minWidth: 0, padding: 0 }}>{shortName(id)}</button>)}
            </div>
          ) : (
            <div role="group" aria-label="Chọn bữa" style={{ display: "flex", gap: 6, overflowX: "auto", flexShrink: 0, scrollbarWidth: "none", margin: "0 -12px", padding: "0 12px" }}>
              {mealIds.map((id) => <button key={id} className="chip-hover" aria-pressed={id === mealId} onClick={() => p.onMeal(id)} style={chip(id === mealId)}>{shortName(id)}</button>)}
            </div>
          ))}

        {!pickMode && p.onCalc && (
          <div role="tablist" aria-label="Cách ghi" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4, padding: 3, background: "#F1F5F9", borderRadius: 12, flexShrink: 0 }}>
            <button role="tab" aria-selected="true" style={{ height: 34, borderRadius: 10, border: "none", background: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#0062F0", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>Tìm món</button>
            <button role="tab" aria-selected="false" data-testid="log-tab-calc" onClick={() => p.onCalc(q, false)} style={{ height: 34, borderRadius: 10, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#475569" }}>Kiểm tra calo</button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 52, padding: "0 6px 0 14px", background: "#F1F5F9", border: "none", borderRadius: 16, flexShrink: 0, boxSizing: "border-box" }}>
          <span style={{ color: "#64748B", display: "flex" }}>{Icon.search(18)}</span>
          <label style={{ flex: 1, display: "flex", minWidth: 0 }}>
            <span style={SR}>Tìm món</span>
            <input ref={inputRef} type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món: phở, cơm tấm, ức gà…"
              style={{ flex: 1, minWidth: 0, height: 40, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 16, color: "#0F172A", outline: "none" }} />
          </label>
          {q && <button onClick={() => setQ("")} aria-label="Xoá ô tìm" style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(16)}</button>}
          {p.onPhoto && <button onClick={p.onPhoto} aria-label="Chụp ảnh món ăn" style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: GRAD_ORANGE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.camera(20)}</button>}
        </div>

        {!pickMode && !results && (p.onAI || p.weekly) && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {p.onAI && <button onClick={p.onAI} style={{ height: 36, padding: "0 12px", borderRadius: 999, border: "none", background: "rgba(124,58,237,0.10)", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#6D28D9", display: "flex", alignItems: "center", gap: 6 }}>{Icon.sparkle(14)}AI gợi ý</button>}
            {p.weekly && <button disabled={!!busyKey} onClick={() => add("weekly", p.weekly.onClick)} className="chip-hover" style={{ height: 36, padding: "0 12px", borderRadius: 999, border: "none", background: done.weekly ? "rgba(5,150,105,0.14)" : "rgba(0,166,126,0.10)", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#047857" }}>{done.weekly ? "Đã thêm" : `Từ thực đơn tuần · ${fmtInt(p.weekly.cal)}`}</button>}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", margin: "0 -12px", padding: "0 12px calc(20px + env(safe-area-inset-bottom, 0px)) 12px" }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", padding: "4px 4px 6px 4px" }}>{results ? `KẾT QUẢ (${results.length})` : "GẦN ĐÂY"}</span>

          {!results && otherMeals.map((rm) => {
            const key = `meal:${rm.log_date}:${rm.meal_id}`;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, margin: "0 0 10px 0", borderRadius: 16, background: "#EEF4FF" }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFFFF", color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.redo(18)}</span>
                <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>Ăn lại {String(rm.meal_name || "").toLowerCase()} {fmtVN(rm.log_date)} · {rm.items.length} món</span>
                  <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rm.items.map(itemName).join(", ")}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#0062F0" }}>{fmtInt(rm.cal)}</span>
                <button disabled={!!busyKey} onClick={() => add(key, () => p.onAddMeal(rm))} aria-label={`Ghi lại ${rm.meal_name} ${fmtVN(rm.log_date)}`} style={{ ...addBtn(done[key]), background: done[key] ? "#059669" : "#0062F0", color: "#FFFFFF" }}>{done[key] ? Icon.check(18) : "+"}</button>
              </div>
            );
          })}

          {list.map((it, i) => {
            const key = `item:${it.food}:${it.gram}`;
            const nm = itemName(it);
            return (
              <div key={key + i} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "0 4px", borderBottom: i < list.length - 1 ? "1px solid #EEF2FA" : "none" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 700 }}>{nm}</span><span style={{ fontSize: 12, color: "#64748B" }}>{itemPortion(it)} · {fmtInt(it.cal)} kcal</span></span>
                <button disabled={!!busyKey} onClick={() => add(key, () => (pickMode ? p.onPick(it) : p.onAddItem(it)))} aria-label={`Thêm ${nm.toLowerCase()}`} style={addBtn(done[key])}>{done[key] ? Icon.check(18) : "+"}</button>
              </div>
            );
          })}

          {results && results.length === 0 && !p.onCalc && (
            <div style={{ padding: "16px 4px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
              Không thấy "{q}" trong kho món.{p.onPhoto ? " Thử chụp ảnh món để AI nhận diện." : ""}
            </div>
          )}
          {results && q.trim().length >= 2 && p.onCalc && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: "none", background: "rgba(124,58,237,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, lineHeight: 1.45, color: "#334155" }}>{results.length ? "Không đúng món bạn ăn?" : `Không thấy "${q}" trong kho món.`} Tính calo cho <b>"{q.trim()}"</b> theo đúng chữ bạn gõ.</span>
              <button data-testid="log-calc-q" onClick={() => p.onCalc(q, true)} style={{ height: 44, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7C3AED,#5B21B6)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{Icon.sparkle(16)}Kiểm tra calo món này</button>
              <span style={{ fontSize: 12, color: "#64748B" }}>Món có trong kho tính ngay; món lạ thì AI tính (1 lượt).</span>
            </div>
          )}
          {!results && list.length === 0 && otherMeals.length === 0 && (
            <div style={{ padding: "16px 4px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>Món bạn đã ăn sẽ hiện ở đây để ghi lại nhanh. Gõ tên món vào ô tìm ở trên.</div>
          )}
        </div>
      </div>
    </div>
  );
}
