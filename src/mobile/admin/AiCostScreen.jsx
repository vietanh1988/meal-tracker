// Quản trị › Chi phí AI (bản vẽ 107, chốt 16/10) — thay tab cũ adminTabs/AiCostTab.jsx.
// Cùng 6 RPC như cũ (admin_ai_cost_summary / _daily(14) / _by_model_7d / _by_feature_7d / _by_user_7d(30) / _recent(20))
// + admin_ai_cost_by_user_detail khi chạm 1 user để xổ chi tiết.
//  - 3 ô số hôm nay / 7 ngày / 30 ngày + số lượt
//  - Cột 14 ngày (đủ 14 ngày theo giờ VN, ngày không gọi = 0), hôm nay tô nổi
//  - Theo tính năng và theo mô hình xếp dọc (thanh ngang), tên tính năng tiếng Việt thay mã
//  - Theo user (chạm xổ chi tiết), 20 lượt gọi gần nhất, nút tải lại ở góc, lỗi → Thử lại
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { DK } from "../../theme";
import { todayVN, toVNDate, fmtVN, nowVNParts, addDays, dateList } from "../../lib/dateVN";
import { SubPage, Icon } from "../ui";
import { Sec, Card, Row, Tile, Tiles, Pill, Loading, ErrorBox, Empty, RefreshBtn, Bars, HBar, fmtUSD } from "./adminUI";

export const FEATURE_VN = {
  menu_gen: "AI tạo thực đơn",
  chat: "Chat AI",
  macro_lookup: "AI tính macro",
  photo_macro: "Chụp ảnh món",
  weight_advice: "Tư vấn cân nặng",
  ping_test: "Thử kết nối",
};
const featVN = (f) => (f ? FEATURE_VN[f] || f : "Khác");
const comma = (s) => s.replace(".", ",");
// Số tiền: dùng fmtUSD của bộ chung; số rất nhỏ (< 1 xu) thì hiện 4 chữ số để không thành $0,00
const money = (n) => { const v = Number(n) || 0; return v > 0 && v < 0.01 ? comma(`$${v.toFixed(4)}`) : fmtUSD(v); };
// 1 lượt gọi: 3 chữ số thập phân ($0,012)
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

export function AiCostScreen({ onBack, isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(false);
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
      console.error("AiCostScreen load error:", e);
      setErr(true);
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

  const sub = "Token + tiền thật mỗi lần gọi";
  if (!isAdmin) return (
    <SubPage dark title="Chi phí AI" subtitle={sub} onBack={onBack}>
      <Empty>Chỉ Admin mới xem được trang này.</Empty>
    </SubPage>
  );

  const right = <RefreshBtn onClick={load} busy={loading} />;
  let body;
  if (err && !loading) body = <ErrorBox text="Chưa tải được chi phí AI." onRetry={load} />;
  else if (!data) body = <Loading rows={4} />;
  else {
    const { summary, daily, byModel, byFeature, byUser, recent } = data;
    // Đủ 14 ngày theo giờ VN (ngày không có lượt gọi = 0)
    const today = todayVN();
    const costByDay = {};
    daily.forEach((d) => { const raw = String(d.day || ""); const k = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : toVNDate(new Date(raw)); costByDay[k] = (costByDay[k] || 0) + (Number(d.cost_usd) || 0); });
    const days = dateList(addDays(today, -13), today);
    const bars = days.map((k) => ({ value: costByDay[k] || 0, hi: k === today, label: null }));
    const maxF = Math.max(0.0001, ...byFeature.map((x) => Number(x.total_cost) || 0));
    const maxM = Math.max(0.0001, ...byModel.map((x) => Number(x.total_cost) || 0));

    body = (
      <>
        <Tiles>
          <Tile testid="adm-cost-today" n={money(summary?.cost_today)} label="Hôm nay" sub={`${summary?.calls_today ?? 0} lượt`} color={DK.amber} />
          <Tile testid="adm-cost-7d" n={money(summary?.cost_7d)} label="7 ngày" sub={`${summary?.calls_7d ?? 0} lượt`} />
          <Tile testid="adm-cost-30d" n={money(summary?.cost_30d)} label="30 ngày" sub={`${summary?.calls_30d ?? 0} lượt`} />
        </Tiles>

        <Sec>14 ngày gần nhất</Sec>
        <Card pad="12px 14px 10px 14px">
          <div role="img" aria-label={`Chi phí AI 14 ngày, hôm nay ${money(costByDay[today] || 0)}`}>
            <Bars bars={bars} h={90} showValues={false} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DK.t2, marginTop: 4 }}>
            <span>{fmtVN(days[0])}</span><span style={{ color: DK.t1, fontWeight: 800 }}>hôm nay · {money(costByDay[today] || 0)}</span>
          </div>
        </Card>

        <Sec>Theo tính năng · 7 ngày</Sec>
        {byFeature.length === 0 ? <Empty>Chưa có lượt gọi nào.</Empty> : (
          <Card pad="4px 14px">
            {byFeature.map((f, i) => <HBar key={f.feature || i} label={featVN(f.feature)} value={money(f.total_cost)} pct={((Number(f.total_cost) || 0) / maxF) * 100} />)}
          </Card>
        )}

        <Sec>Theo mô hình · 7 ngày</Sec>
        {byModel.length === 0 ? <Empty>Chưa có lượt gọi nào.</Empty> : (
          <Card pad="4px 14px">
            {byModel.map((m, i) => <HBar key={m.model || i} label={m.model || "–"} value={money(m.total_cost)} pct={((Number(m.total_cost) || 0) / maxM) * 100} />)}
          </Card>
        )}

        <Sec>Theo user · 7 ngày</Sec>
        {byUser.length === 0 ? <Empty>Chưa có lượt gọi nào.</Empty> : (
          <Card>
            {byUser.map((u, i) => {
              const open = expanded === u.user_id;
              const last = i === byUser.length - 1;
              return (
                <div key={u.user_id || i} style={{ borderBottom: last ? "none" : `1px solid ${DK.line}` }}>
                  <Row last onClick={() => toggleUser(u.user_id)} testid="adm-cost-user" style={{ minHeight: 56 }}>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, padding: "8px 0" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.username || "(không tên)"}</span>
                        {u.tier && <Pill h={18}>{u.tier}</Pill>}
                      </span>
                      <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.calls ?? 0} lượt · {tok(u.total_input_tokens)} / {tok(u.total_output_tokens)} token</span>
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>{money(u.total_cost)}</span>
                    <span aria-hidden="true" style={{ display: "flex", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>{Icon.chev(16, DK.chev)}</span>
                  </Row>
                  {open && (
                    <div data-testid="adm-cost-user-detail" style={{ margin: "0 0 10px 0", padding: "6px 10px", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
                      {loadingDetail && <div style={{ fontSize: 12, color: DK.t3, padding: "6px 0" }}>Đang tải…</div>}
                      {!loadingDetail && detail?.length === 0 && <div style={{ fontSize: 12, color: DK.t3, padding: "6px 0" }}>Không có dữ liệu 30 ngày qua.</div>}
                      {!loadingDetail && detail?.map((d, j) => (
                        <div key={j} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, padding: "5px 0" }}>
                          <span style={{ minWidth: 0, color: DK.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{featVN(d.feature)} · {d.model}</span>
                          <span style={{ color: DK.t2, whiteSpace: "nowrap" }}>{d.calls} lượt · <b style={{ color: DK.t1 }}>{money(d.total_cost)}</b></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        <Sec>20 lượt gọi gần nhất</Sec>
        {recent.length === 0 ? <Empty>Chưa có dữ liệu.</Empty> : (
          <Card>
            {recent.map((r, i) => (
              <Row key={i} last={i === recent.length - 1} style={{ minHeight: 50 }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1, padding: "6px 0" }}>
                  <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><b>{featVN(r.feature)}</b><span style={{ color: DK.t3 }}> · {r.model}</span></span>
                  <span style={{ fontSize: 12, color: DK.t3 }}>{hhmm(r.created_at)} · {tok(r.input_tokens)}/{tok(r.output_tokens)}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>{money3(r.cost_usd)}</span>
              </Row>
            ))}
          </Card>
        )}
      </>
    );
  }

  return (
    <SubPage dark title="Chi phí AI" subtitle={sub} onBack={onBack} right={right}>
      <div data-testid="adm-cost" style={{ paddingBottom: 32 }}>{body}</div>
    </SubPage>
  );
}
