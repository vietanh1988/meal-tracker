import { useState, useEffect, useCallback } from "react";
import { C, card } from "../theme";
import { supabase } from "../lib/supabase";

// ============================================================
// FeedbackTab — Góp ý & Đánh giá tính năng
// User: gửi feedback + rating per feature
// Admin: xem tất cả feedback + reply + xem rating tổng hợp
// ============================================================

const CATEGORIES = [
  { id: "suggestion", label: "💡 Góp ý" },
  { id: "bug", label: "🐛 Báo lỗi" },
  { id: "ai_menu", label: "🍽️ AI Menu" },
  { id: "photo", label: "📸 Chụp ảnh" },
  { id: "ai_chat", label: "💬 AI Chat" },
  { id: "other", label: "📊 Khác" },
];

const FEATURES = [
  { id: "ai_menu", label: "AI tạo thực đơn", sub: "Thực đơn có phù hợp mục tiêu?", icon: "✨", bg: "rgba(124,58,237,0.1)" },
  { id: "photo", label: "Chụp ảnh kiểm tra", sub: "AI nhận diện có chính xác?", icon: "📸", bg: "rgba(249,115,22,0.1)" },
  { id: "ai_chat", label: "AI Coach tư vấn", sub: "Tư vấn có hữu ích?", icon: "💬", bg: "rgba(16,185,129,0.1)" },
  { id: "ui", label: "Giao diện & trải nghiệm", sub: "App dễ dùng, đẹp mắt?", icon: "📊", bg: "rgba(59,130,246,0.1)" },
];

export default function FeedbackTab({ user, isAdmin }) {
  const [tab, setTab] = useState("feedback"); // feedback | rating | admin
  const [category, setCategory] = useState("suggestion");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [myFeedback, setMyFeedback] = useState([]);
  const [myRatings, setMyRatings] = useState({});
  const [ratingComments, setRatingComments] = useState({});
  const [allFeedback, setAllFeedback] = useState([]);
  const [avgRatings, setAvgRatings] = useState({});
  const [totalRatings, setTotalRatings] = useState(0);
  const [replyText, setReplyText] = useState({});

  const userId = user?.id;
  const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "";

  // Load data
  const loadData = useCallback(async () => {
    if (!userId) return;

    // My feedback
    const { data: fb } = await supabase.from("user_feedback")
      .select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    setMyFeedback(fb || []);

    // My ratings
    const { data: rt } = await supabase.from("feature_ratings")
      .select("*").eq("user_id", userId);
    const map = {};
    (rt || []).forEach(r => { map[r.feature] = r; });
    setMyRatings(map);

    // Admin: all feedback + avg ratings
    if (isAdmin) {
      const { data: allFb } = await supabase.from("user_feedback")
        .select("*").order("created_at", { ascending: false }).limit(50);
      setAllFeedback(allFb || []);

      // Avg ratings per feature
      const { data: allRt } = await supabase.from("feature_ratings").select("*");
      if (allRt && allRt.length > 0) {
        const byFeature = {};
        allRt.forEach(r => {
          if (!byFeature[r.feature]) byFeature[r.feature] = [];
          byFeature[r.feature].push(r.rating);
        });
        const avgs = {};
        Object.entries(byFeature).forEach(([f, ratings]) => {
          avgs[f] = { avg: Math.round(ratings.reduce((s, v) => s + v, 0) / ratings.length * 10) / 10, count: ratings.length };
        });
        setAvgRatings(avgs);
        setTotalRatings(allRt.length);
      }
    }
  }, [userId, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // Submit feedback
  const handleSubmitFeedback = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      await supabase.from("user_feedback").insert({
        user_id: userId, username, category, content: content.trim(),
      });
      setContent("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      loadData();
    } catch (e) { console.error(e); }
    setSending(false);
  };

  // Submit/update rating
  const handleRate = async (feature, rating) => {
    const comment = ratingComments[feature] || myRatings[feature]?.comment || "";
    await supabase.from("feature_ratings").upsert({
      user_id: userId, username, feature, rating, comment,
    }, { onConflict: "user_id,feature" });
    loadData();
  };

  // Admin reply
  const handleReply = async (feedbackId) => {
    const text = replyText[feedbackId];
    if (!text?.trim()) return;
    await supabase.from("user_feedback").update({
      admin_reply: text.trim(), status: "replied", admin_replied_at: new Date().toISOString(),
    }).eq("id", feedbackId);
    setReplyText(prev => ({ ...prev, [feedbackId]: "" }));
    loadData();
  };

  // Styles
  const segTab = (active) => ({
    flex: 1, padding: "8px 4px", textAlign: "center", fontSize: 12, fontWeight: 700,
    color: active ? "#007AFF" : "#64748B", borderRadius: 8, cursor: "pointer",
    background: active ? "#fff" : "transparent",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
  });
  const chip = (active) => ({
    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
    border: `1.5px solid ${active ? "#007AFF" : C.border}`,
    color: active ? "#007AFF" : "#64748B",
    background: active ? "rgba(0,122,255,0.06)" : "#fff",
  });
  const starStyle = (filled) => ({
    width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, cursor: "pointer", border: `1.5px solid ${filled ? "#007AFF" : C.border}`,
    background: filled ? "rgba(0,122,255,0.06)" : "#fff",
  });

  const overallAvg = totalRatings > 0
    ? Math.round(Object.values(avgRatings).reduce((s, v) => s + v.avg, 0) / Object.values(avgRatings).length * 10) / 10
    : 0;

  const pendingCount = allFeedback.filter(f => f.status === "pending").length;

  return (
    <div>
      {/* Segment tabs */}
      <div style={{ display: "flex", margin: "0 0 14px", background: C.surface, borderRadius: 10, padding: 3 }}>
        <div style={segTab(tab === "feedback")} onClick={() => setTab("feedback")}>💬 Góp ý</div>
        <div style={segTab(tab === "rating")} onClick={() => setTab("rating")}>⭐ Đánh giá</div>
        {isAdmin && <div style={segTab(tab === "admin")} onClick={() => setTab("admin")}>👑 Admin</div>}
      </div>

      {/* ====== TAB: Góp ý ====== */}
      {tab === "feedback" && <>
        <div style={{ ...card }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Loại phản hồi</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {CATEGORIES.map(c => (
              <div key={c.id} style={chip(category === c.id)} onClick={() => setCategory(c.id)}>{c.label}</div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 6 }}>Nội dung</div>
          <textarea
            value={content} onChange={e => setContent(e.target.value.slice(0, 500))}
            placeholder="VD: Mình muốn app có thêm chế độ ăn chay..."
            style={{ width: "100%", minHeight: 90, padding: 10, border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }}
          />
          <div style={{ fontSize: 10, color: C.t3, textAlign: "right", marginTop: 2 }}>{content.length} / 500</div>

          {sent && <div style={{ padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, fontSize: 13, color: "#15803D", fontWeight: 600, marginTop: 8 }}>✅ Đã gửi phản hồi! Cảm ơn bạn.</div>}

          <button onClick={handleSubmitFeedback} disabled={!content.trim() || sending}
            style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", fontSize: 15, fontWeight: 800, color: "#fff", background: content.trim() ? "linear-gradient(135deg, #36A3FF, #007AFF)" : C.border, boxShadow: content.trim() ? "0 4px 12px rgba(0,122,255,0.25)" : "none", marginTop: 10, cursor: content.trim() ? "pointer" : "default", fontFamily: "inherit", opacity: sending ? 0.6 : 1 }}>
            {sending ? "Đang gửi..." : "Gửi phản hồi →"}
          </button>
        </div>

        {/* My previous feedback */}
        {myFeedback.length > 0 && <>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, margin: "16px 0 8px" }}>Phản hồi trước của bạn</div>
          {myFeedback.map(fb => (
            <div key={fb.id} style={{ padding: 12, background: C.surface, borderRadius: 10, marginBottom: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#007AFF", background: "rgba(0,122,255,0.06)", padding: "2px 8px", borderRadius: 6 }}>
                  {CATEGORIES.find(c => c.id === fb.category)?.label || fb.category}
                </span>
                <span style={{ fontSize: 10, color: C.t3 }}>{new Date(fb.created_at).toLocaleDateString("vi-VN")}</span>
              </div>
              <div style={{ fontSize: 12, color: "#334155", marginTop: 6, lineHeight: 1.5 }}>{fb.content}</div>
              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 6, color: fb.status === "replied" ? "#10B981" : "#F59E0B" }}>
                {fb.status === "replied" ? "✅ Đã phản hồi" : "⏳ Đang xử lý"}
              </div>
              {fb.admin_reply && (
                <div style={{ marginTop: 6, padding: "8px 10px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #10B981" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", marginBottom: 3 }}>👑 Admin</div>
                  <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>{fb.admin_reply}</div>
                </div>
              )}
            </div>
          ))}
        </>}
      </>}

      {/* ====== TAB: Đánh giá ====== */}
      {tab === "rating" && <>
        {/* Summary */}
        <div style={{ background: "linear-gradient(135deg, rgba(0,122,255,0.04), rgba(0,122,255,0.08))", borderRadius: 14, padding: 16, border: "1px solid rgba(0,122,255,0.12)", textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#007AFF", marginBottom: 6 }}>Điểm hài lòng tổng thể</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#007AFF" }}>{overallAvg || "—"}<span style={{ fontSize: 16, color: "#64748B" }}>/5</span></div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
            {"⭐".repeat(Math.round(overallAvg))}{"☆".repeat(5 - Math.round(overallAvg))} · {totalRatings} đánh giá
          </div>
        </div>

        {/* Per-feature rating */}
        {FEATURES.map(feat => {
          const myR = myRatings[feat.id]?.rating || 0;
          return (
            <div key={feat.id} style={{ ...card, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: feat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{feat.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{feat.label}</div>
                  <div style={{ fontSize: 11, color: C.t3 }}>{feat.sub}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <div key={s} style={starStyle(s <= myR)} onClick={() => handleRate(feat.id, s)}>
                    {s <= myR ? "⭐" : "☆"}
                  </div>
                ))}
              </div>
              <input
                value={ratingComments[feat.id] ?? myRatings[feat.id]?.comment ?? ""}
                onChange={e => setRatingComments(prev => ({ ...prev, [feat.id]: e.target.value }))}
                onBlur={() => { if (myR > 0 && ratingComments[feat.id] !== undefined) handleRate(feat.id, myR); }}
                placeholder="Nhận xét thêm..."
                style={{ width: "100%", padding: 8, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          );
        })}
      </>}

      {/* ====== TAB: Admin ====== */}
      {tab === "admin" && isAdmin && <>
        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 12, textAlign: "center", border: `1.5px solid ${C.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#007AFF" }}>{allFeedback.length}</div>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>Tổng phản hồi</div>
          </div>
          <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 12, textAlign: "center", border: `1.5px solid ${C.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#F59E0B" }}>{pendingCount}</div>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>Chờ phản hồi</div>
          </div>
          <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 12, textAlign: "center", border: `1.5px solid ${C.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#10B981" }}>{overallAvg || "—"}</div>
            <div style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>Rating TB</div>
          </div>
        </div>

        {/* Rating bars */}
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 10 }}>⭐ Rating tổng hợp</div>
          {FEATURES.map(feat => {
            const avg = avgRatings[feat.id]?.avg || 0;
            const cnt = avgRatings[feat.id]?.count || 0;
            return (
              <div key={feat.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: C.t2, fontWeight: 600, width: 70, flexShrink: 0 }}>{feat.label.split(" ").slice(0, 2).join(" ")}</span>
                <div style={{ flex: 1, height: 5, background: "rgba(0,122,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "#007AFF", width: `${avg * 20}%` }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#007AFF", width: 22, textAlign: "right" }}>{avg || "—"}</span>
                <span style={{ fontSize: 9, color: C.t3, width: 20 }}>({cnt})</span>
              </div>
            );
          })}
        </div>

        {/* Feedback list */}
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 10 }}>📩 Phản hồi</div>
        {allFeedback.map(fb => (
          <div key={fb.id} style={{ padding: 12, background: "#fff", borderRadius: 10, marginBottom: 8, border: `1px solid ${C.border}`, borderLeft: `3px solid ${fb.status === "replied" ? "#10B981" : "#F59E0B"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#007AFF", background: "rgba(0,122,255,0.06)", padding: "2px 8px", borderRadius: 6 }}>
                  {CATEGORIES.find(c => c.id === fb.category)?.label || fb.category}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginLeft: 8 }}>{fb.username}</span>
              </div>
              <span style={{ fontSize: 10, color: C.t3 }}>{new Date(fb.created_at).toLocaleDateString("vi-VN")}</span>
            </div>
            <div style={{ fontSize: 12, color: "#334155", marginTop: 6, lineHeight: 1.5 }}>{fb.content}</div>
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 6, color: fb.status === "replied" ? "#10B981" : "#F59E0B" }}>
              {fb.status === "replied" ? "✅ Đã trả lời" : "⏳ Chưa trả lời"}
            </div>
            {fb.admin_reply && (
              <div style={{ marginTop: 6, padding: "8px 10px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #10B981" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", marginBottom: 3 }}>Bạn đã trả lời</div>
                <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>{fb.admin_reply}</div>
              </div>
            )}
            {fb.status !== "replied" && (
              <div style={{ marginTop: 8 }}>
                <input
                  value={replyText[fb.id] || ""} onChange={e => setReplyText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                  placeholder="Trả lời phản hồi này..."
                  style={{ width: "100%", padding: "8px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
                <button onClick={() => handleReply(fb.id)}
                  style={{ marginTop: 6, padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700, color: "#fff", background: "#007AFF", cursor: "pointer", float: "right", fontFamily: "inherit" }}>
                  Gửi trả lời
                </button>
                <div style={{ clear: "both" }} />
              </div>
            )}
          </div>
        ))}
      </>}
    </div>
  );
}
