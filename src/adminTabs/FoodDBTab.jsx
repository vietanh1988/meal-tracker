import { useState, useMemo, useEffect, useCallback } from "react";
import { LOCAL_FOODS, getFoodRole, getFoodDisplay, isStandaloneDish } from "../lib/localFoodDB";
import { supabase } from "../lib/supabase";

const C = { t1: "#1a1a2e", t2: "#64748B", t3: "#94A3B8", border: "#E2E8F0", surface: "#F8FAFC", accent: "#007AFF" };
const CAT_LABEL = { poultry:"Gia cầm", beef:"Bò", pork:"Heo", seafood:"Hải sản", egg_dairy:"Trứng/Sữa", starch:"Tinh bột", veg:"Rau củ", fruit:"Trái cây", nuts:"Hạt/Đậu", drink:"Đồ uống", sauce:"Gia vị", supp:"Bổ sung", processed:"Chế biến" };
const ROLE_C = { protein:["#3B82F6","rgba(59,130,246,0.1)"], carb:["#EAB308","rgba(234,179,8,0.1)"], fat:["#EF4444","rgba(239,68,68,0.1)"], fixed:["#22C55E","rgba(34,197,94,0.1)"] };

export default function FoodDBTab({ mob }) {
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("all");
  const [roleF, setRoleF] = useState("all");
  const [formF, setFormF] = useState("all");
  const [overrides, setOverrides] = useState({});
  const [editKey, setEditKey] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 50;

  // Load overrides
  useEffect(() => {
    supabase.from("food_overrides").select("*").then(({ data }) => {
      if (data) {
        const map = {};
        data.forEach(r => { map[r.key] = r; });
        setOverrides(map);
      }
    });
  }, []);

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
        fiber: ov ? +(ov.fiber||0) : (v.fiber||0),
        hasOverride: !!ov,
        origP: v.p, origC: v.c, origF: v.f, origCal: v.cal,
      };
    })
  , [overrides]);

  const cats = useMemo(() => {
    const c = {};
    allItems.forEach(i => { c[i.cat] = (c[i.cat]||0)+1; });
    return Object.entries(c).sort((a,b) => b[1]-a[1]);
  }, [allItems]);

  const filtered = useMemo(() => {
    let items = allItems;
    if (search) { const s = search.toLowerCase(); items = items.filter(i => i.key.includes(s) || i.display.toLowerCase().includes(s)); }
    if (catF !== "all") items = items.filter(i => i.cat === catF);
    if (roleF !== "all") items = items.filter(i => i.role === roleF);
    if (formF !== "all") items = items.filter(i => i.form === formF);
    return items.sort((a,b) => a.key.localeCompare(b.key));
  }, [allItems, search, catF, roleF, formF]);

  const paged = filtered.slice(page * PER_PAGE, (page+1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const startEdit = useCallback((item) => {
    setEditKey(item.key);
    setEditVals({ p: item.p, c: item.c, f: item.f, cal: item.cal, fiber: item.fiber });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editKey) return;
    setSaving(true);
    const { error } = await supabase.from("food_overrides").upsert({
      key: editKey,
      p: +editVals.p, c: +editVals.c, f: +editVals.f,
      cal: +editVals.cal, fiber: +(editVals.fiber||0),
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      setOverrides(prev => ({ ...prev, [editKey]: { key: editKey, ...editVals } }));
    }
    setEditKey(null);
    setSaving(false);
  }, [editKey, editVals]);

  const revertOverride = useCallback(async (key) => {
    const { error } = await supabase.from("food_overrides").delete().eq("key", key);
    if (!error) {
      setOverrides(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }, []);

  const overrideCount = Object.keys(overrides).length;

  const badge = (role) => {
    const [color, bg] = ROLE_C[role] || ["#666","#f0f0f0"];
    return <span style={{ fontSize:10, fontWeight:600, padding:"1px 5px", borderRadius:3, background:bg, color, whiteSpace:"nowrap" }}>{role}</span>;
  };

  const sel = { fontSize:12, padding:"5px 6px", fontFamily:"inherit", minWidth:0 };
  const numInput = (field) => (
    <input type="number" value={editVals[field]||""} onChange={e => setEditVals(v => ({...v, [field]: e.target.value}))}
      style={{ width:42, textAlign:"center", fontSize:12, padding:"2px 3px", fontFamily:"inherit", fontWeight: field==="cal"?600:400 }} />
  );

  return (
    <div style={{ maxWidth:960, margin:"0 auto" }}>
      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", flexWrap:"wrap" }}>
        <span style={{ fontSize:16, fontWeight:700, color:C.t1, whiteSpace:"nowrap" }}>🗄️ Kho thực phẩm</span>
        <span style={{ fontSize:11, color:C.t3 }}>{allItems.length}</span>
        {overrideCount > 0 && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:4, background:"rgba(34,197,94,0.1)", color:"#16A34A" }}>{overrideCount} đã sửa</span>}
        <div style={{ flex:1 }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Tìm kiếm..." style={{ width:mob?120:180, fontSize:13, padding:"5px 10px", fontFamily:"inherit" }} />
        <select value={catF} onChange={e => { setCatF(e.target.value); setPage(0); }} style={sel}>
          <option value="all">Nhóm</option>
          {cats.map(([c,n]) => <option key={c} value={c}>{CAT_LABEL[c]||c} ({n})</option>)}
        </select>
        <select value={roleF} onChange={e => { setRoleF(e.target.value); setPage(0); }} style={sel}>
          <option value="all">Role</option>
          {["protein","carb","fat","fixed"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={formF} onChange={e => { setFormF(e.target.value); setPage(0); }} style={sel}>
          <option value="all">Dạng</option>
          {["raw","cooked","composite","dry","liquid"].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <span style={{ fontSize:11, color:C.t3, whiteSpace:"nowrap" }}>{filtered.length} items</span>
      </div>

      {/* Table */}
      <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", background:"#fff" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:C.surface }}>
              <th style={{ padding:"7px 10px", textAlign:"left", fontSize:11, fontWeight:600, color:C.t3, borderBottom:`1px solid ${C.border}` }}>Tên món</th>
              {!mob && <th style={{ padding:"7px 6px", textAlign:"center", fontSize:11, fontWeight:600, color:C.t3, borderBottom:`1px solid ${C.border}`, width:55 }}>Nhóm</th>}
              <th style={{ padding:"7px 4px", textAlign:"center", fontSize:11, fontWeight:600, color:"#3B82F6", borderBottom:`1px solid ${C.border}`, width:40 }}>P</th>
              <th style={{ padding:"7px 4px", textAlign:"center", fontSize:11, fontWeight:600, color:"#EAB308", borderBottom:`1px solid ${C.border}`, width:40 }}>C</th>
              <th style={{ padding:"7px 4px", textAlign:"center", fontSize:11, fontWeight:600, color:"#EF4444", borderBottom:`1px solid ${C.border}`, width:40 }}>F</th>
              <th style={{ padding:"7px 4px", textAlign:"center", fontSize:11, fontWeight:600, color:C.t2, borderBottom:`1px solid ${C.border}`, width:44 }}>Cal</th>
              <th style={{ padding:"7px 4px", textAlign:"center", fontSize:11, fontWeight:600, color:C.t3, borderBottom:`1px solid ${C.border}`, width:52 }}>Role</th>
              <th style={{ padding:"7px 6px", textAlign:"center", fontSize:11, fontWeight:600, color:C.t3, borderBottom:`1px solid ${C.border}`, width:mob?50:70 }}></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((item, i) => {
              const isEditing = editKey === item.key;
              return (
                <tr key={item.key} style={{ borderBottom:`1px solid ${C.border}`, background: isEditing ? "rgba(0,122,255,0.04)" : i%2===0 ? "#fff" : C.surface }}>
                  <td style={{ padding:"7px 10px" }}>
                    <span style={{ fontWeight:600, color:C.t1, fontSize:13 }}>{item.display}</span>
                    {item.standalone && <span style={{ fontSize:9, color:"#F59E0B", marginLeft:3 }}>⭐</span>}
                    {item.hasOverride && !isEditing && <span style={{ fontSize:9, fontWeight:600, padding:"1px 4px", borderRadius:3, background:"rgba(34,197,94,0.1)", color:"#16A34A", marginLeft:4 }}>sửa</span>}
                    {isEditing && <span style={{ fontSize:9, color:C.accent, marginLeft:4 }}>đang sửa</span>}
                    <div style={{ fontSize:10, color:C.t3 }}>{item.key} · {item.form}</div>
                  </td>
                  {!mob && <td style={{ padding:"7px 6px", textAlign:"center", fontSize:10, color:C.t2 }}>{CAT_LABEL[item.cat]||item.cat}</td>}
                  <td style={{ padding:"7px 4px", textAlign:"center" }}>{isEditing ? numInput("p") : <span style={{ fontWeight:500, color:"#3B82F6" }}>{item.p}</span>}</td>
                  <td style={{ padding:"7px 4px", textAlign:"center" }}>{isEditing ? numInput("c") : <span style={{ color:item.c > 5 ? "#EAB308" : C.t3 }}>{item.c}</span>}</td>
                  <td style={{ padding:"7px 4px", textAlign:"center" }}>{isEditing ? numInput("f") : <span style={{ color:item.f > 5 ? "#EF4444" : C.t3 }}>{item.f}</span>}</td>
                  <td style={{ padding:"7px 4px", textAlign:"center" }}>{isEditing ? numInput("cal") : <span style={{ fontWeight:600 }}>{item.cal}</span>}</td>
                  <td style={{ padding:"7px 4px", textAlign:"center" }}>{badge(item.role)}</td>
                  <td style={{ padding:"7px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
                    {isEditing ? <>
                      <button onClick={saveEdit} disabled={saving} style={{ fontSize:10, padding:"3px 6px", background:C.accent, color:"#fff", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>✓</button>
                      <button onClick={() => setEditKey(null)} style={{ fontSize:10, padding:"3px 6px", marginLeft:3, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                    </> : <>
                      <button onClick={() => startEdit(item)} style={{ fontSize:10, padding:"3px 7px", cursor:"pointer", fontFamily:"inherit" }}>Sửa</button>
                      {item.hasOverride && <button onClick={() => revertOverride(item.key)} title="Hoàn tác" style={{ fontSize:10, padding:"3px 5px", marginLeft:3, cursor:"pointer", color:"#EF4444", borderColor:"#FECACA", fontFamily:"inherit" }}>↩</button>}
                    </>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding:24, textAlign:"center", fontSize:13, color:C.t3 }}>Không tìm thấy.</div>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, padding:"10px 0" }}>
          <button disabled={page===0} onClick={() => setPage(p => p-1)} style={{ fontSize:12, padding:"4px 10px", cursor: page===0?"default":"pointer", fontFamily:"inherit" }}>← Trước</button>
          <span style={{ fontSize:12, color:C.t2 }}>{page+1} / {totalPages}</span>
          <button disabled={page>=totalPages-1} onClick={() => setPage(p => p+1)} style={{ fontSize:12, padding:"4px 10px", cursor: page>=totalPages-1?"default":"pointer", fontFamily:"inherit" }}>Sau →</button>
        </div>
      )}
    </div>
  );
}
