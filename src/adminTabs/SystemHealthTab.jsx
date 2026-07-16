import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { authFetch } from "../lib/authFetch";
import { pickAiModelFromSettings } from "../lib/aiProvider";
import { C, card } from "../theme";
import { fmtDate } from "../fmtDate";

function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}

function StatusDot({ ok }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: ok ? "#22C55E" : "#EF4444", marginRight: 6 }} />;
}

export function SystemHealthTab({ isAdmin, appSettings }) {
  const [activeUsers, setActiveUsers] = useState(null);
  const [errorSummary, setErrorSummary] = useState(null);
  const [pushSummary, setPushSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dbPing, setDbPing] = useState(null);
  const [aiPing, setAiPing] = useState(null);
  const [pinging, setPinging] = useState(false);

  const loadCore = useCallback(async () => {
    setLoading(true);
    const t0 = Date.now();
    try {
      const [{ data: au, error: auErr }, { data: es }, { data: ps }] = await Promise.all([
        supabase.rpc("admin_active_users_count", { p_minutes: 15 }),
        supabase.rpc("admin_error_summary_24h"),
        supabase.rpc("admin_push_summary_24h"),
      ]);
      setDbPing({ ok: !auErr, ms: Date.now() - t0 });
      setActiveUsers(au);
      setErrorSummary((es && es[0]) || null);
      setPushSummary((ps && ps[0]) || null);
    } catch (e) {
      console.error("SystemHealthTab load error:", e);
      setDbPing({ ok: false, ms: Date.now() - t0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCore(); }, [loadCore]);

  const pingAI = async () => {
    setPinging(true);
    const t0 = Date.now();
    try {
      const prov = appSettings?.ai_provider || "claude";
      const data = await authFetch("ai-proxy", { foodDesc: "Ping. Trả lời đúng 1 từ: OK", provider: prov, model: pickAiModelFromSettings(appSettings, prov), feature: "ping_test" });
      setAiPing({ ok: !data.error, ms: Date.now() - t0 });
    } catch (e) {
      setAiPing({ ok: false, ms: Date.now() - t0 });
    }
    setPinging(false);
  };

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;

  const pushRate = pushSummary && pushSummary.total_recipients > 0 ? Math.round((Number(pushSummary.total_sent) / Number(pushSummary.total_recipients)) * 100) : null;

  return (
    <div style={{ ...card, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>🩺 Tổng quan hệ thống</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Các chỉ số thật đo được — không phải số liệu ảo</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>👥 User hoạt động (15 phút qua)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, marginTop: 4 }}>{loading ? "-" : activeUsers ?? 0}</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>⚠️ Lỗi hệ thống (24h)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: errorSummary?.error_count > 0 ? "#DC2626" : C.green, marginTop: 4 }}>{loading ? "-" : (errorSummary?.error_count ?? 0)}</div>
          {errorSummary?.last_error_at && <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Gần nhất: {fmtDT(errorSummary.last_error_at)}</div>}
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>🔔 Tỷ lệ gửi push (24h)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, marginTop: 4 }}>{loading ? "-" : (pushRate !== null ? `${pushRate}%` : "Chưa có dữ liệu")}</div>
          {pushSummary && Number(pushSummary.batch_count) > 0 && <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{pushSummary.total_sent}/{pushSummary.total_recipients} người · {pushSummary.batch_count} lượt gửi</div>}
        </div>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 }}>
          <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>🗄️ Supabase</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, marginTop: 4 }}>
            {dbPing ? <><StatusDot ok={dbPing.ok} />{dbPing.ok ? `Phản hồi ${dbPing.ms}ms` : "Không phản hồi"}</> : "-"}
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: aiPing ? 10 : 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>🤖 Ping AI provider</div>
          <button onClick={pingAI} disabled={pinging} style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: pinging ? "default" : "pointer" }}>{pinging ? "Đang kiểm tra..." : "Kiểm tra ngay"}</button>
        </div>
        {aiPing && <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}><StatusDot ok={aiPing.ok} />{aiPing.ok ? `Phản hồi ${aiPing.ms}ms` : "Không phản hồi / lỗi"}</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={loadCore} disabled={loading} style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>{loading ? "Đang tải..." : "🔄 Tải lại"}</button>
      </div>
    </div>
  );
}
