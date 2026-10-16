// Quản trị PC › Kho thực phẩm (bản vẽ 119). Cùng dữ liệu & ghi DB với src/mobile/admin/FoodDBScreen.jsx:
//  - LOCAL_FOODS + bảng food_overrides (số macro đã sửa / 100 g).
//  - Bảng rộng: TÊN MÓN · NHÓM · VAI TRÒ · DẠNG · ĐẠM · TB · BÉO · KCAL /100 G · "đã sửa"; tìm + lọc Nhóm / Vai trò / Dạng / Đã sửa; 50 món/trang.
//  - Super Admin: bấm 1 dòng → dòng sửa ngay bên dưới (4 ô số + số gốc để so), Lưu (upsert food_overrides) / Về gốc (xoá override, hỏi bằng hộp thoại app).
//  - Admin thường: chỉ xem. Nút "Xuất CSV" tải danh sách đang lọc.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { appAlert, appConfirm } from "../lib/dialog";
import { LOCAL_FOODS, getFoodRole, getFoodDisplay, isStandaloneDish } from "../lib/localFoodDB";
import { todayVN } from "../lib/dateVN";
import { PC } from "../theme";
import { Btn, Pill, Card, SearchBox, FilterSelect, ErrorBox, headRow, bodyRow, cell, vnInt, vnDec } from "./pcUI";

const COLS = "2fr 1fr 1fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 1.2fr";
const PER_PAGE = 50;
const CAT_LABEL = { poultry: "Gia cầm", beef: "Bò", pork: "Heo", seafood: "Hải sản", egg_dairy: "Trứng/Sữa", starch: "Tinh bột", veg: "Rau củ", fruit: "Trái cây", nuts: "Hạt/Đậu", drink: "Đồ uống", sauce: "Gia vị", supp: "Bổ sung", processed: "Chế biến" };
const ROLE = { protein: ["đạm", "blue"], carb: ["tinh bột", "amber"], fat: ["béo", "red"], fixed: ["trọn suất", "green"] };
const FORM = { raw: "sống", cooked: "chín", composite: "hỗn hợp", dry: "khô", liquid: "lỏng" };
const parseNum = (s) => Number(String(s ?? "").replace(",", ".")) || 0;
const gocLine = (it) => `gốc: Đ ${vnDec(it.origP)} · TB ${vnDec(it.origC)} · B ${vnDec(it.origF)} · ${vnInt(it.origCal)}`;

function csvDownload(items) {
  const esc = (v) => { const s = String(v ?? ""); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["key", "ten_mon", "nhom", "vai_tro", "dang", "dam_100g", "tinh_bot_100g", "beo_100g", "kcal_100g", "da_sua"];
  const lines = [head.join(",")].concat(items.map((i) => [i.key, i.display, CAT_LABEL[i.cat] || i.cat, ROLE[i.role]?.[0] || i.role, FORM[i.form] || i.form, i.p, i.c, i.f, i.cal, i.hasOverride ? "x" : ""].map(esc).join(",")));
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `kho-thuc-pham-${todayVN()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function PcFood({ top, isSuperAdmin }) {
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("all");
  const [roleF, setRoleF] = useState("all");
  const [formF, setFormF] = useState("all");
  const [editedF, setEditedF] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [loadErr, setLoadErr] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [vals, setVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  const loadOverrides = useCallback(async () => {
    setLoadErr(null);
    const { data, error } = await supabase.from("food_overrides").select("*");
    if (error) { setLoadErr(error.message || "Lỗi tải"); return; }
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r; });
    setOverrides(map);
  }, []);
  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const all = useMemo(() => Object.entries(LOCAL_FOODS).map(([key, v]) => {
    const ov = overrides[key];
    return {
      key, cat: v.cat, form: v.form, role: getFoodRole(key), display: getFoodDisplay(key), standalone: isStandaloneDish(key),
      p: ov ? +ov.p : v.p, c: ov ? +ov.c : v.c, f: ov ? +ov.f : v.f, cal: ov ? +ov.cal : v.cal, fiber: ov ? +(ov.fiber || 0) : (v.fiber || 0),
      hasOverride: !!ov, origP: v.p, origC: v.c, origF: v.f, origCal: v.cal,
    };
  }), [overrides]);
  const cats = useMemo(() => { const c = {}; all.forEach((i) => { c[i.cat] = (c[i.cat] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1]); }, [all]);
  const countBy = (k, v) => all.filter((i) => i[k] === v).length;

  const filtered = useMemo(() => {
    let items = all;
    if (search) { const s = search.toLowerCase().trim(); items = items.filter((i) => i.key.includes(s) || i.display.toLowerCase().includes(s)); }
    if (catF !== "all") items = items.filter((i) => i.cat === catF);
    if (roleF !== "all") items = items.filter((i) => i.role === roleF);
    if (formF !== "all") items = items.filter((i) => i.form === formF);
    if (editedF) items = items.filter((i) => i.hasOverride);
    return [...items].sort((a, b) => a.key.localeCompare(b.key));
  }, [all, search, catF, roleF, formF, editedF]);
  useEffect(() => { setPage(0); }, [search, catF, roleF, formF, editedF]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const list = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const overrideCount = Object.keys(overrides).length;

  const openEdit = (it) => {
    if (!isSuperAdmin) return;
    if (editKey === it.key) { setEditKey(null); return; }
    setEditKey(it.key);
    setVals({ p: vnDec(it.p), c: vnDec(it.c), f: vnDec(it.f), cal: vnDec(it.cal), fiber: it.fiber });
  };
  const save = async () => {
    if (!editKey || !isSuperAdmin) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = { key: editKey, p: parseNum(vals.p), c: parseNum(vals.c), f: parseNum(vals.f), cal: parseNum(vals.cal), fiber: +(vals.fiber || 0), updated_by: session?.user?.id || null, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("food_overrides").upsert(payload, { onConflict: "key" });
      if (error) appAlert("Lỗi lưu: " + error.message);
      else { setOverrides((prev) => ({ ...prev, [editKey]: payload })); setEditKey(null); }
    } catch (e) { appAlert("Lỗi: " + e.message); }
    setSaving(false);
  };
  const revert = async (it) => {
    if (!isSuperAdmin || !it.hasOverride) return;
    if (!await appConfirm(`${it.display}\nGốc: Đ ${vnDec(it.origP)} · TB ${vnDec(it.origC)} · B ${vnDec(it.origF)} · ${vnInt(it.origCal)} kcal /100 g`, { title: "Về giá trị gốc?", confirmText: "Về gốc", danger: true })) return;
    setSaving(true);
    const { error } = await supabase.from("food_overrides").delete().eq("key", it.key);
    setSaving(false);
    if (error) { appAlert("Lỗi hoàn tác: " + error.message); return; }
    setOverrides((prev) => { const n = { ...prev }; delete n[it.key]; return n; });
    setEditKey(null);
  };
  const onKey = (e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditKey(null); };

  const numIn = (k, label) => (
    <input data-testid={`pc-food-in-${k}`} className="pc-num" inputMode="decimal" aria-label={`${label} trên 100 g`} value={vals[k] ?? ""} onKeyDown={onKey}
      onChange={(e) => setVals((s) => ({ ...s, [k]: e.target.value }))}
      style={{ width: "100%", minWidth: 0, height: 30, borderRadius: 8, background: "#FFFFFF", border: `1.5px solid ${PC.fieldOn}`, padding: "0 8px", fontWeight: 800, fontSize: 13, fontFamily: "inherit", color: PC.t1 }} />
  );

  return (
    <>
      {top(<Btn kind="soft" onClick={() => csvDownload(filtered)} testid="pc-food-csv">Xuất CSV</Btn>)}
      <div data-testid="pc-food" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm món…" width={280} testid="pc-food-search" />
          <FilterSelect fontSize={13} label="Nhóm" value={catF} onChange={setCatF} testid="pc-food-f-cat" options={[{ v: "all", label: "Tất cả", full: `Tất cả nhóm (${vnInt(all.length)})` }, ...cats.map(([c, n]) => ({ v: c, label: CAT_LABEL[c] || c, full: `${CAT_LABEL[c] || c} (${vnInt(n)})` }))]} />
          <FilterSelect fontSize={13} label="Vai trò" value={roleF} onChange={setRoleF} testid="pc-food-f-role" options={[{ v: "all", label: "Tất cả", full: "Tất cả vai trò" }, ...Object.entries(ROLE).map(([v, [l]]) => ({ v, label: l, full: `${l} (${vnInt(countBy("role", v))})` }))]} />
          <FilterSelect fontSize={13} label="Dạng" value={formF} onChange={setFormF} testid="pc-food-f-form" options={[{ v: "all", label: "Tất cả", full: "Tất cả dạng" }, ...Object.entries(FORM).map(([v, l]) => ({ v, label: l, full: `${l} (${vnInt(countBy("form", v))})` }))]} />
          <label className="pc-field" style={{ height: 36, padding: "0 12px", borderRadius: 10, background: editedF ? PC.soft : "#FFFFFF", border: `1px solid ${editedF ? "#BFD4FF" : PC.field}`, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: editedF ? PC.softFg : PC.t1, cursor: "pointer", whiteSpace: "nowrap" }}>
            <input type="checkbox" data-testid="pc-food-f-edited" checked={editedF} onChange={(e) => setEditedF(e.target.checked)} style={{ width: 14, height: 14, margin: 0, accentColor: "#0062F0" }} />
            Đã sửa
          </label>
          <span data-testid="pc-food-count" style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {vnInt(filtered.length)} món · {vnInt(overrideCount)} đã sửa · trang {page + 1}/{pages}
            <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={page === 0} onClick={() => setPage((p) => p - 1)} testid="pc-food-prev" title="Trang trước">‹</Btn>
            <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} testid="pc-food-next" title="Trang sau">›</Btn>
          </span>
        </div>
        {!isSuperAdmin && <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường chỉ xem — Super Admin mới sửa được số.</div>}
        {loadErr && <ErrorBox text={`Chưa tải được số đã sửa: ${loadErr}`} onRetry={loadOverrides} />}
        <Card>
          <div style={headRow(COLS)}><span>TÊN MÓN</span><span>NHÓM</span><span>VAI TRÒ</span><span>DẠNG</span><span>ĐẠM</span><span>TB</span><span>BÉO</span><span>KCAL /100 G</span><span /></div>
          {list.length === 0 && <div data-testid="pc-food-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Không tìm thấy món nào.</div>}
          {list.map((it, i) => {
            const editing = editKey === it.key;
            const last = i === list.length - 1;
            const [rl, rt] = ROLE[it.role] || [it.role, "gray"];
            const Row = isSuperAdmin ? "button" : "div";
            return (
              <div key={it.key}>
                <Row data-testid="pc-food-row" data-key={it.key} aria-expanded={isSuperAdmin ? editing : undefined} onClick={isSuperAdmin ? () => openEdit(it) : undefined} className={isSuperAdmin ? "pc-row pc-click" : "pc-row"}
                  style={{ ...bodyRow(COLS, editing), borderBottom: last && !editing ? "none" : bodyRow(COLS).borderBottom, borderRadius: last && !editing ? "0 0 14px 14px" : 0 }}>
                  <span style={cell} title={`${it.display} (${it.key})`}>{it.display}</span>
                  <span style={cell}>{CAT_LABEL[it.cat] || it.cat}</span>
                  <span style={cell}><Pill tone={rt}>{rl}</Pill></span>
                  <span style={cell}>{FORM[it.form] || it.form}</span>
                  <span style={cell}>{it.hasOverride ? <b>{vnDec(it.p)}</b> : vnDec(it.p)}</span>
                  <span style={cell}>{vnDec(it.c)}</span>
                  <span style={cell}>{vnDec(it.f)}</span>
                  <span style={cell}>{vnInt(it.cal)}</span>
                  <span style={cell}>{it.hasOverride && <Pill tone="violet">đã sửa</Pill>}</span>
                </Row>
                {editing && (
                  <div data-testid="pc-food-edit" style={{ display: "grid", gridTemplateColumns: COLS, gap: "0 12px", padding: "8px 16px", background: PC.editBg, alignItems: "center", fontSize: 13, borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                    <b style={{ ...cell, fontSize: 13 }}>{it.display}</b>
                    <span data-testid="pc-food-orig" style={{ color: PC.t3, gridColumn: "span 3", fontSize: 12.5 }}>{gocLine(it)}</span>
                    {numIn("p", "Đạm")}{numIn("c", "Tinh bột")}{numIn("f", "Béo")}{numIn("cal", "kcal")}
                    <span style={{ display: "flex", gap: 6 }}>
                      <Btn kind="blue" onClick={save} disabled={saving} testid="pc-food-save">{saving ? "Đang lưu…" : "Lưu"}</Btn>
                      {it.hasOverride && <Btn kind="soft" onClick={() => revert(it)} disabled={saving} testid="pc-food-revert">Về gốc</Btn>}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
