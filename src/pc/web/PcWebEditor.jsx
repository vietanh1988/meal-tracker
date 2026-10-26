// Quản trị PC › Soạn bài / trang (bản vẽ 138b + 138c), kiểu WordPress Gutenberg:
//  - Thanh định dạng trên cùng: hoàn tác/làm lại · kiểu khối (Đoạn văn, H2–H4, Trích dẫn, Mẹo) · B I U S · màu chữ · tô nền ·
//    căn trái/giữa/phải · danh sách chấm/số · trích dẫn · link (Ctrl+K, tìm bài nội bộ, tab mới, nofollow) · ảnh · video ·
//    bảng · khối calo · hỏi đáp · sửa HTML · dàn ý · toàn màn hình.
//  - Gõ "/" ở dòng trống mở menu chèn khối 4 nhóm. Enter tách đoạn, Backspace ở dòng trống xoá khối. Dán từ Word / Google Docs
//    tự tách tiêu đề, danh sách, bảng; giữ đậm / nghiêng / link.
//  - Cột phải: Đăng bài (trạng thái, hẹn giờ, tác giả, ghim) · Chuyên mục (cha–con, chuyên mục chính) · Thẻ (gợi ý thẻ có sẵn)
//    · Ảnh đại diện (tự WebP) · Đoạn trích · Bài liên quan (tự động / chọn tay).
//  - Dưới bài: SEO (từ khoá, tiêu đề, mô tả, xem trước Google, điểm SEO) · Chia sẻ · Schema · Nâng cao (canonical, index, 301).
//  - Lưu: mỗi lần lưu ghi 1 bản vào Lịch sử (giữ 30 bản). Bản nháp tự lưu lên máy chủ mỗi 60 giây; bài đã đăng chỉ tự lưu trên máy.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PC } from "../../theme";
import { supabase } from "../../lib/supabase";
import { appConfirm } from "../../lib/dialog";
import { Btn, Pill, Card, ErrorBox, Loading, fmtDT, secLbl } from "../pcUI";
import { Check, Tog, Radio, Score, Tabs, Field, Count, SideBox, Modal, Lnk, inpStyle, BLUE } from "./webUI";
import { STATUS, liveStatus, slugify, seoChecks, fullTitle, scoreLabel, wordCount, readMin, headings, images, htmlToBlocks, htmlToBlocksFp, blocksToHtml, clean } from "./webLib";
import { getPost, listTerms, termCounts, createTerm, ensureAuthor, freeSlug, savePost, listRevisions, redirectsTo, searchLinks, listPosts, setStatus, uploadImage, slugType, getSite } from "./webApi";
import { authFetch } from "../../lib/authFetch";
import { BLOCK_GROUPS, BLOCK_NAME, newBlock, isText, withKeys, forSave } from "./blocksMeta";
import { Rich, ListEdit, OtherBlock, Upload, AiDrawBtn, kb, inlineClean, H_STYLE } from "./BlockEdit";
import { PcWebRevisions } from "./PcWebRevisions";
import WEB_CSS from "../../../web/app/globals.css?raw"; // kiểu chữ của web cho Xem trước bản nháp

const WEB = "https://fipilotai.com";
const EMPTY = (kind) => ({ id: null, kind, title: "", slug: "", status: "draft", blocks: [newBlock("p")], excerpt: "", cover_url: "", cover_alt: "", author_id: null, primary_term: null, pinned: false, related: { mode: "auto", ids: [] }, seo: {}, published_at: null, terms: [], template: null });
const LS = (id) => `fp_web_draft_${id || "new"}`;
// datetime-local theo giờ VN ↔ ISO
const toLocal = (iso) => { if (!iso) return ""; const d = new Date(new Date(iso).getTime() + 7 * 3600e3); return d.toISOString().slice(0, 16); };
const fromLocal = (v) => (v ? new Date(`${v}:00+07:00`).toISOString() : null);
const fmtVNdate = (iso) => new Date(iso || Date.now()).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "short", year: "numeric" });
const REASON = { autosave: "Tự lưu", draft: "Lưu nháp", update: "Cập nhật", publish: "Đăng", restore: "Khôi phục", replace: "Thay thế", import: "Nhập bài", ai: "AI viết" };

const TI = ({ t, on, title, onClick, testid, w }) => <button type="button" title={title} aria-label={title} data-testid={testid} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="pc-btn" style={{ minWidth: w || 28, height: 30, padding: "0 6px", borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 13, fontWeight: 800, color: on ? BLUE : PC.t2, background: on ? "#E8F1FF" : "transparent", whiteSpace: "nowrap", border: 0, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>;
const Sep = () => <span style={{ width: 1, height: 20, background: PC.line, margin: "0 4px", flexShrink: 0 }} />;

export function PcWebEditor({ top, id, kind = "post", user, appSettings, showToast, onBack }) {
  const [post, setPost] = useState(null);
  const [site, setSite] = useState(null); // tên web + mẫu tiêu đề (Cài đặt SEO) → độ dài tiêu đề Google thật
  useEffect(() => { getSite().then(setSite); }, []);
  const [err, setErr] = useState("");
  const [cats, setCats] = useState([]);
  const [tags, setTags] = useState([]);
  const [tc, setTc] = useState({});
  const [authors, setAuthors] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [revCount, setRevCount] = useState(0);
  const [cur, setCur] = useState(-1);         // khối đang sửa (-1 = chưa chọn)
  const [slash, setSlash] = useState(null);   // { i, q, hi }
  const [link, setLink] = useState(null);     // { range, q, res, url, newTab, nofollow }
  const [htmlEdit, setHtmlEdit] = useState(false);
  const [mode, setMode] = useState("visual"); // Trực quan / HTML (cả bài)
  const [htmlText, setHtmlText] = useState("");
  const [outline, setOutline] = useState(false);
  const [full, setFull] = useState(false);
  const [side, setSide] = useState(0);
  const [seoTab, setSeoTab] = useState(0);
  const [revs, setRevs] = useState(null);
  const [slugEdit, setSlugEdit] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [redirs, setRedirs] = useState([]);
  const [reuse, setReuse] = useState([]);    // web_blocks: khối dùng lại + mẫu bài
  const els = useRef({});
  const color = useRef(null);
  const postRef = useRef(null);
  postRef.current = post;
  const noun = kind === "page" ? "trang" : "bài viết";

  // Tải bài + chuyên mục / thẻ / tác giả
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const [p, c, t, n, a, ps] = await Promise.all([id ? getPost(id) : Promise.resolve(EMPTY(kind)), listTerms("category"), listTerms("tag"), termCounts(), ensureAuthor(appSettings, user?.id), listPosts("post")]);
        if (off) return;
        let start = { ...p, blocks: withKeys(p.blocks?.length ? p.blocks : [newBlock("p")]) };
        if (!start.author_id && a[0]) start.author_id = a[0].id;
        try { const bk = JSON.parse(localStorage.getItem(LS(id)) || "null"); if (bk && new Date(bk.at) > new Date(p.updated_at || 0) && (await appConfirm(`Có bản đang soạn dở lưu trên máy lúc ${fmtDT(bk.at)} (mới hơn bản trên máy chủ). Mở bản đó?`))) { start = { ...bk.post, blocks: withKeys(bk.post.blocks) }; setDirty(true); } } catch (e) { /* */ }
        setPost(start); setCats(c); setTags(t); setTc(n); setAuthors(a); setAllPosts(ps.filter((x) => x.id !== id && x.status !== "trash"));
        setSlugTouched(!!id);
        supabase.from("web_blocks").select("id,name,kind,blocks").order("name").then(({ data }) => !off && setReuse(data || []));
        if (id) { listRevisions(id).then((r) => setRevCount(r.length)).catch(() => {}); redirectsTo(`/${p.slug}`).then(setRedirs).catch(() => {}); }
      } catch (e) { if (!off) setErr("Chưa mở được bài. " + (e.message || "")); }
    })();
    return () => { off = true; };
  }, [id, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const [relinking, setRelinking] = useState(false);
  const upd = useCallback((patch) => { setPost((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) })); setDirty(true); }, []);
  const setSeo = (patch) => upd((p) => ({ seo: { ...(p.seo || {}), ...patch } }));
  const setBlock = useCallback((i, patch) => upd((p) => ({ blocks: p.blocks.map((b, k) => (k === i ? { ...b, ...patch } : b)) })), [upd]);
  const insertAt = (i, bl, focus = true) => { const list = Array.isArray(bl) ? bl : [bl]; upd((p) => { const b = [...p.blocks]; b.splice(i, 0, ...list); return { blocks: b }; }); if (focus) focusBlock(list[list.length - 1]._k, false); setCur(i + list.length - 1); };
  // Xoá khối: giữ lại để "Hoàn tác" trong 10 giây (chỉ khối có nội dung)
  const [undoDel, setUndoDel] = useState(null); // { i, b }
  const undoT = useRef(null);
  const removeAt = (i) => { const b = postRef.current?.blocks[i]; const has = b && (b.type !== "p" || String(b.html || "").replace(/<[^>]+>/g, "").trim()); upd((p) => ({ blocks: p.blocks.length > 1 ? p.blocks.filter((_, k) => k !== i) : [newBlock("p")] })); if (has) { setUndoDel({ i, b }); clearTimeout(undoT.current); undoT.current = setTimeout(() => setUndoDel(null), 10000); } };
  const undoRemove = () => { if (!undoDel) return; const { i, b } = undoDel; upd((p) => { const l = [...p.blocks]; l.splice(Math.min(i, l.length), 0, b); return { blocks: l }; }); setCur(i); setUndoDel(null); };
  // Kéo thả ảnh từ máy vào thân bài → tải lên (WebP) và chèn khối ảnh sau khối đang chọn
  const [dropOn, setDropOn] = useState(false);
  const dropFiles = async (files) => {
    const fs = [...(files || [])].filter((f) => /^image\//.test(f.type)); if (!fs.length) return;
    showToast?.(`Đang tải ${fs.length} ảnh…`);
    let at = (cur >= 0 ? cur : postRef.current.blocks.length - 1) + 1;
    for (const f of fs) { try { const r = await uploadImage(f, f.name.replace(/\.\w+$/, ""), { uid: user?.id }); insertAt(at++, { ...newBlock("img"), url: r.url, width: r.width, height: r.height }, false); } catch (e) { showToast?.(`${f.name}: ${e.message || "chưa tải được"}`); } }
    showToast?.("Đã chèn ảnh — nhớ điền mô tả ảnh (alt).");
  };
  const move = (i, d) => upd((p) => { const b = [...p.blocks]; const j = i + d; if (j < 0 || j >= b.length) return {}; [b[i], b[j]] = [b[j], b[i]]; return { blocks: b }; });
  // Đặt con trỏ vào khối ngay sau khi vẽ xong (gõ nhanh sau Enter vẫn vào đúng dòng mới)
  const pend = useRef(null);
  useLayoutEffect(() => { const p = pend.current; if (p && els.current[p.k]) { pend.current = null; focusNow(p.k, p.start); } });
  const focusBlock = (k, start) => { pend.current = { k, start }; }; // luôn đi kèm 1 lần đổi state → useLayoutEffect đặt con trỏ
  const focusNow = (k, start) => { const el = els.current[k]; if (!el) return; el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(!!start); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); };

  // Tự đặt đường dẫn theo tiêu đề cho bài mới (đến khi anh sửa tay)
  useEffect(() => { if (post && !slugTouched) { const s = slugify(post.title).slice(0, 80); if (s !== post.slug) setPost((p) => ({ ...p, slug: s })); } }, [post?.title, slugTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bản dự phòng trên máy (mỗi lần sửa, chậm 1,5 giây)
  useEffect(() => { if (!dirty || !post) return; const t = setTimeout(() => { try { localStorage.setItem(LS(post.id), JSON.stringify({ at: new Date().toISOString(), post: { ...post, blocks: forSave(post.blocks) } })); } catch (e) { /* */ } }, 1500); return () => clearTimeout(t); }, [post, dirty]);

  const fullRef = useRef(null); // ở chế độ HTML: lưu theo ô HTML
  const inflight = useRef(null); // lần lưu đang chạy — tự lưu bỏ qua, lưu tay chờ xong rồi mới lưu
  const doSave = useCallback(async (mode) => {
    if (inflight.current) { if (mode === "auto") return; await inflight.current.catch(() => {}); }
    let done; inflight.current = new Promise((r) => { done = r; });
    try { await saveNowRef.current(mode); } finally { inflight.current = null; done(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const saveNow = async (mode) => {
    const snap = postRef.current; // gõ thêm trong lúc lưu → postRef đổi → giữ cờ "chưa lưu"
    const p = fullRef.current ? fullRef.current() : postRef.current; if (!p) return;
    if (!p.title.trim()) { showToast?.("Nhập tiêu đề trước đã."); return; }
    if (p.seo?.schema_bad) { if (mode !== "auto") showToast?.("Mã schema riêng (tab Schema) đang sai — sửa cho hợp lệ hoặc xoá trống rồi lưu."); return; }
    // Chặn đăng khi còn ô ảnh trống (khối ảnh chưa có ảnh); bài AI viết còn bắt buộc có ảnh bìa
    if (mode === "publish") {
      const empty = (p.blocks || []).filter((b) => b?.type === "img" && !b.url).length;
      const noCover = p.kind !== "page" && p.seo?.ai && !p.cover_url;
      if (empty || noCover) { showToast?.(`Chưa đăng được: ${[empty && `còn ${empty} ô ảnh trống`, noCover && "chưa có ảnh đại diện"].filter(Boolean).join(", ")}. Chọn ảnh, bấm ✦ Vẽ bằng AI hoặc xoá ô ảnh rồi đăng.`); return; }
    }
    let status = p.status, published_at = p.published_at;
    if (mode === "draft") status = "draft";
    if (mode === "publish") { if (published_at && new Date(published_at) > new Date()) status = "scheduled"; else { status = "published"; published_at = published_at || new Date().toISOString(); } }
    setSaving(mode);
    try {
      const slug = await freeSlug(p.slug || p.title, p.id);
      if (slug !== p.slug && p.slug) showToast?.(`Đường dẫn “${p.slug}” đã có bài khác dùng → đổi thành “${slug}”.`);
      const saved = await savePost({ ...p, slug, status, published_at, blocks: forSave(p.blocks) }, { reason: mode === "auto" ? "autosave" : mode === "draft" ? "draft" : p.status === "published" ? "update" : "publish", uid: user?.id });
      try { localStorage.removeItem(LS(p.id)); localStorage.removeItem(LS(null)); } catch (e) { /* */ }
      const same = postRef.current === snap;
      setPost((cur) => ({ ...cur, id: saved.id, slug: same ? saved.slug : cur.slug, status: saved.status, published_at: saved.published_at, updated_at: saved.updated_at, seo: { ...(cur.seo || {}), score: saved.seo?.score } }));
      setSlugTouched(true); if (same) setDirty(false); setSavedAt(new Date()); setRevCount((n) => Math.min(30, n + 1));
      if (mode !== "auto") showToast?.(mode === "draft" ? "Đã lưu nháp." : status === "scheduled" ? `Đã hẹn giờ đăng ${fmtDT(published_at)}.` : p.status === "published" ? "Đã cập nhật. Web đổi theo trong khoảng 1 phút." : "Đã đăng. Web hiện bài trong khoảng 1 phút.");
    } catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setSaving("");
  };
  const saveNowRef = useRef(saveNow); saveNowRef.current = saveNow;

  // Bản nháp tự lưu lên máy chủ mỗi 60 giây
  const dirtyRef = useRef(false); dirtyRef.current = dirty;
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);
  useEffect(() => { const t = setInterval(() => { const p = postRef.current; if (p && p.status === "draft" && p.id && dirtyRef.current) doSave("auto"); }, 60000); return () => clearInterval(t); }, [doSave]);
  useEffect(() => { const h = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, []);

  // Phím tắt: Ctrl+S lưu, Ctrl+K link
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); doSave(postRef.current?.status === "published" || postRef.current?.status === "scheduled" ? "publish" : "draft"); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openLink(); }
      if (e.key === "Escape") { setSlash(null); setLink(null); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Xem trước bản nháp / bản đang sửa: mở tab mới, chữ theo kiểu chữ của web (globals.css), không cần đăng
  const previewDraft = (p) => {
    const w = window.open("", "_blank"); if (!w) return showToast?.("Trình duyệt chặn cửa sổ mới — cho phép popup rồi bấm lại.");
    const e = (x) => String(x || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const body = blocksToHtml(forSave(p.blocks || [])).replace(/<!--[\s\S]*?-->/g, "");
    w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Xem trước: ${e(p.title)}</title><style>${WEB_CSS}</style><style>body{background:#F3F6FB;font-family:-apple-system,"system-ui",Inter,"Segoe UI",Roboto,Arial,sans-serif}.pv-bar{position:sticky;top:0;z-index:5;background:#FFFBEB;border-bottom:1px solid #FDE68A;color:#92400E;font-size:13px;padding:10px 16px;text-align:center}</style></head><body><div class="pv-bar">Bản xem trước — chưa đăng lên web · đóng tab này để quay lại soạn</div><main class="wrap" style="padding-top:40px;padding-bottom:60px;max-width:820px"><h1 class="h1" style="margin-bottom:18px">${e(p.title)}</h1>${p.cover_url ? `<img src="${e(p.cover_url)}" alt="" style="width:100%;border-radius:16px;margin-bottom:24px">` : ""}<article class="card art" style="padding:40px"><div class="prose">${body}</div></article></main></body></html>`);
    w.document.close();
  };
  const back = async () => { if (dirty && !(await appConfirm("Có thay đổi chưa lưu. Vẫn quay lại danh sách?", { danger: true }))) return; onBack(); };

  // ===== Định dạng chữ =====
  const exec = (cmd, v) => { document.execCommand(cmd, false, v); const b = postRef.current?.blocks[cur]; const el = b && els.current[b._k]; el?.dispatchEvent(new Event("input", { bubbles: true })); };
  const setType = (t) => {
    const b = post.blocks[cur]; if (!b) return;
    const html = b.type === "h" ? b.text : b.type === "list" ? (b.items || []).join("<br>") : b.html || "";
    const nb = t.startsWith("h") ? { _k: b._k, type: "h", level: +t[1], text: inlineClean(html), align: b.align } : t === "list" || t === "olist" ? { _k: b._k, type: "list", ordered: t === "olist", items: html.split(/<br\s*\/?>/).map((x) => x.trim()).filter(Boolean).length ? html.split(/<br\s*\/?>/).map((x) => x.trim()).filter(Boolean) : [""] } : { _k: b._k, type: t, html, align: b.align };
    upd((p) => ({ blocks: p.blocks.map((x, k) => (k === cur ? nb : x)) }));
    focusBlock(b._k, false);
  };
  const curB = post?.blocks[cur];
  const typeVal = !curB ? "p" : curB.type === "h" ? `h${curB.level || 2}` : curB.type === "list" ? (curB.ordered ? "olist" : "list") : curB.type;
  const openLink = () => {
    const s = window.getSelection(); if (!s || !s.rangeCount) return showToast?.("Bôi đen chữ cần gắn link trước.");
    const range = s.getRangeAt(0).cloneRange();
    const a = (range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)?.closest?.("a");
    setLink({ range, q: range.toString(), res: [], url: a?.getAttribute("href") || "", newTab: a?.target === "_blank", nofollow: /nofollow/.test(a?.rel || "") });
  };
  useEffect(() => { if (!link) return; const t = setTimeout(() => { if ((link.q || "").trim().length >= 2) searchLinks(link.q).then((res) => setLink((l) => (l ? { ...l, res } : l))).catch(() => {}); }, 250); return () => clearTimeout(t); }, [link?.q]); // eslint-disable-line react-hooks/exhaustive-deps
  const applyLink = (url) => {
    const L = link; if (!L || !url) return;
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(L.range);
    const host = (L.range.commonAncestorContainer.nodeType === 1 ? L.range.commonAncestorContainer : L.range.commonAncestorContainer.parentElement)?.closest?.(".web-rich");
    host?.focus(); s.removeAllRanges(); s.addRange(L.range);
    if (L.range.collapsed) document.execCommand("insertHTML", false, `<a href="${url.replace(/"/g, "&quot;")}">${(L.q || url).replace(/</g, "&lt;")}</a>`);
    else document.execCommand("createLink", false, url);
    host?.querySelectorAll(`a[href="${CSS.escape(url)}"]`).forEach((a) => { if (L.newTab) a.target = "_blank"; else a.removeAttribute("target"); const rel = [L.newTab && "noopener", L.nofollow && "nofollow"].filter(Boolean).join(" "); if (rel) a.rel = rel; else a.removeAttribute("rel"); });
    host?.dispatchEvent(new Event("input", { bubbles: true }));
    setLink(null);
  };

  // Trực quan ⇄ HTML: khối thường thành thẻ HTML, khối riêng (calo, hỏi đáp, hộp app…) thành dòng <!-- fp {…} --> để giữ nguyên
  const switchMode = (m) => {
    if (m === mode) return;
    if (m === "html") { setHtmlText(blocksToHtml(forSave(post.blocks))); setSlash(null); setLink(null); setMode("html"); return; }
    const bl = htmlToBlocksFp(htmlText, (h) => new DOMParser().parseFromString(h, "text/html"));
    upd({ blocks: withKeys(bl.length ? bl : [newBlock("p")]) }); setMode("visual"); setCur(-1);
  };
  fullRef.current = () => (mode === "html" ? { ...postRef.current, blocks: withKeys(htmlToBlocksFp(htmlText, (h) => new DOMParser().parseFromString(h, "text/html"))) } : postRef.current);

  // ===== Phím trong khối chữ =====
  const onKey = (i) => (e) => {
    const b = post.blocks[i]; const el = e.currentTarget;
    if (slash && slash.i === i) {
      const opts = slashOpts(slash.q);
      if (e.key === "ArrowDown") { e.preventDefault(); return setSlash({ ...slash, hi: Math.min(opts.length - 1, slash.hi + 1) }); }
      if (e.key === "ArrowUp") { e.preventDefault(); return setSlash({ ...slash, hi: Math.max(0, slash.hi - 1) }); }
      if (e.key === "Enter") { e.preventDefault(); if (opts[slash.hi]) pickSlash(opts[slash.hi][0]); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && b.type !== "list") {
      e.preventDefault();
      const s = window.getSelection(); const r = s.getRangeAt(0); const after = document.createRange(); after.setStart(r.endContainer, r.endOffset); after.setEnd(el, el.childNodes.length);
      const div = document.createElement("div"); div.appendChild(after.extractContents());
      const rest = div.innerHTML.replace(/^(<br>)+|(<br>)+$/g, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      const nb = { ...newBlock("p"), html: rest };
      insertAt(i + 1, nb, false); focusBlock(nb._k, true);
    }
    if (e.key === "Backspace" && !el.textContent && !el.querySelector("img") && post.blocks.length > 1 && (b.type !== "list" || (b.items || []).length <= 1)) {
      e.preventDefault(); const prev = post.blocks[i - 1]; removeAt(i); setCur(Math.max(0, i - 1)); if (prev) focusBlock(prev._k, false);
    }
  };
  const onText = (i, field) => (v) => {
    setBlock(i, { [field]: v });
    const b = postRef.current.blocks[i]; const txt = v.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
    if (b.type === "p" && /^\/[^/]{0,24}$/.test(txt) && slashOpts(txt.slice(1)).length) setSlash({ i, q: txt.slice(1), hi: 0 }); else if (slash?.i === i) setSlash(null);
  };
  const GROUPS = [...BLOCK_GROUPS, ...(reuse.some((r) => r.kind === "block") ? [["KHỐI DÙNG LẠI", reuse.filter((r) => r.kind === "block").map((r) => [`ref:${r.id}`, "♻", r.name, `${slugify(r.name).replace(/-/g, " ")} khoi dung lai`])]] : [])];
  const mk = (t) => (t.startsWith("ref:") ? { _k: newBlock("p")._k, type: "ref", id: t.slice(4), name: reuse.find((r) => r.id === t.slice(4))?.name || "" } : newBlock(t));
  const slashOpts = (q) => { const s = slugify(q).replace(/-/g, " "); return GROUPS.flatMap(([, l]) => l).filter(([, , name, kw]) => !s || kw.includes(s) || slugify(name).replace(/-/g, " ").includes(s)); };
  const pickSlash = (t) => { const i = slash.i; const nb = mk(t); upd((p) => ({ blocks: p.blocks.map((x, k) => (k === i ? nb : x)) })); setSlash(null); setCur(i); focusBlock(nb._k, false); };
  const insertBlock = (t) => { const nb = newBlock(t); const b = post.blocks[cur]; const empty = b && b.type === "p" && !String(b.html || "").replace(/<[^>]+>/g, "").trim(); if (empty) { upd((p) => ({ blocks: p.blocks.map((x, k) => (k === cur ? nb : x)) })); focusBlock(nb._k, false); } else insertAt(cur + 1, nb); };

  // Dán: nhiều đoạn (Word / Google Docs) → tách khối; 1 đoạn → giữ đậm / nghiêng / link
  const onPaste = (i) => (e) => {
    const html = e.clipboardData.getData("text/html"); const text = e.clipboardData.getData("text/plain");
    e.preventDefault();
    if (html && /<(p|h[1-6]|li|table|blockquote)\b/i.test(html)) {
      const bl = withKeys(htmlToBlocks(html, (h) => new DOMParser().parseFromString(h, "text/html")));
      if (bl.length > 1) { const b = post.blocks[i]; const empty = b.type === "p" && !String(b.html || "").replace(/<[^>]+>/g, "").trim(); upd((p) => { const arr = [...p.blocks]; arr.splice(empty ? i : i + 1, empty ? 1 : 0, ...bl); return { blocks: arr }; }); showToast?.(`Đã dán ${bl.length} khối, giữ định dạng.`); return; }
      if (bl.length === 1 && (bl[0].html || bl[0].text)) { document.execCommand("insertHTML", false, inlineClean(bl[0].html || bl[0].text)); return; }
    }
    if (html) document.execCommand("insertHTML", false, inlineClean(html));
    else document.execCommand("insertText", false, text);
  };


  if (err) return <>{top(<Btn kind="light" onClick={onBack}>‹ Danh sách</Btn>, kind === "page" ? "Sửa trang" : "Sửa bài viết")}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!post) return <>{top(null, kind === "page" ? "Sửa trang" : "Sửa bài viết")}<Loading /></>;

  const sc = seoChecks({ ...post, blocks: post.blocks }, site);
  const words = wordCount(post.blocks), hs = headings(post.blocks), imgs = images(post.blocks);
  const [stName, stTone] = STATUS[liveStatus(post)] || STATUS.draft;
  const isLive = post.status === "published" || post.status === "scheduled";
  const sub = saving ? "Đang lưu…" : dirty ? "Có thay đổi chưa lưu · Ctrl+S để lưu" : savedAt ? `Đã lưu lúc ${savedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}${revCount ? ` · Bản sửa thứ ${revCount}` : ""}` : post.id ? `Sửa lần cuối ${fmtDT(post.updated_at)}${revCount ? ` · ${revCount} bản trong lịch sử` : ""}` : `${kind === "page" ? "Trang" : "Bài"} mới · chưa lưu`;
  const catTree = [...cats.filter((c) => !c.parent_id), ...[]].flatMap((c) => [c, ...cats.filter((x) => x.parent_id === c.id).map((x) => ({ ...x, _sub: true }))]);
  const tagOn = tags.filter((t) => post.terms.includes(t.id));
  const seoTitle = fullTitle(post, site);
  const seoDesc = post.seo?.desc || post.excerpt || "";

  // Lịch sử bản sửa (138m): màn so sánh thay chỗ trình soạn, về lại không mất gì
  if (revs) return <PcWebRevisions top={top} revs={revs} post={fullRef.current ? fullRef.current() : post} termName={(id) => [...cats, ...tags].find((t) => t.id === id)?.name} onBack={() => setRevs(null)} onRestore={(sn) => { /* chỉ khôi phục nội dung — giữ trạng thái, đường dẫn, ngày đăng */ setMode("visual"); setPost((p) => ({ ...p, title: sn.title ?? p.title, excerpt: sn.excerpt ?? null, cover_url: sn.cover_url ?? null, cover_alt: sn.cover_alt ?? null, seo: { ...(sn.seo || {}) }, blocks: withKeys(sn.blocks || []), terms: sn.terms || p.terms })); setDirty(true); setRevs(null); showToast?.("Đã mở lại bản cũ. Bấm Cập nhật / Lưu nháp để lưu."); }} />;

  return (
    <div className={full ? "web-full" : ""}>
      {top(
        <span style={{ display: "flex", gap: 8 }}>
          <Btn kind="light" onClick={back} title="Về danh sách (hỏi nếu còn thay đổi chưa lưu)" testid="web-ed-back">‹ Danh sách</Btn>
          <Btn kind="light" disabled={!post.id} onClick={async () => setRevs(await listRevisions(post.id))} testid="web-ed-history">↶ Lịch sử</Btn>
          <Btn kind="light" title={post.status === "published" ? "Mở bài trên fipilotai.com" : "Xem trước bản đang soạn (chưa cần đăng) — dàn trang gần giống web"} onClick={() => (post.status === "published" && !dirty ? window.open(`${WEB}/${post.slug}`, "_blank", "noopener") : previewDraft(fullRef.current ? fullRef.current() : post))} testid="web-ed-preview">Xem trước ↗</Btn>
          <Btn kind="soft" disabled={!!saving} title={isLive ? "Chuyển bài về bản nháp (gỡ khỏi web)" : "Lưu, chưa đăng"} onClick={async () => { if (isLive && !(await appConfirm("Bài đang hiện trên web. Lưu nháp sẽ gỡ bài khỏi web cho tới khi bấm Đăng lại. Tiếp tục?"))) return; doSave("draft"); }} testid="web-ed-draft">{saving === "draft" ? "Đang lưu…" : "Lưu nháp"}</Btn>
          <Btn kind="blue" disabled={!!saving} onClick={() => doSave("publish")} testid="web-ed-publish">{saving === "publish" ? "Đang lưu…" : isLive ? "Cập nhật" : post.published_at && new Date(post.published_at) > new Date() ? "Hẹn giờ đăng" : "Đăng"}</Btn>
        </span>, post.id ? (kind === "page" ? "Sửa trang" : "Sửa bài viết") : (kind === "page" ? "Trang mới" : "Viết bài mới"), sub)}
      <div style={{ display: "flex", alignItems: "stretch", minHeight: "calc(100vh - 64px)" }}>
        <div style={{ flex: 1, minWidth: 0, padding: "22px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Khung 1 · Tiêu đề + đường dẫn (bản vẽ 138b2, kiểu WordPress) */}
          <Card style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".06em" }}>{kind === "page" ? "TÊN TRANG" : "TIÊU ĐỀ BÀI VIẾT"}</span><span style={{ fontSize: 11.5, color: PC.t4 }}>Tiêu đề hiện trên trang (H1) · <Count n={post.title.length} max={70} min={20} /></span></span>
            <textarea value={post.title} onChange={(e) => upd({ title: e.target.value.replace(/\n/g, " ") })} placeholder={kind === "page" ? "Tên trang" : "Thêm tiêu đề bài viết"} rows={1} data-testid="web-ed-title" className="web-title web-titlebox" style={{ minHeight: 60, borderRadius: 12, border: `1.5px solid ${PC.field}`, background: "#FFF", padding: "12px 18px", fontSize: 26, fontWeight: 900, lineHeight: 1.25, outline: "none", resize: "none", fontFamily: "inherit", color: PC.t1, fieldSizing: "content", boxSizing: "border-box", width: "100%" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
              <b style={{ color: PC.t2, fontSize: 12.5, whiteSpace: "nowrap" }}>Đường dẫn</b>
              <span style={{ flex: "0 1 auto", height: 34, borderRadius: 10, border: `1px solid ${slugEdit ? "#1A7CFF" : PC.field}`, boxShadow: slugEdit ? "0 0 0 3px rgba(26,124,255,.12)" : "none", display: "inline-flex", alignItems: "center", overflow: "hidden", background: "#FFF", minWidth: 0 }}>
                <span style={{ height: "100%", padding: "0 10px", display: "inline-flex", alignItems: "center", background: "#F8FAFC", borderRight: `1px solid ${PC.field}`, color: PC.t3, flexShrink: 0 }}>fipilotai.com/</span>
                {slugEdit ? <input autoFocus value={post.slug} onChange={(e) => { setSlugTouched(true); upd({ slug: slugType(e.target.value) }); }} onBlur={() => { setSlugEdit(false); if (post.slug !== slugify(post.slug)) upd({ slug: slugify(post.slug) }); }} onKeyDown={(e) => e.key === "Enter" && setSlugEdit(false)} data-testid="web-ed-slug" style={{ height: "100%", border: 0, outline: "none", padding: "0 12px", width: 320, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, fontSize: 12.5, color: PC.t1 }} />
                  : <span data-testid="web-ed-slug-view" style={{ padding: "0 12px", fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, color: post.slug ? PC.t1 : PC.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.slug || "tu-dong-theo-tieu-de"}</span>}
              </span>
              {!slugEdit && <Btn kind="light" onClick={() => setSlugEdit(true)} title={post.status === "published" ? "Đổi đường dẫn bài đã đăng: web tự chuyển hướng 301 từ link cũ" : "Sửa đường dẫn (mặc định tự lấy từ tiêu đề)"} style={{ height: 30, fontSize: 12 }} testid="web-ed-slug-edit">Sửa</Btn>}
              {isLive && <Lnk onClick={() => window.open(`${WEB}/${post.slug}`, "_blank", "noopener")}>Xem ↗</Lnk>}
              <span style={{ marginLeft: "auto", fontSize: 11.5, lineHeight: 1.4, color: PC.t3, textAlign: "right", minWidth: 120 }}>{isLive ? "Đổi link bài đã đăng → tự chuyển 301" : slugTouched ? "Đã sửa tay" : "Tự lấy từ tiêu đề"}</span>
            </div>
          </Card>
          {/* Khung 2 · Nội dung bài */}
          <Card style={{ padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${PC.headLine}` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".06em" }}>{kind === "page" ? "NỘI DUNG TRANG" : "NỘI DUNG BÀI"}</span>
              {/* Thao tác khối đang chọn (thay thanh nổi trên khối — không che chữ) */}
              <span style={{ marginLeft: 14, display: "flex", alignItems: "center", gap: 1, padding: "0 4px", borderRadius: 8, background: curB ? "#F1F5F9" : "transparent", opacity: curB ? 1 : 0.4, pointerEvents: curB ? "auto" : "none" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: PC.t3, padding: "0 6px", whiteSpace: "nowrap" }}>{curB ? (curB.type === "h" ? `H${curB.level || 2}` : BLOCK_NAME[curB.type]) : "Khối"}</span>
                <TI t="↑" title="Đưa khối lên" onClick={() => { if (cur > 0) { move(cur, -1); setCur(cur - 1); } }} /><TI t="↓" title="Đưa khối xuống" onClick={() => { if (cur < post.blocks.length - 1) { move(cur, 1); setCur(cur + 1); } }} />
                <TI t="⧉" title="Nhân đôi khối" onClick={() => insertAt(cur + 1, { ...JSON.parse(JSON.stringify(curB)), _k: newBlock("p")._k })} />
                <TI t="🗑" title="Xoá khối" testid="web-blk-del" onClick={() => { removeAt(cur); setCur(Math.max(0, cur - 1)); }} />
              </span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 2, marginRight: 8 }}><TI t="☷" title="Dàn ý" on={outline} onClick={() => setOutline(!outline)} /><TI t="⛶" title="Toàn màn hình" on={full} onClick={() => setFull(!full)} /></span>
              <span role="tablist" style={{ display: "inline-flex", padding: 3, borderRadius: 10, background: "#F1F5F9", gap: 2 }}>{[["visual", "Trực quan"], ["html", "HTML"]].map(([m, t]) => <button key={m} type="button" role="tab" aria-selected={mode === m} data-testid={`web-ed-mode-${m}`} onClick={() => switchMode(m)} style={{ height: 26, padding: "0 12px", borderRadius: 8, border: 0, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 800, background: mode === m ? "#FFF" : "transparent", color: mode === m ? BLUE : PC.t3, boxShadow: mode === m ? "0 1px 3px rgba(15,23,42,.12)" : "none" }}>{t}</button>)}</span>
            </div>
            {/* Thanh định dạng */}
            <div style={{ position: "sticky", top: 64, zIndex: 8, display: "flex", alignItems: "center", flexWrap: "nowrap", overflowX: "auto", gap: 1, padding: "6px 10px", borderBottom: `1px solid ${PC.headLine}`, background: "#FBFCFE", opacity: mode === "html" ? 0.45 : 1, pointerEvents: mode === "html" ? "none" : "auto" }}>
              <TI t="↶" title="Hoàn tác" onClick={() => exec("undo")} /><TI t="↷" title="Làm lại" onClick={() => exec("redo")} /><Sep />
              <select value={typeVal} onChange={(e) => setType(e.target.value)} disabled={!curB || !(isText(curB) || curB.type === "list")} aria-label="Kiểu khối" data-testid="web-ed-type" className="pc-input" style={{ width: 104, height: 30, padding: "0 6px 0 10px", borderRadius: 7, border: `1px solid ${PC.line}`, background: "#FFF", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}>
                {[["p", "Đoạn văn"], ["h2", "Tiêu đề H2"], ["h3", "Tiêu đề H3"], ["h4", "Tiêu đề H4"], ["quote", "Trích dẫn"], ["tip", "Hộp mẹo"], ["list", "Danh sách chấm"], ["olist", "Danh sách số"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                {curB && !(isText(curB) || curB.type === "list") && <option value={typeVal}>{BLOCK_NAME[curB.type]}</option>}
              </select><Sep />
              <TI t={<b>B</b>} title="Đậm (Ctrl+B)" onClick={() => exec("bold")} testid="web-ed-bold" /><TI t={<i style={{ fontFamily: "Georgia,serif" }}>I</i>} title="Nghiêng (Ctrl+I)" onClick={() => exec("italic")} /><TI t={<u>U</u>} title="Gạch chân" onClick={() => exec("underline")} /><TI t={<s>S</s>} title="Gạch ngang" onClick={() => exec("strikeThrough")} />
              <TI t={<span>A<span style={{ display: "block", height: 3, width: 14, background: "#E11D48", borderRadius: 2, marginTop: -2 }} /></span>} title="Màu chữ" onClick={() => color.current?.click()} />
              <input ref={color} type="color" defaultValue="#E11D48" onChange={(e) => exec("foreColor", e.target.value)} style={{ width: 0, height: 0, opacity: 0, border: 0, padding: 0 }} aria-hidden="true" tabIndex={-1} />
              <TI t={<span style={{ background: "#FEF08A", padding: "0 4px", borderRadius: 3 }}>ab</span>} title="Tô nền" onClick={() => exec("hiliteColor", "#FEF08A")} /><Sep />
              {[["left", "≡", "Căn trái"], ["center", "☰", "Căn giữa"]].map(([a, t, l]) => <TI key={a} t={t} title={l} on={(curB?.align || "left") === a && !!curB && isText(curB)} onClick={() => curB && isText(curB) && setBlock(cur, { align: a === "left" ? undefined : a })} />)}
              <TI t="⋮≡" title="Danh sách chấm" on={typeVal === "list"} onClick={() => setType(typeVal === "list" ? "p" : "list")} /><TI t="1≡" title="Danh sách số" on={typeVal === "olist"} onClick={() => setType(typeVal === "olist" ? "p" : "olist")} /><TI t="❝" title="Trích dẫn" on={typeVal === "quote"} onClick={() => setType(typeVal === "quote" ? "p" : "quote")} /><Sep />
              <TI t="🔗" title="Chèn link (Ctrl+K)" onClick={openLink} testid="web-ed-link" /><TI t="🖼" title="Ảnh" onClick={() => insertBlock("img")} /><TI t="▶" title="Video YouTube" onClick={() => insertBlock("youtube")} /><TI t="▦" title="Bảng" onClick={() => insertBlock("table")} /><TI t="🍜" title="Khối calo món" onClick={() => insertBlock("calo")} testid="web-ed-calo" /><TI t="?" title="Hỏi đáp FAQ" onClick={() => insertBlock("faq")} /><Sep />
              <TI t="</>" title="Sửa HTML khối đang chọn" on={htmlEdit} onClick={() => setHtmlEdit(!htmlEdit)} />
            </div>
            {/* Thân bài: cao tối thiểu như vùng soạn của WordPress; bấm vào chỗ trống phía dưới = viết tiếp ở cuối bài */}
            <div data-testid="web-ed-body" onDragOver={(e) => { if (mode === "visual" && [...(e.dataTransfer?.types || [])].includes("Files")) { e.preventDefault(); setDropOn(true); } }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDropOn(false); }} onDrop={(e) => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); setDropOn(false); dropFiles(e.dataTransfer.files); }} onMouseDown={(e) => { if (mode !== "visual" || e.target !== e.currentTarget) return; const bs = e.currentTarget.querySelectorAll("[data-testid=web-ed-block]"); if (bs.length && e.clientY < bs[bs.length - 1].getBoundingClientRect().bottom) return; e.preventDefault(); const last = post.blocks[post.blocks.length - 1]; if (last && last.type === "p" && !String(last.html || "").replace(/<[^>]+>/g, "").trim()) { setCur(post.blocks.length - 1); focusBlock(last._k, false); } else { const nb = newBlock("p"); insertAt(post.blocks.length, nb, false); focusBlock(nb._k, true); } }}
              style={{ padding: "30px 40px 40px 40px", minHeight: "max(560px, calc(100vh - 380px))", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18, position: "relative", cursor: mode === "visual" ? "text" : "auto", ...(dropOn ? { boxShadow: "inset 0 0 0 2px #1A7CFF", background: "#F5F9FF" } : {}) }}>
              {undoDel && <div data-testid="web-ed-undo" style={{ position: "sticky", top: 112, zIndex: 7, alignSelf: "center", display: "flex", alignItems: "center", gap: 12, background: "#0F172A", color: "#FFF", borderRadius: 10, padding: "8px 14px", fontSize: 13, boxShadow: "0 8px 24px rgba(15,23,42,.25)" }}>Đã xoá khối {BLOCK_NAME[undoDel.b.type] || ""}<button type="button" onMouseDown={(e) => e.preventDefault()} onClick={undoRemove} style={{ border: 0, background: "none", color: "#93C5FD", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Hoàn tác</button></div>}
              {dropOn && <div style={{ position: "sticky", top: 112, zIndex: 7, alignSelf: "center", background: BLUE, color: "#FFF", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}>Thả ảnh vào đây — tự nén WebP và chèn vào bài</div>}
              {mode === "html" && <textarea value={htmlText} onChange={(e) => { setHtmlText(e.target.value); setDirty(true); }} spellCheck={false} data-testid="web-ed-html" style={{ minHeight: 520, borderRadius: 10, border: `1px solid ${PC.field}`, padding: "12px 14px", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5, lineHeight: 1.65, color: PC.t1, resize: "vertical", outline: "none", fieldSizing: "content" }} />}
              {mode === "visual" && !post.id && reuse.some((r) => r.kind === "template") && post.blocks.length === 1 && post.blocks[0].type === "p" && !String(post.blocks[0].html || "").replace(/<[^>]+>/g, "").trim() && (
                <div data-testid="web-ed-tpl" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12.5, color: PC.t3 }}>Bắt đầu từ mẫu:
                  {reuse.filter((r) => r.kind === "template").map((r) => <Btn key={r.id} kind="soft" style={{ height: 28, fontSize: 12 }} onClick={() => upd({ blocks: withKeys(r.blocks.map((x) => ({ ...x }))) })}>{r.name}</Btn>)}
                </div>
              )}
              {mode === "visual" && post.blocks.map((b, i) => {
                const on = i === cur;
                const common = { elRef: (el) => { els.current[b._k] = el; }, onFocus: () => { setCur(i); }, onKeyDown: onKey(i), onPaste: onPaste(i) };
                let body;
                if (htmlEdit && on && (isText(b) || b.type === "list")) {
                  const v = b.type === "h" ? b.text : b.type === "list" ? (b.items || []).map((x) => `<li>${x}</li>`).join("\n") : b.html;
                  body = <textarea value={v || ""} onChange={(e) => setBlock(i, b.type === "h" ? { text: e.target.value } : b.type === "list" ? { items: [...e.target.value.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]) } : { html: e.target.value })} onBlur={(e) => b.type !== "list" && setBlock(i, b.type === "h" ? { text: clean(e.target.value) } : { html: clean(e.target.value) })} className="pc-input" style={{ ...inpStyle(120), height: 120, padding: 10, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12.5 }} />;
                } else if (b.type === "p") body = <Rich {...common} html={b.html} onChange={onText(i, "html")} placeholder={i === 0 && post.blocks.length === 1 ? "Viết nội dung… gõ “/” để chèn khối" : "Gõ “/” để chèn khối"} style={{ textAlign: b.align }} testid="web-ed-p" />;
                else if (b.type === "h") body = <Rich {...common} html={b.text} onChange={onText(i, "text")} placeholder={`Tiêu đề H${b.level || 2}`} style={{ ...H_STYLE[b.level || 2], textAlign: b.align }} testid="web-ed-h" />;
                else if (b.type === "quote") body = <Rich {...common} html={b.html} onChange={onText(i, "html")} placeholder="Trích dẫn…" style={{ borderLeft: `4px solid ${BLUE}`, paddingLeft: 16, fontStyle: "italic", color: PC.t2, textAlign: b.align }} />;
                else if (b.type === "tip") body = <Rich {...common} html={b.html} onChange={onText(i, "html")} placeholder="Mẹo / lưu ý…" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 14px", fontSize: 15, textAlign: b.align }} />;
                else if (b.type === "list") body = <ListEdit {...common} b={b} set={(patch) => setBlock(i, patch)} />;
                else if (b.type === "ref") { const r = reuse.find((x) => x.id === b.id); body = (
                  <div data-testid="web-ed-ref" onClick={() => setCur(i)} style={{ borderRadius: 14, border: "1.5px solid #C7D2FE", background: "#EEF2FF", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, fontWeight: 800, color: "#4338CA", letterSpacing: ".04em" }}>♻ KHỐI DÙNG LẠI</span><b style={{ fontSize: 13.5 }}>{r?.name || b.name || "Khối đã xoá"}</b>
                      <span style={{ marginLeft: "auto" }}>{r && <Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => { const copy = withKeys(r.blocks.map((x) => ({ ...x }))); upd((p) => ({ blocks: [...p.blocks.slice(0, i), ...copy, ...p.blocks.slice(i + 1)] })); showToast?.("Đã tách — phần này giờ sửa riêng trong bài."); }} testid="web-ed-ref-detach">Tách khỏi khối dùng lại</Btn>}</span></span>
                    <span style={{ fontSize: 12.5, color: PC.t3 }}>{r ? `${r.blocks.length} khối · ${r.blocks.map((x) => BLOCK_NAME[x.type] || x.type).join(", ")} — sửa ở Quản trị › Khối dùng lại, mọi bài dùng khối tự đổi theo.` : "Khối này đã bị xoá — trên web phần này không hiện. Bấm 🗑 trên thanh khối để bỏ."}</span>
                  </div>); }
                else body = <div onFocus={() => setCur(i)} onClick={() => setCur(i)}><OtherBlock b={b} set={(patch) => setBlock(i, patch)} showToast={showToast} slug={post.slug} postId={post.id} /></div>;
                return (
                  <div key={b._k} data-testid="web-ed-block" data-type={b.type} style={{ position: "relative", borderRadius: 10, padding: "6px 10px", margin: "-6px -10px", boxShadow: on ? "inset 0 0 0 1.5px #1A7CFF" : "none" }} onMouseDown={() => setCur(i)}>
                    {body}
                    {slash && slash.i === i && (
                      <div data-testid="web-ed-slash" style={{ position: "absolute", left: 10, top: "100%", marginTop: 4, width: 600, background: "#FFF", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,.18)", border: `1px solid ${PC.line}`, padding: 8, zIndex: 9, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
                        {(() => { const opts = slashOpts(slash.q); let n = -1; return GROUPS.map(([g, l]) => { const ls = l.filter((x) => opts.includes(x)); if (!ls.length) return null; return (
                          <div key={g} style={{ display: "flex", flexDirection: "column", gap: 1 }}><span style={{ fontSize: 10.5, fontWeight: 800, color: PC.t4, letterSpacing: ".06em", padding: "6px 8px 2px" }}>{g}</span>
                            {ls.map(([t, ic, name]) => { n++; const hi = n === slash.hi; return <button key={t} type="button" data-testid={`web-slash-${t.startsWith("ref:") ? "ref" : t}`} onMouseDown={(e) => { e.preventDefault(); pickSlash(t); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderRadius: 8, background: hi ? PC.rowSel : "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}><span style={{ width: 26, height: 26, borderRadius: 7, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{ic}</span><b style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</b></button>; })}
                          </div>); }); })()}
                        {!slashOpts(slash.q).length && <span style={{ padding: 8, fontSize: 12.5, color: PC.t4 }}>Không có khối “{slash.q}”</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              {mode === "visual" && <button type="button" onClick={() => insertAt(post.blocks.length, newBlock("p"))} data-testid="web-ed-add" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 10, color: PC.t4, fontSize: 14, border: 0, background: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}><span style={{ width: 28, height: 28, borderRadius: 8, background: BLUE, color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>+</span>Thêm khối</button>}
              {link && (
                <div data-testid="web-ed-linkpop" style={{ position: "fixed", left: "50%", top: 160, transform: "translateX(-50%)", width: 420, background: "#FFF", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,.22)", border: `1px solid ${PC.line}`, padding: 10, zIndex: 30, display: "flex", flexDirection: "column", gap: 8 }}>
                  <input autoFocus value={link.url || link.q} onChange={(e) => setLink({ ...link, q: e.target.value, url: /^(https?:|\/|mailto:|tel:)/.test(e.target.value) ? e.target.value : "" })} onKeyDown={(e) => e.key === "Enter" && applyLink(link.url || link.res[0]?.url)} placeholder="Tìm bài trong web hoặc dán link https://…" data-testid="web-ed-link-q" className="pc-input" style={inpStyle(34)} />
                  {link.res.length > 0 && <span style={{ fontSize: 11, fontWeight: 800, color: PC.t3 }}>BÀI & TRANG CỦA WEB</span>}
                  {link.res.map((r) => <button key={r.url} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyLink(r.url)} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 8, border: 0, background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}><span style={{ fontSize: 13 }}>{r.icon}</span><span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><b style={{ fontSize: 12.5 }}>{r.t}</b><span style={{ fontSize: 11, color: PC.t4 }}>{r.url}</span></span></button>)}
                  <span style={{ display: "flex", gap: 14, fontSize: 12, alignItems: "center", borderTop: `1px solid ${PC.headLine}`, paddingTop: 8 }}>
                    <Check on={link.newTab} onChange={(v) => setLink({ ...link, newTab: v })} label="Mở tab mới" /><Check on={link.nofollow} onChange={(v) => setLink({ ...link, nofollow: v })} label="nofollow" />
                    <Btn kind="light" style={{ marginLeft: "auto", height: 28, fontSize: 12 }} onClick={() => { const s = window.getSelection(); s.removeAllRanges(); s.addRange(link.range); exec("unlink"); setLink(null); }}>Gỡ link</Btn>
                    <Btn kind="blue" style={{ height: 28, fontSize: 12 }} disabled={!(link.url || link.res[0])} onClick={() => applyLink(link.url || link.res[0]?.url)} testid="web-ed-link-ok">Chèn link</Btn>
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "9px 16px", borderTop: `1px solid ${PC.headLine}`, background: "#FBFCFE", borderRadius: "0 0 14px 14px", fontSize: 12, color: PC.t3, flexWrap: "wrap" }}>
              <span data-testid="web-ed-words"><b style={{ color: PC.t2 }}>{words.toLocaleString("vi-VN")}</b> chữ</span><span>{readMin(words)} phút đọc</span><span>{hs.filter((h) => h.level === 2).length} tiêu đề H2</span><span>{imgs.length} ảnh</span>
              <span style={{ color: PC.t4 }}>Gõ “/” chèn khối · Ctrl+K chèn link · Ctrl+S lưu</span>
              <span style={{ marginLeft: "auto", color: saving ? PC.t3 : dirty ? "#B45309" : "#15803D", fontWeight: 700 }}>{saving ? "Đang lưu…" : dirty ? "● Có thay đổi chưa lưu" : savedAt ? `✓ Đã lưu lúc ${savedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : post.id ? `✓ Đã lưu · ${fmtDT(post.updated_at)}` : "Chưa lưu"}</span>
            </div>
          </Card>
          {outline && <Card style={{ padding: 16 }}><span style={secLbl}>DÀN Ý BÀI</span><div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>{post.blocks.map((b, i) => b.type === "h" ? <button key={b._k} type="button" onClick={() => { setCur(i); els.current[b._k]?.scrollIntoView({ block: "center" }); }} style={{ textAlign: "left", border: 0, background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, paddingLeft: ((b.level || 2) - 2) * 18, color: PC.t1 }}>H{b.level || 2} · {b.text.replace(/<[^>]+>/g, "") || "(trống)"}</button> : null)}{!hs.length && <span style={{ fontSize: 12.5, color: PC.t4 }}>Bài chưa có tiêu đề H2 / H3.</span>}</div></Card>}

          {/* SEO · Chia sẻ · Schema · Nâng cao */}
          <Card testid="web-ed-seo">
            <Tabs items={["SEO", "Chia sẻ", "Schema", "Nâng cao"]} on={seoTab} onChange={setSeoTab} testid="web-seo-tab" />
            {seoTab === 0 && (
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Từ khoá chính" hint="Từ khoá phụ (tối đa 4, cách nhau dấu phẩy) gõ ở ô dưới"><input value={post.seo?.keyword || ""} onChange={(e) => setSeo({ keyword: e.target.value })} placeholder="VD: phở bò bao nhiêu calo" data-testid="web-seo-kw" className="pc-input" style={inpStyle()} /></Field>
                  <input value={(post.seo?.keywords || []).join(", ")} onChange={(e) => setSeo({ keywords: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4) })} placeholder="Từ khoá phụ: phở bò calo, ăn phở giảm cân" className="pc-input" style={inpStyle()} />
                  <Field label={<span style={{ display: "flex", justifyContent: "space-between" }}>Tiêu đề SEO<Count n={seoTitle.length} max={60} min={30} /></span>} hint="Để trống: dùng tiêu đề bài + “| Fipilot AI”"><input value={post.seo?.title || ""} onChange={(e) => setSeo({ title: e.target.value })} placeholder={seoTitle} data-testid="web-seo-title" className="pc-input" style={inpStyle()} /></Field>
                  <Field label={<span style={{ display: "flex", justifyContent: "space-between" }}>Mô tả<Count n={seoDesc.length} max={160} min={120} /></span>} hint="Để trống: dùng đoạn trích"><textarea value={post.seo?.desc || ""} onChange={(e) => setSeo({ desc: e.target.value })} placeholder="1–2 câu trả lời thẳng câu hỏi của người tìm, có từ khoá" data-testid="web-seo-desc" className="pc-input" style={{ ...inpStyle(70), height: 70, padding: "8px 12px", resize: "vertical", lineHeight: 1.5 }} /></Field>
                  <GooglePreview slug={post.slug} title={seoTitle} desc={seoDesc} date={post.published_at} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }} data-testid="web-seo-score">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Score n={sc.score} big /><span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15 }}>Điểm SEO: {scoreLabel(sc.score)}</b><span style={{ fontSize: 12, color: PC.t3 }}>Đạt {sc.ok}/{sc.total} mục · còn {sc.total - sc.ok} gợi ý</span></span></div>
                  {sc.list.map((x) => <span key={x.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}><span style={{ width: 18, height: 18, borderRadius: 9, background: x.ok ? "#DCFCE7" : "#FEF3C7", color: x.ok ? "#15803D" : "#B45309", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{x.ok ? "✓" : "!"}</span>{x.text}</span>)}
                </div>
              </div>
            )}
            {seoTab === 1 && (
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label="Tiêu đề khi chia sẻ (Facebook, Zalo)" hint="Để trống: dùng tiêu đề SEO"><input value={post.seo?.og_title || ""} onChange={(e) => setSeo({ og_title: e.target.value })} placeholder={seoTitle} className="pc-input" style={inpStyle()} /></Field>
                  <Field label="Ảnh chia sẻ (nên 1200 × 630)" hint="Để trống: dùng ảnh đại diện"><span style={{ display: "flex", gap: 8 }}><input value={post.seo?.og_image || ""} onChange={(e) => setSeo({ og_image: e.target.value })} placeholder="https://…" className="pc-input" style={inpStyle()} /><Upload showToast={showToast} name={`${post.slug}-chia-se`} label="Tải ảnh" onDone={(r) => setSeo({ og_image: r.url })} /></span></Field>
                </div>
                <div style={{ borderRadius: 12, border: `1px solid ${PC.line}`, overflow: "hidden", alignSelf: "flex-start" }}>
                  {post.seo?.og_image || post.cover_url ? <img src={post.seo?.og_image || post.cover_url} alt="" style={{ width: "100%", aspectRatio: "1.91", objectFit: "cover", display: "block" }} /> : <span style={{ display: "block", aspectRatio: "1.91", background: "#EEF4FF" }} />}
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", background: "#F8FAFC" }}><span style={{ fontSize: 11, color: PC.t4 }}>FIPILOTAI.COM</span><b style={{ fontSize: 14 }}>{post.seo?.og_title || seoTitle}</b><span style={{ fontSize: 12, color: PC.t3 }}>{seoDesc.slice(0, 110)}</span></span>
                </div>
              </div>
            )}
            {seoTab === 2 && <SchemaTab post={post} setSeo={setSeo} kind={kind} />}
            {seoTab === 3 && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
                <Field label="Đường dẫn chuẩn (canonical)" hint="Để trống = tự trỏ về chính bài (https, không www, không dấu / cuối)"><input value={post.seo?.canonical || ""} onChange={(e) => setSeo({ canonical: e.target.value.trim() })} placeholder={`${WEB}/${post.slug}`} className="pc-input" style={inpStyle()} /></Field>
                <Field label="Cho Google">
                  <span style={{ display: "flex", gap: 18 }}><Radio name="idx" on={!post.seo?.noindex} onChange={() => setSeo({ noindex: false })} label="Lập chỉ mục (index)" /><Radio name="idx" on={!!post.seo?.noindex} onChange={() => setSeo({ noindex: true })} label="Không lập chỉ mục (noindex)" testid="web-seo-noindex" /></span>
                  <span style={{ display: "flex", gap: 18, marginTop: 6 }}><Radio name="fol" on={!post.seo?.nofollow} onChange={() => setSeo({ nofollow: false })} label="Theo link (follow)" /><Radio name="fol" on={!!post.seo?.nofollow} onChange={() => setSeo({ nofollow: true })} label="Không theo link (nofollow)" /></span>
                </Field>
                <Field label="Khác"><span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Tog on={!post.seo?.sitemap_off} onChange={(v) => setSeo({ sitemap_off: !v })} label="Hiện trong sitemap.xml" />
                  <Tog on={!post.seo?.hide_updated} onChange={(v) => setSeo({ hide_updated: !v })} label="Hiện ngày cập nhật trên bài" />
                </span></Field>
                <Field label="Đường dẫn cũ đã chuyển về bài này (301)" hint="Tự thêm khi anh đổi đường dẫn bài đã đăng">
                  <span style={{ borderRadius: 10, border: `1px solid ${PC.line}`, overflow: "hidden" }}>{redirs.length ? redirs.map((r, i) => <span key={r.src} style={{ display: "flex", padding: "8px 12px", fontSize: 12.5, borderTop: i ? `1px solid ${PC.rowLine}` : "none", fontFamily: "ui-monospace, Menlo, monospace" }}>{r.src}<span style={{ marginLeft: "auto", color: PC.t3, fontFamily: "inherit" }}>→ bài này · {r.code} · {r.hits} lượt</span></span>) : <span style={{ display: "block", padding: "8px 12px", fontSize: 12.5, color: PC.t4 }}>Chưa có</span>}</span>
                </Field>
              </div>
            )}
          </Card>
        </div>

        {/* Cột phải */}
        <aside style={{ width: 300, flexShrink: 0, background: "#FFFFFF", borderLeft: `1px solid ${PC.line}` }}>
          <div style={{ display: "flex", borderBottom: `1px solid ${PC.headLine}` }}>{[kind === "page" ? "Trang" : "Bài viết", "Khối"].map((t, i) => <button key={t} type="button" onClick={() => setSide(i)} style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: 13, fontWeight: 800, color: i === side ? BLUE : PC.t3, border: 0, background: "none", borderBottom: `2px solid ${i === side ? BLUE : "transparent"}`, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}</div>
          {side === 1 ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
              {curB ? <><b style={{ fontSize: 14 }}>{curB.type === "h" ? `Tiêu đề H${curB.level || 2}` : BLOCK_NAME[curB.type]}</b>
                {curB.type === "h" && <Field label="Mã neo (link tới mục này)" hint={`fipilotai.com/${post.slug}#${curB.id || slugify(String(curB.text || "").replace(/<[^>]+>/g, "")) || "…"}`}><input value={curB.id || ""} onChange={(e) => setBlock(cur, { id: slugify(e.target.value) || undefined })} placeholder="tự tạo theo tiêu đề" className="pc-input" style={inpStyle(32)} /></Field>}
                {isText(curB) && <Field label="Căn chữ"><span style={{ display: "flex", gap: 6 }}>{[["left", "Trái"], ["center", "Giữa"], ["right", "Phải"]].map(([a, l]) => <Btn key={a} kind={(curB.align || "left") === a ? "soft" : "light"} style={{ height: 28, fontSize: 12 }} onClick={() => setBlock(cur, { align: a === "left" ? undefined : a })}>{l}</Btn>)}</span></Field>}
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => { move(cur, -1); setCur(Math.max(0, cur - 1)); }}>↑ Lên</Btn><Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => { move(cur, 1); setCur(Math.min(post.blocks.length - 1, cur + 1)); }}>↓ Xuống</Btn><Btn kind="danger" style={{ height: 28, fontSize: 12 }} onClick={() => { removeAt(cur); setCur(Math.max(0, cur - 1)); }}>Xoá khối</Btn></span>
                <span style={{ color: PC.t4 }}>Khối {cur + 1} / {post.blocks.length}</span></> : <span style={{ color: PC.t4 }}>Bấm vào 1 khối trong bài để chỉnh.</span>}
            </div>
          ) : <>
            <SideBox t={kind === "page" ? "Đăng trang" : "Đăng bài"} testid="web-side-publish">
              <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span style={{ color: PC.t3 }}>Trạng thái</span><Pill tone={stTone}>{stName}</Pill></span>
              <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span style={{ color: PC.t3 }}>Hiển thị</span><b style={{ fontWeight: 700 }}>Công khai</b></span>
              <DateRow value={post.published_at} onChange={(v) => upd({ published_at: v })} />
              {authors.length > 0 && <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}><span style={{ color: PC.t3 }}>Tác giả</span><select value={post.author_id || ""} onChange={(e) => upd({ author_id: e.target.value || null })} aria-label="Tác giả" style={{ border: 0, background: "none", fontWeight: 700, fontSize: 12.5, fontFamily: "inherit", textAlign: "right", cursor: "pointer", color: PC.t1, padding: 0 }}>{authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></span>}
              {authors.some((a) => a.is_reviewer) && <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}><span style={{ color: PC.t3 }}>Kiểm duyệt</span><select value={post.reviewer_id || ""} onChange={(e) => upd({ reviewer_id: e.target.value || null })} aria-label="Người kiểm duyệt" style={{ border: 0, background: "none", fontWeight: 700, fontSize: 12.5, fontFamily: "inherit", textAlign: "right", cursor: "pointer", color: PC.t1, padding: 0 }}><option value="">Không</option>{authors.filter((a) => a.is_reviewer).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></span>}
              {kind === "post" && <Tog on={post.pinned} onChange={(v) => upd({ pinned: v })} label="Ghim lên đầu blog" testid="web-side-pin" />}
              {kind === "post" && post.id && <span style={{ alignSelf: "flex-start" }}><Btn kind="soft" style={{ height: 28, fontSize: 12 }} disabled={relinking} testid="web-side-relink" title="AI chọn chỗ gắn link nội bộ (trang chủ, chuyên mục, trang calo, bài cùng chủ đề) vào chữ có sẵn, không sửa chữ. Xem lại rồi bấm Lưu." onClick={async () => {
                setRelinking(true);
                try {
                  const d = await authFetch("web-writer", { action: "relink", post_id: post.id, apply: false, blocks: forSave(post.blocks) });
                  if (d?.error) throw new Error(d.error);
                  if (!d.added?.length) showToast?.("Không thấy chỗ hợp để gắn thêm link.");
                  else { upd({ blocks: withKeys(d.blocks) }); showToast?.(`Đã gắn ${d.added.length} link: ${d.added.map((x) => `"${x.anchor}" → ${x.url}`).join(" · ")}. Xem lại rồi bấm Lưu.`); }
                } catch (e) { showToast?.("Chưa gắn được link: " + (e.message || "")); } finally { setRelinking(false); }
              }}>{relinking ? "Đang gắn link…" : "✦ Gắn link nội bộ"}</Btn></span>}
              {kind === "page" && <Field label="Mẫu trang"><select value={post.template || ""} onChange={(e) => upd({ template: e.target.value || null })} className="pc-input" style={inpStyle(32)}><option value="">Mặc định</option><option value="legal">Điều khoản / Chính sách (có mục lục)</option><option value="guide">Hướng dẫn (có mục lục, không đánh số)</option></select></Field>}
              {post.id && post.status !== "trash" && <span style={{ alignSelf: "flex-start" }}><Lnk red onClick={async () => { if (await appConfirm(`Bỏ ${noun} này vào thùng rác?`, { danger: true })) { await setStatus([post.id], "trash"); showToast?.("Đã bỏ vào thùng rác."); onBack(); } }} testid="web-side-trash">Bỏ vào thùng rác</Lnk></span>}
            </SideBox>
            {kind === "post" && <SideBox t="Chuyên mục" testid="web-side-cats"><CatBox cats={catTree} all={cats} post={post} upd={upd} onNew={async (name, parent) => { try { const c = await createTerm("category", name, parent); setCats((x) => [...x, c]); upd((p) => ({ terms: [...p.terms, c.id], primary_term: p.primary_term || c.id })); } catch (e) { showToast?.("Chưa tạo được chuyên mục: " + (e.message || "")); } }} /></SideBox>}
            {kind === "post" && <SideBox t="Thẻ" testid="web-side-tags"><TagBox tags={tags} on={tagOn} counts={tc} onAdd={async (t) => { let tag = typeof t === "string" ? tags.find((x) => x.name.toLowerCase() === t.toLowerCase()) : t; if (!tag) { try { tag = await createTerm("tag", t); setTags((x) => [...x, tag]); } catch (e) { return showToast?.("Chưa tạo được thẻ: " + (e.message || "")); } } upd((p) => ({ terms: p.terms.includes(tag.id) ? p.terms : [...p.terms, tag.id] })); }} onDel={(id) => upd((p) => ({ terms: p.terms.filter((x) => x !== id) }))} /></SideBox>}
            <SideBox t="Ảnh đại diện" testid="web-side-cover">
              {post.cover_url ? <img src={post.cover_url} alt={post.cover_alt || ""} style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10 }} /> : <span style={{ height: 90, borderRadius: 10, border: "1.5px dashed #BFD4FF", background: "#F5F9FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: PC.t3 }}>Chưa có ảnh · tự đổi WebP khi tải lên</span>}
              {post._coverInfo && <span style={{ fontSize: 11.5, color: PC.t3 }}>{post._coverInfo}</span>}
              <span style={{ display: "flex", gap: 8 }}><Upload showToast={showToast} name={post.slug || post.title} label={post.cover_url ? "Thay ảnh" : "Chọn ảnh"} testid="web-side-cover-up" onDone={(r) => upd({ cover_url: r.url, _coverInfo: `${r.width} × ${r.height} · ${kb(r.size)} (gốc ${kb(r.orig)})` })} />{post.cover_url && <Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => upd({ cover_url: "", _coverInfo: "" })}>Gỡ</Btn>}</span>
              <input value={post.cover_alt || ""} onChange={(e) => upd({ cover_alt: e.target.value })} placeholder="Mô tả ảnh (alt)" className="pc-input" style={inpStyle(32)} />
              <span><AiDrawBtn alt={post.cover_alt} slug={post.slug} postId={post.id} cover has={!!post.cover_url} onDone={(url) => upd({ cover_url: url, _coverInfo: "Ảnh AI vẽ" })} showToast={showToast} testid="web-side-cover-ai" /></span>
            </SideBox>
            <SideBox t="Đoạn trích">
              <textarea value={post.excerpt || ""} onChange={(e) => upd({ excerpt: e.target.value })} placeholder="1–2 câu tóm tắt" className="pc-input" style={{ ...inpStyle(60), height: 60, padding: "7px 10px", resize: "vertical", lineHeight: 1.5, fontSize: 12.5 }} />
              <span style={{ fontSize: 11.5, color: PC.t3 }}>Hiện ở trang chủ, chuyên mục. Để trống: tự lấy 30 chữ đầu.</span>
            </SideBox>
            {kind === "post" && <SideBox t="Bài liên quan"><RelBox post={post} upd={upd} all={allPosts} /></SideBox>}
          </>}
        </aside>
      </div>
      <style>{`.web-rich:empty:before{content:attr(data-ph);color:#94A3B8;pointer-events:none}.web-rich a{color:${BLUE};text-decoration:underline}.web-full{position:fixed;inset:0;z-index:50;background:${PC.bg};overflow:auto}.web-title::placeholder{color:#CBD5E1}[data-testid=web-ed-block][data-type=h]:not(:first-child){margin-top:10px!important}[data-testid=web-ed-block][data-type=h]+[data-testid=web-ed-block]{margin-top:-14px!important}[data-testid=web-ed-block][data-type=list] li{line-height:1.7}.web-titlebox:focus{border-color:#1A7CFF!important;box-shadow:0 0 0 3px rgba(26,124,255,.12)}`}</style>
    </div>
  );
}

// "Đăng lúc  18/10/2026 09:00 ✎" — bấm ✎ mở ô chọn ngày giờ (giờ VN)
function DateRow({ value, onChange }) {
  const [ed, setEd] = useState(false);
  const txt = value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", "").replace(/^(\d{2}:\d{2}) (.+)$/, "$2 $1") : "Ngay khi bấm Đăng";
  return <>
    <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}><span style={{ color: PC.t3 }}>Đăng lúc</span><button type="button" onClick={() => setEd(!ed)} data-testid="web-side-date-edit" style={{ border: 0, background: "none", padding: 0, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", color: PC.t1 }}>{txt} ✎</button></span>
    {ed && <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><input type="datetime-local" value={toLocal(value)} onChange={(e) => onChange(fromLocal(e.target.value))} data-testid="web-side-date" className="pc-input" style={inpStyle(32)} /><span style={{ fontSize: 11.5, color: PC.t3 }}>Giờ VN · chọn giờ tương lai = hẹn giờ đăng{value ? " · " : ""}{value && <Lnk onClick={() => onChange(null)}>Đăng ngay</Lnk>}</span></span>}
  </>;
}

function GooglePreview({ slug, title, desc, date }) {
  const [m, setM] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${PC.line}`, padding: 12, display: "flex", flexDirection: "column", gap: 3, maxWidth: m ? 380 : "none" }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: PC.t3, marginBottom: 4 }}>XEM TRƯỚC TRÊN GOOGLE · <button type="button" onClick={() => setM(false)} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 800, color: m ? PC.t3 : BLUE }}>Máy tính</button> · <button type="button" onClick={() => setM(true)} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 800, color: m ? BLUE : PC.t3 }}>Điện thoại</button></span>
      <span style={{ fontSize: 12, color: "#202124" }}>fipilotai.com › {slug || "…"}</span>
      <span style={{ fontSize: m ? 16 : 17, color: "#1A0DAB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: m ? "normal" : "nowrap" }}>{title.length > 62 ? title.slice(0, 60) + "…" : title || "Tiêu đề bài"}</span>
      <span style={{ fontSize: 12.5, color: "#4D5156", lineHeight: 1.5 }}>{fmtVNdate(date)} — {desc.length > 158 ? desc.slice(0, 156) + "…" : desc || "Mô tả bài sẽ hiện ở đây."}</span>
    </div>
  );
}

function CatBox({ cats, all, post, upd, onNew }) {
  const [q, setQ] = useState(""); const [adding, setAdding] = useState(false); const [name, setName] = useState(""); const [parent, setParent] = useState("");
  const list = cats.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (c, v) => upd((p) => { const terms = v ? [...p.terms, c.id] : p.terms.filter((x) => x !== c.id); const pri = v ? p.primary_term || c.id : p.primary_term === c.id ? terms.find((t) => all.some((x) => x.id === t)) || null : p.primary_term; return { terms, primary_term: pri }; });
  return <>
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm chuyên mục" className="pc-input" style={inpStyle(30)} />
    {list.map((c) => { const on = post.terms.includes(c.id); const main = post.primary_term === c.id; return (
      <span key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: c._sub ? 22 : 0 }}><Check on={on} onChange={(v) => toggle(c, v)} label={c.name} testid={`web-cat-${c.slug}`} />
        {main ? <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#FFF", background: BLUE, borderRadius: 6, padding: "1px 6px", fontWeight: 800 }}>Chính</span> : on ? <button type="button" onClick={() => upd({ primary_term: c.id })} style={{ marginLeft: "auto", fontSize: 11, color: PC.t4, fontWeight: 700, border: 0, background: "none", cursor: "pointer", fontFamily: "inherit" }}>Đặt làm chính</button> : null}</span>); })}
    {!all.length && <span style={{ fontSize: 12, color: PC.t4 }}>Chưa có chuyên mục nào.</span>}
    <span style={{ fontSize: 11.5, color: PC.t3 }}>Chuyên mục chính dùng cho breadcrumb và nhãn trên thẻ bài.</span>
    {adding ? <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên chuyên mục" data-testid="web-cat-new-name" className="pc-input" style={inpStyle(30)} />
      <select value={parent} onChange={(e) => setParent(e.target.value)} className="pc-input" style={inpStyle(30)}><option value="">— Không có mục cha —</option>{all.filter((c) => !c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <span style={{ display: "flex", gap: 6 }}><Btn kind="blue" style={{ height: 28, fontSize: 12 }} disabled={!name.trim()} testid="web-cat-new-ok" onClick={async () => { await onNew(name.trim(), parent || null); setName(""); setAdding(false); }}>Thêm</Btn><Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => setAdding(false)}>Huỷ</Btn></span>
    </span> : <span style={{ alignSelf: "flex-start" }}><Lnk onClick={() => setAdding(true)} testid="web-cat-new">+ Thêm chuyên mục mới</Lnk></span>}
  </>;
}

function TagBox({ tags, on, counts, onAdd, onDel }) {
  const [q, setQ] = useState(""); const [focus, setFocus] = useState(false);
  const s = q.trim().toLowerCase();
  const sug = s ? tags.filter((t) => t.name.toLowerCase().includes(s) && !on.some((o) => o.id === t.id)).sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).slice(0, 5) : [];
  const exact = tags.some((t) => t.name.toLowerCase() === s);
  const popular = tags.filter((t) => !on.some((o) => o.id === t.id)).sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).slice(0, 6);
  const add = (t) => { onAdd(t); setQ(""); };
  return <>
    <span style={{ minHeight: 34, borderRadius: 10, border: `1.5px solid ${focus ? "#1A7CFF" : PC.field}`, boxShadow: focus ? "0 0 0 3px rgba(26,124,255,.15)" : "none", padding: 5, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
      {on.map((t) => <span key={t.id} style={{ fontSize: 12, background: "#E8F1FF", color: BLUE, fontWeight: 700, borderRadius: 7, padding: "3px 8px", display: "inline-flex", gap: 4 }}>{t.name}<button type="button" aria-label={`Bỏ thẻ ${t.name}`} onClick={() => onDel(t.id)} style={{ border: 0, background: "none", color: BLUE, cursor: "pointer", padding: 0, fontWeight: 800 }}>×</button></span>)}
      <input value={q} onChange={(e) => { const v = e.target.value; if (v.endsWith(",")) { if (v.slice(0, -1).trim()) add(v.slice(0, -1).trim()); } else setQ(v); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (sug[0] && !exact && sug[0].name.toLowerCase().startsWith(s)) add(sug[0]); else if (s) add(q.trim()); } if (e.key === "Backspace" && !q && on.length) onDel(on[on.length - 1].id); }} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder={on.length ? "" : "Gõ thẻ…"} data-testid="web-tag-input" style={{ flex: 1, minWidth: 60, border: 0, outline: "none", fontSize: 12.5, fontFamily: "inherit" }} />
    </span>
    {focus && s && <div style={{ borderRadius: 10, border: `1px solid ${PC.line}`, boxShadow: "0 8px 22px rgba(15,23,42,.12)", padding: 4, marginTop: -4 }}>
      {sug.map((t) => <button key={t.id} type="button" onMouseDown={(e) => { e.preventDefault(); add(t); }} style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "6px 8px", borderRadius: 7, fontSize: 12.5, border: 0, background: "none", cursor: "pointer", fontFamily: "inherit" }}><b style={{ fontWeight: 700 }}>{t.name}</b><span style={{ color: PC.t4, fontSize: 11.5 }}>{counts[t.id] || 0} bài</span></button>)}
      {!exact && <button type="button" onMouseDown={(e) => { e.preventDefault(); add(q.trim()); }} style={{ width: "100%", textAlign: "left", padding: "6px 8px", fontSize: 12.5, color: BLUE, fontWeight: 700, border: 0, borderTop: sug.length ? `1px solid ${PC.headLine}` : 0, background: "none", cursor: "pointer", fontFamily: "inherit" }}>+ Tạo thẻ mới “{q.trim()}”</button>}
    </div>}
    <span style={{ fontSize: 11.5, color: PC.t3 }}>Enter hoặc dấu phẩy để thêm · gõ là gợi ý thẻ có sẵn, tránh tạo trùng</span>
    {popular.length > 0 && <><span style={{ fontSize: 11, fontWeight: 800, color: PC.t4 }}>DÙNG NHIỀU</span><span style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{popular.map((t) => <button key={t.id} type="button" onClick={() => add(t)} style={{ fontSize: 11.5, border: `1px solid ${PC.line}`, borderRadius: 7, padding: "2px 7px", color: PC.t2, background: "#FFF", cursor: "pointer", fontFamily: "inherit" }}>+ {t.name}</button>)}</span></>}
  </>;
}

function RelBox({ post, upd, all }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const rel = post.related || { mode: "auto", ids: [] };
  const by = Object.fromEntries(all.map((p) => [p.id, p]));
  const set = (r) => upd({ related: { ...rel, ...r } });
  const res = all.filter((p) => !rel.ids?.includes(p.id) && (!q || p.title.toLowerCase().includes(q.toLowerCase()))).slice(0, 6);
  return <>
    <span style={{ display: "flex", gap: 12 }}><Radio name="rel" on={rel.mode !== "manual"} onChange={() => set({ mode: "auto" })} label="Tự động" /><Radio name="rel" on={rel.mode === "manual"} onChange={() => set({ mode: "manual" })} label="Chọn tay" testid="web-rel-manual" /></span>
    {rel.mode !== "manual" ? <span style={{ fontSize: 11.5, color: PC.t3 }}>Web tự lấy 3 bài mới nhất cùng chuyên mục chính.</span> : <>
      {(rel.ids || []).map((id, i) => <span key={id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, padding: "6px 8px", borderRadius: 8, background: "#F8FAFC" }}>
        <span style={{ display: "flex", flexDirection: "column" }}><button type="button" aria-label="Lên" disabled={!i} onClick={() => { const ids = [...rel.ids]; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; set({ ids }); }} style={{ border: 0, background: "none", fontSize: 9, cursor: "pointer", color: PC.t4, padding: 0 }}>▲</button><button type="button" aria-label="Xuống" disabled={i === rel.ids.length - 1} onClick={() => { const ids = [...rel.ids]; [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; set({ ids }); }} style={{ border: 0, background: "none", fontSize: 9, cursor: "pointer", color: PC.t4, padding: 0 }}>▼</button></span>
        <span style={{ flex: 1, minWidth: 0 }}>{by[id]?.title || "(bài đã xoá)"}</span><button type="button" aria-label="Bỏ" onClick={() => set({ ids: rel.ids.filter((x) => x !== id) })} style={{ border: 0, background: "none", color: PC.t4, cursor: "pointer" }}>×</button></span>)}
      {open ? <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm bài…" className="pc-input" style={inpStyle(30)} />{res.map((p) => <button key={p.id} type="button" onClick={() => { set({ ids: [...(rel.ids || []), p.id].slice(0, 6) }); setQ(""); setOpen(false); }} style={{ textAlign: "left", border: 0, background: "none", padding: "5px 6px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", borderRadius: 6 }}>{p.title}</button>)}</span>
        : (rel.ids || []).length < 6 && <span style={{ alignSelf: "flex-start" }}><Lnk onClick={() => setOpen(true)}>+ Thêm bài</Lnk></span>}
    </>}
  </>;
}

function SchemaTab({ post, setSeo, kind }) {
  const off = post.seo?.schema_off || [];
  const faqN = post.blocks.filter((b) => b.type === "faq").reduce((n, b) => n + (b.items || []).filter((x) => x.q && x.a).length, 0);
  const calo = post.blocks.find((b) => b.type === "calo" && b.food);
  const [raw, setRaw] = useState(post.seo?.schema ? JSON.stringify(post.seo.schema, null, 2) : "");
  let bad = ""; try { if (raw.trim()) JSON.parse(raw); } catch (e) { bad = e.message; }
  const items = [...(kind === "post" ? [["Article", "Tiêu đề, tác giả, ngày đăng / sửa, ảnh đại diện"]] : []), ["BreadcrumbList", "Trang chủ › chuyên mục › bài này"], ["FAQPage", faqN ? `Từ khối Hỏi đáp trong bài · ${faqN} câu` : "Chưa có khối Hỏi đáp"], ["NutritionInformation", calo ? `Từ khối calo món · ${calo.food}` : "Chưa có khối calo món"]];
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <span style={secLbl}>SCHEMA TỰ SINH (bật / tắt từng loại)</span>
      {items.map(([t, s]) => <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${PC.rowLine}` }}><Tog on={!off.includes(t)} onChange={(v) => setSeo({ schema_off: v ? off.filter((x) => x !== t) : [...off, t] })} /><span style={{ display: "flex", flexDirection: "column", flex: 1 }}><b style={{ fontSize: 13, fontFamily: "ui-monospace, Menlo, monospace" }}>{t}</b><span style={{ fontSize: 12, color: PC.t3 }}>{s}</span></span></div>)}
      <span style={{ ...secLbl, marginTop: 6 }}>SCHEMA RIÊNG CHO BÀI NÀY (JSON-LD)</span>
      <textarea value={raw} onChange={(e) => { setRaw(e.target.value); try { setSeo({ schema: e.target.value.trim() ? JSON.parse(e.target.value) : null, schema_bad: false }); } catch (er) { setSeo({ schema_bad: true }); /* chặn lưu tới khi sửa xong */ } }} placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "HowTo",\n  "name": "…"\n}'} spellCheck={false} style={{ minHeight: 160, borderRadius: 12, background: "#0F172A", color: "#C7D2FE", padding: 14, fontSize: 12, lineHeight: 1.6, fontFamily: "ui-monospace, Menlo, monospace", border: 0, resize: "vertical" }} />
      <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>{raw.trim() ? (bad ? <Pill tone="red">Mã chưa hợp lệ: {bad.slice(0, 60)}</Pill> : <Pill tone="green">✓ Mã hợp lệ</Pill>) : <span style={{ color: PC.t4 }}>Để trống nếu không cần</span>}<span style={{ color: PC.t3 }}>Gộp với schema tự sinh</span>
        <span style={{ marginLeft: "auto" }}><Btn kind="soft" onClick={() => window.open(`https://search.google.com/test/rich-results?url=${encodeURIComponent(`${WEB}/${post.slug}`)}`, "_blank", "noopener")} disabled={post.status !== "published"}>Kiểm tra trên Google ↗</Btn></span></span>
    </div>
  );
}

