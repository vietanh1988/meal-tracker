// 01/11 (bản vẽ "Tập luyện" khung 1): thẻ "Buổi tập hôm nay" ở Hôm nay — lề 14 12 0, bo 20, pad 16, khe 12; ô icon 48 bo 16 (tím → chàm);
// nhãn 12/700 #6D28D9, tên buổi 17/900, phụ 12.5 #64748B; chip bài 28 bo 14 #EEF4FF; nút Bắt đầu tập cao 46 bo 14 + nút Quản lý.
// Chỉ hiện khi giáo án đang dùng có buổi hôm nay. Đã tập xong → thẻ gọn "Đã tập". Chưa có giáo án → thẻ mời chọn (có ✕ ẩn).
import { ltCard } from "../theme";
import { GRAD_BLUE } from "../mobile/ui";
import { sessionOfDate, planDays, setsDone } from "./plan.js";
import { exOf } from "./exLib.jsx";

const DB = <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></svg>;
const WRAP = { margin: "14px 12px 0 12px", ...ltCard, padding: 16, display: "flex", flexDirection: "column", gap: 12 };
const tile = { width: 48, height: 48, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "linear-gradient(135deg,#7C3AED,#4F46E5)", color: "#FFFFFF" };

export function WorkoutCard({ w, today, onStart, onOpen, onResume, invite, onHideInvite, inApp }) {
  if (!w?.ready) return null;
  const wrap = inApp ? { ...WRAP, margin: "0 12px" } : WRAP;
  const plan = w.active;
  if (!plan) {
    if (!invite) return null;
    return (
      <div data-testid="wk-card-invite" style={{ ...wrap, flexDirection: "row", alignItems: "center" }}>
        <span style={tile}>{DB}</span>
        <button type="button" onClick={() => onOpen("plan")} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", border: "none", background: "none", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
          <b style={{ fontSize: 15, fontWeight: 900 }}>Thêm lịch tập của bạn</b>
          <span style={{ fontSize: 12.5, color: "#64748B" }}>Giáo án mẫu gym hoặc tập tại nhà, tự sửa bài</span>
        </button>
        <button type="button" aria-label="Ẩn" data-testid="wk-card-hide" onClick={onHideInvite} style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: "#F1F5F9", color: "#64748B", flexShrink: 0 }}>✕</button>
      </div>
    );
  }
  const dp = sessionOfDate(plan, today);
  if (!dp) return null;
  const mine = w.sessions.filter((s) => s.day === today);
  const ended = mine.find((s) => s.ended_at), open = mine.find((s) => !s.ended_at);
  const days = planDays(plan);
  const n = days.indexOf(days.find((d) => plan.days[String(d)] === dp)) + 1;
  if (ended) return (
    <button type="button" data-testid="wk-card-done" onClick={() => onOpen("log")} style={{ ...wrap, flexDirection: "row", alignItems: "center", border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A", width: "calc(100% - 24px)" }}>
      <span style={{ ...tile, background: "rgba(0,200,150,0.14)", color: "#047857" }}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#047857" }}>ĐÃ TẬP HÔM NAY</span>
        <b style={{ fontSize: 16, fontWeight: 900 }}>{ended.title} · {ended.minutes ?? 0} phút · {setsDone(ended)} hiệp</b>
      </span>
    </button>
  );
  const est = Math.round(dp.items.reduce((a, x) => a + (Number(x.sets) || 3) * 2.5, 0) / 5) * 5;
  return (
    <div data-testid="wk-card" style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={tile}>{DB}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#6D28D9", letterSpacing: 0.2 }}>BUỔI TẬP HÔM NAY{n > 0 ? ` · BUỔI ${n}/${days.length}` : ""}</span>
          <b data-testid="wk-card-title" style={{ fontSize: 17, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dp.title}</b>
          <span style={{ fontSize: 12.5, color: "#64748B" }}>{dp.items.length} bài · khoảng {est} phút</span>
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {dp.items.slice(0, 6).map((x, i) => <span key={i} style={{ height: 28, padding: "0 10px", borderRadius: 14, background: "#EEF4FF", color: "#1E3A8A", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center" }}>{exOf(x.ex, w.custom).vi}</span>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: inApp ? "1fr" : "1fr 1.6fr", gap: 8 }}>
        {!inApp && <button type="button" data-testid="wk-card-manage" onClick={() => onOpen("plan")} style={{ height: 46, borderRadius: 14, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 15, fontWeight: 800, fontFamily: "inherit" }}>Quản lý</button>}
        <button type="button" data-testid="wk-card-start" onClick={() => (open ? onResume(open) : onStart(dp))} style={{ height: 46, borderRadius: 14, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 15, fontWeight: 800, fontFamily: "inherit" }}>{open ? "Tiếp tục tập" : "Bắt đầu tập"}</button>
      </div>
    </div>
  );
}

// 01/11 (chủ dự án: "đừng để ngoài màn hình, để cạnh lối tắt Pi ở gần chuông"): nút kính 42 (giống chuông) mở màn Tập luyện;
// chấm tím khi hôm nay có buổi trong giáo án mà chưa tập xong.
export function WorkoutButton({ w, today, onOpen }) {
  const plan = w?.active;
  const todo = !!(plan && sessionOfDate(plan, today) && !w.sessions.some((s) => s.day === today && s.ended_at));
  return (
    <button type="button" data-testid="wk-btn" aria-label={todo ? "Tập luyện, hôm nay có buổi tập" : "Tập luyện"} onClick={onOpen} className="fp-glass"
      style={{ position: "relative", width: 42, height: 42, borderRadius: 21, padding: 0, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF" }}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" /></svg>
      {todo && <span data-testid="wk-btn-dot" style={{ position: "absolute", top: 0, right: 0, width: 12, height: 12, borderRadius: 6, background: "#A855F7", border: "2px solid #FFFFFF", boxSizing: "border-box" }} />}
    </button>
  );
}
