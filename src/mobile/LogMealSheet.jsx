// Màn 2 · Ghi bữa (đã chốt) — sheet trượt lên: chọn ngày, chip bữa, ô tìm + nút chụp,
// tab Tìm món | Kiểm tra calo (mở màn CalcCheckScreen), AI gợi ý / Từ thực đơn tuần, danh sách GẦN ĐÂY (ăn lại cả bữa + món hay ăn).
// pickMode: dùng từ Sửa bữa để chọn 1 món đưa về bản nháp (không lưu ngay).
import { useState, useMemo, useRef, useEffect } from "react";
import { Icon, GRAD_ORANGE, SR, useLockScroll, FONT, useSwipeClose, SheetHandle, Seg } from "./ui";
import { MEAL_SHORT, searchFoods, itemName, itemPortion, fmtInt, scaleItem } from "../lib/mobileView";
import { stepItem } from "../lib/calcCheck";
import { fmtVN } from "../lib/dateVN";
import { MEAL_NAMES } from "../lib/mealMath";

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
  // Gợi ý cho bữa (16/10): ≤3 lựa chọn cùng thuật toán thẻ Hôm nay (lib/mealSuggest — calo bữa + món không ăn),
  // thay khối "Ăn lại" chép y nguyên 1 bữa cũ. Bấm + là ghi luôn (có Hoàn tác), bữa đã có món thì hỏi trước.
  void recentMeals;
  const sugg = pickMode ? [] : (p.suggestions || []).slice(0, 3);
  const SRC = { history: ["Đã ăn", "#047857", "rgba(5,150,105,0.12)"], template: ["Mẫu", "#0062F0", "#FFFFFF"], ai: ["AI", "#6D28D9", "#F3EEFF"] };

  const flash = (key) => {
    setDone((d) => ({ ...d, [key]: true }));
    timers.current.push(setTimeout(() => setDone((d) => { const n = { ...d }; delete n[key]; return n; }), 1800));
  };
  const add = async (key, fn) => {
    if (busyKey) return;
    setBusyKey(key);
    try { const ok = await fn(); if (ok !== false) flash(key); } finally { setBusyKey(null); }
  };

  // Giỏ món (16/10): bấm + nhiều món, chỉnh gram từng món rồi ghi 1 lần (trước đây mỗi món ghi 1 lần / Sửa bữa phải mở lại sheet từng món)
  const [tray, setTray] = useState([]);
  const [saving, setSaving] = useState(false);
  const keyOf = (it) => `${it.food}|${itemName(it)}`;
  const inTray = (it) => tray.some((t) => t.k === keyOf(it));
  const toggleTray = (it) => setTray((t) => (t.some((x) => x.k === keyOf(it)) ? t.filter((x) => x.k !== keyOf(it)) : [...t, { k: keyOf(it), it }]));
  const setTrayItem = (k, fn) => setTray((t) => t.map((x) => (x.k === k ? { ...x, it: fn(x.it) } : x)));
  const trayCal = tray.reduce((a, x) => a + (Number(x.it.cal) || 0), 0);
  const saveTray = async () => {
    if (!tray.length || saving) return;
    setSaving(true);
    try {
      const items = tray.map((x) => x.it);
      const ok = pickMode ? await p.onPickMany(items) : await p.onAddItems(items);
      if (ok !== false) setTray([]);
    } finally { setSaving(false); }
  };

  const sw = useSwipeClose(onClose);
  const list = results || (frequent || []).map((f) => f.item);
  const shortName = (id) => MEAL_SHORT[id] || id;

  return (
    <div className="fpm" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.5)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} role="dialog" aria-modal="true" aria-label={pickMode ? "Thêm món" : "Ghi bữa"} onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, top: "max(96px, calc(env(safe-area-inset-top, 0px) + 56px))", bottom: 0, maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px 0 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />

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
          <Seg mode="tab" ariaLabel="Cách ghi" value="search" onChange={() => p.onCalc(q, false)} opts={[{ value: "search", label: "Tìm món" }, { value: "calc", label: "Kiểm tra calo", testid: "log-tab-calc" }]} />
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

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", margin: "0 -12px", padding: tray.length ? "0 12px 12px 12px" : "0 12px calc(20px + env(safe-area-inset-bottom, 0px)) 12px" }}>
          {results && <span style={secLbl}>KẾT QUẢ ({results.length})</span>}

          {!results && sugg.length > 0 && (
            <div data-testid="log-suggest" style={{ margin: "0 0 12px 0", borderRadius: 16, background: "#EEF4FF", padding: "10px 12px 4px 12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#0062F0", letterSpacing: "0.08em" }}>{Icon.sparkle(13)}GỢI Ý CHO {String(MEAL_NAMES[mealId] || "bữa này").toUpperCase()}{p.suggestTarget ? <span style={{ fontWeight: 700, color: "#64748B", letterSpacing: 0 }}> · ≈ {fmtInt(p.suggestTarget)} kcal</span> : null}</span>
              {sugg.map((sg, i) => {
                const key = `sug:${sg.id}`;
                const [t, c, bg] = SRC[sg.kind] || SRC.history;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 58, borderBottom: i < sugg.length - 1 ? "1px solid rgba(0,98,240,0.10)" : "none" }}>
                    <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sg.items.map(itemName).join(", ")}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: c, background: bg, padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>{sg.kind === "template" ? `${t} · ${sg.title}` : `${t}${sg.date ? ` ${fmtVN(sg.date)}` : ""}`}</span>
                        <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sg.items.length} món</span>
                      </span>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#0062F0" }}>{fmtInt(sg.cal)}</span>
                    <button data-testid="log-suggest-add" disabled={!!busyKey} onClick={() => add(key, () => p.onAddSuggest(sg))} aria-label={`Ghi ${sg.items.map(itemName).join(", ")}`} style={{ ...addBtn(done[key]), background: done[key] ? "#059669" : "#0062F0", color: "#FFFFFF" }}>{done[key] ? Icon.check(18) : "+"}</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* "GẦN ĐÂY" chỉ đứng trên danh sách món hay ăn (sau khối Gợi ý cho bữa) — 16/10 */}
          {!results && list.length > 0 && <span data-testid="log-recent-label" style={secLbl}>GẦN ĐÂY</span>}
          {list.map((it, i) => {
            const key = `item:${it.food}:${it.gram}`;
            const nm = itemName(it);
            return (
              <div key={key + i} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "0 4px", borderBottom: i < list.length - 1 ? "1px solid #EEF2FA" : "none" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 700 }}>{nm}</span><span style={{ fontSize: 12, color: "#64748B" }}>{itemPortion(it)} · {fmtInt(it.cal)} kcal</span></span>
                <button data-testid="log-add" aria-pressed={inTray(it)} onClick={() => toggleTray(it)} aria-label={`Thêm ${nm.toLowerCase()}`} style={addBtn(inTray(it))}>{inTray(it) ? Icon.check(18) : "+"}</button>
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
          {!results && list.length === 0 && sugg.length === 0 && (
            <div style={{ padding: "16px 4px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>Món bạn đã ăn sẽ hiện ở đây để ghi lại nhanh. Gõ tên món vào ô tìm ở trên.</div>
          )}
        </div>

        {tray.length > 0 && (
          <div data-testid="log-tray" style={{ flexShrink: 0, margin: "0 -16px", padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px) 16px", background: "#FFFFFF", borderTop: "1px solid #EEF2FA", boxShadow: "0 -8px 24px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ maxHeight: "34vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {tray.map(({ k, it }) => (
                <div key={k} data-testid="log-tray-row" style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 48 }}>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{itemName(it)}</span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>{fmtInt(it.cal)} kcal{it.qty_display ? ` · ${it.qty_display}` : ""}</span>
                  </span>
                  <button onClick={() => setTrayItem(k, (x) => stepItem(x, -1))} aria-label={`Bớt ${itemName(it)}`} style={stepBtn}>−</button>
                  <label style={{ width: 64, height: 36, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 14, fontWeight: 800 }}>
                    <span style={SR}>Gram {itemName(it).toLowerCase()}</span>
                    <input type="number" inputMode="numeric" value={Math.round(it.gram) || ""} onChange={(e) => { const g = Math.min(3000, Math.max(0, Number(e.target.value) || 0)); setTrayItem(k, (x) => (g ? scaleItem(x, g) : { ...x, gram: 0 })); }}
                      style={{ width: 38, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#0F172A", outline: "none", padding: 0 }} />
                    <span style={{ fontSize: 12, color: "#0062F0" }}>g</span>
                  </label>
                  <button onClick={() => setTrayItem(k, (x) => stepItem(x, 1))} aria-label={`Thêm phần ${itemName(it)}`} style={stepBtn}>+</button>
                  <button onClick={() => setTray((t) => t.filter((x) => x.k !== k))} aria-label={`Bỏ ${itemName(it)}`} style={{ ...stepBtn, background: "transparent", color: "#94A3B8" }}>{Icon.close(14)}</button>
                </div>
              ))}
            </div>
            <button data-testid="log-tray-save" disabled={saving || tray.some((x) => !(x.it.gram > 0))} onClick={saveTray}
              style={{ height: 52, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.6 : 1 }}>
              {Icon.check(18)} {pickMode ? `Thêm ${tray.length} món · ${fmtInt(trayCal)} kcal` : `Ghi ${tray.length} món vào ${String(MEAL_NAMES[mealId] || "bữa").toLowerCase()} · ${fmtInt(trayCal)} kcal`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const secLbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", padding: "4px 4px 6px 4px" };
const stepBtn = { width: 34, height: 36, borderRadius: 10, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0, fontFamily: "inherit" };
