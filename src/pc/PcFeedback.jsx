// Quản trị PC › Góp ý (cùng ngôn ngữ hình ảnh PcUsers / PcFood). Logic giữ đúng AdminFeedbackScreen (mobile) + FeedbackTab (phần admin):
//  - user_feedback 50 bản mới nhất; chưa trả lời lên đầu. feature_ratings: điểm TB, theo tính năng, nhận xét kèm sao.
//  - Trả lời: update user_feedback {admin_reply, status:"replied", admin_replied_at} + notifications cho người gửi (như cũ) → refreshCounts().
//  - Chỉ trả lời được góp ý chưa trả lời (như cũ). Mọi admin đều trả lời được (như cũ).
//  - Bố cục: 3 ô số · 2 cột (bảng góp ý trái, lọc trạng thái / loại / tìm; chi tiết + ô trả lời phải) · hàng dưới: rating theo tính năng + nhận xét kèm sao.
import { useCallback, useEffect, useMemo, useState } from "react";
import { appendReply } from "../lib/feedbackReply";
import { supabase } from "../lib/supabase";
import { PC } from "../theme";
import { Btn, Pill, Card, SearchBox, FilterSelect, ErrorBox, Loading, headRow, bodyRow, cell, secLbl, vnInt, vnDec, fmtDT } from "./pcUI";

const COLS = "112px minmax(0,1fr) 72px 104px";
const FEATURES = [["ai_menu", "AI tạo thực đơn"], ["photo", "Chụp ảnh kiểm tra"], ["ai_chat", "AI Coach"], ["ui", "Giao diện"]];
const FEAT_NAME = Object.fromEntries(FEATURES);
// [nhãn, tông pill]
const CAT = { suggestion: ["Góp ý", "blue"], web_contact: ["Liên hệ từ web", "blue"], bug: ["Báo lỗi", "red"], ai_menu: ["Lỗi · AI thực đơn", "red"], photo: ["Lỗi · Chụp ảnh", "red"], ai_chat: ["Lỗi · AI Chat", "red"], ui: ["Lỗi · Giao diện", "red"], other: ["Lỗi · Khác", "red"] };
const isReplied = (f) => f.status === "replied";
const okImg = (u) => typeof u === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(u);
const avgOf = (arr) => (arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null);

function Tile({ label, value, color, sub, testid }) {
  return (
    <Card testid={testid} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{label}</span>
        <span data-testid={testid ? `${testid}-value` : undefined} style={{ fontSize: 26, fontWeight: 900, color, whiteSpace: "nowrap" }}>{value}</span>
        <span style={{ fontSize: 12, color: PC.t4, minHeight: 16 }}>{sub || ""}</span>
      </div>
    </Card>
  );
}

function Stars({ n }) {
  const k = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return <span aria-label={`${k} trên 5 sao`} style={{ color: "#F59E0B", letterSpacing: 2, whiteSpace: "nowrap", fontSize: 13 }}>{"★".repeat(k)}<span style={{ color: "#E2E8F0" }}>{"★".repeat(5 - k)}</span></span>;
}

export function PcFeedback({ top, showToast, refreshCounts }) {
  const [list, setList] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [err, setErr] = useState(null);
  const [statusF, setStatusF] = useState("all"); // all | waiting | replied
  const [catF, setCatF] = useState("all"); // all | suggestion | bugs | <category>
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState(null);
  const [reply, setReply] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    const [fb, rt] = await Promise.all([
      supabase.from("user_feedback").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("feature_ratings").select("*").order("created_at", { ascending: false }),
    ]);
    if (fb.error) { setErr(fb.error.message || "Lỗi tải"); setList((l) => l || []); return; }
    setList(fb.data || []);
    setRatings(rt.error ? [] : rt.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const reloadAll = () => { load(); refreshCounts?.(); };

  const all = useMemo(() => list || [], [list]);
  const waiting = all.filter((f) => !isReplied(f));
  const ordered = useMemo(() => [...all.filter((f) => !isReplied(f)), ...all.filter(isReplied)], [all]);
  const filtered = useMemo(() => {
    let items = ordered;
    if (statusF === "waiting") items = items.filter((f) => !isReplied(f));
    if (statusF === "replied") items = items.filter(isReplied);
    if (catF === "suggestion") items = items.filter((f) => f.category === "suggestion");
    else if (catF === "bugs") items = items.filter((f) => f.category !== "suggestion" && f.category !== "web_contact");
    else if (catF !== "all") items = items.filter((f) => f.category === catF);
    if (search.trim()) { const s = search.trim().toLowerCase(); items = items.filter((f) => (f.username || "").toLowerCase().includes(s) || (f.content || "").toLowerCase().includes(s)); }
    return items;
  }, [ordered, statusF, catF, search]);
  // Luôn có 1 góp ý đang mở bên phải (ưu tiên cái đang chọn nếu còn trong danh sách lọc)
  useEffect(() => {
    if (!filtered.length) { if (selId != null) setSelId(null); return; }
    if (!filtered.some((f) => f.id === selId)) setSelId(filtered[0].id);
  }, [filtered, selId]);
  const sel = all.find((f) => f.id === selId) || null;

  const byF = {};
  ratings.forEach((r) => { (byF[r.feature] = byF[r.feature] || []).push(Number(r.rating) || 0); });
  const avgAll = avgOf(ratings.map((r) => Number(r.rating) || 0));
  const comments = ratings.filter((r) => (r.comment || "").trim());
  const catsPresent = [...new Set(all.map((f) => f.category).filter(Boolean))];
  const countCat = (c) => all.filter((f) => f.category === c).length;

  const send = async (fb) => {
    const text = (reply[fb.id] || "").trim();
    if (!text || busy) return;
    setBusy(fb.id);
    const nowIso = new Date().toISOString();
    const more = !!(fb.admin_reply || "").trim(); // đã trả lời → trả lời thêm (nối vào cuối)
    const { error } = await supabase.from("user_feedback").update({ admin_reply: appendReply(fb.admin_reply, text, nowIso), status: "replied", admin_replied_at: nowIso }).eq("id", fb.id);
    if (!error && fb.user_id) await supabase.from("notifications").insert({ user_id: fb.user_id, title: more ? "💬 Admin trả lời thêm góp ý của bạn" : "💬 Admin đã trả lời góp ý của bạn", body: text.slice(0, 100), url: "feedback" });
    setBusy(null);
    if (error) { showToast?.({ text: "Chưa gửi được trả lời, thử lại nhé." }); return; }
    setReply((r) => ({ ...r, [fb.id]: "" }));
    showToast?.({ text: "Đã gửi trả lời." });
    await load();
    refreshCounts?.();
  };

  const segBtn = (v, label, n) => {
    const on = statusF === v;
    return (
      <button key={v} type="button" role="radio" aria-checked={on} data-testid={`pc-feedback-st-${v}`} onClick={() => setStatusF(v)} className="pc-btn"
        style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap", background: on ? "#FFFFFF" : "transparent", color: on ? PC.t1 : PC.t3, boxShadow: on ? "0 1px 3px rgba(15,23,42,0.10)" : "none" }}>
        {label}{n != null ? ` (${vnInt(n)})` : ""}
      </button>
    );
  };

  return (
    <>
      {top(<Btn kind="soft" onClick={reloadAll} testid="pc-feedback-reload">Làm mới</Btn>)}
      <div data-testid="pc-feedback" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Tile testid="pc-feedback-tile-total" label="Tổng phản hồi" value={list ? vnInt(all.length) : "–"} color={PC.t1} sub="50 bản mới nhất" />
          <Tile testid="pc-feedback-tile-waiting" label="Chờ trả lời" value={list ? vnInt(waiting.length) : "–"} color="#B45309" sub={waiting.length ? "ưu tiên xử lý trước" : "đã trả lời hết"} />
          <Tile testid="pc-feedback-tile-rating" label="Đánh giá trung bình" value={avgAll == null ? "–" : `${vnDec(avgAll)}/5`} color="#15803D" sub={`${vnInt(ratings.length)} lượt chấm sao`} />
        </div>

        {err && <ErrorBox text={`Chưa tải được góp ý: ${err}`} onRetry={load} />}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
          {/* Cột trái: bảng góp ý */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span role="radiogroup" aria-label="Trạng thái" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 10, background: "#E9EEF6" }}>
                {segBtn("all", "Tất cả", null)}{segBtn("waiting", "Chờ trả lời", waiting.length)}{segBtn("replied", "Đã trả lời", all.length - waiting.length)}
              </span>
              <FilterSelect fontSize={13} label="Loại" value={catF} onChange={setCatF} testid="pc-feedback-f-cat"
                options={[{ v: "all", label: "Tất cả", full: `Tất cả loại (${vnInt(all.length)})` }, { v: "suggestion", label: "Góp ý", full: `Góp ý (${vnInt(countCat("suggestion"))})` }, { v: "bugs", label: "Báo lỗi", full: `Báo lỗi — mọi tính năng (${vnInt(all.length - countCat("suggestion"))})` },
                  ...catsPresent.filter((c) => c !== "suggestion").map((c) => ({ v: c, label: CAT[c]?.[0] || c, full: `${CAT[c]?.[0] || c} (${vnInt(countCat(c))})` }))]} />
              <SearchBox value={search} onChange={setSearch} placeholder="Tìm người gửi, nội dung…" width={200} testid="pc-feedback-search" />
            </div>
            <Card>
              <div style={headRow(COLS)}><span>LOẠI</span><span>NGƯỜI GỬI · NỘI DUNG</span><span>NGÀY</span><span>TRẠNG THÁI</span></div>
              {!list && <Loading />}
              {list && filtered.length === 0 && <div data-testid="pc-feedback-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>{all.length ? "Không có góp ý nào khớp bộ lọc." : "Chưa có phản hồi nào."}</div>}
              {filtered.map((f, i) => {
                const on = f.id === selId;
                const last = i === filtered.length - 1;
                const [tag, tone] = CAT[f.category] || [f.category || "Khác", "gray"];
                return (
                  <button key={f.id} data-testid="pc-feedback-row" data-id={f.id} aria-pressed={on} onClick={() => setSelId(f.id)} className="pc-row pc-click"
                    style={{ ...bodyRow(COLS, on), minHeight: 56, padding: "8px 16px", borderBottom: last ? "none" : bodyRow(COLS).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0, boxShadow: on ? "inset 3px 0 0 #1A7CFF" : "none", cursor: "pointer" }}>
                    <span style={cell}><Pill tone={tone}>{tag}</Pill></span>
                    <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <b style={{ ...cell, fontSize: 13 }} title={f.username || "Người dùng"}>{f.username || "Người dùng"}</b>
                      <span style={{ ...cell, color: PC.t3 }} title={f.content}>{f.content}</span>
                    </span>
                    <span style={{ ...cell, color: PC.t3 }}>{fmtDT(f.created_at, { time: false })}</span>
                    <span style={cell}>{isReplied(f) ? <Pill tone="green">Đã trả lời</Pill> : <Pill tone="amber">Chờ trả lời</Pill>}</span>
                  </button>
                );
              })}
            </Card>
          </div>

          {/* Cột phải: chi tiết + trả lời */}
          <Card testid="pc-feedback-detail" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, fontSize: 13, minWidth: 0, position: "sticky", top: PC.topH + 20 }}>
            {!sel && <span style={{ color: PC.t3, textAlign: "center", padding: 20 }}>{list ? "Chọn 1 góp ý ở bảng bên trái để xem và trả lời." : "Đang tải…"}</span>}
            {sel && (() => {
              const [tag, tone] = CAT[sel.category] || [sel.category || "Khác", "gray"];
              const open = !isReplied(sel);
              const txt = reply[sel.id] || "";
              return <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Pill tone={tone}>{tag}</Pill>
                  {open ? <Pill tone="amber" testid="pc-feedback-status">Chờ trả lời</Pill> : <Pill tone="green" testid="pc-feedback-status">Đã trả lời</Pill>}
                  <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, whiteSpace: "nowrap" }}>{fmtDT(sel.created_at)}</span>
                </div>
                <b style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={sel.username || "Người dùng"}>{sel.username || "Người dùng"}</b>
                <div data-testid="pc-feedback-content" style={{ fontSize: 13.5, lineHeight: 1.55, color: PC.t1, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#F8FAFC", borderRadius: 10, padding: "10px 12px", maxHeight: 260, overflowY: "auto" }}>{sel.content}</div>
                {okImg(sel.image_url) && (
                  <a href={sel.image_url} download={`gopy-${sel.id}.jpg`} title="Tải ảnh đính kèm" style={{ alignSelf: "flex-start" }}>
                    <img data-testid="pc-feedback-img" src={sel.image_url} alt="Ảnh đính kèm" style={{ display: "block", maxWidth: 220, maxHeight: 220, borderRadius: 10, border: `1px solid ${PC.field}`, objectFit: "contain" }} />
                  </a>
                )}
                {sel.admin_reply && (
                  <div data-testid="pc-feedback-reply-done" style={{ padding: "10px 12px", borderRadius: 10, background: "#F0FDF4", borderLeft: "3px solid #16A34A", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#166534" }}>Bạn đã trả lời{sel.admin_replied_at ? ` · lần cuối ${fmtDT(sel.admin_replied_at)}` : ""}</span>
                    <span style={{ fontSize: 13, color: PC.t2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{sel.admin_reply}</span>
                  </div>
                )}
                {(
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4, borderTop: `1px solid ${PC.rowLine}` }}>
                    <span style={secLbl}>{open ? "TRẢ LỜI" : "TRẢ LỜI THÊM"}</span>
                    <textarea data-testid="pc-feedback-reply" className="pc-input" rows={4} value={txt} aria-label="Nội dung trả lời"
                      onChange={(e) => setReply((r) => ({ ...r, [sel.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(sel); }}
                      placeholder="Trả lời phản hồi này…"
                      style={{ minHeight: 88, borderRadius: 10, border: `1px solid ${PC.field}`, padding: "8px 12px", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, resize: "vertical", color: PC.t1 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: PC.t4, flex: 1, minWidth: 0 }}>Người gửi nhận thông báo trong app · Ctrl + Enter để gửi</span>
                      <Btn kind="blue" onClick={() => send(sel)} disabled={!txt.trim() || busy === sel.id} testid="pc-feedback-send">{busy === sel.id ? "Đang gửi…" : open ? "Gửi trả lời" : "Gửi thêm"}</Btn>
                    </div>
                  </div>
                )}
              </>;
            })()}
          </Card>
        </div>

        {/* Hàng dưới: rating theo tính năng + nhận xét kèm sao */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr)", gap: 16, alignItems: "start" }}>
          <Card testid="pc-feedback-ratings" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={secLbl}>ĐÁNH GIÁ THEO TÍNH NĂNG</span>
            {FEATURES.map(([id, t]) => {
              const arr = byF[id] || [];
              const avg = avgOf(arr);
              return (
                <div key={id} style={{ display: "grid", gridTemplateColumns: "130px minmax(0,1fr) 64px", alignItems: "center", gap: 10, minHeight: 28 }}>
                  <span style={{ fontSize: 13, color: PC.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
                  <span style={{ height: 6, borderRadius: 3, background: "#EEF2FA" }}><span style={{ display: "block", height: "100%", width: `${avg ? avg * 20 : 0}%`, borderRadius: 3, background: "#1A7CFF" }} /></span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, textAlign: "right", whiteSpace: "nowrap" }}>{avg == null ? "–" : vnDec(avg)} <span style={{ color: PC.t4, fontWeight: 600 }}>({vnInt(arr.length)})</span></span>
                </div>
              );
            })}
          </Card>
          <Card testid="pc-feedback-comments" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={secLbl}>NHẬN XÉT KÈM SAO · {vnInt(comments.length)}</span>
            {comments.length === 0 && <span style={{ fontSize: 13, color: PC.t3 }}>Chưa có nhận xét nào.</span>}
            <div style={{ display: "flex", flexDirection: "column", maxHeight: 320, overflowY: "auto" }}>
              {comments.map((r, i) => (
                <div key={r.id || `${r.user_id}-${r.feature}`} style={{ padding: "10px 0", borderBottom: i === comments.length - 1 ? "none" : `1px solid ${PC.rowLine}`, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b style={{ fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.username || "Người dùng"}</b>
                    <Stars n={r.rating} />
                    <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t4, whiteSpace: "nowrap" }}>{FEAT_NAME[r.feature] || r.feature} · {fmtDT(r.created_at, { time: false })}</span>
                  </div>
                  <span style={{ fontSize: 13, color: PC.t2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.comment}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
