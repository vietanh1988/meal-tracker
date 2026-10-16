// Quản trị PC › Sức khoẻ & lỗi. Gộp logic 2 tab cũ (không đổi gọi DB):
//  - src/adminTabs/SystemHealthTab.jsx → hook useSystemHealth: RPC admin_active_users_count(15 phút), admin_error_summary_24h,
//    admin_push_summary_24h; đo thời gian phản hồi Supabase. Ping AI (ai-proxy, feature "ping_test") CHỈ chạy khi admin bấm "Kiểm tra".
//  - src/adminTabs/ErrorLogsTab.jsx → bảng client_errors 50 lỗi gần nhất + tên user (profiles); bấm 1 dòng mở tại chỗ: stack, component stack, trình duyệt.
//  - Hàng 5 ô số trên cùng; nút "Tải lại" trên thanh trên tải lại cả chỉ số lẫn bảng lỗi.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useSystemHealth } from "../adminTabs/SystemHealthTab";
import { PC } from "../theme";
import { Btn, Pill, Card, ErrorBox, Loading, headRow, bodyRow, cell, secLbl, vnInt, fmtDT } from "./pcUI";

const COLS = "110px 1.1fr 2.6fr 1.6fr 28px";
const PROVIDER = { claude: "Claude", gemini: "Gemini", gpt: "GPT" };
const sec = (ms) => String((ms / 1000).toFixed(1)).replace(".", ",");

function Tile({ label, value, color = PC.t1, sub, testid, dot, action }) {
  return (
    <Card testid={testid} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4, minHeight: 104 }}>
        <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {dot && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: dot, flexShrink: 0 }} />}{label}
        </span>
        <span data-testid={testid ? `${testid}-value` : undefined} style={{ fontSize: 24, fontWeight: 900, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
        {action || <span style={{ fontSize: 12, color: PC.t4, minHeight: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={sub || ""}>{sub || ""}</span>}
      </div>
    </Card>
  );
}

const pre = { margin: 0, fontSize: 11.5, lineHeight: 1.5, color: PC.t2, background: "#FFFFFF", border: `1px solid ${PC.field}`, borderRadius: 10, padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 260, overflowY: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

export function PcHealth({ top, appSettings }) {
  const health = useSystemHealth(appSettings);
  const [errors, setErrors] = useState(null);
  const [usernames, setUsernames] = useState({});
  const [loadErr, setLoadErr] = useState(null);
  const [openId, setOpenId] = useState(null);

  const loadErrors = useCallback(async () => {
    setLoadErr(null);
    try {
      const { data, error } = await supabase.from("client_errors").select("id,user_id,message,stack,component_stack,url,user_agent,created_at").order("created_at", { ascending: false }).limit(50);
      if (error) { setLoadErr(error.message || "Lỗi tải"); setErrors([]); return; }
      setErrors(data || []);
      const ids = [...new Set((data || []).map((e) => e.user_id).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,username").in("id", ids);
        const map = {};
        (profiles || []).forEach((p) => { map[p.id] = p.username; });
        setUsernames(map);
      }
    } catch (e) { setLoadErr(e.message || "Lỗi tải"); setErrors([]); }
  }, []);
  useEffect(() => { loadErrors(); }, [loadErrors]);

  const reloadAll = () => { health.reload(); setErrors(null); loadErrors(); };

  const { loading, dbPing, aiPing, pinging, errorSummary, pushSummary, pushRate, activeUsers } = health;
  const errCount = Number(errorSummary?.error_count) || 0;
  const prov = appSettings?.ai_provider || "claude";
  const who = (e) => usernames[e.user_id] || (e.user_id ? e.user_id.slice(0, 8) : "Ẩn danh");

  return (
    <>
      {top(<Btn kind="soft" onClick={reloadAll} disabled={loading} testid="pc-health-reload">{loading ? "Đang tải…" : "Tải lại"}</Btn>)}
      <div data-testid="pc-health" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Tile testid="pc-health-active" label="Đang online (15 phút)" color="#1D4ED8" value={loading ? "–" : `${vnInt(activeUsers || 0)} user`} />
          <Tile testid="pc-health-errors" label="Lỗi app 24 giờ" color={loading ? PC.t1 : errCount > 0 ? "#DC2626" : "#16A34A"} value={loading ? "–" : vnInt(errCount)}
            sub={errorSummary?.last_error_at ? `Gần nhất: ${fmtDT(errorSummary.last_error_at)}` : ""} />
          <Tile testid="pc-health-push" label="Push gửi thành công 24 giờ" value={loading ? "–" : pushRate != null ? `${pushRate}%` : "Chưa có"}
            sub={pushSummary && Number(pushSummary.batch_count) > 0 ? `${vnInt(pushSummary.total_sent)}/${vnInt(pushSummary.total_recipients)} người · ${vnInt(pushSummary.batch_count)} lượt gửi` : ""} />
          <Tile testid="pc-health-db" label="Supabase" dot={dbPing ? (dbPing.ok ? "#22C55E" : "#EF4444") : PC.t4}
            color={dbPing && !dbPing.ok ? "#DC2626" : PC.t1} value={loading || !dbPing ? "–" : dbPing.ok ? `${vnInt(dbPing.ms)} ms` : "Không phản hồi"} sub={dbPing?.ok ? "Thời gian phản hồi" : ""} />
          <Tile testid="pc-health-ai" label={`AI (${PROVIDER[prov] || prov})`} dot={aiPing ? (aiPing.ok ? "#22C55E" : "#EF4444") : PC.t4}
            color={aiPing && !aiPing.ok ? "#DC2626" : PC.t1} value={aiPing ? (aiPing.ok ? `${sec(aiPing.ms)} s` : "Lỗi") : "Chưa thử"}
            action={<span style={{ display: "flex" }}><Btn kind="soft" style={{ height: 26, padding: "0 10px", fontSize: 12 }} disabled={pinging} onClick={health.pingAI} testid="pc-health-ping-ai" title="Gửi 1 câu ngắn tới AI (tốn rất ít phí)">{pinging ? "Đang thử…" : aiPing ? "Thử lại" : "Kiểm tra"}</Btn></span>} />
        </div>

        <Card testid="pc-health-log">
          <div style={{ padding: "14px 16px 10px 16px", display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 900 }}>Lỗi app gần đây</span>
            <span style={{ fontSize: 12, color: PC.t3, flex: 1, minWidth: 0 }}>Lỗi user gặp (ErrorBoundary tự ghi) · 50 lỗi gần nhất · bấm 1 dòng xem stack</span>
            {errors && <span data-testid="pc-health-log-count" style={{ fontSize: 12, color: PC.t3 }}>{vnInt(errors.length)} lỗi</span>}
          </div>
          {loadErr && <div style={{ padding: "0 16px 12px 16px" }}><ErrorBox text={`Chưa tải được lỗi app: ${loadErr}`} onRetry={loadErrors} /></div>}
          <div style={{ ...headRow(COLS), borderRadius: 0, borderTop: `1px solid ${PC.headLine}` }}><span>THỜI GIAN</span><span>NGƯỜI DÙNG</span><span>LỖI</span><span>TRANG</span><span /></div>
          {errors == null && <Loading />}
          {errors && errors.length === 0 && !loadErr && <div data-testid="pc-health-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Chưa ghi nhận lỗi nào.</div>}
          {(errors || []).map((e, i, arr) => {
            const open = openId === e.id;
            const last = i === arr.length - 1;
            return (
              <div key={e.id}>
                <button data-testid="pc-health-row" aria-expanded={open} onClick={() => setOpenId(open ? null : e.id)} className="pc-row pc-click"
                  style={{ ...bodyRow(COLS, open), cursor: "pointer", borderBottom: last && !open ? "none" : bodyRow(COLS).borderBottom, borderRadius: last && !open ? "0 0 14px 14px" : 0 }}>
                  <span style={{ ...cell, color: PC.t3 }}>{fmtDT(e.created_at)}</span>
                  <span style={cell} title={e.user_id || ""}>{e.user_id ? who(e) : <Pill tone="gray">Ẩn danh</Pill>}</span>
                  <span style={{ ...cell, fontWeight: 700, color: "#991B1B" }} title={e.message || ""}>{e.message || "(không có nội dung lỗi)"}</span>
                  <span style={{ ...cell, color: PC.t3 }} title={e.url || ""}>{e.url || "—"}</span>
                  <span aria-hidden="true" style={{ ...cell, color: PC.t4, textAlign: "center" }}>{open ? "▴" : "▾"}</span>
                </button>
                {open && (
                  <div data-testid="pc-health-detail" style={{ padding: "12px 16px 14px 16px", background: PC.editBg, display: "flex", flexDirection: "column", gap: 8, borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", overflowWrap: "anywhere" }}>{e.message || "(không có nội dung lỗi)"}</span>
                    {e.url && <span style={{ fontSize: 12, color: PC.t3, overflowWrap: "anywhere" }}>{e.url}</span>}
                    {e.stack && <><span style={secLbl}>STACK</span><pre data-testid="pc-health-stack" style={pre}>{e.stack}</pre></>}
                    {e.component_stack && <><span style={secLbl}>COMPONENT STACK</span><pre style={pre}>{e.component_stack}</pre></>}
                    {!e.stack && !e.component_stack && <span style={{ fontSize: 12, color: PC.t3 }}>Lỗi này không kèm stack.</span>}
                    {e.user_agent && <span style={{ fontSize: 11.5, color: PC.t3, overflowWrap: "anywhere" }}>Trình duyệt: {e.user_agent}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
