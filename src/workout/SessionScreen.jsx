// 01/11 (bản vẽ "Tập luyện" khung 6 + bản trước khung 2–3): ghi buổi tập — điền sẵn theo lần trước, tick từng hiệp, nghỉ giữa hiệp, tập xong → tổng kết + Pi thưởng Hạt.
// Thẻ bài: lề 12, bo 20, pad 12 14; hàng hiệp cao 46 (số hiệp 30 · kg · số lần · nút tick 36); dải nghỉ đen cao 64 bo 20; nút Xong buổi tập cao 50 cố định đáy.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SubPage, GRAD_BLUE, FONT, useLockScroll, SheetHandle } from "../mobile/ui";
import { ltCard } from "../theme";
import { sfx } from "../lib/sfx";
import { track } from "../lib/track";
import { newSession, sessionOfDate, lastSets, setsDone, setsTotal, volume, minutesOf, newRecords } from "./plan.js";
import { exOf, unitOf, hasKg, fmtKg } from "./exLib.jsx";
import { PetAvatar } from "../pet/PetAvatar";

const REST = 90;
const num = (v) => { const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : 0; };
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function SessionScreen({ w, today, start, onBack, showToast, onReward, onLog, onPickSwap, pet }) {
  const [s, setS] = useState(() => {
    const old = start?.id ? w.sessions.find((x) => x.id === start.id) : null;
    if (old) return JSON.parse(JSON.stringify(old));
    const dp = start?.dayPlan || sessionOfDate(w.active, today);
    return { ...newSession(dp, w.sessions, today), plan_id: w.active?.id || null, started_at: new Date().toISOString() };
  });
  const [rest, setRest] = useState(0);
  const [done, setDone] = useState(null); // tổng kết sau khi xong
  const [ask, setAsk] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timer = useRef(null);
  const saveT = useRef(null);
  const sRef = useRef(s);
  useEffect(() => { sRef.current = s; }, [s]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // lưu ngay khi mở (để "Tiếp tục buổi đang tập dở" được), sau đó lưu chậm 0,7 giây sau mỗi thay đổi
  const persist = async (x = sRef.current) => {
    const r = await w.saveSession({ ...x, sets_done: setsDone(x), volume: volume(x), minutes: minutesOf(x) });
    if (r.ok && !x.id) setS((y) => ({ ...y, id: r.id }));
    return r;
  };
  useEffect(() => { if (!s.id) persist(s); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (f) => setS((x) => { const y = f(JSON.parse(JSON.stringify(x))); clearTimeout(saveT.current); saveT.current = setTimeout(() => persist(y), 700); return y; });
  // nghỉ giữa hiệp
  useEffect(() => {
    if (rest <= 0) return undefined;
    timer.current = setTimeout(() => { if (rest === 1) sfx("ting"); setRest((r) => r - 1); }, 1000);
    return () => clearTimeout(timer.current);
  }, [rest]);

  const tick = (i, j) => change((x) => {
    const st = x.items[i].sets[j];
    st.done = !st.done;
    if (st.done) { sfx("pop"); const u = unitOf(exOf(x.items[i].ex, w.custom)); if (u === "lần") setRest(REST); }
    return x;
  });
  const finish = async () => {
    const n = setsDone(s);
    if (!n) { setAsk(true); return; }
    const end = { ...s, ended_at: new Date().toISOString() };
    const rec = newRecords(end, w.sessions).map((r) => ({ ...r, name: exOf(r.ex, w.custom).vi }));
    const r = await persist(end);
    if (!r.ok) { showToast?.({ text: "Chưa lưu được, kiểm tra mạng rồi thử lại." }); return; }
    setS(end); setRest(0); sfx("levelup");
    track("workout_done", { sets: n, min: minutesOf(end) });
    setDone({ id: end.id || r.id, sets: n, vol: volume(end), min: minutesOf(end), rec });
  };
  const drop = async () => { if (s.id) await w.deleteSession(s.id); onBack(); };

  const nDone = setsDone(s), nAll = setsTotal(s);
  const mins = minutesOf(s, now);
  return (
    <SubPage title={s.title} subtitle={`Đã tập ${mins} phút · ${nDone}/${nAll} hiệp`} onBack={() => { clearTimeout(saveT.current); persist(); onBack(); }}
      right={<span data-testid="wk-ses-clock" style={{ fontSize: 15, fontWeight: 900, color: "#0062F0", background: "#EEF4FF", height: 32, padding: "0 10px", borderRadius: 10, display: "flex", alignItems: "center", marginRight: 8, fontVariantNumeric: "tabular-nums" }}>{mmss(Math.max(0, Math.round((now - Date.parse(s.started_at)) / 1000)))}</span>}
      footer={!done && (
        <div style={{ position: "relative", padding: "8px 12px calc(env(safe-area-inset-bottom, 0px) + 10px)", background: "rgba(255,255,255,0.92)", borderTop: "1px solid #EEF2FA" }}>
          {rest > 0 && (
            <div data-testid="wk-rest" style={{ position: "absolute", left: 12, right: 12, bottom: "calc(100% + 8px)", height: 64, borderRadius: 20, background: "#0F172A", color: "#FFFFFF", display: "flex", alignItems: "center", gap: 12, padding: "0 14px", boxShadow: "0 10px 30px rgba(15,23,42,0.35)" }}>
              <b style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{mmss(rest)}</b>
              <span style={{ flex: 1, fontSize: 12.5, opacity: 0.8 }}>Nghỉ giữa hiệp</span>
              <button type="button" onClick={() => setRest((r) => r + 30)} style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>+30 s</button>
              <button type="button" data-testid="wk-rest-skip" onClick={() => setRest(0)} style={{ height: 34, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>Bỏ qua</button>
            </div>
          )}
          <button type="button" data-testid="wk-ses-finish" onClick={finish} style={{ width: "100%", height: 50, borderRadius: 16, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 16, fontWeight: 900, fontFamily: "inherit" }}>Xong buổi tập</button>
        </div>
      )}>
      <div data-testid="wk-session" style={{ padding: "12px 0 96px", display: "flex", flexDirection: "column", gap: 12 }}>
        {!s.items.length && <span style={{ fontSize: 13, color: "#64748B", margin: "0 16px" }}>Buổi này chưa có bài. Vào Tập luyện › Giáo án để thêm bài.</span>}
        {s.items.map((it, i) => {
          const e = exOf(it.ex, w.custom), u = unitOf(e), kg = hasKg(e);
          const prev = lastSets(w.sessions.filter((x) => x.id !== s.id), it.ex);
          return (
            <div key={`${it.ex}-${i}`} data-testid="wk-ses-ex" style={{ ...ltCard, margin: "0 12px", padding: "12px 14px 8px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: 15.5, fontWeight: 900 }}>{e.vi}</b>
                  {e.en && <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748B", fontStyle: "italic" }}>({e.en})</span>}
                </span>
                <button type="button" data-testid="wk-ses-swap" onClick={() => onPickSwap?.(e.muscle, (n) => change((x) => { x.items[i].ex = n.id; return x; }))} style={{ border: "none", background: "none", color: "#0062F0", fontSize: 12.5, fontWeight: 800, fontFamily: "inherit", padding: "2px 0" }}>Đổi bài</button>
              </div>
              <span style={{ display: "block", fontSize: 11.5, color: "#64748B", fontWeight: 600, margin: "4px 0 2px 38px" }}>{prev ? `Lần trước: ${prev.length} × ${prev[0].reps} ${u}${prev[0].kg > 0 ? ` × ${fmtKg(prev[0].kg)} kg` : ""}` : "Lần đầu tập bài này"}</span>
              {it.sets.map((st, j) => (
                <div key={j} data-testid="wk-set" data-done={st.done ? "1" : "0"} style={{ display: "grid", gridTemplateColumns: kg ? "30px 1fr 1fr 38px" : "30px 1fr 38px", gap: 8, alignItems: "center", height: 46, borderTop: "1px solid #EEF2FA" }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#64748B", textAlign: "center" }}>{j + 1}</span>
                  {kg && <label style={boxSt(st.done)}><input data-testid="wk-set-kg" inputMode="decimal" value={st.kg === 0 ? "" : String(st.kg).replace(".", ",")} placeholder="0" onChange={(ev) => change((x) => { x.items[i].sets[j].kg = num(ev.target.value); return x; })} style={inSt} /><em style={emSt}>kg</em></label>}
                  <label style={boxSt(st.done)}><input data-testid="wk-set-reps" inputMode="numeric" value={st.reps === 0 ? "" : String(st.reps)} placeholder="0" onChange={(ev) => change((x) => { x.items[i].sets[j].reps = Math.round(num(ev.target.value)); return x; })} style={inSt} /><em style={emSt}>{u}</em></label>
                  <button type="button" data-testid="wk-set-tick" aria-label={`Xong hiệp ${j + 1}`} aria-pressed={!!st.done} onClick={() => tick(i, j)} style={{ width: 36, height: 36, borderRadius: 18, border: st.done ? "none" : "2px solid #CBD5E1", background: st.done ? "#10B981" : "#FFFFFF", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    {st.done && <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                </div>
              ))}
              <button type="button" data-testid="wk-set-add" onClick={() => change((x) => { const l = x.items[i].sets[x.items[i].sets.length - 1] || { kg: 0, reps: 10 }; x.items[i].sets.push({ kg: l.kg, reps: l.reps, done: false }); return x; })} style={{ border: "none", background: "none", color: "#0062F0", fontSize: 13, fontWeight: 800, fontFamily: "inherit", padding: "8px 0 2px 38px" }}>+ Thêm hiệp</button>
            </div>
          );
        })}
      </div>
      {ask && <ConfirmDrop onCancel={() => setAsk(false)} onDrop={drop} />}
      {done && <DoneSheet d={done} pet={pet} onReward={onReward} onClose={onBack} onLog={onLog} showToast={showToast} />}
    </SubPage>
  );
}
const boxSt = (on) => ({ height: 36, borderRadius: 10, background: on ? "#ECFDF5" : "#F8FAFC", border: `1.5px solid ${on ? "#A7F3D0" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", boxSizing: "border-box", minWidth: 0 });
const inSt = { width: "100%", minWidth: 0, border: "none", background: "transparent", outline: "none", textAlign: "right", fontSize: 15, fontWeight: 800, fontFamily: "inherit", color: "#0F172A", padding: 0 };
const emSt = { fontStyle: "normal", fontSize: 11, color: "#64748B", fontWeight: 700, marginLeft: 4, flexShrink: 0 };

function ConfirmDrop({ onCancel, onDrop }) {
  useLockScroll(true);
  return createPortal(
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 20, padding: 18, width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <b style={{ fontSize: 16, fontWeight: 900 }}>Chưa tick hiệp nào</b>
        <span style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.45 }}>Tick từng hiệp sau khi tập xong để app lưu nhật ký. Bỏ buổi này?</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" onClick={onCancel} style={{ height: 44, borderRadius: 12, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 14.5, fontWeight: 800, fontFamily: "inherit" }}>Tập tiếp</button>
          <button type="button" data-testid="wk-ses-drop" onClick={onDrop} style={{ height: 44, borderRadius: 12, border: "none", background: "#DC2626", color: "#FFFFFF", fontSize: 14.5, fontWeight: 800, fontFamily: "inherit" }}>Bỏ buổi</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DoneSheet({ d, pet, onReward, onClose, onLog, showToast }) {
  useLockScroll(true);
  const [got, setGot] = useState(null); // số Hạt đã nhận
  const [busy, setBusy] = useState(false);
  const can = d.sets >= 10;
  const claim = async () => {
    if (busy || got != null) return;
    setBusy(true);
    const r = await onReward?.(d.id);
    setBusy(false);
    if (r?.ok) { setGot(r.added); sfx("coin"); }
    else showToast?.({ text: r?.why === "today" ? "Hôm nay Pi đã thưởng buổi tập rồi, mai tập tiếp nha" : r?.why === "cap" ? "Hôm nay bạn đã đủ Hạt tối đa" : "Chưa nhận được Hạt, thử lại sau." });
  };
  const stat = (v, l) => <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}><b style={{ fontSize: 17, fontWeight: 900 }}>{v}</b><span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>{l}</span></div>;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A" }}>
      <div data-testid="wk-done" role="dialog" aria-modal="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 22px)", display: "flex", flexDirection: "column", gap: 12, animation: "fpmSheetUp .2s ease" }}>
        <SheetHandle />
        {pet && <span style={{ alignSelf: "center", height: 110, display: "flex", alignItems: "flex-end" }}><PetAvatar variant={pet.variant} color={pet.color} equipped={pet.equipped} size={120} still face="cuoilon" /></span>}
        <b style={{ alignSelf: "center", fontSize: 21, fontWeight: 900, textAlign: "center" }}>Xong buổi tập!</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>{stat(`${d.min}'`, "thời gian")}{stat(d.sets, "hiệp")}{stat(Number(d.vol || 0).toLocaleString("vi-VN"), "kg đã nâng")}</div>
        {d.rec.map((r) => (
          <div key={r.ex} data-testid="wk-done-pr" style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF3C7", borderRadius: 14, padding: "10px 12px", fontSize: 13, fontWeight: 800, color: "#92400E" }}>🏆 Kỷ lục mới: {r.name || r.ex} {fmtKg(r.kg)} kg (+{fmtKg(r.kg - r.was)} kg)</div>
        ))}
        {can
          ? <button type="button" data-testid="wk-done-claim" onClick={claim} disabled={busy || got != null} style={{ height: 46, borderRadius: 14, border: "none", background: got != null ? "#ECFDF5" : GRAD_BLUE, color: got != null ? "#047857" : "#FFFFFF", fontSize: 15, fontWeight: 800, fontFamily: "inherit" }}>{got != null ? `Đã nhận +${got} Hạt` : busy ? "Đang nhận…" : "Nhận +20 Hạt cho Pi"}</button>
          : <span style={{ fontSize: 12.5, color: "#64748B", textAlign: "center" }}>Tick từ 10 hiệp trở lên trong 1 buổi là Pi thưởng 20 Hạt.</span>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" data-testid="wk-done-log" onClick={onLog} style={{ height: 44, borderRadius: 14, border: "none", background: "#EEF4FF", color: "#0062F0", fontSize: 14.5, fontWeight: 800, fontFamily: "inherit" }}>Xem nhật ký</button>
          <button type="button" data-testid="wk-done-close" onClick={onClose} style={{ height: 44, borderRadius: 14, border: "none", background: "#F1F5F9", color: "#475569", fontSize: 14.5, fontWeight: 800, fontFamily: "inherit" }}>Xong</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
