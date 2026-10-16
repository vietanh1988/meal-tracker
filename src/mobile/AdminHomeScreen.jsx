// Tôi › Quản trị (bản vẽ 52, chốt 14/10) — nền tối.
//  - Bỏ nhóm "Cá nhân" (Hồ sơ, Tài khoản, Báo cáo, Giới thiệu, Điều khoản) vì đã có ở Tôi.
//  - 3 ô đếm việc cần làm: đơn chờ duyệt, góp ý chờ trả lời, món AI tính chờ duyệt (đếm thật từ DB).
//  - Nhóm Bán hàng / Nội dung / Hệ thống; mở từng mục vẫn là màn admin cũ (AdminPanel initialSection).
// AdminFeedbackScreen (bản vẽ 53): góp ý chưa trả lời lên đầu, ô trả lời 1 dòng + Gửi, rating theo tính năng, nhận xét kèm sao.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtVN, toVNDate } from "../lib/dateVN";
import { Icon, DkIcon, GRAD_BLUE } from "./ui";
import { DK, dkCard } from "../theme";

const svg = (d) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const I = {
  receipt: svg(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  chart: svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  layers: svg(<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>),
  food: svg(<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" />),
  check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  version: svg(<><path d="M4 4h16v12H4z" /><path d="M8 20h8M12 16v4M8 9l2 2-2 2M12 13h4" /></>),
  toggle: svg(<><rect x="2" y="7" width="20" height="10" rx="5" /><circle cx="16" cy="12" r="3" /></>),
  chip: svg(<><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>),
  coin: svg(<><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.7 0-2.8 1-2.8 2.2 0 2.8 5.6 1.5 5.6 4.3 0 1.2-1.1 2.2-2.8 2.2-1.2 0-2.2-.6-2.7-1.6M12 6v2M12 16v2" /></>),
  save: svg(<><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>),
  chat: svg(<path d="M5 5h14v10H9l-4 4z" />),
};
// Tiêu đề màn con (MobileApp dùng làm tiêu đề SubPage)
export const ADMIN_TITLES = { orders: "Duyệt đơn hàng", report_biz: "Báo cáo kinh doanh", templates: "Kho mẫu thực đơn", food_db: "Kho thực phẩm", food_cache_pending: "Duyệt món AI tính", admin: "Phiên bản & thông báo", feature_flags: "Quản lý tính năng", ai: "Kết nối AI", ai_cost: "Chi phí AI", backup: "Sao lưu", admin_feedback: "Góp ý & báo lỗi" };

const sec = { display: "block", padding: "18px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const group = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
const badge = (n, bg, fg) => n > 0 ? <span style={{ fontSize: 11, fontWeight: 800, color: fg, background: bg, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{n} chờ</span> : null;

function Row({ id, icon, color, label, value, last, open }) {
  return (
    <button data-testid={`admin-${id}`} onClick={() => open(id)} className="tap row-hover" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 54, border: "none", borderBottom: last ? "none" : `1px solid ${DK.line}`, background: "transparent", padding: 0, fontFamily: "inherit", color: DK.t1, textAlign: "left" }}>
      <DkIcon color={color}>{icon}</DkIcon>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{label}</span>
      {value}
      {Icon.chev(16, DK.chev)}
    </button>
  );
}
function Stat({ n, label, color, testid, onClick }) {
  return (
    <button data-testid={testid} onClick={onClick} className="tap" style={{ ...dkCard, borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, fontFamily: "inherit", color: DK.t1, textAlign: "left" }}>
      <span style={{ fontSize: 20, fontWeight: 900, color }}>{n == null ? "–" : n}</span>
      <span style={{ fontSize: 11, color: DK.t3 }}>{label}</span>
    </button>
  );
}

export function AdminHomeScreen({ isSuperAdmin, appVersion, open }) {
  const [c, setC] = useState({});
  useEffect(() => {
    let off = false;
    (async () => {
      const head = { count: "exact", head: true };
      const [o, f, p] = await Promise.all([
        supabase.from("orders").select("id", head).eq("status", "pending"),
        supabase.from("user_feedback").select("id", head).neq("status", "replied"),
        supabase.from("food_cache_pending").select("id", head),
      ]);
      if (!off) setC({ orders: o.count ?? null, feedback: f.count ?? null, pending: p.count ?? null });
    })().catch(() => {});
    return () => { off = true; };
  }, []);
  return (
    <div data-testid="admin-home" style={{ paddingBottom: 32 }}>
      <div style={{ margin: "12px 12px 0 12px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        <Stat testid="admin-stat-orders" n={c.orders} label="Đơn chờ duyệt" color={DK.amber} onClick={() => open("orders")} />
        <Stat testid="admin-stat-feedback" n={c.feedback} label="Góp ý chờ trả lời" color={DK.link} onClick={() => open("admin_feedback")} />
        <Stat testid="admin-stat-pending" n={c.pending} label="Món chờ duyệt" color={DK.green} onClick={() => open("food_cache_pending")} />
      </div>
      <span style={sec}>BÁN HÀNG</span>
      <div style={group}>
        <Row id="orders" open={open} icon={I.receipt} color="#7C3AED" label="Duyệt đơn hàng" value={badge(c.orders, DK.amber, "#1E1B4B")} />
        <Row id="report_biz" open={open} icon={I.chart} color="#2563EB" label="Báo cáo kinh doanh" last />
      </div>
      <span style={sec}>NỘI DUNG</span>
      <div style={group}>
        <Row id="admin_feedback" open={open} icon={I.chat} color="#0891B2" label="Góp ý & báo lỗi" value={badge(c.feedback, DK.link, "#052E4F")} />
        <Row id="templates" open={open} icon={I.layers} color="#00A67E" label="Kho mẫu thực đơn" />
        <Row id="food_db" open={open} icon={I.food} color="#EA580C" label="Kho thực phẩm" />
        <Row id="food_cache_pending" open={open} icon={I.check} color="#059669" label="Duyệt món AI tính" value={badge(c.pending, DK.green, "#052E1F")} last />
      </div>
      <span style={sec}>HỆ THỐNG</span>
      <div style={group}>
        <Row id="admin" open={open} icon={I.version} color="#0891B2" label="Phiên bản & thông báo" value={appVersion ? <span style={{ fontSize: 13, color: DK.t2 }}>v{appVersion}</span> : null} />
        <Row id="feature_flags" open={open} icon={I.toggle} color="#4F46E5" label="Quản lý tính năng" />
        <Row id="ai" open={open} icon={I.chip} color="#007AFF" label="Kết nối AI" />
        <Row id="ai_cost" open={open} icon={I.coin} color="#D97706" label="Chi phí AI" last={!isSuperAdmin} />
        {isSuperAdmin && <Row id="backup" open={open} icon={I.save} color="#64748B" label="Sao lưu" last />}
      </div>
    </div>
  );
}

// ---------------- Góp ý (admin) ----------------
const FEATURES = [["ai_menu", "AI tạo"], ["photo", "Chụp ảnh"], ["ai_chat", "AI Coach"], ["ui", "Giao diện"]];
const FEAT_NAME = { ai_menu: "AI tạo thực đơn", photo: "Chụp ảnh kiểm tra", ai_chat: "AI Coach", ui: "Giao diện" };
const CAT = { suggestion: ["Góp ý", DK.link], bug: ["Báo lỗi", DK.red], ai_menu: ["Lỗi · AI thực đơn", DK.red], photo: ["Lỗi · Chụp ảnh", DK.red], ai_chat: ["Lỗi · AI Chat", DK.red], ui: ["Lỗi · Giao diện", DK.red], other: ["Lỗi · Khác", DK.red] };
const dateOf = (ts) => (ts ? fmtVN(toVNDate(new Date(ts)), true) : "");

export function AdminFeedbackScreen({ showToast }) {
  const [list, setList] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [reply, setReply] = useState({});
  const [busy, setBusy] = useState(null);
  const load = useCallback(async () => {
    const [{ data: fb }, { data: rt }] = await Promise.all([
      supabase.from("user_feedback").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("feature_ratings").select("*").order("created_at", { ascending: false }),
    ]);
    setList(fb || []); setRatings(rt || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (fb) => {
    const text = (reply[fb.id] || "").trim();
    if (!text || busy) return;
    setBusy(fb.id);
    const { error } = await supabase.from("user_feedback").update({ admin_reply: text, status: "replied", admin_replied_at: new Date().toISOString() }).eq("id", fb.id);
    if (!error && fb.user_id) await supabase.from("notifications").insert({ user_id: fb.user_id, title: "💬 Admin đã trả lời góp ý của bạn", body: text.slice(0, 100), url: "feedback" });
    setBusy(null);
    if (error) { showToast?.({ text: "Chưa gửi được trả lời, thử lại nhé." }); return; }
    setReply((r) => ({ ...r, [fb.id]: "" }));
    showToast?.({ text: "Đã gửi trả lời." });
    load();
  };

  if (!list) return <p style={{ margin: 24, textAlign: "center", color: DK.t3, fontSize: 14 }}>Đang tải…</p>;
  const waiting = list.filter((f) => f.status !== "replied");
  const done = list.filter((f) => f.status === "replied");
  const byF = {};
  ratings.forEach((r) => { (byF[r.feature] = byF[r.feature] || []).push(Number(r.rating) || 0); });
  const avgAll = ratings.length ? Math.round((ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / ratings.length) * 10) / 10 : null;
  const comments = ratings.filter((r) => (r.comment || "").trim());

  const item = (fb) => {
    const [tag, tc] = CAT[fb.category] || [fb.category, DK.t2];
    const open = fb.status !== "replied";
    return (
      <div key={fb.id} data-testid="adm-fb-item" style={{ ...dkCard, margin: "8px 12px 0 12px", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: tc, background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{tag}</span>
          <span style={{ fontSize: 14, fontWeight: 800, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fb.username || "Người dùng"}</span>
          <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap" }}>{dateOf(fb.created_at)}</span>
        </div>
        <span style={{ fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{fb.content}</span>
        {fb.image_url && /^data:image\//.test(fb.image_url) && <img src={fb.image_url} alt="Ảnh đính kèm" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: open ? DK.amber : DK.green }}>{open ? "● Chưa trả lời" : "✓ Đã trả lời"}</span>
        {fb.admin_reply && (
          <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(0,200,150,0.14)", borderLeft: `3px solid ${DK.green}` }}>
            <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: DK.green }}>Bạn đã trả lời</span>
            <span style={{ fontSize: 13, color: DK.t2, whiteSpace: "pre-wrap" }}>{fb.admin_reply}</span>
          </div>
        )}
        {open && (
          <div style={{ display: "flex", gap: 8 }}>
            <input data-testid="adm-fb-reply" value={reply[fb.id] || ""} onChange={(e) => setReply((r) => ({ ...r, [fb.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") send(fb); }}
              placeholder="Trả lời phản hồi này…" style={{ flex: 1, minWidth: 0, height: 44, padding: "0 12px", borderRadius: 12, border: `1.5px solid ${DK.fieldLine}`, background: DK.field, color: DK.t1, fontFamily: "inherit", fontSize: 15, boxSizing: "border-box" }} />
            <button data-testid="adm-fb-send" disabled={!(reply[fb.id] || "").trim() || busy === fb.id} onClick={() => send(fb)} style={{ height: 44, padding: "0 16px", borderRadius: 12, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 800 }}>{busy === fb.id ? "…" : "Gửi"}</button>
          </div>
        )}
      </div>
    );
  };

  const stat = (n, t, c) => <div style={{ ...dkCard, borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 20, fontWeight: 900, color: c }}>{n}</span><span style={{ fontSize: 11, color: DK.t3 }}>{t}</span></div>;
  return (
    <div data-testid="admin-feedback" style={{ paddingBottom: 32 }}>
      <div style={{ margin: "12px 12px 0 12px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        {stat(list.length, "Tổng phản hồi", DK.t1)}{stat(waiting.length, "Chờ trả lời", DK.amber)}{stat(avgAll == null ? "—" : String(avgAll).replace(".", ","), "Rating TB", DK.green)}
      </div>
      <span style={sec}>RATING THEO TÍNH NĂNG</span>
      <div style={{ ...group, padding: "10px 14px" }}>
        {FEATURES.map(([id, t]) => {
          const arr = byF[id] || [];
          const avg = arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;
          return (
            <div key={id} style={{ display: "grid", gridTemplateColumns: "76px 1fr 52px", alignItems: "center", gap: 10, minHeight: 30 }}>
              <span style={{ fontSize: 13, color: DK.t2 }}>{t}</span>
              <span style={{ height: 6, borderRadius: 3, background: DK.track }}><span style={{ display: "block", height: "100%", width: `${avg ? avg * 20 : 0}%`, borderRadius: 3, background: "#4DA3FF" }} /></span>
              <span style={{ fontSize: 12, fontWeight: 700, textAlign: "right" }}>{avg == null ? "—" : String(avg).replace(".", ",")} <span style={{ color: DK.t3, fontWeight: 600 }}>({arr.length})</span></span>
            </div>
          );
        })}
      </div>
      <span style={sec}>PHẢN HỒI · CHƯA TRẢ LỜI TRƯỚC</span>
      {list.length === 0 && <div style={{ ...group, padding: 16, color: DK.t2, fontSize: 13, textAlign: "center" }}>Chưa có phản hồi nào.</div>}
      {waiting.map(item)}
      {done.map(item)}
      {comments.length > 0 && <>
        <span style={sec}>NHẬN XÉT KÈM SAO</span>
        {comments.map((r) => (
          <div key={r.id || `${r.user_id}-${r.feature}`} style={{ ...dkCard, margin: "8px 12px 0 12px", borderRadius: 16, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 800 }}>{r.username || "Người dùng"}</span><span style={{ color: DK.amber, letterSpacing: 2 }}>{"★".repeat(Math.max(0, Math.min(5, Number(r.rating) || 0)))}</span></div>
            <span style={{ fontSize: 12, color: DK.t3 }}>{FEAT_NAME[r.feature] || r.feature} · {dateOf(r.created_at)}</span>
            <span style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{r.comment}</span>
          </div>
        ))}
      </>}
    </div>
  );
}
