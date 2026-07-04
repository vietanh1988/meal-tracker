import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { C, card, inp } from "../theme";
import { fmtDate } from "../fmtDate";

const TARGET_LABEL = { single: "1 user", all: "Tất cả user", premium: "Chỉ Premium" };
const STATUS_LABEL = { pending: "Đang gửi...", done: "Đã gửi", error: "Lỗi" };
const STATUS_BG = { pending: C.goldBg, done: C.greenBg, error: C.redBg };
const STATUS_FG = { pending: "#92400E", done: "#14532D", error: "#7F1D1D" };

function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}

export function NotifyTab({ isAdmin, currentUserId }) {
  const [targetType, setTargetType] = useState("single");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState("");

  const [batches, setBatches] = useState([]);
  const [usernames, setUsernames] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(true);
  const pollRef = useRef(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.from("notification_batches").select("id,admin_id,title,body,target_type,target_user_id,recipient_count,push_sent_count,push_failed_count,status,error_message,created_at,completed_at").order("created_at", { ascending: false }).limit(50);
      if (error) { console.error("notification_batches load error:", error); setBatches([]); setLoadingHistory(false); return; }
      setBatches(data || []);
      const ids = [...new Set((data || []).flatMap(b => [b.admin_id, b.target_user_id]).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,username").in("id", ids);
        const map = {};
        (profiles || []).forEach(p => { map[p.id] = p.username; });
        setUsernames(map);
      }
    } catch (e) { console.error(e); }
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const hasPending = batches.some(b => b.status === "pending");
    if (hasPending) {
      pollRef.current = setTimeout(loadHistory, 3000);
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [batches, loadHistory]);

  useEffect(() => {
    if (targetType !== "single" || !search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_search: search, p_status: null, p_tier: null, p_role: null, p_expiry: null,
        p_date_from: null, p_date_to: null, p_sort: "created_at", p_sort_dir: "desc", p_limit: 8, p_offset: 0,
      });
      if (!error) setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search, targetType]);

  const handleSend = async () => {
    if (!title.trim()) { alert("Vui lòng nhập tiêu đề"); return; }
    if (targetType === "single" && !selectedUser) { alert("Vui lòng chọn người nhận"); return; }
    const confirmMsg = targetType === "single" ? `Gửi thông báo tới "${selectedUser.username}"?` : targetType === "all" ? "Gửi thông báo tới TẤT CẢ user?" : "Gửi thông báo tới tất cả user Premium?";
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    try {
      const { data, error } = await supabase.rpc("admin_send_bulk_notification", {
        p_target_type: targetType,
        p_target_user_id: targetType === "single" ? selectedUser.id : null,
        p_title: title.trim(),
        p_body: body.trim() || null,
        p_url: "/",
      });
      if (error) { alert("Gửi thất bại: " + error.message); setSending(false); return; }
      setFlash("✓ Đã tạo yêu cầu gửi, đang xử lý...");
      setTimeout(() => setFlash(""), 4000);
      setTitle(""); setBody(""); setSelectedUser(null); setSearch("");
      loadHistory();
    } catch (e) { console.error(e); alert("Có lỗi xảy ra"); }
    setSending(false);
  };

  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;

  return (
    <div style={{ ...card, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>Gửi thông báo</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Gửi thủ công tới 1 user, tất cả user, hoặc chỉ user Premium</div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["single", "all", "premium"].map(t => (
            <button key={t} onClick={() => { setTargetType(t); setSelectedUser(null); setSearch(""); }} style={{ flex: 1, padding: "8px 12px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: `1.5px solid ${targetType === t ? C.primary : C.border}`, background: targetType === t ? C.blueBg : "#fff", color: targetType === t ? C.primary : C.t2, cursor: "pointer" }}>{TARGET_LABEL[t]}</button>
          ))}
        </div>

        {targetType === "single" && (
          <div style={{ marginBottom: 12, position: "relative" }}>
            <input placeholder="Tìm theo tên hoặc email" value={selectedUser ? selectedUser.username : search} onChange={e => { setSearch(e.target.value); setSelectedUser(null); }} style={inp} />
            {!selectedUser && searchResults.length > 0 && (
              <div style={{ position: "absolute", top: 42, left: 0, right: 0, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 4px 14px rgba(0,0,0,0.1)", zIndex: 10, overflow: "hidden" }}>
                {searchResults.map(u => (
                  <div key={u.id} onClick={() => { setSelectedUser(u); setSearchResults([]); }} style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <div style={{ fontWeight: 700, color: C.t1 }}>{u.username}</div>
                    <div style={{ fontSize: 11, color: C.t3 }}>{u.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <input placeholder="Tiêu đề (VD: 🎉 Ưu đãi cuối tuần)" value={title} onChange={e => setTitle(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <textarea placeholder="Nội dung thông báo" value={body} onChange={e => setBody(e.target.value)} rows={2} style={{ ...inp, height: "auto", padding: "10px 12px", resize: "vertical" }} />
        </div>

        {flash && <div style={{ marginBottom: 12, padding: "8px 12px", background: C.greenBg, borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#14532D" }}>{flash}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSend} disabled={sending} style={{ padding: "10px 22px", fontSize: 13, fontWeight: 800, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#36A3FF,#007AFF)", color: "#fff", cursor: "pointer", opacity: sending ? 0.6 : 1 }}>{sending ? "Đang gửi..." : "📨 Gửi thông báo"}</button>
        </div>
      </div>

      <div style={{ fontWeight: 800, color: C.t1, marginBottom: 10 }}>Lịch sử đã gửi</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loadingHistory && <div style={{ padding: 20, textAlign: "center", color: C.t2 }}>Đang tải...</div>}
        {!loadingHistory && batches.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.t2 }}>Chưa gửi thông báo nào</div>}
        {!loadingHistory && batches.map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10, gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{b.title}</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                {b.target_type === "single" ? (usernames[b.target_user_id] || "user") : TARGET_LABEL[b.target_type]}
                {" · "}bởi {usernames[b.admin_id] || "admin"}{" · "}{fmtDT(b.created_at)}
                {b.status === "done" && ` · ${b.push_sent_count}/${b.recipient_count} nhận được push`}
                {b.status === "error" && b.error_message && ` · ${b.error_message}`}
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: STATUS_BG[b.status], color: STATUS_FG[b.status], flexShrink: 0, whiteSpace: "nowrap" }}>{STATUS_LABEL[b.status] || b.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
