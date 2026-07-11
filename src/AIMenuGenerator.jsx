// ============================================================
// AI MENU GENERATOR — màn hình cho user "không biết nhập gì".
// 3 bước: prefs (hỏi nhanh) → loading → preview (đổi món / tạo lại).
// Bấm "Dùng thực đơn này" → onApply(template) — cha quyết định
// applyTemplate + saveWeeklyTemplate (giữ nguyên pipeline cũ).
//
// Props:
//   macro     : output calcMacro()
//   profile   : profile user
//   user      : { id } — cho quota
//   onApply   : (template) => void  — template đã qua engine, gram thật
//   onClose   : () => void
//   onFallbackToLibrary : () => void — mở Kho mẫu khi AI fail hẳn
// ============================================================
import { useState } from "react";
import { C, card, redBtn, fs, fw, sp, radius } from "./theme";
import { ALL_MEALS } from "./mealConstants";
import { checkAndConsumeAiQuota } from "./lib/aiQuota";
import { useIsMobile } from "./hooks/useIsMobile";
import {
  generateMenuAI, swapFoodInTemplate, getSwapCandidates, sumTemplate, dayTarget, getFoodDisplayCategory, resolveMealIds, getRecentPatternNames,
} from "./lib/aiMenuService";

const STYLES = [
  { id: "vn", label: "🍚 Cơm nhà VN", desc: "Cơm, canh, món mặn quen thuộc" },
  { id: "clean", label: "🥗 Eat clean", desc: "Ức gà, khoai lang, yến mạch" },
  { id: "easy", label: "⚡ Tiện lợi", desc: "Ít nấu nướng, đồ nhanh gọn" },
];

// 4 nhóm CỐ ĐỊNH khớp đúng cấu trúc bữa mới (sáng 3 món, trưa/tối 4 món) —
// tách Rau và Hoa quả riêng thay vì gộp chung "Rau/Phụ" như trước.
const CAT_LABEL = { protein: "Đạm", carb: "Tinh bột", veg: "Rau", fruit: "Hoa quả", fat: "Béo", other: "Khác" };
const CAT_COLOR = { protein: C.protein, carb: C.carb, veg: C.fiber, fruit: C.gold, fat: C.fat, other: C.t3 };

export default function AIMenuGenerator({ macro, profile, user, appSettings, initialDayType, getMealHistory, onApply, onClose, onFallbackToLibrary }) {
  const mob = useIsMobile();
  const [step, setStep] = useState("prefs"); // prefs | loading | preview | error
  const [style, setStyle] = useState("vn");
  const [avoid, setAvoid] = useState("");
  const [dayType, setDayType] = useState(initialDayType === "rest" ? "rest" : "train");
  const [template, setTemplate] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [swapping, setSwapping] = useState(null); // {mealId, food}

  // Đúng danh sách bữa THẬT user đang thấy (ưu tiên profile.mealConfig cá
  // nhân > appSettings.meal_config admin > mặc định cứng) — KHÔNG hardcode
  // DEFAULT_MEAL_CONFIG nữa, tránh AI sinh bữa mà user đã tắt (VD tắt
  // pre/post-workout qua "⚙️ Bật/tắt bữa").
  const mealIds = resolveMealIds(dayType, profile, appSettings);
  const target = dayTarget(macro, dayType);

  const generate = async () => {
    setStep("loading");
    setError("");
    // Quota: dùng chung pool "macro" hiện có — hoặc đổi thành kind "menu"
    // sau khi thêm cột ai_menu_count vào profiles (xem INTEGRATION.md).
    const quota = await checkAndConsumeAiQuota(user?.id, "macro");
    if (!quota.allowed) { setError(quota.message); setStep("error"); return; }

    // Variety — không gợi ý lại pattern đã ăn trong 3 ngày gần nhất. Không
    // có getMealHistory (chưa truyền prop, hoặc user mới chưa đăng nhập)
    // thì bỏ qua bước này, generate vẫn chạy bình thường như trước.
    let avoidPatternNames;
    if (getMealHistory) {
      try {
        const start = new Date(); start.setDate(start.getDate() - 3);
        const history = await getMealHistory(start.toISOString().slice(0, 10), new Date().toISOString().slice(0, 10));
        avoidPatternNames = getRecentPatternNames(history, 3);
      } catch (e) { console.error("Variety history fetch error:", e); }
    }

    const res = await generateMenuAI({ macro, profile, dayType, mealIds, prefs: { style, avoid }, avoidPatternNames, appSettings });
    if (res.ok) { setTemplate(res.template); setNote(res.note); setStep("preview"); }
    else { setError(res.error); setStep("error"); }
  };

  const doSwap = (newKey) => {
    if (!swapping) return;
    setTemplate(t => swapFoodInTemplate(t, swapping.mealId, swapping.food, newKey, macro, dayType));
    setSwapping(null);
  };

  // ---------- STEP 1: HỎI NHANH ----------
  if (step === "prefs") return (
    <div style={card}>
      <div style={{ fontSize: fs["4xl"], fontWeight: fw.extrabold, color: C.t1, marginBottom: 4 }}>✨ AI tạo thực đơn cho bạn</div>
      <div style={{ fontSize: fs.base, color: C.t2, marginBottom: sp["4xl"] }}>
        Trả lời 2 câu, AI sẽ ghép thực đơn khớp đúng {target.cal} kcal (P{target.p}/C{target.c}/F{target.f}) của bạn.
      </div>

      <div style={{ fontSize: fs.md, fontWeight: fw.bold, color: C.t3, marginBottom: sp.md }}>PHONG CÁCH ĂN</div>
      <div style={{ display: "flex", gap: sp.lg, marginBottom: sp["4xl"], flexWrap: "wrap" }}>
        {STYLES.map(s => (
          <button key={s.id} onClick={() => setStyle(s.id)} style={{
            flex: "1 1 100px", padding: `${sp.xl}px ${sp["2xl"]}px`, borderRadius: radius["2xl"], cursor: "pointer",
            fontFamily: "inherit", textAlign: "left",
            border: `1.5px solid ${style === s.id ? C.primary : C.border}`,
            background: style === s.id ? C.primaryBg : C.card,
          }}>
            <div style={{ fontSize: fs.lg, fontWeight: fw.bold, color: C.t1 }}>{s.label}</div>
            <div style={{ fontSize: fs.sm, color: C.t3, marginTop: 2 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: fs.md, fontWeight: fw.bold, color: C.t3, marginBottom: sp.md }}>MÓN KHÔNG ĂN / DỊ ỨNG (bỏ trống nếu không có)</div>
      <input value={avoid} onChange={e => setAvoid(e.target.value)} placeholder="VD: hải sản, sữa, thịt bò..."
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: fs.lg, borderRadius: radius["2xl"], border: `1.5px solid ${C.border}`, background: C.surface, outline: "none", fontFamily: "inherit", marginBottom: sp["4xl"] }} />

      <div style={{ fontSize: fs.md, fontWeight: fw.bold, color: C.t3, marginBottom: sp.md }}>TẠO CHO</div>
      <div style={{ display: "flex", gap: sp.lg, marginBottom: sp["5xl"] }}>
        {[["train", "💪 Ngày tập"], ["rest", "😴 Ngày nghỉ"]].map(([id, label]) => (
          <button key={id} onClick={() => setDayType(id)} style={{
            flex: 1, padding: "10px", borderRadius: radius["2xl"], cursor: "pointer", fontFamily: "inherit",
            fontSize: fs.lg, fontWeight: fw.bold, color: dayType === id ? C.primary : C.t2,
            border: `1.5px solid ${dayType === id ? C.primary : C.border}`,
            background: dayType === id ? C.primaryBg : C.card,
          }}>{label}</button>
        ))}
      </div>

      <button onClick={generate} style={redBtn}>✨ Tạo thực đơn</button>
      <button onClick={onClose} style={{ width: "100%", marginTop: sp.lg, padding: "10px", background: "none", border: "none", color: C.t3, fontSize: fs.base, cursor: "pointer", fontFamily: "inherit" }}>Để sau</button>
    </div>
  );

  // ---------- STEP 2: LOADING ----------
  if (step === "loading") return (
    <div style={{ ...card, textAlign: "center", padding: "40px 18px" }}>
      <div style={{ fontSize: 32, marginBottom: sp["2xl"] }}>🍳</div>
      <div style={{ fontSize: fs["2xl"], fontWeight: fw.bold, color: C.t1 }}>AI đang ghép thực đơn...</div>
      <div style={{ fontSize: fs.base, color: C.t3, marginTop: sp.md }}>Chọn món → hệ thống tự cân gram khớp {target.cal} kcal</div>
    </div>
  );

  // ---------- STEP LỖI ----------
  if (step === "error") return (
    <div style={card}>
      <div style={{ fontSize: fs["2xl"], fontWeight: fw.bold, color: C.t1, marginBottom: sp.md }}>Chưa tạo được thực đơn</div>
      <div style={{ fontSize: fs.base, color: C.t2, marginBottom: sp["4xl"] }}>{error}</div>
      <button onClick={generate} style={redBtn}>Thử lại</button>
      {onFallbackToLibrary && (
        <button onClick={onFallbackToLibrary} style={{ width: "100%", marginTop: sp.lg, padding: "12px", borderRadius: radius["2xl"], border: `1.5px solid ${C.border}`, background: C.card, color: C.t1, fontSize: fs.lg, fontWeight: fw.bold, cursor: "pointer", fontFamily: "inherit" }}>
          📚 Chọn từ Kho mẫu thay thế
        </button>
      )}
    </div>
  );

  // ---------- STEP 3: PREVIEW ----------
  const total = sumTemplate(template);
  const diffPct = target.cal ? Math.round(Math.abs(total.cal - target.cal) / target.cal * 100) : 0;

  return (
    <div>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: fs["3xl"], fontWeight: fw.extrabold, color: C.t1 }}>Thực đơn AI · {dayType === "train" ? "Ngày tập" : "Ngày nghỉ"}</div>
            {note && <div style={{ fontSize: fs.md, color: C.t3, marginTop: 2 }}>{note}</div>}
          </div>
          <button onClick={generate} title="Tạo lại toàn bộ" style={{ border: `1.5px solid ${C.border}`, background: C.surface, borderRadius: radius["2xl"], padding: "8px 12px", cursor: "pointer", fontSize: fs.base, fontFamily: "inherit", fontWeight: fw.bold, color: C.t2 }}>🔄 Tạo lại</button>
        </div>
        <div style={{ display: "flex", gap: sp["2xl"], marginTop: sp["2xl"], fontSize: fs.base, fontWeight: fw.bold }}>
          <span style={{ color: C.t1 }}>{total.cal} <span style={{ color: C.t3, fontWeight: fw.medium }}>/ {target.cal} kcal</span></span>
          <span style={{ color: C.protein }}>P {total.p}g</span>
          <span style={{ color: C.carb }}>C {total.c}g</span>
          <span style={{ color: C.fat }}>F {total.f}g</span>
        </div>
        {diffPct > 5 && <div style={{ fontSize: fs.sm, color: C.gold, marginTop: sp.xs }}>⚠ Lệch {diffPct}% so với target — bấm Tạo lại hoặc đổi bớt món.</div>}
      </div>

      {(template.meals || []).map(m => {
        const meta = ALL_MEALS.find(x => x.id === m.meal_id);
        const mealCal = Math.round((m.items || []).reduce((s, i) => s + (i.cal || 0), 0));
        return (
          <div key={m.meal_id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: sp.lg }}>
              <div>
                <span style={{ fontSize: fs.xl, fontWeight: fw.extrabold, color: C.t1 }}>{meta?.icon} {m.pattern || meta?.name || m.meal_id}</span>
                {m.pattern && <div style={{ fontSize: fs.sm, color: C.t3, marginTop: 1 }}>{meta?.name || m.meal_id}</div>}
              </div>
              <span style={{ fontSize: fs.base, fontWeight: fw.bold, color: C.t3 }}>{mealCal} kcal</span>
            </div>
            {(m.items || []).map(it => {
              const cat = getFoodDisplayCategory(it.food);
              return (
                <div key={it.food} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${sp.md}px 0`, borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <span style={{ fontSize: fs.sm, fontWeight: fw.bold, color: CAT_COLOR[cat], background: C.surface, borderRadius: radius.sm, padding: "1px 6px", marginRight: sp.md }}>{CAT_LABEL[cat]}</span>
                    <span style={{ fontSize: fs.lg, fontWeight: fw.semibold, color: C.t1, textTransform: "capitalize" }}>{it.food}</span>
                    <span style={{ fontSize: fs.md, color: C.t3, marginLeft: sp.md }}>{it.gram}g · {it.cal} kcal</span>
                  </div>
                  <button onClick={() => setSwapping({ mealId: m.meal_id, food: it.food, inMeal: m.items.map(x => x.food) })}
                    style={{ border: "none", background: C.surface, borderRadius: radius.lg, padding: "4px 10px", cursor: "pointer", fontSize: fs.sm, fontFamily: "inherit", color: C.t2, fontWeight: fw.bold }}>
                    Đổi
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}

      <button onClick={() => onApply(template)} style={{ ...redBtn, marginTop: sp.md }}>✅ Dùng thực đơn này</button>
      <button onClick={onClose} style={{ width: "100%", marginTop: sp.lg, padding: "10px", background: "none", border: "none", color: C.t3, fontSize: fs.base, cursor: "pointer", fontFamily: "inherit" }}>Đóng</button>

      {/* PICKER ĐỔI MÓN — cùng role, tính lại gram ngay, không tốn lượt AI */}
      {swapping && (
        <div onClick={() => setSwapping(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", padding: mob ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: mob ? "16px 16px 0 0" : radius["2xl"], width: "100%", maxWidth: 420, maxHeight: mob ? "60vh" : "70vh", overflowY: "auto", padding: 18 }}>
            <div style={{ fontSize: fs.xl, fontWeight: fw.extrabold, color: C.t1, marginBottom: sp["2xl"] }}>
              Thay "{swapping.food}" bằng món cùng nhóm
            </div>
            {getSwapCandidates(swapping.food, swapping.inMeal).map(k => (
              <button key={k} onClick={() => doSwap(k)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: fs.lg, color: C.t1, textTransform: "capitalize" }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
