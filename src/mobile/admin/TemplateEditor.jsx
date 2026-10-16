// Soạn mẫu thực đơn (bản vẽ 103, nền tối DK, chốt 16/10) — thay phần soạn của tab cũ src/adminTabs/TemplatesTab.jsx.
// Giữ nguyên dữ liệu & luật lưu cũ:
//  - Lưu qua saveDefaultTemplate(name, day_type, meals[{meal_id, meal_name, items[{food,gram,unit,qty,p,c,f,fiber,cal}]}], total_cal, editId, goal_type, diet_strategy|null)
//  - goal_type: tang_co / giam_mo / duy_tri · diet_strategy (chỉ khi giam_mo): balance / low_carb / keto
//  - Mỗi bữa phải có ít nhất 1 món vai trò đạm + carb + béo (getFoodRole) thì mới lưu được.
// "Tính macro tất cả" chạy đúng thứ tự cũ của AdminPanel.callAI: Kho nội bộ (lookupLocalFood) → Cache (food_cache +
// món chờ duyệt của chính mình) → USDA (nếu có key) → AI chỉ cho món lạ còn lại, gộp 1 lượt (aiCalc, feature macro_lookup).
// Món lạ AI/USDA tính được lưu vào hàng chờ duyệt (savePendingFoodCache) khi bấm Lưu mẫu — như tab cũ.
// Import CSV vẫn chỉ có trên PC (không làm ở đây).
import { useState, useRef, useMemo } from "react";
import { DK } from "../../theme";
import { SubPage, Seg, Icon } from "../ui";
import { Card, Btn, BtnRow, Field, inp, NumInput, Chip, Pill, useConfirm } from "./adminUI";
import { ALL_MEALS, DEFAULT_MEAL_CONFIG } from "../../mealConstants";
import { lookupLocalFood, getFoodRole } from "../../lib/localFoodDB";
import { estimateGram, searchUSDA, calcFromUSDA, translateFood, adjustCookingOil } from "../../lib/usdaService";
import { aiCalc } from "../../lib/calcAI";
import { parseFeatureFlags } from "../../adminTabs/FeatureFlagsTab";

export const TPL_UNITS = [
  { v: "g", l: "g" }, { v: "ml", l: "ml" }, { v: "quả", l: "quả" }, { v: "hộp", l: "hộp" },
  { v: "lát", l: "lát" }, { v: "bát", l: "bát" }, { v: "scoop", l: "scoop" },
];
export const GOAL_OPTS = [{ value: "tang_co", label: "Tăng cơ" }, { value: "giam_mo", label: "Giảm mỡ" }, { value: "duy_tri", label: "Duy trì" }];
export const DIET_OPTS = [{ value: "balance", label: "Cân bằng" }, { value: "low_carb", label: "Low-carb" }, { value: "keto", label: "Keto" }];
const ROLE_VN = { protein: "đạm", carb: "tinh bột", fat: "béo" };

const isW = (u) => !u || u === "g" || u === "ml";
const num = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const fmtN = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
const fmtQ = (q) => String(q ?? "").replace(".", ",");

// Gram thực tế của 1 dòng (đơn vị đếm → ước lượng như tab cũ)
export function rowGram(r) {
  const unit = r.unit || "g";
  if (isW(unit)) return num(r.gram) || (String(r.gram ?? "").trim() === "0" ? 0 : 100);
  const q = num(r.qty) || 1;
  return estimateGram(r.name, unit, q) || Math.round(100 * q);
}
const sigOf = (r) => `${String(r.name || "").trim().toLowerCase()}|${r.unit || "g"}|${isW(r.unit) ? "" : num(r.qty) || 1}|${isW(r.unit) ? String(r.gram ?? "") : ""}`;

// Bước 1+2: kho nội bộ + cache (miễn phí). Trả item hoặc null (món lạ). Hàm thuần.
export function resolveFree(r, fc) {
  const name = String(r.name || "").trim();
  if (!name) return null;
  const unit = r.unit || "g", w = isW(unit), qty = w ? 1 : num(r.qty) || 1;
  const gram = rowGram(r);
  const base = { food: name, unit, qty };
  const loc = lookupLocalFood(name, gram);
  if (loc) return { ...base, gram: loc.gram, p: loc.protein, c: loc.carb, f: loc.fat, fiber: loc.fiber || 0, cal: loc.cal, source: "localDB" };
  const k = name.toLowerCase();
  const v = fc && fc[k];
  if (v) {
    if (w) {
      const x = gram / (v.gram || 100);
      return { ...base, gram, p: r1(v.p * x), c: r1(v.c * x), f: r1(v.f * x), fiber: r1((v.fiber || 0) * x), cal: Math.round(v.cal * x), source: "cache" };
    }
    return { ...base, gram: Math.round((v.gram || 0) * qty), p: r1(v.p * qty), c: r1(v.c * qty), f: r1(v.f * qty), fiber: r1((v.fiber || 0) * qty), cal: Math.round(v.cal * qty), source: "cache" };
  }
  return null;
}

// Bản ghi cache chờ duyệt: đơn vị cân → theo 100 g; đơn vị đếm → theo 1 đơn vị (giống tab cũ)
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

// Thiếu vai trò nào trong 1 bữa (luật lưu cũ)
export function missingRoles(items) {
  const roles = new Set((items || []).map((it) => getFoodRole(it.food)));
  return ["protein", "carb", "fat"].filter((k) => !roles.has(k));
}

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

const cellInp = { ...inp, height: 40, padding: "0 10px", fontSize: 16, fontWeight: 600, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const GRID = { display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px 46px 64px 24px", gap: 6, alignItems: "center" };
const lbl = { fontSize: 12, fontWeight: 700, color: DK.t2 };

export function TemplateEditor({ template, onBack, onSaved, user, isAdmin, appSettings, showToast, saveDefaultTemplate, foodCache, myPending, savePendingFoodCache }) {
  const init = useMemo(() => initState(template), [template]);
  const [name, setName] = useState(init.name);
  const [dayType, setDayType] = useState(init.dayType);
  const [goal, setGoal] = useState(init.goal);
  const [diet, setDiet] = useState(init.diet);
  const [meals, setMeals] = useState(init.meals);
  const [rows, setRows] = useState(init.rows);
  const [res, setRes] = useState({}); // uid → { sig, item } | { sig, fail:true }
  const [pend, setPend] = useState({}); // món lạ AI/USDA vừa tính → hàng chờ duyệt khi lưu
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [tip, setTip] = useState(null);
  const touchedMeals = useRef(!!template);
  const dirty = useRef(false);
  const [confirm, dialog] = useConfirm();
  const alert = (title, text) => confirm({ title, text, ok: "Đã hiểu", alert: true });

  const flags = parseFeatureFlags(appSettings);
  const usdaKey = appSettings?.usda_key || (() => { try { return localStorage.getItem("usdaKey") || ""; } catch (e) { return ""; } })();
  const fc = useMemo(() => ({ ...(myPending || {}), ...(foodCache || {}) }), [myPending, foodCache]);

  const touch = () => { dirty.current = true; setErr(null); };
  const setRow = (mid, i, patch) => { touch(); setRows((p) => { const a = [...(p[mid] || [])]; a[i] = { ...a[i], ...patch }; return { ...p, [mid]: a }; }); };
  const addRow = (mid) => { touch(); setRows((p) => ({ ...p, [mid]: [...(p[mid] || []), newRow()] })); };
  const delRow = (mid, i) => { touch(); setRows((p) => { const a = [...(p[mid] || [])]; a.splice(i, 1); if (!a.length) a.push(newRow()); return { ...p, [mid]: a }; }); };
  const toggleMeal = (id) => { touch(); touchedMeals.current = true; setMeals((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const changeDay = (v) => { touch(); setDayType(v); if (!touchedMeals.current) setMeals([...DEFAULT_MEAL_CONFIG[v]]); };

  const selMeals = ALL_MEALS.filter((m) => meals.includes(m.id));
  const filled = selMeals.flatMap((m) => (rows[m.id] || []).filter((r) => r.name.trim()).map((r) => ({ mid: m.id, r })));

  // Kết quả còn đúng với dòng hiện tại (đổi tên / SL / gram → phải tính lại)
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
    // Bước 3: USDA (chỉ tra tên nguyên liệu, cộng dầu theo cách chế biến) — miễn phí, cần key
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
    // Bước 4: AI cho món lạ còn lại — 1 lượt gộp
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
    setTip([...srcs].map((s) => ({ localDB: "Kho nội bộ", cache: "Cache", USDA: "USDA", AI: "AI" })[s]).filter(Boolean).join(" + ") || null);
    if (aiMsg) setErr(aiMsg);
    setBusy(false);
  }

  async function save() {
    if (saving) return;
    const nm = name.trim();
    if (!nm) { await alert("Thiếu tên mẫu", "Nhập tên mẫu ở ô trên!"); return; }
    if (!allDone) { await alert("Chưa tính macro", "Bấm “Tính macro tất cả” (sau mỗi lần sửa món) trước khi lưu mẫu."); return; }
    if (!mealsData.length) { await alert("Chưa có món", "Không có dữ liệu bữa ăn"); return; }
    for (const m of mealsData) {
      const miss = missingRoles(m.items);
      if (miss.length) { await alert("Bữa chưa đủ món", `${m.meal_name || m.meal_id} đang thiếu món vai trò: ${miss.map((k) => ({ protein: "đạm", carb: "carb", fat: "béo" })[k]).join(", ")} — thêm món trước khi lưu.`); return; }
    }
    setSaving(true);
    try {
      if (saveDefaultTemplate) await saveDefaultTemplate(nm, dayType, mealsData, Math.round(tot.cal), template?.id || null, goal, goal === "giam_mo" ? diet : null);
      if (Object.keys(pend).length && savePendingFoodCache) savePendingFoodCache(pend, appSettings?.ai_provider || "claude");
      dirty.current = false;
      showToast && showToast({ text: template ? "Đã cập nhật mẫu" : "Đã tạo mẫu — user thấy trong Thực đơn mẫu" });
      (onSaved || onBack)();
    } catch (e) {
      console.error("Save template error:", e);
      setErr("Chưa lưu được mẫu, thử lại giúp mình nhé.");
    } finally { setSaving(false); }
  }

  async function cancel() {
    if (dirty.current && !(await confirm({ title: "Bỏ thay đổi?", text: "Các món vừa nhập sẽ không được lưu.", ok: "Bỏ", danger: true }))) return;
    onBack();
  }

  const footer = (
    <div style={{ flexShrink: 0, padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px)) 12px", background: "rgba(1,27,55,0.92)", borderTop: `1px solid ${DK.line}` }}>
      <BtnRow style={{ maxWidth: 536, margin: "0 auto" }}>
        <Btn kind="ghost" h={50} flex={1} onClick={cancel} testid="adm-tpl-cancel">Huỷ</Btn>
        <Btn kind="blue" h={50} flex={2} onClick={save} disabled={saving || busy} testid="adm-tpl-save">{saving ? "Đang lưu…" : template ? "Cập nhật mẫu" : "Lưu mẫu"}</Btn>
      </BtnRow>
    </div>
  );

  if (!isAdmin) return <SubPage dark title="Soạn mẫu thực đơn" onBack={onBack}><div style={{ padding: 16, color: DK.t2 }}>Chỉ quản trị viên dùng được trang này.</div></SubPage>;

  return (
    <SubPage dark title={template ? "Sửa mẫu" : "Mẫu mới"} subtitle="Kho mẫu thực đơn" onBack={cancel} footer={footer}>
      <div data-testid="adm-tpl-editor" style={{ paddingBottom: 24 }}>
        <div style={{ margin: "12px 12px 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Tên mẫu">
            <input data-testid="adm-tpl-name" value={name} onChange={(e) => { touch(); setName(e.target.value); }} placeholder="VD: Ngày tập A — Ngực/Vai" maxLength={80}
              style={{ ...inp, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
          </Field>
          <span style={lbl}>Loại ngày</span>
          <Seg dark ariaLabel="Loại ngày" value={dayType} onChange={changeDay} opts={[{ value: "train", label: "Ngày tập", testid: "adm-tpl-day-train" }, { value: "rest", label: "Ngày nghỉ", testid: "adm-tpl-day-rest" }]} />
          <span style={lbl}>Mục tiêu</span>
          <Seg dark ariaLabel="Mục tiêu" value={goal} onChange={(v) => { touch(); setGoal(v); }} opts={GOAL_OPTS.map((o) => ({ ...o, testid: `adm-tpl-goal-${o.value}` }))} />
          {goal === "giam_mo" && <>
            <span style={lbl}>Kiểu ăn</span>
            <Seg dark ariaLabel="Kiểu ăn" value={diet} onChange={(v) => { touch(); setDiet(v); }} opts={DIET_OPTS.map((o) => ({ ...o, testid: `adm-tpl-diet-${o.value}` }))} />
          </>}
          <span style={lbl}>Bữa trong mẫu</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_MEALS.map((m) => <Chip key={m.id} on={meals.includes(m.id)} onClick={() => toggleMeal(m.id)} testid={`adm-tpl-meal-${m.id}`}>{m.short}</Chip>)}
          </div>
        </div>

        {selMeals.length === 0 && <div style={{ margin: "12px 16px 0 16px", fontSize: 13, color: DK.t3 }}>Chọn ít nhất 1 bữa cho mẫu.</div>}

        {selMeals.map((m) => (
          <Card key={m.id} pad={12} style={{ marginTop: 10, borderRadius: 16 }} testid={`adm-tpl-mealcard-${m.id}`}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap" }}>{m.name}</span>
              <span style={{ fontSize: 11, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Tên · Đơn vị · SL · Gram</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(rows[m.id] || []).map((r, i) => {
                const w = isW(r.unit);
                const st = r.name.trim() ? res[r.uid] : null;
                const ok = st && st.sig === sigOf(r) && st.item;
                const bad = st && st.sig === sigOf(r) && st.fail;
                return (
                  <div key={r.uid} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={GRID}>
                      <input data-testid="adm-tpl-item-name" aria-label="Tên món" value={r.name} placeholder="Thêm món…" maxLength={60}
                        onChange={(e) => setRow(m.id, i, { name: e.target.value })}
                        style={{ ...cellInp, padding: "0 12px", ...(bad ? { borderColor: "rgba(255,180,180,0.7)" } : null) }} />
                      <span style={{ position: "relative", display: "block", minWidth: 0 }}>
                        <select data-testid="adm-tpl-item-unit" aria-label="Đơn vị" value={r.unit || "g"}
                          onChange={(e) => { const v = e.target.value; setRow(m.id, i, isW(v) ? { unit: v, qty: "", gram: isW(r.unit) ? r.gram : "" } : { unit: v, qty: r.qty || "1" }); }}
                          style={{ ...cellInp, borderRadius: 10, padding: "0 16px 0 6px", fontSize: 13, fontWeight: 700, textAlign: "center", textAlignLast: "center", WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}>
                          {TPL_UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
                        </select>
                        <span aria-hidden="true" style={{ position: "absolute", right: 6, top: 13, color: DK.t2, pointerEvents: "none", display: "flex" }}>{Icon.down(12)}</span>
                      </span>
                      {w
                        ? <input aria-label="Số lượng" disabled value="" placeholder="" style={{ ...cellInp, opacity: 0.5 }} />
                        : <NumInput testid="adm-tpl-item-qty" ariaLabel="Số lượng" value={r.qty} onChange={(v) => setRow(m.id, i, { qty: v })} />}
                      {w
                        ? <NumInput testid="adm-tpl-item-gram" ariaLabel={r.unit === "ml" ? "Số ml" : "Số gram"} dec={false} value={r.gram} onChange={(v) => setRow(m.id, i, { gram: v })} />
                        : <input data-testid="adm-tpl-item-gram" aria-label="Gram ước tính" readOnly tabIndex={-1} value={r.name.trim() ? `~${ok ? st.item.gram : rowGram(r)}` : ""} style={{ ...cellInp, opacity: 0.7 }} />}
                      <button data-testid="adm-tpl-item-del" aria-label="Xoá món" onClick={() => delRow(m.id, i)}
                        style={{ width: 24, height: 40, padding: 0, border: "none", background: "transparent", color: DK.t3, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.close(16)}</button>
                    </div>
                    {ok && <span style={{ fontSize: 11, color: DK.t3, paddingLeft: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmtN(st.item.cal)} kcal · Đ {r1(st.item.p)} · TB {r1(st.item.c)} · B {r1(st.item.f)}{st.item.source === "AI" ? " · AI" : st.item.source === "USDA" ? " · USDA" : ""}</span>}
                    {bad && <span style={{ fontSize: 11, color: DK.red, paddingLeft: 4 }}>Chưa tính được món này</span>}
                  </div>
                );
              })}
            </div>
            <button data-testid="adm-tpl-add-item" onClick={() => addRow(m.id)} style={{ marginTop: 8, padding: "4px 0", border: "none", background: "transparent", color: DK.link, fontFamily: "inherit", fontSize: 13, fontWeight: 800 }}>+ Thêm món</button>
          </Card>
        ))}

        <div style={{ margin: "12px 12px 0 12px", display: "flex" }}>
          <Btn kind="ghost" h={46} onClick={calcAll} disabled={busy} testid="adm-tpl-calc">
            {busy ? "Đang tính…" : <><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2" /></svg>Tính macro tất cả</>}
          </Btn>
        </div>
        <span style={{ display: "block", margin: "6px 16px 0 16px", fontSize: 11, color: DK.t3 }}>Món có trong kho tính ngay; món lạ AI tính (tốn lượt AI).</span>
        {err && <div data-testid="adm-tpl-err" style={{ margin: "10px 12px 0 12px", borderRadius: 14, padding: "10px 12px", background: "rgba(239,68,68,0.16)", color: DK.red, fontSize: 13, fontWeight: 700, lineHeight: 1.45 }}>{err}</div>}

        {mealsData.length > 0 && (
          <Card pad={14} style={{ marginTop: 12, borderRadius: 16 }} testid="adm-tpl-total">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 13, color: DK.t2 }}>Tổng mẫu</span>
              <span style={{ fontSize: 24, fontWeight: 900, whiteSpace: "nowrap" }}>{fmtN(tot.cal)} <span style={{ fontSize: 12, color: DK.t3 }}>kcal</span></span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <Pill h={26}>Đ {Math.round(tot.p)} g</Pill><Pill h={26}>TB {Math.round(tot.c)} g</Pill><Pill h={26}>B {Math.round(tot.f)} g</Pill>
            </div>
            {!allDone && <span style={{ display: "block", marginTop: 8, fontSize: 12, color: DK.amber }}>Có món mới sửa / chưa tính — bấm “Tính macro tất cả” lại.</span>}
            {lacks.length === 0
              ? <span data-testid="adm-tpl-check" style={{ display: "block", marginTop: 8, fontSize: 12, color: DK.green }}>✓ Mỗi bữa đủ món đạm, tinh bột, béo</span>
              : <div data-testid="adm-tpl-check" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                {lacks.map(({ m, miss }) => <span key={m.meal_id} style={{ fontSize: 12, color: DK.red }}>✕ {m.meal_name} thiếu món {miss.map((k) => ROLE_VN[k]).join(", ")}</span>)}
              </div>}
            {tip && <span style={{ display: "block", marginTop: 6, fontSize: 11, color: DK.t3 }}>Nguồn: {tip}</span>}
          </Card>
        )}
      </div>
      {dialog}
    </SubPage>
  );
}
