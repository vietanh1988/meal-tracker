// Thẻ "Kiểm tra tuần" ở Hôm nay (bản vẽ 127a–d, 17/10) + thẻ mẹo đi bộ cho khách không tập (bản vẽ 128).
// Dữ liệu tính ở src/lib/weeklyCheck.js; thẻ chỉ hiển thị + gọi onAct(kind) khi bấm.
import { Icon } from "./ui";
import { AppIcon } from "./icons";
import { fmtVN } from "../lib/dateVN";
import { fmtDec, fmtInt } from "../lib/mobileView";

const TONE = {
  warn: { bg: "#FFF7ED", fg: "#C2410C", line: "#FDBA74", ic: "#EA580C" },
  good: { bg: "#ECFDF5", fg: "#047857", line: "#A7F3D0", ic: "#16A34A" },
  info: { bg: "#EEF4FF", fg: "#0062F0", line: "#BFD4FF", ic: "#007AFF" },
};
const GREEN = "#047857", ORANGE = "#C2410C";
const kgW = (v) => `${fmtDec(Math.round(v * 10) / 10)} kg/tuần`;

const Stat = ({ k, v, c = "#0F172A" }) => (
  <span style={{ flex: 1, minWidth: 0, background: "#F8FAFC", borderRadius: 12, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ fontSize: 11.5, color: "#64748B" }}>{k}</span>
    <span style={{ fontSize: 14, fontWeight: 900, color: c, lineHeight: 1.25 }}>{v}</span>
  </span>
);
const Btn = ({ children, primary, soft, onClick, testid }) => (
  <button data-testid={testid} onClick={onClick} style={{ flex: primary ? 1.4 : 1, height: 44, borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 900,
    background: primary ? "linear-gradient(135deg,#1A7CFF,#0052F0)" : soft || "#F1F5F9", color: primary ? "#FFFFFF" : soft ? GREEN : "#334155" }}>{children}</button>
);

export function WeeklyCheckCard({ check, target, onAct }) {
  if (!check) return null;
  const c = check;
  const meals = { k: "Ghi bữa", v: `${c.mealDays}/7 ngày`, c: c.mealDays >= 4 ? GREEN : ORANGE };
  const k1 = (v) => Number(v).toFixed(1).replace(".", ",");
  const kgLine = c.kgFrom != null ? `${k1(c.kgFrom)} → ${k1(c.kgTo)} kg` : "";
  const goalStat = { k: "Mục tiêu", v: `−${kgW(c.target || 0)}` };
  const kgStat = { k: "Cân", v: kgLine };
  let tone, title, body, stats, btns;
  if (c.kind === "nodata") {
    tone = "info"; title = "Chưa đủ dữ liệu để chỉnh";
    body = <>Tuần này mới ghi bữa <b>{c.mealDays}/7 ngày</b> và cân <b>{c.weighCount} lần</b> trong 2 tuần. Ghi ít nhất 4 ngày và cân mỗi tuần 1 lần thì app mới biết nên ăn thêm hay bớt — chưa vội cắt calo nhé.</>;
    stats = [{ k: "Cân (2 tuần)", v: `${c.weighCount} lần`, c: c.weighCount >= 2 ? GREEN : ORANGE }, meals];
    btns = <><Btn testid="checkin-later" onClick={() => onAct("dismiss")}>Để sau</Btn><Btn testid="checkin-weigh" primary onClick={() => onAct("weigh")}>Cân hôm nay</Btn></>;
  } else if (c.kind === "waist") {
    tone = "good"; title = `Cân đứng nhưng eo nhỏ đi ${fmtDec(Math.abs(c.waistTo - c.waistFrom))} cm 👍`;
    body = <>Cân chưa giảm nhưng vòng eo nhỏ lại — bạn đang mất mỡ và giữ cơ (cơ thể giữ nước thêm vài ngày là bình thường). <b>Đừng cắt thêm</b>, cứ giữ cách ăn này thêm 1 tuần.</>;
    stats = [kgStat, { k: "Eo", v: `${fmtDec(c.waistFrom)} → ${fmtDec(c.waistTo)} cm`, c: GREEN }, meals];
    btns = <Btn testid="checkin-ok" soft="#ECFDF5" onClick={() => onAct("dismiss")}>Đã hiểu</Btn>;
  } else if (c.kind === "slow") {
    tone = "warn"; title = "Tuần này cân gần như đứng yên";
    const lossTxt = c.loss > 0 ? `chỉ giảm ${kgW(c.loss)}` : "chưa giảm";
    body = c.delta
      ? <>Bạn chọn giảm <b>{kgW(c.target)}</b> nhưng 2 tuần qua {lossTxt} dù ghi bữa đều. Thử bớt <b>100 kcal/ngày</b> (khoảng nửa chén cơm) — mục tiêu mới {fmtInt(target - 100)} kcal.</>
      : <>2 tuần qua {lossTxt}, nhưng mức ăn đã ở mức thấp nhất app cho phép — <b>đừng cắt thêm</b>. Đi bộ thêm 30 phút mỗi ngày và ghi bữa thật đủ (cả đồ uống, nước chấm) để giảm tiếp.</>;
    stats = [kgStat, meals, goalStat];
    btns = c.delta
      ? <><Btn testid="checkin-keep" onClick={() => onAct("keep")}>Giữ như cũ</Btn><Btn testid="checkin-apply" primary onClick={() => onAct("apply")}>Bớt 100 kcal</Btn></>
      : <Btn testid="checkin-ok" onClick={() => onAct("dismiss")}>Đã hiểu</Btn>;
  } else {
    tone = "warn"; title = "Giảm hơi nhanh";
    body = <>2 tuần qua giảm <b>{kgW(c.loss)}</b> — nhanh hơn mục tiêu {kgW(c.target)}. Giảm quá nhanh dễ mất cơ, mệt và bị đói rồi ăn bù.{c.delta ? <> Thêm <b>100 kcal/ngày</b> (1 hộp sữa chua + 1 quả chuối nhỏ).</> : " Ăn đủ bữa, đừng bỏ bữa."}</>;
    stats = [kgStat, meals, goalStat];
    btns = c.delta
      ? <><Btn testid="checkin-keep" onClick={() => onAct("keep")}>Giữ như cũ</Btn><Btn testid="checkin-apply" primary onClick={() => onAct("apply")}>Thêm 100 kcal</Btn></>
      : <Btn testid="checkin-ok" onClick={() => onAct("dismiss")}>Đã hiểu</Btn>;
  }
  const t = TONE[tone];
  return (
    <section data-testid="checkin-card" data-kind={c.kind} aria-label="Kiểm tra tuần" style={{ margin: "14px 12px 0 12px", background: "#FFFFFF", borderRadius: 20, border: `1.5px solid ${t.line}`, padding: 14, display: "flex", flexDirection: "column", gap: 12, color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <AppIcon name="progress" color={t.ic} size={40} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: t.fg, letterSpacing: "0.04em" }}>KIỂM TRA TUẦN · {fmtVN(c.range.from)} – {fmtVN(c.range.to)}</span>
          <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.3 }}>{title}</span>
        </span>
        <button data-testid="checkin-close" aria-label="Đóng, để tuần sau" onClick={() => onAct("dismiss")} style={{ width: 32, height: 32, margin: "-4px -4px 0 0", border: "none", background: "transparent", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.close(16)}</button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>{stats.map((x) => <Stat key={x.k} {...x} />)}</div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#334155" }}>{body}</p>
      <div style={{ display: "flex", gap: 8 }}>{btns}</div>
    </section>
  );
}

// Bản vẽ 128: khách không tập — mẹo đi bộ, hiện 3 lần mở app đầu rồi tự ẩn (× ẩn luôn)
export function WalkTipCard({ onClose }) {
  return (
    <section data-testid="walk-tip" aria-label="Mẹo cho người không tập" style={{ margin: "14px 12px 0 12px", background: "#FFFFFF", borderRadius: 20, padding: "14px 10px 14px 16px", display: "flex", gap: 8, alignItems: "flex-start", color: "#0F172A" }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: "#0062F0" }}>Mẹo cho người không tập</span>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "#334155" }}>Đi bộ 30 phút mỗi ngày giúp giảm nhanh hơn và đỡ đói. App <b>không cộng thêm calo</b> khi đi bộ — để bạn không ăn bù.</span>
      </span>
      <button data-testid="walk-tip-close" aria-label="Ẩn mẹo" onClick={onClose} style={{ width: 32, height: 32, border: "none", background: "transparent", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.close(16)}</button>
    </section>
  );
}
