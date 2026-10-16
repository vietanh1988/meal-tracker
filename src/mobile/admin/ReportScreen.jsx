// Quản trị › Báo cáo kinh doanh (bản vẽ 99, nền tối). Dữ liệu giống src/adminTabs/BusinessReportTab.jsx:
// admin_business_stats · admin_revenue_by_month(6) · admin_inactive_users(10). Chỉ xem.
// Sửa: lỗi tải → ErrorBox "Thử lại" (tab cũ kẹt "Đang tải..."); nút tải lại ở góc.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { DK } from "../../theme";
import { SubPage } from "../ui";
import { Sec, Card, Row, Tile, Tiles, Pill, Loading, ErrorBox, Empty, RefreshBtn, Bars, fmtVND, VIOLET } from "./adminUI";
import { toVNDate, todayVN, diffDays } from "../../lib/dateVN";

const monthLabel = (s) => { const [y, m] = String(s || "").slice(0, 10).split("-"); return y && m ? `${m}/${y.slice(2)}` : "–"; };
const kFmt = (v) => `${Math.round((Number(v) || 0) / 1000)}k`;
const daysSince = (iso) => {
  if (!iso) return null;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : diffDays(toVNDate(dt), todayVN());
};

export function ReportScreen({ onBack, isAdmin }) {
  const [stats, setStats] = useState(null);
  const [rev, setRev] = useState([]);
  const [inactive, setInactive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true); setErr(false);
    try {
      const [s, r, i] = await Promise.all([
        supabase.rpc("admin_business_stats"),
        supabase.rpc("admin_revenue_by_month", { p_months: 6 }),
        supabase.rpc("admin_inactive_users", { p_limit: 10 }),
      ]);
      const e = s.error || r.error || i.error;
      if (e) throw e;
      const st = (s.data && s.data[0]) || null;
      if (!st) throw new Error("Không có số liệu");
      setStats(st);
      setRev(r.data || []);
      setInactive(i.data || []);
    } catch (e) { console.error("ReportScreen load error:", e); setErr(true); }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const total = Number(stats?.total_users) || 0;
  const free = Number(stats?.free_count) || 0, trial = Number(stats?.trial_count) || 0, prem = Number(stats?.premium_count) || 0;
  const conv = total > 0 ? Math.round((prem / total) * 1000) / 10 : 0;
  const inactiveTotal = (inactive[0] && Number(inactive[0].total_count)) || 0;
  const thisMonth = todayVN().slice(0, 7);
  const bars = rev.map((m) => ({ label: monthLabel(m.month_start), value: Number(m.revenue) || 0, hi: String(m.month_start || "").slice(0, 7) === thisMonth }));
  const tierSum = free + trial + prem;

  return (
    <SubPage dark title="Báo cáo kinh doanh" subtitle="Doanh thu, gói cước, chuyển đổi" onBack={onBack}
      right={isAdmin ? <RefreshBtn onClick={load} busy={loading} /> : null}>
      <div data-testid="adm-report">
        {!isAdmin ? <Empty>Chỉ Admin mới xem được trang này.</Empty>
          : loading && !stats ? <Loading rows={4} />
          : err ? <ErrorBox text="Chưa tải được báo cáo." onRetry={load} />
          : stats && (
            <>
              <Tiles grid>
                <Tile n={fmtVND(stats.total_revenue)} label="Tổng doanh thu" testid="adm-report-total" />
                <Tile n={fmtVND(stats.revenue_this_month)} label="Tháng này" color={DK.green} testid="adm-report-month" />
                <Tile n={prem.toLocaleString("vi-VN")} label="User Premium" color={DK.link} />
                <Tile n={`${conv.toLocaleString("vi-VN")}%`} label="Tỷ lệ chuyển đổi" color={VIOLET} sub={`${prem} / ${total} user`} />
              </Tiles>

              <Sec>Doanh thu 6 tháng</Sec>
              <Card pad="14px 12px 12px 12px">
                {bars.length === 0
                  ? <span style={{ display: "block", fontSize: 13, color: DK.t3, padding: "8px 0" }}>Chưa có doanh thu</span>
                  : <Bars bars={bars} h={100} fmt={kFmt} />}
              </Card>

              <Sec>User theo gói · {total}</Sec>
              <Card pad="14px">
                <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
                  {tierSum > 0 && <>
                    <span style={{ flex: free, background: "rgba(255,255,255,0.35)" }} />
                    <span style={{ flex: trial, background: DK.amber }} />
                    <span style={{ flex: prem, background: "#3B82F6" }} />
                  </>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 10, fontSize: 12, color: DK.t2 }}>
                  <span>● Free {free}</span>
                  <span style={{ color: DK.amber }}>● Trial {trial}</span>
                  <span style={{ color: DK.link }}>● Premium {prem}</span>
                </div>
              </Card>

              <Sec>Không hoạt động &gt; 30 ngày · {inactiveTotal} user</Sec>
              {inactive.length === 0 ? <Empty>Không có user nào &gt;30 ngày chưa quay lại</Empty> : (
                <Card>
                  {inactive.map((u, idx) => {
                    const d = daysSince(u.last_sign_in_at);
                    const last = idx === inactive.length - 1 && inactiveTotal <= inactive.length;
                    return (
                      <Row key={u.id || idx} last={last}>
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.username || "–"}</span>
                          <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email || ""}</span>
                        </span>
                        <Pill tone="amber" h={26}>{d == null ? "–" : `${d} ngày`}</Pill>
                      </Row>
                    );
                  })}
                  {inactiveTotal > inactive.length && <span style={{ display: "block", padding: "8px 0 12px 0", fontSize: 12, color: DK.t3 }}>và {inactiveTotal - inactive.length} user khác</span>}
                </Card>
              )}
            </>
          )}
        <div style={{ height: 24 }} />
      </div>
    </SubPage>
  );
}
