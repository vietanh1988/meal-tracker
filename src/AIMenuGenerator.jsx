// ============================================================
// AI MENU GENERATOR — màn hình cho user "không biết nhập gì".
// 3 bước: prefs (hỏi nhanh) → loading → preview (đổi món / tạo lại).
// Bấm "Áp dụng cho hôm nay" → onApply(template) — cha quyết định
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
import { useState, useRef, useEffect, useMemo } from "react";
import { C, card, redBtn, fs, fw, sp, radius } from "./theme";

// AI mất 8–21 giây — xoay vòng câu trạng thái mỗi 3.5s để user thấy tiến triển
const LOADING_LINES = [
  "Đang chọn món hợp khẩu vị bạn...",
  "Đang cân khẩu phần theo mục tiêu...",
  "Đang xếp mâm cho từng bữa...",
  "Sắp xong rồi, chờ xíu nhé...",
];
function LoadingCard() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, LOADING_LINES.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ ...card, textAlign: "center", padding: "40px 18px" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🍳</div>
      <div style={{ fontSize: fs["2xl"], fontWeight: fw.bold, color: C.t1, marginBottom: 6 }}>Đang lên thực đơn cho bạn</div>
      <div style={{ fontSize: fs.base, color: C.t3, minHeight: 20, transition: "opacity 0.3s" }}>{LOADING_LINES[idx]}</div>
    </div>
  );
}
import { ALL_MEALS } from "./mealConstants";
// Quota check chuyển hẳn sang server (edge function) — xem generate()
import { useIsMobile } from "./hooks/useIsMobile";
import {
  generateMenuAI, swapFoodInTemplate, getSwapCandidates, sumTemplate, dayTarget, getFoodDisplayCategory, resolveMealIds, getRecentFoodKeys,
  getPatternReason, formatFoodPortion, capitalizeFirst, saveAIMenu,
} from "./lib/aiMenuService";
import { buildWhitelist } from "./lib/whitelistBuilder";
import { getFoodDisplay } from "./lib/localFoodDB";
import { MEAL_TIMES } from "./mealPatterns";

const STYLES = [
  { id: "vn", label: "🍚 Cơm nhà VN", desc: "Cơm, canh, món mặn quen thuộc" },
  { id: "clean", label: "🥗 Eat clean", desc: "Ức gà, khoai lang, yến mạch" },
  { id: "easy", label: "⚡ Tiện lợi", desc: "Ít nấu nướng, đồ nhanh gọn" },
];

export default function AIMenuGenerator({ macro, profile, user, appSettings, initialDayType, getMealHistory, getDailyLogs, onApply, onClose, onFallbackToLibrary }) {
  const mob = useIsMobile();
  const [step, setStep] = useState("prefs"); // prefs | loading | preview | error
  const [style, setStyle] = useState("vn");
  const [avoid, setAvoid] = useState("");
  const isNoneExercise = (profile?.exerciseType || "gym") === "none";
  const [dayType, setDayType] = useState(isNoneExercise ? "rest" : (initialDayType === "rest" ? "rest" : "train"));
  const [template, setTemplate] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [swapping, setSwapping] = useState(null); // {mealId, food} — đổi 1 nguyên liệu
  // Variety tầng SESSION — nhớ pattern đã hiện trong phiên này (kể cả khi
  // chưa bấm "Áp dụng cho hôm nay" để lưu thật) — bấm "🔄 Tạo lại menu" nhiều
  // lần liên tiếp sẽ KHÔNG ra lại y hệt lần trước.
  const shownPatternsRef = useRef(new Set());

  // Đúng danh sách bữa THẬT user đang thấy (ưu tiên profile.mealConfig cá
  // nhân > appSettings.meal_config admin > mặc định cứng) — KHÔNG hardcode
  // DEFAULT_MEAL_CONFIG nữa, tránh AI sinh bữa mà user đã tắt (VD tắt
  // pre/post-workout qua "⚙️ Bật/tắt bữa").
  const mealIds = resolveMealIds(dayType, profile, appSettings);

  // Swap candidates phải tôn trọng diet/style/supplement giống lúc TẠO menu —
  // không để user low-carb bấm "Đổi" khoai lang ra cơm trắng/xôi
  const swapAllowed = useMemo(() => {
    const wl = buildWhitelist({
      style, diet: macro?.dietStrategy || profile?.dietStrategy || "balanced",
      goal: macro?.goal || profile?.goalType || null,
      usesSupplements: profile?.usesSupplements === true,
      mealIds,
    });
    return new Set(wl.items.map(i => i.key));
  }, [style, dayType, macro?.dietStrategy, macro?.goal, profile?.dietStrategy, profile?.goalType, profile?.usesSupplements]);
  const target = dayTarget(macro, dayType);

  const generate = async () => {
    setStep("loading");
    setError("");
    // Quota (theo NGÀY, riêng khỏi macro) giờ CHẶN Ở SERVER (edge function
    // ai-proxy) — nguồn sự thật duy nhất, client không thể bypass qua
    // DevTools. Không tự tăng counter ở đây nữa (tránh double-count).

    // Variety V2 — theo FOOD KEY (V2 không dùng pattern): gộp 2 nguồn:
    // (1) đã ăn thật 3 ngày gần nhất, (2) đã hiện trong CHÍNH phiên này
    // dù chưa lưu (shownPatternsRef giờ chứa food keys).
    // Ưu tiên daily_logs (mỗi ngày 1 bản ghi, KHÔNG bị ghi đè) thay vì
    // meal_logs (chỉ giữ bản mới nhất/loại bữa — nếu 2 ngày liền lưu cùng
    // bữa trưa, bữa hôm qua bị mất, "3 ngày gần nhất" chỉ còn thấy 1 bữa
    // bất kỳ ngày nào, không phải lịch sử thật 3 ngày).
    const avoidFoodSet = new Set(shownPatternsRef.current);
    if (getDailyLogs) {
      try {
        const start = new Date(); start.setDate(start.getDate() - 3);
        const dailyRows = await getDailyLogs(start.toISOString().slice(0, 10), new Date().toISOString().slice(0, 10));
        // daily_logs lưu nested (1 ngày → nhiều bữa → mỗi bữa có items
        // riêng trong .meals[]), khác meal_logs (1 row = 1 bữa, items
        // phẳng ở top-level). Flatten về đúng shape getRecentFoodKeys
        // cần — không sửa hàm cũ để tránh ảnh hưởng chỗ khác dùng nó.
        const flatHistory = (dailyRows || []).flatMap(row =>
          (row.meals || []).map(m => ({ log_date: row.log_date, items: m.items || [] }))
        );
        getRecentFoodKeys(flatHistory, 3).forEach(k => avoidFoodSet.add(k));
      } catch (e) { console.error("Variety daily_logs fetch error:", e); }
    } else if (getMealHistory) {
      // Fallback cho nơi chưa truyền getDailyLogs (VD OnboardingWizard,
      // user mới chưa có lịch sử gì đáng kể nên không ảnh hưởng nhiều).
      try {
        const start = new Date(); start.setDate(start.getDate() - 3);
        const history = await getMealHistory(start.toISOString().slice(0, 10), new Date().toISOString().slice(0, 10));
        getRecentFoodKeys(history, 3).forEach(k => avoidFoodSet.add(k));
      } catch (e) { console.error("Variety history fetch error:", e); }
    }

    const res = await generateMenuAI({ macro, profile, dayType, mealIds, prefs: { style, avoid }, avoidFoods: [...avoidFoodSet], appSettings });
    if (res.ok) {
      setTemplate(res.template); setNote(res.note); setStep("preview");
      saveAIMenu(res.template, user?.id);
      // Ghi food key nguồn chính vừa hiện — "Tạo lại" sẽ tránh lặp
      res.template.meals.forEach(m => (m.items || []).forEach(it => {
        if (it.role === "protein" || it.role === "carb") shownPatternsRef.current.add(it.food);
      }));
    }
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
      <div style={{ fontSize: fs["4xl"], fontWeight: fw.extrabold, color: C.t1, marginBottom: 4 }}>✨ Fipilot lên thực đơn cho bạn</div>
      <div style={{ fontSize: fs.base, color: C.t2, marginBottom: sp["4xl"] }}>
        Chọn nhanh 2 mục — Fipilot lên thực đơn món Việt vừa đúng {target.cal} kcal cho bạn.
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

      {!isNoneExercise && <>
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
      </>}

      <button onClick={generate} style={redBtn}>✨ Lên thực đơn ngay</button>
      <button onClick={onClose} style={{ width: "100%", marginTop: sp.lg, padding: "10px", background: "none", border: "none", color: C.t3, fontSize: fs.base, cursor: "pointer", fontFamily: "inherit" }}>Để sau</button>
    </div>
  );

  // ---------- STEP 2: LOADING ----------
  if (step === "loading") return <LoadingCard />;

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: fs["3xl"], fontWeight: fw.extrabold, color: C.t1 }}>Thực đơn AI{isNoneExercise ? "" : ` · ${dayType === "train" ? "Ngày tập" : "Ngày nghỉ"}`}</div>
            {note && <div style={{ fontSize: fs.md, color: C.t3, marginTop: 2 }}>{note}</div>}
          </div>
          <button onClick={generate} title="Tạo lại toàn bộ" style={{ flexShrink: 0, whiteSpace: "nowrap", border: `1.5px solid ${C.border}`, background: C.surface, borderRadius: radius["2xl"], padding: "8px 12px", cursor: "pointer", fontSize: fs.sm, fontFamily: "inherit", fontWeight: fw.bold, color: C.t2 }}>🔄 Tạo lại</button>
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
        const reason = m.pattern ? getPatternReason(m.meal_id, m.pattern, macro.goal) : null;
        const time = MEAL_TIMES[m.meal_id] || "";
        const visibleItems = (m.items || []).filter(it => it.display !== null && it.gram > 0);
        const totalGram = Math.round((m.items || []).reduce((s, it) => s + (it.gram || 0), 0));
        // Chỉ món TÔ (composite: phở/bún/cháo/mì) hiện gọn 1 dòng
        // Món ĐĨA (cơm + các món) vẫn liệt kê từng món chi tiết
        const showCompact = !!m.composite;
        return (
          <div key={m.meal_id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: sp.lg }}>
              <div>
                <span style={{ fontSize: fs.xl, fontWeight: fw.extrabold, color: "#3B82F6" }}>{meta?.name || m.meal_id}</span>
                {time && <span style={{ fontSize: fs.md, color: C.t3, marginLeft: 6 }}>{time}</span>}
                {m.pattern && !showCompact && <span style={{ fontSize: fs.lg, fontWeight: fw.bold, color: C.t1, marginLeft: 8 }}>· {m.pattern}</span>}
                {reason && <div style={{ fontSize: fs.sm, color: C.primary, marginTop: 3 }}>💡 {reason}</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: fs.base, fontWeight: fw.bold, color: "#3B82F6" }}>{mealCal} kcal</span>
              </div>
            </div>
            {showCompact ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${sp.md}px 0` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: fs.lg, fontWeight: fw.bold, color: C.t1 }}>{m.pattern}</div>
                  <div style={{ fontSize: fs.md, color: C.t3 }}>1 tô (~{totalGram}g)</div>
                </div>
                <span style={{ fontSize: fs.md, fontWeight: fw.bold, color: C.t3 }}>{mealCal} kcal</span>
              </div>
            ) : visibleItems.map(it => {
              const displayName = it.display || getFoodDisplay(it.food);
              const portion = formatFoodPortion(it.food, it.gram);
              const itemCal = Math.round(it.cal || 0);
              return (
                <div key={it.food + (it.display||"")} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: `${sp.md}px 0`, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: fs.lg, fontWeight: fw.semibold, color: C.t1 }}>{displayName}</div>
                    <div style={{ fontSize: fs.md, color: C.t3 }}>{portion}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: fs.md, color: C.t3 }}>{itemCal} kcal</span>
                    <button onClick={() => setSwapping({ mealId: m.meal_id, food: it.food, inMeal: m.items.map(x => x.food) })}
                      style={{ border: "none", background: C.surface, borderRadius: radius.lg, padding: "4px 10px", cursor: "pointer", fontSize: fs.sm, fontFamily: "inherit", color: C.t2, fontWeight: fw.bold }}>
                      Đổi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <button onClick={() => onApply(template)} style={{ ...redBtn, marginTop: sp.md }}>✅ Áp dụng cho hôm nay</button>
      <button onClick={onClose} style={{ width: "100%", marginTop: sp.lg, padding: "10px", background: "none", border: "none", color: C.t3, fontSize: fs.base, cursor: "pointer", fontFamily: "inherit" }}>Đóng</button>

      {/* PICKER ĐỔI MÓN — cùng role, tính lại gram ngay, không tốn lượt AI */}
      {swapping && (
        <div onClick={() => setSwapping(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: mob ? "flex-end" : "center", justifyContent: "center", padding: mob ? 0 : 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: mob ? "16px 16px 0 0" : radius["2xl"], width: "100%", maxWidth: 420, maxHeight: mob ? "60vh" : "70vh", overflowY: "auto", padding: 18 }}>
            <div style={{ fontSize: fs.xl, fontWeight: fw.extrabold, color: C.t1, marginBottom: sp["2xl"] }}>
              Thay "{swapping.food}" bằng món cùng nhóm
            </div>
            {getSwapCandidates(swapping.food, swapping.inMeal, swapAllowed).map(k => (
              <button key={k} onClick={() => doSwap(k)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: fs.lg, color: C.t1 }}>
                <span>{capitalizeFirst(k)}</span>
                <span style={{ fontSize: fs.sm, color: C.t3 }}>{getFoodDisplayCategory(k) === "protein" ? "Đạm" : getFoodDisplayCategory(k) === "carb" ? "Tinh bột" : getFoodDisplayCategory(k) === "veg" ? "Rau" : getFoodDisplayCategory(k) === "fruit" ? "Hoa quả" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
