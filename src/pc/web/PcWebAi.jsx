// Quản trị PC › WEB · NỘI DUNG › AI viết bài (bản vẽ chốt 19/10, artifact "AI viết bài").
//  - Xếp hàng viết (mỗi dòng 1 từ khoá = 1 bài, tối đa 10) → hàm web-writer chạy LẦN LƯỢT từng bài, mỗi phút 1 bước (pg_cron),
//    xong tự lưu BẢN NHÁP (có ảnh bìa + ảnh trong bài). Đóng trang / tắt máy vẫn chạy.
//  - Cài đặt (lưu ngay khi đổi, bảng web_ai_config chỉ admin đọc): mô hình viết, khoá Claude chung / riêng, ảnh (Flux qua fal.ai,
//    số ảnh, dùng lại ảnh thư viện trước), số lượt tra web, trần tiền mỗi ngày, tỷ giá, bộ quy tắc (sửa / về bản gốc).
//  - Lịch sử & chi phí từng bài theo tháng (giờ VN): token, lượt tra web, ảnh, tiền chữ + tiền ảnh.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { supabase } from "../../lib/supabase";
import { authFetch } from "../../lib/authFetch";
import { useAiKeys } from "../../lib/aiKeys";
import { todayVN } from "../../lib/dateVN";
import { Btn, Pill, Card, ErrorBox, Loading, vnInt } from "../pcUI";
import { Modal, Tog, inpStyle } from "./webUI";
import { listTerms, getPost, savePost, getSite } from "./webApi";
import { seoChecks, clean } from "./webLib";
import { RULES_DEFAULT, RULES_VERSION, cfgOf, TEXT_PRICE, IMG_PRICE, SEARCH_PRICE, estText, estReview, providerOf, postReady, nextSlot } from "./aiWrite";
import { PROVIDERS, MODELS as AI_MODELS, DEFAULT_MODEL } from "../../lib/aiModels";

// Hãng viết: Claude / Gemini / ChatGPT (danh sách mô hình dùng chung với Kết nối AI); mọi hãng đều tra web được
const PNAME = { claude: "Claude", gemini: "Gemini", gpt: "ChatGPT" };
const BADGE = { "Tiết kiệm": "green", "Khuyên dùng": "blue", "Cao cấp": "amber" };
const ALL_MODELS = Object.entries(AI_MODELS).flatMap(([p, list]) => list.map((m) => ({ ...m, p })));
const short = (m) => ALL_MODELS.find((x) => x.id === m)?.name || m || "";
// Hãng vẽ ảnh: khoá lấy ở Kết nối AI (fal.ai / Gemini / OpenAI)
const IMGP = [["flux", "Flux nhanh (fal.ai)", "fal_key"], ["gemini", "Gemini", "gemini_key"], ["gpt", "ChatGPT (OpenAI)", "gpt_key"]];
const ST = {
  queued: ["Đang chờ", "gray"], research: ["Đang tra cứu", "blue"], writing: ["Đang viết", "blue"], fixing: ["Đang sửa", "blue"],
  review: ["Đang soát bài", "blue"], images: ["Đang vẽ ảnh", "violet"], saving: ["Đang lưu", "blue"], done: ["Đã lưu nháp", "green"], error: ["Lỗi", "red"], canceled: ["Đã huỷ", "gray"],
};
const OPEN = ["queued", "research", "writing", "fixing", "review", "images", "saving"];
const FLT = [["all", "Tất cả"], ["run", "Đang chạy"], ["draft", "Nháp"], ["pub", "Đã đăng / hẹn"], ["err", "Lỗi / huỷ"]];
const fltOf = (j, k) => k === "all" || (k === "run" && OPEN.includes(j.status)) || (k === "draft" && j.status === "done" && j.post?.status === "draft") || (k === "pub" && j.status === "done" && ["published", "scheduled"].includes(j.post?.status)) || (k === "err" && ["error", "canceled"].includes(j.status));
// Tiến trình 1 bài (bấm dòng để mở): các bước theo state.log do web-writer ghi khi đổi bước
const STEPS = [["queued", "Xếp hàng"], ["research", "Tra web, kiểm số liệu"], ["writing", "Viết bài"], ["review", "Soát số liệu, câu văn"], ["fixing", "Sửa lỗi"], ["images", "Vẽ / chọn ảnh"], ["saving", "Lưu bài, gắn thẻ, đăng"], ["done", "Xong"]];
const dur = (a, b) => { const s = Math.max(0, Math.round((new Date(b) - new Date(a)) / 1000)); return s < 60 ? `${s} giây` : `${Math.floor(s / 60)} phút ${s % 60 ? `${s % 60} giây` : ""}`.trim(); };
function JobSteps({ j }) {
  const log = Array.isArray(j.log) ? j.log : [];
  const at = { queued: j.created_at }; for (const x of log) at[x.s] = x.at;
  const shown = STEPS.filter(([k]) => (k !== "fixing" || at.fixing || j.status === "fixing") && (k !== "review" || at.review || j.status === "review" || Array.isArray(j.rvi)));
  const cur = ["error", "canceled"].includes(j.status) ? null : j.status;
  const reached = (k) => !!at[k] || k === cur;
  const detail = (k) => {
    if (k === "writing") return j.chunks ? `${j.chunks} phần${j.status === "writing" ? ", đang viết tiếp" : ""}` : "";
    if (k === "fixing") return j.fixc ? `${j.fixc} phần` : "";
    if (k === "review") return j.rvskip ? `bỏ qua (${j.rvskip})` : Array.isArray(j.rvi) ? (j.rvi.length ? `${j.rvi.length} lỗi cần sửa` : "không thấy lỗi") : "";
    if (k === "images") { const n = Array.isArray(j.nimg) ? j.nimg.length : 0; return n ? `${n} ảnh${j.reused ? ` (${j.reused} dùng lại)` : ""}` : ""; }
    if (k === "research") return j.searches ? `${j.searches} lượt tra web` : "";
    if (k === "done" && j.links) { const l = j.links; return `Link nội bộ ${l.total}: trang chủ ${l.home} · chuyên mục ${l.cat} · trang liên quan ${l.page} · bài cùng chủ đề ${l.post}`; }
    return "";
  };
  const end = j.finished_at || (OPEN.includes(j.status) ? new Date().toISOString() : j.updated_at);
  return (
    <div data-testid="web-ai-steps" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", background: "#F8FBFF", borderRadius: 10, border: `1px solid ${PC.rowLine}` }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "stretch" }}>
        {shown.map(([k, name], i) => {
          const done = reached(k) && k !== cur, now = k === cur && k !== "done";
          const bg = now ? "#E8F0FF" : done ? "#ECFDF5" : "#fff", bd = now ? "#BFD4FF" : done ? "#BBF7D0" : PC.rowLine, fg = now ? "#1E40AF" : done ? "#15803D" : PC.t3;
          return (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span aria-hidden="true" style={{ color: PC.t3 }}>›</span>}
              <span data-step={k} data-on={now ? "now" : done ? "done" : "todo"} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "6px 10px", borderRadius: 8, background: bg, border: `1px solid ${bd}`, minWidth: 92 }}>
                <b style={{ fontSize: 12, color: fg }}>{now ? "● " : done ? "✓ " : ""}{name}</b>
                <span style={{ fontSize: 11, color: PC.t3 }}>{at[k] ? vnTime(at[k]).slice(6) : now ? "đang chạy" : "—"}{detail(k) && k !== "done" ? ` · ${detail(k)}` : ""}</span>
              </span>
            </span>
          );
        })}
      </div>
      <span style={{ fontSize: 12, color: PC.t2 }}>
        {j.status === "error" ? <b style={{ color: "#B91C1C" }}>Lỗi{j.attempts ? ` sau ${j.attempts} lần thử` : ""}: {j.error || "không rõ"}</b> : j.status === "canceled" ? "Đã huỷ." : null}
        {j.status !== "error" && j.status !== "canceled" && <>Tổng thời gian {dur(j.created_at, end)}{j.status === "queued" ? " (đang chờ bài trước xong)" : ""}.</>}
        {j.status === "done" && detail("done") ? ` ${detail("done")}.` : ""}
        {!log.length && j.status === "done" ? " (bài viết trước khi có ghi tiến trình)" : ""}
        {Array.isArray(j.back) && j.back.length > 0 ? ` Link ngược: ${j.back.map((x) => `${x.title} ("${x.anchor}")`).join(" · ")}.` : ""}
      </span>
      {Array.isArray(j.rvi) && j.rvi.length > 0 && (
        <details data-testid="web-ai-review-list" style={{ fontSize: 12, color: PC.t2 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Lỗi bước soát đã tìm ({j.rvi.length}), AI đã sửa theo danh sách này</summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>{j.rvi.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
const usd = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace(".", ",")} USD`;
const kt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}K` : String(n || 0));
const monthStart = (ym) => new Date(`${ym}-01T00:00:00+07:00`).toISOString();
const nextMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; };
const vnTime = (iso) => { const d = new Date(new Date(iso).getTime() + 7 * 3600e3); const z = (n) => String(n).padStart(2, "0"); return `${z(d.getUTCDate())}/${z(d.getUTCMonth() + 1)} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`; }; // giờ VN

const card = { padding: "18px 20px" };
const h2 = { fontSize: 17, fontWeight: 900, margin: "0 0 14px 0" };
const h3 = { fontSize: 15, fontWeight: 900, margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 8 };
const sub = { fontSize: 12, color: PC.t3, lineHeight: 1.5 };
const lbl = { display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 };

function Radio({ on, onClick, children, testid, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testid} aria-pressed={on}
      style={{ display: "flex", gap: 10, alignItems: "center", border: 0, background: "none", padding: "5px 0", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: PC.t1, textAlign: "left" }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", border: on ? "5px solid #0062F0" : "2px solid #CBD5E1", flex: "none", boxSizing: "border-box" }} />{children}
    </button>
  );
}

export function PcWebAi({ top, showToast, user, go }) {
  const [cfg, setCfg] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [cats, setCats] = useState([]);
  const [err, setErr] = useState("");
  const [ym, setYm] = useState(todayVN().slice(0, 7));
  const [kw, setKw] = useState("");
  const [openId, setOpenId] = useState(null);
  const [flt, setFlt] = useState("all"); // lọc lịch sử: all · run · draft · pub · err
  const [pv, setPv] = useState(null); // bài đang xem trước
  const [term, setTerm] = useState("auto");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState("");
  const [ownKey, setOwnKey] = useState("");
  const [rulesEd, setRulesEd] = useState(null);
  const [today, setToday] = useState(0);
  const { status: keySt, saveKeys } = useAiKeys(true);

  const load = useCallback(async () => {
    try {
      const [c, j, t, d] = await Promise.all([
        supabase.from("web_ai_config").select("data").eq("id", 1).maybeSingle(),
        supabase.from("web_ai_jobs").select("id,keyword,term_id,model,status,post_id,in_tok,out_tok,searches,images,reused,cost_text,cost_img,error,attempts,created_at,updated_at,finished_at,warn:state->warn,note:state->published->>note,log:state->log,chunks:state->draft->chunks,fixc:state->fix->chunks,nimg:state->imgs,links:state->linkStats,rvi:state->review->issues,rvskip:state->review->>skipped,back:state->backlinks,post:web_posts(status,published_at,slug,score:seo->score)").gte("created_at", monthStart(ym)).lt("created_at", monthStart(nextMonth(ym))).order("created_at", { ascending: false }),
        listTerms("category"),
        supabase.from("web_ai_jobs").select("cost_text,cost_img").gte("updated_at", new Date(`${todayVN()}T00:00:00+07:00`).toISOString()),
      ]);
      if (c.error) throw c.error; if (j.error) throw j.error;
      setCfg(cfgOf(c.data?.data)); setJobs(j.data || []); setCats(t || []);
      setToday((d.data || []).reduce((s, r) => s + Number(r.cost_text) + Number(r.cost_img), 0));
      setErr("");
    } catch (e) { setErr("Chưa tải được. " + (e.message || "")); }
  }, [ym]);
  useEffect(() => { load(); }, [load]);
  const active = (jobs || []).filter((j) => OPEN.includes(j.status)).length;
  useEffect(() => { if (!active) return; const t = setInterval(load, 10000); return () => clearInterval(t); }, [active, load]); // đang chạy thì tự tải lại 10 giây / lần

  // Cài đặt: đổi là lưu ngay (gộp vào bản trên máy chủ)
  const setC = async (patch) => {
    const next = { ...cfg, ...patch }; setCfg(next);
    const { error } = await supabase.from("web_ai_config").upsert({ id: 1, data: next, updated_at: new Date().toISOString(), updated_by: user?.id || null });
    if (error) { showToast?.({ text: "Chưa lưu được cài đặt: " + error.message, tone: "red" }); load(); }
  };

  const rate = Number(cfg?.rate) || 26000;
  const vndOf = (u) => `${vnInt((Number(u) || 0) * rate)}đ`;
  // Ước tính mỗi bài: có bài đã xong cùng mô hình thì lấy trung bình thật, chưa có thì số ước tính (ghi "chưa đo")
  const estFor = useCallback((model) => {
    const done = (jobs || []).filter((j) => j.status === "done" && j.model === model);
    if (done.length) return { v: done.reduce((s, j) => s + Number(j.cost_text), 0) / done.length, real: done.length };
    return { v: estText(model, cfg?.searches ?? 3) + (cfg?.review_model ? estReview(cfg.review_model, model) : 0), real: 0 };
  }, [jobs, cfg?.searches, cfg?.review_model]);
  const imgEst = cfg ? (cfg.img_on ? (1 + (cfg.img_inline || 0)) * IMG_PRICE[cfg.img_provider || "flux"] : 0) : 0;

  const stats = useMemo(() => {
    const list = jobs || []; const done = list.filter((j) => j.status === "done");
    const t = list.reduce((s, j) => s + Number(j.cost_text), 0), i = list.reduce((s, j) => s + Number(j.cost_img), 0);
    return { total: t + i, text: t, img: i, n: done.length, avg: done.length ? (t + i) / done.length : 0, tin: list.reduce((s, j) => s + j.in_tok, 0), tout: list.reduce((s, j) => s + j.out_tok, 0), srch: list.reduce((s, j) => s + j.searches, 0), imgs: list.reduce((s, j) => s + j.images + j.reused, 0) };
  }, [jobs]);

  const lines = kw.split("\n").map((s) => s.trim()).filter(Boolean);
  const enqueue = async () => {
    if (!lines.length || lines.length > 10 || busy) return;
    setBusy("q");
    const rows = lines.map((k) => ({ keyword: k.slice(0, 200), term_id: term === "auto" ? null : term, auto_term: term === "auto", notes: notes.trim() || null, model: cfg.model, created_by: user?.id || null }));
    const { error } = await supabase.from("web_ai_jobs").insert(rows);
    setBusy("");
    if (error) return showToast?.({ text: "Chưa xếp hàng được: " + error.message, tone: "red" });
    setKw(""); setNotes("");
    showToast?.({ text: `Đã xếp hàng ${rows.length} bài. Bài đầu bắt đầu trong khoảng 1 phút.` });
    if (ym !== todayVN().slice(0, 7)) setYm(todayVN().slice(0, 7)); else load();
  };
  const cancel = async (j) => { await supabase.from("web_ai_jobs").update({ status: "canceled", finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", j.id); load(); };
  const retry = async (j) => {
    const { data } = await supabase.from("web_ai_jobs").select("state").eq("id", j.id).single();
    const back = data?.state?.failedAt || "queued";
    await supabase.from("web_ai_jobs").update({ status: back, attempts: 0, error: null, finished_at: null, locked_until: null, updated_at: new Date().toISOString() }).eq("id", j.id);
    showToast?.({ text: "Đã đưa lại vào hàng chờ, chạy tiếp từ bước bị lỗi." }); load();
  };
  // "Đăng" ở bảng: mở đủ bài (chuyên mục + thẻ) → kiểm đủ chỗ → lưu như nút Đăng của trình soạn (điểm SEO, lịch sử, IndexNow)
  const publish = async (j) => {
    setBusy("p-" + j.id);
    try {
      const p = await getPost(j.post_id);
      const r = postReady(p);
      if (!r.ok) { showToast?.(`Chưa đăng được: thiếu ${r.miss.join(", ")}. Bấm Mở bài để bổ sung.`); return; }
      await savePost({ ...p, status: "published", published_at: new Date().toISOString() }, { reason: "publish", uid: user?.id });
      showToast?.("Đã đăng bài lên fipilotai.com."); load();
      if (cfg.backlinks !== false) authFetch("web-writer", { action: "backlink", post_id: j.post_id }).then((d) => { if (d?.back?.length) showToast?.(`Đã gắn link từ ${d.back.length} bài cũ sang bài này: ${d.back.map((x) => x.title).join(" · ")}`); }).catch(() => {});
    } catch (e) { showToast?.("Chưa đăng được: " + (e.message || "")); } finally { setBusy(""); }
  };
  // "Gắn link": AI chọn chỗ gắn link nội bộ cho bài này (không viết lại chữ) + bài đã đăng thì gắn link từ bài cũ sang
  const relink = async (j) => {
    setBusy("l-" + j.id);
    try {
      const d = await authFetch("web-writer", { action: "links", post_id: j.post_id });
      if (d?.error) throw new Error(d.error);
      const a = d.added || [], b = d.back || [];
      showToast?.(a.length || b.length ? `Đã gắn ${a.length} link trong bài${a.length ? ` (${a.map((x) => x.url).join(", ")})` : ""}${b.length ? ` · ${b.length} bài cũ link sang: ${b.map((x) => x.title).join(" · ")}` : ""}.` : "Không thấy chỗ hợp để gắn thêm link.");
      load();
    } catch (e) { showToast?.("Chưa gắn được link: " + (e.message || "")); } finally { setBusy(""); }
  };
  // Xem trước bài ngay trong màn này (không phải mở trình soạn)
  const preview = async (j) => { try { setPv(await getPost(j.post_id)); } catch (e) { showToast?.("Chưa mở được bài: " + (e.message || "")); } };
  // "Hẹn giờ" ở bảng: đặt bài vào giờ đăng trống kế tiếp (giờ ở thẻ "Sau khi viết xong", mặc định 08:00 · 19:00)
  const schedule = async (j) => {
    setBusy("s-" + j.id);
    try {
      const p = await getPost(j.post_id);
      const r = postReady(p);
      if (!r.ok) { showToast?.(`Chưa hẹn giờ được: thiếu ${r.miss.join(", ")}. Bấm Mở bài để bổ sung.`); return; }
      const { data: tk } = await supabase.from("web_posts").select("published_at").in("status", ["scheduled", "published"]).gte("published_at", new Date().toISOString());
      const at = nextSlot(cfg.sched_times?.length ? cfg.sched_times : ["08:00", "19:00"], (tk || []).map((x) => x.published_at));
      if (!at) { showToast?.("Chưa có giờ đăng hợp lệ."); return; }
      await savePost({ ...p, status: "scheduled", published_at: at }, { reason: "publish", uid: user?.id });
      showToast?.(`Đã hẹn đăng lúc ${vnTime(at)}.`); load();
    } catch (e) { showToast?.("Chưa hẹn giờ được: " + (e.message || "")); } finally { setBusy(""); }
  };
  // Bài AI lưu ở máy chủ chưa có điểm SEO → tính bù khi mở màn này (giống điểm ở trình soạn)
  const scored = useRef(new Set());
  useEffect(() => {
    const need = (jobs || []).filter((j) => j.post_id && j.post && j.post.status !== "trash" && j.post.score == null && !scored.current.has(j.post_id)).slice(0, 10);
    if (!need.length) return;
    (async () => {
      const site = await getSite();
      for (const j of need) {
        scored.current.add(j.post_id);
        try { const p = await getPost(j.post_id); const sc = seoChecks(p, site); await supabase.from("web_posts").update({ seo: { ...(p.seo || {}), score: sc.score } }).eq("id", p.id); } catch (e) { /* bỏ qua */ }
      }
    })();
  }, [jobs]);
  const openPost = (id) => { try { sessionStorage.setItem("fp_web_open", id); } catch (e) { /* */ } go?.("web_posts"); };
  const test = async (which) => {
    setBusy("t-" + which);
    const d = await authFetch("web-writer", { action: "test", which, key_mode: cfg.key_mode }).catch((e) => ({ error: e.message }));
    setBusy("");
    showToast?.(d?.ok ? { text: which === "fal" ? "Khoá fal.ai dùng được." : `Khoá ${PNAME[providerOf(cfg.model)]} dùng được.` } : { text: "Chưa được: " + (d?.error || "lỗi không rõ"), tone: "red" });
  };
  const saveOwnKey = async () => {
    const r = await saveKeys({ [`${providerOf(cfg.model)}_writer_key`]: ownKey });
    if (!r.ok) return showToast?.({ text: r.error, tone: "red" });
    setOwnKey(""); showToast?.({ text: "Đã lưu khoá riêng cho viết bài." });
  };

  if (err) return <>{top(null, "AI viết bài")}<div style={{ padding: 24 }}><ErrorBox text={err} onRetry={load} /></div></>;
  if (!cfg || !jobs) return <>{top(null, "AI viết bài")}<Loading /></>;

  const capHit = Number(cfg.daily_cap_usd) > 0 && today >= Number(cfg.daily_cap_usd);
  const prov = providerOf(cfg.model);
  const keyShared = keySt[`${prov}_key`]?.set, keyOwn = keySt[`${prov}_writer_key`]?.set;
  const imgP = IMGP.find((x) => x[0] === (cfg.img_provider || "flux")) || IMGP[0];
  const imgKey = keySt[imgP[2]];
  const keyOk = cfg.key_mode === "own" ? keyOwn : keyShared;
  const est = estFor(cfg.model);
  const shownJobs = jobs.filter((j) => fltOf(j, flt));
  const capWarn = Number(cfg.daily_cap_usd) > 0 && !capHit && today >= 0.8 * Number(cfg.daily_cap_usd);
  const rvOn = !!cfg.review_model, rvProv = providerOf(cfg.review_model || "");
  const rvKey = (cfg.key_mode === "own" && keySt[`${rvProv}_writer_key`]?.set) || keySt[`${rvProv}_key`]?.set; // giống máy chủ: khoá riêng nếu có, không thì khoá chung
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(`${todayVN().slice(0, 7)}-15T00:00:00+07:00`); d.setUTCMonth(d.getUTCMonth() - i); return d.toISOString().slice(0, 7); });
  const statC = [
    ["Chi phí tháng này", vndOf(stats.total), `${usd(stats.total)} · chữ ${vnInt(stats.text * rate)} · ảnh ${vnInt(stats.img * rate)}`, <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></>],
    ["Bài AI đã viết", String(stats.n), "bài trong tháng này", <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>],
    ["Trung bình mỗi bài", stats.n ? vndOf(stats.avg) : "—", stats.n ? `${usd(stats.avg)} (cả chữ và ảnh)` : "chưa có bài xong", <path d="M5 20V12M12 20V5M19 20v-9" />],
    ["Đang chờ / đang viết", String(active), "bài đang chạy", <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>],
  ];

  return (
    <>
      {top(<Btn kind="soft" onClick={load} testid="web-ai-reload">↻ Tải lại</Btn>, "AI viết bài", "Viết lần lượt từng bài theo bộ quy tắc rút gọn · xong tự lưu bản nháp")}
      <div data-testid="web-ai" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {statC.map(([t, v, s, ic]) => (
            <Card key={t} style={{ display: "flex", gap: 14, padding: "18px 20px" }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, background: PC.soft, color: PC.softFg, display: "grid", placeItems: "center", flex: "none" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ic}</svg></span>
              <span style={{ minWidth: 0 }}><span style={{ fontSize: 12.5, color: PC.t3 }}>{t}</span><b style={{ display: "block", fontSize: 24, fontWeight: 900, margin: "4px 0 3px" }}>{v}</b><span style={{ fontSize: 12.5, color: PC.t3 }}>{s}</span></span>
            </Card>
          ))}
        </div>
        {capWarn && <div role="status" data-testid="web-ai-cap-warn" style={{ background: "#FFF7ED", color: "#9A3412", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700 }}>Hôm nay đã tốn {usd(today)}, gần chạm trần {usd(cfg.daily_cap_usd)} mỗi ngày ({Math.round((today / Number(cfg.daily_cap_usd)) * 100)}%). Tới trần hàng chờ tự dừng tới 0h.</div>}
        {capHit && active > 0 && <div role="status" style={{ background: "#FEF3C7", color: "#92400E", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700 }} data-testid="web-ai-cap">Hôm nay đã tốn {usd(today)}, chạm trần {usd(cfg.daily_cap_usd)} mỗi ngày → hàng chờ tạm dừng, 0h chạy tiếp (hoặc nâng trần ở bảng dưới).</div>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 330px", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <Card style={card}>
              <h2 style={h2}>Viết bài mới</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={lbl} htmlFor="web-ai-kw">Từ khoá <span style={{ color: "#DC2626" }}>*</span></label>
                  <textarea id="web-ai-kw" data-testid="web-ai-kw" value={kw} onChange={(e) => setKw(e.target.value)} rows={6} placeholder={"Ví dụ:\nthực đơn giảm cân 7 ngày\năn phở có béo không"} style={{ ...inpStyle(150), padding: "10px 12px", resize: "vertical", lineHeight: 1.55 }} />
                  <div style={{ ...sub, marginTop: 6, color: lines.length > 10 ? "#B91C1C" : PC.t3 }}>Mỗi dòng 1 từ khoá = 1 bài, tối đa 10.{lines.length ? ` Đang có ${lines.length}.` : ""}</div>
                </div>
                <div>
                  <label style={lbl} htmlFor="web-ai-cat">Chuyên mục <span style={{ color: "#DC2626" }}>*</span></label>
                  <select id="web-ai-cat" data-testid="web-ai-cat" value={term} onChange={(e) => setTerm(e.target.value)} style={inpStyle()}>
                    <option value="auto">Tự chọn theo từ khoá</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div style={{ ...sub, marginTop: 6 }}>"Tự chọn theo từ khoá": AI xếp từng bài vào chuyên mục hợp nhất.</div>
                  <label style={{ ...lbl, marginTop: 12 }} htmlFor="web-ai-notes">Dặn thêm (không bắt buộc)</label>
                  <textarea id="web-ai-notes" data-testid="web-ai-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ví dụ: viết giọng thân thiện, dễ hiểu, có bảng calo món miền Nam…" style={{ ...inpStyle(80), padding: "10px 12px", resize: "vertical" }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
                <div style={{ flex: 1, background: PC.soft, color: "#1E40AF", borderRadius: 10, padding: "11px 14px", fontSize: 12.5 }} data-testid="web-ai-est">
                  ⓘ Ước tính ~{usd(est.v).replace(" USD", "")} USD tiền chữ{cfg.img_on ? ` + ~${usd(imgEst).replace(" USD", "")} USD tiền ảnh` : ""} mỗi bài {est.real ? `(trung bình thật ${est.real} bài)` : "(chưa đo)"} · mỗi bài khoảng 3–7 phút · xong tự lưu bản nháp
                </div>
                <Btn kind="blue" testid="web-ai-go" disabled={!lines.length || lines.length > 10 || !!busy || !keyOk} onClick={enqueue} style={{ height: 44, padding: "0 26px", fontSize: 14 }} title={keyOk ? "" : `Chưa có khoá ${PNAME[prov]}`}>{busy === "q" ? "Đang xếp…" : `Xếp hàng viết ${lines.length || ""} bài`.replace("  ", " ")}</Btn>
              </div>
            </Card>

            <Card style={card} testid="web-ai-history">
              <h2 style={h2}>Lịch sử &amp; chi phí từng bài</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <select value={ym} onChange={(e) => setYm(e.target.value)} data-testid="web-ai-month" style={{ ...inpStyle(36), width: "auto", fontWeight: 700 }}>
                  {months.map((m) => <option key={m} value={m}>Tháng {m.slice(5)}/{m.slice(0, 4)}</option>)}
                </select>
                <span role="group" aria-label="Lọc theo trạng thái" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {FLT.map(([k, t]) => { const n = jobs.filter((j) => fltOf(j, k)).length; return <button key={k} type="button" data-testid={`web-ai-flt-${k}`} aria-pressed={flt === k} onClick={() => setFlt(k)} style={{ height: 30, padding: "0 12px", borderRadius: 15, border: `1px solid ${flt === k ? "#0062F0" : PC.field}`, background: flt === k ? "#E8F0FF" : "#FFF", color: flt === k ? "#0062F0" : PC.t2, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{t} {n}</button>; })}
                </span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: PC.t2 }}>
                  Trần mỗi ngày <input type="number" min="0" step="0.5" value={cfg.daily_cap_usd} onChange={(e) => setC({ daily_cap_usd: Math.max(0, Number(e.target.value) || 0) })} data-testid="web-ai-cap-input" style={{ ...inpStyle(34), width: 70 }} /> USD
                  <span style={{ width: 8 }} />Tỷ giá 1 USD = <input type="number" min="1000" step="100" value={rate} onChange={(e) => setC({ rate: Math.max(1000, Number(e.target.value) || 26000) })} style={{ ...inpStyle(34), width: 96 }} /> đ
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead><tr>{["Thời gian", "Từ khoá", "Trạng thái", "Token vào / ra", "Chi phí (VNĐ)", "Thao tác"].map((h, i) => <th key={h} style={{ textAlign: i === 3 || i === 4 ? "right" : "left", fontWeight: 700, color: PC.t3, background: PC.headBg, padding: "9px 7px", borderBottom: `1px solid ${PC.headLine}`, fontSize: 11.5 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {!jobs.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: PC.t3 }}>Tháng này chưa viết bài nào.</td></tr>}
                    {jobs.length > 0 && !shownJobs.length && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: PC.t3 }}>Không có bài nào ở mục lọc này.</td></tr>}
                    {shownJobs.map((j) => {
                      let [stName, stTone] = ST[j.status] || ST.queued;
                      if (j.status === "done" && j.post?.status === "published") [stName, stTone] = ["Đã đăng", "green"];
                      if (j.status === "done" && j.post?.status === "scheduled") [stName, stTone] = [`Hẹn ${vnTime(j.post.published_at)}`, "blue"];
                      if (j.status === "done" && j.post?.status === "trash") [stName, stTone] = ["Bài đã xoá", "gray"];
                      const run = OPEN.includes(j.status) && j.status !== "queued";
                      const td = { padding: "9px 7px", borderBottom: `1px solid ${PC.rowLine}`, whiteSpace: "nowrap" };
                      const num = { ...td, textAlign: "right" };
                      const cost = Number(j.cost_text) + Number(j.cost_img);
                      return (
                        <Fragment key={j.id}>
                        <tr data-testid="web-ai-row" data-status={j.status} className="pc-row" onClick={(e) => { if (!e.target.closest("button,a")) setOpenId(openId === j.id ? null : j.id); }} style={{ cursor: "pointer" }} title="Bấm để xem tiến trình">
                          <td style={td}><span style={{ display: "block" }}>{vnTime(j.created_at).slice(0, 5)}</span><span style={{ fontSize: 11, color: PC.t3 }}>{vnTime(j.created_at).slice(6)}</span></td>
                          <td style={{ ...td, whiteSpace: "normal", minWidth: 150 }}><span style={{ display: "flex", gap: 6, alignItems: "flex-start", fontWeight: 700 }}><button type="button" data-testid="web-ai-toggle" aria-expanded={openId === j.id} aria-label="Xem tiến trình" onClick={() => setOpenId(openId === j.id ? null : j.id)} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", color: PC.t3, fontSize: 11, lineHeight: "18px", transform: openId === j.id ? "rotate(90deg)" : "none" }}>▶</button>{j.keyword}</span><span style={{ fontSize: 11.5, color: PC.t3 }}>{cats.find((c) => c.id === j.term_id)?.name || (OPEN.includes(j.status) ? "Tự chọn chuyên mục" : "—")} · {short(j.model)}</span></td>
                          <td style={td} title={j.status === "error" ? j.error || "" : [j.note, (j.warn || []).length ? `Nên xem lại: ${j.warn.join(" · ")}` : ""].filter(Boolean).join("\n")}><Pill tone={stTone}>{run ? "● " : ""}{stName}{j.status === "error" || j.note ? " ⓘ" : ""}</Pill></td>
                          <td style={num} title={j.reused ? `${j.reused} ảnh dùng lại từ thư viện` : ""}>{j.in_tok || j.out_tok ? <><span style={{ display: "block" }}>{kt(j.in_tok)} / {kt(j.out_tok)}</span><span style={{ fontSize: 11, color: PC.t3 }}>{j.searches} tra web · {j.images + j.reused} ảnh</span></> : "–"}</td>
                          <td style={num}>{cost ? <><b style={{ display: "block", fontSize: 13 }}>{vndOf(cost)}</b><span style={{ fontSize: 11, color: PC.t3, display: "block" }}>chữ {vnInt(j.cost_text * rate)}</span><span style={{ fontSize: 11, color: PC.t3, display: "block" }}>ảnh {vnInt(j.cost_img * rate)}</span></> : "–"}</td>
                          <td style={td}><span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                            {j.status === "done" && j.post?.status === "draft" && <button type="button" data-testid="web-ai-publish" disabled={!!busy} onClick={() => publish(j)} style={{ border: 0, background: "none", color: "#15803D", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5}}>{busy === "p-" + j.id ? "Đang đăng…" : "Đăng"}</button>}
                            {j.status === "done" && j.post?.status === "draft" && <button type="button" data-testid="web-ai-schedule" disabled={!!busy} onClick={() => schedule(j)} title={`Hẹn vào giờ đăng trống kế tiếp (${(cfg.sched_times?.length ? cfg.sched_times : ["08:00", "19:00"]).join(", ")})`} style={{ border: 0, background: "none", color: "#1E40AF", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5}}>{busy === "s-" + j.id ? "Đang hẹn…" : "Hẹn giờ"}</button>}
                            {j.status === "done" && j.post?.status === "published" && <a href={`https://fipilotai.com/${j.post.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: PC.softFg, fontWeight: 800, fontSize: 12.5, textDecoration: "none"}}>Xem ↗</a>}
                            {j.status === "done" && j.post_id && j.post?.status !== "trash" && <button type="button" data-testid="web-ai-preview" onClick={() => preview(j)} style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Xem trước</button>}
                            {j.status === "done" && j.post_id && j.post?.status !== "trash" && <button type="button" data-testid="web-ai-relink" disabled={!!busy} onClick={() => relink(j)} title="AI chọn chỗ gắn link nội bộ (không sửa chữ); bài đã đăng thì gắn thêm link từ 1-2 bài cũ cùng chủ đề sang" style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>{busy === "l-" + j.id ? "Đang gắn…" : "Gắn link"}</button>}
                            {j.status === "done" && j.post_id && j.post?.status !== "trash" && <button type="button" className="pc-lnk" data-testid="web-ai-open" onClick={() => openPost(j.post_id)} style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Mở bài ›</button>}
                            {j.status === "error" && <button type="button" data-testid="web-ai-retry" onClick={() => retry(j)} style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Viết lại</button>}
                            {OPEN.includes(j.status) && <button type="button" data-testid="web-ai-cancel" onClick={async () => { if (j.status === "queued" || (await appConfirm("Bài đang viết dở. Huỷ thì phần đã tốn không lấy lại được. Huỷ bài này?"))) cancel(j); }} style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Huỷ</button>}
                          </span></td>
                        </tr>
                        {openId === j.id && <tr><td colSpan={6} style={{ padding: "4px 7px 12px", borderBottom: `1px solid ${PC.rowLine}` }}><JobSteps j={j} /></td></tr>}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  {!!jobs.length && <tfoot><tr style={{ background: "#F5F8FD", fontWeight: 800 }}>
                    <td style={{ padding: "10px 7px" }}>Tổng tháng</td><td style={{ padding: "10px 7px" }}>{jobs.length} bài</td><td />
                    <td style={{ padding: "10px 7px", textAlign: "right" }}><span style={{ display: "block" }}>{kt(stats.tin)} / {kt(stats.tout)}</span><span style={{ fontSize: 11, color: PC.t3, fontWeight: 600 }}>{stats.srch} tra web · {stats.imgs} ảnh</span></td>
                    <td style={{ padding: "10px 7px", textAlign: "right" }}><b style={{ display: "block" }}>{vndOf(stats.total)}</b><span style={{ fontSize: 11, color: PC.t3 }}>{usd(stats.total)}</span></td><td />
                  </tr></tfoot>}
                </table>
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <Card style={card} testid="web-ai-models">
              <h3 style={h3}>Mô hình viết</h3>
              <div role="group" aria-label="Hãng AI viết" style={{ display: "flex", padding: 3, background: "#F1F5F9", borderRadius: 10, marginBottom: 10 }}>
                {PROVIDERS.map((p) => <button key={p.id} type="button" data-testid={`web-ai-prov-${p.id}`} aria-pressed={prov === p.id} onClick={() => prov !== p.id && setC({ model: DEFAULT_MODEL[p.id] })}
                  style={{ flex: 1, height: 32, border: 0, borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, background: prov === p.id ? "#FFF" : "transparent", color: prov === p.id ? PC.softFg : PC.t2, boxShadow: prov === p.id ? "0 1px 3px rgba(15,23,42,.12)" : "none" }}>{PNAME[p.id]}</button>)}
              </div>
              {(AI_MODELS[prov] || []).map((m) => {
                const on = cfg.model === m.id; const p = TEXT_PRICE[m.id] || { in: 0, out: 0 }; const e = estFor(m.id);
                return (
                  <button key={m.id} type="button" data-testid={`web-ai-model-${m.id}`} aria-pressed={on} onClick={() => setC({ model: m.id })}
                    style={{ width: "100%", textAlign: "left", display: "flex", gap: 10, border: `1.5px solid ${on ? "#1A7CFF" : PC.field}`, background: on ? "#F5F9FF" : "#FFF", boxShadow: on ? "0 0 0 3px rgba(26,124,255,.10)" : "none", borderRadius: 12, padding: "11px 12px", marginBottom: 8, cursor: "pointer", fontFamily: "inherit", color: PC.t1 }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", border: on ? "5px solid #0062F0" : "2px solid #CBD5E1", flex: "none", marginTop: 1, boxSizing: "border-box" }} />
                    <span><b style={{ fontSize: 13.5 }}>{prov === "claude" ? "Claude " : ""}{m.name}</b> <Pill tone={BADGE[m.badge] || "gray"}>{m.badge}</Pill>
                      <span style={{ display: "block", fontWeight: 800, fontSize: 12.5, marginTop: 3 }}>${p.in.toFixed(2)} / ${p.out.toFixed(2)} <span style={{ color: PC.t3, fontWeight: 500 }}>(1 triệu token vào / ra)</span></span>
                      <span style={{ display: "block", color: PC.t3, fontSize: 11.5, marginTop: 2 }}>~{usd(e.v)}/bài {e.real ? `(trung bình thật ${e.real} bài)` : "(chưa đo)"}</span></span>
                  </button>
                );
              })}
              <div style={sub}>Cả 3 hãng đều tra web để kiểm số liệu (Claude: web search · Gemini: Google Search · ChatGPT: web search).</div>
            </Card>

            <Card style={card} testid="web-ai-key">
              <h3 style={h3}>Khoá API {PNAME[prov]} <span style={{ marginLeft: "auto" }}><Pill tone={keyOk ? "green" : "red"}>{keyOk ? "✓ Đã có khoá" : "Chưa có khoá"}</Pill></span></h3>
              <Radio on={cfg.key_mode !== "own"} onClick={() => setC({ key_mode: "shared" })} testid="web-ai-key-shared">Dùng chung khoá ở Kết nối AI{keyShared ? ` (••••${keySt[`${prov}_key`].last4})` : ""}</Radio>
              <Radio on={cfg.key_mode === "own"} onClick={() => setC({ key_mode: "own" })} testid="web-ai-key-own">Dùng khoá riêng cho viết bài (để tách tiền)</Radio>
              {cfg.key_mode === "own" && <>
                <input type="password" autoComplete="off" value={ownKey} onChange={(e) => setOwnKey(e.target.value)} data-testid="web-ai-key-input" placeholder={keyOwn ? `Đã cài · ••••${keySt[`${prov}_writer_key`].last4} — dán khoá mới để thay` : { claude: "sk-ant-...", gemini: "AIzaSy...", gpt: "sk-..." }[prov]} style={{ ...inpStyle(), marginTop: 8 }} />
                <div style={{ ...sub, marginTop: 6 }}>Chỉ ghi, không hiện lại khoá đã lưu.</div>
              </>}
              <div style={{ display: "grid", gridTemplateColumns: cfg.key_mode === "own" ? "1fr 1fr" : "1fr", gap: 10, marginTop: 12 }}>
                {cfg.key_mode === "own" && <Btn kind="blue" onClick={saveOwnKey} disabled={!ownKey.trim()} testid="web-ai-key-save">Lưu khoá</Btn>}
                <Btn kind="soft" onClick={() => test("text")} disabled={!!busy || !keyOk} testid="web-ai-key-test" title="Gửi 1 câu rất ngắn (tốn rất ít phí)">{busy === "t-claude" ? "Đang thử…" : "Kiểm tra"}</Btn>
              </div>
            </Card>

            <Card style={card} testid="web-ai-img">
              <h3 style={h3}>Ảnh minh hoạ</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}><span>AI vẽ ảnh cho bài</span><Tog on={!!cfg.img_on} onChange={(v) => setC({ img_on: v })} testid="web-ai-img-on" /></div>
              {cfg.img_on && <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, marginTop: 10 }}><span style={{ whiteSpace: "nowrap" }}>Số ảnh mỗi bài</span>
                  <select value={cfg.img_inline} onChange={(e) => setC({ img_inline: Number(e.target.value) })} data-testid="web-ai-img-count" style={{ ...inpStyle(32), width: "auto", fontWeight: 700 }}>
                    {[[0, "Chỉ ảnh bìa"], [1, "1 bìa + 1 trong bài"], [2, "1 bìa + 2 trong bài"], [3, "1 bìa + 3 trong bài"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, marginTop: 10 }}><span style={{ whiteSpace: "nowrap" }}>AI vẽ</span>
                  <select value={imgP[0]} onChange={(e) => setC({ img_provider: e.target.value })} data-testid="web-ai-img-prov" style={{ ...inpStyle(32), width: "auto", fontWeight: 700 }}>
                    {IMGP.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select></div>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12, color: PC.t3 }}>~{String(IMG_PRICE[imgP[0]]).replace(".", ",")} USD/ảnh<Pill tone={imgKey?.set ? "green" : "red"}>{imgKey?.set ? `Khoá ${imgP[0] === "flux" ? "fal.ai" : PNAME[imgP[0]]} ••••${imgKey.last4}` : `Chưa có khoá ${imgP[0] === "flux" ? "fal.ai" : PNAME[imgP[0]]}`}</Pill></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, marginTop: 10 }}><span>Dùng lại ảnh trong Thư viện trước</span><Tog on={!!cfg.img_reuse} onChange={(v) => setC({ img_reuse: v })} testid="web-ai-img-reuse" /></div>
                <div style={{ ...sub, marginTop: 10 }}>Vẽ theo câu mô tả ở từng ô ảnh: ảnh chụp món Việt thật, ánh sáng tự nhiên, không chữ trên ảnh. Giá ảnh là ước tính (chưa đo). Ảnh nào chưa ưng thì bấm "Vẽ lại" trong trình soạn bài. Bài còn ô ảnh trống thì không đăng được.</div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  {!imgKey?.set && <Btn kind="soft" onClick={() => go?.("ai")} testid="web-ai-fal-link">Nhập khoá ở Kết nối AI ›</Btn>}
                  {imgKey?.set && imgP[0] === "flux" && <Btn kind="soft" onClick={() => test("fal")} disabled={!!busy} testid="web-ai-fal-test">{busy === "t-fal" ? "Đang thử…" : "Kiểm tra khoá fal.ai"}</Btn>}
                </div>
              </>}
            </Card>

            <Card style={card} testid="web-ai-publish-mode">
              <h3 style={h3}>Sau khi viết xong</h3>
              <Radio on={cfg.publish === "draft"} onClick={() => setC({ publish: "draft" })} testid="web-ai-pub-draft">Lưu nháp, tôi xem rồi bấm Đăng</Radio>
              <Radio on={cfg.publish === "auto"} onClick={() => setC({ publish: "auto" })} testid="web-ai-pub-auto">Tự đăng ngay nếu đạt</Radio>
              <Radio on={cfg.publish === "schedule"} onClick={() => setC({ publish: "schedule" })} testid="web-ai-pub-sched">Tự đặt lịch đăng nếu đạt</Radio>
              {cfg.publish === "schedule" && <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 2px 28px", fontSize: 13 }}>
                Giờ đăng mỗi ngày <input data-testid="web-ai-sched-times" defaultValue={(cfg.sched_times || []).join(", ")} onBlur={(e) => setC({ sched_times: e.target.value.split(/[,\s]+/).map((x) => x.trim()).filter((x) => /^\d{1,2}:\d{2}$/.test(x)) })} placeholder="08:00, 19:00" style={{ ...inpStyle(32), width: 130 }} />
              </div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, marginTop: 10 }}><span>Khi đăng: gắn link từ 1-2 bài cũ cùng chủ đề sang bài mới</span><Tog on={cfg.backlinks !== false} onChange={(v) => setC({ backlinks: v })} testid="web-ai-backlinks" /></div>
              <div style={{ ...sub, marginTop: 8 }}>Đạt = có đủ ảnh đại diện, ảnh trong bài, chuyên mục, thẻ, SEO title, mô tả, đoạn trích và không còn ghi chú cần xem lại. Không đạt thì để nháp, rê chuột vào trạng thái để xem thiếu gì. Đặt lịch: mỗi giờ đăng 1 bài, kín giờ hôm nay thì sang hôm sau.</div>
            </Card>

            <Card style={card} testid="web-ai-search">
              <h3 style={h3}>Tra web khi viết</h3>
              <div style={sub}>~{String(SEARCH_PRICE[prov]).replace(".", ",")} USD mỗi lượt ({PNAME[prov]}). Dùng để kiểm số liệu dinh dưỡng trước khi viết.</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 13 }}>
                <span>Tối đa <b>{cfg.searches}</b> lượt mỗi bài</span>
                <span style={{ display: "flex", border: `1px solid ${PC.field}`, borderRadius: 10, overflow: "hidden" }}>
                  <button type="button" aria-label="Bớt 1 lượt" data-testid="web-ai-search-minus" onClick={() => setC({ searches: Math.max(0, cfg.searches - 1) })} style={{ width: 42, height: 36, border: 0, background: "#FFF", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>−</button>
                  <span style={{ width: 56, display: "grid", placeItems: "center", borderLeft: `1px solid ${PC.field}`, borderRight: `1px solid ${PC.field}`, fontWeight: 800 }}>{cfg.searches}</span>
                  <button type="button" aria-label="Thêm 1 lượt" data-testid="web-ai-search-plus" onClick={() => setC({ searches: Math.min(10, cfg.searches + 1) })} style={{ width: 42, height: 36, border: 0, background: "#FFF", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>+</button>
                </span>
              </div>
            </Card>

            <Card style={card} testid="web-ai-review">
              <h3 style={h3}>Soát bài sau khi viết{rvOn && <span style={{ marginLeft: "auto" }}><Pill tone={rvKey ? "green" : "red"}>{rvKey ? `✓ Có khoá ${PNAME[rvProv]}` : `Chưa có khoá ${PNAME[rvProv]}`}</Pill></span>}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}><span>AI soát số liệu và câu văn</span><Tog on={rvOn} onChange={(v) => setC({ review_model: v ? "claude-sonnet-5-5" : "" })} testid="web-ai-review-on" /></div>
              {rvOn && <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, marginTop: 10 }}><span style={{ whiteSpace: "nowrap" }}>Mô hình soát</span>
                  <select value={cfg.review_model} onChange={(e) => setC({ review_model: e.target.value })} data-testid="web-ai-review-model" style={{ ...inpStyle(32), width: "auto", maxWidth: 210, fontWeight: 700 }}>
                    {PROVIDERS.map((p) => <optgroup key={p.id} label={PNAME[p.id]}>{ALL_MODELS.filter((m) => m.p === p.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>)}
                  </select></div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, fontSize: 12, color: PC.t3 }}>~{vndOf(estReview(cfg.review_model, cfg.model))}/bài (ước tính, gồm 1 lượt sửa nếu có lỗi)</div>
                <div style={{ ...sub, marginTop: 8 }}>Đọc bài cùng ghi chú tra cứu và bảng calo của app, tìm: số mâu thuẫn, số không nguồn, lời khuyên không có số, câu văn dịch, gộp sai nhóm đối tượng. Có lỗi thì mô hình viết sửa đúng chỗ rồi mới vẽ ảnh. Khoá lấy theo cách chọn ở "Khoá API" (chung / riêng) của hãng soát.</div>
              </>}
            </Card>

            <Card style={card} testid="web-ai-rules">
              <h3 style={h3}>Bộ quy tắc viết <span style={{ marginLeft: "auto" }}><Pill tone="blue">{RULES_VERSION}{cfg.rules ? " · đã sửa" : ""}</Pill></span></h3>
              <div style={{ fontSize: 11, fontWeight: 800, color: PC.t2, margin: "6px 0 2px" }}>GIỮ</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#334155", lineHeight: 1.7 }}><li>Sapo trả lời ngay, in đậm câu chính</li><li>H2 mở bằng câu trả lời; bảng, danh sách số</li><li>Ô ảnh có mô tả; trích nguồn bằng lời</li><li>Cẩn trọng chủ đề sức khoẻ; đoạn chốt không heading</li></ul>
              <div style={{ fontSize: 11, fontWeight: 800, color: PC.t2, margin: "8px 0 2px" }}>BỎ (cho nhẹ)</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#334155", lineHeight: 1.7 }}><li>Nhật ký 13 bước, đọc sâu top Google</li><li>Vòng tự sửa của AI (máy tự kiểm định dạng thay)</li></ul>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
                <Btn kind="blue" onClick={() => setRulesEd(cfg.rules || RULES_DEFAULT)} testid="web-ai-rules-edit">Xem / sửa</Btn>
                <Btn kind="soft" disabled={!cfg.rules} onClick={async () => { if (await appConfirm("Bỏ phần đã sửa, dùng lại bộ quy tắc gốc?")) setC({ rules: null }); }} testid="web-ai-rules-reset">Về bản gốc</Btn>
              </div>
            </Card>
          </div>
        </div>
      </div>
      {pv && (
        <Modal title={pv.title || "Xem trước bài"} onClose={() => setPv(null)} width={760} testid="web-ai-preview-modal"
          foot={<><Btn kind="light" onClick={() => setPv(null)}>Đóng</Btn><Btn kind="blue" onClick={() => { const id = pv.id; setPv(null); openPost(id); }}>Mở bài để sửa ›</Btn></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, lineHeight: 1.6, color: PC.t1, maxHeight: "62vh", overflowY: "auto" }}>
            {pv.cover_url && <img src={pv.cover_url} alt={pv.cover_alt || ""} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12 }} />}
            {(pv.blocks || []).map((b, i) => {
              if (b.type === "h") return <b key={i} style={{ fontSize: b.level === 2 ? 17 : 15, marginTop: 6 }}>{String(b.text || "").replace(/<[^>]+>/g, "")}</b>;
              if (b.type === "p" || b.type === "quote") return <p key={i} style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: clean(b.html) }} />; // HTML bài đã lọc (chỉ thẻ chữ + link an toàn)
              if (b.type === "list") return <ul key={i} style={{ margin: 0, paddingLeft: 20 }}>{(b.items || []).map((it, k) => <li key={k} dangerouslySetInnerHTML={{ __html: clean(it) }} />)}</ul>;
              if (b.type === "img") return b.url ? <img key={i} src={b.url} alt={b.alt || ""} loading="lazy" style={{ width: "100%", borderRadius: 10 }} /> : <span key={i} style={{ color: "#B91C1C", fontSize: 12.5 }}>[Ô ảnh trống: {b.alt}]</span>;
              if (b.type === "table") return <div key={i} style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", fontSize: 12.5 }}><tbody>{[b.head || [], ...(b.rows || [])].map((r, k) => <tr key={k}>{r.map((c, n) => <td key={n} style={{ border: `1px solid ${PC.rowLine}`, padding: "4px 8px", fontWeight: k ? 400 : 700 }} dangerouslySetInnerHTML={{ __html: clean(c) }} />)}</tr>)}</tbody></table></div>;
              return null;
            })}
          </div>
        </Modal>
      )}
      {rulesEd != null && (
        <Modal title={`Bộ quy tắc viết · ${RULES_VERSION}`} onClose={() => setRulesEd(null)} width={820} testid="web-ai-rules-modal"
          foot={<><Btn kind="light" onClick={() => setRulesEd(null)}>Đóng</Btn><Btn kind="blue" testid="web-ai-rules-save" disabled={!rulesEd.trim()} onClick={async () => { await setC({ rules: rulesEd.trim() === RULES_DEFAULT.trim() ? null : rulesEd }); setRulesEd(null); showToast?.({ text: "Đã lưu bộ quy tắc. Bài xếp hàng sau dùng bản này." }); }}>Lưu</Btn></>}>
          <div style={{ ...sub, marginBottom: 8 }}>Phần khuôn đầu ra (SEO Title, Slug, ô ảnh…) máy tự ghép sau bộ quy tắc để đọc được kết quả, không cần viết ở đây.</div>
          <textarea value={rulesEd} onChange={(e) => setRulesEd(e.target.value)} data-testid="web-ai-rules-text" rows={22} style={{ ...inpStyle(420), padding: 12, fontSize: 12.5, lineHeight: 1.55, resize: "vertical", fontFamily: "ui-monospace, Menlo, monospace" }} />
        </Modal>
      )}
    </>
  );
}

