// Tổng kết tháng cho khách (bản vẽ 136a–d, 18/10) — hàm thuần, có test (tests/monthRecap.test.mjs).
// Số "đã ăn" theo quy ước app: meals ∩ eaten_meals (qua rangeSummary / dayStatus). Ngày giờ: dateVN.
import { monthRange, dateList, addDays, diffDays } from "./dateVN.js";
import { rangeSummary } from "./mobileView.js";

export const monthKey = (d) => String(d).slice(0, 7);
export const prevMonth = (m) => { const [y, mo] = m.split("-").map(Number); const t = y * 12 + mo - 2; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`; };
export const monthLabel = (m) => `Tháng ${Number(m.slice(5, 7))}`;
const r1 = (v) => Math.round(v * 10) / 10;

// Ngày trong tháng tính tới hôm nay (tháng đang chạy) hoặc cả tháng
export function monthDates(m, today) {
  const r = monthRange(`${m}-01`);
  const end = today && today < r.end ? today : r.end;
  return { start: r.start, end: r.end, dates: end < r.start ? [] : dateList(r.start, end), full: dateList(r.start, r.end).length };
}

export function longestStreak(days) {
  let best = 0, cur = 0;
  for (const d of days) { if (d.eatenCount > 0) { cur++; if (cur > best) best = cur; } else cur = 0; }
  return best;
}

// Cân đầu / cuối tháng: lần cân gần nhất trước ngày 1 (không có thì lần đầu trong tháng), lần cuối trong tháng
export function monthWeights(weightLog, m, today) {
  const { start, end } = monthDates(m, today);
  const log = (weightLog || []).filter((w) => w && w.logged_date && Number(w.kg) > 0).slice().sort((a, b) => String(a.logged_date).localeCompare(String(b.logged_date)));
  const inMonth = log.filter((w) => w.logged_date >= start && w.logged_date <= end && (!today || w.logged_date <= today));
  const before = log.filter((w) => w.logged_date < start);
  const startW = before.length ? before[before.length - 1] : inMonth[0] || null;
  const endW = inMonth.length ? inMonth[inMonth.length - 1] : null;
  const pts = [...(before.length ? [before[before.length - 1]] : []), ...inMonth];
  const delta = startW && endW && startW !== endW ? r1(Number(endW.kg) - Number(startW.kg)) : null;
  return { startKg: startW ? Number(startW.kg) : null, endKg: endW ? Number(endW.kg) : null, delta, count: inMonth.length, pts, firstKg: log[0] ? Number(log[0].kg) : null };
}

const dir = (goalType) => (goalType === "bulk" ? "gain" : goalType === "maintain" ? "keep" : "loss");

function sayLine({ delta, startKg, weeks, mode }) {
  if (delta == null) return { head: "Chưa đủ số cân", text: "Cân thêm ít nhất 1 lần nữa trong tháng để app tính được bạn thay đổi bao nhiêu." };
  const rate = startKg ? (Math.abs(delta) / Math.max(weeks, 1)) / startKg * 100 : 0; // % cân / tuần
  const perW = r1(Math.abs(delta) / Math.max(weeks, 1)).toLocaleString("vi-VN");
  if (mode === "loss") {
    if (delta >= 0.3) return { head: "Tháng này cân chưa xuống.", text: "Đừng nản — thường do ăn dư vài bữa hoặc ít ghi bữa. Tháng sau ghi đủ bữa, app sẽ chỉnh calo cho bạn." };
    if (delta > -0.3) return { head: "Cân đang đứng.", text: "Giữ được là tốt, nhưng để giảm tiếp bạn cần ghi đủ bữa và ăn đúng thực đơn hơn một chút." };
    if (rate > 1) return { head: "Giảm hơi nhanh.", text: `Bạn giảm khoảng ${perW} kg/tuần — nhanh hơn mức an toàn, dễ mất cơ và tăng lại. Đừng ăn thấp hơn thực đơn app gợi ý.` };
    if (rate >= 0.25) return { head: "Giảm đều và an toàn.", text: `Bạn giảm khoảng ${perW} kg mỗi tuần — đúng tốc độ an toàn (0,25–0,75% cân nặng/tuần), ít bị tăng lại.` };
    return { head: "Đang giảm, chậm mà chắc.", text: `Khoảng ${perW} kg/tuần. Ghi đủ bữa hơn nữa là sẽ nhanh hơn.` };
  }
  if (mode === "gain") {
    if (delta <= 0) return { head: "Tháng này cân chưa lên.", text: "Để tăng cơ cần ăn đủ calo mỗi ngày — thử thêm 1 bữa phụ giàu đạm." };
    if (rate > 0.5) return { head: "Tăng hơi nhanh.", text: `Khoảng ${perW} kg/tuần — dễ tăng mỡ. Giữ calo đúng mục tiêu là đủ.` };
    return { head: "Tăng đều.", text: `Khoảng ${perW} kg/tuần — đúng nhịp tăng cơ sạch.` };
  }
  return Math.abs(delta) <= 1 ? { head: "Giữ cân tốt.", text: "Cân của bạn dao động trong khoảng an toàn cả tháng." } : { head: "Cân thay đổi khá nhiều.", text: "Thử ghi bữa đều hơn để giữ cân ổn định." };
}

function tipLine({ loggedDays, daysPassed, weighCount, avgCal, target, mode }) {
  if (daysPassed && loggedDays / daysPassed < 0.6) return { icon: "✅", t: "Ghi bữa đều hơn", s: `Tháng này bạn ghi ${loggedDays}/${daysPassed} ngày. Chỉ cần bấm "Đã ăn" sau mỗi bữa — thực đơn có sẵn rồi.` };
  if (weighCount < 3) return { icon: "⚖️", t: "Cân mỗi tuần 1 lần", s: "Cân sáng thứ 2, trước khi ăn — app mới tính đúng tốc độ và chỉnh calo cho bạn." };
  if (mode === "loss" && target && avgCal > target * 1.08) return { icon: "🍽️", t: "Bớt 1 món phụ", s: `Trung bình bạn ăn ${avgCal.toLocaleString("vi-VN")} kcal/ngày, hơi cao hơn mục tiêu ${target.toLocaleString("vi-VN")}.` };
  if (mode === "gain" && target && avgCal < target * 0.92) return { icon: "🥛", t: "Thêm 1 bữa phụ", s: `Trung bình bạn ăn ${avgCal.toLocaleString("vi-VN")} kcal/ngày, thấp hơn mục tiêu ${target.toLocaleString("vi-VN")}.` };
  return { icon: "💪", t: "Giữ nhịp như tháng này", s: "Bạn đang làm rất tốt — cứ ăn theo thực đơn và cân mỗi tuần." };
}

// rows / prevRows: daily_logs của tháng m và tháng trước; targetOf(date) → kcal mục tiêu
export function monthRecap({ m, today, rows = [], prevRows = [], weightLog = [], goalKg, goalType, targetOf, target }) {
  const mode = dir(goalType);
  const md = monthDates(m, today);
  const sum = rangeSummary(rows, md.dates, targetOf);
  const w = monthWeights(weightLog, m, today);
  const pm = prevMonth(m);
  const pd = monthDates(pm, today);
  const psum = rangeSummary(prevRows, pd.dates, targetOf);
  const pw = monthWeights(weightLog, pm, today);
  const weeks = md.dates.length / 7;
  const kgLeft = w.endKg != null && goalKg ? r1(Math.abs(w.endKg - goalKg)) : null;
  const pct = w.firstKg != null && w.endKg != null && goalKg && w.firstKg !== goalKg ? Math.max(0, Math.min(100, Math.round(((w.firstKg - w.endKg) / (w.firstKg - goalKg)) * 100))) : null;
  const ongoing = today && today < md.end;
  const thin = sum.loggedCount < 7 || w.delta == null;
  const say = sayLine({ delta: w.delta, startKg: w.startKg, weeks, mode });
  const tip = tipLine({ loggedDays: sum.loggedCount, daysPassed: md.dates.length, weighCount: w.count, avgCal: sum.avg, target, mode });
  const hasPrev = psum.loggedCount > 0 || pw.delta != null;
  const good = (a, b, better) => (a == null || b == null ? null : a === b ? null : better(a, b));
  const cmp = hasPrev ? [
    w.delta != null && pw.delta != null && { l: mode === "gain" ? "Cân tăng" : mode === "loss" ? "Cân giảm" : "Cân thay đổi", now: w.delta, prev: pw.delta, kind: "kg", better: good(w.delta, pw.delta, (a, b) => (mode === "gain" ? a > b : mode === "loss" ? a < b : Math.abs(a) < Math.abs(b))) },
    { l: "Ngày ghi bữa", now: sum.loggedCount, prev: psum.loggedCount, kind: "n", better: good(sum.loggedCount, psum.loggedCount, (a, b) => a > b) },
    sum.avg && psum.avg && target ? { l: "Calo trung bình", now: sum.avg, prev: psum.avg, kind: "cal", better: good(Math.abs(sum.avg - target), Math.abs(psum.avg - target), (a, b) => a < b) } : null,
    { l: "Ngày đúng calo", now: sum.okCount, prev: psum.okCount, kind: "n", better: good(sum.okCount, psum.okCount, (a, b) => a > b) },
  ].filter(Boolean) : [];
  return {
    m, label: monthLabel(m), prevLabel: monthLabel(pm), yyyy: Number(m.slice(0, 4)), mode, ongoing, thin,
    start: md.start, end: ongoing ? today : md.end, days: md.full, daysPassed: md.dates.length,
    loggedDays: sum.loggedCount, okDays: sum.okCount, avgCal: sum.avg, streak: longestStreak(sum.days), target,
    startKg: w.startKg, endKg: w.endKg, delta: w.delta, weighCount: w.count, goalKg: goalKg || null, kgLeft, pct,
    weights: w.pts.map((p) => ({ date: p.logged_date, kg: Number(p.kg) })),
    say, tip, cmp, hasData: sum.loggedCount > 0 || w.count > 0,
  };
}

// Thẻ ở Hôm nay: ngày 1–7 của tháng mới, cho tháng vừa xong (khi có dữ liệu)
export function recapCardMonth(today) {
  const day = Number(String(today).slice(8, 10));
  return day >= 1 && day <= 7 ? prevMonth(monthKey(today)) : null;
}
// Câu tiêu đề thẻ / ảnh: "Bạn đã giảm 2,4 kg"
export function headline(r) {
  if (r.delta == null) return `${r.label}: bạn ghi bữa ${r.loggedDays} ngày`;
  const v = Math.abs(r.delta).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  if (r.mode === "keep") return Math.abs(r.delta) <= 1 ? "Bạn giữ cân ổn định cả tháng" : `Cân bạn thay đổi ${v} kg`;
  if (r.delta < 0) return `Bạn đã giảm ${v} kg`;
  if (r.delta > 0) return `Bạn đã tăng ${v} kg`;
  return "Cân bạn đứng yên";
}
export { addDays, diffDays };
