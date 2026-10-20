// Màn Thông báo (bản vẽ ThongBao) — thay danh sách thả xuống của chuông cũ:
//  - CẬP NHẬT ỨNG DỤNG: tin admin đăng (app_settings.notifications); tin có nút "Cập nhật ngay" xoá cache + tải lại
//  - HOẠT ĐỘNG CỦA BẠN: bảng notifications (đơn hàng, admin trả lời góp ý…)
// Mở màn là đánh dấu đã đọc. Chuông trên Hôm nay: BellButton (số chưa đọc).
import { useEffect, useState } from "react";
import { fmtVN, toVNDate } from "../lib/dateVN";
import { UpdateFlow } from "./UpdatePopup";
import { DK, dkCard } from "../theme";

// Nền tối (bản vẽ 48)
const lbl = { display: "block", padding: "16px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const box = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
const bellSvg = (s, color) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;

export function BellButton({ count, ringing, onClick }) {
  return (
    <button data-testid="bell" className="fp-glass" onClick={onClick} aria-label={count ? `Thông báo, ${count} chưa đọc` : "Thông báo"}
      style={{ position: "relative", width: 42, height: 42, borderRadius: 21, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, animation: ringing ? "fpmBell .6s ease-in-out 0s 2" : "none" }}>
      <style>{"@keyframes fpmBell{0%,100%{transform:rotate(0)}20%{transform:rotate(18deg)}40%{transform:rotate(-16deg)}60%{transform:rotate(10deg)}80%{transform:rotate(-6deg)}}"}</style>
      {bellSvg(19, "#FFFFFF")}
      {count > 0 && <span data-testid="bell-count" style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: "#EF4444", border: "2px solid #FFFFFF", color: "#FFFFFF", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", boxSizing: "content-box" }}>{count > 9 ? "9+" : count}</span>}
    </button>
  );
}

export function NotificationsScreen({ notif, appVersion, openReminders }) {
  const [updating, setUpdating] = useState(false);
  const [open, setOpen] = useState(null);
  useEffect(() => { notif.markAllRead(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const updates = [...notif.updates].reverse();
  const items = notif.items;
  const dateOf = (ts) => (ts ? fmtVN(toVNDate(new Date(ts)), true) : "");

  return (
    <div style={{ paddingBottom: 32 }}>
      {updating && <UpdateFlow toVersion={appVersion} fromVersion={(() => { try { return localStorage.getItem("fipilot_version"); } catch (e) { return null; } })()} onLater={() => setUpdating(false)} />}
      {updates.length > 0 && (
        <>
          <span style={lbl}>CẬP NHẬT ỨNG DỤNG</span>
          <div style={{ margin: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {updates.map((n, idx) => (
              <div key={n.id} data-testid="notif-update" style={{ ...dkCard, borderRadius: 16, padding: 14, display: "flex", gap: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: "#007AFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{bellSvg(20, "#FFFFFF")}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{n.text || n.title || n.message}</span>
                  {n.date && <span style={{ fontSize: 12, color: DK.t3 }}>{n.date}</span>}
                  {idx === 0 && (
                    <button data-testid="notif-do-update" onClick={() => setUpdating(true)}
                      style={{ alignSelf: "flex-start", marginTop: 4, height: 36, padding: "0 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 800 }}>
                      Cập nhật ngay
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <span style={lbl}>HOẠT ĐỘNG CỦA BẠN</span>
      {items.length === 0 ? (
        <div data-testid="notif-empty" style={{ ...box, padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Chưa có hoạt động nào</span>
          <span style={{ fontSize: 13, color: DK.t2, lineHeight: 1.5 }}>Bật nhắc nhở để Fipilot báo bạn khi đến giờ ăn hoặc đến ngày cân.</span>
          <button onClick={openReminders} style={{ marginTop: 6, height: 40, padding: "0 16px", borderRadius: 12, border: "none", background: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#0040E0" }}>Cài nhắc nhở</button>
        </div>
      ) : (
        <div style={box}>
          {items.map((n, i) => (
            <button key={n.id} data-testid="notif-item" onClick={() => setOpen(open === n.id ? null : n.id)}
              style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", padding: "12px 0", border: "none", borderBottom: i < items.length - 1 ? `1px solid ${DK.line}` : "none", background: "transparent", fontFamily: "inherit", textAlign: "left", color: DK.t1 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{n.title}</span>
                <span style={{ fontSize: 11, color: DK.t3, whiteSpace: "nowrap" }}>{dateOf(n.created_at)}</span>
              </span>
              {n.body && <span style={{ fontSize: 13, color: DK.t2, lineHeight: 1.45, ...(open === n.id ? { whiteSpace: "pre-wrap" } : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) }}>{n.body}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
