// Cập nhật app (bản vẽ 42–44, chốt 14/10): hỏi → đang chạy (vòng % + 3 bước) → xong (tick + tự mở lại).
// - UpdatePopup: tự hiện khi admin tăng app_version (giữ logic cũ: so localStorage "fipilot_version").
// - UpdateFlow: dùng chung cho nút "Cập nhật ứng dụng" ở Tài khoản.
// Việc thật: xoá cache + gỡ service worker; vòng % chạy mượt tới 90% trong ~3 s, xong thật mới 100%.
import { useState, useEffect, useRef } from "react";

const BG = "linear-gradient(165deg,#2C8DFF 0%,#0A6CFD 18%,#0055F0 45%,#0040E0 75%,#0034D6 100%)";
const CSS = `
@keyframes fpUpSpin{to{transform:rotate(360deg)}}
@keyframes fpUpPop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes fpUpIn{from{transform:translateY(16px) scale(.97);opacity:0}to{transform:none;opacity:1}}
@keyframes fpUpConf{0%{transform:translateY(-10px) rotate(0);opacity:0}20%{opacity:1}100%{transform:translateY(70px) rotate(220deg);opacity:0}}
@media (prefers-reduced-motion: reduce){.fp-up-anim{animation:none!important}}
`;
const check = (s = 14, sw = 3) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export function notesOf(raw) {
  const list = String(raw || "").split(/\n+/).map((s) => s.replace(/^[-•*\s]+/, "").trim()).filter(Boolean).slice(0, 5);
  return list.length ? list : ["Sửa lỗi, chạy nhanh hơn"];
}

async function clearAppCache() {
  try {
    const names = await caches.keys();
    await Promise.all(names.map((k) => caches.delete(k)));
    if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map((r) => r.unregister())); }
  } catch (e) { console.error("[update] error:", e); }
}

function Hero({ children }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", background: BG, padding: "28px 20px 22px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#FFFFFF", textAlign: "center" }}>
      <span aria-hidden="true" style={{ position: "absolute", width: 260, height: 260, right: -100, top: -120, borderRadius: 130, background: "radial-gradient(circle, rgba(90,190,255,0.55), rgba(90,190,255,0) 68%)" }} />
      <span aria-hidden="true" style={{ position: "absolute", width: 220, height: 220, left: -90, bottom: -120, borderRadius: 110, background: "radial-gradient(circle, rgba(0,30,170,0.45), rgba(0,30,170,0) 70%)" }} />
      {children}
    </div>
  );
}

export function UpdateFlow({ fromVersion, toVersion, notes, onLater, manual }) {
  const [stage, setStage] = useState("confirm"); // confirm → running → done
  const [pct, setPct] = useState(0);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach((t) => clearInterval(t) || clearTimeout(t)), []);
  const items = notesOf(notes);

  const run = () => {
    setStage("running"); setPct(0);
    const t0 = Date.now();
    const tick = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 3000);
      setPct((p) => Math.max(p, Math.round(90 * (1 - Math.pow(1 - k, 2)))));
    }, 60);
    timers.current.push(tick);
    Promise.all([clearAppCache(), new Promise((r) => setTimeout(r, 3000))]).then(() => {
      clearInterval(tick);
      setPct(100);
      try { if (toVersion) localStorage.setItem("fipilot_version", toVersion); } catch (e) { /* */ }
      timers.current.push(setTimeout(() => setStage("done"), 350));
      timers.current.push(setTimeout(() => window.location.reload(), 3600));
    });
  };

  const r = 58, C = 2 * Math.PI * r;
  const steps = [["Tải bản mới", 30], ["Dọn bộ nhớ tạm", 75], ["Cài đặt & mở lại", 100]];
  return (
    <div className="fpm" data-testid="update-flow" style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(4,14,40,0.62)", WebkitBackdropFilter: "blur(6px)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif", color: "#0F172A" }}>
      <style>{CSS}</style>
      <div role="dialog" aria-modal="true" aria-label="Cập nhật ứng dụng" className="fp-up-anim" style={{ width: "100%", maxWidth: 350, borderRadius: 26, overflow: "hidden", background: "#FFFFFF", boxShadow: "0 30px 80px rgba(0,10,40,0.5)", animation: "fpUpIn .25s ease" }}>
        {stage === "confirm" && <>
          <Hero>
            <span style={{ position: "relative", width: 76, height: 76, borderRadius: 22, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(0,20,90,0.35), 0 0 0 8px rgba(255,255,255,0.12)" }}>
              <img src="/icon-192.png" alt="" style={{ width: 60, height: 60, borderRadius: 16 }} />
              <span style={{ position: "absolute", right: -8, top: -8, width: 28, height: 28, borderRadius: 14, background: "linear-gradient(135deg,#FF5A6E,#E11D48)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(225,29,72,0.45)" }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </span>
            </span>
            <span style={{ position: "relative", fontSize: 20, fontWeight: 900 }}>{manual ? "Cập nhật Fipilot AI" : "Có bản Fipilot AI mới"}</span>
            {toVersion && (
              <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800 }}>
                {fromVersion && fromVersion !== toVersion && <><span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.18)" }}>{fromVersion}</span>→</>}
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#FFFFFF", color: "#0A5BFF" }}>{toVersion}</span>
              </span>
            )}
          </Hero>
          <div style={{ padding: "18px 20px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>{manual ? "TẢI LẠI BẢN MỚI NHẤT" : "CÓ GÌ MỚI"}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(manual ? ["Xoá bộ nhớ tạm của app", "Tải lại bản mới nhất"] : items).map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 12, background: ["rgba(0,122,255,0.1)", "rgba(0,200,150,0.12)", "rgba(124,58,237,0.1)"][i % 3], color: ["#0A5BFF", "#00A67E", "#7C3AED"][i % 3], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{check()}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Mất khoảng 5 giây. Dữ liệu của bạn được giữ nguyên.</span>
            <button data-testid="update-go" onClick={run} style={{ height: 54, borderRadius: 16, border: "none", background: BG, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: "0 8px 20px rgba(0,60,230,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>Cập nhật ngay
            </button>
            <button data-testid="update-later" onClick={onLater} style={{ height: 40, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#64748B", cursor: "pointer" }}>{manual ? "Huỷ" : "Để sau"}</button>
          </div>
        </>}

        {stage === "running" && <>
          <Hero>
            <div style={{ position: "relative", width: 150, height: 150 }}>
              <svg aria-hidden="true" width="150" height="150" viewBox="0 0 150 150">
                <defs><linearGradient id="fpup" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3FD0FF" /><stop offset="1" stopColor="#BFF4FF" /></linearGradient></defs>
                <circle cx="75" cy="75" r="50" fill="rgba(0,25,110,0.35)" />
                <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
                <circle cx="75" cy="75" r={r} fill="none" stroke="url(#fpup)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 75 75)" style={{ filter: "drop-shadow(0 0 8px rgba(80,210,255,0.9))", transition: "stroke-dasharray .15s linear" }} />
              </svg>
              <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span data-testid="update-pct" style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>{pct}%</span>
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.85 }}>đang cập nhật</span>
              </span>
            </div>
            <span style={{ position: "relative", fontSize: 18, fontWeight: 900 }}>{toVersion ? `Đang lên bản ${toVersion}…` : "Đang cập nhật…"}</span>
            <span style={{ position: "relative", fontSize: 12, opacity: 0.85 }}>Đừng đóng app nhé</span>
          </Hero>
          <div style={{ padding: "14px 20px 18px 20px", display: "flex", flexDirection: "column" }}>
            {steps.map(([t, at], i) => {
              const prev = i ? steps[i - 1][1] : 0;
              const st = pct >= at ? "done" : pct >= prev ? "run" : "wait";
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
                  {st === "done" ? <span style={{ width: 26, height: 26, borderRadius: 13, background: "#00C896", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>{check()}</span>
                    : st === "run" ? <span className="fp-up-anim" style={{ width: 26, height: 26, borderRadius: 13, border: "3px solid rgba(10,91,255,0.2)", borderTopColor: "#0A5BFF", boxSizing: "border-box", animation: "fpUpSpin .8s linear infinite" }} />
                    : <span style={{ width: 26, height: 26, borderRadius: 13, border: "2px solid #E2E8F0", boxSizing: "border-box" }} />}
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: st === "wait" ? "#94A3B8" : "#0F172A" }}>{t}</span>
                  {st === "done" && <span style={{ fontSize: 12, fontWeight: 700, color: "#00A67E" }}>Xong</span>}
                  {st === "run" && <span style={{ fontSize: 12, fontWeight: 700, color: "#0A5BFF" }}>Đang làm</span>}
                </div>
              );
            })}
            <div style={{ height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden", marginTop: 8 }}>
              <div style={{ width: `${pct}%`, height: 6, borderRadius: 3, background: "linear-gradient(90deg,#3FD0FF,#0A5BFF)", transition: "width .15s linear" }} />
            </div>
          </div>
        </>}

        {stage === "done" && <>
          <Hero>
            {[["12%", "18%", 8, "#FFD166"], ["82%", "14%", 7, "#7FE3FF"], ["20%", "60%", 6, "#FF5A6E"], ["78%", "58%", 8, "#4CD98A"], ["6%", "40%", 5, "#FFFFFF"], ["90%", "38%", 6, "#FFD166"], ["30%", "8%", 5, "#B07BFF"], ["66%", "70%", 5, "#FFFFFF"]].map(([x, y, s, c], i) => (
              <span key={i} aria-hidden="true" className="fp-up-anim" style={{ position: "absolute", left: x, top: y, width: s, height: s, borderRadius: i % 2 ? 2 : s, background: c, animation: `fpUpConf 1.6s ease-out ${i * 0.08}s both` }} />
            ))}
            <span className="fp-up-anim" style={{ position: "relative", width: 96, height: 96, borderRadius: 48, background: "radial-gradient(circle at 32% 28%, #8BF5C4 0%, #00C896 45%, #009E74 100%)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 10px rgba(0,200,150,0.18), 0 0 0 22px rgba(0,200,150,0.08), 0 12px 30px rgba(0,80,60,0.4)", animation: "fpUpPop .45s ease-out" }}>{check(48, 3)}</span>
            <span data-testid="update-done" style={{ position: "relative", fontSize: 22, fontWeight: 900, marginTop: 8 }}>{toVersion ? `Đã lên bản ${toVersion} 🎉` : "Đã cập nhật xong 🎉"}</span>
            <span style={{ position: "relative", fontSize: 13, opacity: 0.9 }}>Mọi dữ liệu vẫn còn nguyên</span>
          </Hero>
          <div style={{ padding: "18px 20px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => window.location.reload()} style={{ height: 54, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#00C896,#009E74)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: "0 8px 20px rgba(0,158,116,0.35)", cursor: "pointer" }}>Mở lại app</button>
            <span style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>Tự mở lại sau 3 giây</span>
          </div>
        </>}
      </div>
    </div>
  );
}

export function UpdatePopup({ appSettings }) {
  const [show, setShow] = useState(false);
  const [from, setFrom] = useState(null);
  const serverVersion = appSettings.app_version;
  useEffect(() => {
    if (!serverVersion) return;
    let local = null;
    try { local = localStorage.getItem("fipilot_version"); } catch (e) { /* */ }
    if (local && local !== serverVersion) {
      let dismissed = null;
      try { dismissed = sessionStorage.getItem("fipilot_update_dismissed"); } catch (e) { /* */ }
      if (dismissed === serverVersion) return;
      setFrom(local); setShow(true);
    } else if (!local) {
      try { localStorage.setItem("fipilot_version", serverVersion); } catch (e) { /* */ }
    }
  }, [serverVersion]);
  if (!show) return null;
  return <UpdateFlow fromVersion={from} toVersion={serverVersion} notes={appSettings.update_notes}
    onLater={() => { try { sessionStorage.setItem("fipilot_update_dismissed", serverVersion); } catch (e) { /* */ } setShow(false); }} />;
}
