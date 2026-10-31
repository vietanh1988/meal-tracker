// 31/10 (chủ dự án chốt bản vẽ "Cảnh báo ăn uống"): cảnh báo trên thẻ "Đã ghi đủ bữa" ở Hôm nay.
// Hàm thuần (có test). Vào: tổng đã ăn, mục tiêu, BMR, các dòng bữa (mealRows), ngày đã xong chưa.
// Ra: null (không có gì để nói) | { tone: "ok"|"warn"|"bad", full, label, value, rows: [{ k, tone, title, sub, val }], action }
//  - full = true: thẻ đủ bữa / ngày cũ (thay thẻ xanh cũ); false: thẻ gọn khi đang ăn dở mà đã vượt calo.
// Luật:
//  · Vượt calo: hơn mục tiêu > 5% VÀ > 100 kcal → vàng cam; > 20% → đỏ.
//  · Ăn quá ít: tổng < BMR, có ăn, và (ngày đã xong hoặc hôm nay từ 21:00) → đỏ, nút Thêm bữa phụ.
//  · Béo / Tinh bột vượt > 110% → vàng cam, chỉ ra bữa nhiều nhất. Đạm dư > 110% → xám (ngày tập "không sao"); > 150% → vàng cam.
//  · Đạm / Xơ thiếu < 90% chỉ khi ngày đã xong → xanh dương. Tinh bột / béo thiếu không báo.
//  · Tối đa 3 dòng: ăn quá ít, béo, tinh bột, đạm thiếu, xơ, đạm dư.
import { sumItems } from "./mealMath.js";
import { fmtInt } from "./mobileView.js";

const MAX_ROWS = 3;
const pct = (e, t) => (t > 0 ? e / t : 0);

function topMeal(rows, key) {
  let best = null;
  for (const r of rows || []) {
    if (r.state !== "eaten") continue;
    const v = sumItems(r.items)[key] || 0;
    if (!best || v > best.v) best = { name: r.name, v };
  }
  return best && best.v > 0 ? best : null;
}

export function dayWarnings({ eaten = {}, targets = {}, bmr = 0, train = false, rows = [], done = false, isToday = true, nowMinutes = 0, hasEaten = true }) {
  const cal = Math.round(eaten.cal || 0), tCal = Math.round(targets.cal || 0);
  if (!(tCal > 0) || !hasEaten || cal <= 0) return done && tCal > 0 && hasEaten ? okCard(cal, tCal, isToday) : null;
  const over = cal - tCal;
  const overWarn = over > 100 && over > tCal * 0.05;
  const overBad = over > tCal * 0.2;
  const late = isToday && nowMinutes >= 21 * 60;
  const low = bmr > 0 && cal < bmr && (done || late);
  const out = [];
  const g = (k) => Math.round(eaten[k] || 0), t = (k) => Math.round(targets[k] || 0);

  if (low) out.push({ k: "kcal", tone: "red", title: `Thiếu ${fmtInt(bmr - cal)} kcal so với mức tối thiểu`, sub: `Nằm nghỉ cả ngày người bạn cũng cần khoảng ${fmtInt(bmr)} kcal. Ăn ít hơn dễ mất cơ, mệt, cân chững.`, val: `${fmtInt(cal)}/${fmtInt(bmr)}` });

  if (!done && !low) {
    // đang ăn dở: chỉ báo khi đã vượt calo
    if (!overWarn) return null;
    const left = (rows || []).filter((r) => r.state === "planned" || r.state === "empty");
    const next = left[0];
    return {
      tone: overBad ? "bad" : "warn", full: false,
      label: `ĐÃ VƯỢT ${fmtInt(over)} KCAL${left.length ? ` · CÒN ${left.length} BỮA` : ""}`, value: `${fmtInt(cal)} / ${fmtInt(tCal)} kcal`,
      rows: next ? [{ k: "next", tone: "amber", title: `${next.name} ăn nhẹ thôi`, sub: "Rau luộc, canh, ít cơm. Ăn đủ đạm, bớt tinh bột và dầu mỡ." }] : [],
      action: null,
    };
  }

  if (t("f") > 0 && pct(g("f"), t("f")) > 1.1) {
    const m = topMeal(rows, "f");
    out.push({ k: "f", tone: "amber", title: `Béo vượt ${fmtInt(g("f") - t("f"))}g`, sub: `${m ? `${m.name} nhiều béo nhất (${fmtInt(m.v)}g). ` : ""}${done ? "Mai đổi món chiên, xào sang luộc, hấp." : "Bữa còn lại bớt dầu mỡ."}`, val: `${g("f")}/${t("f")}g` });
  }
  if (t("c") > 0 && pct(g("c"), t("c")) > 1.1) {
    const m = topMeal(rows, "c");
    out.push({ k: "c", tone: "amber", title: `Tinh bột vượt ${fmtInt(g("c") - t("c"))}g`, sub: `${m ? `${m.name} nhiều tinh bột nhất (${fmtInt(m.v)}g). ` : ""}Bớt cơm, bún, bánh ngọt, nước ngọt.`, val: `${g("c")}/${t("c")}g` });
  }
  if (done && t("p") > 0 && pct(g("p"), t("p")) < 0.9) out.push({ k: "p_low", tone: "blue", title: `Đạm còn thiếu ${fmtInt(t("p") - g("p"))}g`, sub: "Thêm trứng, sữa chua Hy Lạp, thịt nạc hoặc đậu phụ.", val: `${g("p")}/${t("p")}g` });
  if (done && t("fiber") > 0 && pct(g("fiber"), t("fiber")) < 0.9) out.push({ k: "fiber", tone: "blue", title: `Xơ còn thiếu ${fmtInt(t("fiber") - g("fiber"))}g`, sub: "Mai thêm 1 đĩa rau và 1 quả táo hoặc ổi.", val: `${g("fiber")}/${t("fiber")}g` });
  if (t("p") > 0 && pct(g("p"), t("p")) > 1.1) {
    const big = pct(g("p"), t("p")) > 1.5;
    out.push({ k: "p_high", tone: big ? "amber" : "grey", title: `Đạm ${big ? "dư" : "hơi dư"} ${fmtInt(g("p") - t("p"))}g`, sub: big ? "Nhiều quá mức cần, bớt thịt hoặc whey." : train ? "Ngày tập thì không sao." : "Không sao, mai cân lại.", val: `${g("p")}/${t("p")}g` });
  }

  const rowsOut = out.slice(0, MAX_ROWS);
  const tone = low || overBad ? "bad" : overWarn || rowsOut.some((r) => r.tone === "amber") ? "warn" : "ok";
  const base = isToday ? "ĐỦ BỮA" : "NGÀY ĐÓ";
  const label = low ? `${base} · ĂN QUÁ ÍT` : overWarn ? `${base} · VƯỢT ${fmtInt(over)} KCAL` : isToday ? "ĐÃ GHI ĐỦ BỮA" : "NGÀY ĐÓ ĐÃ ĂN";
  return { tone, full: true, label, value: `${fmtInt(cal)} / ${fmtInt(tCal)} kcal${isToday ? " hôm nay" : ""}`, rows: rowsOut, action: low && isToday ? { act: "snack", label: "Thêm bữa phụ" } : null };
}

function okCard(cal, tCal, isToday) {
  return { tone: "ok", full: true, label: isToday ? "ĐÃ GHI ĐỦ BỮA" : "NGÀY ĐÓ ĐÃ ĂN", value: `${fmtInt(cal)} / ${fmtInt(tCal)} kcal${isToday ? " hôm nay" : ""}`, rows: [], action: null };
}
