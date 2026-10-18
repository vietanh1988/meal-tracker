// Quản trị PC › Người dùng (bản vẽ 118). Giữ đủ chức năng tab cũ src/adminTabs/UsersTab.jsx (cùng RPC / bảng / quyền):
//  - Tìm + 4 bộ lọc (gói, trạng thái, vai trò, hạn dùng: sắp hết 7 ngày / đã hết) → RPC admin_list_users, 50 user/trang.
//  - Bấm 1 dòng → ngăn phải 360 px (không sang trang khác): gói & thời hạn (đổi gói + lưu, +30 ngày / +3 / +6 / +12 tháng),
//    hồ sơ tóm tắt (cảnh báo "mục tiêu ngược"), phân quyền (chỉ Super Admin đổi), hỗ trợ (email đặt lại mật khẩu),
//    ghi chú nội bộ, nhật ký hoạt động, khu vực nguy hiểm khoá / xoá (gõ lại tên để xác nhận xoá).
//  - Hỏi lại bằng hộp thoại trong app (appConfirm), không dùng window.confirm. Không emoji.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { appAlert, appConfirm } from "../lib/dialog";
import { todayVN, addDays, diffDays, fmtVN, isValidDateStr } from "../lib/dateVN";
import { calcMacro } from "../calcMacro";
import { PC } from "../theme";
import { watchPresence } from "../lib/presence";
import { agoShort } from "../lib/behavior";
import { Dot } from "./PcBehavior";
import { Btn, Pill, Card, SearchBox, FilterSelect, ErrorBox, Loading, headRow, bodyRow, cell, secLbl, vnInt, vnDec, fmtDT } from "./pcUI";

// 18/10 (bản vẽ 135e): cột đầu "Đang dùng app" — chấm xanh = đang mở app (Realtime Presence), đỏ = offline · lần cuối bao lâu (app_events)
const COLS = "1.1fr 1.7fr 0.8fr 1.1fr 0.9fr 0.9fr 0.8fr";
const PAGE = 50;
const TIER = { free: ["Free", "gray"], trial: ["Trial", "amber"], premium: ["Premium", "blue"] };
const GOAL = { bulk: "Tăng cơ", cut: "Giảm mỡ", maintain: "Giữ cân" };
const ACTION = { update_tier: "Đổi gói", extend_subscription: "Gia hạn", grant_admin: "Cấp quyền Admin", revoke_admin: "Bỏ quyền Admin", change_admin_role: "Đổi quyền", lock_account: "Khoá tài khoản", unlock_account: "Mở khoá tài khoản", reset_password_email: "Gửi email đặt lại mật khẩu", update_notes: "Sửa ghi chú", delete_requested: "Yêu cầu xoá tài khoản", confirm_order: "Duyệt đơn", reject_order: "Từ chối đơn" };
const AVA = ["#F59E0B", "#2563EB", "#10B981", "#8B5CF6", "#EF4444", "#0891B2"];
const avaColor = (s) => AVA[[...String(s || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % AVA.length];
const initials = (name) => (name || "?").trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");

async function logAudit(adminId, targetId, action, note) {
  try { await supabase.from("admin_audit_log").insert({ admin_id: adminId, target_user_id: targetId, action, note: note || null }); } catch (e) { console.error("audit log error:", e); }
}

// "YYYY-MM-DD" + n tháng (ngày cuối tháng tự kẹp: 31/01 + 1 tháng → 28/02)
function addMonths(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}

function expiryText(u) {
  const d = dateOnly(u.tier === "premium" ? u.subscription_end_date : u.tier === "trial" ? u.trial_end_date : null);
  if (!d || !isValidDateStr(d)) return "—";
  const left = diffDays(todayVN(), d);
  if (u.tier === "trial") return left < 0 ? `${fmtVN(d)} · đã hết hạn` : `${fmtVN(d)} · còn ${left} ngày`;
  return left < 0 ? `${fmtVN(d, true)} · đã hết hạn` : fmtVN(d, true);
}
const roleOf = (u) => (u.admin_role === "super" ? "super" : u.is_admin ? "admin" : "user");
// Mục tiêu ngược: tăng cơ mà cân mục tiêu < cân hiện tại, hoặc giảm mỡ mà cân mục tiêu > cân hiện tại
export const goalContradicts = (goalType, kg, goalKg) => {
  const k = Number(kg), g = Number(goalKg);
  if (!k || !g) return false;
  return (goalType === "bulk" && g < k) || (goalType === "cut" && g > k);
};

export function PcUsers({ top, currentUserId, isSuperAdmin }) {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [expiry, setExpiry] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState(null);
  const [online, setOnline] = useState(() => new Set());
  const [lastAt, setLastAt] = useState({});
  const [onlineF, setOnlineF] = useState("");
  useEffect(() => watchPresence(setOnline), []);
  useEffect(() => {
    let alive = true;
    supabase.rpc("admin_behavior_users").then(({ data }) => { if (alive && Array.isArray(data)) setLastAt(Object.fromEntries(data.map((u) => [u.id, u.last_at]))); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const fetchUsers = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase.rpc("admin_list_users", {
      p_search: search || null, p_status: status || null, p_tier: tier || null, p_role: role || null, p_expiry: expiry || null,
      p_date_from: null, p_date_to: null, p_sort: "created_at", p_sort_dir: "desc", p_limit: PAGE, p_offset: page * PAGE,
    });
    if (error) { console.error("admin_list_users error:", error); setErr(error.message || "Lỗi tải danh sách"); setRows([]); setTotal(0); return; }
    setRows(data || []); setTotal((data && data[0] && Number(data[0].total_count)) || 0);
  }, [search, status, tier, role, expiry, page]);
  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [fetchUsers]);
  useEffect(() => { setPage(0); }, [search, status, tier, role, expiry]);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const filtered = search || tier || status || role || expiry;

  return (
    <>
      {top(null)}
      <div data-testid="pc-users" style={{ padding: "20px 24px", marginRight: sel ? 360 : 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, email…" width={200} testid="pc-users-search" />
          <FilterSelect label="Gói" value={tier} onChange={setTier} testid="pc-users-f-tier" options={[{ v: "", label: "Tất cả" }, { v: "free", label: "Free" }, { v: "trial", label: "Trial" }, { v: "premium", label: "Premium" }]} />
          <FilterSelect label="Trạng thái" value={status} onChange={setStatus} testid="pc-users-f-status" options={[{ v: "", label: "Tất cả" }, { v: "active", label: "Hoạt động" }, { v: "locked", label: "Bị khoá" }]} />
          <FilterSelect label="Đang dùng app" value={onlineF} onChange={setOnlineF} testid="pc-users-f-online" options={[{ v: "", label: "Tất cả" }, { v: "on", label: "Đang dùng" }, { v: "off", label: "Offline" }]} />
          <FilterSelect label="Vai trò" value={role} onChange={setRole} testid="pc-users-f-role" options={[{ v: "", label: "Tất cả" }, { v: "user", label: "User" }, { v: "admin", label: "Admin" }]} />
          <FilterSelect label="Hạn dùng" value={expiry} onChange={setExpiry} testid="pc-users-f-expiry" options={[{ v: "", label: "Tất cả" }, { v: "expiring_7d", label: "Sắp hết hạn (7 ngày)" }, { v: "expired", label: "Đã hết hạn" }]} />
          {filtered && <Btn kind="light" onClick={() => { setSearch(""); setTier(""); setStatus(""); setRole(""); setExpiry(""); }} testid="pc-users-clear" style={{ height: 36 }}>Xoá lọc</Btn>}
          <span data-testid="pc-users-count" style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span data-testid="pc-users-online" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#15803D", fontWeight: 800 }}><Dot on />{online.size} đang dùng app</span>· {vnInt(total)} user
            {pages > 1 && <>· trang {page + 1}/{pages}
              <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={page === 0} onClick={() => setPage((p) => p - 1)} title="Trang trước">‹</Btn>
              <Btn kind="light" style={{ height: 28, padding: "0 10px" }} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} title="Trang sau">›</Btn></>}
          </span>
        </div>
        {err && <ErrorBox text={`Chưa tải được danh sách người dùng: ${err}`} onRetry={fetchUsers} />}
        <Card>
          <div style={headRow(COLS)}><span>ĐANG DÙNG APP</span><span>NGƯỜI DÙNG</span><span>GÓI</span><span>HẾT HẠN</span><span>TRẠNG THÁI</span><span>HOẠT ĐỘNG CUỐI</span><span>VAI TRÒ</span></div>
          {rows == null && <Loading />}
          {rows && rows.length === 0 && !err && <div data-testid="pc-users-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Không tìm thấy người dùng nào.</div>}
          {(rows || []).filter((u) => !onlineF || (onlineF === "on") === online.has(u.id)).map((u, i, arr) => {
            const [tl, tt] = TIER[u.tier] || [u.tier || "Free", "gray"];
            const r = roleOf(u);
            return (
              <button key={u.id} data-testid="pc-user-row" data-id={u.id} onClick={() => setSel(u.id)} className="pc-row pc-click"
                style={{ ...bodyRow(COLS, sel === u.id), borderBottom: i === arr.length - 1 ? "none" : bodyRow(COLS).borderBottom, borderRadius: i === arr.length - 1 ? "0 0 14px 14px" : 0 }}>
                {(() => { const on = online.has(u.id); const ago = agoShort(lastAt[u.id]); return (
                  <span data-testid="pc-user-online" data-on={on ? "1" : "0"} style={{ ...cell, display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, color: on ? "#15803D" : "#B91C1C" }} title={on ? "Đang mở app" : ago ? `Offline · lần cuối ${ago} trước` : "Offline"}>
                    <Dot on={on} />{on ? "Đang dùng" : ago ? `Offline · ${ago}` : "Offline"}
                  </span>); })()}
                <span style={cell} title={`${u.username} · ${u.email}`}>{u.username} · {u.email}</span>
                <span style={cell}><Pill tone={tt}>{tl}</Pill></span>
                <span style={cell}>{expiryText(u)}</span>
                <span style={cell}>{u.is_locked ? <Pill tone="red">Bị khoá</Pill> : <Pill tone="green">Hoạt động</Pill>}</span>
                <span style={cell}>{fmtDT(u.last_sign_in_at)}</span>
                <span style={cell}>{r === "super" ? <Pill tone="violet">Super Admin</Pill> : r === "admin" ? <Pill tone="blue">Admin</Pill> : "User"}</span>
              </button>
            );
          })}
        </Card>
      </div>
      {sel && <UserDrawer key={sel} userId={sel} currentUserId={currentUserId} isSuperAdmin={isSuperAdmin} onClose={() => setSel(null)} onChanged={fetchUsers} />}
    </>
  );
}

function Section({ label, children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={secLbl}>{label}</span>{children}</div>;
}

function UserDrawer({ userId, currentUserId, isSuperAdmin, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [prof, setProf] = useState(null);
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState(null);
  const [form, setForm] = useState({ tier: "free", subscription_end_date: "", trial_end_date: "" });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    const { data, error } = await supabase.rpc("admin_get_user_detail", { p_user_id: userId });
    if (error) { console.error("admin_get_user_detail error:", error); setErr(error.message || "Lỗi tải"); return; }
    const x = data && data[0];
    if (!x) { setErr("Không tìm thấy người dùng"); return; }
    setD(x);
    setForm({ tier: x.tier || "free", subscription_end_date: dateOnly(x.subscription_end_date), trial_end_date: dateOnly(x.trial_end_date) });
    setNotes(x.admin_notes || "");
    // Hồ sơ cơ thể / mục tiêu (cho dòng tóm tắt + cảnh báo mục tiêu ngược)
    const [{ data: p }, { data: log }] = await Promise.all([
      supabase.from("profiles").select("kg,cm,goal_kg,goal_type,months,gender,birth_year,exercise_type,frequency,gym_days,diet_strategy,calorie_mode").eq("id", userId).maybeSingle(),
      supabase.from("admin_audit_log").select("*").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);
    setProf(p || null);
    setAudit(log || []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const k = (e) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const show = (m) => { setFlash(m); setTimeout(() => setFlash(""), 3000); };
  const act = (action, note) => logAudit(currentUserId, userId, action, note);
  const after = () => { load(); onChanged?.(); };

  // Đổi gói + lưu (như tab cũ: bỏ trống ngày → Trial 7 ngày, Premium 30 ngày, tính theo ngày VN)
  const saveTier = async () => {
    setSaving(true);
    let trialEnd = form.trial_end_date || null, subEnd = form.subscription_end_date || null;
    if (form.tier === "trial" && !trialEnd) trialEnd = addDays(todayVN(), 7);
    if (form.tier === "premium" && !subEnd) subEnd = addDays(todayVN(), 30);
    const { error } = await supabase.from("profiles").update({ tier: form.tier, subscription_end_date: subEnd, trial_end_date: trialEnd }).eq("id", userId);
    setSaving(false);
    if (error) { appAlert("Lưu thất bại: " + error.message); return; }
    await act("update_tier", `Đổi gói -> ${form.tier}, hết hạn ${(form.tier === "trial" ? trialEnd : subEnd) || "-"}`);
    show("Đã lưu gói và thời hạn");
    after();
  };
  const extend = async (kind) => {
    const today = todayVN();
    const cur = form.subscription_end_date && isValidDateStr(form.subscription_end_date) ? form.subscription_end_date : today;
    const base = cur < today ? today : cur;
    const iso = kind === "30d" ? addDays(base, 30) : addMonths(base, kind === "3m" ? 3 : kind === "6m" ? 6 : 12);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ tier: "premium", subscription_end_date: iso }).eq("id", userId);
    setSaving(false);
    if (error) { appAlert("Gia hạn thất bại: " + error.message); return; }
    await act("extend_subscription", `Gia hạn ${kind} -> hết hạn ${fmtVN(iso, true)}`);
    show("Đã gia hạn");
    after();
  };
  const toggleAdmin = async () => {
    if (!isSuperAdmin) return;
    if (userId === currentUserId) { appAlert("Không thể tự bỏ quyền Admin của chính mình"); return; }
    const next = !d.is_admin;
    if (!await appConfirm(next ? `Cấp quyền Admin cho "${d.username}"?` : `Bỏ quyền Admin của "${d.username}"?`, { danger: !next })) return;
    const { error } = await supabase.from("profiles").update(next ? { is_admin: true, admin_role: "admin" } : { is_admin: false, admin_role: null }).eq("id", userId);
    if (error) { appAlert("Thất bại: " + error.message); return; }
    await act(next ? "grant_admin" : "revoke_admin");
    show(next ? "Đã cấp quyền Admin (thường)" : "Đã bỏ quyền Admin");
    after();
  };
  const changeRole = async (r) => {
    if (!isSuperAdmin || r === (d.admin_role === "super" ? "super" : "admin")) return;
    if (userId === currentUserId) { appAlert("Không thể tự đổi role của chính mình"); return; }
    if (!await appConfirm(`Đổi quyền "${d.username}" thành ${r === "super" ? "Super Admin" : "Admin thường"}?`)) return;
    const { error } = await supabase.from("profiles").update({ admin_role: r }).eq("id", userId);
    if (error) { appAlert("Thất bại: " + error.message); return; }
    await act("change_admin_role", `→ ${r}`);
    show(`Đã đổi thành ${r === "super" ? "Super Admin" : "Admin thường"}`);
    after();
  };
  const toggleLock = async () => {
    if (!isSuperAdmin) return;
    if (userId === currentUserId) { appAlert("Không thể tự khóa tài khoản của chính mình"); return; }
    const next = !d.is_locked;
    if (!await appConfirm(next ? `Khóa tài khoản "${d.username}"?` : `Mở khóa tài khoản "${d.username}"?`, { danger: next, confirmText: next ? "Khoá" : "Mở khoá" })) return;
    const { error } = await supabase.from("profiles").update({ is_locked: next }).eq("id", userId);
    if (error) { appAlert("Thất bại: " + error.message); return; }
    await act(next ? "lock_account" : "unlock_account");
    show(next ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
    after();
  };
  const resetPassword = async () => {
    if (!d?.email) return;
    if (!await appConfirm(`Gửi email đặt lại mật khẩu tới "${d.email}"?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(d.email);
    if (error) { appAlert("Gửi thất bại: " + error.message); return; }
    await act("reset_password_email");
    show("Đã gửi email đặt lại mật khẩu");
  };
  const saveNotes = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ admin_notes: notes }).eq("id", userId);
    setSaving(false);
    if (error) { appAlert("Lưu thất bại: " + error.message); return; }
    await act("update_notes");
    show("Đã lưu ghi chú");
  };
  const doDelete = async () => {
    if (confirmText !== d.username) return;
    const { error } = await supabase.from("profiles").update({ is_locked: true, admin_notes: (notes ? notes + "\n" : "") + `[Đã yêu cầu xóa ${fmtVN(todayVN(), true)} bởi admin]` }).eq("id", userId);
    if (error) { appAlert("Thất bại: " + error.message); return; }
    await act("delete_requested", "Khóa tài khoản, chờ xóa vĩnh viễn qua Edge Function (chưa triển khai)");
    setConfirmDel(false); setConfirmText("");
    show("Đã khóa tài khoản (xóa vĩnh viễn cần thêm Edge Function)");
    after();
  };

  // Lượt AI: DB chỉ đặt lại khi có lượt mới → tự so ngày/tháng (giờ VN) trước khi hiện (như tab cũ)
  const today = todayVN(), month = today.slice(0, 7);
  const macroUsed = d && (d.ai_macro_count_reset_at || "").slice(0, 7) === month ? d.ai_macro_count_this_month || 0 : 0;
  const menuUsed = d && dateOnly(d.ai_menu_count_reset_at) === today ? d.ai_menu_count_today || 0 : 0;
  const chatUsed = d && dateOnly(d.ai_chat_count_reset_at) === today ? d.ai_chat_count_today || 0 : 0;
  const goalType = prof?.goal_type ?? d?.goal_type, kg = prof?.kg ?? d?.kg, goalKg = prof?.goal_kg ?? d?.goal_kg;
  const reversed = goalContradicts(goalType, kg, goalKg);
  let kcal = null;
  if (prof && prof.kg) {
    try {
      kcal = calcMacro({ cm: prof.cm || 170, kg: Number(prof.kg), birthYear: prof.birth_year || 1995, goalKg: Number(prof.goal_kg) || Number(prof.kg), goalType: prof.goal_type || "bulk", months: prof.months || 4, gender: prof.gender || "male", exerciseType: prof.exercise_type || "gym", frequency: prof.frequency || "regular", dietStrategy: prof.diet_strategy || "balanced", calorieMode: prof.calorie_mode || "standard", gymDays: prof.gym_days || [], cutPace: prof.cut_pace || null, calOffset: prof.cal_offset || 0 })?.calTarget || null;
    } catch (e) { kcal = null; }
  }
  const gymN = Array.isArray(prof?.gym_days) ? prof.gym_days.length : null;
  const curEnd = form.tier === "trial" ? form.trial_end_date : form.subscription_end_date;
  const r = d ? roleOf(d) : "user";

  return (
    <aside data-testid="pc-user-drawer" aria-label="Chi tiết người dùng" style={{ position: "fixed", right: 0, top: PC.topH, bottom: 0, width: 360, background: "#FFFFFF", borderLeft: `1px solid ${PC.line}`, boxShadow: "-10px 0 30px rgba(15,23,42,0.06)", padding: 18, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, overflowY: "auto", zIndex: 25 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 20, background: avaColor(d?.username), color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}>{d ? initials(d.username) : ""}</span>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d?.username || "…"}</b>
          <span style={{ color: PC.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d ? `${d.email} · từ ${fmtDT(d.created_at, { time: false })}` : ""}</span>
        </span>
        <button data-testid="pc-user-close" onClick={onClose} aria-label="Đóng" className="pc-btn" style={{ width: 32, height: 32, border: "none", borderRadius: 8, background: "transparent", color: PC.t4, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}>×</button>
      </div>
      {err && <ErrorBox text={`Chưa tải được chi tiết: ${err}`} onRetry={load} />}
      {!d && !err && <Loading />}
      {flash && <div data-testid="pc-user-flash" role="status" style={{ padding: "8px 12px", borderRadius: 10, background: "#DCFCE7", color: "#166534", fontWeight: 700 }}>{flash}</div>}
      {d && <>
        <Section label="GÓI & THỜI HẠN">
          <div style={{ display: "flex", gap: 6 }} role="radiogroup" aria-label="Gói">
            {["free", "trial", "premium"].map((t) => {
              const on = form.tier === t;
              return <button key={t} role="radio" aria-checked={on} data-testid={`pc-user-tier-${t}`} onClick={() => setForm((f) => ({ ...f, tier: t }))} className="pc-btn"
                style={{ flex: 1, height: 34, borderRadius: 10, border: "none", fontWeight: 800, fontSize: 13, fontFamily: "inherit", cursor: "pointer", background: on ? PC.t1 : "#F1F5F9", color: on ? "#FFFFFF" : PC.t1 }}>{TIER[t][0]}</button>;
            })}
          </div>
          {form.tier !== "free" && <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: PC.t3, whiteSpace: "nowrap" }}>Hết hạn</span>
            <input type="date" data-testid="pc-user-end" className="pc-input" value={curEnd || ""} onChange={(e) => setForm((f) => (f.tier === "trial" ? { ...f, trial_end_date: e.target.value } : { ...f, subscription_end_date: e.target.value }))}
              style={{ flex: 1, minWidth: 0, height: 34, borderRadius: 10, border: `1px solid ${PC.field}`, padding: "0 10px", fontFamily: "inherit", fontSize: 13 }} />
          </div>}
          {form.tier !== "free" && !curEnd && <span style={{ fontSize: 12, color: "#B45309", background: "#FEF3C7", borderRadius: 8, padding: "6px 10px" }}>Để trống ngày hết hạn thì khi bấm Lưu sẽ tự đặt {form.tier === "trial" ? "Trial 7 ngày" : "Premium 30 ngày"}.</span>}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Btn kind="blue" onClick={saveTier} disabled={saving} testid="pc-user-save-tier">Lưu gói</Btn>
            <span style={{ color: PC.t3 }}>Hết hạn: {expiryText(d)}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: PC.t3 }}>Thêm Premium:</span>
            {[["30d", "+30 ngày"], ["3m", "+3 tháng"], ["6m", "+6 tháng"], ["12m", "+12 tháng"]].map(([k, l]) => <Btn key={k} kind="soft" onClick={() => extend(k)} disabled={saving} testid={`pc-user-extend-${k}`} style={{ padding: "0 10px" }}>{l}</Btn>)}
          </div>
        </Section>

        <Section label="HỒ SƠ">
          <span data-testid="pc-user-goal" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {GOAL[goalType] || "Chưa đặt mục tiêu"}{kg ? ` · ${vnDec(kg)} → ${vnDec(goalKg)} kg` : ""}
            {reversed && <Pill tone="red" testid="pc-user-goal-warn">mục tiêu ngược</Pill>}
          </span>
          <span style={{ color: PC.t2, lineHeight: 1.5 }}>
            {[kcal ? `${vnInt(kcal)} kcal/ngày tập` : null, gymN != null ? `${gymN} buổi/tuần` : null, `AI dùng: ${menuUsed} menu · ${chatUsed} chat hôm nay · ${macroUsed} macro tháng này`].filter(Boolean).join(" · ")}
          </span>
          <span style={{ color: PC.t3 }}>{vnInt(d.meal_days_logged || 0)} ngày ghi bữa · {vnInt(d.weight_weeks_logged || 0)} tuần cân · đăng nhập gần nhất {fmtDT(d.last_sign_in_at)}</span>
        </Section>

        <Section label="PHÂN QUYỀN">
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span data-testid="pc-user-role">{r === "super" ? "Super Admin" : r === "admin" ? "Admin thường" : "User"}</span>
            {isSuperAdmin && <Btn kind={d.is_admin ? "danger" : "soft"} onClick={toggleAdmin} testid="pc-user-toggle-admin">{d.is_admin ? "Bỏ quyền Admin" : "Cấp quyền Admin"}</Btn>}
          </span>
          {isSuperAdmin && d.is_admin && <div style={{ display: "flex", gap: 6 }}>
            {[["admin", "Admin thường", "Xem hết, không sửa/xoá"], ["super", "Super Admin", "Toàn quyền quản trị"]].map(([k, l, s]) => {
              const on = (d.admin_role === "super" ? "super" : "admin") === k;
              return <button key={k} data-testid={`pc-user-role-${k}`} aria-pressed={on} onClick={() => changeRole(k)} className="pc-btn"
                style={{ flex: 1, padding: "6px 10px", borderRadius: 10, border: `1.5px solid ${on ? "#1A7CFF" : PC.field}`, background: on ? PC.soft : "#FFFFFF", color: on ? PC.softFg : PC.t2, fontFamily: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>{l}<div style={{ fontSize: 11, fontWeight: 500, color: PC.t3 }}>{s}</div></button>;
            })}
          </div>}
          {!isSuperAdmin && <span style={{ fontSize: 12, color: PC.t3 }}>Chỉ Super Admin đổi được phân quyền.</span>}
        </Section>

        <Section label="HỖ TRỢ">
          <span><Btn kind="soft" onClick={resetPassword} testid="pc-user-reset-pass">Gửi email đặt lại mật khẩu</Btn></span>
        </Section>

        <Section label="GHI CHÚ NỘI BỘ">
          <textarea data-testid="pc-user-notes" className="pc-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú cho admin…"
            style={{ minHeight: 60, borderRadius: 10, border: `1px solid ${PC.field}`, padding: 8, fontFamily: "inherit", fontSize: 13, resize: "vertical", color: PC.t1 }} />
          <span><Btn kind="soft" onClick={saveNotes} disabled={saving} testid="pc-user-save-notes">Lưu ghi chú</Btn></span>
        </Section>

        <Section label="NHẬT KÝ HOẠT ĐỘNG">
          {audit.length === 0 && <span style={{ color: PC.t3 }}>Chưa có hoạt động nào</span>}
          {audit.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 8, justifyContent: "space-between", color: PC.t2 }}>
              <span style={{ minWidth: 0 }}>{ACTION[a.action] || a.action}{a.note ? ` — ${a.note}` : ""}</span>
              <span style={{ color: PC.t4, flexShrink: 0 }}>{fmtDT(a.created_at)}</span>
            </div>
          ))}
        </Section>

        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${PC.dangerBg}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ ...secLbl, color: PC.danger }}>KHU VỰC NGUY HIỂM</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="danger" onClick={toggleLock} disabled={!isSuperAdmin} testid="pc-user-lock" title={isSuperAdmin ? undefined : "Chỉ Super Admin"}>{d.is_locked ? "Mở khoá tài khoản" : "Khoá tài khoản"}</Btn>
            <Btn kind="danger" disabled={!isSuperAdmin} testid="pc-user-delete" title={isSuperAdmin ? undefined : "Chỉ Super Admin"} onClick={() => { if (userId === currentUserId) { appAlert("Không thể tự xóa tài khoản của chính mình"); return; } setConfirmDel(true); }}>Xoá tài khoản</Btn>
          </div>
          {confirmDel && (
            <div data-testid="pc-user-delete-confirm" style={{ padding: 12, background: "#FEF2F2", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#7F1D1D", fontWeight: 600, lineHeight: 1.5 }}>Xoá vĩnh viễn cần Edge Function riêng (chưa triển khai) — thao tác này sẽ khoá cứng tài khoản. Gõ lại tên <b>{d.username}</b> để xác nhận:</span>
              <input data-testid="pc-user-delete-input" className="pc-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} aria-label="Gõ lại tên người dùng"
                style={{ height: 34, borderRadius: 10, border: `1px solid #FECACA`, padding: "0 10px", fontFamily: "inherit", fontSize: 13 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <Btn kind="danger" style={{ background: "#DC2626", color: "#FFFFFF" }} disabled={confirmText !== d.username} onClick={doDelete} testid="pc-user-delete-ok">Xác nhận</Btn>
                <Btn kind="light" onClick={() => { setConfirmDel(false); setConfirmText(""); }} testid="pc-user-delete-cancel">Huỷ</Btn>
              </div>
            </div>
          )}
        </div>
      </>}
    </aside>
  );
}

