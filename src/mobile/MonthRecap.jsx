// Bản vẽ 136a–d (18/10) — Tổng kết tháng cho khách: thẻ ở Hôm nay (ngày 1–7), màn "Tháng X của bạn", ảnh chia sẻ.
// Số liệu: src/lib/monthRecap.js (hàm thuần). Ảnh chia sẻ vẽ bằng canvas (không cần thư viện).
import { useEffect, useMemo, useState } from "react";
import { SubPage, Icon, GRAD_BLUE } from "./ui";
import { LT, ltCard } from "../theme";
import { monthRecap, monthDates, prevMonth, headline } from "../lib/monthRecap";
import { fmtVN } from "../lib/dateVN";
import { track } from "../lib/track";

const nf = (v, d = 1) => Number(v).toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
const ni = (v) => Math.round(Number(v) || 0).toLocaleString("vi-VN");
const card = { margin: "0 12px", ...ltCard };
const secT = { padding: "20px 18px 10px 18px", fontSize: 17, fontWeight: 900 };
const signed = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${nf(Math.abs(v))}`;
const WORD = { loss: "Giảm cân", gain: "Tăng cơ", keep: "Giữ cân" };

// Thẻ ở Hôm nay (ngày 1–7 tháng mới) — r: kết quả monthRecap của tháng vừa xong
export function RecapTodayCard({ r, onOpen, onHide }) {
  const left = r.kgLeft != null && r.mode !== "keep" ? ["Còn tới đích", `${nf(r.kgLeft)} kg`] : ["Ngày đúng calo", `${r.okDays} ngày`];
  return (
    <div data-testid="recap-card" style={{ margin: "14px 12px 0 12px", borderRadius: 20, background: GRAD_BLUE, color: "#FFF", padding: 16, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 10px 24px rgba(0,98,240,0.28)", position: "relative", overflow: "hidden" }}>
      <span aria-hidden="true" style={{ position: "absolute", right: -30, top: -30, width: 130, height: 130, borderRadius: 65, background: "rgba(255,255,255,0.10)" }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, position: "relative" }}>
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>🎉</span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", opacity: 0.85 }}>TỔNG KẾT {r.label.toUpperCase()}</span>
          <span style={{ fontSize: 18, fontWeight: 900 }}>{headline(r)}{r.delta != null && r.delta !== 0 ? " tháng này!" : ""}</span>
        </span>
        <button data-testid="recap-hide" onClick={onHide} aria-label="Ẩn tổng kết" style={{ width: 30, height: 30, borderRadius: 15, border: "none", background: "rgba(255,255,255,0.18)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(14)}</button>
      </div>
      <div style={{ display: "flex", gap: 6, position: "relative" }}>
        {[["Ghi bữa", `${r.loggedDays}/${r.days} ngày`], ["Chuỗi dài nhất", `${r.streak} ngày`], left].map(([a, b]) => (
          <span key={a} style={{ flex: 1, minWidth: 0, borderRadius: 12, background: "rgba(255,255,255,0.16)", padding: "8px 10px", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, opacity: 0.85 }}>{a}</span><span style={{ fontSize: 15, fontWeight: 900, whiteSpace: "nowrap" }}>{b}</span>
          </span>
        ))}
      </div>
      <button data-testid="recap-open" onClick={onOpen} style={{ height: 46, borderRadius: 14, border: "none", background: "#FFFFFF", color: "#0062F0", fontFamily: "inherit", fontSize: 15, fontWeight: 900, position: "relative" }}>Xem tổng kết</button>
    </div>
  );
}

function WeightLine({ pts }) {
  if (!pts || pts.length < 2) return <div style={{ fontSize: 13, color: "#64748B", padding: "8px 2px" }}>Cần ít nhất 2 lần cân để vẽ đường cân nặng.</div>;
  const W = 326, H = 110, pad = 8;
  const ks = pts.map((p) => p.kg);
  const lo = Math.min(...ks) - 0.4, hi = Math.max(...ks) + 0.4;
  const x = (i) => pad + (i * (W - pad * 2)) / (pts.length - 1);
  const y = (k) => pad + ((hi - k) * (H - pad * 2)) / (hi - lo);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const last = pts.length - 1;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`Cân nặng từ ${nf(pts[0].kg)} xuống ${nf(pts[last].kg)} kg`}>
      <path d={`${d} L${x(last)},${H} L${x(0)},${H} Z`} fill="rgba(0,98,240,0.08)" />
      <path d={d} fill="none" stroke="#0062F0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.kg)} r={i === 0 || i === last ? 4.5 : 3} fill={i === last ? "#0062F0" : "#FFFFFF"} stroke="#0062F0" strokeWidth="2" />)}
      <text x={x(0)} y={H + 15} fontSize="11" fill="#64748B">{fmtVN(pts[0].date)} · {nf(pts[0].kg)}</text>
      <text x={x(last)} y={H + 15} fontSize="11" fill="#64748B" textAnchor="end">{fmtVN(pts[last].date)} · {nf(pts[last].kg)}</text>
    </svg>
  );
}

const Stat = ({ ic, a, b, sub, tone = "#0F172A", testid }) => (
  <span data-testid={testid} style={{ borderRadius: 16, background: "#F6F8FC", padding: 12, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
    <span aria-hidden="true" style={{ fontSize: 18 }}>{ic}</span>
    <span style={{ fontSize: 20, fontWeight: 900, color: tone, whiteSpace: "nowrap" }}>{b}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{a}</span>
    {sub && <span style={{ fontSize: 11.5, color: "#64748B" }}>{sub}</span>}
  </span>
);
const fmtCmp = (v, kind) => (kind === "kg" ? `${signed(v)} kg` : kind === "cal" ? ni(v) : String(v));
const Cmp = ({ l, now, prev, kind, better, first }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: first ? "none" : `1px solid ${LT.line}` }}>
    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{l}</span>
    <span style={{ fontSize: 13, color: "#94A3B8", textDecoration: "line-through" }}>{fmtCmp(prev, kind)}</span>
    <span style={{ fontSize: 15, fontWeight: 900 }}>{fmtCmp(now, kind)}</span>
    {better != null && <span style={{ fontSize: 12, fontWeight: 800, color: better ? "#047857" : "#C2410C", background: better ? "#ECFDF5" : "#FFF7ED", borderRadius: 10, padding: "3px 8px", whiteSpace: "nowrap" }}>{better ? "▲ tốt hơn" : "▼ kém hơn"}</span>}
  </div>
);

function Hero({ r }) {
  const word = r.mode === "gain" ? "tăng" : r.mode === "loss" ? "giảm" : "thay đổi";
  return (
    <div data-testid="recap-hero" style={{ margin: "14px 12px 0 12px", borderRadius: 24, background: GRAD_BLUE, color: "#FFF", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14, position: "relative", overflow: "hidden" }}>
      <span aria-hidden="true" style={{ position: "absolute", right: -40, top: -40, width: 170, height: 170, borderRadius: 85, background: "rgba(255,255,255,0.10)" }} />
      <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, position: "relative" }}>{r.ongoing ? "Từ đầu tháng tới nay, bạn đã " : "Tháng này bạn đã "}{word}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8, position: "relative" }}><b data-testid="recap-delta" style={{ fontSize: 54, lineHeight: 1, letterSpacing: -1.5 }}>{signed(r.delta)}</b><span style={{ fontSize: 20, fontWeight: 800 }}>kg</span></span>
      <span style={{ fontSize: 13.5, opacity: 0.92, position: "relative" }}>{nf(r.startKg)} kg → <b>{nf(r.endKg)} kg</b> · {r.weighCount} lần cân</span>
      {r.pct != null && r.mode !== "keep" && (
        <span style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
          <span style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.22)" }}><span style={{ display: "block", width: `${r.pct}%`, height: 10, borderRadius: 5, background: "#FFFFFF" }} /></span>
          <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, opacity: 0.9 }}><span>Đã đi được {r.pct}% chặng đường</span><span>Đích {nf(r.goalKg)} kg · còn {nf(r.kgLeft)} kg</span></span>
        </span>
      )}
    </div>
  );
}

function Thin({ r, onReminders }) {
  return (
    <>
      <div data-testid="recap-thin" style={{ ...card, marginTop: 14, padding: "22px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
        <span aria-hidden="true" style={{ fontSize: 40 }}>🌱</span>
        <span style={{ fontSize: 19, fontWeight: 900 }}>{r.hasData ? "Bạn đã bắt đầu!" : "Tháng này chưa có dữ liệu"}</span>
        <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.55 }}>Bạn ghi bữa <b>{r.loggedDays} ngày</b> và cân <b>{r.weighCount} lần</b>. Chưa đủ để thấy rõ kết quả — chỉ cần ghi đều và cân mỗi tuần là app tính được bạn thay đổi bao nhiêu.</span>
      </div>
      <div style={secT}>Để tháng sau rõ kết quả hơn</div>
      <div style={{ ...card, padding: "0 14px" }}>
        {[["⚖️", "Cân mỗi sáng thứ 2", "Trước khi ăn, mỗi tuần 1 lần"], ["✅", "Bấm Đã ăn sau mỗi bữa", "Thực đơn đã có sẵn, chỉ cần 1 chạm"], ["🔔", "Bật thông báo nhắc bữa", "App nhắc đúng giờ ăn", onReminders]].map(([i, t, s, fn], k) => {
          const inner = (<><span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: "#F6F8FC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{i}</span><span style={{ flex: 1, display: "flex", flexDirection: "column", textAlign: "left" }}><span style={{ fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ fontSize: 12.5, color: "#64748B" }}>{s}</span></span>{fn && Icon.next(16)}</>);
          const st = { display: "flex", alignItems: "center", gap: 12, minHeight: 60, borderTop: k ? `1px solid ${LT.line}` : "none", width: "100%", background: "transparent", border: "none", borderTopStyle: "solid", padding: 0, fontFamily: "inherit", color: "#0F172A" };
          return fn ? <button key={t} onClick={fn} style={{ ...st, borderTop: k ? `1px solid ${LT.line}` : "none" }}>{inner}</button> : <div key={t} style={st}>{inner}</div>;
        })}
      </div>
    </>
  );
}

// ===== Ảnh chia sẻ (canvas 1080×1350) =====
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function loadImg(src) { return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); }
export async function drawShareImage(r, { name, hideKg }) {
  const W = 1080, H = 1350, F = "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif";
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, W * 0.6, H); g.addColorStop(0, "#2C8DFF"); g.addColorStop(0.45, "#0062F0"); g.addColorStop(1, "#0040C0");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(W - 40, 40, 300, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.beginPath(); ctx.arc(40, H - 300, 200, 0, Math.PI * 2); ctx.fill();
  const logo = await loadImg("/icon-192.png");
  if (logo) { ctx.save(); roundRect(ctx, 80, 80, 84, 84, 22); ctx.clip(); ctx.drawImage(logo, 80, 80, 84, 84); ctx.restore(); }
  ctx.fillStyle = "#FFF"; ctx.font = `800 42px ${F}`; ctx.textBaseline = "middle"; ctx.fillText("Fipilot AI", 186, 122);
  ctx.font = `600 36px ${F}`; ctx.textAlign = "right"; ctx.globalAlpha = 0.85; ctx.fillText(`${r.label} · ${r.yyyy}`, W - 80, 122); ctx.globalAlpha = 1; ctx.textAlign = "left";
  const word = r.mode === "gain" ? "đã tăng" : r.mode === "loss" ? "đã giảm" : "thay đổi";
  ctx.font = `700 46px ${F}`; ctx.globalAlpha = 0.92; ctx.fillText(`${name ? name + " " : "Mình "}${word}`, 80, 330); ctx.globalAlpha = 1;
  if (r.delta != null) {
    const big = signed(r.delta);
    ctx.font = `900 230px ${F}`; ctx.fillText(big, 70, 500);
    const bw = ctx.measureText(big).width; ctx.font = `800 80px ${F}`; ctx.fillText("kg", 90 + bw, 530);
    if (!hideKg) { ctx.font = `600 46px ${F}`; ctx.globalAlpha = 0.9; ctx.fillText(`${nf(r.startKg)} → ${nf(r.endKg)} kg`, 80, 680); ctx.globalAlpha = 1; }
  } else { ctx.font = `900 120px ${F}`; ctx.fillText(`${r.loggedDays} ngày`, 70, 480); ctx.font = `600 46px ${F}`; ctx.fillText("ăn uống có kế hoạch", 80, 600); }
  const tiles = [["📅", String(r.loggedDays), "ngày ghi bữa"], ["🔥", String(r.streak), "ngày liên tục"], ["🎯", String(r.okDays), "ngày đúng calo"]];
  const tw = (W - 160 - 48) / 3;
  tiles.forEach(([ic, n, l], i) => {
    const x = 80 + i * (tw + 24), y = 900;
    ctx.fillStyle = "rgba(255,255,255,0.16)"; roundRect(ctx, x, y, tw, 250, 40); ctx.fill();
    ctx.fillStyle = "#FFF"; ctx.textAlign = "center";
    ctx.font = `56px ${F}`; ctx.fillText(ic, x + tw / 2, y + 62);
    ctx.font = `900 74px ${F}`; ctx.fillText(n, x + tw / 2, y + 140);
    ctx.font = `600 32px ${F}`; ctx.globalAlpha = 0.85; ctx.fillText(l, x + tw / 2, y + 205); ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  });
  ctx.textAlign = "center"; ctx.font = `600 34px ${F}`; ctx.globalAlpha = 0.88; ctx.fillText("Ăn món Việt quen thuộc, app lo phần tính · fipilotai.com", W / 2, H - 80); ctx.globalAlpha = 1;
  return new Promise((ok) => c.toBlob((b) => ok(b), "image/png"));
}

function ShareView({ r, name, onBack, showToast }) {
  const [hideKg, setHideKg] = useState(false);
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true, u = null;
    drawShareImage(r, { name, hideKg }).then((b) => { if (alive && b) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [r, name, hideKg]);
  const fileName = `fipilot-${r.m}.png`;
  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const b = await drawShareImage(r, { name, hideKg });
      const f = new File([b], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: `${headline(r)} với Fipilot AI — fipilotai.com` }); track("recap_share", { m: r.m, how: "share" }); }
      else { save(); }
    } catch (e) { /* người dùng huỷ */ }
    setBusy(false);
  };
  const save = () => {
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    track("recap_share", { m: r.m, how: "save" });
    showToast?.({ text: "Đã lưu ảnh" }, 2500);
  };
  return (
    <SubPage title="Chia sẻ thành tích" onBack={onBack}>
      <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div data-testid="recap-share-img" style={{ borderRadius: 22, overflow: "hidden", aspectRatio: "4 / 5", background: "#0062F0", boxShadow: "0 10px 30px rgba(0,64,192,0.25)" }}>
          {url && <img src={url} alt="Ảnh tổng kết tháng" style={{ display: "block", width: "100%", height: "100%" }} />}
        </div>
        {r.delta != null && (
          <button data-testid="recap-hide-kg" onClick={() => setHideKg((v) => !v)} aria-pressed={hideKg} style={{ ...ltCard, border: "none", padding: "0 14px", minHeight: 56, display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
            <span style={{ flex: 1, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 700 }}>Ẩn số cân</span><span style={{ fontSize: 12, color: "#64748B" }}>Chỉ khoe số kg đã thay đổi</span></span>
            <span aria-hidden="true" style={{ width: 50, height: 30, borderRadius: 15, background: hideKg ? "#34C759" : "#E2E8F0", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 3, left: hideKg ? 23 : 3, width: 24, height: 24, borderRadius: 12, background: "#FFF", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .15s" }} /></span>
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button data-testid="recap-save" onClick={save} disabled={!url} style={{ flex: 1, height: 50, borderRadius: 14, border: "none", background: "#FFFFFF", color: "#0F172A", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Lưu ảnh</button>
          <button data-testid="recap-share" onClick={share} disabled={!url || busy} style={{ flex: 1.6, height: 50, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>Chia sẻ Facebook / Zalo</button>
        </div>
      </div>
    </SubPage>
  );
}

// Màn "Tháng X của bạn" — tự tải daily_logs 2 tháng (tháng xem + tháng trước) qua getDailyLogs
export function MonthRecapScreen({ month, today, getDailyLogs, weightLog, profile, targetOf, target, name, onClose, onReminders, showToast }) {
  const [m, setM] = useState(month);
  const [data, setData] = useState(null);
  const [share, setShare] = useState(false);
  useEffect(() => {
    let alive = true;
    setData(null);
    const pm = prevMonth(m);
    Promise.all([getDailyLogs(monthDates(m).start, monthDates(m).end), getDailyLogs(monthDates(pm).start, monthDates(pm).end)])
      .then(([rows, prevRows]) => { if (alive) setData({ rows: rows || [], prevRows: prevRows || [] }); })
      .catch(() => { if (alive) setData({ rows: [], prevRows: [] }); });
    return () => { alive = false; };
  }, [m]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { track("recap_open", { m }); }, [m]);
  const r = useMemo(() => (data ? monthRecap({ m, today, rows: data.rows, prevRows: data.prevRows, weightLog, goalKg: profile?.goalKg, goalType: profile?.goalType, targetOf, target }) : null), [data, m, today, weightLog, profile, targetOf, target]);
  if (share && r) return <ShareView r={r} name={name} onBack={() => setShare(false)} showToast={showToast} />;
  const curM = today.slice(0, 7);
  const footer = r && (
    <div style={{ flexShrink: 0, padding: "10px 12px calc(env(safe-area-inset-bottom,0px) + 12px) 12px", background: "rgba(255,255,255,0.85)", display: "flex", gap: 8 }}>
      <button data-testid="recap-prev" onClick={() => setM(prevMonth(m))} style={{ flex: 1, height: 50, borderRadius: 14, border: "none", background: "#EEF4FF", color: "#0062F0", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>‹ {r.prevLabel}</button>
      {r.thin
        ? (m < curM ? <button data-testid="recap-next" onClick={() => { const [y, mo] = m.split("-").map(Number); const t = y * 12 + mo; setM(`${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`); }} style={{ flex: 1, height: 50, borderRadius: 14, border: "none", background: "#EEF4FF", color: "#0062F0", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Tháng sau ›</button> : null)
        : <button data-testid="recap-to-share" onClick={() => setShare(true)} style={{ flex: 1.6, height: 50, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>Chia sẻ thành tích</button>}
    </div>
  );
  const sub = r ? `${fmtVN(r.start)} – ${fmtVN(r.end)}${r.ongoing ? " (tạm tính)" : ""} · ${WORD[r.mode]}` : "Đang tải…";
  return (
    <SubPage title={`${r ? r.label : "Tháng"} của bạn`} subtitle={sub} onBack={onClose} footer={footer}>
      <div data-testid="recap-screen" style={{ paddingBottom: 20 }}>
        {!r && <div style={{ ...card, marginTop: 14, padding: 24, textAlign: "center", color: "#64748B", fontSize: 14 }}>Đang tính tổng kết…</div>}
        {r && r.thin && <Thin r={r} onReminders={onReminders} />}
        {r && !r.thin && (
          <>
            <Hero r={r} />
            <div style={{ ...card, marginTop: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span aria-hidden="true" style={{ fontSize: 24 }}>💬</span>
              <span data-testid="recap-say" style={{ fontSize: 14, lineHeight: 1.55, color: "#334155" }}><b style={{ color: "#0F172A" }}>{r.say.head}</b> {r.say.text}</span>
            </div>
            <div style={secT}>{r.ongoing ? "Từ đầu tháng bạn đã làm" : "Tháng này bạn đã làm"}</div>
            <div style={{ ...card, padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Stat testid="recap-logged" ic="📅" a="Ngày ghi bữa" b={`${r.loggedDays}/${r.daysPassed}`} sub={r.ongoing ? "ngày tới hôm nay" : "ngày trong tháng"} />
              <Stat ic="🎯" a="Ngày đúng calo" b={`${r.okDays} ngày`} sub={r.target ? `mục tiêu ${ni(r.target)} kcal` : null} tone="#047857" />
              <Stat testid="recap-streak" ic="🔥" a="Chuỗi dài nhất" b={`${r.streak} ngày`} sub="ghi bữa liên tục" tone="#EA580C" />
              <Stat ic="🍽️" a="Calo trung bình" b={ni(r.avgCal)} sub="kcal mỗi ngày có ghi" />
            </div>
            <div style={secT}>Cân nặng trong tháng</div>
            <div style={{ ...card, padding: "12px 14px" }}><WeightLine pts={r.weights} /></div>
            {r.cmp.length > 0 && (
              <>
                <div style={secT}>So với {r.prevLabel.toLowerCase()}</div>
                <div data-testid="recap-cmp" style={{ ...card, padding: "0 14px" }}>{r.cmp.map((c, i) => <Cmp key={c.l} {...c} first={i === 0} />)}</div>
              </>
            )}
            <div style={secT}>Tháng sau, thử thêm 1 việc</div>
            <div style={{ ...card, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
              <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 14, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{r.tip.icon}</span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{r.tip.t}</span>
                <span style={{ fontSize: 13, color: "#64748B", lineHeight: 1.45 }}>{r.tip.s}</span>
              </span>
            </div>
          </>
        )}
      </div>
    </SubPage>
  );
}
