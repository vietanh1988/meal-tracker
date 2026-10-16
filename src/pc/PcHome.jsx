// Quản trị PC › Tổng quan (bản vẽ 117) = việc cần làm hôm nay:
//  5 ô số (đơn chờ duyệt, góp ý chưa trả lời, món AI chờ duyệt, doanh thu tháng này, chi phí AI 30 ngày),
//  bảng "Đơn chờ duyệt" (5 đơn mới nhất, nút Duyệt mở trang Đơn hàng — không lặp logic duyệt),
//  cột "Doanh thu 6 tháng", thẻ "Sức khoẻ hệ thống" (logic useSystemHealth của tab cũ).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, weekdayOf, fmtVN } from "../lib/dateVN";
import { PC } from "../theme";
import { Btn, Card, ErrorBox, headRow, bodyRow, cell, vnd, vnInt, fmtDT } from "./pcUI";
import { useSystemHealth } from "../adminTabs/SystemHealthTab";

const PKG_LABEL = { "1m": "1 tháng", "3m": "3 tháng", "6m": "6 tháng", "12m": "12 tháng" };
const ORDER_COLS = "2fr 1fr 1fr 1fr 90px";
const WD_FULL = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const PROVIDER = { claude: "Claude", gemini: "Gemini", gpt: "GPT" };

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

function HealthRow({ dot, label, value, last, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, height: 40, borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, fontSize: 13 }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {action}
      <b>{value}</b>
    </div>
  );
}

export function PcHome({ top, go, counts, refreshCounts, appSettings }) {
  const [orders, setOrders] = useState(null);
  const [money, setMoney] = useState(null); // { month, prev, months:[{m,rev}] , cost30, calls30 }
  const [err, setErr] = useState({});
  const health = useSystemHealth(appSettings);

  const load = useCallback(async () => {
    setErr({});
    const [o, st, rv, ai] = await Promise.all([
      supabase.rpc("admin_list_orders", { p_status: "pending", p_limit: 50, p_offset: 0 }),
      supabase.rpc("admin_order_stats"),
      supabase.rpc("admin_revenue_by_month", { p_months: 6 }),
      supabase.rpc("admin_ai_cost_summary"),
    ]);
    const e = {};
    if (o.error) e.orders = o.error.message; else setOrders(o.data || []);
    if (st.error || rv.error || ai.error) e.money = (st.error || rv.error || ai.error).message;
    else {
      const months = (rv.data || []).map((r) => ({ m: String(r.month_start).slice(5, 7), rev: Number(r.revenue) || 0 }));
      const s0 = (st.data && st.data[0]) || {}, a0 = (ai.data && ai.data[0]) || {};
      setMoney({ month: Number(s0.revenue_this_month) || 0, prev: months.length >= 2 ? months[months.length - 2].rev : null, months, cost30: Number(a0.cost_30d) || 0, calls30: Number(a0.calls_30d) || 0 });
    }
    setErr(e);
  }, []);
  useEffect(() => { load(); }, [load]);
  const reloadAll = () => { load(); refreshCounts(); health.reload(); };

  const today = todayVN();
  const old12 = (orders || []).filter((o) => Date.now() - new Date(o.created_at).getTime() > 12 * 3600 * 1000).length;
  const pct = money && money.prev ? Math.round(((money.month - money.prev) / money.prev) * 100) : null;
  const maxRev = Math.max(1, ...((money?.months || []).map((x) => x.rev)));
  const dash = (n) => (n == null ? "–" : vnInt(n));
  const errCount = health.errorSummary?.error_count;
  const prov = appSettings?.ai_provider || "claude";

  return (
    <>
      {top(<Btn kind="soft" onClick={reloadAll} testid="pc-home-reload">⟳ Tải lại</Btn>, "Tổng quan", `${WD_FULL[weekdayOf(today)]} ${fmtVN(today, true)} · việc cần làm hôm nay`)}
      <div data-testid="pc-home" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Tile testid="pc-tile-orders" label="Đơn chờ duyệt" value={dash(counts.orders)} color="#B45309" sub={old12 > 0 ? `${old12} đơn > 12 giờ` : ""} />
          <Tile testid="pc-tile-feedback" label="Góp ý chưa trả lời" value={dash(counts.feedback)} color="#0369A1" />
          <Tile testid="pc-tile-pending" label="Món AI chờ duyệt" value={dash(counts.pending)} color="#047857" />
          <Tile testid="pc-tile-revenue" label="Doanh thu tháng này" value={money ? vnd(money.month) : "–"} color="#16A34A" sub={pct == null ? "" : `${pct >= 0 ? "+" : ""}${pct}% so tháng trước`} />
          <Tile testid="pc-tile-aicost" label="Chi phí AI 30 ngày" value={money ? `$${money.cost30.toFixed(2).replace(".", ",")}` : "–"} color={PC.t1} sub={money ? `${vnInt(money.calls30)} lượt` : ""} />
        </div>
        {err.money && <ErrorBox text={`Chưa tải được doanh thu / chi phí AI: ${err.money}`} onRetry={load} />}

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1.6, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <Card testid="pc-home-orders">
              <div style={{ padding: "14px 16px 6px 16px", fontSize: 14, fontWeight: 900 }}>Đơn chờ duyệt</div>
              {err.orders ? <div style={{ padding: "0 16px 14px 16px" }}><ErrorBox text={`Chưa tải được đơn: ${err.orders}`} onRetry={load} /></div> : <>
                <div style={headRow(ORDER_COLS)}><span>KHÁCH</span><span>GÓI</span><span>SỐ TIỀN</span><span>TẠO LÚC</span><span /></div>
                {orders == null && <div style={{ padding: 16, fontSize: 13, color: PC.t3 }}>Đang tải…</div>}
                {orders && orders.length === 0 && <div data-testid="pc-home-orders-empty" style={{ padding: 16, fontSize: 13, color: PC.t3 }}>Không có đơn nào chờ duyệt.</div>}
                {(orders || []).slice(0, 5).map((o, i, arr) => (
                  <div key={o.id} data-testid="pc-home-order" style={{ ...bodyRow(ORDER_COLS, true), borderBottom: i === arr.length - 1 ? "none" : bodyRow(ORDER_COLS).borderBottom, borderRadius: i === arr.length - 1 ? "0 0 14px 14px" : 0 }}>
                    <span style={cell} title={`${o.username} · ${o.email}`}>{o.username} · {o.email}</span>
                    <span style={cell}>{PKG_LABEL[o.package] || o.package}</span>
                    <span style={cell}>{vnd(o.amount)}</span>
                    <span style={cell}>{fmtDT(o.created_at)}</span>
                    <span style={cell}><Btn kind="green" onClick={() => go("orders")} testid="pc-home-approve" title="Mở trang Đơn hàng để duyệt">Duyệt</Btn></span>
                  </div>
                ))}
              </>}
            </Card>

            <Card testid="pc-home-revenue">
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 900 }}>Doanh thu 6 tháng</span>
                <div style={{ display: "flex", alignItems: "flex-end", height: 150, gap: 6 }}>
                  {(money?.months || []).map((x, i, arr) => (
                    <span key={x.m + i} title={`Tháng ${x.m}: ${vnd(x.rev)}`} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      <span data-testid="pc-rev-bar" style={{ width: "60%", height: Math.max(4, Math.round((x.rev / maxRev) * 130)), borderRadius: "6px 6px 2px 2px", background: i === arr.length - 1 ? "#22C55E" : "#93C5FD" }} />
                      <span style={{ fontSize: 11, color: PC.t3 }}>{x.m}</span>
                    </span>
                  ))}
                  {!money && <span style={{ fontSize: 13, color: PC.t3, alignSelf: "center" }}>{err.money ? "—" : "Đang tải…"}</span>}
                </div>
              </div>
            </Card>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <Card testid="pc-home-health">
              <div style={{ padding: "14px 16px" }}>
                <span style={{ fontSize: 14, fontWeight: 900 }}>Sức khoẻ hệ thống</span>
                <HealthRow dot={health.dbPing ? (health.dbPing.ok ? "#22C55E" : "#EF4444") : PC.t4} label="Supabase" value={health.loading || !health.dbPing ? "–" : health.dbPing.ok ? `OK · ${health.dbPing.ms} ms` : "Không phản hồi"} />
                <HealthRow dot={health.aiPing ? (health.aiPing.ok ? "#22C55E" : "#EF4444") : PC.t4} label={`AI (${PROVIDER[prov] || prov})`}
                  action={!health.aiPing && <Btn kind="soft" style={{ height: 26, padding: "0 10px", fontSize: 12 }} disabled={health.pinging} onClick={health.pingAI} testid="pc-home-ping-ai" title="Gửi 1 câu ngắn tới AI (tốn rất ít phí)">{health.pinging ? "Đang thử…" : "Kiểm tra"}</Btn>}
                  value={health.aiPing ? (health.aiPing.ok ? `OK · ${String((health.aiPing.ms / 1000).toFixed(1)).replace(".", ",")} s` : "Lỗi") : ""} />
                <HealthRow dot="#22C55E" label="Push gửi thành công 24h" value={health.loading ? "–" : health.pushRate != null ? `${health.pushRate}%` : "Chưa có"} />
                <HealthRow dot={errCount > 0 ? "#F59E0B" : "#22C55E"} label="Lỗi app 24h" value={health.loading ? "–" : vnInt(errCount || 0)} action={errCount > 0 && <Btn kind="soft" style={{ height: 26, padding: "0 10px", fontSize: 12 }} onClick={() => go("health")} testid="pc-home-errors">Xem</Btn>} />
                <HealthRow dot="#3B82F6" label="Đang online (15 phút)" value={health.loading ? "–" : `${vnInt(health.activeUsers || 0)} user`} last />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
