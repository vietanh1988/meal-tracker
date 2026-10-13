// Tôi › Gói cước (bản vẽ 30–31, chốt 13/10).
//  - TẮT bán hàng (user thường): màn "Lượt AI" — báo đang miễn phí + lượt AI đã dùng. Không nhắc chuyện thu phí.
//  - BẬT bán hàng (hoặc admin): thẻ hạng, lượt AI, bảng so sánh Miễn phí / Dùng thử / Premium,
//    chọn gói 3/6/12 tháng → màn Chuyển khoản (PayScreen) → "Tôi đã chuyển khoản" tạo đơn chờ duyệt.
//  - Lịch sử đơn hàng.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, diffDays, fmtVN, toVNDate } from "../lib/dateVN";
import { aiQuota, limitsTable, packagesOf, transferContent } from "../lib/aiQuota";
import { fmtInt } from "../lib/mobileView";
import { Icon, GRAD_BLUE, DkIcon } from "./ui";
import { DK, dkCard, dkGlass } from "../theme";

const TIER = { free: "Miễn phí", trial: "Dùng thử", premium: "Premium" };
const PKG = { "1m": "1 tháng", "3m": "3 tháng", "6m": "6 tháng", "12m": "12 tháng" };
// Nền tối (bản vẽ 48): chữ trắng, thẻ kính mờ; màu trạng thái sáng để đọc được trên nền xanh đậm
const VIOLET = "#C4B5FD"; // tím nhạt thay #6D28D9 trên nền tối
const STATUS = { pending: ["Chờ duyệt", DK.amber, "rgba(245,158,11,0.18)"], confirmed: ["Đã duyệt", DK.green, "rgba(0,200,150,0.18)"], rejected: ["Từ chối", DK.red, "rgba(239,68,68,0.2)"] };
const todayFrom = (ts) => toVNDate(new Date(ts));
const sec = { display: "block", padding: "16px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const box = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
const vnd = (n) => `${fmtInt(n)}đ`;

function tierLine(sub, isAdmin, today) {
  const tier = sub?.tier || "free";
  const end = tier === "trial" ? sub?.trial_end_date : tier === "premium" ? sub?.subscription_end_date : null;
  if (end) {
    const left = diffDays(today, String(end).slice(0, 10));
    return left >= 0 ? `${tier === "trial" ? "Dùng thử đến" : "Hết hạn"} ${fmtVN(String(end).slice(0, 10), true)} · còn ${left} ngày` : `Đã hết hạn ${fmtVN(String(end).slice(0, 10), true)}`;
  }
  if (tier === "premium") return isAdmin ? "Không thời hạn · tài khoản quản trị" : "Không thời hạn";
  return "Gói cơ bản";
}

export function usePlanData(userId) {
  const [state, setState] = useState({ loading: true });
  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, s, o] = await Promise.all([
        supabase.from("profiles").select("username,tier,trial_end_date,subscription_end_date,ai_macro_count_this_month,ai_macro_count_reset_at,ai_chat_count_today,ai_chat_count_reset_at,ai_menu_count_today,ai_menu_count_reset_at,ai_photo_count_this_month,ai_photo_count_reset_at").eq("id", userId).maybeSingle(),
        supabase.from("subscription_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("orders").select("id,package,amount,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      setState({ loading: false, sub: p.data || null, settings: s.data || null, orders: o.data || [], error: p.error ? "Không tải được thông tin gói. Mở lại màn này để thử lại." : "" });
    } catch (e) { setState({ loading: false, error: "Không tải được thông tin gói." }); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  return [state, load];
}

function QuotaList({ quota }) {
  return (
    <div style={box}>
      {quota.map((q, i) => (
        <div key={q.key} data-testid={`quota-${q.key}`} data-used={q.used} style={{ padding: "12px 0", borderBottom: i < quota.length - 1 ? `1px solid ${DK.line}` : "none", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{q.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: q.out ? DK.red : DK.t2, whiteSpace: "nowrap" }}>{fmtInt(q.used)} / {fmtInt(q.limit)} {q.period === "day" ? "hôm nay" : "tháng này"}</span>
          </div>
          <div role="progressbar" aria-label={q.label} aria-valuenow={q.used} aria-valuemax={q.limit} style={{ height: 6, borderRadius: 3, background: DK.track, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${q.pct}%`, background: q.out ? "#F87171" : q.pct >= 80 ? "#FBBF24" : "#4DA3FF", borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlanScreen({ userId, isAdmin, salesEnabled, aiMenuLockedFree = true, openPay }) {
  const [state] = usePlanData(userId);
  const [showOrders, setShowOrders] = useState(false);
  const [pkg, setPkg] = useState(null);

  if (state.loading) return <p style={{ margin: 24, textAlign: "center", color: DK.t3, fontSize: 14 }}>Đang tải…</p>;
  const { sub, settings, orders = [], error } = state;
  const today = todayVN();
  const tier = sub?.tier || "free";
  const selling = isAdmin || salesEnabled;
  const quota = aiQuota(sub, settings);
  const note = <p style={{ margin: "8px 16px 0 16px", fontSize: 12, color: DK.t3, lineHeight: 1.45 }}>Lượt theo ngày làm mới lúc 7:00 sáng, lượt theo tháng làm mới đầu tháng.</p>;

  // ===== Đang tắt bán hàng: chỉ là màn Lượt AI =====
  if (!selling) return (
    <div style={{ paddingBottom: 32 }}>
      {error && <p style={{ margin: "12px 16px 0 16px", color: DK.red, fontSize: 13 }}>{error}</p>}
      <div data-testid="plan-free" style={{ margin: "12px 12px 0 12px", background: "rgba(0,200,150,0.16)", border: "1px solid rgba(74,222,155,0.38)", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFFFF", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.check(20, 2.6)}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: DK.t1 }}>Fipilot AI đang miễn phí</span>
          <span style={{ fontSize: 13, color: DK.t2, lineHeight: 1.45 }}>Dùng mọi tính năng trong giới hạn lượt AI bên dưới.</span>
        </span>
      </div>
      <span style={sec}>LƯỢT AI ĐÃ DÙNG</span>
      <QuotaList quota={quota} />
      {note}
      <span style={sec}>MẸO TIẾT KIỆM LƯỢT</span>
      <div data-testid="plan-tips" style={box}>
        {[["#00A67E", "rgba(0,200,150,0.12)", <><ellipse key="a" cx="12" cy="6" rx="7" ry="3" /><path key="b" d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>, "Tìm món trong kho", "Hơn 1.000 món có sẵn macro, không tốn lượt"],
          ["#007AFF", "rgba(0,122,255,0.1)", <><path key="a" d="M4 12a8 8 0 0 1 14-5.3L20 9" /><path key="b" d="M20 4v5h-5" /></>, "Dùng lại thực đơn của tôi", "Thực đơn AI đã tạo, ngày đã ăn — ở tab Thực đơn"],
          ["#7C3AED", "rgba(124,58,237,0.1)", <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />, "Món AI đã tính được lưu", "Gõ lại món đó lần sau không tốn lượt"]].map(([c, bg, d, t, sub], i, arr) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderBottom: i < arr.length - 1 ? `1px solid ${DK.line}` : "none" }}>
            <DkIcon color={c}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg></DkIcon>
            <span style={{ display: "flex", flexDirection: "column", flex: 1 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{t}</span><span style={{ fontSize: 12, color: DK.t3 }}>{sub}</span></span>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== Đang bán =====
  const pkgs = packagesOf(settings);
  const chosen = pkgs.find((p) => p.id === pkg) || pkgs.find((p) => p.id === "12m") || pkgs[pkgs.length - 1] || null;
  const pending = orders.find((o) => o.status === "pending");
  const table = limitsTable(settings, { menuLockedFree: aiMenuLockedFree });
  const cell = (v, on) => <span style={{ fontSize: 13, fontWeight: on ? 900 : 700, color: v == null ? "rgba(255,255,255,0.35)" : on ? VIOLET : DK.t1, textAlign: "center" }}>{v == null ? "—" : fmtInt(v)}</span>;

  return (
    <div style={{ paddingBottom: 32 }}>
      {error && <p style={{ margin: "12px 16px 0 16px", color: DK.red, fontSize: 13 }}>{error}</p>}
      {/* Bản vẽ 50: thẻ kính viền tím nhạt + ô vương miện (thay khối tím đặc) */}
      <div data-testid="plan-tier" style={{ ...dkCard, border: "1px solid rgba(196,181,253,0.45)", borderRadius: 20, margin: "12px 12px 0 12px", padding: 16, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 14, position: "relative", overflow: "hidden" }}>
        <span aria-hidden="true" style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, background: "radial-gradient(closest-side, rgba(167,139,250,0.45), rgba(167,139,250,0))", pointerEvents: "none" }} />
        <DkIcon color="#7C3AED" size={48}><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z" /></svg></DkIcon>
        <span style={{ position: "relative", display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: VIOLET, letterSpacing: "0.08em" }}>HẠNG CỦA BẠN</span>
          <span style={{ fontSize: 24, fontWeight: 900 }}>{tier === "trial" ? "Dùng thử Premium" : TIER[tier] || tier}</span>
          <span style={{ fontSize: 13, color: DK.t2 }}>{tierLine(sub, isAdmin, today)}</span>
        </span>
      </div>

      <span style={sec}>LƯỢT AI ĐÃ DÙNG</span>
      <QuotaList quota={quota} />
      {note}

      <span style={sec}>SO SÁNH GÓI</span>
      <div data-testid="plan-compare" style={{ ...box, padding: "0 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", alignItems: "center", gap: 4, minHeight: 40, borderBottom: `1px solid ${DK.line}` }}>
          <span />
          {["free", "trial", "premium"].map((t) => <span key={t} style={{ fontSize: 11, fontWeight: 800, textAlign: "center", color: t === "premium" ? VIOLET : DK.t3 }}>{TIER[t]}</span>)}
        </div>
        {table.map((r, i) => (
          <div key={r.key} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", alignItems: "center", gap: 4, minHeight: 48, borderBottom: i < table.length - 1 ? `1px solid ${DK.line}` : "none" }}>
            <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span><span style={{ fontSize: 11, color: DK.t3 }}>mỗi {r.period === "day" ? "ngày" : "tháng"}</span></span>
            {cell(r.free)}{cell(r.trial)}{cell(r.premium, true)}
          </div>
        ))}
      </div>

      {!isAdmin && (pending ? (
        <div data-testid="plan-pending" style={{ margin: "16px 12px 0 12px", padding: 14, borderRadius: 16, background: "rgba(245,158,11,0.16)", border: "1px solid rgba(252,211,77,0.4)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: "#F59E0B", flexShrink: 0 }} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: DK.amber }}>Đang chờ duyệt · gói {PKG[pending.package] || pending.package}{pending.amount ? ` · ${vnd(pending.amount)}` : ""}</span>
            <span style={{ fontSize: 12, color: DK.t2 }}>Premium bật ngay khi admin xác nhận chuyển khoản. Bạn vẫn dùng app bình thường.</span>
          </span>
        </div>
      ) : pkgs.length > 0 ? (
        <>
          <span style={sec}>{tier === "premium" ? "GIA HẠN PREMIUM" : "NÂNG CẤP PREMIUM"}</span>
          <div role="radiogroup" aria-label="Chọn gói" style={{ margin: "14px 12px 0 12px", display: "grid", gridTemplateColumns: `repeat(${pkgs.length > 3 ? 2 : pkgs.length}, minmax(0, 1fr))`, gap: 8, rowGap: 14 }}>
            {pkgs.map((p) => {
              const on = chosen && chosen.id === p.id;
              return (
                <button key={p.id} role="radio" aria-checked={on} data-testid={`plan-pkg-${p.id}`} onClick={() => setPkg(p.id)}
                  style={{ position: "relative", minHeight: 96, borderRadius: 16, ...dkGlass, border: on ? "2px solid #A78BFA" : dkGlass.border, background: on ? "rgba(124,58,237,0.28)" : dkGlass.background, fontFamily: "inherit", color: DK.t1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "12px 4px" }}>
                  {p.best && <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 10, fontWeight: 800, color: "#FFFFFF", background: "#00A67E", padding: "2px 8px", borderRadius: 999, boxShadow: "0 2px 6px rgba(0,166,126,0.3)" }}>Rẻ nhất/tháng</span>}
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{PKG[p.id]}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: on ? VIOLET : DK.t1 }}>{vnd(p.price)}</span>
                  <span style={{ fontSize: 11, color: DK.t3 }}>≈ {vnd(p.perMonth)}/tháng</span>
                </button>
              );
            })}
          </div>
          {chosen && (
            <button data-testid="plan-buy" onClick={() => openPay(chosen.id)} style={{ display: "block", margin: "14px 12px 0 12px", width: "calc(100% - 24px)", height: 52, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(0,87,255,0.22)" }}>
              {tier === "premium" ? "Gia hạn" : "Nâng cấp"} {PKG[chosen.id]} · {vnd(chosen.price)}
            </button>
          )}
        </>
      ) : (
        <p style={{ margin: "16px 16px 0 16px", fontSize: 13, color: DK.t3 }}>Chưa có bảng giá. Liên hệ admin để nâng cấp.</p>
      ))}

      <button data-testid="plan-orders" onClick={() => setShowOrders((v) => !v)} aria-expanded={showOrders} style={{ margin: "16px 12px 0 12px", width: "calc(100% - 24px)", height: 48, ...dkGlass, borderRadius: 16, padding: "0 14px", display: "flex", alignItems: "center", gap: 10, color: DK.t1, fontFamily: "inherit", boxSizing: "border-box" }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textAlign: "left" }}>Lịch sử đơn hàng</span>
        <span style={{ fontSize: 12, color: DK.t3 }}>{orders.length ? `${orders.length} đơn` : "Chưa có đơn"}</span>
        <span style={{ display: "flex", transform: showOrders ? "rotate(90deg)" : "none", transition: "transform .15s" }}>{Icon.chev(16, DK.chev)}</span>
      </button>
      {showOrders && orders.length > 0 && (
        <div style={{ ...box, marginTop: 8 }}>
          {orders.map((o, i) => {
            const [label, fg, bg] = STATUS[o.status] || [o.status, DK.t2, DK.chip];
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderBottom: i < orders.length - 1 ? `1px solid ${DK.line}` : "none" }}>
                <span style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Gói {PKG[o.package] || o.package}{o.amount ? ` · ${vnd(o.amount)}` : ""}</span>
                  <span style={{ fontSize: 12, color: DK.t3 }}>{o.created_at ? fmtVN(todayFrom(o.created_at), true) : ""}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: fg, background: bg, padding: "3px 10px", borderRadius: 999 }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Chuyển khoản ----------------
export function PayScreen({ userId, pkgId, onDone }) {
  const [state] = usePlanData(userId);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (state.loading) return <p style={{ margin: 24, textAlign: "center", color: DK.t3, fontSize: 14 }}>Đang tải…</p>;
  const { sub, settings } = state;
  const p = packagesOf(settings).find((x) => x.id === pkgId);
  if (!p) return <p style={{ margin: 24, textAlign: "center", color: DK.t3, fontSize: 14 }}>Gói này chưa có giá. Quay lại chọn gói khác.</p>;
  const content = transferContent(sub?.username, userId, p.id);
  const copy = async (key, text) => {
    try { await navigator.clipboard.writeText(String(text)); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch (e) { /* trình duyệt chặn */ }
  };
  const paid = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    const { error } = await supabase.from("orders").insert({ user_id: userId, package: p.id, amount: p.price, status: "pending" });
    setBusy(false);
    if (error) { setErr("Gửi chưa được, kiểm tra mạng rồi thử lại."); return; }
    onDone(p);
  };
  const row = (key, label, value, big, canCopy) => (
    <div style={{ display: "flex", alignItems: "center", minHeight: 54, borderBottom: key === "content" ? "none" : `1px solid ${DK.line}`, gap: 8 }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 12, color: DK.t3 }}>{label}</span>
        <span data-testid={`pay-${key}`} style={{ fontSize: big ? 17 : 15, fontWeight: big ? 900 : 700, color: key === "amount" ? DK.link : DK.t1, wordBreak: "break-all" }}>{value || "—"}</span>
      </span>
      {canCopy && value && <button onClick={() => copy(key, key === "amount" ? p.price : value)} style={{ height: 32, padding: "0 12px", borderRadius: 10, border: key === "content" ? "none" : `1px solid ${DK.chipLine}`, background: key === "content" ? "#007AFF" : DK.chip, fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "#FFFFFF", flexShrink: 0 }}>{copied === key ? "Đã chép" : "Chép"}</button>}
    </div>
  );
  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ margin: "12px 12px 0 12px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, fontSize: 11, fontWeight: 700, color: DK.t3 }}>
        {["1. Chọn gói", "2. Chuyển khoản", "3. Kích hoạt"].map((t, i) => (
          <span key={t} style={{ display: "flex", flexDirection: "column", gap: 6, color: i < 2 ? DK.link : DK.t3, textAlign: i === 0 ? "left" : i === 1 ? "center" : "right" }}>
            <span style={{ height: 4, borderRadius: 2, background: i < 2 ? "#4DA3FF" : DK.track }} />{t}
          </span>
        ))}
      </div>
      <div style={{ ...box, marginTop: 14 }}>
        {row("bank", "Ngân hàng", settings?.bank_name)}
        {row("account", "Số tài khoản", settings?.bank_account, true, true)}
        {row("name", "Chủ tài khoản", settings?.bank_account_name)}
        {row("amount", "Số tiền", vnd(p.price), true, true)}
        {row("content", "Nội dung (bắt buộc đúng)", content, true, true)}
      </div>
      <div style={{ margin: "12px 12px 0 12px", padding: "12px 14px", borderRadius: 14, background: "rgba(245,158,11,0.16)", border: "1px solid rgba(252,211,77,0.4)", fontSize: 13, color: DK.amber, lineHeight: 1.5 }}>Ghi đúng nội dung để admin nhận ra bạn. Sai nội dung sẽ duyệt chậm hơn.</div>
      {err && <p role="alert" style={{ margin: "10px 16px 0 16px", fontSize: 13, color: DK.red }}>{err}</p>}
      <button data-testid="pay-done" disabled={busy} onClick={paid} style={{ display: "block", margin: "16px 12px 0 12px", width: "calc(100% - 24px)", height: 52, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: "0 4px 12px rgba(0,87,255,0.22)" }}>{busy ? "Đang gửi…" : "Tôi đã chuyển khoản"}</button>
      <p style={{ margin: "8px 16px 0 16px", fontSize: 12, color: DK.t3, textAlign: "center" }}>Premium bật sau khi admin xác nhận. Bạn sẽ thấy "Đang chờ duyệt" ở màn Gói cước.</p>
    </div>
  );
}

