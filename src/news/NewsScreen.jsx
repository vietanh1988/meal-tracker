// 06/11 (chủ dự án chốt bản vẽ "Màn Tin giảm cân"): mở từ nút Pi › Tin giảm cân. Không Hạt, không chấm đỏ, không nhắc.
// Đầu màn: SubPage "Tin giảm cân" · "{n} bài · đã đọc {k}" + nút tìm 40×40 bo 12 nền #EEF4FF.
// Chip cuộn ngang (cao 34, bo tròn, 13/800): Mới nhất + 6 cụm (số bài mờ 65%); chip đang chọn nền xanh GRAD_BLUE chữ trắng; nhớ tab lần sau.
// Tab Mới nhất: bài mới nhất thẻ to (ảnh cao 180) · còn lại dòng ảnh 72 bo 12 (chủ đề 10.5/800 hoa xanh · tên 14.5/800 tối đa 2 dòng · "dd/mm · N phút đọc" + ✓ Đã đọc), 20 bài mỗi lần.
// Tab cụm: câu giới thiệu · bài ★ "Bắt đầu từ đây" (ảnh trái rộng 120) · 2 ô mở màn app · bài theo nhóm (tên nhóm 17/900 + "N bài").
import { useEffect, useMemo, useRef, useState } from "react";
import { SubPage, GRAD_BLUE, Icon, Skel } from "../mobile/ui";
import { ltCard } from "../theme";
import { track } from "../lib/track";
import { loadNews, readSet, ddmm, searchPosts, catView } from "./newsData";

const SHORT = { "giam-can": "Giảm cân", "co-beo-khong": "Món có béo", "thuc-don": "Thực đơn", "kien-thuc": "Dinh dưỡng", "tap-luyen": "Tập luyện", "thoi-quen": "Thói quen" };
// ô công cụ ở tab cụm → màn của app (không mở web)
export const NEWS_TOOLS = {
  "tinh-calo": ["Mục tiêu calo", "Mức calo của bạn mỗi ngày"],
  "bang-calo": ["Tìm món", "Calo món Việt, ghi vào bữa"],
  "bai-tap": ["Thư viện bài tập", "Mở bài tập trong app"],
  "giao-an": ["Giáo án mẫu", "Chọn giáo án, bắt đầu tập"],
  pi: ["Phòng Pi", "Việc hôm nay của Pi"],
};
const TAB_KEY = "fp_news_tab";
const getTab = () => { try { return localStorage.getItem(TAB_KEY) || "latest"; } catch { return "latest"; } };
const S = (d) => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const TOOL_IC = {
  "tinh-calo": S(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>),
  "bang-calo": S(<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M10 4v16" /></>),
  "bai-tap": S(<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12" />),
  "giao-an": S(<><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>),
  pi: S(<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />),
};
const catLbl = { fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#007AFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const meta = { fontSize: 12, fontWeight: 600, color: "#64748B" };
const Done = () => <span data-testid="news-done" style={{ fontSize: 11, fontWeight: 800, color: "#047857", background: "#ECFDF5", height: 20, padding: "0 7px", borderRadius: 999, display: "inline-flex", alignItems: "center", flexShrink: 0 }}>✓ Đã đọc</span>;
const Img = ({ src, style }) => (src ? <img src={src} alt="" loading="lazy" decoding="async" style={{ objectFit: "cover", background: "#E0EBFF", display: "block", ...style }} /> : <span aria-hidden="true" style={{ background: "#E0EBFF", display: "block", ...style }} />);

function Row({ p, read, onOpen, showCat, names, last }) {
  return (
    <button type="button" data-testid="news-row" data-slug={p.slug} onClick={() => onOpen(p.slug)} className="tap"
      style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", padding: "11px 0", border: "none", borderBottom: last ? "none" : "1px solid #EEF2FA", background: "transparent", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
      <Img src={p.cover} style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0 }} />
      <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        {showCat && p.cat && <span style={catLbl}>{names[p.cat] || ""}</span>}
        <span style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title}</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={meta}>{showCat ? `${ddmm(p.at)} · ` : ""}{p.min} phút đọc</span>{read.has(p.slug) && <Done />}</span>
      </span>
    </button>
  );
}
const List = ({ posts, ...r }) => (
  <div style={{ ...ltCard, margin: "0 12px", padding: "2px 14px" }}>{posts.map((p, i) => <Row key={p.slug} p={p} last={i === posts.length - 1} {...r} />)}</div>
);

export function NewsScreen({ onBack, onOpen, onTool }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState(getTab);
  const [read, setRead] = useState(readSet);
  const [shown, setShown] = useState(20);
  const [q, setQ] = useState(null); // null = không tìm
  const chips = useRef(null);
  const load = () => { setErr(false); loadNews().then(setData).catch(() => setErr(true)); };
  useEffect(() => { load(); track("news_open"); }, []);
  useEffect(() => { const f = () => setRead(readSet()); window.addEventListener("fp-news-read", f); return () => window.removeEventListener("fp-news-read", f); }, []);
  const cats = data?.cats || [];
  const names = useMemo(() => Object.fromEntries(cats.map((c) => [c.slug, c.name])), [cats]);
  const cur = tab !== "latest" && cats.some((c) => c.slug === tab) ? tab : "latest";
  // chip đang chọn luôn nằm trong khung (mở lại ở tab cụm cuối)
  useEffect(() => { const el = chips.current?.querySelector('[aria-selected="true"]'); if (el && chips.current) chips.current.scrollLeft = Math.max(0, el.offsetLeft - 12); }, [cur, data]);
  const pick = (t) => { setTab(t); setShown(20); try { localStorage.setItem(TAB_KEY, t); } catch { /* bỏ qua */ } track("news_tab", { tab: t }); };
  const open = (slug) => { track("news_post", { slug, from: q != null ? "search" : cur }); onOpen(slug); };
  const cv = cur !== "latest" ? catView(data, cur) : null;
  const posts = data?.posts || [];
  const nRead = posts.filter((p) => read.has(p.slug)).length;
  const sub = !data ? "Đang tải…" : cv ? `${cv.name} · ${cv.n} bài` : `${posts.length} bài · đã đọc ${nRead}`;
  const found = q != null ? searchPosts(posts, q) : null;
  const rp = { read, onOpen: open, names };

  return (
    <SubPage title="Tin giảm cân" subtitle={sub} onBack={onBack}
      right={<button type="button" data-testid="news-search" aria-label="Tìm bài" aria-pressed={q != null} onClick={() => setQ((v) => (v == null ? "" : null))}
        style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: q != null ? GRAD_BLUE : "#EEF4FF", color: q != null ? "#FFFFFF" : "#0062F0", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, padding: 0 }}>{q != null ? Icon.close(18) : Icon.search(20)}</button>}>
      <div data-testid="news-screen" style={{ paddingBottom: 40 }}>
        {q != null && (
          <div style={{ padding: "12px 12px 4px" }}>
            <input data-testid="news-search-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ví dụ: phở, đi bộ, bữa tối" aria-label="Tìm bài theo tên"
              style={{ width: "100%", boxSizing: "border-box", height: 44, borderRadius: 12, border: "1.5px solid #DCE7FF", background: "#FFFFFF", padding: "0 14px", fontSize: 16, fontWeight: 600, color: "#0F172A", fontFamily: "inherit", outline: "none" }} />
          </div>
        )}
        {q == null && (
          <div ref={chips} role="tablist" aria-label="Chủ đề" className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 12px 4px", scrollbarWidth: "none" }}>
            {[["latest", "Mới nhất", null], ...cats.map((c) => [c.slug, SHORT[c.slug] || c.name, c.n])].map(([k, t, n]) => (
              <button key={k} type="button" role="tab" aria-selected={cur === k} data-testid={`news-chip-${k}`} onClick={() => pick(k)}
                style={{ flexShrink: 0, height: 34, padding: "0 13px", borderRadius: 999, border: "none", background: cur === k ? GRAD_BLUE : "#FFFFFF", color: cur === k ? "#FFFFFF" : "#475569", fontSize: 13, fontWeight: 800, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                {t}{n != null && <em style={{ fontStyle: "normal", fontWeight: 700, opacity: 0.65 }}>{n}</em>}
              </button>
            ))}
          </div>
        )}
        <div style={{ padding: "10px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {err && !data && (
            <div data-testid="news-error" style={{ ...ltCard, margin: "0 12px", padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
              <b style={{ fontSize: 15 }}>Không tải được bài</b><span style={meta}>Kiểm tra mạng rồi thử lại.</span>
              <button type="button" onClick={load} style={{ height: 40, padding: "0 18px", borderRadius: 12, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 14, fontWeight: 800, fontFamily: "inherit" }}>Thử lại</button>
            </div>
          )}
          {!data && !err && [0, 1, 2, 3].map((k) => (
            <div key={k} style={{ ...ltCard, margin: "0 12px", padding: 12, display: "flex", gap: 12 }}><Skel w={72} h={72} r={12} /><span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}><Skel w="40%" h={10} /><Skel h={14} /><Skel w="70%" h={14} /></span></div>
          ))}

          {found && (found.length ? <List posts={found.slice(0, 40)} showCat {...rp} /> : <span data-testid="news-empty" style={{ ...meta, fontSize: 14, textAlign: "center", padding: "20px 16px" }}>{q.trim() ? "Không thấy bài nào khớp. Thử chữ ngắn hơn." : "Gõ tên món, việc tập… để tìm bài."}</span>)}

          {!found && data && cur === "latest" && posts.length > 0 && (() => {
            const [lead, ...rest] = posts;
            return <>
              <button type="button" data-testid="news-lead" data-slug={lead.slug} onClick={() => open(lead.slug)} className="tap"
                style={{ ...ltCard, margin: "0 12px", padding: 0, overflow: "hidden", border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A", display: "block", width: "calc(100% - 24px)" }}>
                <Img src={lead.cover} style={{ width: "100%", height: 180 }} />
                <span style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}><span style={{ fontSize: 11, fontWeight: 900, color: "#FFFFFF", background: "#007AFF", height: 20, padding: "0 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", flexShrink: 0 }}>Mới</span><span style={catLbl}>{names[lead.cat] || ""}</span></span>
                  <span style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.35 }}>{lead.title}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={meta}>{ddmm(lead.at)} · {lead.min} phút đọc</span>{read.has(lead.slug) && <Done />}</span>
                </span>
              </button>
              {rest.length > 0 && <List posts={rest.slice(0, shown)} showCat {...rp} />}
              {rest.length > shown && <button type="button" data-testid="news-more" onClick={() => setShown((n) => n + 20)} style={{ alignSelf: "center", height: 40, padding: "0 16px", border: "none", background: "transparent", color: "#007AFF", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>Xem thêm bài cũ hơn</button>}
            </>;
          })()}

          {!found && cv && <>
            <span style={{ margin: "0 16px", fontSize: 13.5, lineHeight: 1.5, color: "#475569", fontWeight: 600 }}>{cv.lead}</span>
            {cv.starPost && (
              <button type="button" data-testid="news-star" data-slug={cv.starPost.slug} onClick={() => open(cv.starPost.slug)} className="tap"
                style={{ ...ltCard, margin: "0 12px", width: "calc(100% - 24px)", padding: 0, overflow: "hidden", display: "flex", border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
                <Img src={cv.starPost.cover} style={{ width: 120, minHeight: 110, flexShrink: 0, alignSelf: "stretch" }} />
                <span style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#B45309", background: "#FEF3C7", height: 20, padding: "0 8px", borderRadius: 999, display: "inline-flex", alignItems: "center", alignSelf: "flex-start" }}>★ Bắt đầu từ đây</span>
                  <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.35 }}>{cv.starPost.title}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={meta}>{cv.starPost.min} phút đọc</span>{read.has(cv.starPost.slug) && <Done />}</span>
                </span>
              </button>
            )}
            {(() => { const tl = (cv.tools || []).filter((k) => NEWS_TOOLS[k]).slice(0, 2); return tl.length > 0 && (
              <div style={{ display: "flex", gap: 10, margin: "0 12px" }}>
                {tl.map((k) => (
                  <button key={k} type="button" data-testid={`news-tool-${k}`} onClick={() => { track("news_tool", { k }); onTool(k); }} className="tap"
                    style={{ flex: 1, minWidth: 0, background: "#FFFFFF", borderRadius: 16, border: "none", padding: 12, display: "flex", flexDirection: "column", gap: 6, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
                    <span style={{ width: 36, height: 36, borderRadius: 12, background: "#EEF4FF", color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center" }}>{TOOL_IC[k]}</span>
                    <b style={{ fontSize: 14, fontWeight: 800 }}>{NEWS_TOOLS[k][0]}</b>
                    <span style={{ ...meta, lineHeight: 1.4 }}>{NEWS_TOOLS[k][1]}</span>
                  </button>
                ))}
              </div>
            ); })()}
            {cv.groups.map((g) => (
              <div key={g.name} data-testid="news-group" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 16px 0" }}><b style={{ fontSize: 17, fontWeight: 900 }}>{g.name}</b><span style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>{g.posts.length} bài</span></div>
                <List posts={g.posts} {...rp} />
              </div>
            ))}
          </>}
        </div>
      </div>
    </SubPage>
  );
}
