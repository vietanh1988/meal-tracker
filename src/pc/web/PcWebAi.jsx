// Quản trị PC › WEB · NỘI DUNG › AI viết bài (bản vẽ chốt 19/10, artifact "AI viết bài").
//  - Xếp hàng viết (mỗi dòng 1 từ khoá = 1 bài, tối đa 10) → hàm web-writer chạy LẦN LƯỢT từng bài, mỗi phút 1 bước (pg_cron),
//    xong tự lưu BẢN NHÁP (có ảnh bìa + ảnh trong bài). Đóng trang / tắt máy vẫn chạy.
//  - Cài đặt (lưu ngay khi đổi, bảng web_ai_config chỉ admin đọc): mô hình viết, khoá Claude chung / riêng, ảnh (Flux qua fal.ai,
//    số ảnh, dùng lại ảnh thư viện trước), số lượt tra web, trần tiền mỗi ngày, tỷ giá, bộ quy tắc (sửa / về bản gốc).
//  - Lịch sử & chi phí từng bài theo tháng (giờ VN): token, lượt tra web, ảnh, tiền chữ + tiền ảnh.
import { useCallback, useEffect, useMemo, useState } from "react";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { supabase } from "../../lib/supabase";
import { authFetch } from "../../lib/authFetch";
import { useAiKeys } from "../../lib/aiKeys";
import { todayVN } from "../../lib/dateVN";
import { Btn, Pill, Card, ErrorBox, Loading, vnInt } from "../pcUI";
import { Modal, Tog, inpStyle } from "./webUI";
import { listTerms } from "./webApi";
import { RULES_DEFAULT, RULES_VERSION, cfgOf, TEXT_PRICE, IMG_PRICE, SEARCH_PRICE, estText, providerOf } from "./aiWrite";
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
  images: ["Đang vẽ ảnh", "violet"], saving: ["Đang lưu", "blue"], done: ["Đã lưu nháp", "green"], error: ["Lỗi", "red"], canceled: ["Đã huỷ", "gray"],
};
const OPEN = ["queued", "research", "writing", "fixing", "images", "saving"];
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
        supabase.from("web_ai_jobs").select("id,keyword,term_id,model,status,post_id,in_tok,out_tok,searches,images,reused,cost_text,cost_img,error,created_at,state->warn").gte("created_at", monthStart(ym)).lt("created_at", monthStart(nextMonth(ym))).order("created_at", { ascending: false }),
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
    return { v: estText(model, cfg?.searches ?? 3), real: 0 };
  }, [jobs, cfg?.searches]);
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
                    {jobs.map((j) => {
                      const [stName, stTone] = ST[j.status] || ST.queued;
                      const run = OPEN.includes(j.status) && j.status !== "queued";
                      const td = { padding: "9px 7px", borderBottom: `1px solid ${PC.rowLine}`, whiteSpace: "nowrap" };
                      const num = { ...td, textAlign: "right" };
                      const cost = Number(j.cost_text) + Number(j.cost_img);
                      return (
                        <tr key={j.id} data-testid="web-ai-row" data-status={j.status} className="pc-row">
                          <td style={td}><span style={{ display: "block" }}>{vnTime(j.created_at).slice(0, 5)}</span><span style={{ fontSize: 11, color: PC.t3 }}>{vnTime(j.created_at).slice(6)}</span></td>
                          <td style={{ ...td, whiteSpace: "normal", minWidth: 150 }}><span style={{ display: "block", fontWeight: 700 }}>{j.keyword}</span><span style={{ fontSize: 11.5, color: PC.t3 }}>{cats.find((c) => c.id === j.term_id)?.name || (OPEN.includes(j.status) ? "Tự chọn chuyên mục" : "—")} · {short(j.model)}</span></td>
                          <td style={td} title={j.status === "error" ? j.error || "" : (j.warn || []).length ? `Nên xem lại: ${j.warn.join(" · ")}` : ""}><Pill tone={stTone}>{run ? "● " : ""}{stName}{j.status === "error" ? " ⓘ" : ""}</Pill></td>
                          <td style={num} title={j.reused ? `${j.reused} ảnh dùng lại từ thư viện` : ""}>{j.in_tok || j.out_tok ? <><span style={{ display: "block" }}>{kt(j.in_tok)} / {kt(j.out_tok)}</span><span style={{ fontSize: 11, color: PC.t3 }}>{j.searches} tra web · {j.images + j.reused} ảnh</span></> : "–"}</td>
                          <td style={num}>{cost ? <><b style={{ display: "block", fontSize: 13 }}>{vndOf(cost)}</b><span style={{ fontSize: 11, color: PC.t3, display: "block" }}>chữ {vnInt(j.cost_text * rate)}</span><span style={{ fontSize: 11, color: PC.t3, display: "block" }}>ảnh {vnInt(j.cost_img * rate)}</span></> : "–"}</td>
                          <td style={td}>
                            {j.status === "done" && j.post_id && <button type="button" className="pc-lnk" data-testid="web-ai-open" onClick={() => openPost(j.post_id)} style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Mở bài ›</button>}
                            {j.status === "error" && <button type="button" data-testid="web-ai-retry" onClick={() => retry(j)} style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Viết lại</button>}
                            {OPEN.includes(j.status) && <button type="button" data-testid="web-ai-cancel" onClick={async () => { if (j.status === "queued" || (await appConfirm("Bài đang viết dở. Huỷ thì phần đã tốn không lấy lại được. Huỷ bài này?"))) cancel(j); }} style={{ border: 0, background: "none", color: PC.softFg, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Huỷ</button>}
                          </td>
                        </tr>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, marginTop: 10 }}><span>AI vẽ</span>
                  <select value={imgP[0]} onChange={(e) => setC({ img_provider: e.target.value })} data-testid="web-ai-img-prov" style={{ ...inpStyle(32), width: "auto", fontWeight: 700 }}>
                    {IMGP.map(([v, t]) => <option key={v} value={v}>{t} · ~{String(IMG_PRICE[v]).replace(".", ",")} USD/ảnh</option>)}
                  </select></div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}><Pill tone={imgKey?.set ? "green" : "red"}>{imgKey?.set ? `Khoá ${imgP[0] === "flux" ? "fal.ai" : PNAME[imgP[0]]} ••••${imgKey.last4}` : `Chưa có khoá ${imgP[0] === "flux" ? "fal.ai" : PNAME[imgP[0]]}`}</Pill></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13, marginTop: 10 }}><span>Dùng lại ảnh trong Thư viện trước</span><Tog on={!!cfg.img_reuse} onChange={(v) => setC({ img_reuse: v })} testid="web-ai-img-reuse" /></div>
                <div style={{ ...sub, marginTop: 10 }}>Vẽ theo câu mô tả ở từng ô ảnh: ảnh chụp món Việt thật, ánh sáng tự nhiên, không chữ trên ảnh. Giá ảnh là ước tính (chưa đo). Ảnh nào chưa ưng thì bấm "Vẽ lại" trong trình soạn bài. Bài còn ô ảnh trống thì không đăng được.</div>
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  {!imgKey?.set && <Btn kind="soft" onClick={() => go?.("ai")} testid="web-ai-fal-link">Nhập khoá ở Kết nối AI ›</Btn>}
                  {imgKey?.set && imgP[0] === "flux" && <Btn kind="soft" onClick={() => test("fal")} disabled={!!busy} testid="web-ai-fal-test">{busy === "t-fal" ? "Đang thử…" : "Kiểm tra khoá fal.ai"}</Btn>}
                </div>
              </>}
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

