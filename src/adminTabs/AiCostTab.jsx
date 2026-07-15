import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { C, card } from "../theme";
import { fmtDate } from "../fmtDate";

function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}

function fmtUSD(n) {
  const v = Number(n) || 0;
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

const CHART_COLORS = [C.primary, C.mint, C.violet, C.gold, C.secondary, C.red];

function BarChart({ data, labelKey, valueKey }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 0.0001);
  return (
    <div style={{ marginBottom: 16 }}>
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const pct = Math.max((v / max) * 100, 2);
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t2, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{d[labelKey]}</span>
              <span style={{ fontWeight: 700, color: C.t1 }}>{fmtUSD(v)}</span>
            </div>
            <div style={{ height: 8, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 4, transition: "width .3s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AiCostTab({ isAdmin }) {
  const [summary, setSummary] = useState(null);
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
      const [{ data: s }, { data: bm }, { data: bf }, { data: bu }, { data: r }] = await Promise.all([
        supabase.rpc("admin_ai_cost_summary"),
        supabase.rpc("admin_ai_cost_by_model_7d"),
        supabase.rpc("admin_ai_cost_by_feature_7d"),
        supabase.rpc("admin_ai_cost_by_user_7d", { p_limit: 30 }),
        supabase.rpc("admin_ai_cost_recent", { p_limit: 20 }),
      ]);
      setSummary((s && s[0]) || null);
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

      {byModel.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 12 }}>Theo model (7 ngày)</div>
          <BarChart data={byModel} labelKey="model" valueKey="total_cost" />
          <div style={{ fontSize: 11, color: C.t3, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            {byModel.map(m => `${m.model}: ${m.calls} lượt · ${m.total_input_tokens?.toLocaleString()} in / ${m.total_output_tokens?.toLocaleString()} out`).join("  ·  ")}
          </div>
        </div>
      )}

      {byFeature.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 12 }}>Theo tính năng (7 ngày)</div>
          <BarChart data={byFeature} labelKey="feature" valueKey="total_cost" />
        </div>
      )}

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
