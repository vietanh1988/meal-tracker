// Bản vẽ 133c (18/10) — tab Thực đơn của khách giảm cân: Hôm nay / Ngày mai, app tự lên (không AI), mỗi món có nút Đổi.
import { Seg, Icon } from "./ui";
import { ltCard } from "../theme";
import { SumCard, MealCard, portionText, foodName } from "./menuUI";
import { mealKey, hasItems, sortMeals } from "../lib/mealMath";
import { fmtVN, weekdayLong } from "../lib/dateVN";
import { fmtDec } from "../lib/mobileView";

export function LossMenuScreen({ today, tomorrow, sel, onSel, day, targetCal, kgWeek, loading, avoid, onSwap, onAvoid, onRetry }) {
  const meals = sortMeals(((day && day.meals) || []).filter(hasItems));
  const eaten = new Set((day && day.eaten_meals) || []);
  const cal = Math.round(meals.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (Number(i.cal) || 0), 0), 0));
  const d = sel === "tomorrow" ? tomorrow : today;
  const doi = (mealId) => (it) => (
    <button data-testid="menu-swap" data-meal={mealId} onClick={() => onSwap(d, mealId, it.food)}
      style={{ height: 30, padding: "0 12px", borderRadius: 15, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 12, fontWeight: 800, fontFamily: "inherit", flexShrink: 0 }}>Đổi</button>
  );
  return (
    <div data-testid="loss-menu" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 900 }}>Thực đơn</span>
        <span style={{ fontSize: 14, color: "#64748B" }}>{kgWeek ? `Ăn theo là đúng kế hoạch giảm ${fmtDec(kgWeek)} kg/tuần` : "Ăn theo là đúng kế hoạch"}</span>
      </div>
      <div style={{ margin: "14px 12px 0 12px" }}>
        <Seg mode="tab" value={sel} onChange={onSel} opts={[{ value: "today", label: `Hôm nay · ${fmtVN(today).slice(0, 5)}`, testid: "loss-menu-today" }, { value: "tomorrow", label: `Ngày mai · ${fmtVN(tomorrow).slice(0, 5)}`, testid: "loss-menu-tomorrow" }]} />
      </div>
      {loading || !day ? (
        <div data-testid="loss-menu-loading" style={{ margin: "12px 12px 0 12px", ...ltCard, padding: 18, fontSize: 14, color: "#475569" }}>Đang lên thực đơn…</div>
      ) : meals.length ? (
        <>
          <div style={{ margin: "12px 12px 0 12px" }}>
            <SumCard testid="loss-menu-sum" title={`${weekdayLong(d).toUpperCase()} ${fmtVN(d).slice(0, 5)}`} cal={cal} target={targetCal} bar={targetCal ? (cal / targetCal) * 100 : null}
              sub="App tự lên mỗi ngày từ món Việt quen thuộc, tránh món bạn không ăn. Không hợp món nào thì bấm Đổi." />
          </div>
          <div style={{ margin: "12px 12px 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
            {meals.map((m) => <MealCard key={mealKey(m)} testid="loss-menu-meal" meal={m} name={foodName} portion={portionText} right={eaten.has(mealKey(m)) ? null : doi(mealKey(m))} />)}
          </div>
        </>
      ) : (
        <div data-testid="loss-menu-empty" style={{ margin: "12px 12px 0 12px", ...ltCard, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>Ngày này chưa có thực đơn.</span>
          <button data-testid="loss-menu-plan" onClick={() => onRetry(d)} style={{ height: 48, borderRadius: 14, border: "none", background: "#EEF4FF", color: "#0062F0", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Lên thực đơn cho ngày này</button>
        </div>
      )}
      <div style={{ margin: "12px 12px 0 12px" }}>
        <button data-testid="loss-menu-avoid" onClick={onAvoid} style={{ width: "100%", height: 52, borderRadius: 14, border: "none", background: "#FFFFFF", display: "flex", alignItems: "center", gap: 10, padding: "0 16px", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>
          <span style={{ flex: 1, textAlign: "left" }}>Món bạn không ăn</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B", maxWidth: "50%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{avoid || "Chưa chọn"}</span>
          {Icon.chev(16)}
        </button>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}
