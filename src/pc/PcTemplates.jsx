// Quản trị PC › Kho mẫu thực đơn (cùng ngôn ngữ hình ảnh PcUsers / PcFood). Logic giữ đúng:
//  - src/mobile/admin/TemplatesScreen.jsx: mẫu chung (weekly_templates.is_default) qua adminP.defaultTemplates / refreshDefaultTemplates;
//    mọi admin (thường + super) đều soạn / xoá (như tab cũ). Xoá hỏi đỏ bằng appConfirm.
//  - src/mobile/admin/TemplateEditor.jsx: soạn/sửa → saveDefaultTemplate(name, day_type, meals, total_cal, editId, goal_type, diet|null);
//    "Tính macro tất cả" = Kho nội bộ → Cache (food_cache + món chờ duyệt của mình) → USDA (nếu có khoá) → AI gộp 1 lượt cho món lạ;
//    món lạ AI/USDA tính được → hàng chờ duyệt (savePendingFoodCache) khi Lưu. Mỗi bữa phải có món đạm + tinh bột + béo.
//  - src/adminTabs/TemplatesTab.jsx (chỉ PC): Tải file mẫu CSV + Nhập hàng loạt từ CSV (tra macro 100 g theo cùng chuỗi trên, % = gram tham chiếu).
//  - Bố cục: bảng mẫu rộng (bấm 1 dòng → xổ từng bữa + Sửa / Xoá); khi soạn → 2 cột: danh sách gọn trái, trình soạn phải.
import { useEffect, useMemo, useRef, useState } from "react";
import { appAlert, appConfirm } from "../lib/dialog";
import { ALL_MEALS, DEFAULT_MEAL_CONFIG } from "../mealConstants";
import { getFoodRole } from "../lib/localFoodDB";
import { searchUSDA, calcFromUSDA, translateFood, adjustCookingOil } from "../lib/usdaService";
import { aiCalc } from "../lib/calcAI";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { usePendingFoodCache } from "../hooks/usePendingFoodCache";
import { rowGram, resolveFree, missingRoles, TPL_UNITS, GOAL_OPTS, DIET_OPTS } from "../mobile/admin/TemplateEditor";
import { PC } from "../theme";
import { Btn, Pill, Card, SearchBox, FilterSelect, Loading, headRow, bodyRow, cell, secLbl, vnInt, vnDec } from "./pcUI";

const GOAL_VN = { tang_co: "Tăng cơ", giam_mo: "Giảm mỡ", duy_tri: "Duy trì" };
const DIET_VN = { balance: "Cân bằng", low_carb: "Low-carb", keto: "Keto" };
const ROLE_VN = { protein: "đạm", carb: "tinh bột", fat: "béo" };
const SRC_VN = { localDB: "Kho nội bộ", cache: "Cache", USDA: "USDA", AI: "AI" };
const COLS = "minmax(0,1fr) 100px 150px 72px 60px 60px 60px 64px";
const MINI = "minmax(0,1fr) 72px";
const ICOLS = "minmax(0,1fr) 80px 64px 76px 156px 28px";
const isW = (u) => !u || u === "g" || u === "ml";
const num = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const fmtQ = (q) => String(q ?? "").replace(".", ",");
const field = { width: "100%", minWidth: 0, height: 36, borderRadius: 10, background: "#FFFFFF", border: `1px solid ${PC.field}`, padding: "0 12px", fontSize: 13, color: PC.t1, fontFamily: "inherit" };
const lbl = { fontSize: 12, fontWeight: 800, color: PC.t3, paddingTop: 10 };

const goalTxt = (t) => [GOAL_VN[t.goal_type] || "—", t.goal_type === "giam_mo" && DIET_VN[t.diet_strategy] && t.diet_strategy !== "balance" ? DIET_VN[t.diet_strategy] : null].filter(Boolean).join(" · ");
const tplMacro = (t) => (t.meals || []).reduce((a, m) => (m.items || []).reduce((b, it) => ({ p: b.p + (Number(it.p) || 0), c: b.c + (Number(it.c) || 0), f: b.f + (Number(it.f) || 0) }), a), { p: 0, c: 0, f: 0 });
const mealLabel = (m) => ALL_MEALS.find((x) => x.id === m.meal_id)?.name || m.meal_name || m.meal_id;
const itemTxt = (it) => {
  const nm = it.food || it.name || "";
  if (!isW(it.unit)) return `${nm} ${fmtQ(it.qty || 1)} ${it.unit}`;
  return it.gram ? `${nm} ${Math.round(it.gram)} ${it.unit || "g"}` : nm;
};
const sigOf = (r) => `${String(r.name || "").trim().toLowerCase()}|${r.unit || "g"}|${isW(r.unit) ? "" : num(r.qty) || 1}|${isW(r.unit) ? String(r.gram ?? "") : ""}`;
// Bản ghi cache chờ duyệt (giống TemplateEditor): cân → theo 100 g; đếm → theo 1 đơn vị
function cacheEntry(item) {
  if (isW(item.unit)) {
    const g = Number(item.gram) || 0;
    if (!g) return null;
    const x = 100 / g;
    return { p: r1(item.p * x), c: r1(item.c * x), f: r1(item.f * x), fiber: r1((item.fiber || 0) * x), cal: Math.round(item.cal * x), gram: 100 };
  }
  const q = Number(item.qty) || 1;
  return { p: r1(item.p / q), c: r1(item.c / q), f: r1(item.f / q), fiber: r1((item.fiber || 0) / q), cal: Math.round(item.cal / q), gram: Math.round((item.gram || 0) / q) };
}
const getUsdaKey = (appSettings) => appSettings?.usda_key || (() => { try { return localStorage.getItem("usdaKey") || ""; } catch (e) { return ""; } })();

let UID = 0;
const newRow = (p = {}) => ({ uid: ++UID, name: "", unit: "g", qty: "", gram: "", ...p });
function initState(tpl) {
  const rows = {};
  ALL_MEALS.forEach((m) => { rows[m.id] = [newRow()]; });
  if (!tpl) return { name: "", dayType: "train", goal: "tang_co", diet: "balance", meals: [...DEFAULT_MEAL_CONFIG.train], rows };
  (tpl.meals || []).forEach((m) => {
    const its = (m.items || []).map((it) => {
      const unit = it.unit || "g";
      return newRow({ name: it.food || it.name || "", unit, qty: isW(unit) ? "" : String(it.qty || 1), gram: isW(unit) ? String(it.gram === 0 ? 0 : it.gram || "") : String(it.gram || "") });
    });
    if (its.length) rows[m.meal_id] = its;
  });
  const ids = (tpl.meals || []).map((m) => m.meal_id).filter(Boolean);
  const dt = tpl.day_type || "train";
  return { name: tpl.name || "", dayType: dt, goal: tpl.goal_type || "tang_co", diet: tpl.diet_strategy || "balance", meals: ids.length ? ids : [...DEFAULT_MEAL_CONFIG[dt]], rows };
}

function Seg({ value, onChange, opts, label, testid }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {opts.map((o) => {
        const on = value === o.value;
        return <button key={o.value} type="button" role="radio" aria-checked={on} data-testid={`${testid}-${o.value}`} onClick={() => onChange(o.value)} className="pc-btn"
          style={{ minWidth: 96, height: 36, padding: "0 14px", borderRadius: 10, border: `1.5px solid ${on ? "#1A7CFF" : PC.field}`, background: on ? PC.soft : "#FFFFFF", color: on ? PC.softFg : PC.t2, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{o.label}</button>;
      })}
    </div>
  );
}

// ---------------- Trình soạn mẫu (PC) ----------------
function TplEditor({ template, onClose, onSaved, dirtyRef, appSettings, showToast, saveDefaultTemplate, foodCache, myPending, savePendingFoodCache }) {
  const init = useMemo(() => initState(template), [template]);
  const [name, setName] = useState(init.name);
  const [dayType, setDayType] = useState(init.dayType);
  const [goal, setGoal] = useState(init.goal);
  const [diet, setDiet] = useState(init.diet);
  const [meals, setMeals] = useState(init.meals);
  const [rows, setRows] = useState(init.rows);
  const [res, setRes] = useState({});
  const [pend, setPend] = useState({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [tip, setTip] = useState(null);
  const touchedMeals = useRef(!!template);
  useEffect(() => { dirtyRef.current = false; return () => { dirtyRef.current = false; }; }, [dirtyRef]);

  const flags = parseFeatureFlags(appSettings);
  const usdaKey = getUsdaKey(appSettings);
  const fc = useMemo(() => ({ ...(myPending || {}), ...(foodCache || {}) }), [myPending, foodCache]);

  const touch = () => { dirtyRef.current = true; setErr(null); };
  const setRow = (mid, i, patch) => { touch(); setRows((p) => { const a = [...(p[mid] || [])]; a[i] = { ...a[i], ...patch }; return { ...p, [mid]: a }; }); };
  const addRow = (mid) => { touch(); setRows((p) => ({ ...p, [mid]: [...(p[mid] || []), newRow()] })); };
  const delRow = (mid, i) => { touch(); setRows((p) => { const a = [...(p[mid] || [])]; a.splice(i, 1); if (!a.length) a.push(newRow()); return { ...p, [mid]: a }; }); };
  const toggleMeal = (id) => { touch(); touchedMeals.current = true; setMeals((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const changeDay = (v) => { touch(); setDayType(v); if (!touchedMeals.current) setMeals([...DEFAULT_MEAL_CONFIG[v]]); };

  const selMeals = ALL_MEALS.filter((m) => meals.includes(m.id));
  const filled = selMeals.flatMap((m) => (rows[m.id] || []).filter((r) => r.name.trim()).map((r) => ({ mid: m.id, r })));
  const fresh = (r) => { const x = res[r.uid]; return x && x.sig === sigOf(r) ? x : null; };
  const allDone = filled.length > 0 && filled.every(({ r }) => fresh(r)?.item);
  const mealsData = selMeals.map((m) => ({
    meal_id: m.id, meal_name: m.name,
    items: (rows[m.id] || []).filter((r) => r.name.trim() && fresh(r)?.item).map((r) => fresh(r).item)
      .map((it) => ({ food: it.food, gram: it.gram || 0, unit: it.unit || "g", qty: it.qty || 1, p: it.p || 0, c: it.c || 0, f: it.f || 0, fiber: it.fiber || 0, cal: it.cal || 0 })),
  })).filter((m) => m.items.length > 0);
  const tot = mealsData.reduce((a, m) => m.items.reduce((b, it) => ({ cal: b.cal + it.cal, p: b.p + it.p, c: b.c + it.c, f: b.f + it.f }), a), { cal: 0, p: 0, c: 0, f: 0 });
  const lacks = mealsData.map((m) => ({ m, miss: missingRoles(m.items) })).filter((x) => x.miss.length);

  async function calcAll() {
    if (busy) return;
    setErr(null); setTip(null);
    if (!filled.length) { setErr("Chưa nhập thức ăn nào"); return; }
    setBusy(true);
    const out = {};
    const newPend = {};
    const left = [];
    filled.forEach(({ r }) => { const it = resolveFree(r, fc); if (it) out[r.uid] = { sig: sigOf(r), item: it }; else left.push(r); });
    const srcs = new Set(Object.values(out).map((x) => x.item.source));
    const still = [];
    if (usdaKey) {
      for (const r of left) {
        try {
          const tr = translateFood(r.name.trim());
          const found = tr ? await searchUSDA(tr.foodEN, usdaKey) : null;
          if (!found) { still.push(r); continue; }
          const gram = rowGram(r);
          const m = adjustCookingOil(calcFromUSDA(found, gram), tr.cookEN);
          const it = { food: r.name.trim(), unit: r.unit || "g", qty: isW(r.unit) ? 1 : num(r.qty) || 1, gram, p: m.protein, c: m.carb, f: m.fat, fiber: m.fiber || 0, cal: m.cal, source: "USDA" };
          out[r.uid] = { sig: sigOf(r), item: it }; srcs.add("USDA");
          const ce = cacheEntry(it); if (ce) newPend[it.food.toLowerCase()] = ce;
        } catch (e) { console.error("USDA error:", e); still.push(r); }
      }
    } else still.push(...left);
    let aiMsg = null;
    if (still.length) {
      if (!flags.ai_macro) {
        aiMsg = "Tính năng AI tính macro tự động đang tạm tắt. Món này chưa có trong Kho nội bộ/Cache/USDA, vui lòng nhập tay hoặc thử tên khác.";
        still.forEach((r) => { out[r.uid] = { sig: sigOf(r), fail: true }; });
      } else {
        const entries = still.map((r) => {
          const unit = r.unit || "g", nm = r.name.trim();
          if (isW(unit)) { const g = rowGram(r); return { raw: `${nm} ${g}${unit}`, name: nm.toLowerCase(), unit, qty: g }; }
          const q = num(r.qty) || 1;
          return { raw: `${fmtQ(q)} ${unit} ${nm}`, name: nm.toLowerCase(), unit, qty: q };
        });
        try {
          const { items } = await aiCalc(entries, appSettings);
          still.forEach((r, i) => {
            const a = items[i];
            if (!a || a.unknown) { out[r.uid] = { sig: sigOf(r), fail: true }; return; }
            const it = { food: r.name.trim(), unit: r.unit || "g", qty: isW(r.unit) ? 1 : num(r.qty) || 1, gram: a.gram, p: a.p, c: a.c, f: a.f, fiber: a.fiber || 0, cal: a.cal, source: "AI" };
            out[r.uid] = { sig: sigOf(r), item: it }; srcs.add("AI");
            const ce = cacheEntry(it); if (ce) newPend[it.food.toLowerCase()] = ce;
          });
          if (still.some((r) => out[r.uid]?.fail)) aiMsg = "AI chưa tính được một vài món (đánh dấu đỏ) — sửa tên rồi bấm tính lại.";
        } catch (e) {
          aiMsg = e.message || "Lỗi kết nối AI";
          still.forEach((r) => { out[r.uid] = { sig: sigOf(r), fail: true }; });
        }
      }
    }
    setRes(out);
    setPend((p) => ({ ...p, ...newPend }));
    setTip([...srcs].map((s) => SRC_VN[s]).filter(Boolean).join(" + ") || null);
    if (aiMsg) setErr(aiMsg);
    setBusy(false);
  }

  async function save() {
    if (saving) return;
    const nm = name.trim();
    if (!nm) { await appAlert("Nhập tên mẫu ở ô trên!", { title: "Thiếu tên mẫu" }); return; }
    if (!allDone) { await appAlert("Bấm “Tính macro tất cả” (sau mỗi lần sửa món) trước khi lưu mẫu.", { title: "Chưa tính macro" }); return; }
    if (!mealsData.length) { await appAlert("Không có dữ liệu bữa ăn", { title: "Chưa có món" }); return; }
    for (const m of mealsData) {
      const miss = missingRoles(m.items);
      if (miss.length) { await appAlert(`${m.meal_name || m.meal_id} đang thiếu món vai trò: ${miss.map((k) => ({ protein: "đạm", carb: "carb", fat: "béo" })[k]).join(", ")} — thêm món trước khi lưu.`, { title: "Bữa chưa đủ món" }); return; }
    }
    setSaving(true);
    try {
      if (saveDefaultTemplate) await saveDefaultTemplate(nm, dayType, mealsData, Math.round(tot.cal), template?.id || null, goal, goal === "giam_mo" ? diet : null);
      if (Object.keys(pend).length && savePendingFoodCache) savePendingFoodCache(pend, appSettings?.ai_provider || "claude");
      dirtyRef.current = false;
      showToast?.({ text: template ? "Đã cập nhật mẫu" : "Đã tạo mẫu — user thấy trong Thực đơn mẫu" });
      onSaved();
    } catch (e) {
      console.error("Save template error:", e);
      setErr("Chưa lưu được mẫu, thử lại giúp mình nhé.");
    } finally { setSaving(false); }
  }

  const cellIn = { ...field, height: 34, padding: "0 10px", fontWeight: 600 };
  return (
    <Card testid="pc-templates-editor" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <b style={{ fontSize: 15, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{template ? `Sửa mẫu · ${template.name || "Template"}` : "Mẫu mới"}</b>
        <button data-testid="pc-templates-close" onClick={onClose} aria-label="Đóng" className="pc-btn" style={{ width: 32, height: 32, border: "none", borderRadius: 8, background: "transparent", color: PC.t4, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "104px minmax(0,1fr)", gap: "10px 14px", alignItems: "start" }}>
        <span style={lbl}>Tên mẫu</span>
        <input data-testid="pc-templates-name" className="pc-input" value={name} maxLength={80} onChange={(e) => { touch(); setName(e.target.value); }} placeholder="VD: Ngày tập A — Ngực/Vai" aria-label="Tên mẫu" style={{ ...field, fontWeight: 600 }} />
        <span style={lbl}>Loại ngày</span>
        <Seg label="Loại ngày" testid="pc-templates-day" value={dayType} onChange={changeDay} opts={[{ value: "train", label: "Ngày tập" }, { value: "rest", label: "Ngày nghỉ" }]} />
        <span style={lbl}>Mục tiêu</span>
        <Seg label="Mục tiêu" testid="pc-templates-goal" value={goal} onChange={(v) => { touch(); setGoal(v); }} opts={GOAL_OPTS} />
        {goal === "giam_mo" && <>
          <span style={lbl}>Kiểu ăn</span>
          <Seg label="Kiểu ăn" testid="pc-templates-diet" value={diet} onChange={(v) => { touch(); setDiet(v); }} opts={DIET_OPTS} />
        </>}
        <span style={lbl}>Bữa trong mẫu</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ALL_MEALS.map((m) => {
            const on = meals.includes(m.id);
            return <button key={m.id} type="button" aria-pressed={on} data-testid={`pc-templates-meal-${m.id}`} onClick={() => toggleMeal(m.id)} className="pc-btn"
              style={{ height: 30, padding: "0 12px", borderRadius: 999, border: `1.5px solid ${on ? "#1A7CFF" : PC.field}`, background: on ? PC.soft : "#FFFFFF", color: on ? PC.softFg : PC.t2, fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{m.short}</button>;
          })}
        </div>
      </div>

      {selMeals.length === 0 && <span style={{ fontSize: 13, color: PC.t3 }}>Chọn ít nhất 1 bữa cho mẫu.</span>}

      {selMeals.map((m) => {
        const mk = (rows[m.id] || []).reduce((a, r) => a + (fresh(r)?.item?.cal || 0), 0);
        return (
          <div key={m.id} data-testid={`pc-templates-mealcard-${m.id}`} style={{ border: `1px solid ${PC.headLine}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", height: 40, background: PC.headBg, borderBottom: `1px solid ${PC.headLine}` }}>
              <b style={{ fontSize: 13.5, flex: 1 }}>{m.name}</b>
              <span style={{ fontSize: 12, color: PC.t3 }}>{mk ? `${vnInt(mk)} kcal` : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: ICOLS, gap: "0 8px", padding: "6px 14px 0 14px", fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".05em" }}>
              <span>TÊN MÓN</span><span>ĐƠN VỊ</span><span>SL</span><span>GRAM</span><span>MACRO</span><span />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "6px 14px 8px 14px" }}>
              {(rows[m.id] || []).map((r, i) => {
                const w = isW(r.unit);
                const st = r.name.trim() ? res[r.uid] : null;
                const ok = st && st.sig === sigOf(r) && st.item;
                const bad = st && st.sig === sigOf(r) && st.fail;
                return (
                  <div key={r.uid} style={{ display: "grid", gridTemplateColumns: ICOLS, gap: "0 8px", alignItems: "center" }}>
                    <input data-testid="pc-templates-item-name" className="pc-input" aria-label="Tên món" value={r.name} placeholder="Thêm món…" maxLength={60}
                      onChange={(e) => setRow(m.id, i, { name: e.target.value })} style={{ ...cellIn, ...(bad ? { borderColor: "#FCA5A5", background: "#FEF2F2" } : null) }} />
                    <select data-testid="pc-templates-item-unit" className="pc-input" aria-label="Đơn vị" value={r.unit || "g"}
                      onChange={(e) => { const v = e.target.value; setRow(m.id, i, isW(v) ? { unit: v, qty: "", gram: isW(r.unit) ? r.gram : "" } : { unit: v, qty: r.qty || "1" }); }}
                      style={{ ...cellIn, padding: "0 6px", fontWeight: 700, cursor: "pointer" }}>
                      {TPL_UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
                    </select>
                    {w
                      ? <input aria-label="Số lượng" disabled value="" style={{ ...cellIn, background: "#F8FAFC" }} />
                      : <input data-testid="pc-templates-item-qty" className="pc-num" inputMode="decimal" aria-label="Số lượng" value={r.qty} onChange={(e) => setRow(m.id, i, { qty: e.target.value.replace(/[^\d.,]/g, "") })} style={cellIn} />}
                    {w
                      ? <input data-testid="pc-templates-item-gram" className="pc-num" inputMode="numeric" aria-label={r.unit === "ml" ? "Số ml" : "Số gram"} value={r.gram} onChange={(e) => setRow(m.id, i, { gram: e.target.value.replace(/[^\d]/g, "") })} style={cellIn} />
                      : <input data-testid="pc-templates-item-gram" aria-label="Gram ước tính" readOnly tabIndex={-1} value={r.name.trim() ? `~${ok ? st.item.gram : rowGram(r)}` : ""} style={{ ...cellIn, background: "#F8FAFC", color: PC.t3 }} />}
                    <span style={{ ...cell, fontSize: 12, color: bad ? PC.danger : PC.t2 }} title={ok ? `${vnInt(st.item.cal)} kcal · Đ ${vnDec(st.item.p)} · TB ${vnDec(st.item.c)} · B ${vnDec(st.item.f)}${st.item.source ? ` · ${SRC_VN[st.item.source] || st.item.source}` : ""}` : undefined}>
                      {ok ? <><b style={{ color: PC.t1 }}>{vnInt(st.item.cal)}</b> · Đ {vnDec(st.item.p)} · TB {vnDec(st.item.c)} · B {vnDec(st.item.f)}</> : bad ? "Chưa tính được" : <span style={{ color: PC.t4 }}>{r.name.trim() ? "chưa tính" : ""}</span>}
                    </span>
                    <button data-testid="pc-templates-item-del" aria-label="Xoá món" onClick={() => delRow(m.id, i)} className="pc-btn"
                      style={{ width: 28, height: 34, padding: 0, border: "none", borderRadius: 8, background: "transparent", color: PC.t4, fontSize: 18, cursor: "pointer", fontFamily: "inherit" }}>×</button>
                  </div>
                );
              })}
              <span><button data-testid="pc-templates-add-item" type="button" onClick={() => addRow(m.id)} className="pc-btn" style={{ height: 28, padding: "0 4px", border: "none", background: "transparent", color: PC.softFg, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ Thêm món</button></span>
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Btn kind="soft" onClick={calcAll} disabled={busy} testid="pc-templates-calc">{busy ? "Đang tính…" : "Tính macro tất cả"}</Btn>
        <span style={{ fontSize: 12, color: PC.t3 }}>Món có trong kho tính ngay; món lạ AI tính (tốn lượt AI).</span>
      </div>
      {err && <div data-testid="pc-templates-err" role="alert" style={{ padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", color: PC.danger, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{err}</div>}

      {mealsData.length > 0 && (
        <div data-testid="pc-templates-total" style={{ borderRadius: 12, background: PC.editBg, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: PC.t2 }}>Tổng mẫu</span>
            <b style={{ fontSize: 22 }}>{vnInt(tot.cal)} <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>kcal</span></b>
            <span style={{ display: "flex", gap: 6, marginLeft: "auto" }}><Pill tone="blue">Đ {vnInt(tot.p)} g</Pill><Pill tone="amber">TB {vnInt(tot.c)} g</Pill><Pill tone="red">B {vnInt(tot.f)} g</Pill></span>
          </div>
          {!allDone && <span style={{ fontSize: 12, color: "#B45309" }}>Có món mới sửa / chưa tính — bấm “Tính macro tất cả” lại.</span>}
          {lacks.length === 0
            ? <span data-testid="pc-templates-check" style={{ fontSize: 12, color: "#15803D", fontWeight: 700 }}>Mỗi bữa đủ món đạm, tinh bột, béo</span>
            : <div data-testid="pc-templates-check" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {lacks.map(({ m, miss }) => <span key={m.meal_id} style={{ fontSize: 12, color: PC.danger }}>{m.meal_name} thiếu món {miss.map((k) => ROLE_VN[k]).join(", ")}</span>)}
            </div>}
          {tip && <span style={{ fontSize: 12, color: PC.t3 }}>Nguồn: {tip}</span>}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4, borderTop: `1px solid ${PC.rowLine}` }}>
        <Btn kind="light" onClick={onClose} testid="pc-templates-cancel">Huỷ</Btn>
        <Btn kind="blue" onClick={save} disabled={saving || busy} testid="pc-templates-save">{saving ? "Đang lưu…" : template ? "Cập nhật mẫu" : "Lưu mẫu"}</Btn>
      </div>
    </Card>
  );
}

// ---------------- Nhập CSV (chỉ PC, như tab cũ) ----------------
function parseCsvLine(line) {
  const out = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
function downloadTemplateCSV() {
  const rows = [
    ["Tên mẫu", "Ngày", "Mục tiêu", "Diet", "Bữa", "Món ăn", "%"],
    ["Ức gà cơm rau - Tăng cơ", "Tập", "Tăng cơ", "", "Sáng", "Trứng gà luộc", ""],
    ["Ức gà cơm rau - Tăng cơ", "Tập", "Tăng cơ", "", "Sáng", "Bánh mì", ""],
    ["Ức gà cơm rau - Tăng cơ", "Tập", "Tăng cơ", "", "Trưa", "Ức gà luộc", "60"],
    ["Ức gà cơm rau - Tăng cơ", "Tập", "Tăng cơ", "", "Trưa", "Thịt lợn nạc luộc", "40"],
    ["Ức gà cơm rau - Tăng cơ", "Tập", "Tăng cơ", "", "Trưa", "Cơm", ""],
  ];
  const csv = rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "mau_thuc_don_fipilot.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const GOAL_MAP = { "tăng cơ": "tang_co", "giảm mỡ": "giam_mo", "duy trì": "duy_tri" };
const DIET_MAP = { "low-carb": "low_carb", "low carb": "low_carb", keto: "keto", "cân bằng": "balance" };
const matchMealId = (raw) => { const k = (raw || "").toLowerCase().trim(); return ALL_MEALS.find((m) => m.id === k || m.name.toLowerCase() === k || m.short.toLowerCase() === k)?.id || null; };

function ImportPanel({ onClose, appSettings, saveDefaultTemplate, foodCache, myPending }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [report, setReport] = useState(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  // Tra macro / 100 g cho mỗi tên món (không trùng): Kho nội bộ → Cache → USDA → AI (như luồng callAI cũ)
  async function lookup100(names) {
    const fc = { ...(myPending || {}), ...(foodCache || {}) };
    const map = {};
    const left = [];
    names.forEach((nm) => {
      const it = resolveFree({ name: nm, unit: "g", gram: "100" }, fc);
      if (it) { const x = 100 / (it.gram || 100); map[nm.toLowerCase()] = { p: it.p * x, c: it.c * x, f: it.f * x, fiber: (it.fiber || 0) * x, cal: it.cal * x, source: it.source }; }
      else left.push(nm);
    });
    const usdaKey = getUsdaKey(appSettings);
    const still = [];
    if (usdaKey) {
      for (const nm of left) {
        try {
          const tr = translateFood(nm);
          const found = tr ? await searchUSDA(tr.foodEN, usdaKey) : null;
          if (!found) { still.push(nm); continue; }
          const m = adjustCookingOil(calcFromUSDA(found, 100), tr.cookEN);
          map[nm.toLowerCase()] = { p: m.protein, c: m.carb, f: m.fat, fiber: m.fiber || 0, cal: m.cal, source: "USDA" };
        } catch (e) { still.push(nm); }
      }
    } else still.push(...left);
    if (still.length && parseFeatureFlags(appSettings).ai_macro) {
      if (!await appConfirm(`${still.length} món chưa có trong Kho nội bộ / Cache / USDA:\n${still.slice(0, 8).join(", ")}${still.length > 8 ? "…" : ""}\n\nDùng AI tính (tốn lượt AI)?`, { title: "Tra món lạ bằng AI?", confirmText: "Dùng AI" })) return map;
      const { items } = await aiCalc(still.map((nm) => ({ raw: `${nm} 100g`, name: nm.toLowerCase(), unit: "g", qty: 100 })), appSettings);
      still.forEach((nm, i) => {
        const a = items[i];
        if (!a || a.unknown) return;
        const x = 100 / (a.gram || 100);
        map[nm.toLowerCase()] = { p: a.p * x, c: a.c * x, f: a.f * x, fiber: (a.fiber || 0) * x, cal: a.cal * x, source: "AI" };
      });
    }
    return map;
  }

  async function handleFile(file) {
    setErr(null); setReport(null);
    try {
      const text = await file.text();
      const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) { setErr("File rỗng hoặc thiếu dữ liệu."); return; }
      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = { name: header.indexOf("tên mẫu"), day: header.indexOf("ngày"), goal: header.indexOf("mục tiêu"), diet: header.indexOf("diet"), meal: header.indexOf("bữa"), food: header.indexOf("món ăn"), pct: header.indexOf("%") };
      if (idx.name < 0 || idx.meal < 0 || idx.food < 0) { setErr('File thiếu cột bắt buộc: "Tên mẫu", "Bữa", "Món ăn".'); return; }
      let last = { name: "", day: "", goal: "", diet: "" };
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const c = parseCsvLine(lines[i]);
        const name = c[idx.name] || last.name;
        const day = (idx.day >= 0 ? c[idx.day] : "") || last.day;
        const goal = (idx.goal >= 0 ? c[idx.goal] : "") || last.goal;
        const diet = idx.diet >= 0 ? c[idx.diet] || last.diet : "";
        const mealRaw = c[idx.meal];
        const food = c[idx.food];
        const pct = idx.pct >= 0 ? c[idx.pct] : "";
        if (!name || !mealRaw || !food) continue;
        last = { name, day, goal, diet };
        const mealId = matchMealId(mealRaw);
        if (!mealId) { setErr(`Dòng ${i + 1}: "${mealRaw}" không phải tên bữa hợp lệ (VD: Sáng, Trưa, Phụ chiều, Trước tập, Sau tập, Tối).`); return; }
        rows.push({ name, day, goal, diet, mealId, food: food.trim(), pct: pct ? Number(pct) : null });
      }
      if (!rows.length) { setErr("Không có dòng dữ liệu hợp lệ nào."); return; }
      const tplMap = {};
      rows.forEach((r) => {
        if (!tplMap[r.name]) tplMap[r.name] = { name: r.name, dayType: (r.day || "").toLowerCase().includes("nghỉ") ? "rest" : "train", goalType: GOAL_MAP[(r.goal || "").toLowerCase().trim()] || "tang_co", dietStrategy: DIET_MAP[(r.diet || "").toLowerCase().trim()] || "balance", meals: {} };
        (tplMap[r.name].meals[r.mealId] = tplMap[r.name].meals[r.mealId] || []).push({ food: r.food, pct: r.pct });
      });
      const parsed = Object.values(tplMap);
      const uniq = [...new Map(rows.map((r) => [r.food.toLowerCase().trim(), r.food])).values()];
      setBusy(true);
      let macroMap;
      try { macroMap = await lookup100(uniq); } catch (e) { setErr("Lỗi tra macro: " + (e.message || e)); setBusy(false); return; }
      const DEFAULT_REF = { protein: 150, carb: 150, fat: 10, fixed: 100 };
      const rep = parsed.map((tpl) => {
        let hasError = false; const errors = []; const sources = new Set(); const mealsData = [];
        Object.entries(tpl.meals).forEach(([mealId, items]) => {
          const resolved = items.map((it) => {
            const m = macroMap[it.food.toLowerCase().trim()];
            if (!m) { hasError = true; errors.push(`Không tra được món "${it.food}"`); return null; }
            sources.add(m.source);
            return { ...it, macro100: m, role: getFoodRole(it.food) };
          }).filter(Boolean);
          if (!resolved.length) return;
          const mealItems = resolved.map((it) => {
            const g = it.pct != null ? Math.max(5, Number(it.pct)) : DEFAULT_REF[it.role] || 100;
            const s = g / 100;
            return { food: it.food, gram: g, p: r1(it.macro100.p * s), c: r1(it.macro100.c * s), f: r1(it.macro100.f * s), fiber: r1(it.macro100.fiber * s), cal: Math.round(it.macro100.cal * s) };
          });
          mealsData.push({ meal_id: mealId, meal_name: ALL_MEALS.find((m) => m.id === mealId)?.name || mealId, items: mealItems });
        });
        const totalCal = mealsData.reduce((s, m) => s + m.items.reduce((a, it) => a + it.cal, 0), 0);
        return { name: tpl.name, dayType: tpl.dayType, goalType: tpl.goalType, dietStrategy: tpl.dietStrategy, mealsData, totalCal: Math.round(totalCal), hasError: hasError || !mealsData.length, errors, sources: [...sources] };
      });
      setReport(rep);
    } catch (e) { setErr("Lỗi đọc file: " + e.message); }
    setBusy(false);
  }

  async function create() {
    if (!report || creating) return;
    const valid = report.filter((r) => !r.hasError);
    if (!valid.length) return;
    setCreating(true);
    for (const r of valid) {
      if (saveDefaultTemplate) await saveDefaultTemplate(r.name, r.dayType, r.mealsData, r.totalCal, null, r.goalType, r.goalType === "giam_mo" ? r.dietStrategy : null);
    }
    setCreating(false);
    onClose();
    appAlert(`Đã tạo ${valid.length} mẫu thành công${report.length > valid.length ? `, bỏ qua ${report.length - valid.length} mẫu lỗi` : ""}.`);
  }

  const nOk = report ? report.filter((r) => !r.hasError).length : 0;
  return (
    <Card testid="pc-templates-import" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ ...secLbl, flex: 1 }}>NHẬP HÀNG LOẠT TỪ CSV</span>
        <button data-testid="pc-templates-import-close" onClick={onClose} aria-label="Đóng" className="pc-btn" style={{ width: 32, height: 32, border: "none", borderRadius: 8, background: "transparent", color: PC.t4, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}>×</button>
      </div>
      {!busy && !report && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input ref={fileRef} data-testid="pc-templates-import-file" type="file" accept=".csv" aria-label="Chọn file CSV" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <Btn kind="blue" onClick={() => fileRef.current?.click()} testid="pc-templates-import-pick">Chọn file CSV</Btn>
          <span style={{ fontSize: 12, color: PC.t3 }}>Cột bắt buộc: Tên mẫu, Bữa, Món ăn. Cột % để trống nếu là món phụ tự tính (cơm, dầu ăn…).</span>
        </div>
      )}
      {busy && <Loading text="Đang tra macro từng món (Kho nội bộ → Cache → USDA → AI)…" />}
      {err && <div data-testid="pc-templates-import-err" role="alert" style={{ padding: "10px 14px", borderRadius: 10, background: "#FEF2F2", color: PC.danger, fontSize: 13, fontWeight: 600 }}>{err}</div>}
      {report && <>
        <span style={{ fontSize: 13, fontWeight: 700, color: PC.t2 }}>Kết quả kiểm tra: {nOk}/{report.length} mẫu hợp lệ</span>
        <div style={{ border: `1px solid ${PC.headLine}`, borderRadius: 12, overflow: "hidden" }}>
          {report.map((r, i) => (
            <div key={i} data-testid="pc-templates-import-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderBottom: i === report.length - 1 ? "none" : `1px solid ${PC.rowLine}`, fontSize: 13 }}>
              {r.hasError ? <Pill tone="red">Lỗi</Pill> : <Pill tone="green">Hợp lệ</Pill>}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.name}>{r.name}</b>
                {r.hasError
                  ? <span style={{ fontSize: 12, color: PC.danger }}>{r.errors.join("; ") || "Không có bữa nào hợp lệ"}</span>
                  : <span style={{ fontSize: 12, color: PC.t3 }}>{r.mealsData.length} bữa · {vnInt(r.totalCal)} kcal · nguồn: {r.sources.map((s) => (s === "localDB" ? "Kho gốc" : SRC_VN[s] || s)).join(", ")}</span>}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn kind="light" onClick={() => { setReport(null); setErr(null); }} testid="pc-templates-import-again">Chọn file khác</Btn>
          <Btn kind="green" onClick={create} disabled={!nOk || creating} testid="pc-templates-import-create">{creating ? "Đang tạo…" : `Tạo ${nOk} mẫu hợp lệ${report.length > nOk ? ` (bỏ qua ${report.length - nOk} mẫu lỗi)` : ""}`}</Btn>
        </div>
      </>}
    </Card>
  );
}

// ---------------- Trang ----------------
export function PcTemplates({ top, isAdmin = true, user, appSettings, showToast, adminP = {} }) {
  const { defaultTemplates, saveDefaultTemplate, deleteDefaultTemplate, refreshDefaultTemplates, foodCache } = adminP;
  const { myPending, savePendingFoodCache } = usePendingFoodCache(user?.id, !!isAdmin);
  const [loading, setLoading] = useState(!(defaultTemplates || []).length && !!refreshDefaultTemplates);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | template
  const [importOpen, setImportOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [dayF, setDayF] = useState("all");
  const [goalF, setGoalF] = useState("all");
  const dirtyRef = useRef(false);

  useEffect(() => {
    let live = true;
    if (!refreshDefaultTemplates) return;
    Promise.resolve(refreshDefaultTemplates()).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = defaultTemplates || [];
  const filtered = useMemo(() => {
    let a = list;
    if (search.trim()) { const s = search.trim().toLowerCase(); a = a.filter((t) => (t.name || "").toLowerCase().includes(s)); }
    if (dayF !== "all") a = a.filter((t) => (t.day_type === "rest" ? "rest" : "train") === dayF);
    if (goalF !== "all") a = a.filter((t) => t.goal_type === goalF);
    return a;
  }, [list, search, dayF, goalF]);
  const nRest = list.filter((t) => t.day_type === "rest").length;

  const guard = async () => !dirtyRef.current || appConfirm("Các món vừa nhập sẽ không được lưu.", { title: "Bỏ thay đổi?", confirmText: "Bỏ", danger: true });
  const openEditor = async (t) => {
    if (editing && (editing === t || (t !== "new" && editing !== "new" && editing.id === t.id))) return;
    if (!await guard()) return;
    setImportOpen(false); setEditing(t);
  };
  const closeEditor = async () => { if (!await guard()) return; setEditing(null); };

  async function del(t) {
    if (!await appConfirm(`Xoá mẫu "${t.name || "Template"}"? User sẽ không còn thấy mẫu này trong Thực đơn mẫu.`, { title: "Xoá mẫu?", confirmText: "Xoá", danger: true })) return;
    setBusyId(t.id);
    try {
      if (deleteDefaultTemplate) await deleteDefaultTemplate(t.id);
      setOpen(null);
      if (editing && editing !== "new" && editing.id === t.id) { dirtyRef.current = false; setEditing(null); }
      showToast?.({ text: "Đã xoá mẫu" });
    } catch (e) {
      console.error("Delete template error:", e);
      showToast?.({ text: "Chưa xoá được mẫu, thử lại giúp mình nhé." });
    } finally { setBusyId(null); }
  }

  if (!isAdmin) return <>{top(null)}<div data-testid="pc-templates" style={{ padding: "20px 24px" }}><Card style={{ padding: 20, color: PC.t3 }}>Chỉ quản trị viên dùng được trang này.</Card></div></>;

  const editId = editing && editing !== "new" ? editing.id : null;
  const filters = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <SearchBox value={search} onChange={setSearch} placeholder="Tìm mẫu…" width={editing ? 150 : 260} testid="pc-templates-search" />
      <FilterSelect fontSize={13} label="Loại ngày" value={dayF} onChange={setDayF} testid="pc-templates-f-day" options={[{ v: "all", label: "Tất cả", full: `Tất cả (${vnInt(list.length)})` }, { v: "train", label: "Ngày tập", full: `Ngày tập (${vnInt(list.length - nRest)})` }, { v: "rest", label: "Ngày nghỉ", full: `Ngày nghỉ (${vnInt(nRest)})` }]} />
      {!editing && <FilterSelect fontSize={13} label="Mục tiêu" value={goalF} onChange={setGoalF} testid="pc-templates-f-goal" options={[{ v: "all", label: "Tất cả", full: "Tất cả mục tiêu" }, ...GOAL_OPTS.map((o) => ({ v: o.value, label: o.label, full: `${o.label} (${vnInt(list.filter((t) => t.goal_type === o.value).length)})` }))]} />}
      {!editing && <span data-testid="pc-templates-count" style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, whiteSpace: "nowrap" }}>{vnInt(filtered.length)} / {vnInt(list.length)} mẫu · {vnInt(list.length - nRest)} ngày tập · {vnInt(nRest)} ngày nghỉ</span>}
    </div>
  );
  const empty = loading && !list.length ? <Loading />
    : !filtered.length ? <div data-testid="pc-templates-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>{list.length ? "Không có mẫu nào khớp bộ lọc." : "Chưa có mẫu nào — bấm “+ Tạo mẫu”."}</div> : null;

  return (
    <>
      {top(<span style={{ display: "inline-flex", gap: 8 }}>
        <Btn kind="light" onClick={downloadTemplateCSV} testid="pc-templates-csv-sample">Tải file mẫu CSV</Btn>
        <Btn kind="soft" onClick={async () => { if (editing && !await guard()) return; setEditing(null); setImportOpen(true); }} testid="pc-templates-import-open">Nhập từ CSV</Btn>
        <Btn kind="blue" onClick={() => openEditor("new")} testid="pc-templates-new">+ Tạo mẫu</Btn>
      </span>)}
      <div data-testid="pc-templates" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {importOpen && !editing && <ImportPanel onClose={() => setImportOpen(false)} appSettings={appSettings} saveDefaultTemplate={saveDefaultTemplate} foodCache={foodCache} myPending={myPending} />}

        {!editing ? <>
          {filters}
          <Card testid="pc-templates-table">
            <div style={headRow(COLS)}><span>TÊN MẪU</span><span>LOẠI NGÀY</span><span>MỤC TIÊU</span><span>KCAL</span><span>ĐẠM</span><span>TB</span><span>BÉO</span><span>SỐ BỮA</span></div>
            {empty}
            {!empty && filtered.map((t, i) => {
              const isOpen = open === t.id;
              const last = i === filtered.length - 1;
              const mc = tplMacro(t);
              const rest = t.day_type === "rest";
              return (
                <div key={t.id}>
                  <button data-testid="pc-templates-row" data-id={t.id} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)} className="pc-row pc-click"
                    style={{ ...bodyRow(COLS, isOpen), cursor: "pointer", borderBottom: last && !isOpen ? "none" : bodyRow(COLS).borderBottom, borderRadius: last && !isOpen ? "0 0 14px 14px" : 0 }}>
                    <b style={{ ...cell, fontSize: 13 }} title={t.name || "Template"}>{t.name || "Template"}</b>
                    <span style={cell}><Pill tone={rest ? "blue" : "green"}>{rest ? "Ngày nghỉ" : "Ngày tập"}</Pill></span>
                    <span style={cell} title={goalTxt(t)}>{goalTxt(t)}</span>
                    <b style={cell}>{vnInt(t.total_cal)}</b>
                    <span style={cell}>{vnInt(mc.p)}</span>
                    <span style={cell}>{vnInt(mc.c)}</span>
                    <span style={cell}>{vnInt(mc.f)}</span>
                    <span style={cell}>{(t.meals || []).length}</span>
                  </button>
                  {isOpen && (
                    <div data-testid="pc-templates-detail" style={{ padding: "10px 16px 12px 16px", background: PC.editBg, display: "flex", flexDirection: "column", gap: 6, borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                      {(t.meals || []).map((m, mi) => {
                        const k = (m.items || []).reduce((a, it) => a + (Number(it.cal) || 0), 0);
                        const items = (m.items || []).map(itemTxt).join(", ") || "—";
                        return (
                          <div key={mi} style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr) 80px", gap: 12, fontSize: 12.5, alignItems: "center" }}>
                            <b style={cell}>{mealLabel(m)}</b>
                            <span style={{ ...cell, color: PC.t2 }} title={items}>{items}</span>
                            <span style={{ ...cell, color: PC.t3, textAlign: "right" }}>{vnInt(k)} kcal</span>
                          </div>
                        );
                      })}
                      {!(t.meals || []).length && <span style={{ fontSize: 12.5, color: PC.t3 }}>Mẫu chưa có bữa nào.</span>}
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <Btn kind="blue" onClick={() => openEditor(t)} testid="pc-templates-edit">Sửa mẫu</Btn>
                        <Btn kind="danger" onClick={() => del(t)} disabled={busyId === t.id} testid="pc-templates-del">{busyId === t.id ? "Đang xoá…" : "Xoá"}</Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </> : (
          <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, position: "sticky", top: PC.topH + 20 }}>
              {filters}
              <Card testid="pc-templates-mini">
                <div style={headRow(MINI)}><span>MẪU · {vnInt(filtered.length)}</span><span style={{ textAlign: "right" }}>KCAL</span></div>
                {empty}
                <div style={{ maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
                  {!empty && filtered.map((t, i) => {
                    const on = t.id === editId;
                    const last = i === filtered.length - 1;
                    return (
                      <button key={t.id} data-testid="pc-templates-mini-row" aria-pressed={on} onClick={() => openEditor(t)} className="pc-row pc-click"
                        style={{ ...bodyRow(MINI, on), minHeight: 52, padding: "6px 16px", cursor: "pointer", borderBottom: last ? "none" : bodyRow(MINI).borderBottom, boxShadow: on ? "inset 3px 0 0 #1A7CFF" : "none" }}>
                        <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                          <b style={{ ...cell, fontSize: 13 }} title={t.name || "Template"}>{t.name || "Template"}</b>
                          <span style={{ ...cell, fontSize: 12, color: PC.t3 }}>{t.day_type === "rest" ? "Ngày nghỉ" : "Ngày tập"} · {goalTxt(t)} · {(t.meals || []).length} bữa</span>
                        </span>
                        <b style={{ ...cell, textAlign: "right" }}>{vnInt(t.total_cal)}</b>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
            <TplEditor key={editId || "new"} template={editing === "new" ? null : editing} dirtyRef={dirtyRef}
              onClose={closeEditor} onSaved={() => { setEditing(null); setOpen(null); }}
              appSettings={appSettings} showToast={showToast} saveDefaultTemplate={saveDefaultTemplate}
              foodCache={foodCache} myPending={myPending} savePendingFoodCache={savePendingFoodCache} />
          </div>
        )}
      </div>
    </>
  );
}
