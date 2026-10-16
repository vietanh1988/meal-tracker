// Tiến độ › Số đo (bản vẽ 123a / 123c, 17/10).
//  - Lần đo gần nhất: 6 ô (Eo, Bụng, Mông, Ngực, Bắp tay, Đùi) + % mỡ, mũi tên so với lần trước, màu theo mục tiêu.
//  - Nhận xét cân + eo (bodyInsight) nếu có. Biểu đồ chọn từng số, 8 tuần / Tất cả. Lịch sử chạm để sửa / xoá.
//  - Chưa đo lần nào → thẻ giới thiệu + "Đo lần đầu" + lối tắt Nhắc nhở (cài đặt nhắc chỉ ở Tôi › Nhắc nhở).
import { useState } from "react";
import { GRAD_BLUE, Icon, Seg, Skel } from "./ui";
import { ltCard, LT } from "../theme";
import { FIELDS, latestByField, deltaTone, measureSeries, waistHeight, sortRows, countValues, bodyInsight } from "../lib/bodyMeasure";
import { fmtDec, weekdayStrip } from "../lib/mobileView";
import { fmtVN } from "../lib/dateVN";

const TONE = { good: "#047857", bad: "#C2410C", neutral: "#64748B" };
const arrow = (d) => (d > 0 ? "↑" : "↓");
const svgI = (d, s = 20) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const RULER = svgI(<><path d="M3 17L17 3l4 4L7 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></>, 34);
const BELL = svgI(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>);

export function InsightLine({ insight, testid = "body-insight" }) {
  if (!insight) return null;
  const good = insight.tone === "good";
  return <div data-testid={testid} data-tone={insight.tone} style={{ margin: "12px 12px 0 12px", borderRadius: 16, padding: "12px 14px", background: good ? "rgba(5,150,105,0.10)" : "rgba(245,158,11,0.14)", color: good ? "#065F46" : "#92400E", fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{insight.text}</div>;
}

export function MeasurePanel({ measures, profile, weightLog, today, onMeasure, onOpenReminders }) {
  const [field, setField] = useState("waist");
  const [range, setRange] = useState("8w");
  if (measures == null) return <div style={{ margin: "0 12px", ...ltCard, padding: 16 }}><Skel w="50%" /><div style={{ height: 10 }} /><Skel w="100%" h={120} /></div>;
  const rows = sortRows(measures);
  const goal = profile?.goalType;

  if (!rows.length) return (
    <>
      <div data-testid="measure-empty" style={{ margin: "0 12px", ...ltCard, padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <span style={{ width: 72, height: 72, borderRadius: 24, background: "linear-gradient(160deg,#38BDF8,#0062F0)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(0,98,240,0.25)" }}>{RULER}</span>
        <span style={{ fontSize: 19, fontWeight: 900 }}>Theo dõi số đo cơ thể</span>
        <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>Cân nặng có lúc đứng yên, nhưng vòng eo nhỏ lại là dấu hiệu bạn đang <b>giảm mỡ</b> thật. Đo mỗi tuần 1 lần để thấy rõ thay đổi.</span>
        <button data-testid="measure-first" onClick={() => onMeasure(today)} style={{ alignSelf: "stretch", height: 52, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{Icon.plus(18)}Đo lần đầu</button>
        <span style={{ fontSize: 12, color: "#64748B" }}>Chỉ cần thước dây · khoảng 2 phút</span>
      </div>
      <ReminderLink onOpen={onOpenReminders} />
    </>
  );

  const L = latestByField(rows);
  const last = rows[rows.length - 1];
  const prevRow = rows.length > 1 ? rows[rows.length - 2] : null;
  const whr = L.waist ? waistHeight(L.waist.v, profile?.cm) : null;
  const insight = bodyInsight({ weightLog, rows, goalType: goal });
  const avail = [...FIELDS.filter((f) => L[f.k]), ...(L.body_fat ? [{ k: "body_fat", label: "% mỡ", color: "#64748B" }] : [])];
  const fk = avail.find((f) => f.k === field) ? field : avail[0]?.k;
  const fMeta = avail.find((f) => f.k === fk);
  const unit = fk === "body_fat" ? "%" : "cm";

  const tile = (f) => {
    const x = L[f.k];
    const tone = x ? deltaTone(f.k, x.delta, goal) : null;
    return (
      <button key={f.k} data-testid={`measure-tile-${f.k}`} onClick={() => x && setField(f.k)} aria-pressed={fk === f.k} style={{ borderRadius: 14, border: "none", background: fk === f.k ? "#EEF4FF" : "#F6F8FC", boxShadow: fk === f.k ? "inset 0 0 0 1.5px #93C5FD" : "none", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, fontFamily: "inherit", color: "#0F172A", textAlign: "left", minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{f.label}</span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: x ? "#0F172A" : "#CBD5E1" }}>{x ? fmtDec(x.v) : "—"}</span>
          {x && <span style={{ fontSize: 12, color: "#64748B" }}>cm</span>}
          <span style={{ flex: 1 }} />
          <span data-testid={`measure-delta-${f.k}`} data-tone={tone || ""} style={{ fontSize: 12, fontWeight: 900, color: tone ? TONE[tone] : "#94A3B8" }}>{x?.delta ? `${arrow(x.delta)} ${fmtDec(Math.abs(x.delta))}` : "—"}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      <div data-testid="measure-latest" style={{ margin: "0 12px", ...ltCard, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 900 }}>Lần đo gần nhất</span>
            <span style={{ fontSize: 12, color: "#64748B" }}>{weekdayStrip(last.log_date)} {fmtVN(last.log_date)}{prevRow ? ` · so với ${fmtVN(prevRow.log_date)}` : ""}</span>
          </span>
          <button data-testid="measure-add" onClick={() => onMeasure(today)} style={{ height: 36, padding: "0 14px", borderRadius: 12, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 900, display: "flex", alignItems: "center", gap: 6 }}>{Icon.plus(16)}Đo</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>{[FIELDS[1], FIELDS[2], FIELDS[3], FIELDS[0], FIELDS[4], FIELDS[5]].map(tile)}</div>
        {(L.body_fat || whr) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 14, background: "#F6F8FC", padding: "10px 12px", flexWrap: "wrap" }}>
            {L.body_fat && <>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>% mỡ</span>
              <span data-testid="measure-fat" style={{ fontSize: 18, fontWeight: 900 }}>{fmtDec(L.body_fat.v)}%</span>
              {L.body_fat.delta ? <span style={{ fontSize: 12, fontWeight: 900, color: TONE[deltaTone("body_fat", L.body_fat.delta, goal)] }}>{arrow(L.body_fat.delta)} {fmtDec(Math.abs(L.body_fat.delta))}</span> : null}
            </>}
            <span style={{ flex: 1 }} />
            {whr && <span data-testid="measure-whr" style={{ fontSize: 12, color: whr >= 0.5 ? "#B45309" : "#64748B", fontWeight: whr >= 0.5 ? 800 : 600 }}>Eo / chiều cao {fmtDec(whr, 2)}{whr >= 0.5 ? " · mỡ bụng hơi cao" : ""}</span>}
          </div>
        )}
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Xanh = đổi đúng hướng mục tiêu{goal === "bulk" ? " (tăng cơ: ngực, bắp tay, đùi to lên)" : " (giảm mỡ: eo, bụng, mông nhỏ lại · ngực, bắp tay giữ / to lên)"}.</span>
      </div>

      <InsightLine insight={insight} testid="measure-insight" />

      {fMeta && <MeasureChart rows={rows} k={fk} meta={fMeta} unit={unit} range={range} setRange={setRange} today={today} avail={avail} setField={setField} />}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 16px 6px 16px" }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Lịch sử</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Chạm một dòng để sửa</span>
      </div>
      <div style={{ margin: "0 12px", ...ltCard, padding: "0 14px" }}>
        {[...rows].reverse().map((r, i, arr) => (
          <button key={r.log_date} data-testid="measure-hist-row" data-date={r.log_date} onClick={() => onMeasure(r.log_date)} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 56, borderStyle: "solid", borderColor: LT.line, borderWidth: i < arr.length - 1 ? "0 0 1px 0" : 0, background: "transparent", padding: "6px 0", fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{weekdayStrip(r.log_date)} {fmtVN(r.log_date)}</span>
              <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{FIELDS.filter((f) => r[f.k] != null).map((f) => `${f.label} ${fmtDec(r[f.k])}`).join(" · ")}{r.body_fat != null ? ` · ${fmtDec(r.body_fat)}% mỡ` : ""}</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", whiteSpace: "nowrap" }}>{countValues(r)} số</span>
            {Icon.chev(16)}
          </button>
        ))}
      </div>
      <ReminderLink onOpen={onOpenReminders} />
    </>
  );
}

function ReminderLink({ onOpen }) {
  if (!onOpen) return null;
  return (
    <button data-testid="measure-reminder-link" onClick={onOpen} className="tap" style={{ margin: "12px 12px 0 12px", width: "calc(100% - 24px)", ...ltCard, border: "none", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, background: "#F3EEFF", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{BELL}</span>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>Nhắc đo mỗi tuần</span>
        <span style={{ fontSize: 12, color: "#64748B" }}>Bật ở Nhắc nhở › Cân &amp; đo hằng tuần</span>
      </span>
      <span style={{ fontSize: 14, fontWeight: 800, color: "#0062F0" }}>Mở ›</span>
    </button>
  );
}

function MeasureChart({ rows, k, meta, unit, range, setRange, today, avail, setField }) {
  const c = measureSeries(rows, k, range, today);
  const W = 326, H = 150, x0 = 30, x1 = W - 10, y0 = 14, y1 = H - 22;
  const X = (x) => x0 + x * (x1 - x0), Y = (y) => y0 + y * (y1 - y0);
  const line = c.points.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const lastP = c.points[c.points.length - 1];
  return (
    <div data-testid="measure-chart" style={{ margin: "12px 12px 0 12px", ...ltCard, padding: "12px 10px 8px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Biểu đồ</span>
        <Seg size="sm" ariaLabel="Khoảng thời gian" value={range} onChange={setRange} opts={[["8w", "8 tuần"], ["all", "Tất cả"]].map(([id, l]) => ({ value: id, label: l, testid: `mchart-${id}` }))} />
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 4px", scrollbarWidth: "none" }}>
        {avail.map((f) => <button key={f.k} data-testid={`mchart-f-${f.k}`} aria-pressed={f.k === k} onClick={() => setField(f.k)} style={{ height: 30, padding: "0 12px", borderRadius: 15, border: "none", whiteSpace: "nowrap", fontFamily: "inherit", fontSize: 13, fontWeight: f.k === k ? 800 : 700, background: f.k === k ? "#0062F0" : "#F1F5F9", color: f.k === k ? "#FFFFFF" : "#334155", flexShrink: 0 }}>{f.label}</button>)}
      </div>
      {c.points.length < 2 ? (
        <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#64748B", textAlign: "center", padding: "0 16px" }}>{c.points.length ? `Đo ${meta.label.toLowerCase()} thêm lần nữa để thấy đường biểu đồ.` : "Chưa có lần đo nào trong 8 tuần qua."}</div>
      ) : (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${meta.label} từ ${fmtDec(c.points[0].v)} đến ${fmtDec(lastP.v)} ${unit}`}>
          <defs><linearGradient id="fpma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#007AFF" stopOpacity="0.16" /><stop offset="1" stopColor="#007AFF" stopOpacity="0" /></linearGradient></defs>
          {[0, 0.5, 1].map((t) => <g key={t}><line x1={x0} x2={x1} y1={Y(t)} y2={Y(t)} stroke="#F1F5F9" /><text x={x0 - 5} y={Y(t) + 4} fontSize="10" fill="#94A3B8" textAnchor="end">{fmtDec(c.max - t * (c.max - c.min), 0)}</text></g>)}
          <polygon points={`${X(c.points[0].x).toFixed(1)},${y1} ${line} ${X(lastP.x).toFixed(1)},${y1}`} fill="url(#fpma)" />
          <polyline points={line} fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {c.points.map((p, i) => <circle key={p.date} cx={X(p.x)} cy={Y(p.y)} r={i === c.points.length - 1 ? 4.5 : 3} fill={i === c.points.length - 1 ? "#007AFF" : "#FFFFFF"} stroke="#007AFF" strokeWidth="2" />)}
          <text x={X(lastP.x)} y={Y(lastP.y) - 9} fontSize="11" fontWeight="800" fill="#0062F0" textAnchor="end">{fmtDec(lastP.v)} {unit}</text>
          <text x={x0} y={H - 5} fontSize="10" fill="#94A3B8">{fmtVN(c.first)}</text>
          <text x={x1} y={H - 5} fontSize="10" fill="#94A3B8" textAnchor="end">{fmtVN(c.last)}</text>
        </svg>
      )}
      {c.change != null && <span data-testid="mchart-note" style={{ fontSize: 12, fontWeight: 700, color: "#0062F0", padding: "0 4px 4px 4px" }}>{meta.label} {c.change < 0 ? "nhỏ đi" : c.change > 0 ? "to thêm" : "giữ nguyên"}{c.change ? ` ${fmtDec(Math.abs(c.change))} ${unit}` : ""} {range === "8w" ? "trong 8 tuần" : "từ lần đo đầu"}</span>}
    </div>
  );
}
