import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { C, redBtn } from "./theme";
import { lookupLocalFood } from "./lib/localFoodDB";
import { getUnits, UNIT_MAP as UNIT_MAP_RAW } from "./lib/localFoodDB";
import { authFetch } from "./lib/authFetch";
import { pickAiModel } from "./lib/aiProvider";

// ============================================================
// PhotoMacroChecker — Chụp ảnh bữa ăn → AI nhận diện → xem macro nhanh
// Tính năng độc lập, KHÔNG lưu vào meal log.
// Mobile only. Feature flag: photo_macro.
// ============================================================

const ONBOARDING_KEY = "photo_macro_onboarded";

function getVisionProvider(appSettings, fallbackProvider) {
  const override = appSettings?.photo_vision_provider;
  return (override && override !== "auto") ? override : fallbackProvider;
}

export default function PhotoMacroChecker({ onClose, appSettings }) {
  // Đọc AI provider/model từ appSettings
  const aiProvider = appSettings?.ai_provider || "claude";
  const aiModel = appSettings?.ai_model || "claude-sonnet-5";
  const geminiModel = appSettings?.gemini_model || "gemini-2.5-flash";
  const gptModel = appSettings?.gpt_model || "gpt-4o-mini";
  const [step, setStep] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) ? 1 : 0; } catch { return 0; }
  });
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState([]); // [{name, gram, checked}]
  const [servings, setServings] = useState([]); // [{name, gram, presets}]
  const [results, setResults] = useState(null); // {total, items}
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  // Step 0: Onboarding
  const handleOnboarded = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
    setStep(1);
  };

  // Resize image to max 1024px to save tokens + speed up
  const resizeImage = (dataUrl, maxSize = 1024) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
          else { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = dataUrl;
    });
  };

  // Step 1: Capture image
  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const resized = await resizeImage(reader.result);
      setImageData(resized);
      analyzeImage(resized);
    };
    reader.readAsDataURL(file);
  };

  // AI Vision call
  const analyzeImage = async (base64) => {
    setStep(2); // loading
    setLoading(true);
    setError(null);
    try {
      const provider = getVisionProvider(appSettings, aiProvider);
      const model = pickAiModel(provider, { claudeModel: aiModel, geminiModel, gptModel });
      const prompt = `Nhìn ảnh bữa ăn này. Liệt kê TẤT CẢ các món ăn/thức uống bạn nhìn thấy.
Với mỗi món, ước lượng khối lượng (gram) dựa trên kích thước nhìn thấy.

NGUYÊN TẮC TÁCH / GIỮ NGUYÊN:
- Nếu các thành phần nằm RIÊNG BIỆT trên đĩa/khay (nhìn rõ từng loại): TÁCH ra từng nguyên liệu.
  VD: "bò xào hành tây ớt chuông" → "thịt bò" 120g, "hành tây" 40g, "ớt chuông" 20g
  VD: "cơm với thịt kho rau luộc" → "cơm trắng" 200g, "thịt heo kho" 100g, "rau muống luộc" 80g
- Nếu là món TRỘN LẪN / có nước (phở, bún bò, cháo, canh, lẩu, bánh mì kẹp, xôi, bánh cuốn): GIỮ NGUYÊN tên cả món.
  VD: phở bò → "phở bò" 500g (không tách bánh phở, thịt, nước dùng)

Tên món viết bằng tiếng Việt.
Trả lời ĐÚNG JSON, không có text trước/sau:
[{"name":"tên tiếng Việt","gram":số}]`;

      // Gửi qua authFetch — server sẽ route tới provider phù hợp
      const res = await authFetch("ai-proxy", {
        foodDesc: prompt,
        provider,
        model,
        feature: "photo_macro",
        image: base64.split(",")[1], // bỏ prefix data:image/...;base64,
        temperature: 0,
      });

      if (res.error) throw new Error(res.error);
      
      // Parse JSON từ AI response
      let parsed;
      const text = (res.text || res.result || "").trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("AI không trả đúng format");
      }

      const dishList = parsed.map(d => ({
        name: (d.name || "").trim(),
        gram: Math.round(d.gram || 100),
        checked: true,
      }));
      
      setDishes(dishList);
      setStep(3); // confirm dishes
    } catch (e) {
      console.error("Photo AI error:", e);
      setError(e.message || "Lỗi nhận diện ảnh");
      setStep(1); // quay lại chụp
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → Step 4: build servings
  const handleConfirmDishes = () => {
    const confirmed = dishes.filter(d => d.checked);
    const sv = confirmed.map(d => {
      const presets = getPresets(d.name);
      return { name: d.name, gram: d.gram, aiGram: d.gram, presets };
    });
    setServings(sv);
    setStep(4);
  };

  // Step 4 → Step 5: calculate macro
  const handleCalcMacro = async () => {
    setStep(2); // show loading while calculating
    setLoading(true);
    try {
      const dbItems = [];
      const unknownItems = [];

      servings.forEach((s, i) => {
        const lookup = lookupLocalFood(s.name, s.gram);
        if (lookup && lookup.cal > 0) {
          dbItems.push({
            idx: i, name: s.name, gram: s.gram,
            cal: Math.round(lookup.cal), p: Math.round(lookup.protein || 0),
            c: Math.round(lookup.carb || 0), f: Math.round(lookup.fat || 0),
            fiber: Math.round(lookup.fiber || 0),
            estimated: false,
          });
        } else {
          unknownItems.push({ idx: i, name: s.name, gram: s.gram });
        }
      });

      // AI estimate cho các món không có trong DB
      let aiEstimated = [];
      if (unknownItems.length > 0) {
        try {
          const photoProvider = appSettings?.photo_vision_provider || appSettings?.ai_provider || "gemini";
          const providerMap = { "Theo AI menu": appSettings?.ai_provider || "gemini" };
          const provider = providerMap[photoProvider] || photoProvider;

          const estimatePrompt = `Ước lượng macro dinh dưỡng cho các món ăn sau. Trả lời ĐÚNG JSON, không text trước/sau:
[{"name":"tên","cal":số,"p":số,"c":số,"f":số,"fiber":số}]

Danh sách:
${unknownItems.map(it => `- ${it.name}: ${it.gram}g`).join("\n")}`;

          const res = await authFetch({ provider, system: "Bạn là chuyên gia dinh dưỡng Việt Nam. Trả lời chính xác macro per khẩu phần được hỏi.", messages: [{ role: "user", content: estimatePrompt }], maxTokens: 500, feature: "photo_macro" });
          const text = (res.text || "").replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(text);
          aiEstimated = unknownItems.map((it, j) => {
            const ai = parsed[j] || {};
            return {
              idx: it.idx, name: it.name, gram: it.gram,
              cal: Math.round(ai.cal || 0), p: Math.round(ai.p || 0),
              c: Math.round(ai.c || 0), f: Math.round(ai.f || 0),
              fiber: Math.round(ai.fiber || 0),
              estimated: true,
            };
          });
        } catch (aiErr) {
          console.error("AI estimate fallback error:", aiErr);
          // Fallback thô nếu AI cũng fail
          aiEstimated = unknownItems.map(it => {
            const r = it.gram / 100;
            return {
              idx: it.idx, name: it.name, gram: it.gram,
              cal: Math.round(145 * r), p: Math.round(10 * r),
              c: Math.round(15 * r), f: Math.round(5 * r),
              fiber: Math.round(2 * r),
              estimated: true,
            };
          });
        }
      }

      // Gộp lại theo thứ tự gốc
      const allItems = [...dbItems, ...aiEstimated].sort((a, b) => a.idx - b.idx);
      const items = allItems.map(({ idx, ...rest }) => rest);

      const total = items.reduce((acc, it) => ({
        cal: acc.cal + it.cal, p: acc.p + it.p, c: acc.c + it.c, f: acc.f + it.f, fiber: acc.fiber + (it.fiber || 0),
      }), { cal: 0, p: 0, c: 0, f: 0, fiber: 0 });

      setResults({ total, items });
      setStep(5);
    } catch (e) {
      console.error("CalcMacro error:", e);
      setError("Lỗi tính dinh dưỡng");
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  // Presets for common foods
  function getPresets(name) {
    const n = (name || "").toLowerCase().trim();

    // 1. Exact match UNIT_MAP
    const units = getUnits(n);
    if (units && units.length > 0) {
      return units.map(u => ({ label: `${u.name} (${u.gram}g)`, gram: u.gram }));
    }

    // 2. Partial match — tìm key dài nhất match
    const unitKeys = Object.keys(UNIT_MAP_RAW).sort((a, b) => b.length - a.length);
    for (const key of unitKeys) {
      if (n.includes(key) || key.includes(n)) {
        const u = UNIT_MAP_RAW[key];
        if (u && u.length > 0) return u.map(x => ({ label: `${x.name} (${x.gram}g)`, gram: x.gram }));
      }
    }

    // 3. Fallback theo category
    if (n.includes("cơm")) return [{ label: "Chén nhỏ (100g)", gram: 100 }, { label: "Chén vừa (150g)", gram: 150 }, { label: "Chén đầy (200g)", gram: 200 }];
    if (n.includes("phở") || n.includes("bún") || n.includes("hủ tiếu") || n.includes("cháo")) return [{ label: "Tô nhỏ (300g)", gram: 300 }, { label: "Tô vừa (400g)", gram: 400 }, { label: "Tô lớn (500g)", gram: 500 }];
    if (n.includes("trứng")) return [{ label: "1 quả (50g)", gram: 50 }, { label: "2 quả (100g)", gram: 100 }, { label: "3 quả (150g)", gram: 150 }];
    if (n.includes("canh")) return [{ label: "Bát nhỏ (150g)", gram: 150 }, { label: "Bát vừa (200g)", gram: 200 }, { label: "Bát lớn (300g)", gram: 300 }];
    if (n.includes("xôi")) return [{ label: "Nắm nhỏ (100g)", gram: 100 }, { label: "Nắm vừa (150g)", gram: 150 }];
    if (n.includes("gà") || n.includes("bò") || n.includes("heo") || n.includes("thịt")) return [{ label: "Miếng nhỏ (80g)", gram: 80 }, { label: "Miếng vừa (150g)", gram: 150 }, { label: "Miếng lớn (200g)", gram: 200 }];
    if (n.includes("cá") || n.includes("tôm") || n.includes("mực")) return [{ label: "Khúc nhỏ (80g)", gram: 80 }, { label: "Vừa (150g)", gram: 150 }, { label: "Nhiều (250g)", gram: 250 }];
    if (n.includes("rau")) return [{ label: "Ít (100g)", gram: 100 }, { label: "Vừa (150g)", gram: 150 }, { label: "Nhiều (250g)", gram: 250 }];
    if (n.includes("bánh")) return [{ label: "1 cái (100g)", gram: 100 }, { label: "2 cái (200g)", gram: 200 }];
    if (n.includes("chè")) return [{ label: "Bát nhỏ (150g)", gram: 150 }, { label: "Bát vừa (250g)", gram: 250 }];
    return [{ label: "Ít (80g)", gram: 80 }, { label: "Vừa (150g)", gram: 150 }, { label: "Nhiều (250g)", gram: 250 }];
  }

  // ========== STYLES ==========
  const overlay = { position: "fixed", inset: 0, zIndex: 99998, background: "#F8FAFC", display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 90 };
  const header = { padding: "max(20px, env(safe-area-inset-top, 20px)) 20px 12px", background: "#fff", borderBottom: `1px solid ${C.border}`, flexShrink: 0 };
  const backBtn = { display: "inline-flex", alignItems: "center", gap: 4, color: "#F97316", fontSize: 14, fontWeight: 700, cursor: "pointer", background: "none", border: "none", padding: "6px 0", marginBottom: 8, fontFamily: "inherit" };
  const title = { fontSize: 20, fontWeight: 800, color: C.t1, lineHeight: 1.3 };
  const desc = { fontSize: 14, color: C.t3, marginTop: 6, lineHeight: 1.5 };
  const body = { flex: 1, padding: "0 20px 20px", display: "flex", flexDirection: "column" };
  const pinnedBottom = { position: "fixed", bottom: 0, left: 0, right: 0, padding: "14px 20px", paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "1px solid rgba(0,0,0,0.06)", zIndex: 99999 };
  const mainBtn = { width: "100%", padding: 16, borderRadius: 14, border: "none", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#fff", background: "linear-gradient(135deg, #F97316, #EA580C)", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" };
  const outlineBtn = { ...mainBtn, background: "transparent", color: C.t3, border: `1.5px solid ${C.border}`, marginTop: 8, boxShadow: "none" };

  // Step bar — ① ② ③ ④ tròn 30px
  const stepBar = (active) => (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "8px 0" }}>
      {[1, 2, 3, 4].map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "none" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            background: s < active ? "#EA580C" : s === active ? "#FDBA74" : "#CBD5E1",
            color: s <= active ? "#fff" : "#94A3B8",
            fontSize: 13, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: s === active ? "0 0 10px rgba(52,211,153,0.5)" : "none",
          }}>{s}</div>
          {i < 3 && <div style={{ flex: 1, height: 3, background: s < active ? "#EA580C" : "#E2E8F0", borderRadius: 2 }} />}
        </div>
      ))}
    </div>
  );

  return createPortal(
    <div style={overlay}>
      {/* Step 0: Onboarding */}
      {step === 0 && <>
        <div style={{ padding: "max(20px, env(safe-area-inset-top, 20px)) 20px 12px", background: "#fff", borderBottom: `1px solid ${C.border}`, flexShrink: 0, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top, 16px))", right: 16, width: 40, height: 40, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, color: "#EF4444", zIndex: 2 }}>✕</button>
          <div style={title}>📸 Kiểm tra dinh dưỡng</div>
          <div style={desc}>Chụp ảnh bữa ăn — AI nhận diện — xem calo ngay!</div>
        </div>
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { icon: "📸", bg: "rgba(124,58,237,0.1)", t: "Chụp ảnh bữa ăn", d: "Chụp ngay hoặc chọn ảnh từ thư viện. Chụp rõ, đủ sáng để AI nhận diện chính xác." },
            { icon: "🤖", bg: "rgba(5,150,105,0.1)", t: "AI nhận diện tự động", d: "AI sẽ liệt kê tên món + ước lượng khẩu phần. Bạn kiểm tra và sửa nếu cần." },
            { icon: "📊", bg: "rgba(245,158,11,0.1)", t: "Xem kết quả dinh dưỡng", d: "Calo, Đạm, Tinh bột, Chất béo, Chất xơ — hiển thị ngay. Không lưu vào nhật ký, chỉ kiểm tra nhanh." },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: 16, background: "#fff", borderRadius: 14, border: `1px solid ${C.border}` }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{c.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 4 }}>{c.t}</div>
                <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.45 }}>{c.d}</div>
              </div>
            </div>
          ))}
          <button style={{ ...mainBtn, marginTop: 8 }} onClick={handleOnboarded}>Đã hiểu, bắt đầu!</button>
        </div>
      </>}

      {/* Step 1: Camera */}
      {step === 1 && <>
        <div style={{ padding: "max(20px, env(safe-area-inset-top, 20px)) 20px 12px", background: "#fff", borderBottom: `1px solid ${C.border}`, flexShrink: 0, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top, 16px))", right: 16, width: 40, height: 40, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, color: "#EF4444", zIndex: 2 }}>✕</button>
          <div style={title}>📸 Chụp ảnh bữa ăn</div>
          <div style={desc}>Chụp toàn bộ đĩa/mâm cơm, rõ nét, đủ sáng.</div>
          <div style={{ marginTop: 12 }}>{stepBar(1)}</div>
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          {error && <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13, color: "#991B1B", width: "100%" }}>⚠️ {error}</div>}
          {imageData ? (
            <img src={imageData} alt="preview" style={{ width: 240, height: 240, borderRadius: 20, objectFit: "cover", border: `2px solid ${C.border}` }} />
          ) : (
            <div style={{ width: 240, height: 240, borderRadius: 24, border: `2px dashed ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: C.t3, background: "#fff" }}>
              <span style={{ fontSize: 64 }}>📷</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Chưa có ảnh</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <button onClick={() => cameraRef.current?.click()} style={{ flex: 1, padding: 14, borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", background: "#F97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>📸 Chụp ảnh</button>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: 14, borderRadius: 14, border: `1.5px solid ${C.border}`, fontSize: 15, fontWeight: 700, cursor: "pointer", background: "#fff", color: C.t2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>🖼️ Thư viện</button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCapture} />
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCapture} />
        </div>
      </>}

      {/* Step 2: Loading */}
      {step === 2 && <>
        <div style={header}>
          <div style={title}>Đang nhận diện...</div>
          <div style={{ marginTop: 12 }}>{stepBar(2)}</div>
        </div>
        <div style={{ ...body, alignItems: "center", justifyContent: "center" }}>
          {imageData && <img src={imageData} alt="analyzing" style={{ width: 200, height: 200, borderRadius: 20, objectFit: "cover", border: `1px solid ${C.border}`, marginBottom: 24 }} />}
          <div style={{ width: 40, height: 40, border: "4px solid #E2E8F0", borderTopColor: "#F97316", borderRadius: "50%", animation: "photo-spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: C.t1, marginTop: 16 }}>AI đang phân tích ảnh...</div>
          <div style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>Thường mất 3-5 giây</div>
        </div>
        <style>{`@keyframes photo-spin { to { transform: rotate(360deg) } }`}</style>
      </>}

      {/* Step 3: Confirm dishes */}
      {step === 3 && <>
        <div style={{ padding: "max(20px, env(safe-area-inset-top, 20px)) 20px 12px", background: "#fff", borderBottom: `1px solid ${C.border}`, flexShrink: 0, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top, 16px))", right: 16, width: 40, height: 40, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, color: "#EF4444", zIndex: 2 }}>✕</button>
          <button style={backBtn} onClick={() => { setStep(1); setError(null); }}>← Chụp lại</button>
          <div style={title}>Đây có đúng không?</div>
          <div style={desc}>AI nhận diện được {dishes.length} món. Kiểm tra lại tên, sửa nếu sai hoặc thêm món bị thiếu.</div>
          <div style={{ marginTop: 12 }}>{stepBar(2)}</div>
        </div>
        <div style={{ ...body, gap: 10, marginTop: 12 }}>
          {dishes.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", borderRadius: 14, border: `1px solid ${C.border}` }}>
              <div onClick={() => { const nd = [...dishes]; nd[i].checked = !nd[i].checked; setDishes(nd); }}
                style={{ width: 22, height: 22, borderRadius: 6, background: d.checked ? "#F97316" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                {d.checked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input value={d.name} onChange={e => { const nd = [...dishes]; nd[i].name = e.target.value; setDishes(nd); }}
                  style={{ fontSize: 14, fontWeight: 600, color: C.t1, border: `1px solid ${C.border}`, background: C.surface, borderRadius: 8, width: "100%", padding: "5px 8px", fontFamily: "inherit", outline: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: C.t3 }}>~</span>
                <input inputMode="numeric" pattern="[0-9]*" value={d.gram || ""} onChange={e => { const nd = [...dishes]; nd[i].gram = parseInt(e.target.value.replace(/^0+/, "")) || 0; setDishes(nd); }}
                  onFocus={e => { if (e.target.value === "0") e.target.value = ""; }}
                  style={{ width: 44, fontSize: 13, fontWeight: 600, color: C.t2, border: `1px solid ${C.border}`, background: C.surface, borderRadius: 6, padding: "5px 4px", textAlign: "center", fontFamily: "inherit" }} />
                <span style={{ fontSize: 12, color: C.t3 }}>g</span>
              </div>
              <button onClick={() => { const nd = dishes.filter((_, j) => j !== i); setDishes(nd); }}
                style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid #FECACA`, background: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>✕</button>
            </div>
          ))}
          <button onClick={() => setDishes([...dishes, { name: "", gram: 100, checked: true }])}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 14, border: `2px dashed ${C.border}`, background: "transparent", color: C.t3, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>+ Thêm món bị thiếu</button>
        </div>
        <div style={pinnedBottom}>
          <button style={mainBtn} onClick={handleConfirmDishes} disabled={!dishes.some(d => d.checked && d.name.trim())}>Đúng rồi, tiếp tục →</button>
        </div>
      </>}

      {/* Step 4: Serving size */}
      {step === 4 && <>
        <div style={{ padding: "max(20px, env(safe-area-inset-top, 20px)) 20px 12px", background: "#fff", borderBottom: `1px solid ${C.border}`, flexShrink: 0, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top, 16px))", right: 16, width: 40, height: 40, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, color: "#EF4444", zIndex: 2 }}>✕</button>
          <button style={backBtn} onClick={() => setStep(3)}>← Quay lại</button>
          <div style={title}>Chỉnh khẩu phần</div>
          <div style={desc}>AI đã ước lượng sẵn. Bạn sửa lại nếu thấy chưa đúng.</div>
          <div style={{ marginTop: 12 }}>{stepBar(3)}</div>
        </div>
        <div style={{ ...body, gap: 10, marginTop: 12 }}>
          {servings.map((s, i) => (
            <div key={i} style={{ padding: 14, background: "#fff", borderRadius: 14, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>{s.name}</span>
                <span style={{ fontSize: 11, color: "#D97706", background: "rgba(245,158,11,0.12)", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>AI ~{s.aiGram}g</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input inputMode="numeric" pattern="[0-9]*" value={s.gram || ""} onChange={e => { const ns = [...servings]; ns[i].gram = parseInt(e.target.value.replace(/^0+/, "")) || 0; setServings(ns); }}
                  onFocus={e => { if (e.target.value === "0") e.target.value = ""; }}
                  style={{ width: 56, padding: "10px 4px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.t1, fontSize: 15, fontWeight: 700, textAlign: "center", fontFamily: "inherit" }} />
                <span style={{ color: C.t3, fontSize: 13, flexShrink: 0 }}>g</span>
                <span style={{ color: C.t3, fontSize: 12, flexShrink: 0 }}>hoặc</span>
                <select value={s.presets.some(p => p.gram === s.gram) ? String(s.gram) : ""} onChange={e => { if (e.target.value) { const ns = [...servings]; ns[i].gram = parseInt(e.target.value); setServings(ns); } }}
                  style={{ flex: 1, minWidth: 0, padding: "10px 26px 10px 10px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.t2, fontSize: 13, fontFamily: "inherit", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <option value="">Chọn nhanh</option>
                  {s.presets.map((p, j) => <option key={j} value={p.gram}>{p.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
        <div style={pinnedBottom}>
          <button style={mainBtn} onClick={handleCalcMacro}>Tính macro →</button>
        </div>
      </>}

      {/* Step 5: Results */}
      {step === 5 && results && <>
        <div style={{ padding: "max(20px, env(safe-area-inset-top, 20px)) 20px 12px", background: "#fff", borderBottom: `1px solid ${C.border}`, flexShrink: 0, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top, 16px))", right: 16, width: 40, height: 40, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, color: "#EF4444", zIndex: 2 }}>✕</button>
          <button style={backBtn} onClick={() => setStep(4)}>← Sửa khẩu phần</button>
          <div style={title}>Kết quả</div>
          <div style={{ marginTop: 12 }}>{stepBar(4)}</div>
        </div>
        <div style={{ ...body, gap: 16, marginTop: 12, paddingBottom: 100 }}>
          {/* Total card */}
          <div style={{ padding: "24px 20px", background: "linear-gradient(135deg, #0A1628, #162544)", borderRadius: 18, border: "2px solid #007AFF", textAlign: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{results.total.cal}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 600, marginTop: 4 }}>kcal</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
              {[
                { v: results.total.p, l: "Đạm", color: "#3B82F6" },
                { v: results.total.c, l: "Tinh bột", color: "#EAB308" },
                { v: results.total.f, l: "Chất béo", color: "#EF4444" },
                { v: results.total.fiber, l: "Chất xơ", color: "#22C55E" },
              ].map(m => (
                <div key={m.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: m.color }}>{m.v}g</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#fff", borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, display: "flex", alignItems: "center", gap: 6 }}>
                    {it.name}
                    {it.estimated && <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", background: "#FEF3C7", padding: "1px 6px", borderRadius: 4 }}>⚠ ước lượng</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{it.gram}g</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{it.cal} kcal</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    <span style={{ color: "#3B82F6", fontWeight: 600 }}>Đ:{it.p}</span>
                    {" "}
                    <span style={{ color: "#EAB308", fontWeight: 600 }}>T:{it.c}</span>
                    {" "}
                    <span style={{ color: "#EF4444", fontWeight: 600 }}>B:{it.f}</span>
                    {" "}
                    <span style={{ color: "#22C55E", fontWeight: 600 }}>X:{it.fiber || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={pinnedBottom}>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...mainBtn, flex: 1, fontSize: 14 }} onClick={() => { setImageData(null); setDishes([]); setServings([]); setResults(null); setStep(1); }}>📸 Chụp ảnh khác</button>
            <button style={{ flex: 1, padding: 16, borderRadius: 14, border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", background: "#EF4444", color: "#fff", fontFamily: "inherit" }} onClick={onClose}>Đóng</button>
          </div>
        </div>
      </>}
    </div>,
    document.body
  );
}
