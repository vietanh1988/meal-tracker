import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { C, card } from "../theme";
import { fmtDate } from "../fmtDate";
import { useIsMobile } from "../hooks/useIsMobile";

function fmtVND(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("vi-VN") + "đ";
}
function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}
function daysAgo(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function monthLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function BusinessReportTab({ isAdmin }) {
  const mob = useIsMobile();
  const [stats, setStats] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [inactive, setInactive] = useState([]);
  const [loading, setLoading] = useState(true);

  const revCanvasRef = useRef(null);
  const revChartRef = useRef(null);
  const tierCanvasRef = useRef(null);
  const tierChartRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: s }, { data: rev }, { data: inact }] = await Promise.all([
        supabase.rpc("admin_business_stats"),
        supabase.rpc("admin_revenue_by_month", { p_months: 6 }),
        supabase.rpc("admin_inactive_users", { p_limit: 10 }),
      ]);
      setStats((s && s[0]) || null);
      setRevenueByMonth(rev || []);
      setInactive(inact || []);
    } catch (e) { console.error("BusinessReportTab load error:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!revCanvasRef.current || !window.ChartJS || revenueByMonth.length === 0) return;
    if (revChartRef.current) revChartRef.current.destroy();
    revChartRef.current = new window.ChartJS(revCanvasRef.current, {
      type: "bar",
      data: {
        labels: revenueByMonth.map(r => monthLabel(r.month_start)),
        datasets: [{ data: revenueByMonth.map(r => r.revenue), backgroundColor: "#007AFF", borderRadius: 5, borderSkipped: false, maxBarThickness: 32 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#E2E8F0" }, border: { display: false }, ticks: { color: "#64748B", font: { size: 11 }, callback: v => (v / 1000) + "k" } },
          x: { grid: { display: false }, border: { display: false }, ticks: { color: "#64748B", font: { size: 11 } } },
        },
      },
    });
    return () => { if (revChartRef.current) revChartRef.current.destroy(); };
  }, [revenueByMonth]);

  useEffect(() => {
    if (!tierCanvasRef.current || !window.ChartJS || !stats) return;
    if (tierChartRef.current) tierChartRef.current.destroy();
    tierChartRef.current = new window.ChartJS(tierCanvasRef.current, {
      type: "bar",
      data: {
        labels: ["Free", "Trial", "Premium"],
        datasets: [{ data: [stats.free_count, stats.trial_count, stats.premium_count], backgroundColor: ["#94A3B8", "#FACC15", "#007AFF"], borderRadius: 5, borderSkipped: false }],
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: "#E2E8F0" }, border: { display: false }, ticks: { color: "#64748B", font: { size: 11 } } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: "#64748B", font: { size: 12 } } },
        },
      },
    });
    return () => { if (tierChartRef.current) tierChartRef.current.destroy(); };
  }, [stats]);

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;
  if (loading || !stats) return <div style={card}>Đang tải...</div>;

  const conversionRate = stats.total_users > 0 ? Math.round((stats.premium_count / stats.total_users) * 1000) / 10 : 0;
  const inactiveTotal = (inactive[0] && Number(inactive[0].total_count)) || 0;

  return (
    <div style={{ ...card, maxWidth: mob ? "100%" : 1100, margin: "0 auto" }}>
      <div style={{ fontSize: mob ? 18 : 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>📊 Báo cáo kinh doanh</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Doanh thu, gói cước và tỷ lệ chuyển đổi</div>

      <div style={{ display: "grid", gridTemplateColumns: mob ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>💰 Tổng doanh thu</div>
          <div style={{ fontSize: mob ? 17 : 22, fontWeight: 800, color: C.t1, marginTop: 4 }}>{fmtVND(stats.total_revenue)}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>📅 Doanh thu tháng này</div>
          <div style={{ fontSize: mob ? 17 : 22, fontWeight: 800, color: C.green, marginTop: 4 }}>{fmtVND(stats.revenue_this_month)}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>⭐ User Premium</div>
          <div style={{ fontSize: mob ? 17 : 22, fontWeight: 800, color: C.primary, marginTop: 4 }}>{stats.premium_count}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>📈 Tỷ lệ chuyển đổi</div>
          <div style={{ fontSize: mob ? 17 : 22, fontWeight: 800, color: C.t1, marginTop: 4 }}>{conversionRate}%</div>
        </div>
      </div>

      <div style={{ background: C.goldBg, borderRadius: 12, border: `1px solid #FDE68A`, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>⏰ User không hoạt động (&gt;30 ngày)</div>
        <div style={{ fontSize: mob ? 17 : 22, fontWeight: 800, color: "#92400E", marginTop: 4 }}>{inactiveTotal} user</div>
      </div>

      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: mob ? "14px 14px" : "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 12 }}>📊 Doanh thu 6 tháng gần nhất</div>
        <div style={{ position: "relative", width: "100%", height: mob ? 160 : 200 }}><canvas ref={revCanvasRef}/></div>
      </div>

      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: mob ? "14px 14px" : "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 10 }}>👥 Phân bổ user theo gói</div>
        <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12, color: C.t2, fontWeight: 600, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#94A3B8" }}/>Free · {stats.free_count}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#FACC15" }}/>Trial · {stats.trial_count}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#007AFF" }}/>Premium · {stats.premium_count}</span>
        </div>
        <div style={{ position: "relative", width: "100%", height: 130 }}><canvas ref={tierCanvasRef}/></div>
      </div>

      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: mob ? "14px 14px" : "16px 18px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 10 }}>💤 Danh sách user không hoạt động</div>
        {inactive.length === 0 && <div style={{ fontSize: 13, color: C.t3 }}>Không có user nào &gt;30 ngày chưa quay lại 🎉</div>}
        {inactive.map(u => {
          const d = daysAgo(u.last_sign_in_at);
          return mob ? (
            <div key={u.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 700, color: C.t1, fontSize: 13 }}>{u.username}</div>
                <div style={{ color: "#92400E", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{d} ngày</div>
              </div>
              <div style={{ color: C.t3, fontSize: 12, marginTop: 2 }}>{u.email}</div>
              <div style={{ color: C.t2, fontSize: 11, marginTop: 2 }}>🕐 {fmtDT(u.last_sign_in_at)}</div>
            </div>
          ) : (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 700, color: C.t1 }}>{u.username}</div>
                <div style={{ color: C.t3, fontSize: 12 }}>{u.email}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.t2 }}>{fmtDT(u.last_sign_in_at)}</div>
                <div style={{ color: "#92400E", fontSize: 12, fontWeight: 600 }}>{d} ngày trước</div>
              </div>
            </div>
          );
        })}
        {inactiveTotal > inactive.length && <div style={{ fontSize: 12, color: C.t3, marginTop: 8, textAlign: "center" }}>và {inactiveTotal - inactive.length} user khác — vào "Quản lý User" để xem đầy đủ</div>}
      </div>
    </div>
  );
}
