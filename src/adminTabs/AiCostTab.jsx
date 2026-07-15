import { useState, useEffect, useCallback, useRef } from "react";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { supabase } from "../lib/supabase";
import { C, card } from "../theme";
import { fmtDate } from "../fmtDate";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}

function fmtUSD(n) {
  const v = Number(n) || 0;
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

// 1 màu duy nhất — so sánh độ lớn (magnitude) dùng sequential, không phải categorical
const BAR_BLUE = "#2a78d6";

function HBar({ data, labelKey, valueKey }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 0.0001);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const pct = Math.max((v / max) * 100, 2);
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: C.t2 }}>{d[labelKey]}</span>
              <span style={{ color: C.t1, fontWeight: 700 }}>{fmtUSD(v)}</span>
            </div>
            <div style={{ height: 6, background: C.surface, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: BAR_BLUE, borderRadius: 3, transition: "width .3s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Chart.js daily bar chart — canvas quản lý bằng ref, tự huỷ instance cũ khi data đổi
function DailyChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = data.map(d => {
      const dt = new Date(d.day);
      return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
    });
    const costs = data.map(d => Number(d.cost_usd) || 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: { labels, datasets: [{ data: costs, backgroundColor: BAR_BLUE, borderRadius: 4, maxBarThickness: 24 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => "$" + ctx.parsed.y.toFixed(4) } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: C.t3, font: { size: 11 } } },
          y: { grid: { color: C.border }, border: { display: false }, ticks: { color: C.t3, font: { size: 11 }, callback: (v) => "$" + v.toFixed(2) } },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (!data.length) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: 260 }}>
      <canvas ref={canvasRef} role="img" aria-label="Biểu đồ chi phí AI theo ngày">
        Chi phí AI theo ngày, {data.length} ngày gần nhất.
      </canvas>
    </div>
  );
}

export function AiCostTab({ isAdmin }) {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [byModel, setByModel] = useState([]);
  const [byFeature, setByFeature] = useState([]);
  const [byUser, setByUser] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: s }, { data: dd }, { data: bm }, { data: bf }, { data: bu }, { data: r }] = await Promise.all([
        supabase.rpc("admin_ai_cost_summary"),
        supabase.rpc("admin_ai_cost_daily", { p_days: 14 }),
        supabase.rpc("admin_ai_cost_by_model_7d"),
        supabase.rpc("admin_ai_cost_by_feature_7d"),
        supabase.rpc("admin_ai_cost_by_user_7d", { p_limit: 30 }),
        supabase.rpc("admin_ai_cost_recent", { p_limit: 20 }),
      ]);
      setSummary((s && s[0]) || null);
      setDaily(dd || []);
      setByModel(bm || []);
      setByFeature(bf || []);
      setByUser(bu || []);
      setRecent(r || []);
    } catch (e) {
      console.error("AiCostTab load error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleUser = async (userId) => {
    if (expandedUser === userId) { setExpandedUser(null); setUserDetail(null); return; }
    setExpandedUser(userId);
    setLoadingDetail(true);
    try {
      const { data } = await supabase.rpc("admin_ai_cost_by_user_detail", { p_user_id: userId });
      setUserDetail(data || []);
    } catch (e) {
      console.error("user detail error:", e);
      setUserDetail([]);
    }
    setLoadingDetail(false);
  };

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;

  return (
    <div style={{ ...card, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>💰 Chi phí AI</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Token + tiền thật, log tại edge function mỗi lần gọi AI</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>Hôm nay</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginTop: 4 }}>{loading ? "-" : fmtUSD(summary?.cost_today)}</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{loading ? "" : `${summary?.calls_today ?? 0} lượt gọi`}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>7 ngày</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginTop: 4 }}>{loading ? "-" : fmtUSD(summary?.cost_7d)}</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{loading ? "" : `${summary?.calls_7d ?? 0} lượt gọi`}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>30 ngày</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginTop: 4 }}>{loading ? "-" : fmtUSD(summary?.cost_30d)}</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{loading ? "" : `${summary?.calls_30d ?? 0} lượt gọi`}</div>
        </div>
      </div>

      {daily.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>Chi phí theo ngày</div>
            <div style={{ fontSize: 11, color: C.t3 }}>14 ngày gần nhất</div>
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginBottom: 12 }}>Gồm cả token vào và ra</div>
          <DailyChart data={daily} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {byModel.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 14 }}>Theo model (7 ngày)</div>
            <HBar data={byModel} labelKey="model" valueKey="total_cost" />
          </div>
        )}

        {byFeature.length > 0 && (
          <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 14 }}>Theo tính năng (7 ngày)</div>
            <HBar data={byFeature} labelKey="feature" valueKey="total_cost" />
          </div>
        )}
      </div>

      {byUser.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 12 }}>Theo user (7 ngày) — bấm để xem chi tiết</div>
          {byUser.map(u => (
            <div key={u.user_id}>
              <div onClick={() => toggleUser(u.user_id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: expandedUser === u.user_id ? "none" : `1px solid ${C.border}`, cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{u.username}{u.tier ? ` · ${u.tier}` : ""}</div>
                  <div style={{ fontSize: 11, color: C.t3 }}>{u.calls} lượt · {u.total_input_tokens?.toLocaleString()} in / {u.total_output_tokens?.toLocaleString()} out token</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{fmtUSD(u.total_cost)}</div>
                  <span style={{ fontSize: 11, color: C.t3, transform: expandedUser === u.user_id ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                </div>
              </div>
              {expandedUser === u.user_id && (
                <div style={{ padding: "4px 0 10px 12px", borderBottom: `1px solid ${C.border}`, background: "#FAFAFA", borderRadius: 6 }}>
                  {loadingDetail && <div style={{ fontSize: 12, color: C.t3, padding: "6px 0" }}>Đang tải...</div>}
                  {!loadingDetail && userDetail?.length === 0 && <div style={{ fontSize: 12, color: C.t3, padding: "6px 0" }}>Không có dữ liệu 30 ngày qua.</div>}
                  {!loadingDetail && userDetail?.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                      <div style={{ color: C.t2 }}>{d.feature} · {d.model}</div>
                      <div style={{ color: C.t2 }}>{d.calls} lượt · <span style={{ fontWeight: 700, color: C.t1 }}>{fmtUSD(d.total_cost)}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 10 }}>20 lượt gọi gần nhất</div>
        {recent.length === 0 && !loading && <div style={{ fontSize: 13, color: C.t3 }}>Chưa có dữ liệu.</div>}
        {recent.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : "none", fontSize: 12 }}>
            <div style={{ color: C.t2 }}>{fmtDT(r.created_at)} · {r.model} {r.feature ? `· ${r.feature}` : ""}</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ color: C.t3 }}>{r.input_tokens}/{r.output_tokens}tok</span>
              <span style={{ fontWeight: 700, color: C.t1 }}>{fmtUSD(r.cost_usd)}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={load} disabled={loading} style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>{loading ? "Đang tải..." : "🔄 Tải lại"}</button>
      </div>
    </div>
  );
}
