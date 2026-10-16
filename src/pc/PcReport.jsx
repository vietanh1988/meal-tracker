// Quản trị PC › Báo cáo kinh doanh. Dữ liệu giống src/mobile/admin/ReportScreen.jsx (+ tab cũ BusinessReportTab):
//  admin_business_stats · admin_revenue_by_month(6) · admin_inactive_users(10). Chỉ xem (không ghi DB).
//  - Hàng 4 ô số: Tổng doanh thu, Tháng này, User Premium, Tỷ lệ chuyển đổi (Premium / tổng user).
//  - Cột doanh thu 6 tháng (tự vẽ, tháng hiện tại màu xanh lá) · thẻ "User theo gói" (thanh xếp chồng + số & %).
//  - Bảng "Không hoạt động > 30 ngày" (10 user đầu + "và N user khác").
//  - Lỗi tải → ErrorBox "Thử lại"; nút "Làm mới" trên thanh trên.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toVNDate, todayVN, diffDays } from "../lib/dateVN";
import { PC } from "../theme";
import { Btn, Pill, Card, ErrorBox, Loading, headRow, bodyRow, cell, vnd, vnInt, vnDec, fmtDT } from "./pcUI";

const INACT_COLS = "1.4fr 2fr 1fr 110px";
const TIERS = [
  { k: "free", label: "Free", color: "#CBD5E1" },
  { k: "trial", label: "Trial", color: "#F59E0B" },
  { k: "premium", label: "Premium", color: "#3B82F6" },
];
const monthLabel = (s) => { const [y, m] = String(s || "").slice(0, 10).split("-"); return y && m ? `${m}/${y.slice(2)}` : "–"; };
const kFmt = (v) => `${vnInt((Number(v) || 0) / 1000)}k`;
const daysSince = (iso) => {
  if (!iso) return null;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : diffDays(toVNDate(dt), todayVN());
};

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

export function PcReport({ top, isAdmin = true }) {
  const [stats, setStats] = useState(null);
  const [rev, setRev] = useState([]);
  const [inactive, setInactive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true); setErr(null);
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
    } catch (e) { console.error("PcReport load error:", e); setErr(e?.message || "Lỗi tải"); }
    setLoading(false);
  }, [isAdmin]);
  useEffect(() => { load(); }, [load]);

  const total = Number(stats?.total_users) || 0;
  const cnt = { free: Number(stats?.free_count) || 0, trial: Number(stats?.trial_count) || 0, premium: Number(stats?.premium_count) || 0 };
  const prem = cnt.premium;
  const conv = total > 0 ? Math.round((prem / total) * 1000) / 10 : 0;
  const tierSum = cnt.free + cnt.trial + cnt.premium;
  const pctOf = (n) => (tierSum > 0 ? Math.round((n / tierSum) * 1000) / 10 : 0);
  const inactiveTotal = (inactive[0] && Number(inactive[0].total_count)) || 0;
  const thisMonth = todayVN().slice(0, 7);
  const bars = rev.map((m) => ({ key: String(m.month_start), label: monthLabel(m.month_start), value: Number(m.revenue) || 0, hi: String(m.month_start || "").slice(0, 7) === thisMonth }));
  const maxRev = Math.max(1, ...bars.map((b) => b.value));
  const sum6 = bars.reduce((a, b) => a + b.value, 0);

  return (
    <>
      {top(isAdmin ? <Btn kind="soft" onClick={load} disabled={loading} testid="pc-report-reload">{loading ? "Đang tải…" : "Làm mới"}</Btn> : null)}
      <div data-testid="pc-report_biz" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {!isAdmin ? <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Chỉ Admin mới xem được trang này.</div>
          : err ? <ErrorBox text={`Chưa tải được báo cáo: ${err}`} onRetry={load} />
          : loading && !stats ? <Card><Loading /></Card>
          : stats && <>
            <div style={{ display: "flex", gap: 14 }}>
              <Tile testid="pc-report-total" label="Tổng doanh thu" value={vnd(stats.total_revenue)} color={PC.t1} />
              <Tile testid="pc-report-month" label="Doanh thu tháng này" value={vnd(stats.revenue_this_month)} color="#16A34A" />
              <Tile testid="pc-report-premium" label="User Premium" value={vnInt(prem)} color="#1D4ED8" />
              <Tile testid="pc-report-conv" label="Tỷ lệ chuyển đổi" value={`${vnDec(conv)}%`} color="#6D28D9" sub={`${vnInt(prem)} / ${vnInt(total)} user`} />
            </div>

            <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
              <Card testid="pc-report-revenue" style={{ flex: 1.6, minWidth: 0 }}>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 900 }}>Doanh thu 6 tháng</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>Cộng 6 tháng: <b style={{ color: PC.t1 }}>{vnd(sum6)}</b></span>
                  </span>
                  {bars.length === 0
                    ? <div data-testid="pc-report-rev-empty" style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: PC.t3 }}>Chưa có doanh thu</div>
                    : <div style={{ display: "flex", alignItems: "flex-end", height: 180, gap: 8, borderBottom: `1px solid ${PC.headLine}` }}>
                      {bars.map((b) => (
                        <span key={b.key} title={`Tháng ${b.label}: ${vnd(b.value)}`} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: b.hi ? "#166534" : PC.t3, whiteSpace: "nowrap" }}>{kFmt(b.value)}</span>
                          <span data-testid="pc-report-bar" style={{ width: "56%", maxWidth: 56, height: Math.max(4, Math.round((b.value / maxRev) * 140)), borderRadius: "6px 6px 2px 2px", background: b.hi ? "#22C55E" : "#93C5FD" }} />
                        </span>
                      ))}
                    </div>}
                  {bars.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: -4 }}>
                    {bars.map((b) => <span key={b.key} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 11, fontWeight: b.hi ? 800 : 600, color: b.hi ? PC.t1 : PC.t3 }}>{b.label}</span>)}
                  </div>}
                </div>
              </Card>

              <Card testid="pc-report-tiers" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 900 }}>User theo gói</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>{vnInt(total)} user</span>
                  </span>
                  <div aria-hidden="true" style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "#F1F5F9" }}>
                    {tierSum > 0 && TIERS.map((t) => <span key={t.k} style={{ flex: cnt[t.k], background: t.color }} />)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {TIERS.map((t, i) => (
                      <div key={t.k} data-testid={`pc-report-tier-${t.k}`} style={{ display: "flex", alignItems: "center", gap: 10, height: 40, borderBottom: i === TIERS.length - 1 ? "none" : `1px solid ${PC.rowLine}`, fontSize: 13 }}>
                        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0 }}>{t.label}</span>
                        <span style={{ fontSize: 12, color: PC.t3 }}>{vnDec(pctOf(cnt[t.k]))}%</span>
                        <b style={{ minWidth: 48, textAlign: "right" }}>{vnInt(cnt[t.k])}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <Card testid="pc-report-inactive">
              <div style={{ padding: "14px 16px 10px 16px", display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 900 }}>Không hoạt động &gt; 30 ngày</span>
                <span data-testid="pc-report-inactive-n" style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>{vnInt(inactiveTotal)} user</span>
              </div>
              <div style={{ ...headRow(INACT_COLS), borderRadius: 0 }}><span>NGƯỜI DÙNG</span><span>EMAIL</span><span>ĐĂNG NHẬP CUỐI</span><span>VẮNG</span></div>
              {inactive.length === 0 && <div data-testid="pc-report-inactive-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Không có user nào quá 30 ngày chưa quay lại.</div>}
              {inactive.map((u, idx) => {
                const d = daysSince(u.last_sign_in_at);
                const last = idx === inactive.length - 1 && inactiveTotal <= inactive.length;
                return (
                  <div key={u.id || idx} data-testid="pc-report-inactive-row" className="pc-row" style={{ ...bodyRow(INACT_COLS), borderBottom: last ? "none" : bodyRow(INACT_COLS).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                    <b style={{ ...cell, fontSize: 13 }} title={u.username || ""}>{u.username || "–"}</b>
                    <span style={{ ...cell, color: PC.t2 }} title={u.email || ""}>{u.email || ""}</span>
                    <span style={cell}>{fmtDT(u.last_sign_in_at, { time: false })}</span>
                    <span style={cell}><Pill tone="amber">{d == null ? "–" : `${vnInt(d)} ngày`}</Pill></span>
                  </div>
                );
              })}
              {inactiveTotal > inactive.length && <div style={{ padding: "10px 16px 14px 16px", fontSize: 12, color: PC.t3 }}>và {vnInt(inactiveTotal - inactive.length)} user khác</div>}
            </Card>
          </>}
      </div>
    </>
  );
}
