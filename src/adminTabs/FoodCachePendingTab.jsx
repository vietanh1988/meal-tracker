import { C, card, redBtn } from "../theme";
import { getFoodCount } from "../lib/localFoodDB";

export function FoodCachePendingTab({ mob, allPending, pendingCount, approvedCount, approvePendingFood, rejectPendingFood }) {
  const localCount = getFoodCount();
  return (
    <div style={{ ...card, padding: mob ? "12px 10px" : "16px 18px" }}>
      <div style={{ fontSize: mob ? 19 : 17, fontWeight: 800, color: C.t1, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 17 }}>🗂️</span><span>Kho món ăn</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 16 }}>
        Món lạ user nhập (AI/USDA tự tính) chờ admin duyệt trước khi vào kho dùng chung
      </div>

      {/* Tổng quan số món */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        <div style={{ background: C.surface, borderRadius: 12, padding: "14px 12px", textAlign: "center", border: `1.5px solid ${C.border}` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.t1 }}>{localCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, marginTop: 2 }}>Kho gốc (code)</div>
        </div>
        <div style={{ background: "#DCFCE7", borderRadius: 12, padding: "14px 12px", textAlign: "center", border: "1.5px solid #86EFAC" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#166534" }}>{approvedCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginTop: 2 }}>Đã duyệt (dùng chung)</div>
        </div>
        <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "14px 12px", textAlign: "center", border: "1.5px solid #FCD34D" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#92400E" }}>{pendingCount}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginTop: 2 }}>Đang chờ duyệt</div>
        </div>
      </div>

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
                <button onClick={() => approvePendingFood(row)} style={{ ...redBtn, flex: 1, marginTop: 0, background: "linear-gradient(135deg,#15803D,#166534)" }}>✓ Duyệt vào kho chung</button>
                <button onClick={() => { if (confirm(`Từ chối "${row.food_name}"?`)) rejectPendingFood(row.id); }} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, border: "1.5px solid #FCA5A5", borderRadius: 10, background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}>✕ Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
