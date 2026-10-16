// Kho mẫu thực đơn (bản vẽ 102, nền tối DK, chốt 16/10) — thay danh sách mẫu của tab cũ src/adminTabs/TemplatesTab.jsx.
// Mẫu chung (weekly_templates.is_default) — user thấy ở Thực đơn mẫu. Quyền như tab cũ: mọi admin (thường + super) đều soạn/xoá.
// Bấm 1 mẫu → xổ từng bữa + Sửa mẫu / Xoá (Xoá hỏi đỏ). "+ Tạo mẫu mới" / "Sửa mẫu" mở TemplateEditor (bản vẽ 103) ngay tại chỗ.
// Import CSV vẫn chỉ có trên PC.
import { useState, useEffect } from "react";
import { DK } from "../../theme";
import { SubPage, DkIcon } from "../ui";
import { Sec, Card, Btn, BtnRow, Loading, Empty, useConfirm } from "./adminUI";
import { ALL_MEALS } from "../../mealConstants";
import { usePendingFoodCache } from "../../hooks/usePendingFoodCache";
import { TemplateEditor } from "./TemplateEditor";

const GOAL_VN = { tang_co: "Tăng cơ", giam_mo: "Giảm mỡ", duy_tri: "Duy trì" };
const DIET_VN = { low_carb: "Low-carb", keto: "Keto" };
const fmtN = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
const isW = (u) => !u || u === "g" || u === "ml";

const BoltIc = () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
const RestIc = () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></svg>;

// "Ngày tập · Giảm mỡ · Low-carb"
export function tplSub(t) {
  const parts = [t.day_type === "rest" ? "Ngày nghỉ" : "Ngày tập"];
  if (GOAL_VN[t.goal_type]) parts.push(GOAL_VN[t.goal_type]);
  if (t.goal_type === "giam_mo" && DIET_VN[t.diet_strategy]) parts.push(DIET_VN[t.diet_strategy]);
  return parts.join(" · ");
}
const itemTxt = (it) => {
  const nm = it.food || it.name || "";
  if (!isW(it.unit)) return `${nm} ${String(it.qty || 1).replace(".", ",")} ${it.unit}`;
  return it.gram ? `${nm} ${Math.round(it.gram)} ${it.unit || "g"}` : nm;
};
const mealLabel = (m) => ALL_MEALS.find((x) => x.id === m.meal_id)?.short || m.meal_name || m.meal_id;

export function TemplatesScreen({ onBack, isAdmin, isSuperAdmin, user, appSettings, showToast, macro, defaultTemplates, saveDefaultTemplate, deleteDefaultTemplate, refreshDefaultTemplates, foodCache }) {
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | template
  const [loading, setLoading] = useState(!(defaultTemplates || []).length && !!refreshDefaultTemplates);
  const [busyId, setBusyId] = useState(null);
  const [confirm, dialog] = useConfirm();
  const { myPending, savePendingFoodCache } = usePendingFoodCache(user?.id, !!isAdmin);

  useEffect(() => {
    let live = true;
    if (!refreshDefaultTemplates) return;
    Promise.resolve(refreshDefaultTemplates()).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = defaultTemplates || [];

  async function del(t) {
    if (!(await confirm({ title: "Xoá mẫu?", text: `Xoá mẫu "${t.name || "Template"}"? User sẽ không còn thấy mẫu này trong Thực đơn mẫu.`, ok: "Xoá", danger: true }))) return;
    setBusyId(t.id);
    try {
      if (deleteDefaultTemplate) await deleteDefaultTemplate(t.id);
      setOpen(null);
      showToast && showToast({ text: "Đã xoá mẫu" });
    } catch (e) {
      console.error("Delete template error:", e);
      showToast && showToast({ text: "Chưa xoá được mẫu, thử lại giúp mình nhé." });
    } finally { setBusyId(null); }
  }

  if (editing) return (
    <TemplateEditor template={editing === "new" ? null : editing} onBack={() => setEditing(null)} onSaved={() => { setEditing(null); setOpen(null); }}
      user={user} isAdmin={isAdmin} appSettings={appSettings} showToast={showToast} macro={macro} saveDefaultTemplate={saveDefaultTemplate}
      foodCache={foodCache} myPending={myPending} savePendingFoodCache={savePendingFoodCache} />
  );

  return (
    <SubPage dark title="Kho mẫu thực đơn" subtitle="Mẫu chung — user thấy ở Thực đơn mẫu" onBack={onBack}>
      <div data-testid="adm-tpl" style={{ paddingBottom: 32 }}>
        {!isAdmin
          ? <Empty>Chỉ quản trị viên dùng được trang này.</Empty>
          : <>
            <div style={{ margin: "12px 12px 0 12px", display: "flex" }}>
              <Btn kind="blue" h={48} onClick={() => setEditing("new")} testid="adm-tpl-new">+ Tạo mẫu mới</Btn>
            </div>
            <Sec>Đã tạo · {list.length} mẫu</Sec>
            {loading && !list.length ? <Loading rows={3} />
              : !list.length ? <Empty testid="adm-tpl-empty">Chưa có mẫu nào — bấm “+ Tạo mẫu mới”.</Empty>
                : <Card style={{ borderRadius: 16 }}>
                  {list.map((t, idx) => {
                    const isOpen = open === t.id;
                    const last = idx === list.length - 1;
                    const rest = t.day_type === "rest";
                    return (
                      <div key={t.id} style={{ borderBottom: last ? "none" : `1px solid ${DK.line}` }}>
                        <button data-testid="adm-tpl-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)} className="tap"
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: 0, border: "none", background: "transparent", color: DK.t1, fontFamily: "inherit", textAlign: "left" }}>
                          <DkIcon color={rest ? "#0891B2" : "#16A34A"} size={38}>{rest ? <RestIc /> : <BoltIc />}</DkIcon>
                          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name || "Template"}</span>
                            <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tplSub(t)}</span>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                            <span style={{ fontSize: 15, fontWeight: 900 }}>{fmtN(t.total_cal)}</span>
                            <span style={{ fontSize: 11, color: DK.t3 }}>{(t.meals || []).length} bữa</span>
                          </span>
                        </button>
                        {isOpen && (
                          <div style={{ margin: "0 0 12px 50px", display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: DK.t2 }}>
                            {(t.meals || []).map((m, mi) => {
                              const kcal = (m.items || []).reduce((a, it) => a + (Number(it.cal) || 0), 0);
                              return (
                                <span key={mi} style={{ display: "flex", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
                                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mealLabel(m)} · {(m.items || []).map(itemTxt).join(", ") || "—"}</span>
                                  <span style={{ color: DK.t3, flexShrink: 0, whiteSpace: "nowrap" }}>{fmtN(kcal)} kcal</span>
                                </span>
                              );
                            })}
                            {!(t.meals || []).length && <span style={{ color: DK.t3 }}>Mẫu chưa có bữa nào.</span>}
                            <BtnRow style={{ marginTop: 6 }}>
                              <Btn kind="ghost" h={38} onClick={() => setEditing(t)} testid="adm-tpl-edit">Sửa mẫu</Btn>
                              <Btn kind="red" h={38} onClick={() => del(t)} disabled={busyId === t.id} testid="adm-tpl-del">{busyId === t.id ? "Đang xoá…" : "Xoá"}</Btn>
                            </BtnRow>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>}
          </>}
      </div>
      {dialog}
    </SubPage>
  );
}
