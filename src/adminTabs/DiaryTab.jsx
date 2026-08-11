import { useState, useEffect, useCallback } from "react";
import { C, card } from "../theme";
import { supabase } from "../lib/supabase";

const MEAL_ICONS = { sang: "🌅", phu_sang: "🥐", trua: "☀️", phu_chieu: "🍎", pre: "💪", post: "🏋️", toi: "🌙" };
const MEAL_NAMES = { sang: "Bữa sáng", phu_sang: "Bữa phụ sáng", trua: "Bữa trưa", phu_chieu: "Bữa phụ chiều", pre: "Trước tập", post: "Sau tập", toi: "Bữa tối" };
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function getWeekDates(refDate) {
  const d = new Date(refDate);
  const day = d.getDay(); // 0=CN
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(dd.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DiaryTab({ userId, macro }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedMeal, setExpandedMeal] = useState(null); // bấm ngày trên lịch → lọc

  const today = todayStr();
  const refDate = new Date();
  refDate.setDate(refDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(refDate);

  const loadLogs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Load last 30 days of daily_logs
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("daily_logs")
        .select("log_date, day_type, meals, total_cal, total_protein, total_carb, total_fat, total_fiber, eaten_meals")
        .eq("user_id", userId)
        .gte("log_date", since.toISOString().slice(0, 10))
        .order("log_date", { ascending: false });
      if (error) console.error("Diary load error:", error);
      setLogs(data || []);
    } catch (e) { console.error("Diary load error:", e); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Streak calculation — consecutive days with eaten_meals.length > 0 ending at today
  const calcStreak = () => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const ds = d.toISOString().slice(0, 10);
      const log = logs.find(l => l.log_date === ds);
      const eaten = log?.eaten_meals || [];
      if (eaten.length > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };
  const streak = calcStreak();

  // Check if a date has completed eating
  const isDayDone = (dateStr) => {
    const log = logs.find(l => l.log_date === dateStr);
    if (!log) return false;
    const eaten = log.eaten_meals || [];
    return eaten.length > 0;
  };

  // Get log for a date
  const getLog = (dateStr) => logs.find(l => l.log_date === dateStr);

  // Parse meals from daily_log
  const parseMeals = (log) => {
    if (!log || !log.meals) return [];
    const mealsArr = Array.isArray(log.meals) ? log.meals : Object.values(log.meals);
    return mealsArr.filter(m => m && ((m.items && m.items.length > 0) || m.meal_id));
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ fontSize: 18, fontWeight: 900, color: C.t1, marginBottom: 14 }}>📓 Nhật ký bữa ăn</div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: C.t3 }}>Đang tải...</div>}

      {!loading && <>
        {/* Streak */}
        {streak > 0 && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", borderRadius: 12, border: "1.5px solid #F59E0B", marginBottom: 10 }}>
          <span style={{ fontSize: 28 }}>🔥</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#92400E" }}>{streak} ngày</div>
            <div style={{ fontSize: 10, color: "#92400E", fontWeight: 600 }}>liên tiếp ăn đúng calo mục tiêu</div>
          </div>
        </div>}

        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>◀ Trước</button>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.t2 }}>{weekOffset === 0 ? "Tuần này" : `${weekDates[0].slice(5)} — ${weekDates[6].slice(5)}`}</span>
          <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0} style={{ padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${C.border}`, background: weekOffset >= 0 ? C.surface : "#fff", cursor: weekOffset >= 0 ? "default" : "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: weekOffset >= 0 ? C.t3 : C.t1 }}>Sau ▶</button>
        </div>

        {/* Week calendar */}
        <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
          {weekDates.map(ds => {
            const d = new Date(ds + "T00:00:00");
            const isToday = ds === today;
            const done = isDayDone(ds);
            const isSel = ds === selectedDate;
            return <div key={ds} onClick={() => setSelectedDate(isSel ? null : ds)} style={{ flex: 1, textAlign: "center", padding: "6px 2px", borderRadius: 10, background: isSel ? "#DBEAFE" : done ? "#F0FDF4" : "#fff", border: `1.5px solid ${isSel ? "#2563EB" : isToday ? "#007AFF" : done ? "#86EFAC" : C.border}`, cursor: "pointer", transition: "all .12s" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: C.t3 }}>{DAY_NAMES[d.getDay()]}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.t1, marginTop: 1 }}>{d.getDate()}</div>
              <div style={{ width: 6, height: 6, borderRadius: 3, margin: "3px auto 0", background: done ? "#16A34A" : C.border }} />
            </div>;
          })}
        </div>

        {/* Daily logs — lọc theo ngày đã chọn hoặc hiện tất cả */}
        {(selectedDate ? [selectedDate] : weekDates.slice().reverse()).map(ds => {
          const log = getLog(ds);
          if (!log || log.total_cal === 0) return null;
          const meals = parseMeals(log);
          const isToday = ds === today;
          const eaten = log.eaten_meals || [];
          // Chỉ tính calo/macro từ bữa ĐÃ ĂN
          const eatenMeals = meals.filter(m => eaten.includes(m.meal_id || m.id || ""));
          const eatenCal = Math.round(eatenMeals.reduce((s, m) => s + (m.items || []).reduce((a, it) => a + (it.cal || 0), 0), 0));
          const eatenP = Math.round(eatenMeals.reduce((s, m) => s + (m.items || []).reduce((a, it) => a + (it.p || it.protein || 0), 0), 0));
          const eatenC = Math.round(eatenMeals.reduce((s, m) => s + (m.items || []).reduce((a, it) => a + (it.c || it.carb || 0), 0), 0));
          const eatenF = Math.round(eatenMeals.reduce((s, m) => s + (m.items || []).reduce((a, it) => a + (it.f || it.fat || 0), 0), 0));
          const eatenFb = Math.round(eatenMeals.reduce((s, m) => s + (m.items || []).reduce((a, it) => a + (it.fiber || 0), 0), 0));
          if (eatenCal === 0 && eaten.length === 0) return null; // không có bữa đã ăn → ẩn ngày này
          const calColor = eaten.length > 0 ? "#16A34A" : "#007AFF";

          return <div key={ds} style={{ ...card, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.t1 }}>
                {isToday ? "Hôm nay · " : ""}{formatDate(ds)}
                {log.day_type && <span style={{ fontSize: 10, color: C.t3, marginLeft: 4 }}>· {log.day_type === "train" ? "Ngày tập" : "Ngày nghỉ"}</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: calColor }}>
                {eatenCal} cal {eaten.length > 0 ? "✅" : ""}
              </div>
            </div>

            {/* Meal list — CHỈ hiện bữa đã tick Đã ăn */}
            {meals.filter(m => {
              const mealId = m.meal_id || m.id || "";
              return eaten.includes(mealId);
            }).map((m, i) => {
              const mealId = m.meal_id || m.id || "";
              const icon = MEAL_ICONS[mealId] || "🍽️";
              const name = MEAL_NAMES[mealId] || m.meal_name || mealId;
              const items = (m.items || []).filter(it => it && it.food);
              const mealCal = Math.round(items.reduce((s, it) => s + (it.cal || 0), 0));
              if (mealCal === 0 && items.length === 0) return null;
              const expandKey = ds + "_" + mealId;
              const isExpanded = expandedMeal === expandKey;
              return <div key={i}>
                <div onClick={() => setExpandedMeal(isExpanded ? null : expandKey)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.surface}`, cursor: "pointer" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{name}</div>
                    <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{items.map(it => it.display || it.food).join(" · ")}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.t2 }}>{mealCal}</span>
                  <span style={{ fontSize: 10, color: C.t3, marginLeft: 4, transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                </div>
                {isExpanded && <div style={{ padding: "4px 0 4px 26px", marginBottom: 4 }}>
                  {items.map((it, j) => <div key={j} style={{ padding: "6px 0", borderBottom: j < items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.t1 }}>{it.display || it.food}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.t3 }}>{it.gram || "?"}g</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.t2 }}>P {Math.round((it.p || it.protein || 0) * 10) / 10}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.t2 }}>C {Math.round((it.c || it.carb || 0) * 10) / 10}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.t2 }}>F {Math.round((it.f || it.fat || 0) * 10) / 10}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.t2 }}>Xơ {Math.round((it.fiber || 0) * 10) / 10}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: C.t2, marginLeft: "auto" }}>{Math.round(it.cal || 0)} cal</span>
                    </div>
                  </div>)}
                </div>}
              </div>;
            })}

            {/* Macro summary */}
            <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.surface}` }}>
              {[
                { label: "Đạm", val: eatenP, color: "#007AFF" },
                { label: "T.bột", val: eatenC, color: "#5AC8FA" },
                { label: "C.béo", val: eatenF, color: "#F59E0B" },
                { label: "Xơ", val: eatenFb, color: "#22C55E" },
              ].map((x, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: x.color }}>{x.val}g</div>
                <div style={{ fontSize: 8, color: C.t3, fontWeight: 600 }}>{x.label}</div>
              </div>)}
            </div>
          </div>;
        })}

        {/* Selected date info */}
        {selectedDate && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#DBEAFE", borderRadius: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>📅 {formatDate(selectedDate)}</span>
          <button onClick={() => setSelectedDate(null)} style={{ background: "none", border: "none", color: "#1D4ED8", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Xem tất cả ✕</button>
        </div>}

        {/* Selected date no data */}
        {selectedDate && (!getLog(selectedDate) || getLog(selectedDate).total_cal === 0) && <div style={{ textAlign: "center", padding: 24, color: C.t3 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>📭</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Chưa có dữ liệu ngày {formatDate(selectedDate)}</div>
        </div>}

        {/* Empty state */}
        {!selectedDate && weekDates.every(ds => !getLog(ds) || getLog(ds).total_cal === 0) && <div style={{ textAlign: "center", padding: 30, color: C.t3 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📓</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Chưa có dữ liệu tuần này</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Hãy tạo thực đơn và đánh dấu "Đã ăn" để ghi nhật ký</div>
        </div>}
      </>}
    </div>
  );
}
