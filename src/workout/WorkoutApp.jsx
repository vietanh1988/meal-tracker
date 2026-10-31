// 01/11 (chủ dự án chốt bản vẽ "Tập luyện: Giáo án · Thư viện bài tập · Nhật ký"): màn Tập luyện 3 tab + các màn con.
// Khách tự sửa lịch (ngày nào tập buổi nào / nghỉ) và bài; cả nhóm giảm cân (mẫu "Giảm cân tại nhà"). Không video.
// Khoảng cách theo app thật: lề 12, giữa các khối 12, trong thẻ 16, bo 20; tab giống Bạn bè & Xếp hạng; dòng danh sách 58–66.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SubPage, Icon, GRAD_BLUE, FONT, useLockScroll, useSwipeClose, SheetHandle } from "../mobile/ui";
import { ltCard } from "../theme";
import { track } from "../lib/track";
import { weekRange, monthRange, todayVN, gymIdxOf, fmtVN, weekdayShort, addDays } from "../lib/dateVN";
import { TEMPLATES, buildPlan, defaultTpl, DOW, DOW_LONG, planDays, bestSet, lastSets, searchEx, move } from "./plan.js";
import { exOf, unitOf, fmtKg, allExercises, ExArt, MuscleTile, MUSCLES, MUSCLE_NAME, MUSCLE_TONE, EQUIPS } from "./exLib.jsx";
import { SessionScreen } from "./SessionScreen.jsx";
import { WorkoutCard } from "./WorkoutCard.jsx";

const card = { ...ltCard, margin: "0 12px", padding: 16, display: "flex", flexDirection: "column", gap: 10 };
const sub = { fontSize: 12.5, color: "#64748B", lineHeight: 1.45 };
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
const btn = (pri) => ({ height: 44, borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 12px", background: pri ? GRAD_BLUE : "#EEF4FF", color: pri ? "#FFFFFF" : "#0062F0", width: "100%" });
const tagSt = (bg, fg) => ({ height: 26, padding: "0 9px", borderRadius: 13, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", background: bg, color: fg, whiteSpace: "nowrap" });
const exLine = (e) => <>
  <b style={{ fontSize: 14.5, fontWeight: 800 }}>{e.vi}</b>
  {e.en ? <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748B", fontStyle: "italic" }}>({e.en})</span> : null}
</>;

/** sheet đáy dùng chung */
function Sheet({ title, onClose, children, testid }) {
  useLockScroll(true);
  const sw = useSwipeClose(onClose);
  return createPortal(
    <div className="fpm" onClick={sw.close} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid={testid} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", maxHeight: "86vh", overflowY: "auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 20px) 16px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box", animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        {title && <b style={{ fontSize: 17, fontWeight: 900 }}>{title}</b>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------------- Tab Giáo án ----------------
function PlanTab({ w, profile, loss, onDay, onTpl, showToast }) {
  const p = w.active;
  const others = w.plans.filter((x) => !x.active);
  if (!p) {
    const rec = defaultTpl({ days: (profile?.gymDays || []).length || 3, exerciseType: profile?.exerciseType, loss });
    return (
      <div data-testid="wk-plan-empty" style={card}>
        <b style={{ fontSize: 15.5, fontWeight: 900 }}>Chọn giáo án để bắt đầu</b>
        <span style={sub}>App xếp sẵn các buổi vào ngày tập của bạn. Đổi bài, đổi ngày, thêm bớt buổi tuỳ ý.</span>
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" data-testid={`wk-tpl-${t.id}`} onClick={() => onTpl(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 12px", borderRadius: 16, border: t.id === rec ? "2px solid #0062F0" : "1.5px solid #E2E8F0", background: t.id === rec ? "#EEF4FF" : "#FFFFFF", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5, fontWeight: 900 }}>{t.name}</b><span style={{ fontSize: 12, color: "#64748B" }}>{t.hint}</span></span>
            {t.id === rec && <span style={tagSt("#0062F0", "#FFFFFF")}>Hợp với bạn</span>}
          </button>
        ))}
        <button type="button" data-testid="wk-tpl-blank" onClick={() => onTpl("blank")} style={btn(false)}>Tự tạo từ đầu</button>
      </div>
    );
  }
  const used = planDays(p);
  return (
    <>
      <div data-testid="wk-plan" style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ flex: 1, fontSize: 15.5, fontWeight: 900 }}>{p.name}</b>
          <span style={tagSt("#F3EEFF", "#6D28D9")}>Đang dùng</span>
        </div>
        <span style={sub}>{used.length} buổi/tuần · chạm từng ngày để sửa bài, đổi ngày, hoặc thêm buổi vào ngày nghỉ</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {DOW.map((d, i) => {
            const s = p.days?.[String(i)];
            const names = (s?.items || []).slice(0, 2).map((x) => exOf(x.ex, w.custom).vi).join(", ");
            return (
              <button key={d} type="button" data-testid={`wk-day-${i}`} data-rest={s ? "0" : "1"} onClick={() => onDay(i)}
                style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, borderTop: i ? "1px solid #EEF2FA" : "none", border: "none", borderTopStyle: i ? "solid" : "none", borderTopWidth: i ? 1 : 0, borderTopColor: "#EEF2FA", background: "none", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A", width: "100%" }}>
                <span style={{ width: 34, height: 34, borderRadius: 11, background: s ? "#EEF4FF" : "#F1F5F9", color: s ? "#0062F0" : "#94A3B8", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{d}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: 14.5, fontWeight: 800, color: s ? "#0F172A" : "#94A3B8" }}>{s ? s.title : "Nghỉ"}</b>
                  <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s ? `${s.items.length} bài${names ? ` · ${names}…` : ""}` : "Chạm để thêm buổi tập"}</span>
                </span>
                <span aria-hidden="true" style={{ color: "#94A3B8", display: "flex" }}>{Icon.chev(16)}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" data-testid="wk-tpl-change" onClick={() => onTpl(null)} style={btn(false)}>Đổi giáo án mẫu</button>
          <button type="button" data-testid="wk-plan-new" onClick={() => onTpl("blank")} style={btn(true)}>+ Tạo giáo án</button>
        </div>
      </div>
      {others.length > 0 && (
        <div style={card}>
          <b style={{ fontSize: 14.5, fontWeight: 900 }}>Giáo án khác</b>
          {others.map((o) => (
            <div key={o.id} data-testid="wk-plan-other" style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48 }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14, fontWeight: 800 }}>{o.name}</b><span style={{ fontSize: 12, color: "#64748B" }}>{planDays(o).length} buổi/tuần</span></span>
              <button type="button" onClick={async () => { const r = await w.setActivePlan(o.id); if (r.ok) showToast?.({ text: `Đang dùng: ${o.name}` }); }} style={{ ...btn(false), width: "auto", height: 34, fontSize: 13 }}>Dùng</button>
              <button type="button" aria-label={`Xoá ${o.name}`} onClick={() => w.deletePlan(o.id)} style={{ ...btn(false), width: 34, height: 34, padding: 0, background: "#F1F5F9", color: "#64748B" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------- Tab Thư viện ----------------
function LibraryTab({ w, onOpen, onAdd, onCustom, pickMode, pickMuscle }) {
  const [q, setQ] = useState("");
  const [m, setM] = useState(pickMuscle || "");
  const list = useMemo(() => searchEx(allExercises(w.custom), q, m), [q, m, w.custom]);
  return (
    <>
      <div style={{ margin: "0 12px", height: 44, borderRadius: 14, background: "#FFFFFF", border: "1.5px solid #DCE7FF", display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
        <span aria-hidden="true" style={{ color: "#94A3B8", fontSize: 16 }}>⌕</span>
        <input data-testid="wk-lib-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ví dụ: bench press, gánh tạ" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontFamily: "inherit", fontSize: 15, background: "transparent", color: "#0F172A" }} />
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 12px", scrollbarWidth: "none" }}>
        {[["", "Tất cả"], ...MUSCLES].map(([k, t]) => (
          <button key={k || "all"} type="button" data-testid={`wk-lib-m-${k || "all"}`} aria-pressed={m === k} onClick={() => setM(k)}
            style={{ height: 32, padding: "0 12px", borderRadius: 16, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0, background: m === k ? "#0062F0" : "#FFFFFF", color: m === k ? "#FFFFFF" : "#475569" }}>{t}</button>
        ))}
      </div>
      <div data-testid="wk-lib-list" style={{ ...ltCard, margin: "0 12px", padding: "0 14px" }}>
        {!list.length && <span style={{ ...sub, display: "block", padding: "16px 0" }}>Không thấy bài này. Bấm "Thêm bài của bạn" để tự thêm.</span>}
        {list.map((e, i) => (
          <div key={e.id} data-testid="wk-lib-row" data-id={e.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, padding: "8px 0", borderTop: i ? "1px solid #EEF2FA" : "none" }}>
            <button type="button" onClick={() => (pickMode ? onAdd(e) : onOpen(e))} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, border: "none", background: "none", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
              <MuscleTile muscle={e.muscle} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                {exLine(e)}
                <span style={{ fontSize: 12, color: "#64748B" }}>{MUSCLE_NAME[e.muscle] || "Bài của bạn"} · {EQUIPS[e.equip] || "—"}{e.custom ? " · bài của bạn" : ""}</span>
              </span>
            </button>
            <button type="button" data-testid="wk-lib-add" aria-label={`Thêm ${e.vi}`} onClick={() => onAdd(e)} style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 20, fontWeight: 700, flexShrink: 0, padding: 0 }}>+</button>
          </div>
        ))}
      </div>
      {!pickMode && <div style={{ margin: "0 12px" }}><button type="button" data-testid="wk-custom-open" onClick={onCustom} style={btn(false)}>+ Thêm bài của bạn</button></div>}
    </>
  );
}

function CustomSheet({ onClose, onSave }) {
  const [vi, setVi] = useState(""); const [en, setEn] = useState(""); const [m, setM] = useState("nguc"); const [eq, setEq] = useState("ta_don_tay");
  const inp = { height: 44, borderRadius: 12, border: "1.5px solid #DCE7FF", padding: "0 12px", fontSize: 15, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
  return (
    <Sheet title="Thêm bài của bạn" onClose={onClose} testid="wk-custom-sheet">
      <input data-testid="wk-custom-vi" value={vi} onChange={(e) => setVi(e.target.value.slice(0, 60))} placeholder="Tên bài, ví dụ: Đẩy ngực máy Smith" style={inp} />
      <input data-testid="wk-custom-en" value={en} onChange={(e) => setEn(e.target.value.slice(0, 60))} placeholder="Tên tiếng Anh (không bắt buộc), ví dụ: Smith Machine Press" style={inp} />
      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#64748B" }}>Nhóm cơ chính</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{MUSCLES.map(([k, t]) => <button key={k} type="button" aria-pressed={m === k} onClick={() => setM(k)} style={{ ...tagSt(m === k ? "#0062F0" : "#F1F5F9", m === k ? "#FFFFFF" : "#475569"), height: 32, border: "none", fontFamily: "inherit" }}>{t}</button>)}</div>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: "#64748B" }}>Dụng cụ</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{Object.entries(EQUIPS).map(([k, t]) => <button key={k} type="button" aria-pressed={eq === k} onClick={() => setEq(k)} style={{ ...tagSt(eq === k ? "#0062F0" : "#F1F5F9", eq === k ? "#FFFFFF" : "#475569"), height: 32, border: "none", fontFamily: "inherit" }}>{t}</button>)}</div>
      <button type="button" data-testid="wk-custom-save" disabled={!vi.trim()} onClick={() => onSave({ vi: vi.trim(), en: en.trim(), muscle: m, equip: eq })} style={{ ...btn(true), opacity: vi.trim() ? 1 : 0.5 }}>Lưu bài</button>
    </Sheet>
  );
}

/** chọn buổi (ngày) để thêm 1 bài */
function AddToDaySheet({ w, ex, onClose, onDone }) {
  const p = w.active;
  return (
    <Sheet title={`Thêm "${ex.vi}" vào buổi`} onClose={onClose} testid="wk-addto-sheet">
      {!p && <span style={sub}>Bạn chưa có giáo án. Vào tab Giáo án chọn 1 giáo án mẫu trước.</span>}
      {p && DOW.map((d, i) => {
        const s = p.days?.[String(i)];
        if (!s) return null;
        const has = s.items.some((x) => x.ex === ex.id);
        return (
          <button key={d} type="button" data-testid={`wk-addto-${i}`} disabled={has} onClick={() => onDone(i)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderRadius: 14, border: "1.5px solid #E2E8F0", background: has ? "#F8FAFC" : "#FFFFFF", padding: "0 12px", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
            <span style={{ width: 34, height: 34, borderRadius: 11, background: "#EEF4FF", color: "#0062F0", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{d}</span>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 800 }}>{s.title}</span>
            <span style={{ fontSize: 12, color: "#64748B" }}>{has ? "Đã có" : `${s.items.length} bài`}</span>
          </button>
        );
      })}
    </Sheet>
  );
}

// ---------------- Tab Nhật ký ----------------
function LogTab({ w, plan, today, onOpen, onResume }) {
  const wk = weekRange(today), mo = monthRange(today);
  const done = w.sessions.filter((s) => s.ended_at);
  const open = w.sessions.find((s) => !s.ended_at && s.day === today);
  const inWeek = done.filter((s) => s.day >= wk.start && s.day <= wk.end).length;
  const inMonth = done.filter((s) => s.day >= mo.start && s.day <= mo.end);
  const goal = plan ? planDays(plan).length : 0;
  // đang tăng tạ: kỷ lục 4 tuần gần đây so với trước đó
  const cut = addDays(today, -28);
  const lifts = useMemo(() => {
    const ids = [...new Set(done.flatMap((s) => (s.items || []).map((i) => i.ex)))];
    return ids.map((id) => {
      const now = bestSet(done.filter((s) => s.day >= cut), id), was = bestSet(done.filter((s) => s.day < cut), id);
      return now && was && now.kg > was.kg ? { id, from: was.kg, to: now.kg } : null;
    }).filter(Boolean).sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, 3);
  }, [w.sessions]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div data-testid="wk-log-week" style={{ ...card, flexDirection: "row", alignItems: "center", padding: "12px 16px" }}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <b style={{ fontSize: 14.5, fontWeight: 900 }}>Tuần này {inWeek}{goal ? `/${goal}` : ""} buổi</b>
          <span style={{ fontSize: 12, color: "#64748B" }}>Tháng {Number(mo.start.slice(5, 7))}: {inMonth.length} buổi · {fmt(inMonth.reduce((a, s) => a + (Number(s.volume) || 0), 0))} kg</span>
        </span>
      </div>
      {open && <div style={{ margin: "0 12px" }}><button type="button" data-testid="wk-log-resume" onClick={() => onResume(open)} style={btn(true)}>Tiếp tục buổi đang tập dở</button></div>}
      {lifts.length > 0 && (
        <div style={{ ...card, gap: 0 }}>
          <b style={{ fontSize: 14.5, fontWeight: 900, marginBottom: 4 }}>Đang tăng tạ <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>· so với 4 tuần trước</span></b>
          {lifts.map((l, i) => { const e = exOf(l.id, w.custom); return (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderTop: i ? "1px solid #EEF2FA" : "none" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{exLine(e)}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#047857", background: "#ECFDF5", borderRadius: 10, padding: "3px 8px", whiteSpace: "nowrap" }}>{fmtKg(l.from)} → {fmtKg(l.to)} kg</span>
            </div>); })}
        </div>
      )}
      <div data-testid="wk-log-list" style={{ ...ltCard, margin: "0 12px", padding: "0 14px" }}>
        {!done.length && <span style={{ ...sub, display: "block", padding: "16px 0" }}>Chưa có buổi nào. Tập xong buổi đầu tiên là có nhật ký ở đây.</span>}
        {done.slice(0, 60).map((s, i) => (
          <button key={s.id} type="button" data-testid="wk-log-row" onClick={() => onOpen(s)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, width: "100%", border: "none", borderTop: i ? "1px solid #EEF2FA" : "none", background: "none", padding: 0, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
            <span style={{ width: 44, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}><span style={{ fontSize: 11, fontWeight: 800, color: "#64748B" }}>{weekdayShort(s.day)}</span><b style={{ fontSize: 18, fontWeight: 900 }}>{Number(s.day.slice(8))}</b></span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <b style={{ fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</b>
              <span style={{ fontSize: 12, color: "#64748B" }}>{s.minutes ?? 0} phút · {s.sets_done ?? 0} hiệp · {fmt(s.volume)} kg</span>
            </span>
            <span aria-hidden="true" style={{ color: "#94A3B8", display: "flex" }}>{Icon.chev(16)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function LogDetail({ w, s, onBack }) {
  const [ask, setAsk] = useState(false);
  return (
    <SubPage title={s.title} subtitle={`${weekdayShort(s.day)} ${fmtVN(s.day)} · ${s.minutes ?? 0} phút · ${s.sets_done ?? 0} hiệp · ${fmt(s.volume)} kg`} onBack={onBack}>
      <div data-testid="wk-log-detail" style={{ padding: "12px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {(s.items || []).map((i, k) => { const e = exOf(i.ex, w.custom); const u = unitOf(e); return (
          <div key={k} style={card}>
            <span style={{ display: "flex", flexDirection: "column" }}>{exLine(e)}</span>
            {(i.sets || []).map((x, j) => (
              <span key={j} style={{ fontSize: 13.5, color: x.done ? "#0F172A" : "#94A3B8" }}>Hiệp {j + 1}: {Number(x.kg) > 0 ? `${fmtKg(x.kg)} kg × ` : ""}{x.reps} {u}{x.done ? "" : " · bỏ qua"}</span>
            ))}
          </div>); })}
        <div style={{ margin: "0 12px" }}>
          {!ask ? <button type="button" onClick={() => setAsk(true)} style={{ ...btn(false), background: "#FEF2F2", color: "#B91C1C" }}>Xoá buổi này</button>
            : <button type="button" data-testid="wk-log-delete" onClick={async () => { await w.deleteSession(s.id); onBack(); }} style={{ ...btn(true), background: "#DC2626" }}>Xoá hẳn buổi {fmtVN(s.day)}</button>}
        </div>
      </div>
    </SubPage>
  );
}

// ---------------- Chi tiết bài ----------------
function ExerciseDetail({ w, ex, onBack, onAdd }) {
  const e = ex;
  const best = bestSet(w.sessions, e.id), last = lastSets(w.sessions, e.id);
  const u = unitOf(e);
  return (
    <SubPage title="Bài tập" onBack={onBack}>
      <div data-testid="wk-ex-detail" style={{ padding: "12px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ margin: "0 12px", height: 150, borderRadius: 20, background: "linear-gradient(135deg,#EEF4FF,#DCE7FF)", display: "flex", alignItems: "center", justifyContent: "center" }}><ExArt pattern={e.pattern} /></div>
        <div style={{ margin: "0 16px", display: "flex", flexDirection: "column", gap: 2 }}>
          <b data-testid="wk-ex-vi" style={{ fontSize: 21, fontWeight: 900 }}>{e.vi}</b>
          {e.en && <span data-testid="wk-ex-en" style={{ fontSize: 14, fontStyle: "italic", color: "#64748B", fontWeight: 600 }}>{e.en}</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 16px" }}>
          {e.muscle && <span style={tagSt(...(MUSCLE_TONE[e.muscle] || ["#F1F5F9", "#475569"]))}>{MUSCLE_NAME[e.muscle]} (chính)</span>}
          {(e.sub || []).map((m) => <span key={m} style={tagSt("#F1F5F9", "#475569")}>{MUSCLE_NAME[m]}</span>)}
          {EQUIPS[e.equip] && <span style={tagSt("#EEF4FF", "#0062F0")}>{EQUIPS[e.equip]}</span>}
          <span style={tagSt("#ECFDF5", "#047857")}>{e.level === "nang_cao" ? "Nâng cao" : "Cơ bản"}</span>
        </div>
        {(e.steps || []).length > 0 && (
          <div style={card}>
            <b style={{ fontSize: 15, fontWeight: 900 }}>Cách tập</b>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55 }}>{e.steps.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}</ol>
            {e.tip && <span style={sub}>Lưu ý: {e.tip}</span>}
          </div>
        )}
        <div style={card}>
          <b style={{ fontSize: 15, fontWeight: 900 }}>Của bạn</b>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 2 }}><b data-testid="wk-ex-best" style={{ fontSize: 16, fontWeight: 900 }}>{best ? `${best.kg > 0 ? `${fmtKg(best.kg)} kg × ` : ""}${best.reps} ${u}` : "—"}</b><span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>Kỷ lục{best ? ` · ${fmtVN(best.day)}` : ""}</span></div>
            <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16, fontWeight: 900 }}>{last ? `${last.length} × ${last[0].reps}${last[0].kg > 0 ? ` × ${fmtKg(last[0].kg)}` : ""}` : "—"}</b><span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>Lần gần nhất</span></div>
          </div>
          <button type="button" data-testid="wk-ex-add" onClick={() => onAdd(e)} style={btn(true)}>+ Thêm vào buổi tập</button>
        </div>
      </div>
    </SubPage>
  );
}

// ---------------- Sửa 1 buổi ----------------
function DayEditor({ w, dow, onBack, onPick, showToast, syncDays }) {
  const p = w.active;
  const [s, setS] = useState(() => JSON.parse(JSON.stringify(p?.days?.[String(dow)] || { title: "Buổi mới", items: [] })));
  const [edit, setEdit] = useState(null);
  const [drag, setDrag] = useState(null); // { from, dy }
  const dirty = useRef(false);
  const up = (f) => { dirty.current = true; setS((x) => f(JSON.parse(JSON.stringify(x)))); };
  const save = async (next = s, toDow = dow) => {
    const days = { ...(p.days || {}) };
    delete days[String(dow)];
    if (next) days[String(toDow)] = next;
    const r = await w.savePlan({ ...p, days });
    if (!r.ok) { showToast?.({ text: "Chưa lưu được, thử lại." }); return false; }
    syncDays?.(Object.keys(days).map(Number));
    dirty.current = false;
    return true;
  };
  const back = async () => { if (dirty.current) await save(); onBack(); };
  // kéo ≡ đổi thứ tự: dòng cao 64
  const ROW = 64;
  const onDown = (i) => (e) => { e.preventDefault(); const y0 = e.clientY; setDrag({ from: i, dy: 0 }); const mv = (ev) => setDrag({ from: i, dy: ev.clientY - y0 }); const upf = (ev) => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", upf); const to = i + Math.round((ev.clientY - y0) / ROW); setDrag(null); if (to !== i) up((x) => ({ ...x, items: move(x.items, i, to) })); }; window.addEventListener("pointermove", mv); window.addEventListener("pointerup", upf); };
  if (!p) return null;
  const mins = s.items.reduce((a, x) => a + (Number(x.sets) || 3) * 2.5, 0);
  return (
    <SubPage title={s.title || "Buổi tập"} subtitle={`${DOW_LONG[dow]} · ${s.items.length} bài · khoảng ${Math.round(mins / 5) * 5 || 0} phút`} onBack={back}
      right={<button type="button" data-testid="wk-day-save" onClick={async () => { if (await save()) { showToast?.({ text: "Đã lưu buổi tập" }); onBack(); } }} style={{ border: "none", background: "none", color: "#0062F0", fontFamily: "inherit", fontSize: 15, fontWeight: 800, padding: "0 10px" }}>Lưu</button>}>
      <div data-testid="wk-day-editor" style={{ padding: "12px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={card}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: "#64748B" }}>Tên buổi</span>
          <input data-testid="wk-day-title" value={s.title} onChange={(e) => up((x) => ({ ...x, title: e.target.value.slice(0, 40) }))} style={{ height: 44, borderRadius: 12, border: "1.5px solid #DCE7FF", padding: "0 12px", fontSize: 15, fontWeight: 800, fontFamily: "inherit" }} />
          <span style={{ fontSize: 12.5, fontWeight: 800, color: "#64748B" }}>Ngày tập</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
            {DOW.map((d, i) => { const busy = i !== dow && p.days?.[String(i)]; return (
              <button key={d} type="button" data-testid={`wk-day-move-${i}`} disabled={!!busy} aria-pressed={i === dow}
                onClick={async () => { if (i === dow) return; if (await save(s, i)) { showToast?.({ text: `Đã chuyển buổi sang ${DOW_LONG[i]}` }); onBack(); } }}
                style={{ height: 38, borderRadius: 11, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 900, background: i === dow ? "#0062F0" : busy ? "#F1F5F9" : "#EEF4FF", color: i === dow ? "#FFFFFF" : busy ? "#CBD5E1" : "#0062F0" }}>{d}</button>); })}
          </div>
          <span style={sub}>Ngày xám đã có buổi khác. Lịch tập (ngày tập / nghỉ) tự cập nhật theo giáo án.</span>
        </div>
        <div style={{ ...ltCard, margin: "0 12px", padding: "0 14px" }}>
          {!s.items.length && <span style={{ ...sub, display: "block", padding: "16px 0" }}>Buổi chưa có bài. Bấm "Thêm bài từ Thư viện".</span>}
          {s.items.map((x, i) => { const e = exOf(x.ex, w.custom); const u = unitOf(e); const dy = drag?.from === i ? drag.dy : 0; return (
            <div key={`${x.ex}-${i}`} data-testid="wk-day-item" style={{ position: "relative", transform: dy ? `translateY(${dy}px)` : undefined, zIndex: dy ? 2 : undefined, background: "#FFFFFF", borderTop: i ? "1px solid #EEF2FA" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: ROW }}>
                <span role="button" aria-label="Kéo để đổi thứ tự" onPointerDown={onDown(i)} style={{ color: "#CBD5E1", fontSize: 20, padding: "8px 4px", touchAction: "none", cursor: "grab" }}>≡</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{exLine(e)}</span>
                <button type="button" data-testid="wk-day-target" onClick={() => setEdit(edit === i ? null : i)} style={{ height: 32, padding: "0 10px", borderRadius: 10, background: "#F8FAFC", border: "1.5px solid #E2E8F0", fontSize: 13, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap", color: "#0F172A" }}>{x.sets} × {x.reps}{u !== "lần" ? ` ${u}` : ""}</button>
              </div>
              {edit === i && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingBottom: 12 }}>
                  {[["sets", "hiệp", 1, 10, 1], ["reps", u, 1, u === "lần" ? 50 : 600, u === "giây" ? 5 : 1]].map(([k, l, lo, hi, st]) => (
                    <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button type="button" aria-label={`Bớt ${l}`} onClick={() => up((y) => { y.items[i][k] = Math.max(lo, (Number(y.items[i][k]) || lo) - st); return y; })} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 18, fontWeight: 900 }}>−</button>
                      <b style={{ minWidth: 54, textAlign: "center", fontSize: 14 }}>{x[k]} {l}</b>
                      <button type="button" aria-label={`Thêm ${l}`} onClick={() => up((y) => { y.items[i][k] = Math.min(hi, (Number(y.items[i][k]) || lo) + st); return y; })} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 18, fontWeight: 900 }}>+</button>
                    </span>
                  ))}
                  <button type="button" data-testid="wk-day-remove" onClick={() => { setEdit(null); up((y) => ({ ...y, items: y.items.filter((_, j) => j !== i) })); }} style={{ marginLeft: "auto", height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: "#FEF2F2", color: "#B91C1C", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>Bỏ bài</button>
                </div>
              )}
            </div>); })}
        </div>
        <div style={{ margin: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" data-testid="wk-day-add" onClick={() => onPick((e) => up((x) => ({ ...x, items: [...x.items, { ex: e.id, sets: 3, reps: unitOf(e) === "phút" ? 20 : unitOf(e) === "giây" ? 30 : 10 }] })))} style={btn(false)}>+ Thêm bài từ Thư viện</button>
          {p.days?.[String(dow)] && <button type="button" data-testid="wk-day-rest" onClick={async () => { if (await save(null)) { showToast?.({ text: `${DOW_LONG[dow]} thành ngày nghỉ` }); onBack(); } }} style={{ ...btn(false), background: "#F1F5F9", color: "#475569" }}>Đặt {DOW_LONG[dow]} là ngày nghỉ</button>}
        </div>
      </div>
    </SubPage>
  );
}

// ---------------- Màn chính ----------------
export function WorkoutApp({ w, profile, loss, today = todayVN(), initial, onBack, showToast, syncDays, onReward, pet }) {
  const [tab, setTab] = useState(initial?.tab || "plan");
  const [view, setView] = useState(initial?.view || null); // { k: "day"|"ex"|"session"|"log"|"pick", ... }
  const [sheet, setSheet] = useState(null);
  const picker = useRef(null);
  useEffect(() => { track("workout_open", { tab }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (tplId) => {
    if (tplId === null) { setSheet({ k: "tpl" }); return; }
    const gd = (profile?.gymDays && profile.gymDays.length ? profile.gymDays : [0, 2, 4]);
    const plan = tplId === "blank" ? { name: "Giáo án của tôi", tpl: null, days: Object.fromEntries(gd.map((d, i) => [String(d), { title: `Buổi ${i + 1}`, items: [] }])) } : buildPlan(tplId, gd);
    const r = await w.savePlan({ ...plan, active: true });
    if (r.ok) { syncDays?.(planDays(plan)); setSheet(null); showToast?.({ text: `Đang dùng: ${plan.name}` }); track("workout_plan", { tpl: tplId }); }
    else showToast?.({ text: "Chưa lưu được, thử lại." });
  };
  const addTo = async (ex, dow) => {
    const p = w.active; if (!p) return;
    const s = p.days?.[String(dow)]; if (!s) return;
    const u = unitOf(ex);
    const days = { ...p.days, [String(dow)]: { ...s, items: [...s.items, { ex: ex.id, sets: 3, reps: u === "phút" ? 20 : u === "giây" ? 30 : 10 }] } };
    const r = await w.savePlan({ ...p, days });
    setSheet(null);
    showToast?.({ text: r.ok ? `Đã thêm vào ${s.title}` : "Chưa lưu được, thử lại." });
  };
  const saveCustom = async (c) => {
    const id = `u-${c.vi.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "bai"}-${Date.now() % 10000}`;
    const r = await w.addCustom({ id, ...c });
    setSheet(null);
    showToast?.({ text: r.ok ? `Đã thêm "${c.vi}" vào Thư viện` : "Chưa lưu được, thử lại." });
  };

  if (view?.k === "session") return <SessionScreen w={w} today={today} start={view} onBack={() => setView(null)} showToast={showToast} onReward={onReward} pet={pet} onLog={() => { setView(null); setTab("log"); }} onPickSwap={(muscle, cb) => { picker.current = cb; setView({ k: "pick", muscle, back: view }); }} />;
  if (view?.k === "pick") return (
    <SubPage title="Chọn bài" onBack={() => setView(view.back || null)}>
      <div style={{ padding: "12px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <LibraryTab w={w} pickMode pickMuscle={view.muscle} onAdd={(e) => { const cb = picker.current; picker.current = null; setView(view.back || null); cb?.(e); }} />
      </div>
    </SubPage>
  );
  if (view?.k === "day") return <DayEditor key={view.dow} w={w} dow={view.dow} onBack={() => setView(null)} showToast={showToast} syncDays={syncDays} onPick={(cb) => { picker.current = cb; setView({ k: "pick", back: view }); }} />;
  if (view?.k === "ex") return (
    <>
      <ExerciseDetail w={w} ex={view.ex} onBack={() => setView(null)} onAdd={(e) => setSheet({ k: "add", ex: e })} />
      {sheet?.k === "add" && <AddToDaySheet w={w} ex={sheet.ex} onClose={() => setSheet(null)} onDone={(d) => addTo(sheet.ex, d)} />}
    </>
  );
  if (view?.k === "log") return <LogDetail w={w} s={view.s} onBack={() => setView(null)} />;

  const used = w.active ? planDays(w.active) : [];
  return (
    <SubPage title="Tập luyện" subtitle={w.active ? `Lịch ${used.length} buổi/tuần · ${used.map((d) => DOW[d]).join(" ")}` : "Giáo án · Thư viện bài tập · Nhật ký"} onBack={onBack}>
      <div data-testid="wk-app" style={{ padding: "12px 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div role="tablist" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", margin: "0 12px", background: "rgba(15,23,42,0.06)", borderRadius: 12, padding: 3, gap: 3 }}>
          {[["plan", "Giáo án"], ["lib", "Thư viện"], ["log", "Nhật ký"]].map(([k, t]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-testid={`wk-tab-${k}`} onClick={() => setTab(k)}
              style={{ height: 34, borderRadius: 9, border: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, background: tab === k ? "#FFFFFF" : "transparent", color: tab === k ? "#0F172A" : "#475569", boxShadow: tab === k ? "0 1px 3px rgba(15,23,42,0.12)" : "none" }}>{t}</button>
          ))}
        </div>
        {!w.ready && <span style={{ ...sub, margin: "0 16px" }}>Đang tải…</span>}
        {/* 01/11: thẻ Buổi tập hôm nay nằm ở đầu tab Giáo án (không để ở Hôm nay) */}
        {w.ready && tab === "plan" && <WorkoutCard inApp w={w} today={today} onStart={(dp) => setView({ k: "session", dayPlan: dp })} onResume={(s) => setView({ k: "session", id: s.id })} onOpen={(t) => setTab(t)} />}
        {w.ready && tab === "plan" && <PlanTab w={w} profile={profile} loss={loss} showToast={showToast} onTpl={choose} onDay={(d) => setView({ k: "day", dow: d })} />}
        {w.ready && tab === "lib" && <LibraryTab w={w} onOpen={(e) => setView({ k: "ex", ex: e })} onAdd={(e) => setSheet({ k: "add", ex: e })} onCustom={() => setSheet({ k: "custom" })} />}
        {w.ready && tab === "log" && <LogTab w={w} plan={w.active} today={today} onOpen={(s) => setView({ k: "log", s })} onResume={(s) => setView({ k: "session", id: s.id })} />}
      </div>
      {sheet?.k === "tpl" && (
        <Sheet title="Đổi giáo án mẫu" onClose={() => setSheet(null)} testid="wk-tpl-sheet">
          <span style={sub}>Giáo án mẫu mới xếp vào đúng các ngày tập hiện tại. Giáo án cũ vẫn giữ ở mục "Giáo án khác".</span>
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" data-testid={`wk-tplx-${t.id}`} onClick={() => choose(t.id)} style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 56, padding: "8px 12px", borderRadius: 14, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
              <b style={{ fontSize: 14.5, fontWeight: 900 }}>{t.name}</b><span style={{ fontSize: 12, color: "#64748B" }}>{t.hint}</span>
            </button>
          ))}
        </Sheet>
      )}
      {sheet?.k === "add" && <AddToDaySheet w={w} ex={sheet.ex} onClose={() => setSheet(null)} onDone={(d) => addTo(sheet.ex, d)} />}
      {sheet?.k === "custom" && <CustomSheet onClose={() => setSheet(null)} onSave={saveCustom} />}
    </SubPage>
  );
}
