"use client";
// Ô tính calo — chạy đúng công thức app (lib/app/calcMacro.js chép từ src/calcMacro.js), không gọi AI, không gửi số đo đi đâu.
import { useMemo, useState } from "react";
import { calcMacro } from "@/lib/app/calcMacro.js";

const ACT = [["none", "Ít vận động"], ["occasional", "Tập 1–2 buổi/tuần"], ["regular", "Tập 3–4 buổi/tuần"], ["frequent", "Tập 5–6 buổi/tuần"]];
const vn = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
const d1 = (n) => String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ",");

function Field({ label, children }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, fontWeight: 700, color: "#475569" }}>{label}{children}</label>;
}
const box = { minWidth: 0, height: 52, borderRadius: 12, background: "#F1F5F9", border: "1px solid transparent", padding: "0 14px", fontSize: 17, fontWeight: 800, color: "#0F172A", fontFamily: "inherit", width: "100%" };

export default function Calc({ full = false, appUrl = "https://app.fipilotai.com" }) {
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
      {unit && <i style={{ position: "absolute", right: 14, top: 16, fontStyle: "normal", fontSize: 14, fontWeight: 600, color: "#94A3B8" }}>{unit}</i>}
    </span>
  );
  const kcal = r ? r.calTarget : null;
  const link = `${appUrl}/?ref=${full ? "tinh-calo" : "home-calc"}`;
  return (
    <div className={full ? "calc-full" : "calc"} style={{ display: "grid", gridTemplateColumns: full ? "1fr 1fr" : "1fr", gap: full ? 32 : 18 }}>
      <div className={full ? "card" : ""} style={full ? { padding: 32, display: "flex", flexDirection: "column", gap: 20 } : { display: "flex", flexDirection: "column", gap: 18 }}>
        {full && <b style={{ fontSize: 22 }}>Số đo của bạn</b>}
        <div className="calc-in" style={{ display: "grid", gridTemplateColumns: full ? "1fr 1fr 1fr" : "repeat(4,1fr)", gap: 12 }}>
          <Field label="Giới tính"><select value={v.gender} onChange={set("gender")} style={box}><option value="female">Nữ</option><option value="male">Nam</option></select></Field>
          {full && <Field label="Năm sinh">{num("birthYear", "", 1930, 2015)}</Field>}
          <Field label="Cân nặng">{num("kg", "kg", 30, 250)}</Field>
          <Field label="Chiều cao">{num("cm", "cm", 120, 220)}</Field>
          <Field label="Cân mong muốn">{num("goalKg", "kg", 30, 250)}</Field>
          {full && <Field label="Vận động"><select value={v.act} onChange={set("act")} style={box}>{ACT.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></Field>}
        </div>
        {full && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>Tốc độ giảm</span>
            <div role="radiogroup" style={{ display: "flex", gap: 8 }}>{[["slow", "Chậm"], ["mid", "Vừa"], ["fast", "Nhanh"]].map(([a, b]) => <button type="button" role="radio" aria-checked={v.pace === a} key={a} onClick={() => setV({ ...v, pace: a })} style={{ flex: 1, height: 48, borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", ...(v.pace === a ? { background: "#0062F0", color: "#fff", border: 0 } : { background: "#F5F8FD", color: "#334155", border: "1px solid #E6ECF5" }) }}>{b}</button>)}</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ borderRadius: 20, background: "linear-gradient(135deg,#ECFDF5,#EEF4FF)", padding: full ? 28 : 18, display: "flex", alignItems: full ? "stretch" : "center", flexDirection: full ? "column" : "row", gap: full ? 8 : 16, flexWrap: "wrap" }} aria-live="polite">
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 15, color: "#334155" }}>Bạn nên ăn khoảng</span>
            <b style={{ fontSize: full ? 56 : 36, color: "#047857", letterSpacing: "-1px", lineHeight: 1 }}>{kcal ? vn(kcal) : "—"} <span style={{ fontSize: full ? 20 : 18 }}>kcal / ngày</span></b>
            {r?.kgWeek && <span style={{ fontSize: 15, color: "#475569", lineHeight: 1.55 }}>Giảm khoảng <b>{d1(r.kgWeek)} kg/tuần</b>{r.etaWeeks ? <> · về {v.goalKg} kg sau khoảng <b>{r.etaWeeks} tuần</b></> : null}</span>}
            {!r && <span style={{ fontSize: 14, color: "#B45309" }}>Kiểm tra lại số đo (cân 30–250 kg, cao 120–220 cm).</span>}
          </span>
          {!full && <a className="btn b1 big" href={link}>Nhận thực đơn theo số này →</a>}
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
      <style>{`@media(max-width:720px){.calc-full>*,.calc>*{min-width:0}.calc-full{grid-template-columns:1fr!important;gap:20px!important}.calc-full>.card{padding:20px!important}.calc-in{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );
}
