// Kiểm tra calo (bản vẽ 24–26): gõ các món → tính calo + macro trước khi ăn.
// Món có trong kho / món đã lưu: tính ngay, không tốn lượt. Món lạ: bấm "AI tính" (1 lượt macro/tháng),
// kết quả AI lưu vào hàng chờ duyệt (food_cache_pending) để lần sau dùng lại không tốn lượt.
// Cuối màn: "Chỉ xem" hoặc "Ghi vào <bữa>" (thêm vào bữa, đánh dấu đã ăn, có Hoàn tác ở Hôm nay).
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { aiQuota } from "../lib/aiQuota";
import { SubPage, Icon, GRAD_BLUE } from "./ui";
import { resolveAll, sumCheck, stepItem, cacheEntryOf } from "../lib/calcCheck.js";
import { aiCalc } from "../lib/calcAI";
import { fmtInt, fmtDec, itemName } from "../lib/mobileView";
import { MEAL_NAMES } from "../lib/mealMath";

const sel = { height: 40, padding: "0 10px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#0F172A", WebkitAppearance: "none", appearance: "none", minWidth: 0, flex: 1 };
const stepBtn = { width: 32, height: 32, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#007AFF", fontSize: 18, fontWeight: 800, padding: 0, flexShrink: 0, fontFamily: "inherit" };
const tag = (ai) => ({ fontSize: 11, fontWeight: 800, color: ai ? "#6D28D9" : "#00A67E", background: ai ? "rgba(124,58,237,0.1)" : "rgba(0,200,150,0.1)", padding: "2px 6px", borderRadius: 6, marginLeft: 4, whiteSpace: "nowrap" });

export function CalcCheckScreen({ initialText = "", autoRun = false, foodCache, frequent, aiEnabled, userId, appSettings, dayInfo, mealIds, initialMeal, date, dateOptions, onSave, savePending, onClose }) {
  const [text, setText] = useState(initialText);
  const [rows, setRows] = useState(() => (autoRun && initialText.trim() ? resolveAll(initialText, foodCache) : null));
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState("");
  const [meal, setMeal] = useState(initialMeal || mealIds[0] || "trua");
  const [day, setDay] = useState(date);
  const [busy, setBusy] = useState(false);
  const [macroQuota, setMacroQuota] = useState(null);
  // Lượt "AI tính macro" còn lại tháng này (số do ai-proxy đếm)
  const loadQuota = async () => {
    if (!userId) return;
    try {
      const [p, st] = await Promise.all([
        supabase.from("profiles").select("tier,ai_macro_count_this_month,ai_macro_count_reset_at").eq("id", userId).maybeSingle(),
        supabase.from("subscription_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      const q = aiQuota(p.data, st.data).find((x) => x.key === "macro");
      if (q) setMacroQuota({ left: Math.max(0, q.limit - q.used), limit: q.limit });
    } catch (e) { /* không hiện số lượt cũng được */ }
  };
  useEffect(() => { loadQuota(); }, [userId]);

  const run = () => { setErr(""); setRows(text.trim() ? resolveAll(text, foodCache) : null); };
  const items = (rows || []).filter((r) => !r.unknown);
  const unknown = (rows || []).filter((r) => r.unknown);
  const total = sumCheck(items);
  const addChip = (name) => setText((t) => (t.trim() ? `${t.replace(/[,\s]+$/, "")}, ${name}` : name));

  const setRow = (i, next) => setRows((arr) => arr.map((r, k) => (k === i ? next : r)));
  const removeRow = (i) => setRows((arr) => arr.filter((_, k) => k !== i));

  const runAI = async () => {
    if (aiBusy || !unknown.length) return;
    setAiBusy(true); setErr("");
    try {
      const entries = unknown.map((u) => u.entry);
      const { items: got, provider } = await aiCalc(entries, appSettings);
      // Tính sẵn ngoài setRows (hàm cập nhật state chạy sau, không dùng để gom dữ liệu được)
      const pending = {};
      got.forEach((g) => { if (g && !g.unknown) { const ce = cacheEntryOf(g); if (ce) pending[g.food] = ce; } });
      setRows((arr) => { let k = 0; return arr.map((r) => (r.unknown ? (got[k++] || r) : r)); });
      if (savePending && Object.keys(pending).length) savePending(pending, provider);
      loadQuota();
    } catch (e) {
      setErr(e?.quota ? (e.message || "Bạn đã hết lượt AI tính macro tháng này.") : `AI chưa tính được: ${e?.message || "lỗi mạng"}. Thử lại hoặc chọn món gần đúng.`);
    } finally { setAiBusy(false); }
  };

  const save = async () => {
    if (!items.length || unknown.length || busy) return;
    setBusy(true);
    const ok = await onSave(day, meal, items.map(({ _raw, ...it }) => ({ ...it, gram: Math.round(it.gram), cal: Math.round(it.cal) })));
    setBusy(false);
    if (ok !== false) onClose();
  };

  const target = dayInfo?.target || 0;
  const eatenNow = dayInfo?.eaten || 0;
  const after = target - eatenNow - total.cal;

  // ===== Bước 1: nhập =====
  if (!rows) return (
    <SubPage title="Kiểm tra calo" subtitle="Gõ món, xem calo trước khi ăn" onBack={onClose}>
      <div style={{ margin: "12px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>BẠN ĂN GÌ?</span>
          <textarea data-testid="calc-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="VD: 1 tô phở bò, 2 quả trứng luộc, 1 ly trà sữa"
            style={{ height: 132, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 16, lineHeight: 1.5, color: "#0F172A", resize: "none", boxSizing: "border-box", outline: "none" }} />
          <span style={{ fontSize: 12, color: "#64748B" }}>Mỗi món cách nhau dấu phẩy hoặc xuống dòng. Ghi kèm số lượng nếu biết (tô, quả, ly, gram).</span>
        </label>
        {(frequent || []).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>HAY ĂN</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {frequent.slice(0, 6).map((f) => (
                <button key={f.key} onClick={() => addChip(itemName(f.item).toLowerCase())} className="chip-hover" style={{ height: 36, padding: "0 12px", borderRadius: 999, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>+ {itemName(f.item)}</button>
              ))}
            </div>
          </div>
        )}
        <button data-testid="calc-run" disabled={!text.trim()} onClick={run} style={{ height: 52, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(0,87,255,0.22)" }}>Tính calo</button>
      </div>
      <div style={{ margin: "12px 12px 0 12px", padding: "12px 14px", borderRadius: 14, background: "rgba(0,122,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.45 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "#00A67E", marginTop: 6, flexShrink: 0 }} />Món có trong kho món của app: tính ngay, không tốn lượt AI.</span>
        <span style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.45 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "#7C3AED", marginTop: 6, flexShrink: 0 }} />Món chưa có: bấm "AI tính", trừ 1 lượt AI tính macro{macroQuota ? ` (còn ${fmtInt(macroQuota.left)} / ${fmtInt(macroQuota.limit)} tháng này)` : ""}.</span>
      </div>
    </SubPage>
  );

  // ===== Bước 2: kết quả =====
  const footer = (
    <div style={{ padding: "10px 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <select data-testid="calc-meal" aria-label="Bữa" value={meal} onChange={(e) => setMeal(e.target.value)} style={sel}>
          {mealIds.map((id) => <option key={id} value={id}>{MEAL_NAMES[id]}</option>)}
        </select>
        <select data-testid="calc-date" aria-label="Ngày" value={day} onChange={(e) => setDay(e.target.value)} style={sel}>
          {dateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button data-testid="calc-close" onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Chỉ xem</button>
        <button data-testid="calc-save" disabled={!items.length || unknown.length > 0 || busy} onClick={save} style={{ flex: 2, height: 50, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900, boxShadow: "0 4px 12px rgba(0,87,255,0.22)" }}>{busy ? "Đang lưu…" : `Ghi vào ${(MEAL_NAMES[meal] || "bữa").toLowerCase()}`}</button>
      </div>
      {unknown.length > 0 && <span style={{ fontSize: 12, color: "#B45309", textAlign: "center" }}>Còn {unknown.length} món chưa có calo — AI tính hoặc chọn món gần đúng trước khi ghi.</span>}
    </div>
  );
  const nAI = items.filter((x) => x.source === "ai").length;

  return (
    <SubPage title="Kiểm tra calo" subtitle={`${rows.length} món${nAI ? ` · ${nAI} món AI tính` : ""}`} onBack={onClose} footer={footer}
      right={<button data-testid="calc-edit" onClick={() => setRows(null)} style={{ height: 36, padding: "0 10px", marginRight: 4, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#007AFF" }}>Sửa chữ</button>}>
      <div style={{ margin: "12px 12px 0 12px", borderRadius: 18, padding: 16, background: GRAD_BLUE, color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span data-testid="calc-total" data-value={total.cal} style={{ fontSize: 32, fontWeight: 900 }}>{fmtInt(total.cal)}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>kcal</span>
          <span style={{ flex: 1 }} />
          {target > 0 && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>{Math.round((total.cal / target) * 100)}% mục tiêu ngày</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          {[["Đạm", total.p], ["Tinh bột", total.c], ["Béo", total.f]].map(([l, v]) => (
            <span key={l} style={{ display: "flex", flexDirection: "column", padding: "8px 10px", borderRadius: 12, background: "rgba(255,255,255,0.16)" }}><span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{l}</span><span style={{ fontSize: 17, fontWeight: 900 }}>{fmtInt(v)} g</span></span>
          ))}
        </div>
        {target > 0 && <span style={{ fontSize: 13, fontWeight: 600, borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 10 }}>{after >= 0 ? `Ăn xong còn ${fmtInt(after)} kcal cho hôm nay` : `Ăn xong sẽ vượt ${fmtInt(-after)} kcal hôm nay`} (đã ăn {fmtInt(eatenNow)} / {fmtInt(target)})</span>}
      </div>

      <div style={{ margin: "12px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "0 12px" }}>
        {rows.map((r, i) => r.unknown ? (
          <div key={i} data-testid={`calc-unknown-${i}`} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 0", borderBottom: i < rows.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{r.entry.raw}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#B45309", background: "rgba(245,158,11,0.12)", padding: "2px 6px", borderRadius: 6 }}>{r.failed ? "AI chưa tính được" : "Chưa có trong kho"}</span>
              <button aria-label={`Bỏ ${r.entry.raw}`} onClick={() => removeRow(i)} style={{ ...stepBtn, border: "none", color: "#94A3B8" }}>{Icon.close(14)}</button>
            </span>
            {r.near && <button data-testid={`calc-near-${i}`} onClick={() => setRow(i, r.near)} style={{ alignSelf: "flex-start", height: 32, padding: "0 10px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#007AFF" }}>Dùng món gần đúng: {itemName(r.near)} · {fmtInt(r.near.cal)} kcal</button>}
          </div>
        ) : (
          <div key={i} data-testid={`calc-item-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 72, borderBottom: i < rows.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{itemName(r)}<span style={tag(r.source === "ai")}>{r.source === "ai" ? "AI tính" : r.source === "cache" ? "Đã lưu" : "Kho món"}</span></span>
              <span style={{ fontSize: 12, color: "#475569" }}>{fmtInt(r.cal)} kcal · Đ {fmtDec(r.p)} · TB {fmtDec(r.c)} · B {fmtDec(r.f)} g</span>
            </span>
            <button aria-label={`Giảm ${itemName(r)}`} onClick={() => setRow(i, stepItem(r, -1))} style={stepBtn}>−</button>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 58 }}>
              <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>{r.qty_display || `${fmtInt(r.gram)} g`}</span>
              {r.qty_display && <span style={{ fontSize: 11, color: "#64748B" }}>{fmtInt(r.gram)} g</span>}
            </span>
            <button aria-label={`Tăng ${itemName(r)}`} onClick={() => setRow(i, stepItem(r, 1))} style={stepBtn}>+</button>
          </div>
        ))}
        {rows.length === 0 && <div style={{ padding: "16px 0", fontSize: 13, color: "#64748B" }}>Chưa có món nào. Bấm "Sửa chữ" để gõ lại.</div>}
      </div>

      {unknown.length > 0 && (
        <div style={{ margin: "12px 12px 0 12px", padding: 14, borderRadius: 16, border: "1.5px dashed rgba(124,58,237,0.45)", background: "rgba(124,58,237,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
          {aiEnabled ? <>
            <span style={{ fontSize: 14, lineHeight: 1.45 }}>Để AI tính calo cho <b>{unknown.length} món</b> chưa có trong kho.</span>
            <button data-testid="calc-ai" disabled={aiBusy || (macroQuota && macroQuota.left <= 0)} onClick={runAI} style={{ height: 44, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7C3AED,#5B21B6)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{Icon.sparkle(16)}{aiBusy ? "AI đang tính…" : "AI tính calo · 1 lượt"}</button>
            {macroQuota && <span style={{ fontSize: 12, color: "#64748B" }}>Còn {fmtInt(macroQuota.left)} / {fmtInt(macroQuota.limit)} lượt tháng này. Món đã tính được lưu lại, lần sau không tốn lượt.</span>}
          </> : <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.45 }}>AI tính macro đang tạm tắt. Chọn món gần đúng hoặc bỏ món đó.</span>}
        </div>
      )}
      {err && <p role="alert" style={{ margin: "10px 16px 0 16px", fontSize: 13, color: "#DC2626" }}>{err}</p>}
      {nAI > 0 && <p style={{ margin: "10px 16px 0 16px", fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>Món "AI tính" là ước lượng, có thể chỉnh khẩu phần bằng nút − / +.</p>}
      <div style={{ height: 16 }} />
    </SubPage>
  );
}
