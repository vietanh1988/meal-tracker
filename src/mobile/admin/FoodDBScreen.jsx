// Quản trị › Kho thực phẩm (bản vẽ 101, nền tối). Thay tab cũ src/adminTabs/FoodDBTab.jsx — cùng dữ liệu & ghi DB:
//  - Danh sách LOCAL_FOODS + bảng food_overrides (số macro đã sửa / 100 g)
//  - Super Admin: chạm 1 món → ô sửa tại chỗ (Đạm / Tinh bột / Béo / kcal) → upsert food_overrides; "Về giá trị gốc" → xoá dòng override (hỏi bằng hộp thoại app)
//  - Admin thường: chỉ xem (không ô sửa, không "Về giá trị gốc" — bản cũ để admin thường hoàn tác được, đã sửa)
//  - Lọc Nhóm / Vai trò / Dạng (sheet chọn) + "Đã sửa", tìm kiếm, "Xem thêm" thay phân trang
import { useState, useMemo, useEffect, useCallback } from "react";
import { DK } from "../../theme";
import { SubPage, Icon, useSwipeClose } from "../ui";
import { Card, Btn, BtnRow, ReadOnly, Search, NumInput, Chip, ChipRow, ErrorBox, Empty, Pill, useConfirm } from "./adminUI";
import { LOCAL_FOODS, getFoodRole, getFoodDisplay, isStandaloneDish } from "../../lib/localFoodDB";
import { supabase } from "../../lib/supabase";

const CAT_LABEL = { poultry: "Gia cầm", beef: "Bò", pork: "Heo", seafood: "Hải sản", egg_dairy: "Trứng/Sữa", starch: "Tinh bột", veg: "Rau củ", fruit: "Trái cây", nuts: "Hạt/Đậu", drink: "Đồ uống", sauce: "Gia vị", supp: "Bổ sung", processed: "Chế biến" };
const ROLES = [
  { v: "protein", label: "đạm", dot: "#3B82F6", legend: "#93C5FD" },
  { v: "carb", label: "tinh bột", dot: "#EAB308", legend: "#FCD34D" },
  { v: "fat", label: "béo", dot: "#EF4444", legend: "#FFB4B4" },
  { v: "fixed", label: "cố định", dot: "#22C55E", legend: "#4ADE9B" },
];
const ROLE_OF = Object.fromEntries(ROLES.map((r) => [r.v, r]));
const FORMS = ["raw", "cooked", "composite", "dry", "liquid"];
const FORM_LABEL = { raw: "Sống", cooked: "Chín", composite: "Món hỗn hợp", dry: "Khô", liquid: "Lỏng" };
const PER_PAGE = 50;

const num = (n) => String(Math.round((Number(n) || 0) * 10) / 10).replace(".", ",");
const parseNum = (s) => Number(String(s ?? "").replace(",", ".")) || 0;
const vn = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const macroLine = (p, c, f, cal) => `Đ ${num(p)} · TB ${num(c)} · B ${num(f)} · ${num(cal)} kcal`;

// Chip lọc có mũi tên ▾ (mở sheet chọn)
const DropChip = ({ on, children, onClick, testid }) => (
  <Chip on={on} onClick={onClick} testid={testid}>{children}{Icon.down(12)}</Chip>
);

// Sheet chọn nền tối nhỏ
function PickSheet({ title, opts, value, onPick, onClose }) {
  const { ref, swipe, close: swClose } = useSwipeClose(onClose);
  return (
    <div onClick={swClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(1,15,35,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fpmFade .15s ease" }}>
      <div ref={ref} {...swipe} data-testid="adm-food-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, maxHeight: "70vh", overflowY: "auto", overscrollBehavior: "contain", background: "#0B2F5C", borderTop: `1px solid ${DK.line}`, borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 16px) 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", animation: "fpmSheetUp .2s ease", color: DK.t1 }}>
        <span aria-hidden="true" style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.3)", margin: "2px 0 10px 0", flexShrink: 0 }} />
        <span style={{ fontSize: 17, fontWeight: 900, padding: "0 0 6px 0" }}>{title}</span>
        {opts.map((o, i) => {
          const on = o.v === value;
          return (
            <button key={o.v} onClick={() => { onPick(o.v); onClose(); }} aria-pressed={on} className="tap"
              style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: 0, border: "none", borderBottom: i === opts.length - 1 ? "none" : `1px solid ${DK.line}`, background: "transparent", color: DK.t1, fontFamily: "inherit", fontSize: 15, fontWeight: on ? 800 : 600, textAlign: "left" }}>
              {o.dot && <span style={{ width: 8, height: 8, borderRadius: 4, background: o.dot, flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
              {o.n != null && <span style={{ fontSize: 12, color: DK.t3 }}>{vn(o.n)}</span>}
              <span style={{ width: 18, display: "flex", color: DK.link }}>{on && Icon.check(16)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FoodDBScreen({ onBack, isSuperAdmin, showToast }) {
  const toast = (text) => showToast?.({ text });
  const [confirm, dialog] = useConfirm();
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("all");
  const [roleF, setRoleF] = useState("all");
  const [formF, setFormF] = useState("all");
  const [editedF, setEditedF] = useState(false);
  const [sheet, setSheet] = useState(null); // "cat" | "role" | "form"
  const [overrides, setOverrides] = useState({});
  const [loadErr, setLoadErr] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [shown, setShown] = useState(PER_PAGE);

  const loadOverrides = useCallback(async () => {
    setLoadErr(null);
    const { data, error } = await supabase.from("food_overrides").select("*");
    if (error) { setLoadErr(error.message || "Chưa tải được số đã sửa."); return; }
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r; });
    setOverrides(map);
  }, []);
  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const allItems = useMemo(() =>
    Object.entries(LOCAL_FOODS).map(([key, v]) => {
      const ov = overrides[key];
      return {
        key, cat: v.cat, form: v.form,
        role: getFoodRole(key),
        display: getFoodDisplay(key),
        standalone: isStandaloneDish(key),
        p: ov ? +ov.p : v.p,
        c: ov ? +ov.c : v.c,
        f: ov ? +ov.f : v.f,
        cal: ov ? +ov.cal : v.cal,
        fiber: ov ? +(ov.fiber || 0) : (v.fiber || 0),
        hasOverride: !!ov,
        origP: v.p, origC: v.c, origF: v.f, origCal: v.cal,
      };
    }), [overrides]);

  const cats = useMemo(() => {
    const c = {};
    allItems.forEach((i) => { c[i.cat] = (c[i.cat] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [allItems]);
  const countBy = (field, v) => allItems.filter((i) => i[field] === v).length;

  const filtered = useMemo(() => {
    let items = allItems;
    if (search) { const s = search.toLowerCase().trim(); items = items.filter((i) => i.key.includes(s) || i.display.toLowerCase().includes(s)); }
    if (catF !== "all") items = items.filter((i) => i.cat === catF);
    if (roleF !== "all") items = items.filter((i) => i.role === roleF);
    if (formF !== "all") items = items.filter((i) => i.form === formF);
    if (editedF) items = items.filter((i) => i.hasOverride);
    return [...items].sort((a, b) => a.key.localeCompare(b.key));
  }, [allItems, search, catF, roleF, formF, editedF]);

  // Đổi lọc / tìm → về 50 món đầu
  useEffect(() => { setShown(PER_PAGE); }, [search, catF, roleF, formF, editedF]);
  const list = filtered.slice(0, shown);
  const remaining = filtered.length - list.length;
  const overrideCount = Object.keys(overrides).length;

  const openEdit = (item) => {
    if (!isSuperAdmin) return;
    if (editKey === item.key) { setEditKey(null); return; }
    setEditKey(item.key);
    setEditVals({ p: num(item.p), c: num(item.c), f: num(item.f), cal: num(item.cal), fiber: item.fiber });
  };

  const saveEdit = async () => {
    if (!editKey || !isSuperAdmin) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = {
        key: editKey,
        p: parseNum(editVals.p), c: parseNum(editVals.c), f: parseNum(editVals.f),
        cal: parseNum(editVals.cal), fiber: +(editVals.fiber || 0),
        updated_by: session?.user?.id || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("food_overrides").upsert(payload, { onConflict: "key" });
      if (error) toast("Lỗi lưu: " + error.message);
      else { setOverrides((prev) => ({ ...prev, [editKey]: payload })); setEditKey(null); toast("Đã lưu macro"); }
    } catch (e) { toast("Lỗi: " + e.message); }
    setSaving(false);
  };

  const revert = async (item) => {
    if (!isSuperAdmin || !item.hasOverride) return;
    const ok = await confirm({ title: "Về giá trị gốc?", text: `${item.display}\nGốc: ${macroLine(item.origP, item.origC, item.origF, item.origCal)}/100 g`, ok: "Về giá trị gốc", danger: true });
    if (!ok) return;
    setSaving(true);
    const { error } = await supabase.from("food_overrides").delete().eq("key", item.key);
    setSaving(false);
    if (error) { toast("Lỗi hoàn tác: " + error.message); return; }
    setOverrides((prev) => { const n = { ...prev }; delete n[item.key]; return n; });
    setEditKey(null);
    toast("Đã về giá trị gốc");
  };

  const sheetCfg = sheet === "cat"
    ? { title: "Nhóm", value: catF, onPick: setCatF, opts: [{ v: "all", label: "Tất cả nhóm", n: allItems.length }, ...cats.map(([c, n]) => ({ v: c, label: CAT_LABEL[c] || c, n }))] }
    : sheet === "role"
      ? { title: "Vai trò", value: roleF, onPick: setRoleF, opts: [{ v: "all", label: "Tất cả vai trò", n: allItems.length }, ...ROLES.map((r) => ({ v: r.v, label: r.label[0].toUpperCase() + r.label.slice(1), dot: r.dot, n: countBy("role", r.v) }))] }
      : sheet === "form"
        ? { title: "Dạng", value: formF, onPick: setFormF, opts: [{ v: "all", label: "Tất cả dạng", n: allItems.length }, ...FORMS.map((f) => ({ v: f, label: `${FORM_LABEL[f]} (${f})`, n: countBy("form", f) }))] }
        : null;

  return (
    <SubPage dark title="Kho thực phẩm" subtitle={`${vn(allItems.length)} món · ${vn(overrideCount)} đã sửa`} onBack={onBack}>
      <div data-testid="adm-food" style={{ paddingBottom: 32 }}>
        {!isSuperAdmin && <ReadOnly />}
        <Search value={search} onChange={setSearch} placeholder="Tìm món: ức gà, phở…" testid="adm-food-search" />
        <ChipRow>
          <DropChip on={catF !== "all"} onClick={() => setSheet("cat")} testid="adm-food-f-cat">{catF !== "all" ? `Nhóm: ${CAT_LABEL[catF] || catF}` : "Nhóm"}</DropChip>
          <DropChip on={roleF !== "all"} onClick={() => setSheet("role")} testid="adm-food-f-role">{roleF !== "all" ? `Vai trò: ${ROLE_OF[roleF]?.label || roleF}` : "Vai trò"}</DropChip>
          <DropChip on={formF !== "all"} onClick={() => setSheet("form")} testid="adm-food-f-form">{formF !== "all" ? `Dạng: ${FORM_LABEL[formF] || formF}` : "Dạng"}</DropChip>
          <Chip on={editedF} onClick={() => setEditedF((v) => !v)} testid="adm-food-f-edited">Đã sửa</Chip>
        </ChipRow>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", margin: "10px 16px 0 16px", fontSize: 11, color: DK.t3 }}>
          <span>{vn(filtered.length)} món</span>
          {ROLES.map((r) => <span key={r.v} style={{ color: r.legend }}>● {r.label}</span>)}
        </div>

        {loadErr && <ErrorBox text={`Chưa tải được số đã sửa: ${loadErr}`} onRetry={loadOverrides} />}

        {filtered.length === 0 ? <Empty testid="adm-food-empty">Không tìm thấy món nào.</Empty> : (
          <Card pad="0 14px" style={{ marginTop: 10, borderRadius: 16 }}>
            {list.map((item, i) => {
              const editing = editKey === item.key;
              const last = i === list.length - 1;
              const role = ROLE_OF[item.role];
              const head = (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: role?.dot || DK.t3, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: DK.t1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.display}</span>
                      {item.hasOverride && <Pill tone="violet" h={20}>đã sửa</Pill>}
                      {item.standalone && <Pill tone="amber" h={20}>món riêng</Pill>}
                    </span>
                    <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{macroLine(item.p, item.c, item.f, item.cal)}/100 g</span>
                  </span>
                  {isSuperAdmin && <span style={{ display: "flex", flexShrink: 0, transform: editing ? "rotate(90deg)" : "none", transition: "transform .15s" }}>{Icon.chev(16, DK.chev)}</span>}
                </>
              );
              const rowSt = { display: "flex", alignItems: "center", gap: 10, minHeight: 60, borderBottom: last && !editing ? "none" : `1px solid ${DK.line}` };
              return (
                <div key={item.key}>
                  {isSuperAdmin
                    ? <button data-testid="adm-food-row" data-key={item.key} aria-expanded={editing} onClick={() => openEdit(item)} className="tap"
                      style={{ ...rowSt, width: "100%", border: "none", borderBottom: rowSt.borderBottom, background: "transparent", padding: 0, fontFamily: "inherit", color: DK.t1, textAlign: "left" }}>{head}</button>
                    : <div data-testid="adm-food-row" data-key={item.key} style={rowSt}>{head}</div>}
                  {editing && (
                    <div data-testid="adm-food-edit" style={{ borderRadius: 14, background: "rgba(255,255,255,0.06)", padding: 12, margin: "10px 0", display: "flex", flexDirection: "column", gap: 10, borderBottom: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.display}</span>
                        <span style={{ fontSize: 11, color: DK.t3, flexShrink: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.key} · {item.form} · {item.role}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
                        {[["p", "Đạm"], ["c", "Tinh bột"], ["f", "Béo"], ["cal", "kcal"]].map(([k, label]) => (
                          <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                            <span style={{ fontSize: 11, color: DK.t3 }}>{label}</span>
                            <NumInput value={editVals[k]} onChange={(v) => setEditVals((s) => ({ ...s, [k]: v }))} ariaLabel={`${label} trên 100 g`} testid={`adm-food-in-${k}`} />
                          </label>
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: DK.t3 }}>Số trên 100 g · gốc: {macroLine(item.origP, item.origC, item.origF, item.origCal)}</span>
                      <BtnRow>
                        {item.hasOverride && <Btn kind="ghost" h={40} disabled={saving} onClick={() => revert(item)} testid="adm-food-revert">Về giá trị gốc</Btn>}
                        <Btn kind="ghost" h={40} disabled={saving} onClick={() => setEditKey(null)} testid="adm-food-cancel">Huỷ</Btn>
                        <Btn kind="blue" h={40} disabled={saving} onClick={saveEdit} testid="adm-food-save">{saving ? "Đang lưu…" : "Lưu"}</Btn>
                      </BtnRow>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        {remaining > 0 && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <button data-testid="adm-food-more" onClick={() => setShown((n) => n + PER_PAGE)} className="tap"
              style={{ height: 36, padding: "0 14px", borderRadius: 18, border: "none", background: "rgba(255,255,255,0.10)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
              Xem thêm {vn(Math.min(PER_PAGE, remaining))} món
            </button>
          </div>
        )}
      </div>
      {sheetCfg && <PickSheet {...sheetCfg} onClose={() => setSheet(null)} />}
      {dialog}
    </SubPage>
  );
}

export default FoodDBScreen;
