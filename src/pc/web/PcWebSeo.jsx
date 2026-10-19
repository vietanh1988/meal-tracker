// Quản trị PC › WEB & BÀI VIẾT › Cài đặt SEO (bản vẽ 138f, n, o, p, q, r) — 7 tab:
//  Chung (tên web, mẫu tiêu đề, ảnh chia sẻ) · Đường dẫn · Sitemap & robots · Chuyển hướng (thêm, bật/tắt, chuỗi → gộp, CSV)
//  · Lỗi 404 & link hỏng (nhật ký 404 → chuyển 301 / báo 410 / bỏ qua; quét link nội bộ hỏng trong bài) · Schema mặc định · Mã theo dõi.
// Cài đặt lưu web_settings (seo, site, tracking); chuyển hướng → web_redirects; nhật ký → web_404. Web đổi theo trong khoảng 1 phút.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { toVNDate, todayVN, addDays } from "../../lib/dateVN";
import { Btn, Pill, Card, SearchBox, ErrorBox, Loading, headRow, bodyRow, cell } from "../pcUI";
import { Check, Tog, Radio, Tabs, Field, Lnk, inpStyle, BLUE } from "./webUI";
import { slugify } from "./webLib";
import { Upload, FOODS } from "./BlockEdit";
import { readAll, saveSettings } from "./webApi";

const WEB = "https://fipilotai.com";
const must = ({ data, error }) => { if (error) throw error; return data; };
const mono = { fontFamily: "ui-monospace, Menlo, monospace" };
const TABS = ["Chung", "Đường dẫn", "Sitemap & robots", "Chuyển hướng", "Lỗi 404 & link hỏng", "Schema mặc định", "Mã theo dõi"];
const H = ({ t, r }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>{t}</b><span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>{r}</span></div>;
const In = ({ v, on, ph, m, testid, w }) => <input value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={ph} data-testid={testid} className="pc-input" style={{ ...inpStyle(), width: w || "100%", ...(m ? mono : {}) }} />;
const Code = ({ v, on, h = 78, ph, testid }) => <textarea value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} spellCheck={false} data-testid={testid} style={{ minHeight: h, borderRadius: 10, background: "#0F172A", color: "#E2E8F0", padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, ...mono, border: 0, resize: "vertical", width: "100%", boxSizing: "border-box" }} />;
const Stat = ({ n, l, s, c = PC.t1 }) => <Card style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{l}</span><b style={{ fontSize: 24, fontWeight: 900, color: c }}>{n}</b>{s && <span style={{ fontSize: 11.5, color: PC.t4 }}>{s}</span>}</Card>;
// Mẫu tiêu đề: admin gõ %tieu-de% / %ten-web%, web lưu %title% / %site%
const tplIn = (t) => String(t || "%title% | %site%").replace(/%title%/g, "%tieu-de%").replace(/%site%/g, "%ten-web%");
const tplOut = (t) => String(t || "").replace(/%tieu-de%/g, "%title%").replace(/%ten-web%/g, "%site%");
// Gần giống (chữ chung theo bigram) — gợi ý chuyển 404 tới đâu
const sim = (a, b) => { const g = (s) => { const x = slugify(s).replace(/-/g, ""); const o = new Set(); for (let i = 0; i < x.length - 1; i++) o.add(x.slice(i, i + 2)); return o; }; const A = g(a), B = g(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return (2 * n) / (A.size + B.size); };
const SRC = { manual: "Thêm tay", slug_change: "Tự tạo khi đổi đường dẫn", permalink: "Tự tạo khi đổi kiểu đường dẫn", calo_off: "Tự tạo khi tắt trang calo", import: "Nhập từ CSV" };
// "Hôm nay" / "Hôm qua" / 16/10 (giờ VN)
const day = (iso, time) => { const a = toVNDate(iso), t = todayVN(); const hm = new Date(new Date(iso).getTime() + 7 * 36e5).toISOString().slice(11, 16); const pre = a === t ? "Hôm nay" : a === addDays(t, -1) ? "Hôm qua" : null; if (pre) return time ? `${pre} ${hm}` : pre; return `${a.slice(8, 10)}/${a.slice(5, 7)}`; };
const STATIC = ["/", "/cai-app", "/bai-viet", "/bang-calo", "/tinh-calo", "/bang-gia", "/gioi-thieu", "/lien-he", "/tim-kiem", "/dieu-khoan", "/chinh-sach-rieng-tu", "/chinh-sach-bao-mat"];

export function PcWebSeo({ top, showToast }) {
  const [tab, setTab] = useState(0);
  const [st, setSt] = useState(null);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState({});
  const [paths, setPaths] = useState([]); // đường dẫn đang có trên web (gợi ý / kiểm link)

  useEffect(() => { (async () => {
    try {
      const rows = await supabase.from("web_settings").select("key,value").in("key", ["seo", "site", "tracking", "contact"]).then(must);
      const o = { seo: {}, site: {}, tracking: {} }; for (const r of rows) o[r.key] = r.value || {};
      o.seo.sitemap = { post: true, page: true, category: true, tag: false, calo: true, author: true, images: true, ...(o.seo.sitemap || {}) };
      origRef.current = JSON.parse(JSON.stringify({ seo: o.seo, site: o.site, tracking: o.tracking })); setSt(o);
      const [posts, terms, authors] = await Promise.all([readAll(() => supabase.from("web_posts").select("slug,kind,status,seo,updated_at").neq("status", "trash").order("id")), supabase.from("web_terms").select("slug,kind").then(must), supabase.from("web_authors").select("slug").then(must)]);
      const live = posts.filter((p) => p.status === "published");
      const tot = (o.seo.sitemap.post !== false ? live.filter((p) => p.kind === "post" && !p.seo?.noindex).length : 0) + (o.seo.sitemap.page !== false ? live.filter((p) => p.kind === "page" && !p.seo?.noindex).length : 0) + (o.seo.sitemap.category !== false ? terms.filter((t) => t.kind === "category").length : 0) + (o.seo.sitemap.tag ? terms.filter((t) => t.kind === "tag").length : 0) + (o.seo.sitemap.author !== false ? authors.length : 0) + (o.seo.sitemap.calo !== false ? FOODS.filter((f) => f.vn).length : 0) + 7;
      setCounts({ total: tot, last: live.map((p) => p.updated_at).filter(Boolean).sort().pop(), post: live.filter((p) => p.kind === "post" && !p.seo?.noindex).length, page: live.filter((p) => p.kind === "page" && !p.seo?.noindex).length, pageNo: live.filter((p) => p.kind === "page" && p.seo?.noindex).length, category: terms.filter((t) => t.kind === "category").length, tag: terms.filter((t) => t.kind === "tag").length, author: authors.length, calo: FOODS.filter((f) => f.vn).length });
      setPaths([...STATIC, ...live.map((p) => `/${p.slug}`), ...terms.map((t) => `/${t.kind === "category" ? "chu-de" : "the"}/${t.slug}`), ...authors.map((a) => `/tac-gia/${a.slug}`), ...FOODS.filter((f) => f.vn).map((f) => `/calo/${f.slug}`)]);
    } catch (e) { setErr("Chưa tải được cài đặt SEO. " + (e.message || "")); }
  })(); }, []);
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);
  const origRef = useRef(null);
  const [justSaved, setJustSaved] = useState(false); // nút đổi thành "✓ Đã lưu" 2,5 giây sau khi lưu
  const set = (k, patch) => { setSt((x) => ({ ...x, [k]: { ...x[k], ...patch } })); setDirty(true); };
  const save = async () => {
    const extra = String(st.seo.robots_extra || "");
    if (/^\s*disallow:\s*\/\s*$/im.test(extra) && !(await appConfirm("robots.txt đang có “Disallow: /” — dòng này chặn Google đọc CẢ web. Vẫn lưu?", { danger: true }))) return;
    if (st.tracking.ga4 && !/^G-[A-Z0-9]+$/.test(st.tracking.ga4)) return showToast?.("Mã Google Analytics 4 phải dạng G-XXXXXXX.");
    setBusy(true);
    try { const loc = { seo: st.seo, site: st.site, tracking: st.tracking }; const saved = await saveSettings(loc, origRef.current); origRef.current = JSON.parse(JSON.stringify({ ...loc, ...saved })); setSt((x) => ({ ...x, ...saved })); setDirty(false); setJustSaved(true); setTimeout(() => setJustSaved(false), 2500); showToast?.("Đã lưu cài đặt SEO. Web đổi theo trong khoảng 1 phút."); }
    catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };

  if (err) return <>{top(null)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!st) return <>{top(null)}<Loading /></>;
  const seo = st.seo, site = st.site, tr = st.tracking;
  const settingsTab = [0, 1, 2, 5, 6].includes(tab);
  const chung = (
          <Card style={{ padding: 0 }}><H t="Chung" />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Tên web"><In v={site.name} on={(v) => set("site", { name: v })} /></Field>
              <Field label="Mẫu tiêu đề bài" hint="%tieu-de% = tiêu đề bài · %ten-web% = tên web"><In v={tplIn(site.title_tpl)} on={(v) => set("site", { title_tpl: tplOut(v) })} m testid="web-seo-tpl" /></Field>
              <span style={{ fontSize: 12, color: PC.t3 }}>Ví dụ: <b style={{ color: "#1A0DAB", fontWeight: 600 }}>{tplIn(site.title_tpl).replace("%tieu-de%", "Phở bò bao nhiêu calo?").replace("%ten-web%", site.name || "Fipilot AI")}</b></span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}><img src={site.og_image || `${WEB}/og-image.jpg`} alt="" style={{ width: 120, height: 63, objectFit: "cover", borderRadius: 8, background: "#EEF4FF" }} /><span style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 12.5 }}>Ảnh chia sẻ mặc định</b><span style={{ fontSize: 11.5, color: PC.t3 }}>1200 × 630 · dùng khi bài không có ảnh riêng</span><Upload showToast={showToast} name="anh-chia-se" label="Đổi ảnh" onDone={(r) => set("site", { og_image: r.url })} /></span></div>
            </div>
          </Card>
  );
  return (
    <>
      {top(<Btn kind="blue" onClick={save} disabled={busy || !dirty || !settingsTab} testid="web-seo-save">{busy ? "Đang lưu…" : justSaved && !dirty ? "✓ Đã lưu" : "Lưu thay đổi"}</Btn>, "Cài đặt SEO", "Áp cho toàn web fipilotai.com")}
      <div style={{ background: "#FFF", borderBottom: `1px solid ${PC.line}` }}><Tabs items={TABS} on={tab} onChange={setTab} testid="web-seoset-tab" /></div>
      {(tab === 0 || tab === 2) && (
        <div style={{ padding: "18px 24px 0" }}>
          <Card style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, background: seo.block_all ? "#FEF2F2" : "#FFF", boxShadow: seo.block_all ? "inset 0 0 0 1.5px #FCA5A5" : undefined }} testid="web-seo-blockall-card">
            <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}><b style={{ fontSize: 13.5, color: seo.block_all ? "#B91C1C" : PC.t1 }}>{seo.block_all ? "Đang chặn Google và mọi công cụ tìm kiếm" : "Hiện web trên Google"}</b><span style={{ fontSize: 12, lineHeight: 1.45, color: PC.t3 }}>Giống WordPress › “Ngăn chặn các công cụ tìm kiếm đánh chỉ mục trang web này”. Bật khi web đang làm dở: mọi trang gắn noindex, sitemap rỗng, không báo IndexNow. Google tự gỡ dần link đã có. Tắt để Google đọc lại.</span></span>
            <Tog on={!!seo.block_all} onChange={async (v) => { if (v && !(await appConfirm("Chặn Google đọc CẢ web fipilotai.com? Bài đã lên Google sẽ bị gỡ dần.", { danger: true }))) return; set("seo", { block_all: v }); }} label={seo.block_all ? "Đang chặn" : "Không chặn"} testid="web-seo-blockall" />
          </Card>
        </div>
      )}
      {tab === 0 && (
        <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          {chung}
          <Card style={{ padding: 0 }}><H t="Dùng nhanh" />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5, color: PC.t2, lineHeight: 1.55 }}>
              <span>• Kiểu đường dẫn, tiền tố chuyên mục / thẻ / calo: tab <Lnk onClick={() => setTab(1)}>Đường dẫn</Lnk>.</span>
              <span>• Bật / tắt loại trang trong sitemap, sửa robots.txt, cho bot AI đọc: tab <Lnk onClick={() => setTab(2)}>Sitemap & robots</Lnk>.</span>
              <span>• Link cũ, link 404: tab <Lnk onClick={() => setTab(3)}>Chuyển hướng</Lnk> và <Lnk onClick={() => setTab(4)}>Lỗi 404</Lnk>.</span>
              <span>• Mã xác minh Search Console, GA4, Pixel: tab <Lnk onClick={() => setTab(6)}>Mã theo dõi</Lnk>.</span>
            </div>
          </Card>
        </div>
      )}
      {tab === 1 && (
        <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <Card style={{ padding: 0 }}><H t="Kiểu đường dẫn" />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: PC.t3 }}>Kiểu đường dẫn bài viết (giống Permalink của WordPress). Đổi đường dẫn từng bài → web tự tạo chuyển hướng 301 cho link cũ.</span>
              {[["name", "Tên bài", `${WEB.replace("https://", "")}/pho-bo-bao-nhieu-calo`, "Khuyên dùng — ngắn, dễ nhớ"], ["blog", "Có /blog", "fipilotai.com/blog/pho-bo-bao-nhieu-calo"], ["cat", "Theo chuyên mục", "fipilotai.com/giam-can/pho-bo-bao-nhieu-calo"], ["custom", "Tuỳ chỉnh", "fipilotai.com/%chuyen-muc%/%ten-bai%"]].map(([v, t, ex, n]) => { const on = (seo.permalink || "name") === v; const off = v !== "name"; return (
                <div key={v} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: on ? PC.rowSel : "transparent", boxShadow: on ? "inset 0 0 0 1.5px #BFD4FF" : "none", opacity: off ? 0.55 : 1 }}><span style={{ marginTop: 2 }}><Radio name="perma" on={on} onChange={() => !off && set("seo", { permalink: v })} /></span><span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 13 }}>{t}{n && <span style={{ marginLeft: 8 }}><Pill tone="green">{n}</Pill></span>}{off && <span style={{ marginLeft: 8 }}><Pill tone="gray">Chưa bật — cần chuyển hết link cũ</Pill></span>}</b><span style={{ fontSize: 12.5, color: PC.t3, ...mono }}>{ex}</span></span></div>); })}
              <div style={{ height: 1, background: PC.headLine, margin: "4px 0" }} />
              {[["Tiền tố chuyên mục", "chu-de", "fipilotai.com/chu-de/giam-can"], ["Tiền tố thẻ", "the", "fipilotai.com/the/pho"], ["Tiền tố trang calo món", "calo", "fipilotai.com/calo/pho-bo"]].map(([l, v, ex]) => <div key={l} style={{ display: "grid", gridTemplateColumns: "150px 120px 1fr", gap: 10, alignItems: "center", fontSize: 12.5 }}><span style={{ fontWeight: 700, color: PC.t2 }}>{l}</span><input value={v} disabled className="pc-input" style={{ ...inpStyle(32), ...mono, background: "#F8FAFC" }} /><span style={{ color: PC.t3, ...mono }}>{ex}</span></div>)}
              <span style={{ fontSize: 11.5, color: PC.t3 }}>Tiền tố đang cố định để giữ link đã lên Google. Đổi được sau khi có công cụ chuyển 301 hàng loạt.</span>
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{chung}<RedirectMini go={() => setTab(3)} go404={() => setTab(4)} /></div>
        </div>
      )}
      {tab === 2 && (
        <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <Card style={{ padding: 0 }}><H t="Sitemap" r={<><span style={{ fontSize: 12.5, ...mono, color: BLUE }}>fipilotai.com/sitemap.xml</span><Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => window.open(`${WEB}/sitemap.xml`, "_blank", "noopener")}>Mở ↗</Btn></>} />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12.5, color: PC.t3, marginBottom: 6 }}>Tự cập nhật mỗi khi đăng / sửa / xoá. Chỉ trang cho lập chỉ mục mới vào sitemap.</span>
              {[["post", "Bài viết", counts.post, ""], ["page", "Trang", counts.page, counts.pageNo ? `${counts.pageNo} trang đang tắt lập chỉ mục` : ""], ["category", "Chuyên mục", counts.category, ""], ["calo", "Trang calo món", counts.calo, ""], ["author", "Tác giả", counts.author, ""], ["tag", "Thẻ", counts.tag, "Nên tắt — trang thẻ thường mỏng, dễ bị Google chê"], ["images", "Ảnh trong bài", null, "Gắn ảnh vào từng link"]].map(([k, t, n, s]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${PC.rowLine}` }}><Tog on={seo.sitemap[k] !== false} onChange={(v) => set("seo", { sitemap: { ...seo.sitemap, [k]: v } })} testid={`web-sm-${k}`} /><span style={{ display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 13 }}>{t}{n != null && <span style={{ fontWeight: 600, color: PC.t3 }}> · {n} link</span>}</b>{s && <span style={{ fontSize: 11.5, color: PC.t3 }}>{s}</span>}</span></div>
              ))}
              <div style={{ marginTop: 10, borderRadius: 10, background: "#F5F9FF", padding: 12, fontSize: 12.5, lineHeight: 1.55 }}><b>Nộp cho Google:</b> vào Search Console › Sitemaps, dán <span style={mono}>sitemap.xml</span> một lần. Sau đó Google tự đọc lại.{counts.last && <><br /><span style={{ color: PC.t3 }}>Bài sửa gần nhất: {day(counts.last, true).toLowerCase()} · khoảng {counts.total} link</span></>}</div>
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 0 }}><H t="robots.txt" r={<><Lnk onClick={() => set("seo", { robots_extra: "Disallow: /api/\nDisallow: /tim-kiem\n" })}>Khôi phục mặc định</Lnk><Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => window.open(`${WEB}/robots.txt`, "_blank", "noopener")}>Mở ↗</Btn></>} />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ borderRadius: 10, background: "#0F172A", color: "#E2E8F0", padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, ...mono }}>
                  <div>User-agent: *<br />Allow: /</div>
                  <textarea value={seo.robots_extra || ""} onChange={(e) => set("seo", { robots_extra: e.target.value })} spellCheck={false} placeholder={"Disallow: /api/\nDisallow: /tim-kiem"} data-testid="web-robots" rows={Math.max(3, String(seo.robots_extra || "").split("\n").length + 1)} style={{ display: "block", width: "100%", background: "transparent", color: "#E2E8F0", border: 0, outline: "none", resize: "none", padding: 0, font: "inherit", lineHeight: 1.6 }} />
                  <div>Sitemap: {WEB}/sitemap.xml</div>
                </div>
                <span style={{ fontSize: 11.5, color: /^\s*disallow:\s*\/\s*$/im.test(seo.robots_extra || "") ? PC.danger : PC.t3, fontWeight: /^\s*disallow:\s*\/\s*$/im.test(seo.robots_extra || "") ? 800 : 400 }}>{/^\s*disallow:\s*\/\s*$/im.test(seo.robots_extra || "") ? "Có dòng “Disallow: /” — sẽ chặn Google đọc cả web!" : "Dòng Sitemap tự thêm. Sửa sai có thể chặn Google đọc cả web — app sẽ báo nếu thấy “Disallow: /”."}</span>
              </div>
            </Card>
            <Card style={{ padding: 0 }}><H t="Bot AI & công cụ tìm kiếm khác" />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Tog on={seo.allow_ai_bots !== false} onChange={(v) => set("seo", { allow_ai_bots: v })} label="Cho bot AI đọc bài (ChatGPT, Claude, Gemini) — để được trích dẫn khi người dùng hỏi AI" />
                <Tog on={!!seo.indexnow} onChange={(v) => set("seo", { indexnow: v, indexnow_key: seo.indexnow_key || Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, "0")).join("") })} label="Báo Bing / Cốc Cốc ngay khi đăng bài (IndexNow)" testid="web-indexnow" />
              </div>
            </Card>
          </div>
        </div>
      )}
      {tab === 3 && <Redirects showToast={showToast} paths={paths} />}
      {tab === 4 && <NotFound showToast={showToast} paths={paths} />}
      {tab === 5 && (
        <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 0 }}><H t="Thông tin tổ chức (Organization)" />
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Web này của"><span style={{ display: "flex", gap: 14, height: 36, alignItems: "center" }}><Radio name="orgt" on={seo.org?.type !== "Person"} onChange={() => set("seo", { org: { ...seo.org, type: "Organization" } })} label="Tổ chức / thương hiệu" /><Radio name="orgt" on={seo.org?.type === "Person"} onChange={() => set("seo", { org: { ...seo.org, type: "Person" } })} label="Cá nhân" /></span></Field>
                <Field label="Tên"><In v={seo.org?.name ?? (site.name || "Fipilot AI")} on={(v) => set("seo", { org: { ...seo.org, name: v } })} /></Field>
                <Field label="Logo"><input value={site.logo_url ? "Logo tải lên ở Cài đặt web" : "logo-512.png · lấy từ Cài đặt web"} disabled className="pc-input" style={{ ...inpStyle(), background: "#F8FAFC" }} /></Field>
                <Field label="Email · điện thoại"><input value={[st.contact?.email, st.contact?.phone].filter(Boolean).join(" · ") || "Lấy từ Cài đặt web › Liên hệ"} title="Sửa ở Cài đặt web › Liên hệ" disabled className="pc-input" style={{ ...inpStyle(), background: "#F8FAFC" }} /></Field>
                <div style={{ gridColumn: "1/-1", fontSize: 11.5, color: PC.t3 }}>Link mạng xã hội (sameAs) lấy từ Cài đặt web › Liên hệ.</div>
              </div>
            </Card>
            <Card style={{ padding: 0 }}><H t="Mặc định theo loại trang" r={<span style={{ fontSize: 12, color: PC.t3 }}>Từng bài vẫn đổi được ở tab Schema</span>} />
              <div style={{ ...headRow("1.1fr 1.7fr 70px"), background: PC.headBg }}><span>LOẠI TRANG</span><span>SCHEMA TỰ GẮN</span><span>BẬT</span></div>
              {[["home", "Trang chủ", "WebSite + Organization + SoftwareApplication"], ["post", "Bài viết", "BlogPosting + BreadcrumbList + Person (tác giả)"], ["faq", "Bài có khối Hỏi đáp", "+ FAQPage"], ["calo", "Trang calo món", "NutritionInformation + BreadcrumbList"], ["price", "Bảng giá", "SoftwareApplication + Offer (giá gói)"], ["cat", "Chuyên mục", "CollectionPage + BreadcrumbList"], ["author", "Tác giả", "ProfilePage + Person"]].map(([k, t, s2]) => { const off = (seo.schema_off || []).includes(k); return <div key={k} style={{ ...bodyRow("1.1fr 1.7fr 70px"), borderBottom: `1px solid ${PC.rowLine}` }}><span style={cell}>{t}</span><span style={{ ...cell, fontSize: 12, color: PC.t2 }}>{s2}</span><Tog on={!off} onChange={(v) => set("seo", { schema_off: v ? (seo.schema_off || []).filter((x) => x !== k) : [...(seo.schema_off || []), k] })} /></div>; })}
              <div style={{ padding: "12px 16px" }}><Tog on={seo.search_action !== false} onChange={(v) => set("seo", { search_action: v })} label="Ô tìm kiếm trên Google (SearchAction)" /></div>
            </Card>
          </div>
          <Card style={{ padding: 0 }}><H t="Xem mã sẽ in ra · Trang chủ" r={<Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => window.open(`https://search.google.com/test/rich-results?url=${encodeURIComponent(WEB)}`, "_blank", "noopener")}>Kiểm bằng Google ↗</Btn>} />
            <div style={{ padding: 16 }}><pre style={{ margin: 0, borderRadius: 10, background: "#0F172A", color: "#E2E8F0", padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, ...mono, whiteSpace: "pre-wrap" }}>{JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": seo.org?.type === "Person" ? "Person" : "Organization", "@id": `${WEB}/#org`, name: seo.org?.name || site.name || "Fipilot AI", url: WEB, logo: site.logo_url || `${WEB}/logo-512.png`, ...(st.contact?.email ? { email: st.contact.email } : {}) }, { "@type": "WebSite", "@id": `${WEB}/#web`, url: WEB, name: site.name || "Fipilot AI", inLanguage: "vi", publisher: { "@id": `${WEB}/#org` }, ...(seo.search_action !== false ? { potentialAction: { "@type": "SearchAction", target: `${WEB}/tim-kiem?q={q}`, "query-input": "required name=q" } } : {}) }, ...(!(seo.schema_off || []).includes("home") ? [{ "@type": "SoftwareApplication", name: site.name || "Fipilot AI", applicationCategory: "HealthApplication", operatingSystem: "iOS, Android, Web" }] : [])] }, null, 2)}</pre></div>
          </Card>
        </div>
      )}
      {tab === 6 && (
        <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 0 }}><H t="Xác minh chủ web" />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Google Search Console" hint="Dán mã trong thẻ meta google-site-verification"><In v={tr.gsc} on={(v) => set("tracking", { gsc: v.replace(/.*content="([^"]+)".*/, "$1").trim() })} ph="Mã xác minh Google" m testid="web-tr-gsc" /></Field>
                <Field label="Bing Webmaster"><In v={tr.bing} on={(v) => set("tracking", { bing: v.replace(/.*content="([^"]+)".*/, "$1").trim() })} ph="Mã xác minh Bing" m /></Field>
                <Field label="Facebook (xác minh tên miền)"><In v={tr.fb_domain} on={(v) => set("tracking", { fb_domain: v.replace(/.*content="([^"]+)".*/, "$1").trim() })} ph="Mã facebook-domain-verification" m /></Field>
              </div>
            </Card>
            <Card style={{ padding: 0 }}><H t="Đo lượng khách" />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <Tog on={!!tr.vercel_analytics} onChange={(v) => set("tracking", { vercel_analytics: v })} label="Vercel Analytics (miễn phí, không cần cookie)" />
                <Field label="Google Analytics 4" hint="Mã đo lường dạng G-XXXXXXX"><In v={tr.ga4} on={(v) => set("tracking", { ga4: v.trim().toUpperCase() })} ph="G-…" m testid="web-tr-ga4" /></Field>
                <Field label="Facebook Pixel"><In v={tr.fb_pixel} on={(v) => set("tracking", { fb_pixel: v.replace(/\D/g, "") })} ph="Mã Pixel" m /></Field>
                <Tog on={tr.lazy !== false} onChange={(v) => set("tracking", { lazy: v })} label="Vercel Analytics, Facebook Pixel chỉ chạy sau khi trang hiện xong (web nhanh hơn) · Google Analytics luôn nằm sẵn trong <head> để Google kiểm tra được" />
              </div>
            </Card>
          </div>
          <Card style={{ padding: 0 }}><H t="Chèn mã tuỳ ý" r={<span style={{ fontSize: 12, color: PC.t3 }}>Chỉ chạy trên web, không chạy trong app</span>} />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {[["head", "Trong <head>", "<!-- ví dụ: mã xác minh khác -->"], ["body_start", "Ngay sau <body>", ""], ["body_end", "Cuối <body>", ""]].map(([k, t, ph]) => <Field key={k} label={t}><Code v={tr[k]} on={(v) => set("tracking", { [k]: v })} ph={ph} /></Field>)}
              <span style={{ fontSize: 11.5, color: PC.t3, lineHeight: 1.5 }}>Mã trong &lt;head&gt; (script, meta, link) được in thẳng vào HTML — Google, Facebook kiểm tra thấy ngay. Mã Google Analytics nên dán số G-… vào ô "Google Analytics 4" bên trái thay vì dán cả đoạn. Mỗi đoạn mã chèn thêm làm web chậm hơn — chỉ dán khi thật cần.</span>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

// Bảng chuyển hướng gọn (tab Đường dẫn)
function RedirectMini({ go, go404 }) {
  const [rows, setRows] = useState(null);
  const [n404, setN404] = useState(0);
  useEffect(() => { supabase.from("web_redirects").select("src,dest,code,hits").order("hits", { ascending: false }).limit(5).then(must).then(setRows).catch(() => setRows([])); supabase.from("web_404").select("path").eq("ignored", false).gte("last_seen", new Date(Date.now() - 7 * 864e5).toISOString()).then(must).then((r) => setN404(r.length)).catch(() => {}); }, []);
  const C = "1.3fr 1.3fr 60px 70px";
  return (
    <Card style={{ padding: 0 }}><H t="Chuyển hướng" r={<span style={{ fontSize: 12, color: PC.t3 }}>{rows ? `${rows.length} quy tắc dùng nhiều` : ""}</span>} />
      <div style={{ padding: "8px 0" }}>
        <div style={{ ...headRow(C), background: PC.headBg }}><span>Từ</span><span>Tới</span><span>Kiểu</span><span>Lượt</span></div>
        {(rows || []).map((r) => <div key={r.src} style={{ ...bodyRow(C), borderTop: `1px solid ${PC.rowLine}`, ...mono }}><span style={cell}>{r.src}</span><span style={cell}>{r.dest || "—"}</span><span><Pill tone={r.code === 301 ? "blue" : r.code === 302 ? "amber" : "gray"}>{r.code}</Pill></span><span style={{ ...cell, fontFamily: "-apple-system, 'system-ui', Inter, 'Inter Fallback', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'" }}>{r.hits}</span></div>)}
        {rows && !rows.length && <div style={{ padding: "12px 16px", fontSize: 12.5, color: PC.t3 }}>Chưa có quy tắc nào.</div>}
        <div style={{ padding: "10px 16px" }}><Btn kind="soft" onClick={go}>+ Thêm chuyển hướng</Btn>{n404 > 0 && <span style={{ marginLeft: 10, fontSize: 12, color: PC.t3 }}>Có {n404} link lỗi 404 tuần này · <Lnk onClick={go404}>xem & chuyển</Lnk></span>}</div>
      </div>
    </Card>
  );
}

// ===== Tab Chuyển hướng (138p) =====
function Redirects({ showToast, paths }) {
  const [rows, setRows] = useState(null);
  const [f, setF] = useState({ src: "", dest: "", code: 301, match: "exact" });
  const [fc, setFc] = useState(""); const [fs, setFs] = useState(""); const [q, setQ] = useState("");
  const [sel, setSel] = useState([]);
  const load = useCallback(() => supabase.from("web_redirects").select("*").order("created_at", { ascending: false }).limit(2000).then(must).then((r) => { setRows(r); setSel([]); }).catch((e) => showToast?.("Chưa tải được: " + e.message)), [showToast]);
  useEffect(() => { load(); }, [load]);
  const norm = (p) => { let s = String(p || "").trim(); if (!s) return ""; try { if (/^https?:/.test(s)) { const u = new URL(s); if (/fipilotai\.com$/.test(u.hostname)) s = u.pathname; else return s; } } catch (e) { /* */ } if (!s.startsWith("/")) s = "/" + s; return s.length > 1 ? s.replace(/\/+$/, "") : s; };
  const add = async () => {
    const src = norm(f.src); const dest = f.code === 410 ? null : norm(f.dest);
    if (!src || src === "/") return showToast?.("Nhập link cũ (VD /pho-bo-calo).");
    if (f.code !== 410 && !dest) return showToast?.("Nhập link chuyển tới.");
    if (src === dest) return showToast?.("Link cũ và link mới trùng nhau.");
    if ((rows || []).some((r) => r.src.toLowerCase() === src.toLowerCase())) return showToast?.(`Đã có quy tắc cho ${src}.`);
    try { await supabase.from("web_redirects").insert({ src: f.match === "prefix" && !src.endsWith("*") ? src + "*" : src, dest, code: f.code, match: f.match, source: "manual" }).then(must); setF({ src: "", dest: "", code: 301, match: "exact" }); showToast?.("Đã thêm chuyển hướng. Có hiệu lực trong khoảng 1 phút."); load(); }
    catch (e) { showToast?.("Chưa thêm được: " + (e.message || "")); }
  };
  const toggle = async (r, v) => { try { await supabase.from("web_redirects").update({ enabled: v }).eq("id", r.id).then(must); load(); } catch (e) { showToast?.(e.message); } };
  const del = async () => { if (!sel.length || !(await appConfirm(`Xoá ${sel.length} quy tắc chuyển hướng?`, { danger: true }))) return; try { await supabase.from("web_redirects").delete().in("id", sel).then(must); showToast?.("Đã xoá."); load(); } catch (e) { showToast?.(e.message); } };
  // Chuỗi: A → B và B → C → gộp thành A → C
  const chains = useMemo(() => { const by = Object.fromEntries((rows || []).filter((r) => r.enabled && r.match === "exact" && r.code !== 410).map((r) => [r.src.toLowerCase(), r])); return (rows || []).filter((r) => r.enabled && r.dest && by[r.dest.toLowerCase()] && by[r.dest.toLowerCase()].id !== r.id).map((r) => { const path = [r.src, r.dest]; let cur = by[r.dest.toLowerCase()]; const seen = new Set([r.id]); while (cur && !seen.has(cur.id)) { seen.add(cur.id); path.push(cur.dest); cur = cur.dest ? by[cur.dest.toLowerCase()] : null; } return { r, path }; }); }, [rows]);
  const flatten = async () => { try { let loop = 0; for (const { r, path } of chains) { const end = path[path.length - 1]; if (end.toLowerCase() === r.src.toLowerCase() || new Set(path.map((x) => x.toLowerCase())).size < path.length) { loop++; continue; } await supabase.from("web_redirects").update({ dest: end }).eq("id", r.id).then(must); } showToast?.(`Đã gộp ${chains.length - loop} chuỗi thành 1 bước.${loop ? ` ${loop} quy tắc chuyển vòng (A → B → A) — sửa tay.` : ""}`); load(); } catch (e) { showToast?.(e.message); } };
  const exportCsv = () => { const csv = ["tu,toi,kieu,cach_khop,luot,bat", ...(rows || []).map((r) => [r.src, r.dest || "", r.code, r.match, r.hits, r.enabled ? 1 : 0].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "chuyen-huong-fipilotai.csv"; a.click(); };
  const importCsv = async (file) => {
    if (!file) return; const text = await file.text(); const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).filter(Boolean);
    const have = new Set((rows || []).map((r) => r.src.toLowerCase())); const add = [];
    for (const l of lines) { const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()); const src = norm(c[0]); if (!src || /^(tu|from|src)$/i.test(c[0])) continue; const code = [301, 302, 410].includes(+c[2]) ? +c[2] : 301; const dest = code === 410 ? null : norm(c[1]); if (!have.has(src.toLowerCase()) && (dest || code === 410) && src !== dest) { add.push({ src, dest, code, match: c[3] === "prefix" ? "prefix" : "exact", source: "import" }); have.add(src.toLowerCase()); } }
    if (!add.length) return showToast?.("Không có dòng mới hợp lệ (cột: từ, tới, kiểu 301/302/410, cách khớp).");
    try { await supabase.from("web_redirects").insert(add).then(must); showToast?.(`Đã nhập ${add.length} quy tắc.`); load(); } catch (e) { showToast?.("Chưa nhập được: " + e.message); }
  };
  const list = (rows || []).filter((r) => (!fc || String(r.code) === fc) && (!fs || r.source === fs) && (!q || `${r.src} ${r.dest || ""}`.toLowerCase().includes(q.toLowerCase())));
  const C = "28px minmax(0,1.4fr) minmax(0,1.4fr) 70px 110px 0.6fr 0.9fr 1.1fr 50px";
  return (
    <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: 16, display: "grid", gridTemplateColumns: "1.4fr 1.4fr 150px 170px auto", gap: 12, alignItems: "end" }}>
        <Field label="Từ link"><In v={f.src} on={(v) => setF({ ...f, src: v })} ph="/an-dem-co-beo" m testid="web-rd-src" /></Field>
        <Field label="Chuyển tới"><input list="web-paths" value={f.dest} disabled={f.code === 410} onChange={(e) => setF({ ...f, dest: e.target.value })} placeholder={f.code === 410 ? "(đã xoá hẳn)" : "/an-toi-muon-co-beo-khong"} data-testid="web-rd-dest" className="pc-input" style={{ ...inpStyle(), ...mono }} /><datalist id="web-paths">{paths.slice(0, 500).map((p) => <option key={p} value={p} />)}</datalist></Field>
        <Field label="Kiểu"><select value={f.code} onChange={(e) => setF({ ...f, code: +e.target.value })} className="pc-input" style={inpStyle()}><option value={301}>301 · vĩnh viễn</option><option value={302}>302 · tạm thời</option><option value={410}>410 · đã xoá hẳn</option></select></Field>
        <Field label="Cách khớp"><select value={f.match} onChange={(e) => setF({ ...f, match: e.target.value })} className="pc-input" style={inpStyle()}><option value="exact">Đúng y link</option><option value="prefix">Bắt đầu bằng</option></select></Field>
        <Btn kind="blue" style={{ height: 40 }} onClick={add} testid="web-rd-add">+ Thêm</Btn>
      </Card>
      {chains.length > 0 && <div style={{ borderRadius: 12, background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", fontSize: 12.5, display: "flex", gap: 10, alignItems: "center" }}><b style={{ color: "#92400E" }}>Phát hiện {chains.length} chuỗi chuyển hướng:</b><span style={mono}>{chains[0].path.join(" → ")}</span><span style={{ marginLeft: "auto" }}><Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={flatten}>Gộp thành 1 bước</Btn></span></div>}
      <Card style={{ padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderBottom: `1px solid ${PC.headLine}` }}>
          <select value={fc} onChange={(e) => setFc(e.target.value)} className="pc-input" style={{ ...inpStyle(34), width: 150 }}><option value="">Mọi kiểu</option><option value="301">301</option><option value="302">302</option><option value="410">410</option></select>
          <select value={fs} onChange={(e) => setFs(e.target.value)} className="pc-input" style={{ ...inpStyle(34), width: 150 }}><option value="">Mọi nguồn</option>{Object.entries(SRC).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {sel.length > 0 && <Btn kind="danger" onClick={del}>Xoá {sel.length}</Btn>}
          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}><SearchBox value={q} onChange={setQ} placeholder="Tìm link…" width={220} /><label className="pc-btn" style={{ height: 34, padding: "0 14px", borderRadius: 10, background: "#F1F5F9", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Nhập file CSV<input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => importCsv(e.target.files?.[0])} /></label><Btn kind="light" onClick={exportCsv}>Xuất CSV</Btn></span>
        </div>
        <div style={{ ...headRow(C), background: PC.headBg }}><Check on={list.length > 0 && list.every((r) => sel.includes(r.id))} onChange={(v) => setSel(v ? list.map((r) => r.id) : [])} /><span>TỪ</span><span>TỚI</span><span>KIỂU</span><span>CÁCH KHỚP</span><span>LƯỢT</span><span>LẦN CUỐI</span><span>NGUỒN</span><span>BẬT</span></div>
        {!rows && <Loading />}
        {list.map((r) => <div key={r.id} data-testid="web-rd-row" style={{ ...bodyRow(C), minHeight: 52, borderBottom: `1px solid ${PC.rowLine}`, opacity: r.enabled ? 1 : 0.55 }}><Check on={sel.includes(r.id)} onChange={(v) => setSel((s) => (v ? [...s, r.id] : s.filter((x) => x !== r.id)))} /><span style={{ ...cell, ...mono }}>{r.src}</span><span style={{ ...cell, ...mono }}>{r.dest || "(đã xoá)"}</span><span><Pill tone={r.code === 301 ? "blue" : r.code === 302 ? "amber" : "gray"}>{r.code}</Pill></span><span style={cell}>{r.match === "prefix" ? "Bắt đầu bằng" : "Đúng y"}</span><span style={cell}>{r.hits}</span><span style={cell}>{r.last_hit ? day(r.last_hit) : "—"}</span><span style={{ ...cell, fontSize: 12, color: PC.t3 }}>{SRC[r.source] || r.source}</span><Tog on={r.enabled} onChange={(v) => toggle(r, v)} /></div>)}
        {rows && !list.length && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: PC.t3 }}>{rows.length ? "Không có quy tắc khớp bộ lọc." : "Chưa có chuyển hướng nào. Đổi đường dẫn bài đã đăng → web tự thêm."}</div>}
        <div style={{ padding: "12px 16px", fontSize: 12, color: PC.t3 }}>301 = chuyển hẳn (giữ điểm SEO) · 302 = tạm thời · 410 = đã xoá hẳn, báo Google bỏ khỏi kết quả.</div>
      </Card>
    </div>
  );
}

// ===== Tab Lỗi 404 & link hỏng (138n) =====
function NotFound({ showToast, paths }) {
  const [rows, setRows] = useState(null);
  const [fixed, setFixed] = useState(0);
  const [sel, setSel] = useState([]);
  const [broken, setBroken] = useState(null);
  const [scanning, setScanning] = useState(false);
  const load = useCallback(async () => {
    try { const [r, f] = await Promise.all([supabase.from("web_404").select("*").eq("ignored", false).order("hits", { ascending: false }).limit(300).then(must), supabase.from("web_404").select("path").eq("ignored", true).limit(2000).then(must)]); const rd = f.length ? await supabase.from("web_redirects").select("src").in("src", f.map((x) => x.path).slice(0, 300)).then(must) : []; setRows(r); setFixed(rd.length); setSel([]); }
    catch (e) { showToast?.("Chưa tải được nhật ký: " + e.message); setRows([]); }
  }, [showToast]);
  useEffect(() => { load(); }, [load]);
  const suggest = (p) => { let best = null, sc = 0; for (const x of paths) { const s = sim(p, x); if (s > sc) { sc = s; best = x; } } return sc >= 0.6 ? { to: best, pct: Math.round(sc * 100) } : null; };
  const bot = (p) => /\.(php|asp|env|git|sql|bak)|wp-|xmlrpc|\/\.well-known|cgi-bin/i.test(p);
  const redirect = async (r, code, to) => { if (code === 410 && !(await appConfirm(`Báo Google “${r.path}” đã xoá hẳn (410)? Google sẽ gỡ link này khỏi kết quả tìm kiếm.`, { danger: true }))) return; try { await supabase.from("web_redirects").upsert({ src: r.path, dest: code === 410 ? null : to, code, match: "exact", source: "manual", enabled: true }, { onConflict: "src" }).then(must); await supabase.from("web_404").update({ ignored: true }).eq("path", r.path).then(must); showToast?.(code === 410 ? `Đã báo 410 cho ${r.path}.` : `Đã chuyển ${r.path} → ${to}.`); load(); } catch (e) { showToast?.("Chưa làm được: " + e.message); } };
  const ignore = async (ps) => { if (!ps.length) return; try { await supabase.from("web_404").update({ ignored: true }).in("path", ps).then(must); showToast?.(`Đã bỏ qua ${ps.length} link.`); load(); } catch (e) { showToast?.(e.message); } };
  // Quét link nội bộ trong bài đã đăng: link tới trang không có → hỏng
  const scan = async () => {
    setScanning(true);
    try {
      const posts = await readAll(() => supabase.from("web_posts").select("id,title,slug,blocks").eq("status", "published").order("id"));
      const rds = await supabase.from("web_redirects").select("src,dest,code").eq("enabled", true).then(must);
      const have = new Set(paths.map((p) => p.toLowerCase())); const rd = Object.fromEntries(rds.map((r) => [r.src.toLowerCase(), r]));
      const out = [];
      for (const p of posts) { const html = JSON.stringify(p.blocks || []); for (const m of html.matchAll(/href=\\"(\/[^"\\#?]*)/g)) { const u = (m[1].length > 1 ? m[1].replace(/\/+$/, "") : m[1]).toLowerCase(); if (have.has(u)) continue; const r = rd[u]; out.push({ post: p, url: m[1], why: r ? (r.code === 410 ? "Trang đã xoá (410)" : `Chuyển tới ${r.dest}`) : "404", to: r?.code !== 410 ? r?.dest : null }); } }
      setBroken(out);
    } catch (e) { showToast?.("Chưa quét được: " + e.message); }
    setScanning(false);
  };
  const week = (rows || []).filter((r) => Date.now() - new Date(r.last_seen) < 7 * 864e5);
  const C = "28px minmax(0,1.5fr) 0.5fr 0.8fr 0.9fr minmax(0,1.6fr) 120px";
  return (
    <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Stat l="Link lỗi 404 (7 ngày)" n={week.length} c="#B91C1C" /><Stat l="Lượt khách gặp lỗi" n={(rows || []).reduce((n, r) => n + r.hits, 0)} s="tất cả link chưa xử lý" /><Stat l="Link hỏng trong bài" n={broken ? broken.length : "—"} c="#B45309" s={broken ? "vừa kiểm" : "bấm Kiểm ngay"} /><Stat l="Đã sửa bằng chuyển hướng" n={fixed} c="#15803D" />
      </div>
      <Card style={{ padding: 0 }}><H t="Link khách vào bị lỗi 404" r={<><span style={{ fontSize: 12, color: PC.t3 }}>Web tự ghi khi khách gặp trang lỗi</span><Btn kind="light" style={{ height: 30, fontSize: 12 }} disabled={!sel.length} onClick={() => ignore(sel)}>Bỏ qua mục đã chọn</Btn></>} />
        <div style={{ ...headRow(C), background: PC.headBg }}><Check on={(rows || []).length > 0 && rows.every((r) => sel.includes(r.path))} onChange={(v) => setSel(v ? rows.map((r) => r.path) : [])} /><span>LINK BỊ LỖI</span><span>LƯỢT</span><span>LẦN CUỐI</span><span>ĐẾN TỪ</span><span>GỢI Ý CHUYỂN TỚI</span><span /></div>
        {!rows && <Loading />}
        {(rows || []).map((r) => { const sg = suggest(r.path); const b = bot(r.path); const calo = /^\/calo\//.test(r.path); let ref = "Gõ thẳng"; try { if (r.referrer) { const h = new URL(r.referrer).hostname; ref = /google\./.test(h) ? "Google" : /facebook|fb\./.test(h) ? "Facebook" : /fipilotai/.test(h) ? "Trang nội bộ" : h; } } catch (e) { /* */ } if (b) ref = "Bot lạ"; return (
          <div key={r.path} data-testid="web-404-row" style={{ ...bodyRow(C), minHeight: 52, borderBottom: `1px solid ${PC.rowLine}`, background: sel.includes(r.path) ? PC.rowSel : "transparent" }}>
            <Check on={sel.includes(r.path)} onChange={(v) => setSel((s) => (v ? [...s, r.path] : s.filter((x) => x !== r.path)))} />
            <span style={{ ...cell, ...mono, color: "#B91C1C" }}>{r.path}</span><span style={cell}>{r.hits}</span><span style={cell}>{day(r.last_seen, true)}</span><span style={cell}>{ref}</span>
            <span style={{ ...cell, ...mono }}>{b ? <span style={{ fontSize: 12, color: PC.t3, fontFamily: "-apple-system, 'system-ui', Inter, 'Inter Fallback', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'" }}>Bot dò lỗi — không cần làm gì</span> : sg ? <>{sg.to} <span style={{ color: "#15803D", fontFamily: "-apple-system, 'system-ui', Inter, 'Inter Fallback', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'" }}>· giống {sg.pct}%</span></> : <span style={{ fontSize: 12, color: PC.t3, fontFamily: "-apple-system, 'system-ui', Inter, 'Inter Fallback', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'" }}>{calo ? "Trang calo này không có / đang tắt" : "Chưa có gợi ý — thêm tay ở tab Chuyển hướng"}</span>}</span>
            <span>{b ? <Btn kind="light" style={{ height: 30, fontSize: 12 }} onClick={() => ignore([r.path])}>Bỏ qua</Btn> : sg ? <Btn kind="blue" style={{ height: 30, fontSize: 12 }} onClick={() => redirect(r, 301, sg.to)} testid="web-404-fix">Chuyển 301</Btn> : <Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={() => redirect(r, 410)}>Báo 410</Btn>}</span>
          </div>); })}
        {rows && !rows.length && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: PC.t3 }}>Chưa có link lỗi nào chưa xử lý.</div>}
      </Card>
      <Card style={{ padding: 0 }}><H t="Link hỏng nằm trong bài" r={<><span style={{ fontSize: 12, color: PC.t3 }}>Kiểm link nội bộ (fipilotai.com/…)</span><Btn kind="light" style={{ height: 30, fontSize: 12 }} onClick={scan} disabled={scanning} testid="web-404-scan">{scanning ? "Đang kiểm…" : "Kiểm ngay"}</Btn></>} />
        <div style={{ ...headRow("minmax(0,1.6fr) minmax(0,1.6fr) 0.8fr 160px"), background: PC.headBg }}><span>BÀI CHỨA LINK</span><span>LINK HỎNG</span><span>LỖI</span><span /></div>
        {broken == null && <div style={{ padding: 20, fontSize: 12.5, color: PC.t3 }}>Bấm “Kiểm ngay” để quét các bài đã đăng.</div>}
        {broken?.map((x, i) => <div key={i} style={{ ...bodyRow("minmax(0,1.6fr) minmax(0,1.6fr) 0.8fr 160px"), minHeight: 52, borderBottom: `1px solid ${PC.rowLine}` }}><b style={{ ...cell, color: BLUE }}>{x.post.title}</b><span style={{ ...cell, ...mono }}>{x.url}</span><span><Pill tone={x.why === "404" ? "red" : "amber"}>{x.why === "404" ? "404" : x.to ? "Chuyển 1 lần" : "410"}</Pill></span><span style={{ fontSize: 12, color: PC.t3 }}>{x.to ? `Nên đổi sang ${x.to}` : "Sửa trong bài"}</span></div>)}
        {broken && !broken.length && <div style={{ padding: 20, fontSize: 12.5, color: "#15803D", fontWeight: 700 }}>✓ Không có link nội bộ hỏng.</div>}
      </Card>
    </div>
  );
}
