// Màn 2 · Ghi bữa (đã chốt) — sheet trượt lên: chọn ngày, chip bữa, ô tìm + nút chụp,
// tab Tìm từng món | Tính calo cả bữa (mở màn CalcCheckScreen), AI gợi ý / Từ thực đơn tuần, danh sách GẦN ĐÂY (món hay ăn).
// 17/10 (bản vẽ 113 / 113b / 114): mở sheet là con trỏ ở ô tìm; + món → vào giỏ, ô tìm tự xoá chữ và giữ con trỏ;
// Gợi ý cho bữa + Từ thực đơn tuần cũng vào giỏ (1 nút Ghi duy nhất); gõ cả bữa ("1 tô phở, 2 trứng") → thẻ "≈ X kcal cho N món";
// món không có trong kho → ô Tự nhập calo ngay dưới kết quả (Thêm vào giỏ) hoặc "Để AI tính".
// pickMode: dùng từ Sửa bữa để chọn món đưa về bản nháp (không lưu ngay).
import { useState, useMemo, useRef, useEffect } from "react";
import { Icon, GRAD_ORANGE, SR, useLockScroll, FONT, useSwipeClose, SheetHandle, Seg } from "./ui";
import { MEAL_SHORT, searchFoods, itemName, itemPortion, fmtInt, scaleItem, stripVN, capFirst } from "../lib/mobileView";
import { stepItem, mealEntries, resolveAll, sumCheck, parseFoodLine, gramOf, manualItem, mineEntries } from "../lib/calcCheck";
import { NumField } from "./CalcCheckScreen";
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
  const inputRef = useRef(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // Mở sheet là con trỏ ở ô tìm (cả 2 chế độ) — bản vẽ 113
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 150); return () => clearTimeout(t); }, []);

  // Gõ cả bữa (113b): tính tại chỗ bằng kho món (không tốn lượt), danh sách kết quả tìm theo món cuối đang gõ
  const meal = useMemo(() => (p.onCalc ? mealEntries(q) : null), [q, p.onCalc]);
  const smart = useMemo(() => {
    if (!meal) return null;
    const rows = resolveAll(q, foodCache);
    const known = rows.filter((r) => !r.unknown);
    return { n: rows.length, unknown: rows.length - known.length, cal: sumCheck(known).cal, sub: meal.map((e) => e.raw).join(" · ") };
  }, [meal, q, foodCache]);
  const term = meal ? meal[meal.length - 1].name : q;
  const results = useMemo(() => (term.trim() ? searchFoods(term, foodCache, 30) : null), [term, foodCache]);
  // Ô tự nhập calo (114): gõ ≥ 2 ký tự, không phải cả bữa, không có món trùng đúng tên trong kết quả
  const qPlain = stripVN(q.trim());
  const showManual = !!results && !meal && q.trim().length >= 2 && !results.some((r) => stripVN(itemName(r)) === qPlain || stripVN(String(r.food || "")) === qPlain);
  const entry = useMemo(() => (showManual ? parseFoodLine(q) : null), [showManual, q]);
  const [man, setMan] = useState({ cal: "", gram: null, p: "", c: "", f: "", more: false });
  const manGram = man.gram ?? (entry ? String(gramOf(entry, null) || 100) : "100");
  const manPreview = entry ? manualItem(entry, { gram: manGram, cal: man.cal, p: man.p, c: man.c, f: man.f }) : null;
  // Gợi ý cho bữa (16/10): ≤3 lựa chọn cùng thuật toán thẻ Hôm nay (lib/mealSuggest — calo bữa + món không ăn).
  // 17/10 (bản vẽ 113): bấm + là đưa các món vào giỏ (không ghi ngay / không ghi đè), ghi bằng nút Ghi của giỏ.
  void recentMeals;
  const sugg = pickMode ? [] : (p.suggestions || []).slice(0, 3);
  const SRC = { history: ["Đã ăn", "#047857", "rgba(5,150,105,0.12)"], template: ["Mẫu", "#0062F0", "#FFFFFF"], ai: ["AI", "#6D28D9", "#F3EEFF"] };

  const flash = (key) => {
    setDone((d) => ({ ...d, [key]: true }));
    timers.current.push(setTimeout(() => setDone((d) => { const n = { ...d }; delete n[key]; return n; }), 1800));
  };

  // Giỏ món (16/10): bấm + nhiều món, chỉnh gram từng món rồi ghi 1 lần (trước đây mỗi món ghi 1 lần / Sửa bữa phải mở lại sheet từng món)
  const [tray, setTray] = useState([]);
  const [saving, setSaving] = useState(false);
  const keyOf = (it) => `${it.food}|${itemName(it)}`;
  const inTray = (it) => tray.some((t) => t.k === keyOf(it));
  // Thêm xong: ô tìm tự xoá chữ, giữ con trỏ để gõ món tiếp (bản vẽ 113)
  const clearSearch = () => { setQ(""); inputRef.current?.focus(); };
  const toggleTray = (it) => {
    const had = inTray(it);
    setTray((t) => (t.some((x) => x.k === keyOf(it)) ? t.filter((x) => x.k !== keyOf(it)) : [...t, { k: keyOf(it), it }]));
    if (!had && q) clearSearch();
  };
  // Nhiều món 1 lần (Gợi ý cho bữa / Từ thực đơn tuần): nối vào giỏ, món đã có trong giỏ thì bỏ qua
  const addManyToTray = (items) => setTray((t) => {
    const next = [...t];
    (items || []).forEach((it) => { if (!next.some((x) => x.k === keyOf(it))) next.push({ k: keyOf(it), it }); });
    return next;
  });
  const addManual = () => {
    if (!manPreview) return;
    setTray((t) => [...t.filter((x) => x.k !== keyOf(manPreview)), { k: keyOf(manPreview), it: manPreview }]);
    setMan({ cal: "", gram: null, p: "", c: "", f: "", more: false });
    clearSearch();
  };
  const setTrayItem = (k, fn) => setTray((t) => t.map((x) => (x.k === k ? { ...x, it: fn(x.it) } : x)));
  const trayCal = tray.reduce((a, x) => a + (Number(x.it.cal) || 0), 0);
  const saveTray = async () => {
    if (!tray.length || saving) return;
    setSaving(true);
    try {
      const items = tray.map((x) => { const { _raw, ...it } = x.it; void _raw; return it; });
      // Món tự nhập: lưu riêng cho tài khoản này (như màn Kiểm tra calo), lần sau tìm/gõ là ra
      const mine = mineEntries(items);
      if (p.saveMine && Object.keys(mine).length) p.saveMine(mine);
      const ok = pickMode ? await p.onPickMany(items) : await p.onAddItems(items);
      if (ok !== false) setTray([]);
    } finally { setSaving(false); }
  };

  const sw = useSwipeClose(onClose);
  const list = results || (frequent || []).map((f) => f.item);
  const shortName = (id) => MEAL_SHORT[id] || id;

  return (
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.5)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
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
          <button onClick={sw.close} aria-label="Đóng" style={{ width: 40, height: 40, borderRadius: 20, background: "#F1F5F9", color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", border: "none", padding: 0 }}>{Icon.close(18)}</button>
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

        {!pickMode && p.onCalc && (<>
          <Seg mode="tab" ariaLabel="Cách ghi" value="search" onChange={() => p.onCalc(q, false)} opts={[{ value: "search", label: "Tìm từng món" }, { value: "calc", label: "Tính calo cả bữa", testid: "log-tab-calc" }]} />
          <span data-testid="log-tab-hint" style={{ display: "block", margin: "-6px 0 0 0", padding: "0 4px", fontSize: 12, color: "#64748B", flexShrink: 0 }}>Chọn món trong kho, chỉnh gram — hoặc gõ cả bữa ở tab bên cạnh.</span>
        </>)}

        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 52, padding: "0 6px 0 14px", background: "#F1F5F9", border: "none", borderRadius: 16, flexShrink: 0, boxSizing: "border-box" }}>
          <span style={{ color: "#64748B", display: "flex" }}>{Icon.search(18)}</span>
          <label style={{ flex: 1, display: "flex", minWidth: 0 }}>
            <span style={SR}>Tìm món</span>
            <input ref={inputRef} type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tray.length ? "Tìm món tiếp theo…" : "Tìm món: phở, cơm tấm, ức gà…"}
              style={{ flex: 1, minWidth: 0, height: 40, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 16, color: "#0F172A", outline: "none" }} />
          </label>
          {q && <button onClick={clearSearch} aria-label="Xoá ô tìm" style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(16)}</button>}
          {p.onPhoto && <button onClick={p.onPhoto} aria-label="Chụp ảnh món ăn" style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: GRAD_ORANGE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.camera(20)}</button>}
        </div>

        {!pickMode && !results && (p.onAI || p.weekly) && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {p.onAI && <button onClick={p.onAI} style={{ height: 36, padding: "0 12px", borderRadius: 999, border: "none", background: "rgba(124,58,237,0.10)", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#6D28D9", display: "flex", alignItems: "center", gap: 6 }}>{Icon.sparkle(14)}AI gợi ý</button>}
            {p.weekly && <button data-testid="log-weekly" onClick={() => { addManyToTray(p.weekly.items); flash("weekly"); }} className="chip-hover" style={{ height: 36, padding: "0 12px", borderRadius: 999, border: "none", background: done.weekly ? "rgba(5,150,105,0.14)" : "rgba(0,166,126,0.10)", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#047857" }}>{done.weekly ? "Đã thêm vào giỏ" : `Từ thực đơn tuần · ${fmtInt(p.weekly.cal)}`}</button>}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", margin: "0 -12px", padding: tray.length ? "0 12px 12px 12px" : "0 12px calc(20px + env(safe-area-inset-bottom, 0px)) 12px" }}>
          {smart && (
            <button data-testid="log-smart" onClick={() => p.onCalc(q, true)} style={{ width: "100%", margin: "0 0 4px 0", padding: 12, borderRadius: 16, border: "none", background: "linear-gradient(135deg,rgba(14,159,192,0.12),rgba(3,105,161,0.08))", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit", color: "#0F172A", textAlign: "left", boxSizing: "border-box" }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: CY, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.calc(18)}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span data-testid="log-smart-title" data-cal={smart.cal} style={{ fontSize: 14, fontWeight: 800 }}>{smart.unknown ? `${smart.n} món · ${smart.unknown} món chưa có calo` : `≈ ${fmtInt(smart.cal)} kcal cho ${smart.n} món`}</span>
                <span style={{ fontSize: 12, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{smart.sub}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#0369A1", whiteSpace: "nowrap", flexShrink: 0 }}>Xem &amp; ghi ›</span>
            </button>
          )}
          {results && <span style={smart ? { ...secLbl, padding: "14px 4px 6px 4px" } : secLbl}>{meal ? `KẾT QUẢ CHO “${term.toUpperCase()}” (${results.length})` : `KẾT QUẢ (${results.length})`}</span>}

          {!results && sugg.length > 0 && (
            <div data-testid="log-suggest" style={{ margin: "0 0 12px 0", borderRadius: 16, background: "#EEF4FF", padding: "10px 12px 4px 12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#0062F0", letterSpacing: "0.08em" }}>{Icon.sparkle(13)}GỢI Ý CHO {String(MEAL_NAMES[mealId] || "bữa này").toUpperCase()}{p.suggestTarget ? <span style={{ fontWeight: 700, color: "#64748B", letterSpacing: 0 }}> · ≈ {fmtInt(p.suggestTarget)} kcal</span> : null}</span>
              {sugg.map((sg, i) => {
                const key = `sug:${sg.id}`;
                const [t, c, bg] = SRC[sg.kind] || SRC.history;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 58, borderBottom: i < sugg.length - 1 ? "1px solid rgba(0,98,240,0.10)" : "none" }}>
                    <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sg.items.map((x) => capFirst(itemName(x))).join(", ")}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: c, background: bg, padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>{sg.kind === "template" ? `${t} · ${sg.title}` : `${t}${sg.date ? ` ${fmtVN(sg.date)}` : ""}`}</span>
                        <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sg.items.length} món</span>
                      </span>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#0062F0" }}>{fmtInt(sg.cal)}</span>
                    <button data-testid="log-suggest-add" onClick={() => { addManyToTray(sg.items); flash(key); }} aria-label={`Thêm vào giỏ ${sg.items.map(itemName).join(", ")}`} style={{ ...addBtn(done[key]), background: done[key] ? "#059669" : "#0062F0", color: "#FFFFFF" }}>{done[key] ? Icon.check(18) : "+"}</button>
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

          {showManual && (
            <div data-testid="log-manual" style={{ marginTop: 12, padding: 14, borderRadius: 16, background: "#F8FAFF", border: "1px solid #E3EBFA", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 14, lineHeight: 1.45, color: "#334155" }}>Không thấy <b>"{q.trim()}"</b> trong kho món.</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <NumField label="Calo *" unit="kcal" value={man.cal} onChange={(v) => setMan((m) => ({ ...m, cal: v }))} testid="log-manual-cal" strong h={46} />
                <NumField label="Khẩu phần" unit="g" value={manGram} onChange={(v) => setMan((m) => ({ ...m, gram: v }))} testid="log-manual-gram" h={46} />
              </div>
              {!man.more
                ? <button data-testid="log-manual-more" onClick={() => setMan((m) => ({ ...m, more: true }))} style={{ alignSelf: "flex-start", height: 28, padding: 0, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "#0062F0" }}>+ Thêm đạm / tinh bột / béo (không bắt buộc)</button>
                : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                    <NumField label="Đạm" unit="g" value={man.p} onChange={(v) => setMan((m) => ({ ...m, p: v }))} testid="log-manual-p" dec h={46} />
                    <NumField label="Tinh bột" unit="g" value={man.c} onChange={(v) => setMan((m) => ({ ...m, c: v }))} testid="log-manual-c" dec h={46} />
                    <NumField label="Béo" unit="g" value={man.f} onChange={(v) => setMan((m) => ({ ...m, f: v }))} testid="log-manual-f" dec h={46} />
                  </div>
                )}
              <button data-testid="log-manual-add" disabled={!manPreview} onClick={addManual} style={{ height: 46, borderRadius: 14, border: "none", ...(manPreview ? { background: CY, color: "#FFFFFF" } : { background: "#E2E8F0", color: "#64748B" }), fontFamily: "inherit", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{Icon.plus(16, 2.6)}{manPreview ? `Thêm vào giỏ · ${fmtInt(manPreview.cal)} kcal` : "Nhập calo để thêm vào giỏ"}</button>
              {p.onCalc && p.aiOn && <>
                <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 8, color: "#94A3B8", fontSize: 12 }}><span style={{ flex: 1, height: 1, background: "#E2E8F0" }} />hoặc<span style={{ flex: 1, height: 1, background: "#E2E8F0" }} /></div>
                <button data-testid="log-calc-q" onClick={() => p.onCalc(q, true)} style={{ height: 44, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#7C3AED,#5B21B6)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{Icon.sparkle(16)}Để AI tính · 1 lượt</button>
              </>}
              <span style={{ fontSize: 11, color: "#64748B", textAlign: "center" }}>Món tự nhập chỉ lưu cho bạn.{p.onPhoto && !(p.onCalc && p.aiOn) ? " Hoặc chụp ảnh món để AI nhận diện." : ""}</span>
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
                    <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{capFirst(itemName(it))}</span>
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

const CY = "linear-gradient(135deg,#0E9FC0,#0369A1)";
const secLbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", padding: "4px 4px 6px 4px" };
const stepBtn = { width: 34, height: 36, borderRadius: 10, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0, fontFamily: "inherit" };
