import { useState } from "react";
import { appAlert, appConfirm } from "../lib/dialog";
import { C, card, inp, redBtn } from "../theme";

const DAY_KEYS = ["thu_2", "thu_3", "thu_4", "thu_5", "thu_6", "thu_7", "cn"];
const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const GOAL_LABEL = { tang_co: "🏋️ Tăng cơ", giam_mo: "🔥 Giảm mỡ", duy_tri: "⚖️ Duy trì" };

export function WeeklyBundlesTab({ mob, defaultTemplates, weeklyBundles, saveWeeklyBundle, deleteWeeklyBundle }) {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("tang_co");
  const [days, setDays] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const templatesForGoal = (defaultTemplates || []).filter(t => t.goal_type === goalType);

  const resetForm = () => {
    setName(""); setGoalType("tang_co"); setDays({}); setEditingId(null);
  };

  const handleSave = async () => {
    if (!name.trim()) { appAlert("Nhập tên gói tuần!"); return; }
    const filledDays = Object.keys(days).filter(k => days[k]);
    if (filledDays.length === 0) { appAlert("Chọn ít nhất 1 mẫu cho 1 ngày trong tuần!"); return; }
    if (saveWeeklyBundle) await saveWeeklyBundle(name.trim(), goalType, days, editingId);
    resetForm();
    const el = document.getElementById("bundle-saved");
    if (el) { el.style.display = "flex"; setTimeout(() => { el.style.display = "none"; }, 3000); }
  };

  const handleEdit = (b) => {
    setName(b.name || "");
    setGoalType(b.goal_type || "tang_co");
    setDays(b.days || {});
    setEditingId(b.id);
    setExpandedId(null);
    document.getElementById("bundle-name")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div style={{ ...card, padding: mob ? "12px 10px" : "16px 18px" }}>
      <div style={{ fontSize: mob ? 19 : 17, fontWeight: 800, color: C.t1, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 17 }}>🗓️</span><span>Quản lý Gói tuần</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 16 }}>
        Ghép sẵn 7 mẫu có sẵn thành 1 gói — user áp dụng 1 lần cho cả tuần
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "7fr 3fr", gap: mob ? 0 : 20, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input id="bundle-name" value={name} onChange={e => setName(e.target.value)} type="text" placeholder="VD: Tuần Tăng cơ - Ít nấu" style={{ ...inp, flex: 1, minWidth: mob ? 120 : 200, fontSize: 13, height: 38 }} />
            <select value={goalType} onChange={e => { setGoalType(e.target.value); setDays({}); }} style={{ ...inp, width: mob ? 120 : 140, fontSize: 13, height: 38 }}>
              <option value="tang_co">🏋️ Tăng cơ</option>
              <option value="giam_mo">🔥 Giảm mỡ</option>
              <option value="duy_tri">⚖️ Duy trì</option>
            </select>
          </div>

          {templatesForGoal.length === 0 && (
            <div style={{ padding: "16px 14px", textAlign: "center", fontSize: 12, color: C.t3, background: C.surface, borderRadius: 10, marginBottom: 14 }}>
              Chưa có mẫu nào cho nhóm {GOAL_LABEL[goalType]} — vào tab "Kho mẫu" tạo mẫu trước.
            </div>
          )}

          {templatesForGoal.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {DAY_KEYS.map((dk, i) => {
                const chosenId = days[dk];
                const chosen = templatesForGoal.find(t => t.id === chosenId);
                const isDup = chosenId && DAY_KEYS.filter(k => days[k] === chosenId).length > 1;
                return (
                  <div key={dk} style={{ display: "grid", gridTemplateColumns: mob ? "60px 1fr" : "80px 1fr", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.t2 }}>{DAY_LABELS[i]}</span>
                    <select
                      value={chosenId || ""}
                      onChange={e => setDays({ ...days, [dk]: e.target.value || undefined })}
                      style={{ ...inp, fontSize: 12, height: 36, background: isDup ? "#FEF3C7" : undefined }}
                    >
                      <option value="">— chọn mẫu —</option>
                      {templatesForGoal.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.day_type === "train" ? "💪" : "😴"} {t.name} ({t.total_cal || 0}cal)
                        </option>
                      ))}
                    </select>
                    {isDup && <div style={{ gridColumn: "2", fontSize: 10, color: "#92400E" }}>⚠️ Trùng mẫu với ngày khác gần đây</div>}
                    {chosen && <div style={{ display: "none" }} />}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={handleSave} style={{ ...redBtn, marginTop: 0, background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}>
            {editingId ? "💾 Cập nhật Gói tuần" : "🗓️ Lưu Gói tuần"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ ...inp, marginTop: 8, textAlign: "center", cursor: "pointer", fontWeight: 700, color: C.t2 }}>
              Hủy sửa
            </button>
          )}
          <div id="bundle-saved" style={{ display: "none", alignItems: "center", gap: 8, padding: "10px 14px", background: C.greenBg, borderRadius: 10, border: `1.5px solid ${C.green}`, marginTop: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#14532D" }}>✓ Đã lưu Gói tuần!</span>
          </div>
        </div>

        <div>
          <div style={{ marginTop: mob ? 20 : 0, borderTop: mob ? `2px solid ${C.border}` : "none", paddingTop: mob ? 16 : 0 }}>
            <div style={{ fontSize: mob ? 19 : 17, fontWeight: 800, color: C.t1, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 17 }}>📦</span><span>Gói đã tạo ({(weeklyBundles || []).length})</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 16 }}>Danh sách gói hiện có</div>
            {(weeklyBundles || []).length === 0 && (
              <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: C.t3, background: C.surface, borderRadius: 10 }}>Chưa có gói tuần nào</div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(weeklyBundles || []).map(b => {
                const isOpen = expandedId === b.id;
                const filledCount = Object.values(b.days || {}).filter(Boolean).length;
                return (
                  <div key={b.id} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 4px", cursor: "pointer" }} onClick={() => setExpandedId(isOpen ? null : b.id)}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>🗓️</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                        <div style={{ fontSize: 10, color: C.t3 }}>{GOAL_LABEL[b.goal_type] || b.goal_type} · {filledCount}/7 ngày</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(b); }} style={{ width: 20, height: 20, padding: 0, borderRadius: 6, fontSize: 11, color: C.primary, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>✎</button>
                      <button onClick={async (e) => { e.stopPropagation(); if (!await appConfirm(`Xóa gói "${b.name}"?`, { danger: true })) return; if (deleteWeeklyBundle) await deleteWeeklyBundle(b.id); }} style={{ width: 20, height: 20, padding: 0, borderRadius: 6, fontSize: 11, color: C.t3, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>✕</button>
                    </div>
                    {isOpen && (
                      <div onClick={e => e.stopPropagation()} style={{ padding: "0 4px 10px 27px", cursor: "default" }}>
                        {DAY_KEYS.map((dk, i) => {
                          const t = (defaultTemplates || []).find(x => x.id === (b.days || {})[dk]);
                          return (
                            <div key={dk} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t3, padding: "2px 0" }}>
                              <span style={{ fontWeight: 700, color: C.t2 }}>{DAY_LABELS[i]}</span>
                              <span>{t ? `${t.day_type === "train" ? "💪" : "😴"} ${t.name}` : "— chưa gán —"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
