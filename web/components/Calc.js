"use client";
// Ô tính calo — chạy đúng công thức app (lib/app/calcMacro.js chép từ src/calcMacro.js), không gọi AI, không gửi số đo đi đâu.
import { useMemo, useState } from "react";
import { calcMacro } from "@/lib/app/calcMacro.js";

const ACT = [["none", "Ít vận động"], ["occasional", "Tập 1–2 buổi/tuần"], ["regular", "Tập 3–4 buổi/tuần"], ["frequent", "Tập 5–6 buổi/tuần"]];
const vn = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
const d1 = (n) => String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ",");

// Số đo theo bản vẽ 137a (ô Tính thử) và 139i (trang Tính calo)
let FULL = false;
function Field({ label, children }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: FULL ? 8 : 6, fontSize: FULL ? 14 : 13, fontWeight: 700, color: "#475569" }}>{label}{children}</label>;
}
const boxOf = (full) => ({ minWidth: 0, height: full ? 52 : 46, borderRadius: 12, background: "#F1F5F9", border: 0, padding: "0 14px", fontSize: full ? 17 : 16, fontWeight: 800, color: "#0F172A", fontFamily: "inherit", width: "100%", outline: "none", appearance: "none" });

export default function Calc({ full = false, appUrl = "https://app.fipilotai.com" }) {
  FULL = full;
  const box = boxOf(full);
  const [v, setV] = useState({ gender: "female", birthYear: 1995, kg: 68, cm: 158, goalKg: 58, act: "none", pace: "mid" });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const r = useMemo(() => {
    const kg = +v.kg, cm = +v.cm, goalKg = +v.goalKg, by = +v.birthYear;
    if (!(kg >= 30 && kg <= 250 && cm >= 120 && cm <= 220 && goalKg >= 30 && goalKg <= 250 && by >= 1930 && by <= 2015)) return null;
    const goalType = goalKg < kg ? "cut" : goalKg > kg && v.act !== "none" ? "bulk" : "maintain";
    return calcMacro({ cm, kg, birthYear: by, goalKg, goalType, months: 6, gender: v.gender, exerciseType: v.act === "none" ? "none" : "gym", frequency: v.act === "none" ? "regular" : v.act, dietStrategy: "balanced", calorieMode: "standard", cutPace: v.pace });
  }, [v]);
  const num = (k, unit, min, max) => (
    <span style={{ position: "relative", display: "block" }}>
      <input type="number" inputMode="decimal" min={min} max={max} value={v[k]} onChange={set(k)} style={box} aria-label={k} />
      {unit && <i style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontStyle: "normal", fontSize: full ? 14 : 13, fontWeight: 600, color: "#94A3B8", pointerEvents: "none" }}>{unit}</i>}
    </span>
  );
  const kcal = r ? r.calTarget : null;
  const link = `${appUrl}/?ref=${full ? "tinh-calo" : "home-calc"}`;
  return (
    <div className={full ? "calc-full" : "calc"} style={{ display: "grid", gridTemplateColumns: full ? "1fr 1fr" : "1fr", gap: full ? 32 : 20 }}>
      <div className={full ? "card" : ""} style={full ? { padding: 32, display: "flex", flexDirection: "column", gap: 20 } : { display: "flex", flexDirection: "column", gap: 20 }}>
        {full && <b style={{ fontSize: 22 }}>Số đo của bạn</b>}
        <div className="calc-in" style={{ display: "grid", gridTemplateColumns: full ? "1fr 1fr 1fr" : "repeat(4,1fr)", gap: full ? 14 : 10 }}>
          <Field label="Giới tính"><select value={v.gender} onChange={set("gender")} style={{ ...box, backgroundImage: "linear-gradient(45deg,transparent 50%,#94A3B8 50%),linear-gradient(135deg,#94A3B8 50%,transparent 50%)", backgroundPosition: "calc(100% - 20px) 50%,calc(100% - 15px) 50%", backgroundSize: "5px 5px", backgroundRepeat: "no-repeat" }}><option value="female">Nữ</option><option value="male">Nam</option></select></Field>
          {full && <Field label="Năm sinh">{num("birthYear", "", 1930, 2015)}</Field>}
          <Field label="Cân nặng">{num("kg", "kg", 30, 250)}</Field>
          <Field label="Chiều cao">{num("cm", "cm", 120, 220)}</Field>
          <Field label="Cân mong muốn">{num("goalKg", "kg", 30, 250)}</Field>
          {full && <Field label="Vận động"><select value={v.act} onChange={set("act")} style={{ ...box, backgroundImage: "linear-gradient(45deg,transparent 50%,#94A3B8 50%),linear-gradient(135deg,#94A3B8 50%,transparent 50%)", backgroundPosition: "calc(100% - 20px) 50%,calc(100% - 15px) 50%", backgroundSize: "5px 5px", backgroundRepeat: "no-repeat" }}>{ACT.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></Field>}
        </div>
        {full && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>Tốc độ giảm</span>
            <div role="radiogroup" style={{ display: "flex", gap: 8 }}>{[["slow", "Chậm"], ["mid", "Vừa"], ["fast", "Nhanh"]].map(([a, b]) => <button type="button" role="radio" aria-checked={v.pace === a} key={a} onClick={() => setV({ ...v, pace: a })} style={{ flex: 1, height: 48, borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", ...(v.pace === a ? { background: "#0062F0", color: "#fff", border: 0 } : { background: "#F5F8FD", color: "#334155", border: "1px solid #E6ECF5" }) }}>{b}</button>)}</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="calc-res" style={{ borderRadius: full ? 20 : 16, background: "linear-gradient(135deg,#ECFDF5,#EEF4FF)", padding: full ? 28 : 16, display: "flex", alignItems: full ? "stretch" : "center", flexDirection: full ? "column" : "row", gap: full ? 8 : 12 }} aria-live="polite">
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: full ? 8 : 4, minWidth: 0 }}>
            <span style={{ fontSize: 15, color: "#334155" }}>Bạn nên ăn khoảng</span>
            <b className="calc-k" style={{ fontSize: full ? 56 : 36, fontWeight: 900, color: "#047857", lineHeight: full ? 1 : "normal" }}>{kcal ? vn(kcal) : "—"}{full ? <span style={{ fontSize: 20 }}> kcal / ngày</span> : " kcal / ngày"}</b>
            {r?.kgWeek && <span style={{ fontSize: full ? 15 : 14.5, color: "#475569", lineHeight: full ? 1.55 : "normal" }}>Giảm khoảng <b>{d1(r.kgWeek)} kg/tuần</b>{r.etaWeeks ? <> · về {v.goalKg} kg sau khoảng <b>{r.etaWeeks} tuần</b></> : null}</span>}
            {!r && <span style={{ fontSize: 14, color: "#B45309" }}>Kiểm tra lại số đo (cân 30–250 kg, cao 120–220 cm).</span>}
          </span>
          {!full && <a className="btn b1 calc-go" href={link} style={{ height: 48, borderRadius: 14, fontSize: 15, fontWeight: 800 }}>Nhận thực đơn theo số này →</a>}
        </div>
        {full && r && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Năng lượng nghỉ (BMR)", `${vn(r.bmr)} kcal`, "cơ thể tự đốt khi nằm yên"], ["Năng lượng cả ngày (TDEE)", `${vn(r.tdee)} kcal`, "đã tính mức vận động"], ["Thiếu hụt mỗi ngày", `${vn(r.deficit)} kcal`, "để giảm mỡ đều"], ["Chỉ số BMI", d1(r.bmi), r.bmi >= 25 ? "thừa cân" : r.bmi < 18.5 ? "thiếu cân" : "bình thường"]].map(([a, b, c]) => (
                <div key={a} className="card" style={{ padding: 16, borderRadius: 14, display: "flex", flexDirection: "column", gap: 4 }}><span className="lbl">{a}</span><b style={{ fontSize: 22 }}>{b}</b><span style={{ fontSize: 13, color: "#94A3B8" }}>{c}</span></div>
              ))}
            </div>
            <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <b style={{ fontSize: 17 }}>Chia theo chất</b>
              {[["Đạm", r.protein, 4, "#2563EB"], ["Chất béo", r.fat, 9, "#EF4444"], ["Tinh bột", r.carb, 4, "#F59E0B"]].map(([a, g, k, c]) => (
                <div key={a} style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}><b>{a}</b><span>{g} g</span></span><div className="bar"><span style={{ width: `${Math.min(100, Math.round((g * k * 100) / (r.calTarget || 1)))}%`, background: c }} /></div></div>
              ))}
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Theo cách chia “cân bằng” của app</span>
            </div>
            <a className="btn b1 big" href={link}>Nhận thực đơn món Việt theo {vn(kcal)} kcal →</a>
          </>
        )}
      </div>
      <style>{`@media(max-width:720px){.calc-full>*,.calc>*{min-width:0}.calc,.calc>div{gap:16px!important}.calc .calc-res{flex-direction:column!important;align-items:stretch!important}.calc .calc-k{font-size:30px!important}.calc .calc-go{width:100%!important}.calc-full{grid-template-columns:1fr!important;gap:20px!important}.calc-full>.card{padding:20px!important}.calc-in{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );
}
