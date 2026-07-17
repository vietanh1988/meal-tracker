import { useState } from "react";
import { appAlert, appConfirm } from "../lib/dialog";
import { C, card, redBtn } from "../theme";
import { getFoodCount, getAllFoods } from "../lib/localFoodDB";
import { supabase } from "../lib/supabase";

export function FoodCachePendingTab({ mob, allPending, pendingCount, approvedCount, approvePendingFood, rejectPendingFood }) {
  const localCount = getFoodCount();
  const [expandedLocal, setExpandedLocal] = useState(false);
  const [expandedApproved, setExpandedApproved] = useState(false);
  const [approvedList, setApprovedList] = useState(null);
  const [loadingApproved, setLoadingApproved] = useState(false);

  const toggleLocal = () => { setExpandedLocal(v => !v); setExpandedApproved(false); };

  const toggleApproved = async () => {
    if (expandedApproved) { setExpandedApproved(false); return; }
    setExpandedLocal(false);
    setExpandedApproved(true);
    if (approvedList === null) {
      setLoadingApproved(true);
      const { data, error } = await supabase.from("food_cache").select("*").order("food_name");
      if (error) console.error("Load food_cache list error:", error);
      setApprovedList(data || []);
      setLoadingApproved(false);
    }
  };

  return (
    <div style={{ ...card, padding: mob ? "12px 10px" : "16px 18px" }}>
      <div style={{ fontSize: mob ? 19 : 17, fontWeight: 800, color: C.t1, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 17 }}>🗂️</span><span>Kho món ăn</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 16 }}>
        Món lạ user nhập (AI/USDA tự tính) chờ admin duyệt trước khi vào kho dùng chung
      </div>

      {/* Tổng quan số món — bấm vào để xổ danh sách */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
        <div onClick={toggleLocal} style={{ background: C.surface, borderRadius: 12, padding: "14px 12px", textAlign: "center", border: `1.5px solid ${expandedLocal ? C.primary : C.border}`, cursor: "pointer" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.t1 }}>{localCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, marginTop: 2 }}>Kho gốc (code) {expandedLocal ? "▲" : "▼"}</div>
        </div>
        <div onClick={toggleApproved} style={{ background: "#DCFCE7", borderRadius: 12, padding: "14px 12px", textAlign: "center", border: `1.5px solid ${expandedApproved ? "#166534" : "#86EFAC"}`, cursor: "pointer" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#166534" }}>{approvedCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginTop: 2 }}>Đã duyệt (dùng chung) {expandedApproved ? "▲" : "▼"}</div>
        </div>
        <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "14px 12px", textAlign: "center", border: "1.5px solid #FCD34D" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#92400E" }}>{pendingCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginTop: 2 }}>Đang chờ duyệt</div>
        </div>
      </div>

      {/* Danh sách kho gốc (code) */}
      {expandedLocal && (
        <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 16, maxHeight: 320, overflowY: "auto" }}>
          {getAllFoods().sort((a, b) => a.name.localeCompare(b.name)).map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, padding: "5px 4px", borderBottom: i < localCount - 1 ? `1px solid ${C.border}` : "none", color: C.t2 }}>
              <span><span style={{ color: C.t3, fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>{f.name}</span>
              <span style={{ color: C.t3 }}>P:{f.p} C:{f.c} F:{f.f} = {f.cal}cal/100g</span>
            </div>
          ))}
        </div>
      )}

      {/* Danh sách đã duyệt (dùng chung) */}
      {expandedApproved && (
        <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 12, padding: "10px 12px", marginBottom: 16, maxHeight: 320, overflowY: "auto" }}>
          {loadingApproved ? (
            <div style={{ textAlign: "center", fontSize: 12, color: C.t3, padding: 10 }}>Đang tải...</div>
          ) : (approvedList || []).length === 0 ? (
            <div style={{ textAlign: "center", fontSize: 12, color: C.t3, padding: 10 }}>Chưa có món nào được duyệt</div>
          ) : (approvedList || []).map((f, i) => (
            <div key={f.id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, padding: "5px 4px", borderBottom: i < approvedList.length - 1 ? "1px solid #BBF7D0" : "none", color: "#166534" }}>
              <span><span style={{ color: "#15803D", fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>{f.food_name} {f.gram}g</span>
              <span style={{ color: "#15803D" }}>P:{f.protein} C:{f.carb} F:{f.fat} = {Math.round(f.cal)}cal · {f.ai_provider}</span>
            </div>
          ))}
        </div>
      )}

      {/* Danh sách chờ duyệt */}
      {(!allPending || allPending.length === 0) ? (
        <div style={{ padding: "30px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t2 }}>Không có món nào đang chờ duyệt</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allPending.map(row => (
            <div key={row.id} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: mob ? "10px 12px" : "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{row.food_name}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.t3, marginTop: 2 }}>
                    Nguồn: {row.ai_provider || "?"} · {row.gram}g
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.t1, whiteSpace: "nowrap" }}>{Math.round(row.cal || 0)} cal</div>
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 10 }}>
                <span>P: {row.protein}g</span>
                <span>C: {row.carb}g</span>
                <span>F: {row.fat}g</span>
                <span>Xơ: {row.fiber}g</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approvePendingFood(row)} style={{ ...redBtn, flex: 1, marginTop: 0, fontSize: 14, padding: "12px 10px", minHeight: 44, background: "linear-gradient(135deg,#15803D,#166534)" }}>✓ Duyệt vào kho chung</button>
                <button onClick={async () => { if (await appConfirm(`Từ chối "${row.food_name}"?`, { danger: true })) rejectPendingFood(row.id); }} style={{ flex: 1, padding: "12px 10px", fontSize: 14, fontWeight: 700, border: "1.5px solid #FCA5A5", borderRadius: 14, minHeight: 44, background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}>✕ Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
