import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { C } from "./theme";

// Phát 1 tiếng "ding" ngắn bằng Web Audio — không cần file âm thanh
function playDing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.09);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

// Chuông thông báo GỘP — thay thế NotiBell + PushBell cũ (2 chuông tách rời):
// - Mục "Hoạt động của bạn": push thời gian thực (đơn hàng duyệt...), lưu DB, đồng bộ Realtime
// - Mục "Cập nhật ứng dụng": thông báo phiên bản mới (giữ nguyên hành vi cũ — bấm để xoá cache & reload)
const ACK_KEY = "fipilot_seen_update_ids";

export function NotificationBell({ appSettings, userId, dark }) {
  const [pushItems, setPushItems] = useState([]);
  const [show, setShow] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [updateStage, setUpdateStage] = useState(null); // null | "confirm" | "running" | "done"
  const [updateProgress, setUpdateProgress] = useState(0);
  const [seenUpdateIds, setSeenUpdateIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ACK_KEY) || "[]"); } catch (e) { return []; }
  });
  const ref = useRef(null);
  const ringTimeoutRef = useRef(null);

  const [userCreatedAt, setUserCreatedAt] = useState(null);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("created_at").eq("id", userId).single();
      if (data?.created_at) setUserCreatedAt(new Date(data.created_at));
    })();
  }, [userId]);

  const updateList = (() => {
    try {
      const all = appSettings?.notifications ? JSON.parse(appSettings.notifications) : [];
      if (!userCreatedAt) return all;
      return all.filter(n => {
        if (!n.date) return true;
        const parts = n.date.split("/");
        if (parts.length < 3) return true;
        const notiDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
        return notiDate >= new Date(userCreatedAt.getFullYear(), userCreatedAt.getMonth(), userCreatedAt.getDate());
      });
    } catch (e) { return []; }
  })();


  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,url,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) { console.error("[NotificationBell] load notifications error:", error); return; }
      if (data) setPushItems(data);
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // Realtime với retry: CHANNEL_ERROR/TIMED_OUT hay xảy ra khi tab sleep hoặc
    // token refresh — trước đây channel chết vĩnh viễn tới khi reload trang.
    // Giờ: backoff 2s→4s→8s→16s→30s (tối đa 5 lần), và khi tab visible lại
    // nếu channel đang chết thì thử subscribe lại ngay.
    let channel = null;
    let retryCount = 0;
    let retryTimer = null;
    let disposed = false;
    let dead = false;

    const subscribe = () => {
      if (disposed) return;
      if (channel) { try { supabase.removeChannel(channel); } catch (e) {} }
      dead = false;
      channel = supabase
        .channel(`notifications-${userId}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            setPushItems((prev) => [payload.new, ...prev].slice(0, 20));
            setRinging(true);
            playDing();
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = setTimeout(() => setRinging(false), 2000);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") { retryCount = 0; dead = false; return; }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            dead = true;
            if (disposed || retryCount >= 5) return;
            const delay = Math.min(2000 * 2 ** retryCount, 30000);
            retryCount++;
            console.warn(`[NotificationBell] realtime ${status} — retry ${retryCount}/5 sau ${delay / 1000}s`);
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(subscribe, delay);
          }
        });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && dead && !disposed) {
        retryCount = 0;
        subscribe();
      }
    };

    subscribe();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) { try { supabase.removeChannel(channel); } catch (e) {} }
    };
  }, [userId]);

  useEffect(() => {
    if (!show) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [show]);

  const pushUnreadCount = pushItems.filter((n) => !n.is_read).length;
  const updateUnseenCount = updateList.filter((n) => n.isNew && !seenUpdateIds.includes(n.id)).length;
  const totalBadge = pushUnreadCount + updateUnseenCount;

  const openList = async () => {
    setShow((s) => !s);
    const unreadIds = pushItems.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      setPushItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      try { await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds); } catch (e) { console.error("[NotificationBell] mark read error:", e); }
    }
    const newUpdateIds = updateList.filter((n) => n.isNew).map((n) => n.id);
    if (newUpdateIds.length > 0) {
      const merged = Array.from(new Set([...seenUpdateIds, ...newUpdateIds]));
      setSeenUpdateIds(merged);
      try { localStorage.setItem(ACK_KEY, JSON.stringify(merged)); } catch (e) {}
    }
  };

  const openUpdateConfirm = (n) => {
    setSelectedUpdate(n);
    setUpdateStage("confirm");
    setShow(false);
  };

  const startUpdate = () => {
    setUpdateStage("running");
    setUpdateProgress(0);
    // Progress bar chạy chậm 3-5 giây cho cảm giác "nâng cấp" thật
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 6 + 2; // tăng chậm ~2-8% mỗi 120ms → ~3-5s tới 90%
      if (p >= 90) p = 90;
      setUpdateProgress(p);
    }, 120);
    // Xóa cache + SW thật — chạy song song với progress bar
    const cleanupDone = caches.keys()
      .then((names) => Promise.all(names.map((k) => caches.delete(k))))
      .then(() => {
        if (navigator.serviceWorker) {
          return navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister())));
        }
      })
      .catch((e) => console.error("[NotificationBell] update error:", e));
    // Đảm bảo progress chạy tối thiểu 3s trước khi done
    const minWait = new Promise((r) => setTimeout(r, 3000));
    Promise.all([cleanupDone, minWait]).then(() => {
      clearInterval(tick);
      setUpdateProgress(100);
      setUpdateStage("done");
    });
  };

  const fmtTime = (ts) => {
    try { return new Date(ts).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }); } catch (e) { return ""; }
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <style>{`@keyframes notifBellRing{0%,100%{transform:rotate(0)}20%{transform:rotate(18deg)}40%{transform:rotate(-16deg)}60%{transform:rotate(10deg)}80%{transform:rotate(-6deg)}}@keyframes notifBellGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}30%,70%{box-shadow:0 0 0 6px rgba(239,68,68,0.25)}}`}</style>
      <div
        onClick={openList}
        style={{
          width: dark ? 40 : 40, height: dark ? 40 : 40, borderRadius: "50%",
          background: dark ? "rgba(255,255,255,0.32)" : C.card,
          border: dark ? "1.5px solid rgba(255,255,255,0.65)" : `1.5px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: dark ? 16 : 18, cursor: "pointer",
          boxShadow: dark ? "0 2px 6px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
          animation: ringing ? "notifBellRing 0.6s ease-in-out 0s 2, notifBellGlow 2s ease-in-out" : "none",
        }}
      >
        {dark ? (
          <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        ) : "🔔"}
      </div>
      {totalBadge > 0 && (
        <div style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: "#EF4444", border: dark ? "2px solid #111" : "2px solid #fff", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
          {totalBadge > 9 ? "9+" : totalBadge}
        </div>
      )}
      {show && (
        <div style={{ position: "absolute", top: dark ? 44 : 48, right: 0, width: "min(320px, calc(100vw - 28px))", background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50, overflow: "hidden" }}>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1.5px solid ${C.border}`, fontSize: 13, fontWeight: 700, color: C.t1 }}>🔔 Hoạt động của bạn</div>
            {pushItems.map((n) => (
              <div key={n.id} onClick={() => setSelectedNotif(n)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `0.5px solid ${C.border}`, background: !n.is_read ? "rgba(220,38,38,0.04)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />}
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, lineHeight: 1.4 }}>{n.title}</div>
                </div>
                {n.body && <div style={{ fontSize: 11, color: C.t2, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{fmtTime(n.created_at)}</div>
              </div>
            ))}
            {pushItems.length === 0 && <div style={{ padding: "14px", textAlign: "center", fontSize: 12, color: C.t3 }}>Chưa có hoạt động nào</div>}

            <div style={{ padding: "10px 14px", borderBottom: `1.5px solid ${C.border}`, borderTop: `4px solid ${C.bg}`, fontSize: 13, fontWeight: 700, color: C.t1 }}>🆕 Cập nhật ứng dụng</div>
            {updateList.map((n) => {
              const isUnseen = n.isNew && !seenUpdateIds.includes(n.id);
              return (
              <div key={n.id} onClick={() => openUpdateConfirm(n)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `0.5px solid ${C.border}`, background: isUnseen ? "rgba(220,38,38,0.04)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {isUnseen && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", flexShrink: 0 }} />}
                  <div style={{ fontSize: 12, fontWeight: isUnseen ? 700 : 600, color: C.t1, lineHeight: 1.4 }}>{n.text}</div>
                </div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{n.date} • Nhấn để xem</div>
              </div>
              );
            })}
            {updateList.length === 0 && <div style={{ padding: "14px", textAlign: "center", fontSize: 12, color: C.t3 }}>Không có bản cập nhật mới</div>}
          </div>
        </div>
      )}
      {selectedNotif && (
        <div onClick={() => setSelectedNotif(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, maxWidth: 420, width: "100%", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1.5px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>🔔 Thông báo</div>
              <span onClick={() => setSelectedNotif(null)} style={{ cursor: "pointer", fontSize: 18, color: C.t3 }}>✕</span>
            </div>
            <div style={{ padding: "18px 20px", overflowY: "auto" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, lineHeight: 1.4, marginBottom: 8 }}>{selectedNotif.title}</div>
              {selectedNotif.body && <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selectedNotif.body}</div>}
              <div style={{ fontSize: 11, color: C.t3, marginTop: 12 }}>{fmtTime(selectedNotif.created_at)}</div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1.5px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
              {/* Chỉ hiện nếu url là link thật có ý nghĩa — hiện tại NotifyTab
                  luôn gửi "/" (mặc định vô nghĩa), nên nút này thường ẩn.
                  Giữ lại phòng khi sau này admin thêm được url thật. */}
              {selectedNotif.url && selectedNotif.url !== "/" && (
                <button onClick={() => { window.location.href = selectedNotif.url; }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, border: `1.5px solid ${C.border}`, borderRadius: 8, background: "#fff", color: C.t1, cursor: "pointer", fontFamily: "inherit" }}>Xem chi tiết</button>
              )}
              <button onClick={() => setSelectedNotif(null)} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 8, background: C.primary, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
      {selectedUpdate && updateStage && (
        <div onClick={() => { if (updateStage === "confirm") { setSelectedUpdate(null); setUpdateStage(null); } }} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, maxWidth: 380, width: "100%", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1.5px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>🆕 Cập nhật ứng dụng</div>
              {updateStage === "confirm" && <span onClick={() => { setSelectedUpdate(null); setUpdateStage(null); }} style={{ cursor: "pointer", fontSize: 18, color: C.t3 }}>✕</span>}
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, lineHeight: 1.4, marginBottom: 6 }}>{selectedUpdate.text}</div>
              <div style={{ fontSize: 11, color: C.t3, marginBottom: 16 }}>{selectedUpdate.date}</div>

              {updateStage === "confirm" && (
                <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>Phiên bản mới đã sẵn sàng. Nhấn nâng cấp để cập nhật ứng dụng.</div>
              )}

              {updateStage === "running" && (
                <div>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>⚙️</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>Đang nâng cấp...</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>Vui lòng không đóng ứng dụng</div>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: C.surface, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(updateProgress, 100)}%`, background: "linear-gradient(90deg, #36A3FF, #007AFF)", borderRadius: 5, transition: "width 0.15s ease" }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.primary, marginTop: 8, textAlign: "center", fontWeight: 700 }}>
                    {Math.round(Math.min(updateProgress, 100))}%
                  </div>
                </div>
              )}

              {updateStage === "done" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#16A34A", marginBottom: 4 }}>Nâng cấp thành công!</div>
                  <div style={{ fontSize: 13, color: C.t1, fontWeight: 600 }}>Phiên bản {selectedUpdate.version || selectedUpdate.text}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 6, lineHeight: 1.5 }}>Ứng dụng đã được cập nhật. Nhấn nút bên dưới để tải lại.</div>
                </div>
              )}
            </div>
            {updateStage === "confirm" && (
              <div style={{ padding: "12px 20px", borderTop: `1.5px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setSelectedUpdate(null); setUpdateStage(null); }} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, border: `1.5px solid ${C.border}`, borderRadius: 8, background: "#fff", color: C.t1, cursor: "pointer", fontFamily: "inherit" }}>Để sau</button>
                <button onClick={startUpdate} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 8, background: "linear-gradient(135deg, #36A3FF, #007AFF)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>🚀 Nâng cấp ngay</button>
              </div>
            )}
            {updateStage === "done" && (
              <div style={{ padding: "12px 20px", borderTop: `1.5px solid ${C.border}` }}>
                <button onClick={() => { window.location.reload(true); }} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 800, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #16A34A, #15803D)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>🔄 Tải lại ứng dụng</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
