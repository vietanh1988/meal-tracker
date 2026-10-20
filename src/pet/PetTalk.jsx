// Fipilot Pet — đợt "Pi nói chuyện + khen" (chốt 20/10). Bản vẽ dựng từ khối thật của app, dữ liệu truyền vào.
//  - PetChooseScreen: lần đầu mở Pet → chọn Pi nam / Pi nữ (kho đồ theo bản), đặt tên.
//  - PetChatScreen: Hỏi Pi — chat AI giọng Pi, dùng lượt AI của gói; hết lượt mời Premium.
//  - PetWeekScreen: Tổng kết tuần Chủ nhật — số máy tính + câu soạn sẵn cho mọi khách; Premium thêm nhận xét AI.
//  - PetSettingsScreen: tên, bản, Pi khen và nhắc (số câu / ngày, giờ yên lặng), tổng kết tuần.
import { SubPage, Icon, GRAD_BLUE, Seg } from "../mobile/ui";
import { AppIcon } from "../mobile/icons";
import { LT, ltCard } from "../theme";
import { PetAvatar } from "./PetAvatar";
import { Stage, PIc, Seed, moodText } from "./PetScreens";
import { VOICE, say } from "./lines";

const fmt = (n) => Math.round(n).toLocaleString("vi-VN");
const card = { margin: "0 12px", ...ltCard };
const secT = { display: "block", padding: "20px 20px 8px 20px", fontSize: 13, fontWeight: 800, color: "#64748B" };
const bubble = { background: "#FFFFFF", borderRadius: 16, padding: "9px 13px", fontSize: 13, fontWeight: 700, color: "#334155", lineHeight: 1.4, boxShadow: "0 6px 16px rgba(30,64,175,0.12)", textAlign: "center" };

// ============ Chọn bạn đồng hành ============
export function PetChooseScreen({ value = "nam", name = "Pi", onPick, onBack, onDone }) {
  const opt = (v) => {
    const on = value === v;
    return (
      <button key={v} data-testid={`pet-choose-${v}`} onClick={() => onPick?.(v)} aria-pressed={on} className="tap"
        style={{ position: "relative", ...ltCard, borderRadius: 22, padding: 0, overflow: "hidden", border: on ? "2px solid #007AFF" : "2px solid transparent", fontFamily: "inherit", textAlign: "left", color: "#0F172A", display: "flex", flexDirection: "column", minWidth: 0, boxSizing: "border-box" }}>
        <span style={{ position: "relative", height: 196, background: "radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EAF4FF 50%, #D6E8FF 100%)", display: "block" }}>
          <span style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)" }}><PetAvatar variant={v} mood="vui" size={150} still label={VOICE[v].label} /></span>
          {on && <span aria-hidden="true" style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 13, background: "#007AFF", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.check(14, 3)}</span>}
        </span>
        <span style={{ padding: "10px 12px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{VOICE[v].label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", lineHeight: 1.35 }}>{VOICE[v].tag}</span>
          <span style={{ marginTop: 4, background: "#EEF4FF", borderRadius: "4px 12px 12px 12px", padding: "6px 9px", fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>{say("full", v)}</span>
        </span>
      </button>
    );
  };
  return (
    <SubPage title="Chọn bạn đồng hành" subtitle="Pi khen bạn mỗi khi ghi bữa, uống nước, tập đều" onBack={onBack}
      footer={<div style={{ padding: "10px 16px calc(14px + env(safe-area-inset-bottom, 0px)) 16px", background: "rgba(255,255,255,0.92)", borderTop: "1px solid rgba(30,64,175,0.08)" }}>
        <button data-testid="pet-choose-done" onClick={onDone} style={{ display: "block", width: "100%", maxWidth: 528, margin: "0 auto", height: 52, borderRadius: 16, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 16, fontWeight: 900, fontFamily: "inherit" }}>Chọn {VOICE[value].label}</button>
      </div>}>
      <div data-testid="pet-choose" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, padding: "14px 12px 0 12px" }}>{opt("nam")}{opt("nu")}</div>
      <span style={secT}>Tên bạn đồng hành</span>
      <div style={{ ...card, padding: "0 14px", height: 52, display: "flex", alignItems: "center", gap: 10 }}>
        <input data-testid="pet-name" defaultValue={name} maxLength={12} aria-label="Tên bạn đồng hành" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 16, fontWeight: 800, fontFamily: "inherit", color: "#0F172A" }} />
        <span style={{ fontSize: 12, color: "#94A3B8" }}>tối đa 12 chữ</span>
      </div>
      <div style={{ ...card, marginTop: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {[[PIc.shirt(18), "#0891B2", `${VOICE.nam.label} mặc đồ nam, ${VOICE.nu.label} mặc đồ nữ. Cửa hàng chỉ hiện đồ của bản bạn chọn.`],
          [PIc.chat(18), "#7C3AED", "Pi nói theo giọng riêng: Pi nam hăng hái kiểu bạn tập cùng, Pi nữ dịu dàng kiểu bạn thân."],
          [PIc.closet(18), "#16A34A", "Đổi bản sau trong Cài đặt Pi. Đồ đã mua của bản cũ vẫn giữ, đổi lại là có."]].map(([ic, c, t], i) => (
          <span key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AppIcon color={c} size={30}>{ic}</AppIcon>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#334155", lineHeight: 1.45, paddingTop: 5 }}>{t}</span>
          </span>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </SubPage>
  );
}

// ============ Hỏi Pi (chat AI giọng Pi) ============
function PiFace({ variant, size = 30 }) {
  // đầu Pi trong ô tròn (cắt nửa trên thân)
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", background: "#EAF4FF", flexShrink: 0, position: "relative", display: "block" }}>
      <span style={{ position: "absolute", left: "50%", top: -size * 0.32, transform: "translateX(-50%)" }}><PetAvatar variant={variant} size={size * 2.5} still /></span>
    </span>
  );
}
export function PetChatScreen({ pet, msgs, left, max, onBack }) {
  const out = left <= 0;
  const chips = ["Tối nay ăn gì?", "Hôm nay còn thiếu gì?", "Khen Pi đi"];
  return (
    <SubPage title={`Hỏi ${pet.name}`} subtitle="Pi trả lời bằng AI · dùng lượt AI của gói" onBack={onBack}
      footer={<div style={{ background: "rgba(255,255,255,0.92)", borderTop: "1px solid rgba(30,64,175,0.08)", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {out ? (
            <div data-testid="pet-chat-out" style={{ margin: "10px 12px 2px 12px", borderRadius: 18, padding: "12px 14px", background: "linear-gradient(135deg,#FDF2F8,#F5F3FF)", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AppIcon color="#DB2777" size={36}>{PIc.crown(18)}</AppIcon>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#831843", lineHeight: 1.4 }}>Hết lượt hỏi AI hôm nay. Lượt mới lúc 0:00, Pi vẫn khen bạn như thường.</span>
              </span>
              <button data-testid="pet-chat-premium" style={{ height: 44, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#EC4899,#DB2777)", color: "#FFFFFF", fontSize: 14, fontWeight: 900, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{PIc.crown(16)}Dùng Premium · hỏi nhiều hơn</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, padding: "10px 12px 6px 12px", overflowX: "auto" }}>
                {chips.map((c) => <span key={c} style={{ height: 34, padding: "0 12px", borderRadius: 17, display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, color: "#0062F0", background: "#EEF4FF", whiteSpace: "nowrap", flexShrink: 0 }}>{c}</span>)}
              </div>
              <div style={{ display: "flex", gap: 8, padding: "4px 12px 4px 12px", alignItems: "center" }}>
                <input data-testid="pet-chat-input" placeholder={`Nhắn cho ${pet.name}…`} aria-label={`Nhắn cho ${pet.name}`} style={{ flex: 1, height: 46, padding: "0 16px", borderRadius: 23, border: "none", background: "#F1F5F9", fontSize: 16, outline: "none", fontFamily: "inherit", minWidth: 0 }} />
                <button data-testid="pet-chat-send" aria-label="Gửi" style={{ width: 46, height: 46, borderRadius: 23, border: "none", background: GRAD_BLUE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{PIc.send(20)}</button>
              </div>
            </>
          )}
          <span data-testid="pet-chat-left" style={{ display: "block", textAlign: "center", fontSize: 11, fontWeight: 700, color: out ? "#DB2777" : "#64748B", padding: "4px 0 0 0" }}>Còn {left} / {max} lượt hỏi AI hôm nay · câu Pi tự khen không tính lượt</span>
        </div>
      </div>}>
      <div data-testid="pet-chat" style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%", background: GRAD_BLUE, color: "#FFFFFF", padding: "10px 14px", borderRadius: 18, borderBottomRightRadius: 4, fontSize: 14, lineHeight: 1.55 }}>{m.text}</div>
        ) : (
          <div key={i} style={{ alignSelf: "flex-start", maxWidth: "88%", display: "flex", alignItems: "flex-end", gap: 6 }}>
            <PiFace variant={pet.variant} />
            <div style={{ background: "#FFFFFF", padding: "10px 14px", borderRadius: 18, borderBottomLeftRadius: 4, fontSize: 14, lineHeight: 1.55, color: "#0F172A" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: m.ai ? "#7C3AED" : "#0891B2", marginBottom: 3 }}>{m.ai ? <>{PIc.sparkle(11)}{pet.name} · AI</> : `${pet.name} · câu soạn sẵn`}</span>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </SubPage>
  );
}

// ============ Tổng kết tuần (Chủ nhật) ============
export function PetWeekScreen({ pet, w, onBack }) {
  const tiles = [
    ["Bữa đã ghi", `${w.meals} / ${w.mealsMax}`, "#007AFF"],
    ["Ngày đủ nước", `${w.waterDays} / 7`, "#0891B2"],
    ["Chuỗi dài nhất", `${w.streak} ngày`, "#F97316"],
    ["Hạt kiếm được", fmt(w.seeds), "#16A34A"],
  ];
  return (
    <SubPage title="Tổng kết tuần" subtitle={`${w.range} · Pi tính từ nhật ký của bạn`} onBack={onBack}>
      <div data-testid="pet-week" style={{ padding: "12px 12px 0 12px" }}>
        <Stage pet={{ ...pet, mood: "mung" }} height={230} size={170}>
          <span style={{ position: "absolute", left: 14, right: 14, top: 14, display: "flex", justifyContent: "center" }}><span style={{ ...bubble, maxWidth: 290 }}>{w.line}</span></span>
        </Stage>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, padding: "12px 12px 0 12px" }}>
        {tiles.map(([l, v, c]) => (
          <div key={l} style={{ ...ltCard, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{l}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: c, display: "inline-flex", alignItems: "center", gap: 4 }}>{l === "Hạt kiếm được" && <Seed size={18} />}{v}</span>
          </div>
        ))}
      </div>
      <div style={{ ...card, marginTop: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <AppIcon color="#64748B" size={36}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M8 9a4 4 0 0 1 8 0M12 9l1.5-2" /></svg></AppIcon>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Cân tuần này {w.kg} kg</span>
          {/* luật giọng Pi: cân giảm mới nói số giảm; cân tăng chỉ ghi "đã cân" */}
          <span style={{ fontSize: 12, fontWeight: 600, color: w.kgDown ? "#047857" : "#64748B" }}>{w.kgDown ? `Giảm ${w.kgDown} kg so với tuần trước` : "Đã cân tuần này"}</span>
        </span>
      </div>

      <span style={secT}>{pet.name} nhận xét</span>
      {pet.premium ? (
        <div data-testid="pet-week-ai" style={{ ...card, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start", fontSize: 11, fontWeight: 800, color: "#7C3AED", background: "#F3EEFF", padding: "2px 8px", borderRadius: 6 }}>{PIc.sparkle(11)}AI viết riêng cho tuần này</span>
          <span style={{ fontSize: 14, lineHeight: 1.6, color: "#0F172A" }}>{w.ai}</span>
        </div>
      ) : (
        <div data-testid="pet-week-lock" style={{ ...card, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden" }}>
          <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 7, filter: "blur(3px)", opacity: 0.6 }}>
            {[92, 100, 78].map((x, i) => <span key={i} style={{ height: 11, width: `${x}%`, borderRadius: 6, background: "#CBD5E1" }} />)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#831843", lineHeight: 1.4 }}>Premium có thêm nhận xét AI viết riêng cho tuần của bạn: bữa nào hay thiếu, tuần tới nên chỉnh gì.</span>
          <button data-testid="pet-week-premium" style={{ height: 44, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#EC4899,#DB2777)", color: "#FFFFFF", fontSize: 14, fontWeight: 900, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{PIc.crown(16)}Dùng Premium</button>
        </div>
      )}

      <span style={secT}>Tuần tới thử nè</span>
      <div style={{ ...card, padding: "4px 14px" }}>
        {w.next.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderBottom: i < w.next.length - 1 ? `1px solid ${LT.line}` : "none" }}>
            <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 12, border: "2px solid #94A3B8", flexShrink: 0, boxSizing: "border-box" }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ height: 28 }} />
    </SubPage>
  );
}

// ============ Cài đặt Pi ============
// Công tắc nền sáng (Toggle của app là bản nền tối: tắt thì gần như trong suốt trên nền trắng)
function Toggle({ on, label, testid }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} data-testid={testid}
      style={{ width: 52, height: 32, borderRadius: 16, border: "none", background: on ? "#00C896" : "#CBD5E1", position: "relative", padding: 0, flexShrink: 0, cursor: "pointer", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 26, height: 26, borderRadius: 13, background: "#FFFFFF", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </button>
  );
}
function Row({ title, sub, right, last, testid }) {
  return (
    <div data-testid={testid} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", borderBottom: last ? "none" : `1px solid ${LT.line}`, boxSizing: "border-box" }}>
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
        {sub && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", lineHeight: 1.4 }}>{sub}</span>}
      </span>
      {right}
    </div>
  );
}
export function PetSettingsScreen({ pet, set, onBack }) {
  const val = (t) => <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 700, color: "#64748B" }}>{t}{Icon.chev(16)}</span>;
  return (
    <SubPage title={`Cài đặt ${pet.name}`} onBack={onBack}>
      <div data-testid="pet-settings">
        <span style={secT}>Bạn đồng hành</span>
        <div style={{ ...card, padding: "0 14px" }}>
          <Row title="Tên" right={val(pet.name)} testid="pet-set-name" />
          <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Bản Pi</span>
            <Seg ariaLabel="Bản Pi" value={pet.variant} onChange={() => {}} opts={[{ value: "nam", label: "Pi nam", testid: "pet-set-nam" }, { value: "nu", label: "Pi nữ", testid: "pet-set-nu" }]} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", lineHeight: 1.4 }}>Đổi bản thì đổi cả giọng và kho đồ. Đồ đã mua của bản cũ vẫn giữ.</span>
          </div>
        </div>

        <span style={secT}>Pi khen và nhắc</span>
        <div style={{ ...card, padding: "0 14px" }}>
          <Row title="Pi khen và nhắc" sub="Câu soạn sẵn theo việc thật: đủ bữa, chuỗi ngày, uống nước…" right={<Toggle on={set.talk} label="Pi khen và nhắc" testid="pet-set-talk" />} />
          <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: 8, borderBottom: `1px solid ${LT.line}` }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Tối đa mỗi ngày</span>
            <Seg ariaLabel="Số câu mỗi ngày" value={set.perDay} onChange={() => {}} opts={[{ value: 2, label: "2 câu" }, { value: 3, label: "3 câu" }, { value: 5, label: "5 câu" }]} />
          </div>
          <Row title="Giờ yên lặng" sub="Pi không nhắc trong khoảng này" right={val(`${set.quietFrom} – ${set.quietTo}`)} />
          <Row title="Báo trên điện thoại" sub="Gửi câu nhắc ra màn hình khoá khi chưa mở app" right={<Toggle on={set.push} label="Báo trên điện thoại" testid="pet-set-push" />} last />
        </div>

        <span style={secT}>Tổng kết tuần</span>
        <div style={{ ...card, padding: "0 14px" }}>
          <Row title="Tổng kết Chủ nhật" sub={`Mỗi Chủ nhật lúc ${set.weekAt}${pet.premium ? " · có nhận xét AI" : ""}`} right={<Toggle on={set.week} label="Tổng kết Chủ nhật" testid="pet-set-week" />} last />
        </div>
        <span style={{ display: "block", padding: "10px 20px 0 20px", fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>Câu Pi tự khen không tốn lượt AI. Chỉ khi bạn hỏi Pi mới dùng lượt AI của gói.</span>
        <div style={{ height: 28 }} />
      </div>
    </SubPage>
  );
}
export { moodText };
