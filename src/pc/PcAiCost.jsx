// Quản trị PC › Chi phí AI. Cùng RPC với src/mobile/admin/AiCostScreen.jsx:
//  admin_ai_cost_summary / _daily(14) / _by_model_7d / _by_feature_7d / _by_user_7d(30) / _recent(20)
//  + admin_ai_cost_by_user_detail khi bấm 1 người dùng (mở chi tiết ngay dưới dòng).
//  - 3 ô số hôm nay / 7 ngày / 30 ngày + số lượt
//  - Cột 14 ngày tự vẽ (đủ 14 ngày theo giờ VN, ngày không gọi = 0), hôm nay tô xanh lá
//  - Bảng theo tính năng (tên tiếng Việt), theo mô hình, theo người dùng, 20 lượt gọi gần nhất
//  - Nút "Tải lại" ở thanh trên, lỗi → Thử lại. Chỉ đọc số (không gọi AI).
import { Fragment, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, toVNDate, fmtVN, nowVNParts, addDays, dateList } from "../lib/dateVN";
import { PC } from "../theme";
import { Btn, Pill, Card, ErrorBox, Loading, headRow, bodyRow, cell, vnInt } from "./pcUI";

const FEATURE_VN = {
  menu_gen: "AI tạo thực đơn",
  chat: "Chat AI",
  macro_lookup: "AI tính macro",
  photo_macro: "Chụp ảnh món",
  weight_advice: "Tư vấn cân nặng",
  ping_test: "Thử kết nối",
};
const TIER = { free: ["Free", "gray"], trial: ["Trial", "amber"], premium: ["Premium", "blue"] };
const featVN = (f) => (f ? FEATURE_VN[f] || f : "Khác");
const comma = (s) => s.replace(".", ",");
const money = (n) => { const v = Number(n) || 0; return v > 0 && v < 0.01 ? comma(`$${v.toFixed(4)}`) : comma(`$${v.toFixed(2)}`); };
const money3 = (n) => { const v = Number(n) || 0; return v > 0 && v < 0.001 ? comma(`$${v.toFixed(4)}`) : comma(`$${v.toFixed(3)}`); };
const tok = (n) => { const v = Number(n) || 0; return v >= 1000 ? `${comma((v / 1000).toFixed(v >= 10000 ? 0 : 1))}k` : String(v); };
const hhmm = (iso) => {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d)) return "–";
  const { hour, minute } = nowVNParts(d);
  const day = toVNDate(d);
  const t = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return day === todayVN() ? t : `${t} ${fmtVN(day)}`;
};

const F_COLS = "1.6fr 0.6fr 1.4fr";
const M_COLS = "1.6fr 0.5fr 0.9fr 0.8fr";
const U_COLS = "1.6fr 0.7fr 0.5fr 0.9fr 0.8fr 16px";
const R_COLS = "0.9fr 1.8fr 0.8fr 0.7fr";

function Tile({ label, value, color, sub, testid }) {
  return (
    <Card testid={testid} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{label}</span>
        <span data-testid={testid ? `${testid}-value` : undefined} style={{ fontSize: 26, fontWeight: 900, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
        <span style={{ fontSize: 12, color: PC.t4, minHeight: 16 }}>{sub || ""}</span>
      </div>
    </Card>
  );
}

const title = (t, right) => (
  <div style={{ padding: "14px 16px 10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
    <span style={{ fontSize: 14, fontWeight: 900, flex: 1, minWidth: 0 }}>{t}</span>{right}
  </div>
);
const empty = (t) => <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>{t}</div>;
const rowStyle = (cols, last, sel) => ({ ...bodyRow(cols, sel), borderBottom: last ? "none" : bodyRow(cols).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0 });
const num = { ...cell, textAlign: "right" };

export function PcAiCost({ top, isAdmin = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await Promise.all([
        supabase.rpc("admin_ai_cost_summary"),
        supabase.rpc("admin_ai_cost_daily", { p_days: 14 }),
        supabase.rpc("admin_ai_cost_by_model_7d"),
        supabase.rpc("admin_ai_cost_by_feature_7d"),
        supabase.rpc("admin_ai_cost_by_user_7d", { p_limit: 30 }),
        supabase.rpc("admin_ai_cost_recent", { p_limit: 20 }),
      ]);
      const bad = res.find((r) => r.error);
      if (bad) throw bad.error;
      const [s, dd, bm, bf, bu, r] = res.map((x) => x.data);
      setData({ summary: (s && s[0]) || null, daily: dd || [], byModel: bm || [], byFeature: bf || [], byUser: bu || [], recent: r || [] });
    } catch (e) {
      console.error("PcAiCost load error:", e);
      setErr(e?.message || "Lỗi tải");
    }
    setLoading(false);
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [load, isAdmin]);

  const toggleUser = async (userId) => {
    if (expanded === userId) { setExpanded(null); setDetail(null); return; }
    setExpanded(userId);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const { data: d, error } = await supabase.rpc("admin_ai_cost_by_user_detail", { p_user_id: userId });
      if (error) throw error;
      setDetail(d || []);
    } catch (e) {
      console.error("user detail error:", e);
      setDetail([]);
    }
    setLoadingDetail(false);
  };

  if (!isAdmin) return <>{top(null)}<div data-testid="pc-ai_cost">{empty("Chỉ Admin mới xem được trang này.")}</div></>;

  const right = <Btn kind="soft" onClick={load} disabled={loading} testid="pc-ai_cost-reload">{loading ? "Đang tải…" : "Tải lại"}</Btn>;
  let body;
  if (err && !loading) body = <ErrorBox text={`Chưa tải được chi phí AI: ${err}`} onRetry={load} />;
  else if (!data) body = <Card><Loading /></Card>;
  else {
    const { summary, daily, byModel, byFeature, byUser, recent } = data;
    const today = todayVN();
    const costByDay = {}, callsByDay = {};
    daily.forEach((d) => {
      const raw = String(d.day || "");
      const k = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : toVNDate(new Date(raw));
      costByDay[k] = (costByDay[k] || 0) + (Number(d.cost_usd) || 0);
      callsByDay[k] = (callsByDay[k] || 0) + (Number(d.calls) || 0);
    });
    const days = dateList(addDays(today, -13), today);
    const maxDay = Math.max(0.0001, ...days.map((k) => costByDay[k] || 0));
    const sum14 = days.reduce((a, k) => a + (costByDay[k] || 0), 0);
    const maxF = Math.max(0.0001, ...byFeature.map((x) => Number(x.total_cost) || 0));

    body = (
      <>
        <div style={{ display: "flex", gap: 14 }}>
          <Tile testid="pc-ai_cost-today" label="Hôm nay" value={money(summary?.cost_today)} color="#B45309" sub={`${vnInt(summary?.calls_today)} lượt`} />
          <Tile testid="pc-ai_cost-7d" label="7 ngày" value={money(summary?.cost_7d)} color={PC.t1} sub={`${vnInt(summary?.calls_7d)} lượt`} />
          <Tile testid="pc-ai_cost-30d" label="30 ngày" value={money(summary?.cost_30d)} color={PC.t1} sub={`${vnInt(summary?.calls_30d)} lượt`} />
        </div>

        <Card testid="pc-ai_cost-chart">
          {title("14 ngày gần nhất", <span style={{ fontSize: 12, color: PC.t3 }}>Tổng {money(sum14)} · hôm nay {money(costByDay[today] || 0)}</span>)}
          <div role="img" aria-label={`Chi phí AI 14 ngày, tổng ${money(sum14)}, hôm nay ${money(costByDay[today] || 0)}`} style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 170, padding: "0 16px 14px 16px" }}>
            {days.map((k) => {
              const v = costByDay[k] || 0;
              const hi = k === today;
              return (
                <span key={k} title={`${fmtVN(k)}: ${money(v)} · ${vnInt(callsByDay[k] || 0)} lượt`} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  <span style={{ fontSize: 10.5, color: hi ? PC.t1 : PC.t4, fontWeight: hi ? 800 : 600, whiteSpace: "nowrap" }}>{v > 0 ? money(v) : ""}</span>
                  <span data-testid="pc-ai_cost-bar" style={{ width: "62%", height: Math.max(3, Math.round((v / maxDay) * 110)), borderRadius: "6px 6px 2px 2px", background: hi ? "#22C55E" : "#93C5FD" }} />
                  <span style={{ fontSize: 11, color: hi ? PC.t1 : PC.t3, fontWeight: hi ? 800 : 600, whiteSpace: "nowrap" }}>{hi ? "Hôm nay" : fmtVN(k)}</span>
                </span>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <Card testid="pc-ai_cost-feature">
            {title("Theo tính năng · 7 ngày")}
            <div style={{ ...headRow(F_COLS), borderRadius: 0 }}><span>TÍNH NĂNG</span><span style={{ textAlign: "right" }}>LƯỢT</span><span style={{ textAlign: "right" }}>CHI PHÍ</span></div>
            {byFeature.length === 0 ? empty("Chưa có lượt gọi nào.") : byFeature.map((f, i) => {
              const pct = ((Number(f.total_cost) || 0) / maxF) * 100;
              return (
                <div key={f.feature || i} data-testid="pc-ai_cost-feature-row" className="pc-row" style={rowStyle(F_COLS, i === byFeature.length - 1)}>
                  <span style={cell} title={featVN(f.feature)}>{featVN(f.feature)}</span>
                  <span style={num}>{vnInt(f.calls)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ flex: 1, height: 6, borderRadius: 3, background: "#EEF2FA", overflow: "hidden" }}><span style={{ display: "block", width: `${Math.max(2, pct)}%`, height: "100%", borderRadius: 3, background: "#60A5FA" }} /></span>
                    <b style={{ fontSize: 12.5, whiteSpace: "nowrap", minWidth: 56, textAlign: "right" }}>{money(f.total_cost)}</b>
                  </span>
                </div>
              );
            })}
          </Card>

          <Card testid="pc-ai_cost-model">
            {title("Theo mô hình · 7 ngày")}
            <div style={{ ...headRow(M_COLS), borderRadius: 0 }}><span>MÔ HÌNH</span><span style={{ textAlign: "right" }}>LƯỢT</span><span style={{ textAlign: "right" }}>TOKEN VÀO / RA</span><span style={{ textAlign: "right" }}>CHI PHÍ</span></div>
            {byModel.length === 0 ? empty("Chưa có lượt gọi nào.") : byModel.map((m, i) => (
              <div key={m.model || i} data-testid="pc-ai_cost-model-row" className="pc-row" style={rowStyle(M_COLS, i === byModel.length - 1)}>
                <span style={cell} title={m.model || "–"}>{m.model || "–"}</span>
                <span style={num}>{vnInt(m.calls)}</span>
                <span style={num}>{tok(m.total_input_tokens)} / {tok(m.total_output_tokens)}</span>
                <b style={num}>{money(m.total_cost)}</b>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <Card testid="pc-ai_cost-users">
            {title("Theo người dùng · 7 ngày", <span style={{ fontSize: 12, color: PC.t3 }}>Bấm để xem chi tiết 30 ngày</span>)}
            <div style={{ ...headRow(U_COLS), borderRadius: 0 }}><span>NGƯỜI DÙNG</span><span>GÓI</span><span style={{ textAlign: "right" }}>LƯỢT</span><span style={{ textAlign: "right" }}>TOKEN</span><span style={{ textAlign: "right" }}>CHI PHÍ</span><span /></div>
            {byUser.length === 0 ? empty("Chưa có lượt gọi nào.") : byUser.map((u, i) => {
              const open = expanded === u.user_id;
              const last = i === byUser.length - 1;
              const [tl, tt] = TIER[u.tier] || [u.tier, "gray"];
              return (
                <Fragment key={u.user_id || i}>
                  <button type="button" data-testid="pc-ai_cost-user" aria-expanded={open} onClick={() => toggleUser(u.user_id)} className="pc-row pc-click" style={rowStyle(U_COLS, last && !open, open)}>
                    <span style={{ ...cell, fontWeight: 700 }} title={u.username || "(không tên)"}>{u.username || "(không tên)"}</span>
                    <span style={cell}>{u.tier ? <Pill tone={tt}>{tl}</Pill> : "—"}</span>
                    <span style={num}>{vnInt(u.calls)}</span>
                    <span style={num}>{tok(u.total_input_tokens)} / {tok(u.total_output_tokens)}</span>
                    <b style={num}>{money(u.total_cost)}</b>
                    <span aria-hidden="true" style={{ color: PC.t4, fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block", textAlign: "center" }}>›</span>
                  </button>
                  {open && (
                    <div data-testid="pc-ai_cost-user-detail" style={{ background: PC.editBg, padding: "8px 16px", borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                      {loadingDetail && <div style={{ fontSize: 12.5, color: PC.t3, padding: "6px 0" }}>Đang tải…</div>}
                      {!loadingDetail && detail?.length === 0 && <div style={{ fontSize: 12.5, color: PC.t3, padding: "6px 0" }}>Không có dữ liệu 30 ngày qua.</div>}
                      {!loadingDetail && detail?.map((d, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, padding: "5px 0" }}>
                          <span style={{ minWidth: 0, color: PC.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={`${featVN(d.feature)} · ${d.model}`}>{featVN(d.feature)} · {d.model}</span>
                          <span style={{ color: PC.t2, whiteSpace: "nowrap" }}>{vnInt(d.calls)} lượt · <b style={{ color: PC.t1 }}>{money(d.total_cost)}</b></span>
                        </div>
                      ))}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </Card>

          <Card testid="pc-ai_cost-recent">
            {title("20 lượt gọi gần nhất")}
            <div style={{ ...headRow(R_COLS), borderRadius: 0 }}><span>LÚC</span><span>TÍNH NĂNG · MÔ HÌNH</span><span style={{ textAlign: "right" }}>TOKEN</span><span style={{ textAlign: "right" }}>CHI PHÍ</span></div>
            {recent.length === 0 ? empty("Chưa có dữ liệu.") : recent.map((r, i) => (
              <div key={i} data-testid="pc-ai_cost-recent-row" className="pc-row" style={rowStyle(R_COLS, i === recent.length - 1)}>
                <span style={{ ...cell, color: PC.t2 }}>{hhmm(r.created_at)}</span>
                <span style={cell} title={`${featVN(r.feature)} · ${r.model}`}><b>{featVN(r.feature)}</b><span style={{ color: PC.t3 }}> · {r.model}</span></span>
                <span style={num}>{tok(r.input_tokens)} / {tok(r.output_tokens)}</span>
                <b style={num}>{money3(r.cost_usd)}</b>
              </div>
            ))}
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      {top(right)}
      <div data-testid="pc-ai_cost" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>{body}</div>
    </>
  );
}
