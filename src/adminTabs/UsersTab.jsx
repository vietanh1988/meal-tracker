import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { C, card, inp, redBtn } from "../theme";
import { fmtDate } from "../fmtDate";

const TIER_LABEL = { free: "Free", trial: "Trial", premium: "Premium" };
const TIER_BG = { free: C.surface, trial: C.goldBg, premium: C.blueBg };
const TIER_FG = { free: C.t2, trial: "#92400E", premium: C.primary };

function fmtDT(iso) {
  if (!iso) return "-";
  try { return fmtDate(new Date(iso)); } catch (e) { return "-"; }
}
function relTime(iso) {
  if (!iso) return "-";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return fmtDT(iso);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "🟢 Vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} tuần trước`;
  return fmtDT(iso);
}
function initials(name) {
  return (name || "?").trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();
}

async function logAudit(currentUserId, targetId, action, note) {
  try { await supabase.from("admin_audit_log").insert({ admin_id: currentUserId, target_user_id: targetId, action, note: note || null }); } catch (e) { console.error("audit log error:", e); }
}

export function UsersTab({ isAdmin, currentUserId }) {
  const [selectedId, setSelectedId] = useState(null);
  if (!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;
  return selectedId
    ? <UserDetail userId={selectedId} currentUserId={currentUserId} onBack={() => setSelectedId(null)} />
    : <UsersList onSelect={setSelectedId} currentUserId={currentUserId} />;
}

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ color: C.t3, marginLeft: 4, fontSize: 10 }}>↕</span>;
  return <span style={{ color: C.primary, marginLeft: 4, fontSize: 10 }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

function UsersList({ onSelect, currentUserId }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [role, setRole] = useState("");
  const [expiry, setExpiry] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [lockingId, setLockingId] = useState(null);
  const pageSize = 20;

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_user_stats");
    if (error) { console.error("admin_user_stats error:", error); return; }
    setStats((data && data[0]) || { total_users: 0, active_users: 0, new_7d: 0, locked_users: 0 });
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_search: search || null,
        p_status: status || null,
        p_tier: tier || null,
        p_role: role || null,
        p_expiry: expiry || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_sort: sortBy,
        p_sort_dir: sortDir,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });
      if (error) { console.error("admin_list_users error:", error); setUsers([]); setTotal(0); }
      else { setUsers(data || []); setTotal((data && data[0] && Number(data[0].total_count)) || 0); }
    } catch (e) { console.error("admin_list_users error:", e); }
    setLoading(false);
  }, [search, status, tier, role, expiry, dateFrom, dateTo, sortBy, sortDir, page]);

  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [fetchUsers]);
  useEffect(() => { setPage(0); }, [search, status, tier, role, expiry, dateFrom, dateTo, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir(key === "created_at" ? "desc" : "asc"); }
  };

  const quickLock = async (u, e) => {
    e.stopPropagation();
    if (u.id === currentUserId) { alert("Không thể tự khóa tài khoản của chính mình"); return; }
    const next = !u.is_locked;
    if (!window.confirm(next ? `Khóa tài khoản "${u.username}"?` : `Mở khóa tài khoản "${u.username}"?`)) return;
    setLockingId(u.id);
    const { error } = await supabase.from("profiles").update({ is_locked: next }).eq("id", u.id);
    setLockingId(null);
    if (error) { alert("Thất bại: " + error.message); return; }
    await logAudit(currentUserId, u.id, next ? "lock_account" : "unlock_account", "Khóa nhanh từ danh sách");
    fetchUsers();
    loadStats();
  };

  const cards = stats ? [
    { l: "Tổng user", v: stats.total_users, c: C.t1, icon: "👥", iconBg: C.blueBg },
    { l: "Đang hoạt động", v: stats.active_users, c: C.green, icon: "✅", iconBg: C.greenBg },
    { l: "Mới 7 ngày", v: stats.new_7d, c: C.primary, icon: "🆕", iconBg: C.blueBg },
    { l: "Bị khóa", v: stats.locked_users, c: C.red, icon: "🔒", iconBg: C.redBg },
  ] : [];

  const th = (label, key) => (
    <th onClick={() => toggleSort(key)} style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label}<SortIcon active={sortBy === key} dir={sortDir} />
    </th>
  );

  return (
    <div style={{ ...card, maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>Quản lý User</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Danh sách toàn bộ user, gói cước và trạng thái</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map((s, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>{s.l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v ?? "-"}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        {(() => { const fInp = { ...inp, height: 32, fontSize: 12, padding: "0 10px", fontWeight: 600 }; return <>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.t3, pointerEvents: "none" }}>🔍</span>
          <input placeholder="Tìm theo tên hoặc email" value={search} onChange={e => setSearch(e.target.value)} style={{ ...fInp, width: 200, paddingLeft: 26 }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...fInp, width: 140 }}>
          <option value="">Trạng thái: Tất cả</option>
          <option value="active">Trạng thái: Hoạt động</option>
          <option value="locked">Trạng thái: Bị khóa</option>
        </select>
        <select value={tier} onChange={e => setTier(e.target.value)} style={{ ...fInp, width: 115 }}>
          <option value="">Gói: Tất cả</option>
          <option value="free">Gói: Free</option>
          <option value="trial">Gói: Trial</option>
          <option value="premium">Gói: Premium</option>
        </select>
        <select value={role} onChange={e => setRole(e.target.value)} style={{ ...fInp, width: 125 }}>
          <option value="">Vai trò: Tất cả</option>
          <option value="user">Vai trò: User</option>
          <option value="admin">Vai trò: Admin</option>
        </select>
        <select value={expiry} onChange={e => setExpiry(e.target.value)} style={{ ...fInp, width: 160 }}>
          <option value="">Hạn dùng: Tất cả</option>
          <option value="expiring_7d">Sắp hết hạn (7 ngày)</option>
          <option value="expired">Đã hết hạn</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: C.t3, fontWeight: 600 }}>Từ</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...fInp, width: 120 }} title="Tham gia từ ngày" />
          <span style={{ fontSize: 11, color: C.t3, fontWeight: 600 }}>đến</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...fInp, width: 120 }} title="Tham gia đến ngày" />
        </div>
        {(search || status || tier || role || expiry || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setStatus(""); setTier(""); setRole(""); setExpiry(""); setDateFrom(""); setDateTo(""); }} style={{ fontSize: 11, fontWeight: 700, padding: "0 10px", height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer" }}>Xóa lọc</button>
        )}
        </>; })()}
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>User</th>
              {th("Gói", "tier")}
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Trạng thái</th>
              {th("Hết hạn", "expiry")}
              <th style={{ textAlign: "left", padding: "10px 12px", color: C.t2, fontWeight: 700 }}>Đăng nhập gần nhất</th>
              {th("Tham gia", "created_at")}
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: C.t2 }}>Đang tải...</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: C.t2 }}>Không tìm thấy user nào</td></tr>}
            {!loading && users.map(u => (
              <tr key={u.id} onClick={() => onSelect(u.id)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#60A5FA,#007AFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{initials(u.username)}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: C.t1, display: "flex", alignItems: "center", gap: 6 }}>{u.username}{u.is_admin && <span style={{ fontSize: 10, fontWeight: 800, color: C.red, background: C.redBg, padding: "1px 6px", borderRadius: 6 }}>ADMIN</span>}</div>
                      <div style={{ color: C.t3, fontSize: 12 }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: TIER_BG[u.tier] || C.surface, color: TIER_FG[u.tier] || C.t2 }}>{TIER_LABEL[u.tier] || u.tier}</span></td>
                <td style={{ padding: "10px 12px" }}>{u.is_locked
                  ? <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: C.redBg, color: C.red }}>● Bị khóa</span>
                  : <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: C.greenBg, color: "#14532D" }}>● Hoạt động</span>}
                </td>
                <td style={{ padding: "10px 12px", color: C.t2 }}>{u.tier === "premium" ? fmtDT(u.subscription_end_date) : u.tier === "trial" ? fmtDT(u.trial_end_date) : "-"}</td>
                <td style={{ padding: "10px 12px", color: C.t2 }}>{relTime(u.last_sign_in_at)}</td>
                <td style={{ padding: "10px 12px", color: C.t2 }}>{fmtDT(u.created_at)}</td>
                <td style={{ padding: "10px 12px" }}>
                  <button onClick={(e) => quickLock(u, e)} disabled={lockingId === u.id} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, border: `1px solid ${u.is_locked ? C.border : C.red}`, background: "#fff", color: u.is_locked ? C.t2 : C.red, cursor: "pointer", whiteSpace: "nowrap" }}>{u.is_locked ? "Mở khóa" : "Khóa"}</button>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: C.t3 }}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13, color: C.t2 }}>
        <span>{total > 0 ? `Hiển thị ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} trong ${total}` : ""}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.5 : 1 }}>‹</button>
          {(() => {
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const pages = [];
            const start = Math.max(0, Math.min(page - 2, totalPages - 5));
            const end = Math.min(totalPages, start + 5);
            for (let i = Math.max(0, start); i < end; i++) pages.push(i);
            return pages.map(i => (
              <button key={i} onClick={() => setPage(i)} style={{ padding: "6px 12px", fontSize: 12, fontWeight: 700, border: `1px solid ${i === page ? C.primary : C.border}`, borderRadius: 8, background: i === page ? C.primary : "#fff", color: i === page ? "#fff" : C.t2, cursor: "pointer" }}>{i + 1}</button>
            ));
          })()}
          <button disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)} style={{ padding: "6px 10px", fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: (page + 1) * pageSize >= total ? "default" : "pointer", opacity: (page + 1) * pageSize >= total ? 0.5 : 1 }}>›</button>
        </div>
      </div>
    </div>
  );
}

function UserDetail({ userId, currentUserId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tierForm, setTierForm] = useState({ tier: "free", subscription_end_date: "", trial_end_date: "" });
  const [notes, setNotes] = useState("");
  const [audit, setAudit] = useState([]);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_user_detail", { p_user_id: userId });
    if (error) { console.error("admin_get_user_detail error:", error); setLoading(false); return; }
    const d = data && data[0];
    if (d) {
      setDetail(d);
      setTierForm({ tier: d.tier || "free", subscription_end_date: d.subscription_end_date || "", trial_end_date: d.trial_end_date || "" });
      setNotes(d.admin_notes || "");
    }
    const { data: log } = await supabase.from("admin_audit_log").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(20);
    setAudit(log || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(""), 3000); };

  const logAction = async (action, note) => logAudit(currentUserId, userId, action, note);

  const handleSaveTier = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      tier: tierForm.tier,
      subscription_end_date: tierForm.subscription_end_date || null,
      trial_end_date: tierForm.trial_end_date || null,
    }).eq("id", userId);
    if (error) { console.error(error); alert("Lưu thất bại: " + error.message); setSaving(false); return; }
    const relevantDate = tierForm.tier === "trial" ? tierForm.trial_end_date : tierForm.subscription_end_date;
    await logAction("update_tier", `Đổi gói -> ${tierForm.tier}, hết hạn ${relevantDate || "-"}`);
    showFlash("✓ Đã lưu gói và thời hạn");
    setSaving(false);
    load();
  };

  const quickExtend = async (kind) => {
    const base = tierForm.subscription_end_date ? new Date(tierForm.subscription_end_date) : new Date();
    const d = base < new Date() ? new Date() : base;
    if (kind === "30d") d.setDate(d.getDate() + 30);
    if (kind === "3m") d.setMonth(d.getMonth() + 3);
    if (kind === "6m") d.setMonth(d.getMonth() + 6);
    if (kind === "12m") d.setMonth(d.getMonth() + 12);
    const iso = d.toISOString().slice(0, 10);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ tier: "premium", subscription_end_date: iso }).eq("id", userId);
    if (error) { console.error(error); alert("Gia hạn thất bại: " + error.message); setSaving(false); return; }
    await logAction("extend_subscription", `Gia hạn ${kind} -> hết hạn ${fmtDT(iso)}`);
    setTierForm(f => ({ ...f, tier: "premium", subscription_end_date: iso }));
    showFlash("✓ Đã gia hạn");
    setSaving(false);
    load();
  };

  const toggleAdmin = async () => {
    if (userId === currentUserId) { alert("Không thể tự bỏ quyền Admin của chính mình"); return; }
    const next = !detail.is_admin;
    if (!window.confirm(next ? `Cấp quyền Admin cho "${detail.username}"?` : `Bỏ quyền Admin của "${detail.username}"?`)) return;
    const { error } = await supabase.from("profiles").update({ is_admin: next }).eq("id", userId);
    if (error) { alert("Thất bại: " + error.message); return; }
    await logAction(next ? "grant_admin" : "revoke_admin");
    showFlash(next ? "✓ Đã cấp quyền Admin" : "✓ Đã bỏ quyền Admin");
    load();
  };

  const toggleLock = async () => {
    if (userId === currentUserId) { alert("Không thể tự khóa tài khoản của chính mình"); return; }
    const next = !detail.is_locked;
    if (!window.confirm(next ? `Khóa tài khoản "${detail.username}"?` : `Mở khóa tài khoản "${detail.username}"?`)) return;
    const { error } = await supabase.from("profiles").update({ is_locked: next }).eq("id", userId);
    if (error) { alert("Thất bại: " + error.message); return; }
    await logAction(next ? "lock_account" : "unlock_account");
    showFlash(next ? "✓ Đã khóa tài khoản" : "✓ Đã mở khóa tài khoản");
    load();
  };

  const resetPassword = async () => {
    if (!detail?.email) return;
    if (!window.confirm(`Gửi email đặt lại mật khẩu tới "${detail.email}"?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(detail.email);
    if (error) { alert("Gửi thất bại: " + error.message); return; }
    await logAction("reset_password_email");
    showFlash("✓ Đã gửi email đặt lại mật khẩu");
  };

  const saveNotes = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ admin_notes: notes }).eq("id", userId);
    if (error) { alert("Lưu thất bại: " + error.message); setSaving(false); return; }
    await logAction("update_notes");
    showFlash("✓ Đã lưu ghi chú");
    setSaving(false);
  };

  const doDelete = async () => {
    if (confirmText !== detail.username) return;
    const { error } = await supabase.from("profiles").update({
      is_locked: true,
      admin_notes: (notes ? notes + "\n" : "") + `[Đã yêu cầu xóa ${fmtDate(new Date())} bởi admin]`,
    }).eq("id", userId);
    if (error) { alert("Thất bại: " + error.message); return; }
    await logAction("delete_requested", "Khóa tài khoản, chờ xóa vĩnh viễn qua Edge Function (chưa triển khai)");
    setConfirmDelete(false);
    showFlash("✓ Đã khóa tài khoản (xóa vĩnh viễn cần thêm Edge Function, xem ghi chú trong file SQL)");
    load();
  };

  if (loading) return <div style={card}>Đang tải...</div>;
  if (!detail) return <div style={card}>Không tìm thấy user. <button onClick={onBack} style={{ marginLeft: 8 }}>Quay lại</button></div>;

  const statCards = [
    { l: "Bữa ăn đã ghi", v: detail.meal_days_logged },
    { l: "Tuần cân nặng", v: detail.weight_weeks_logged },
    { l: "AI macro tháng này", v: detail.ai_macro_count_this_month },
    { l: "AI chat hôm nay", v: detail.ai_chat_count_today },
  ];

  return (
    <div style={{ ...card, maxWidth: 900, margin: "0 auto" }}>
      <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14, cursor: "pointer", color: C.primary, fontSize: 14, fontWeight: 700 }}>← Quay lại danh sách</div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: C.primary }}>{initials(detail.username)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: C.t1, display: "flex", alignItems: "center", gap: 8 }}>{detail.username}{detail.is_admin && <span style={{ fontSize: 10, fontWeight: 800, color: C.red, background: C.redBg, padding: "2px 7px", borderRadius: 6 }}>ADMIN</span>}</div>
          <div style={{ fontSize: 13, color: C.t2 }}>{detail.email} · tham gia {fmtDT(detail.created_at)} · đăng nhập gần nhất {fmtDT(detail.last_sign_in_at)}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: TIER_BG[detail.tier] || C.surface, color: TIER_FG[detail.tier] || C.t2 }}>{TIER_LABEL[detail.tier] || detail.tier}</span>
      </div>

      {flash && <div style={{ marginBottom: 14, padding: "10px 14px", background: C.greenBg, borderRadius: 10, border: `1.5px solid ${C.green}`, fontSize: 13, fontWeight: 700, color: "#14532D" }}>{flash}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ background: C.surface, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: C.t2, fontWeight: 600 }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginTop: 4 }}>{s.v ?? 0}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, color: C.t1, marginBottom: 12 }}>Gói và thời hạn</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <select value={tierForm.tier} onChange={e => setTierForm(f => ({ ...f, tier: e.target.value }))} style={{ ...inp, width: 130 }}>
            <option value="free">Free</option>
            <option value="trial">Trial</option>
            <option value="premium">Premium</option>
          </select>
          {tierForm.tier === "trial"
            ? <input type="date" value={tierForm.trial_end_date || ""} onChange={e => setTierForm(f => ({ ...f, trial_end_date: e.target.value }))} style={{ ...inp, width: 160 }} />
            : <input type="date" value={tierForm.subscription_end_date || ""} onChange={e => setTierForm(f => ({ ...f, subscription_end_date: e.target.value }))} style={{ ...inp, width: 160 }} />}
          <button onClick={handleSaveTier} disabled={saving} style={{ padding: "0 16px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#36A3FF,#007AFF)", color: "#fff", cursor: "pointer", height: 40 }}>Lưu thay đổi</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["30d", "+30 ngày"], ["3m", "+3 tháng"], ["6m", "+6 tháng"], ["12m", "+12 tháng"]].map(([k, l]) => (
            <button key={k} onClick={() => quickExtend(k)} disabled={saving} style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.t1, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, color: C.t1 }}>Quyền Admin</div>
          <div style={{ fontSize: 12, color: C.t2 }}>Cho phép user này truy cập trang Quản trị</div>
        </div>
        <input type="checkbox" checked={!!detail.is_admin} onChange={toggleAdmin} style={{ width: 20, height: 20 }} />
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, color: C.t1, marginBottom: 10 }}>Công cụ hỗ trợ</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={resetPassword} style={{ fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>🔑 Gửi email đặt lại mật khẩu</button>
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, color: C.t1, marginBottom: 8 }}>Ghi chú nội bộ</div>
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Chỉ Admin thấy được ghi chú này" style={{ ...inp, height: "auto", width: "100%", resize: "vertical", padding: "10px 12px" }} />
        <button onClick={saveNotes} disabled={saving} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#36A3FF,#007AFF)", color: "#fff", cursor: "pointer" }}>Lưu ghi chú</button>
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 14 }}>
        <div style={{ fontWeight: 800, color: C.t1, marginBottom: 10 }}>Nhật ký hoạt động</div>
        {audit.length === 0 && <div style={{ fontSize: 13, color: C.t3 }}>Chưa có hoạt động nào</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {audit.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.t2 }}>
              <span>{a.action}{a.note ? ` — ${a.note}` : ""}</span>
              <span style={{ color: C.t3, flexShrink: 0, marginLeft: 10 }}>{fmtDT(a.created_at)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: `1.5px solid ${C.red}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontWeight: 800, color: C.red, marginBottom: 10 }}>Khu vực nguy hiểm</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={toggleLock} style={{ fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${C.red}`, background: "#fff", color: C.red, cursor: "pointer" }}>{detail.is_locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</button>
          <button onClick={() => { if (userId === currentUserId) { alert("Không thể tự xóa tài khoản của chính mình"); return; } setConfirmDelete(true); }} style={{ fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${C.red}`, background: "#fff", color: C.red, cursor: "pointer" }}>Xóa tài khoản</button>
        </div>
        {confirmDelete && (
          <div style={{ marginTop: 12, padding: 12, background: C.redBg, borderRadius: 10 }}>
            <div style={{ fontSize: 12, color: "#7F1D1D", fontWeight: 600, marginBottom: 8 }}>Xóa vĩnh viễn cần Edge Function riêng (chưa triển khai) — hành động này sẽ khóa cứng tài khoản. Gõ lại tên <b>{detail.username}</b> để xác nhận:</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)} style={{ ...inp, flex: 1 }} />
              <button onClick={doDelete} disabled={confirmText !== detail.username} style={{ padding: "0 16px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, background: C.red, color: "#fff", cursor: confirmText === detail.username ? "pointer" : "default", opacity: confirmText === detail.username ? 1 : 0.5, height: 40 }}>Xác nhận</button>
              <button onClick={() => { setConfirmDelete(false); setConfirmText(""); }} style={{ padding: "0 16px", fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff", cursor: "pointer", height: 40 }}>Hủy</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
