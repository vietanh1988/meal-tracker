import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { C, card } from "../theme";
import { fmtDate } from "../fmtDate";

function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}

export function ErrorLogsTab({ isAdmin }) {
  const [errors, setErrors] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("client_errors").select("id,user_id,message,stack,component_stack,url,user_agent,created_at").order("created_at", { ascending: false }).limit(50);
      if (error) { console.error("client_errors load error:", error); setErrors([]); setLoading(false); return; }
      setErrors(data || []);
      const userIds = [...new Set((data || []).map(e => e.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,username").in("id", userIds);
        const map = {};
        (profiles || []).forEach(p => { map[p.id] = p.username; });
        setUsernames(map);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;

  return (
    <div style={{ ...card, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.t1 }}>Lỗi hệ thống</div>
        <button onClick={load} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer" }}>🔄 Tải lại</button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Lỗi runtime user gặp phải (ErrorBoundary tự ghi lại), 50 lỗi gần nhất</div>

      {loading && <div style={{ padding: 20, textAlign: "center", color: C.t2 }}>Đang tải...</div>}
      {!loading && errors.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.t2 }}>Chưa ghi nhận lỗi nào 🎉</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {errors.map(e => {
          const expanded = expandedId === e.id;
          return (
            <div key={e.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div onClick={() => setExpandedId(expanded ? null : e.id)} style={{ padding: "10px 14px", cursor: "pointer", background: C.surface, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#7F1D1D", wordBreak: "break-word" }}>{e.message || "(không có message)"}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 3, wordBreak: "break-all" }}>{e.url || "-"}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{usernames[e.user_id] || (e.user_id ? e.user_id.slice(0, 8) : "Ẩn danh (chưa đăng nhập)")} · {fmtDT(e.created_at)}</div>
                </div>
                <span style={{ fontSize: 12, color: C.t3, flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
              </div>
              {expanded && (
                <div style={{ padding: "10px 14px", background: "#fff", borderTop: `1px solid ${C.border}` }}>
                  {e.stack && <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, marginBottom: 4 }}>Stack trace:</div>
                    <pre style={{ fontSize: 11, color: C.t2, background: C.surface, padding: 10, borderRadius: 8, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 10 }}>{e.stack}</pre>
                  </>}
                  {e.component_stack && <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, marginBottom: 4 }}>Component stack:</div>
                    <pre style={{ fontSize: 11, color: C.t2, background: C.surface, padding: 10, borderRadius: 8, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 10 }}>{e.component_stack}</pre>
                  </>}
                  <div style={{ fontSize: 11, color: C.t3 }}>{e.user_agent}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
