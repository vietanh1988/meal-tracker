// Chụp ảnh bữa ăn (bản vẽ ChupAnh) — thay PhotoMacroChecker 5 bước trên mobile:
//  1) Chụp / chọn ảnh → 2) AI nhận diện → 3) MỘT màn sửa: tên, gram (−/+ hoặc gõ), bỏ món, thêm món AI bỏ sót (Tìm món),
//     tổng kcal + macro, chọn bữa + ngày → "Lưu vào <bữa>" (thêm vào bữa, tự đánh dấu đã ăn, có Hoàn tác ở Hôm nay).
import { useMemo, useRef, useState } from "react";
import { recognizeMeal, resizeImage } from "../lib/photoAI";
import { searchFoods, scaleItem, fmtInt, fmtDec } from "../lib/mobileView";
import { MEAL_NAMES, MEAL_ORDER } from "../lib/mealMath";
import { currentMealId } from "../lib/dayPlan";
import { nowVNParts, addDays, todayVN } from "../lib/dateVN";
import { SubPage, Icon, GRAD_ORANGE } from "./ui";

const sum = (items) => items.reduce((a, i) => ({ cal: a.cal + (Number(i.cal) || 0), p: a.p + (Number(i.p) || 0), c: a.c + (Number(i.c) || 0), f: a.f + (Number(i.f) || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
const step = (g) => (g >= 200 ? 20 : g >= 60 ? 10 : 5);
const sel = { height: 40, padding: "0 10px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#0F172A", WebkitAppearance: "none", appearance: "none", minWidth: 0 };

function macroHint(it) {
  const p = Number(it.p) || 0, c = Number(it.c) || 0, f = Number(it.f) || 0;
  if (p >= c && p >= f) return `Đ ${fmtDec(p)}g`;
  if (c >= f) return `TB ${fmtDec(c)}g`;
  return `B ${fmtDec(f)}g`;
}

export function PhotoScreen({ initialMeal, appSettings, photoCtx, foodCache, dateOptions, onSave, onClose }) {
  const [img, setImg] = useState(null);
  const [stage, setStage] = useState("capture"); // capture | loading | edit
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const cam = useRef(null), lib = useRef(null);
  const now = nowVNParts();
  const [date, setDate] = useState(now.hour < 4 ? addDays(todayVN(), -1) : todayVN()); // ăn khuya trước 4h tính vào hôm qua
  const visible = photoCtx?.visibleMealIds?.length ? photoCtx.visibleMealIds : MEAL_ORDER;
  const [meal, setMeal] = useState(() => initialMeal || currentMealId(now.minutes, visible, photoCtx?.mealTimes) || "trua");
  const total = sum(items);
  const results = useMemo(() => (q.trim().length >= 1 ? searchFoods(q, foodCache, 8) : []), [q, foodCache]);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr("");
    try {
      const data = await resizeImage(f);
      setImg(data); setStage("loading");
      const found = await recognizeMeal(data, appSettings);
      setItems(found); setStage("edit");
    } catch (x) {
      setErr(x?.message || "Lỗi nhận diện ảnh"); setStage("capture");
    }
  };
  const update = (i, patch) => setItems((arr) => arr.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const setGram = (i, g) => setItems((arr) => arr.map((it, k) => (k === i ? scaleItem(it, Math.max(1, Math.min(3000, g))) : it)));
  const remove = (i) => setItems((arr) => arr.filter((_, k) => k !== i));
  const add = (it) => { setItems((arr) => [...arr, { ...it, source: it.source || "search" }]); setAdding(false); setQ(""); };
  const save = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    const ok = await onSave(date, meal, items.map(({ qty_display, ...it }) => ({ ...it, gram: Math.round(it.gram), cal: Math.round(it.cal) })));
    setBusy(false);
    if (ok !== false) onClose();
  };

  const remaining = photoCtx && date === todayVN() ? Math.round(photoCtx.target - photoCtx.eatenCal - total.cal) : null;

  const footer = stage === "edit" ? (
    <div style={{ flexShrink: 0, background: "#FFFFFF", borderTop: "1px solid #E2E8F0", padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px) 12px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span data-testid="photo-total" data-cal={Math.round(total.cal)} style={{ fontSize: 22, fontWeight: 900 }}>{fmtInt(total.cal)} kcal</span>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#475569" }}>Đạm {fmtInt(total.p)} · Tinh bột {fmtInt(total.c)} · Béo {fmtInt(total.f)} g</span>
        </div>
        {remaining != null && <span style={{ fontSize: 12, fontWeight: 600, color: remaining < 0 ? "#B45309" : "#64748B" }}>{remaining < 0 ? `Ăn xong vượt mục tiêu hôm nay ${fmtInt(-remaining)} kcal` : `Ăn xong còn ${fmtInt(remaining)} kcal cho hôm nay`}</span>}
        <div style={{ display: "flex", gap: 8 }}>
          <select data-testid="photo-meal" aria-label="Bữa" value={meal} onChange={(e) => setMeal(e.target.value)} style={{ ...sel, flex: 1 }}>
            {MEAL_ORDER.map((id) => <option key={id} value={id}>{MEAL_NAMES[id]}</option>)}
          </select>
          <select data-testid="photo-date" aria-label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...sel, flex: 1 }}>
            {(dateOptions || [{ value: todayVN(), label: "Hôm nay" }]).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button data-testid="photo-save" disabled={!items.length || busy} onClick={save}
          style={{ height: 50, borderRadius: 14, border: "none", background: items.length ? GRAD_ORANGE : "#CBD5E1", color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900, boxShadow: items.length ? "0 4px 12px rgba(234,88,12,0.3)" : "none" }}>
          {busy ? "Đang lưu…" : `Lưu vào ${MEAL_NAMES[meal].toLowerCase()}`}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <SubPage title="Chụp ảnh bữa ăn" subtitle={stage === "edit" ? `AI nhận diện ${items.length} món` : "AI nhận diện món và tính calo"} onBack={onClose} footer={footer}>
      <input ref={cam} data-testid="photo-camera" type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: "none" }} />
      <input ref={lib} data-testid="photo-file" type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />

      {stage === "capture" && (
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {err && <div data-testid="photo-error" style={{ alignSelf: "stretch", padding: "10px 12px", borderRadius: 12, background: "#FEF2F2", color: "#991B1B", fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{err}</div>}
          <button onClick={() => cam.current?.click()} style={{ width: "100%", aspectRatio: "4 / 3", maxHeight: 320, borderRadius: 20, border: "2px dashed #CBD5E1", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#64748B", fontFamily: "inherit" }}>
            <span style={{ width: 64, height: 64, borderRadius: 32, background: GRAD_ORANGE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.camera(30)}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Chụp cả đĩa / mâm, rõ nét, đủ sáng</span>
          </button>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button onClick={() => cam.current?.click()} style={{ flex: 1, height: 50, borderRadius: 14, border: "none", background: GRAD_ORANGE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>Chụp ảnh</button>
            <button onClick={() => lib.current?.click()} style={{ flex: 1, height: 50, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Chọn từ thư viện</button>
          </div>
        </div>
      )}

      {stage === "loading" && (
        <div data-testid="photo-loading" style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          {img && <img src={img} alt="Ảnh bữa ăn" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 18 }} />}
          <span style={{ width: 36, height: 36, border: "4px solid #E2E8F0", borderTopColor: "#F97316", borderRadius: "50%", animation: "fpmSpin .8s linear infinite" }} />
          <style>{"@keyframes fpmSpin{to{transform:rotate(360deg)}}"}</style>
          <span style={{ fontSize: 15, fontWeight: 800 }}>AI đang nhận diện món…</span>
          <span style={{ fontSize: 13, color: "#64748B" }}>Thường mất 3–5 giây</span>
        </div>
      )}

      {stage === "edit" && (
        <div style={{ paddingBottom: 16 }}>
          <div style={{ position: "relative", margin: "12px 12px 0 12px" }}>
            {img && <img src={img} alt="Ảnh bữa ăn" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 18, display: "block" }} />}
            <button onClick={() => cam.current?.click()} style={{ position: "absolute", right: 10, bottom: 10, height: 36, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>{Icon.camera(16)} Chụp lại</button>
          </div>
          <div style={{ padding: "14px 16px 6px 16px", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Đúng món chưa?</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>Sửa tên hoặc gram nếu sai</span>
          </div>
          <div style={{ margin: "0 12px", background: "#FFFFFF", border: "none", borderRadius: 16, padding: "0 12px" }}>
            {items.map((it, i) => (
              <div key={i} data-testid="photo-item" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 64, borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <input aria-label="Tên món" value={it.display || it.food} onChange={(e) => update(i, { display: e.target.value, food: e.target.value })}
                    style={{ border: "none", padding: 0, fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#0F172A", background: "transparent", minWidth: 0 }} />
                  <span style={{ fontSize: 12, color: "#64748B" }}>{fmtInt(it.cal)} kcal · {macroHint(it)}</span>
                </span>
                <button aria-label="Giảm" onClick={() => setGram(i, it.gram - step(it.gram))} style={{ width: 32, height: 32, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#007AFF", fontSize: 18, fontWeight: 800, padding: 0 }}>−</button>
                <input data-testid={`photo-gram-${i}`} aria-label="Gram" inputMode="numeric" value={Math.round(it.gram)} onChange={(e) => { const g = Number(e.target.value.replace(/\D/g, "")); if (g) setGram(i, g); }}
                  style={{ width: 52, height: 32, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#F1F5F9", textAlign: "center", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#0F172A" }} />
                <button aria-label="Tăng" onClick={() => setGram(i, it.gram + step(it.gram))} style={{ width: 32, height: 32, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#007AFF", fontSize: 18, fontWeight: 800, padding: 0 }}>+</button>
                <button data-testid={`photo-remove-${i}`} aria-label="Bỏ món" onClick={() => remove(i)} style={{ width: 28, height: 32, border: "none", background: "transparent", color: "#94A3B8", fontSize: 18, padding: 0 }}>×</button>
              </div>
            ))}
            {adding ? (
              <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                <input data-testid="photo-add-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món, VD: trứng luộc" style={{ height: 42, padding: "0 12px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#F1F5F9", fontFamily: "inherit", fontSize: 16 }} />
                {results.map((r) => (
                  <button key={r.food} data-testid="photo-add-result" onClick={() => add(r)} style={{ display: "flex", justifyContent: "space-between", gap: 8, minHeight: 40, padding: "0 4px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, color: "#0F172A", textAlign: "left" }}>
                    <span>{r.display || r.food} <span style={{ color: "#94A3B8" }}>· {r.qty_display || `${r.gram} g`}</span></span><span style={{ color: "#64748B" }}>{fmtInt(r.cal)} kcal</span>
                  </button>
                ))}
                <button onClick={() => { setAdding(false); setQ(""); }} style={{ height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#64748B" }}>Huỷ</button>
              </div>
            ) : (
              <button data-testid="photo-add" onClick={() => setAdding(true)} style={{ width: "100%", height: 48, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#007AFF", textAlign: "left" }}>+ Thêm món AI bỏ sót</button>
            )}
          </div>
        </div>
      )}
    </SubPage>
  );
}
