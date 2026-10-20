// Fipilot Pet — 3 màn (Thú cưng · Cửa hàng · Tủ đồ) + 2 chỗ vào (A: dòng ở Tôi, B: thẻ ở Hôm nay).
// Bản vẽ đợt chuẩn bị 20/10: dựng từ khối thật của app (SubPage, ltCard, LT/DK, AppIcon, Icon) với dữ liệu truyền vào.
// Luật đã chốt 20/10 (backlog "Fipilot Pet"): điểm chỉ tính hôm nay; Phổ thông ai cũng mua, Hiếm / Huyền thoại chỉ Premium;
// mở đồ theo cấp; đồ thành tích không bán; tâm trạng không bán; trần 120 Hạt/ngày.
import { useState } from "react";
import { SubPage, Icon, GRAD_BLUE, DkIcon } from "../mobile/ui";
import { AppIcon, MealIcon, IC_COLOR, mix } from "../mobile/icons";
import { LT, ltCard, DK, dkCard } from "../theme";
import { PetAvatar, ItemImg, ITEMS, catalog } from "./PetAvatar";

const fmt = (n) => Math.round(n).toLocaleString("vi-VN");
export const RARITY = {
  common: { label: "Phổ thông", color: "#64748B", bg: "#F1F5F9" },
  rare: { label: "Hiếm", color: "#2563EB", bg: "#EAF1FF" },
  legendary: { label: "Huyền thoại", color: "#B45309", bg: "#FFF4DB" },
};
const PET_C = "#0EA5E9";   // màu riêng mục Thú cưng (xanh giọt nước)
const SEED_C = "#16A34A";  // màu Hạt

// Icon Hạt (mầm lá) — nét như bộ icon app
export function Seed({ size = 16, color = SEED_C }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21v-7" /><path d="M12 14c0-4 2.5-7 8-7 0 4.5-3 7-8 7z" /><path d="M12 15c0-3.2-2-5.5-6.5-5.5 0 3.6 2.4 5.5 6.5 5.5z" />
    </svg>
  );
}
const svg = (d, s = 22) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
export const PIc = {
  shop: (s) => svg(<><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9h16v2a3 3 0 0 1-5.3 2 3 3 0 0 1-5.4 0A3 3 0 0 1 4 11z" /><path d="M5 13v7h14v-7" /><path d="M10 20v-4h4v4" /></>, s),
  closet: (s) => svg(<><path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z" /></>, s),
  paw: (s) => svg(<><circle cx="7" cy="10" r="1.8" /><circle cx="11" cy="6.5" r="1.8" /><circle cx="15.5" cy="7" r="1.8" /><circle cx="18" cy="11" r="1.8" /><path d="M8.5 17c0-2.5 2-4.5 4-4.5s4 2 4 4.5c0 1.5-1.3 2.5-2.7 2-1-.3-1.6-.3-2.6 0-1.4.5-2.7-.5-2.7-2z" /></>, s),
  camera: (s) => svg(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>, s),
  flame: (s) => svg(<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3-1-3 0-5.5 0-8z" />, s),
  list: (s) => svg(<><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></>, s),
  trophy: (s) => svg(<><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M8 21h8M9 21l1-4h4l1 4" /></>, s),
  lock: (s) => svg(<><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, s),
  crown: (s) => svg(<path d="M4 8l4 4 4-7 4 7 4-4-2 11H6z" />, s),
  edit: (s) => svg(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>, s),
  chat: (s) => svg(<><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /><path d="M8 10h8M8 13h5" /></>, s),
  gear: (s) => svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, s),
  send: (s) => svg(<path d="M4 12l16-8-6 16-2.5-6.5z" />, s),
  sparkle: (s) => svg(<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z" />, s),
  shirt: (s) => svg(<path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z" />, s),
};

function SeedPill({ n, dark }) {
  return (
    <span data-testid="pet-balance" style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 12px 0 9px", borderRadius: 16, background: dark ? "rgba(255,255,255,0.12)" : "#ECFDF3", color: dark ? "#FFFFFF" : "#065F46", fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>
      <Seed size={17} color={dark ? "#4ADE9B" : SEED_C} />{fmt(n)}
    </span>
  );
}
// Câu theo tâm trạng, đúng giọng Pi nam / Pi nữ (chốt 20/10). Có pet.say (câu khen / nhắc theo việc thật, src/pet/lines.js) thì nói câu đó.
const MOOD_TEXT = {
  nam: { vui: "Hôm nay ghi đều tay, ngon lành!", cuoi: "Bộ này chất ghê, Pi thích!", ngu: "Pi ngủ gật rồi… ghi bữa đầu là Pi dậy liền.", hoi: "Tới giờ ăn rồi mà chưa thấy ghi bữa nào?", mung: "Ê bạn về rồi! Pi chờ mãi đó!" },
  nu: { vui: "Hôm nay bạn ghi đều lắm, Pi vui ghê!", cuoi: "Bộ này xinh ghê, Pi thích lắm!", ngu: "Pi ngủ gật rồi… ghi bữa đầu để gọi Pi dậy nha.", hoi: "Đến giờ ăn rồi nè, bạn ghi bữa chưa?", mung: "A, bạn quay lại rồi! Pi nhớ bạn lắm!" },
};
export const moodText = (pet) => pet.say || (MOOD_TEXT[pet.variant] || MOOD_TEXT.nam)[pet.mood] || MOOD_TEXT.nam.vui;
const sec = { padding: "20px 18px 10px 18px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 };
const secT = { fontSize: 17, fontWeight: 900, letterSpacing: -0.2 };
const card = { margin: "0 12px", ...ltCard };

export function Stage({ pet, height = 260, children, size = 210 }) {
  return (
    <div style={{ position: "relative", height, borderRadius: 22, overflow: "hidden", background: "radial-gradient(circle at 50% 38%, #FFFFFF 0%, #EAF4FF 45%, #D6E8FF 100%)" }}>
      <span aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: 18, width: size * 0.62, height: 18, marginLeft: -(size * 0.31), borderRadius: "50%", background: "radial-gradient(closest-side, rgba(30,64,175,0.22), rgba(30,64,175,0))" }} />
      <span style={{ position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)" }}>
        <PetAvatar variant={pet.variant} equipped={pet.equipped} mood={pet.mood} bow={pet.bow} size={size} label={`${pet.name} đang ${pet.mood === "ngu" ? "ngủ" : "vui"}`} />
      </span>
      {children}
    </div>
  );
}

// ============ Màn Thú cưng ============
export function PetHomeScreen({ pet, tasks, onBack, onShop, onCloset, onChat, onSettings, onWeek }) {
  const lv = pet.level;
  const pct = Math.min(100, ((pet.xp - lv.from) / (lv.to - lv.from)) * 100);
  return (
    <SubPage title={pet.name} subtitle={`Cấp ${lv.n} · ${pet.variant === "nu" ? "Pi nữ" : "Pi nam"}`} onBack={onBack} right={<SeedPill n={pet.seeds} />}>
      <div data-testid="pet-home" style={{ padding: "12px 12px 0 12px" }}>
        <Stage pet={pet}>
          <span style={{ position: "absolute", left: 14, right: 14, top: 14, display: "flex", justifyContent: "center" }}>
            <span style={{ maxWidth: 280, background: "#FFFFFF", borderRadius: 16, padding: "9px 13px", fontSize: 13, fontWeight: 700, color: "#334155", lineHeight: 1.4, boxShadow: "0 6px 16px rgba(30,64,175,0.12)", textAlign: "center" }}>{moodText(pet)}</span>
          </span>
          {/* 20/10: nút Hỏi Pi (chat AI giọng Pi) + Cài đặt Pi (tên, bản, Pi nói chuyện, tổng kết tuần) */}
          <button data-testid="pet-open-chat" onClick={onChat} className="tap" style={{ position: "absolute", left: 12, bottom: 12, height: 40, padding: "0 14px 0 10px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.92)", color: "#0062F0", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, fontFamily: "inherit", boxShadow: "0 4px 10px rgba(30,64,175,0.12)" }}>{PIc.chat(18)}Hỏi Pi</button>
          <button data-testid="pet-open-settings" onClick={onSettings} aria-label="Cài đặt Pi" className="tap" style={{ position: "absolute", right: 12, bottom: 12, width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.92)", color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(30,64,175,0.12)" }}>{PIc.gear(18)}</button>
        </Stage>
      </div>

      {/* Chủ nhật: tổng kết tuần (mọi khách; Premium có thêm nhận xét AI) */}
      {pet.week && (
        <button data-testid="pet-open-week" onClick={onWeek} className="tap" style={{ ...card, width: "calc(100% - 24px)", marginTop: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A", background: "linear-gradient(135deg,#FFFFFF,#F0F7FF)" }}>
          <AppIcon color="#F59E0B" size={44}>{PIc.trophy(22)}</AppIcon>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 900 }}>Tổng kết tuần {pet.week.range}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{pet.week.meals} bữa đã ghi · {pet.week.waterDays} ngày đủ nước</span>
          </span>
          {Icon.chev(16)}
        </button>
      )}

      {/* Cấp + Hạt */}
      <div style={{ ...card, marginTop: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AppIcon color="#7C3AED" size={44}>{PIc.crown(22)}</AppIcon>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 900 }}>Cấp {lv.n}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Còn {fmt(lv.to - pet.xp)} kinh nghiệm lên cấp {lv.n + 1} · mở {lv.nextUnlock} món</span>
          </span>
        </span>
        <span aria-hidden="true" style={{ height: 10, borderRadius: 5, background: LT.soft, overflow: "hidden" }}>
          <span style={{ display: "block", width: `${pct}%`, height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#8B5CF6,#6D28D9)" }} />
        </span>
        <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#64748B" }}>
          <span>{fmt(pet.xp)} / {fmt(lv.to)}</span>
          <span style={{ color: "#047857" }}>Hôm nay +{pet.today} / 120 Hạt</span>
        </span>
      </div>

      {/* Việc hôm nay */}
      <div style={sec}><span style={secT}>Việc hôm nay</span><span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{tasks.filter((t) => t.done).length} / {tasks.length} việc</span></div>
      <div data-testid="pet-tasks" style={{ ...card, padding: "4px 14px" }}>
        {tasks.map((t, i) => (
          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderBottom: i < tasks.length - 1 ? `1px solid ${LT.line}` : "none" }}>
            {t.meal ? <MealIcon id={t.meal} size={36} dim={!t.done} /> : <AppIcon color={t.color} size={36} dim={!t.done}>{t.icon}</AppIcon>}
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: t.done ? "#0F172A" : "#334155" }}>{t.label}</span>
              {t.sub && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{t.sub}</span>}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 900, color: t.done ? "#047857" : "#94A3B8" }}><Seed size={15} color={t.done ? SEED_C : "#94A3B8"} />+{t.pts}</span>
            <span aria-label={t.done ? "Xong" : "Chưa"} style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: t.done ? "#059669" : "transparent", border: t.done ? "none" : "2px solid #94A3B8", color: "#FFFFFF", boxSizing: "border-box" }}>{t.done && Icon.check(14, 3)}</span>
          </div>
        ))}
      </div>
      <span style={{ display: "block", padding: "8px 20px 0 20px", fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>Việc xong trong ngày là được cộng Hạt ngay. Ghi bù ngày cũ vẫn lưu nhật ký nhưng không ra Hạt.</span>

      {/* Cửa hàng / Tủ đồ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 12px 0 12px" }}>
        {[["pet-open-shop", "Cửa hàng", "12 món mới mở", "#EA580C", PIc.shop(24), onShop], ["pet-open-closet", "Tủ đồ", `${pet.owned.length} món của bạn`, "#0891B2", PIc.closet(24), onCloset]].map(([id, t, s, c, ic, fn]) => (
          <button key={id} data-testid={id} onClick={fn} className="tap" style={{ ...ltCard, padding: 14, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
            <AppIcon color={c} size={44}>{ic}</AppIcon>
            <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 16, fontWeight: 900 }}>{t}</span><span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{s}</span></span>
          </button>
        ))}
      </div>

      {/* Đồ thành tích */}
      <div style={sec}><span style={secT}>Đồ thành tích</span><span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Không bán · ai cũng nhận được</span></div>
      <div style={{ ...card, padding: "4px 14px" }}>
        {pet.achievements.map((a, i) => (
          <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, borderBottom: i < pet.achievements.length - 1 ? `1px solid ${LT.line}` : "none" }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: a.done ? RARITY[a.item.rarity].bg : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, filter: a.done ? "none" : "grayscale(1)", opacity: a.done ? 1 : 0.55 }}><ItemImg item={a.item} size={38} /></span>
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{a.label}</span>
              {a.done ? <span style={{ fontSize: 12, fontWeight: 700, color: "#047857" }}>Đã nhận · {a.item.name}</span> : (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true" style={{ flex: 1, height: 6, borderRadius: 3, background: LT.soft, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(a.cur / a.max) * 100}%`, background: GRAD_BLUE }} /></span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", whiteSpace: "nowrap" }}>{a.cur} / {a.max}</span>
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: 28 }} />
    </SubPage>
  );
}

// ============ Ô món (cửa hàng / tủ đồ) ============
function ItemCard({ it, state, onClick, equipped }) {
  const r = RARITY[it.rarity];
  const locked = state.kind === "level" || state.kind === "premium";
  return (
    <button data-testid={`pet-item-${it.id}`} onClick={onClick} className="tap" style={{ position: "relative", ...ltCard, borderRadius: 18, padding: "10px 8px 10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: equipped ? "2px solid #007AFF" : "2px solid transparent", fontFamily: "inherit", color: "#0F172A", minWidth: 0, boxSizing: "border-box" }}>
      <span style={{ alignSelf: "flex-start", fontSize: 10, fontWeight: 800, color: r.color, background: r.bg, padding: "2px 7px", borderRadius: 6 }}>{r.label}</span>
      <span style={{ width: "100%", height: 70, display: "flex", alignItems: "center", justifyContent: "center", filter: state.kind === "level" ? "grayscale(1)" : "none", opacity: state.kind === "level" ? 0.45 : 1 }}><ItemImg item={it} size={66} /></span>
      <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.25, textAlign: "center", minHeight: 30, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.name}</span>
      {state.kind === "owned" && <span style={{ fontSize: 12, fontWeight: 800, color: equipped ? "#007AFF" : "#047857", display: "inline-flex", alignItems: "center", gap: 4 }}>{Icon.check(13, 3)}{equipped ? "Đang mặc" : "Đã có"}</span>}
      {state.kind === "buy" && <span style={{ fontSize: 13, fontWeight: 900, color: "#065F46", display: "inline-flex", alignItems: "center", gap: 4 }}><Seed size={14} />{fmt(it.price)}</span>}
      {state.kind === "level" && <span style={{ fontSize: 12, fontWeight: 800, color: "#64748B", display: "inline-flex", alignItems: "center", gap: 4 }}>{PIc.lock(13)}Mở ở cấp {it.level}</span>}
      {state.kind === "premium" && <span style={{ fontSize: 12, fontWeight: 800, color: "#DB2777", display: "inline-flex", alignItems: "center", gap: 4 }}>{PIc.crown(13)}Premium</span>}
      {locked && <span aria-hidden="true" style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, background: state.kind === "premium" ? "#FCE7F3" : "#F1F5F9", color: state.kind === "premium" ? "#DB2777" : "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}>{PIc.lock(12)}</span>}
    </button>
  );
}
export function itemState(it, pet) {
  if (pet.owned.includes(it.id)) return { kind: "owned" };
  if (it.level > pet.level.n) return { kind: "level" };
  if (it.rarity !== "common" && !pet.premium) return { kind: "premium" };
  return { kind: "buy" };
}
const SLOT_TABS = [["all", "Tất cả"], ["dau", "Đội đầu"], ["ao", "Áo"], ["kinh", "Kính"], ["tai_nghe", "Tai nghe"], ["cam_tay", "Cầm tay"], ["deo", "Khăn, túi"], ["sau_lung", "Sau lưng"], ["duoi_chan", "Dưới chân"], ["hieu_ung", "Hiệu ứng"]];
function Chips({ value, onChange, counts }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 12px 4px 12px", scrollbarWidth: "none" }}>
      {SLOT_TABS.filter(([k]) => k === "all" || counts[k]).map(([k, l]) => {
        const a = value === k;
        return <button key={k} onClick={() => onChange(k)} aria-pressed={a} style={{ flexShrink: 0, height: 36, padding: "0 14px", borderRadius: 18, border: "none", background: a ? "#0F172A" : "#FFFFFF", color: a ? "#FFFFFF" : "#334155", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>{l}</button>;
      })}
    </div>
  );
}

// ============ Màn Cửa hàng ============
export function PetShopScreen({ pet, onBack, initialSlot = "all", preview }) {
  const [slot, setSlot] = useState(initialSlot);
  const list = catalog.items.filter((it) => it.variants.includes(pet.variant) && !pet.achievementIds.includes(it.id));
  const counts = list.reduce((m, it) => ((m[it.slot] = (m[it.slot] || 0) + 1), m), {});
  const shown = list.filter((it) => slot === "all" || it.slot === slot).sort((a, b) => a.level - b.level || a.price - b.price);
  return (
    <SubPage title="Cửa hàng" subtitle={pet.premium ? "Premium · mua được mọi độ hiếm" : "Gói miễn phí · mua đồ Phổ thông"} onBack={onBack} right={<SeedPill n={pet.seeds} />}>
      <div data-testid="pet-shop">
        {!pet.premium && (
          <div style={{ margin: "12px 12px 0 12px", borderRadius: 18, padding: "12px 14px", background: "linear-gradient(135deg,#FDF2F8,#F5F3FF)", display: "flex", alignItems: "center", gap: 12 }}>
            <AppIcon color="#DB2777" size={40}>{PIc.crown(20)}</AppIcon>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#831843", lineHeight: 1.4 }}>Đồ Hiếm và Huyền thoại dành cho Premium. Hạt bạn kiếm vẫn như nhau.</span>
          </div>
        )}
        <Chips value={slot} onChange={setSlot} counts={counts} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, padding: "8px 12px 0 12px" }}>
          {shown.map((it) => <ItemCard key={it.id} it={it} state={itemState(it, pet)} equipped={Object.values(pet.equipped).includes(it.id)} />)}
        </div>
        <div style={{ height: 28 }} />
      </div>
      {preview && <TryOnSheet pet={pet} it={ITEMS[preview]} />}
    </SubPage>
  );
}

// Sheet mặc thử + mua
export function TryOnSheet({ pet, it }) {
  const r = RARITY[it.rarity];
  const st = itemState(it, pet);
  const after = pet.seeds - it.price;
  return (
    <div role="dialog" aria-label={`Mặc thử ${it.name}`} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "flex-end" }}>
      <div data-testid="pet-tryon" style={{ width: "100%", maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px", boxSizing: "border-box" }}>
        <span aria-hidden="true" style={{ display: "block", width: 40, height: 5, borderRadius: 3, background: "#CBD5E1", margin: "0 auto 10px auto" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: r.color }}>{r.label.toUpperCase()} · {catalog.slots[it.slot].toUpperCase()}</span>
            <span style={{ fontSize: 19, fontWeight: 900 }}>{it.name}</span>
          </span>
          <button aria-label="Đóng" style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: LT.soft, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.close(18)}</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <Stage pet={{ ...pet, equipped: { ...pet.equipped, [it.slot]: it.id }, mood: "cuoi" }} height={250} size={200} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, fontWeight: 700, color: "#64748B" }}>
          <span>Bạn có <b style={{ color: "#065F46" }}>{fmt(pet.seeds)} Hạt</b></span>
          <span>Mua xong còn <b style={{ color: after >= 0 ? "#065F46" : "#DC2626" }}>{fmt(Math.max(0, after))}</b></span>
        </div>
        {st.kind === "premium" ? (
          <button data-testid="pet-premium" style={{ marginTop: 12, width: "100%", height: 52, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#EC4899,#DB2777)", color: "#FFFFFF", fontSize: 16, fontWeight: 900, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {PIc.crown(18)}Dùng Premium để mua
          </button>
        ) : (
          <button data-testid="pet-buy" disabled={st.kind !== "buy" || after < 0} style={{ marginTop: 12, width: "100%", height: 52, borderRadius: 16, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 16, fontWeight: 900, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {st.kind === "level" ? <>{PIc.lock(18)}Mở ở cấp {it.level}</> : after < 0 ? `Còn thiếu ${fmt(-after)} Hạt` : <>Mua · <Seed size={18} color="#FFFFFF" />{fmt(it.price)}</>}
          </button>
        )}
        <span style={{ display: "block", textAlign: "center", marginTop: 8, fontSize: 12, color: "#64748B" }}>Mua 1 lần, mặc mãi. Đồ này chỉ dành cho {pet.variant === "nu" ? "Pi nữ" : "Pi nam"}.</span>
      </div>
    </div>
  );
}

// ============ Màn Tủ đồ ============
export function PetClosetScreen({ pet, onBack, slot: slot0 = "all" }) {
  const [slot, setSlot] = useState(slot0);
  const mine = pet.owned.map((id) => ITEMS[id]).filter((it) => it && it.variants.includes(pet.variant));
  const counts = mine.reduce((m, it) => ((m[it.slot] = (m[it.slot] || 0) + 1), m), {});
  const shown = mine.filter((it) => slot === "all" || it.slot === slot);
  const wearing = Object.entries(pet.equipped).filter(([, id]) => ITEMS[id]);
  return (
    <SubPage title="Tủ đồ" subtitle={`${mine.length} món · bấm để mặc / tháo`} onBack={onBack}>
      <div data-testid="pet-closet">
        <div style={{ padding: "12px 12px 0 12px" }}><Stage pet={pet} height={250} size={200} /></div>
        {/* Đang mặc */}
        <div style={{ ...card, marginTop: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#64748B" }}>ĐANG MẶC</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {wearing.map(([s, id]) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 6px 0 4px", borderRadius: 18, background: LT.soft, fontSize: 12, fontWeight: 800, color: "#0F172A" }}>
                <span style={{ width: 28, height: 28, borderRadius: 14, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}><ItemImg item={ITEMS[id]} size={22} /></span>
                {catalog.slots[s]}
                <button aria-label={`Tháo ${ITEMS[id].name}`} style={{ width: 24, height: 24, borderRadius: 12, border: "none", background: "transparent", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{Icon.close(13)}</button>
              </span>
            ))}
            {pet.variant === "nu" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 6px 0 12px", borderRadius: 18, background: LT.soft, fontSize: 12, fontWeight: 800 }}>
                Nơ trên đầu
                <span role="switch" aria-checked={pet.bow} style={{ width: 40, height: 24, borderRadius: 12, background: pet.bow ? "#00C896" : "#CBD5E1", position: "relative" }}><span style={{ position: "absolute", top: 2, left: pet.bow ? 18 : 2, width: 20, height: 20, borderRadius: 10, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} /></span>
              </span>
            )}
          </div>
          {pet.variant === "nu" && pet.equipped.dau && <span style={{ fontSize: 12, color: "#64748B" }}>Đang đội mũ nên nơ tạm ẩn.</span>}
        </div>
        <Chips value={slot} onChange={setSlot} counts={counts} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, padding: "8px 12px 0 12px" }}>
          {shown.map((it) => <ItemCard key={it.id} it={it} state={{ kind: "owned" }} equipped={Object.values(pet.equipped).includes(it.id)} />)}
        </div>
        <div style={{ height: 28 }} />
      </div>
    </SubPage>
  );
}

// ============ Chỗ vào B: thẻ trên Hôm nay ============
export function PetTodayCard({ pet, onOpen }) {
  const left = pet.tasksLeft;
  return (
    <button data-testid="pet-today-card" onClick={onOpen} className="tap" style={{ margin: "14px 12px 0 12px", width: "calc(100% - 24px)", ...ltCard, padding: "0 14px 0 6px", display: "flex", alignItems: "center", gap: 6, border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A", overflow: "hidden", boxSizing: "border-box", minHeight: 104 }}>
      <span style={{ width: 92, height: 104, position: "relative", flexShrink: 0, overflow: "hidden" }}>
        <span style={{ position: "absolute", left: "50%", top: 6, transform: "translateX(-50%)" }}><PetAvatar variant={pet.variant} equipped={pet.equipped} mood={pet.mood} bow={pet.bow} size={120} still /></span>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{pet.name}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#6D28D9", background: "#F3EEFF", padding: "2px 7px", borderRadius: 6 }}>Cấp {pet.level.n}</span>
        </span>
        {pet.say ? (
          <>
            {/* 20/10: Pi nói 1 câu khen / nhắc theo việc thật (kho câu src/pet/lines.js, đúng giọng nam / nữ) */}
            <span data-testid="pet-say" style={{ position: "relative", alignSelf: "flex-start", maxWidth: "100%", background: "#EEF4FF", color: "#0F172A", fontSize: 13, fontWeight: 700, lineHeight: 1.4, padding: "7px 11px", borderRadius: "4px 14px 14px 14px", boxSizing: "border-box" }}>{pet.say}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#64748B" }}>{left > 0 ? `Còn ${left} việc · +${pet.todayLeft}` : "Xong việc hôm nay"}<span aria-hidden="true">·</span><Seed size={13} /><b style={{ color: "#065F46" }}>{fmt(pet.seeds)}</b></span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", lineHeight: 1.4 }}>{pet.mood === "ngu" ? "Đang ngủ gật — ghi bữa đầu tiên để gọi dậy" : left > 0 ? `Còn ${left} việc hôm nay · +${pet.todayLeft} Hạt` : "Xong hết việc hôm nay!"}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 900, color: "#065F46" }}><Seed size={15} />{fmt(pet.seeds)} Hạt</span>
          </>
        )}
      </span>
      {Icon.chev(16)}
    </button>
  );
}

// ============ Chỗ vào A: dòng trong Tôi (nền tối) ============
export function PetMeRow({ pet, onOpen }) {
  return (
    <>
      <span style={{ display: "block", padding: "18px 18px 8px 18px", fontSize: 13, fontWeight: 800, color: DK.t3 }}>Thú cưng</span>
      <button data-testid="me-pet" onClick={onOpen} className="tap row-hover" style={{ ...dkCard, margin: "0 12px", width: "calc(100% - 24px)", padding: "0 14px", height: 64, display: "flex", alignItems: "center", gap: 12, color: DK.t1, fontFamily: "inherit", textAlign: "left", boxSizing: "border-box" }}>
        <DkIcon color={PET_C}>{PIc.paw(18)}</DkIcon>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{pet.name} · Cấp {pet.level.n}</span>
          <span style={{ fontSize: 12, color: DK.t3 }}>Còn {pet.tasksLeft} việc hôm nay · {fmt(pet.seeds)} Hạt</span>
        </span>
        {Icon.chev(16, DK.chev)}
      </button>
    </>
  );
}
export { mix, IC_COLOR };
