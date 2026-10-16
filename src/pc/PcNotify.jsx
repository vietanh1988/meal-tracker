// Quản trị PC › Gửi thông báo (cùng ngôn ngữ hình ảnh PcUsers / PcFood). Logic giữ đúng src/adminTabs/NotifyTab.jsx:
//  - Đối tượng: 1 người dùng (tìm qua RPC admin_list_users, chờ 300 ms) / Tất cả / Chỉ Premium.
//  - Gửi: RPC admin_send_bulk_notification {p_target_type, p_target_user_id, p_title, p_body|null, p_url:"/"} — hỏi xác nhận trước.
//  - Chặn gửi khi cờ push TẮT (parseFeatureFlags) hoặc không phải Super Admin (Admin thường chỉ xem — như tab cũ).
//  - Lịch sử: notification_batches 50 bản mới nhất + tên người (profiles); còn bản "đang gửi" thì tự tải lại mỗi 3 giây.
//  - Bố cục: soạn (trái) · xem trước thông báo (phải) · bảng lịch sử đã gửi.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { appAlert, appConfirm } from "../lib/dialog";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { PC } from "../theme";
import { Btn, Pill, Card, ErrorBox, Loading, headRow, bodyRow, cell, secLbl, vnInt, fmtDT } from "./pcUI";

const TARGETS = [["single", "1 người dùng"], ["all", "Tất cả người dùng"], ["premium", "Chỉ Premium"]];
const TARGET_LABEL = Object.fromEntries(TARGETS);
const STATUS = { pending: ["Đang gửi", "amber"], done: ["Đã gửi", "green"], error: ["Lỗi", "red"] };
const HCOLS = "minmax(0,2.2fr) minmax(0,1.1fr) minmax(0,1fr) 110px 120px 96px";
const field = { width: "100%", height: 36, borderRadius: 10, background: "#FFFFFF", border: `1px solid ${PC.field}`, padding: "0 12px", fontSize: 13, color: PC.t1, fontFamily: "inherit" };
const lbl = { fontSize: 12, fontWeight: 800, color: PC.t3, paddingTop: 10 };

export function PcNotify({ top, isAdmin = true, isSuperAdmin, appSettings }) {
  const pushEnabled = parseFeatureFlags(appSettings).push;
  const canSend = pushEnabled && isSuperAdmin;
  const [targetType, setTargetType] = useState("single");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState("");

  const [batches, setBatches] = useState(null);
  const [names, setNames] = useState({});
  const [histErr, setHistErr] = useState(null);
  const pollRef = useRef(null);

  const loadHistory = useCallback(async () => {
    setHistErr(null);
    try {
      const { data, error } = await supabase.from("notification_batches").select("id,admin_id,title,body,target_type,target_user_id,recipient_count,push_sent_count,push_failed_count,status,error_message,created_at,completed_at").order("created_at", { ascending: false }).limit(50);
      if (error) { setHistErr(error.message || "Lỗi tải"); setBatches((b) => b || []); return; }
      setBatches(data || []);
      const ids = [...new Set((data || []).flatMap((b) => [b.admin_id, b.target_user_id]).filter(Boolean))];
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id,username").in("id", ids);
        const map = {};
        (profiles || []).forEach((p) => { map[p.id] = p.username; });
        setNames(map);
      }
    } catch (e) { setHistErr(e.message || "Lỗi tải"); setBatches((b) => b || []); }
  }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => {
    if ((batches || []).some((b) => b.status === "pending")) pollRef.current = setTimeout(loadHistory, 3000);
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [batches, loadHistory]);

  // Tìm người nhận (như tab cũ: chờ 300 ms, 8 kết quả)
  useEffect(() => {
    if (targetType !== "single" || !search.trim() || selectedUser) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_search: search, p_status: null, p_tier: null, p_role: null, p_expiry: null,
        p_date_from: null, p_date_to: null, p_sort: "created_at", p_sort_dir: "desc", p_limit: 8, p_offset: 0,
      });
      if (!error) setResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [search, targetType, selectedUser]);

  const pickTarget = (t) => { setTargetType(t); setSelectedUser(null); setSearch(""); };

  const handleSend = async () => {
    if (!pushEnabled) { appAlert("Thông báo đẩy đang TẮT trong Quản lý tính năng. Vào Quản lý tính năng để bật lại."); return; }
    if (!isSuperAdmin) return;
    if (!title.trim()) { appAlert("Vui lòng nhập tiêu đề"); return; }
    if (targetType === "single" && !selectedUser) { appAlert("Vui lòng chọn người nhận"); return; }
    const msg = targetType === "single" ? `Gửi thông báo tới "${selectedUser.username}"?` : targetType === "all" ? "Gửi thông báo tới TẤT CẢ người dùng?" : "Gửi thông báo tới tất cả người dùng Premium?";
    if (!await appConfirm(`${msg}\n\n${title.trim()}${body.trim() ? `\n${body.trim()}` : ""}`, { title: "Gửi thông báo?", confirmText: "Gửi" })) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc("admin_send_bulk_notification", {
        p_target_type: targetType,
        p_target_user_id: targetType === "single" ? selectedUser.id : null,
        p_title: title.trim(),
        p_body: body.trim() || null,
        p_url: "/",
      });
      if (error) { appAlert("Gửi thất bại: " + error.message); setSending(false); return; }
      setFlash("Đã tạo yêu cầu gửi, đang xử lý…");
      setTimeout(() => setFlash(""), 4000);
      setTitle(""); setBody(""); setSelectedUser(null); setSearch("");
      loadHistory();
    } catch (e) { appAlert("Có lỗi xảy ra"); }
    setSending(false);
  };

  if (!isAdmin) return <>{top(null)}<div data-testid="pc-notify" style={{ padding: "20px 24px" }}><Card style={{ padding: 20, color: PC.t3 }}>Chỉ Admin mới xem được trang này.</Card></div></>;

  const recipient = targetType === "single" ? (selectedUser ? selectedUser.username : "chưa chọn người nhận") : TARGET_LABEL[targetType];
  const list = batches || [];

  return (
    <>
      {top(<Btn kind="soft" onClick={loadHistory} testid="pc-notify-reload">Làm mới</Btn>)}
      <div data-testid="pc-notify" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {!pushEnabled && <div data-testid="pc-notify-push-off" role="alert" style={{ fontSize: 13, fontWeight: 700, color: PC.danger, background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", lineHeight: 1.5 }}>Thông báo đẩy đang TẮT trong Quản lý tính năng — không gửi được thông báo nào (kể cả chuông trong app) cho tới khi bật lại.</div>}
        {!isSuperAdmin && <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường chỉ xem — Super Admin mới gửi được thông báo.</div>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
          {/* Soạn */}
          <Card testid="pc-notify-form" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={secLbl}>SOẠN THÔNG BÁO</span>
            <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr)", gap: "12px 14px", alignItems: "start" }}>
              <span style={lbl}>Đối tượng</span>
              <div role="radiogroup" aria-label="Đối tượng" style={{ display: "flex", gap: 6 }}>
                {TARGETS.map(([t, l]) => {
                  const on = targetType === t;
                  return <button key={t} type="button" role="radio" aria-checked={on} data-testid={`pc-notify-target-${t}`} onClick={() => pickTarget(t)} className="pc-btn"
                    style={{ flex: 1, height: 36, borderRadius: 10, border: `1.5px solid ${on ? "#1A7CFF" : PC.field}`, background: on ? PC.soft : "#FFFFFF", color: on ? PC.softFg : PC.t2, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{l}</button>;
                })}
              </div>

              {targetType === "single" && <>
                <span style={lbl}>Người nhận</span>
                <div style={{ position: "relative", minWidth: 0 }}>
                  {selectedUser ? (
                    <div data-testid="pc-notify-picked" style={{ height: 36, borderRadius: 10, background: PC.soft, border: "1px solid #BFD4FF", padding: "0 6px 0 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <b style={{ color: PC.softFg, whiteSpace: "nowrap" }}>{selectedUser.username}</b>
                      <span style={{ flex: 1, minWidth: 0, color: PC.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={selectedUser.email}>{selectedUser.email}</span>
                      <Btn kind="light" style={{ height: 26, padding: "0 10px", fontSize: 12 }} onClick={() => { setSelectedUser(null); setSearch(""); }} testid="pc-notify-unpick">Đổi</Btn>
                    </div>
                  ) : (
                    <input data-testid="pc-notify-search" className="pc-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email" aria-label="Tìm người nhận" style={field} />
                  )}
                  {!selectedUser && results.length > 0 && (
                    <div data-testid="pc-notify-results" role="listbox" style={{ position: "absolute", top: 40, left: 0, right: 0, background: "#FFFFFF", border: `1px solid ${PC.field}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.12)", zIndex: 10, overflow: "hidden" }}>
                      {results.map((u, i) => (
                        <button key={u.id} type="button" role="option" aria-selected={false} data-testid="pc-notify-result" onClick={() => { setSelectedUser(u); setResults([]); }} className="pc-row pc-click"
                          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", padding: "8px 12px", border: "none", borderBottom: i === results.length - 1 ? "none" : `1px solid ${PC.rowLine}`, background: "transparent", fontFamily: "inherit", textAlign: "left", cursor: "pointer" }}>
                          <b style={{ fontSize: 13, color: PC.t1 }}>{u.username}</b>
                          <span style={{ fontSize: 12, color: PC.t3, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>}

              <span style={lbl}>Tiêu đề</span>
              <input data-testid="pc-notify-title" className="pc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Ưu đãi cuối tuần" aria-label="Tiêu đề" style={field} />

              <span style={lbl}>Nội dung</span>
              <textarea data-testid="pc-notify-body" className="pc-input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nội dung thông báo" aria-label="Nội dung"
                style={{ ...field, height: "auto", minHeight: 96, padding: "8px 12px", lineHeight: 1.5, resize: "vertical" }} />
            </div>
            {flash && <div data-testid="pc-notify-flash" role="status" style={{ padding: "8px 12px", borderRadius: 10, background: "#DCFCE7", color: "#166534", fontSize: 13, fontWeight: 700 }}>{flash}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 12, color: PC.t4, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Gửi tới: {recipient}</span>
              <Btn kind="blue" onClick={handleSend} disabled={sending || !canSend} testid="pc-notify-send" title={!isSuperAdmin ? "Chỉ Super Admin" : !pushEnabled ? "Thông báo đẩy đang tắt" : undefined}>{sending ? "Đang gửi…" : "Gửi thông báo"}</Btn>
            </div>
          </Card>

          {/* Xem trước */}
          <Card testid="pc-notify-preview" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={secLbl}>XEM TRƯỚC</span>
            <div style={{ borderRadius: 18, background: "linear-gradient(160deg,#0F4585,#022B57)", padding: "22px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ borderRadius: 14, background: "rgba(255,255,255,0.94)", padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}>
                <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(160deg,#2C8DFF,#0040E0)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17, flexShrink: 0 }}>F</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "flex", gap: 6, fontSize: 11, color: PC.t3 }}><span style={{ fontWeight: 700 }}>Fipilot AI</span><span style={{ marginLeft: "auto" }}>bây giờ</span></span>
                  <b data-testid="pc-notify-preview-title" style={{ fontSize: 13.5, color: title.trim() ? PC.t1 : PC.t4, wordBreak: "break-word" }}>{title.trim() || "Tiêu đề thông báo"}</b>
                  <span data-testid="pc-notify-preview-body" style={{ fontSize: 12.5, color: body.trim() ? PC.t2 : PC.t4, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{body.trim() || "Nội dung thông báo"}</span>
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: PC.t2 }}>
              <span style={{ display: "flex", gap: 8 }}><span style={{ color: PC.t3, width: 80, flexShrink: 0 }}>Gửi tới</span><b style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipient}</b></span>
              <span style={{ display: "flex", gap: 8 }}><span style={{ color: PC.t3, width: 80, flexShrink: 0 }}>Kênh</span><span>Chuông trong app + thông báo đẩy</span></span>
              <span style={{ display: "flex", gap: 8 }}><span style={{ color: PC.t3, width: 80, flexShrink: 0 }}>Bấm vào</span><span>Mở trang chủ app</span></span>
            </div>
          </Card>
        </div>

        {/* Lịch sử */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={secLbl}>LỊCH SỬ ĐÃ GỬI</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>{batches ? `${vnInt(list.length)} lần gửi gần nhất` : ""}</span>
        </div>
        {histErr && <ErrorBox text={`Chưa tải được lịch sử: ${histErr}`} onRetry={loadHistory} />}
        <Card testid="pc-notify-history">
          <div style={headRow(HCOLS)}><span>TIÊU ĐỀ</span><span>GỬI TỚI</span><span>NGƯỜI GỬI</span><span>THỜI ĐIỂM</span><span>NHẬN PUSH</span><span>TRẠNG THÁI</span></div>
          {!batches && <Loading />}
          {batches && list.length === 0 && <div data-testid="pc-notify-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Chưa gửi thông báo nào.</div>}
          {list.map((b, i) => {
            const last = i === list.length - 1;
            const [sl, st] = STATUS[b.status] || [b.status, "gray"];
            const to = b.target_type === "single" ? (names[b.target_user_id] || "1 người dùng") : TARGET_LABEL[b.target_type] || b.target_type;
            return (
              <div key={b.id} data-testid="pc-notify-row" className="pc-row" style={{ ...bodyRow(HCOLS), minHeight: 52, padding: "8px 16px", borderBottom: last ? "none" : bodyRow(HCOLS).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ ...cell, fontSize: 13 }} title={b.title}>{b.title}</b>
                  {b.status === "error" && b.error_message
                    ? <span style={{ ...cell, color: PC.danger }} title={b.error_message}>{b.error_message}</span>
                    : b.body ? <span style={{ ...cell, color: PC.t3 }} title={b.body}>{b.body}</span> : null}
                </span>
                <span style={cell} title={to}>{to}</span>
                <span style={{ ...cell, color: PC.t2 }}>{names[b.admin_id] || "admin"}</span>
                <span style={{ ...cell, color: PC.t3 }}>{fmtDT(b.created_at)}</span>
                <span style={cell}>{b.status === "done" ? <>{vnInt(b.push_sent_count)}/{vnInt(b.recipient_count)}{b.push_failed_count ? <span style={{ color: PC.t4 }}> · lỗi {vnInt(b.push_failed_count)}</span> : null}</> : <span style={{ color: PC.t4 }}>–</span>}</span>
                <span style={cell}><Pill tone={st}>{sl}</Pill></span>
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
