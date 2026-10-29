// Chụp ảnh bữa ăn (bản vẽ 79–81, 16/10) — thay PhotoMacroChecker 5 bước trên mobile:
//  79: khung ngắm tối (chạm = mở camera) + mẹo chụp + 1 nút chọn ảnh có sẵn. 80: ảnh + vệt quét + 3 bước.
//  81: thẻ tổng cam dưới ảnh; món có ĐƠN VỊ (bát/quả/ml… — lib/portion.js), chạm đơn vị đổi qua gram.
//  1) Chụp / chọn ảnh → 2) AI nhận diện → 3) MỘT màn sửa: tên, gram (−/+ hoặc gõ), bỏ món, thêm món AI bỏ sót (Tìm món),
//     tổng kcal + macro, chọn bữa + ngày → "Ghi vào <bữa>" (thêm vào bữa, tự đánh dấu đã ăn, có Hoàn tác ở Hôm nay).
import { useEffect, useMemo, useRef, useState } from "react";
import { recognizeMeal, resizeImage } from "../lib/photoAI";
import { searchFoods, scaleItem, fmtInt, fmtDec } from "../lib/mobileView";
import { MEAL_NAMES, MEAL_ORDER } from "../lib/mealMath";
import { currentMealId } from "../lib/dayPlan";
import { nowVNParts, addDays, todayVN } from "../lib/dateVN";
import { SubPage, Icon, GRAD_ORANGE } from "./ui";
import { TrayNote } from "./CalcCheckScreen";
import { portionOf, stepPortion, setPortion, toggleUnit, hasUnit } from "../lib/portion";

const sum = (items) => items.reduce((a, i) => ({ cal: a.cal + (Number(i.cal) || 0), p: a.p + (Number(i.p) || 0), c: a.c + (Number(i.c) || 0), f: a.f + (Number(i.f) || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
const sel = { height: 40, padding: "0 10px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#0F172A", WebkitAppearance: "none", appearance: "none", minWidth: 0 };

function macroHint(it) {
  const p = Number(it.p) || 0, c = Number(it.c) || 0, f = Number(it.f) || 0;
  if (p >= c && p >= f) return `Đ ${fmtDec(p)}g`;
  if (c >= f) return `TB ${fmtDec(c)}g`;
  return `B ${fmtDec(f)}g`;
}

// Ô số lượng (16/10): trước đây xoá hết số bị chặn (chỉ nhận > 0) → không xoá được để gõ lại.
// Giờ giữ bản nháp khi đang gõ (được để trống), số > 0 thì áp ngay; rời ô mà trống / 0 → trả về số cũ.
// onStart: lúc bấm vào ô → PhotoScreen giữ bản gốc của món để mỗi lần gõ đều tính từ bản gốc (không cộng dồn sai số làm tròn 1 g → 10 g → 100 g).
function QtyInput({ value, onCommit, onStart, onEnd, testid, style, ...rest }) {
  const [draft, setDraft] = useState(null);
  return (
    <input data-testid={testid} {...rest} type="text" inputMode="decimal" value={draft ?? value}
      onFocus={(e) => { onStart?.(); setDraft(String(value)); e.target.select(); }}
      onChange={(e) => { const v = e.target.value.replace(/[^\d,.]/g, ""); setDraft(v); if (Number(v.replace(",", ".")) > 0) onCommit(v); }}
      onBlur={() => { setDraft(null); onEnd?.(); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      style={style} />
  );
}

export function PhotoScreen({ initialMeal, mealIds, appSettings, photoCtx, foodCache, dateOptions, onSave, onClose, tray = null }) {
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
  // Ô chọn bữa: chỉ các bữa user đang bật (16/10 — trước liệt kê cả 7 bữa, kể cả trước/sau tập với người không tập)
  const mealList = (() => { const base = mealIds && mealIds.length ? mealIds : visible; const l = base.includes(meal) ? base : [...base, meal]; return MEAL_ORDER.filter((id) => l.includes(id)); })();
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
  const baseRef = useRef({}); // món gốc lúc đang sửa ô số lượng (theo vị trí)
  const mapAt = (i, fn) => setItems((arr) => arr.map((it, k) => (k === i ? fn(it) : it)));
  const remove = (i) => setItems((arr) => arr.filter((_, k) => k !== i));
  const add = (it) => { setItems((arr) => [...arr, { ...it, source: it.source || "search" }]); setAdding(false); setQ(""); };
  const [step3, setStep3] = useState(false);
  useEffect(() => { if (stage !== "loading") { setStep3(false); return undefined; } const t = setTimeout(() => setStep3(true), 2500); return () => clearTimeout(t); }, [stage]);
  const save = async () => {
    if (!items.length || busy) return;
    setBusy(true);
    const ok = await onSave(date, meal, items.map(({ qty_display, unit_mode, ...it }) => ({ ...it, gram: Math.round(it.gram), cal: Math.round(it.cal) })));
    setBusy(false);
    if (ok !== false) onClose();
  };

  const remaining = photoCtx && date === todayVN() ? Math.round(photoCtx.target - photoCtx.eatenCal - total.cal) : null;

  const pct = photoCtx?.target ? Math.round((total.cal / photoCtx.target) * 100) : null;
  const pill = { ...sel, flex: 1, height: 42, border: "none", background: "#EEF4FF", fontWeight: 800 };
  const footer = stage === "edit" ? (
    <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.94)", borderTop: "1px solid rgba(30,64,175,0.08)", padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px) 12px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {!tray && <div style={{ display: "flex", gap: 8 }}>
          <select data-testid="photo-meal" aria-label="Bữa" value={meal} onChange={(e) => setMeal(e.target.value)} style={pill}>
            {mealList.map((id) => <option key={id} value={id}>{MEAL_NAMES[id]}</option>)}
          </select>
          <select data-testid="photo-date" aria-label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} style={pill}>
            {(dateOptions || [{ value: todayVN(), label: "Hôm nay" }]).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>}
        <button data-testid="photo-save" disabled={!items.length || busy} onClick={save}
          style={{ height: 52, borderRadius: 14, border: "none", background: items.length ? GRAD_ORANGE : "#E2E8F0", color: items.length ? "#FFFFFF" : "#64748B", fontFamily: "inherit", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {items.length && !busy ? Icon.check(18, 2.8) : null}{busy ? "Đang lưu…" : tray ? `Thêm vào giỏ · ${fmtInt(total.cal)} kcal` : `Ghi vào ${MEAL_NAMES[meal].toLowerCase()}`}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <SubPage title="Chụp ảnh bữa ăn" subtitle={stage === "edit" ? `AI nhận diện ${items.length} món` : "AI nhận diện món và tính calo"} onBack={onClose} footer={footer}>
      <input ref={cam} data-testid="photo-camera" type="file" accept="image/*" capture="environment" onChange={pick} style={{ display: "none" }} />
      <input ref={lib} data-testid="photo-file" type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />

      {stage === "capture" && (
        <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
          {err && <div data-testid="photo-error" style={{ padding: "10px 12px", borderRadius: 12, background: "#FEF2F2", color: "#991B1B", fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{err}</div>}
          <button data-testid="photo-viewfinder" onClick={() => cam.current?.click()} aria-label="Chạm để chụp" style={{ position: "relative", height: 300, borderRadius: 24, border: "none", background: "#0F172A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#FFFFFF", fontFamily: "inherit", padding: 0 }}>
            {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
              <span key={v + h} aria-hidden="true" style={{ position: "absolute", [v]: 22, [h]: 22, width: 34, height: 34, [`border${v === "top" ? "Top" : "Bottom"}`]: "3px solid #FFFFFF", [`border${h === "left" ? "Left" : "Right"}`]: "3px solid #FFFFFF", [`border${v === "top" ? "Top" : "Bottom"}${h === "left" ? "Left" : "Right"}Radius`]: 14 }} />
            ))}
            <span style={{ width: 72, height: 72, borderRadius: 36, background: GRAD_ORANGE, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.camera(32)}</span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Chạm để chụp</span>
          </button>
          <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 900 }}>Mẹo để AI nhận đúng</span>
            {["Chụp cả đĩa / mâm, từ trên xuống", "Đủ sáng, rõ nét, không bị che", "Mỗi món nên thấy rõ phần cơm, thịt, rau"].map((t, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#334155" }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: "rgba(234,88,12,0.12)", color: "#C2410C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</span>{t}
              </span>
            ))}
          </div>
          <button data-testid="photo-pick" onClick={() => lib.current?.click()} style={{ height: 52, borderRadius: 14, border: "none", background: "#FFFFFF", color: "#0F172A", fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ color: "#0062F0", display: "flex" }}>{Icon.plus(18)}</span>Chọn ảnh có sẵn trong máy
          </button>
          <span style={{ alignSelf: "center", fontSize: 12, color: "#64748B" }}>Mỗi lần nhận diện dùng 1 lượt chụp ảnh (tính theo tháng)</span>
        </div>
      )}

      {stage === "loading" && (
        <div data-testid="photo-loading" style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
          <style>{"@keyframes fpmScan{0%{top:8%}50%{top:88%}100%{top:8%}}@keyframes fpmSpin{to{transform:rotate(360deg)}}"}</style>
          <div style={{ position: "relative", height: 300, borderRadius: 20, overflow: "hidden", background: "#0F172A" }}>
            {img && <img src={img} alt="Ảnh bữa ăn" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #FDBA74, transparent)", boxShadow: "0 0 18px #FB923C", animation: "fpmScan 2.4s ease-in-out infinite" }} />
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {[["Đã gửi ảnh", "done"], ["Đang nhận diện món…", step3 ? "done" : "run"], ["Ước lượng gram & calo", step3 ? "run" : "wait"]].map(([t, st]) => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: st === "run" ? 800 : 600, color: st === "wait" ? "#64748B" : "#0F172A" }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", color: "#FFFFFF", ...(st === "done" ? { background: "#059669" } : st === "run" ? { border: "3px solid #FED7AA", borderTopColor: "#EA580C", animation: "fpmSpin .8s linear infinite" } : { border: "2px solid #CBD5E1" }) }}>{st === "done" ? Icon.check(12, 3) : null}</span>{t}
              </span>
            ))}
            <span style={{ fontSize: 12, color: "#64748B" }}>Thường mất 3–5 giây</span>
          </div>
        </div>
      )}

      {stage === "edit" && (
        <div style={{ padding: "12px 12px 16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          {tray && <TrayNote tray={tray} style={{ margin: 0 }} />}
          <div style={{ position: "relative" }}>
            {img && <img src={img} alt="Ảnh bữa ăn" style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 20, display: "block" }} />}
            <button onClick={() => cam.current?.click()} style={{ position: "absolute", right: 10, bottom: 10, height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(15,23,42,0.7)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>{Icon.camera(15)} Chụp lại</button>
          </div>
          <div data-testid="photo-total" data-cal={Math.round(total.cal)} style={{ borderRadius: 20, padding: 14, background: GRAD_ORANGE, color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span><span style={{ fontSize: 30, fontWeight: 900 }}>{fmtInt(total.cal)}</span><span style={{ fontSize: 13, fontWeight: 700 }}> kcal</span></span>
              {pct != null && <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.92 }}>{pct}% mục tiêu ngày</span>}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {[["Đạm", total.p], ["Tinh bột", total.c], ["Béo", total.f]].map(([t, v]) => (
                <span key={t} style={{ flex: 1, borderRadius: 12, background: "rgba(255,255,255,0.16)", padding: "6px 8px", display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 10, opacity: 0.9 }}>{t}</span><span style={{ fontSize: 15, fontWeight: 900 }}>{fmtInt(v)}<span style={{ fontSize: 10, opacity: 0.85 }}> g</span></span>
                </span>
              ))}
            </div>
            {remaining != null && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>{remaining < 0 ? `Ăn xong vượt mục tiêu hôm nay ${fmtInt(-remaining)} kcal` : `Ăn xong còn ${fmtInt(remaining)} kcal cho hôm nay`}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "4px 4px 0 4px" }}>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Đúng món chưa?</span>
            <span style={{ fontSize: 12, color: "#64748B" }}>Sửa tên hoặc số lượng nếu sai</span>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: 20, padding: "0 14px" }}>
            {items.map((it, i) => {
              const po = portionOf(it);
              const stepBtn = { width: 32, height: 32, borderRadius: 10, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 18, fontWeight: 800, padding: 0, flexShrink: 0, fontFamily: "inherit" };
              return (
                <div key={i} data-testid="photo-item" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 66, borderBottom: "1px solid #EEF2FA" }}>
                  <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 2 }}>
                    <input aria-label="Tên món" value={it.display || it.food} onChange={(e) => update(i, { display: e.target.value, food: e.target.value })}
                      style={{ border: "none", padding: 0, fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#0F172A", background: "transparent", minWidth: 0 }} />
                    <span style={{ fontSize: 12, color: "#64748B" }}>{fmtInt(it.cal)} kcal · {macroHint(it)}</span>
                  </span>
                  <button aria-label="Giảm" onClick={() => mapAt(i, (x) => stepPortion(x, -1))} style={stepBtn}>−</button>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 62 }}>
                    <span style={{ height: 32, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", gap: 2, padding: "0 6px" }}>
                      <QtyInput testid={`photo-gram-${i}`} aria-label={po.mode === "unit" ? `Số ${po.unit}` : "Gram"} value={po.label} onStart={() => { baseRef.current[i] = it; }} onEnd={() => { delete baseRef.current[i]; }} onCommit={(v) => mapAt(i, (x) => setPortion(baseRef.current[i] || x, v))}
                        style={{ width: po.mode === "unit" ? 30 : 38, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#0F172A", padding: 0 }} />
                      <button data-testid={`photo-unit-${i}`} disabled={!hasUnit(it)} onClick={() => mapAt(i, toggleUnit)} aria-label="Đổi đơn vị" style={{ border: "none", background: "transparent", padding: 0, fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "#0062F0" }}>{po.unit}{hasUnit(it) ? " ▾" : ""}</button>
                    </span>
                    {po.approxG != null && <span style={{ fontSize: 11, color: "#64748B" }}>≈ {fmtInt(po.approxG)} g</span>}
                  </span>
                  <button aria-label="Tăng" onClick={() => mapAt(i, (x) => stepPortion(x, 1))} style={stepBtn}>+</button>
                  <button data-testid={`photo-remove-${i}`} aria-label="Bỏ món" onClick={() => remove(i)} style={{ width: 24, height: 32, border: "none", background: "transparent", color: "#64748B", fontSize: 18, padding: 0 }}>×</button>
                </div>
              );
            })}
            {adding ? (
              <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                <input data-testid="photo-add-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món, VD: trứng luộc" style={{ height: 42, padding: "0 12px", borderRadius: 12, border: "none", background: "#F1F5F9", fontFamily: "inherit", fontSize: 16 }} />
                {results.map((r) => (
                  <button key={r.food} data-testid="photo-add-result" onClick={() => add(r)} style={{ display: "flex", justifyContent: "space-between", gap: 8, minHeight: 40, padding: "0 4px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, color: "#0F172A", textAlign: "left" }}>
                    <span>{r.display || r.food} <span style={{ color: "#64748B" }}>· {r.qty_display || `${r.gram} g`}</span></span><span style={{ color: "#64748B" }}>{fmtInt(r.cal)} kcal</span>
                  </button>
                ))}
                <button onClick={() => { setAdding(false); setQ(""); }} style={{ height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#64748B" }}>Huỷ</button>
              </div>
            ) : (
              <button data-testid="photo-add" onClick={() => setAdding(true)} style={{ width: "100%", height: 48, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#0062F0", textAlign: "left", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>{Icon.plus(16)}Thêm món AI bỏ sót</button>
            )}
          </div>
        </div>
      )}
    </SubPage>
  );
}
