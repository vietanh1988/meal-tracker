// Từng khối của trình soạn bài (138b). Khối chữ = contentEditable (giữ đậm, nghiêng, link…); khối khác = ô nhập riêng.
import { useEffect, useMemo, useRef, useState } from "react";
import { PC } from "../../theme";
import { LOCAL_FOODS, UNIT_MAP } from "../../lib/localFoodDB";
import { foodSlugs } from "../../../web/lib/slug.js";
const F_SLUG = foodSlugs(Object.keys(LOCAL_FOODS));
import { Btn } from "../pcUI";
import { inpStyle, BLUE } from "./webUI";
import { clean, youtubeId, slugify } from "./webLib";
import { uploadImage } from "./webApi";
import { MediaPick } from "./MediaPick";
import { authFetch } from "../../lib/authFetch";
import LpEdit from "./LpEdit";

// Chữ trong trình soạn = tỉ lệ chữ bài trên web (đoạn 18/1,75 · H2 28/1,3 · H3 22/1,35), thu nhỏ cho khung soạn
const P = { fontSize: 17, lineHeight: 1.7, color: "#1E293B", margin: 0, outline: "none", minHeight: 29 };
const H = { 2: { fontSize: 25, fontWeight: 800, lineHeight: 1.3 }, 3: { fontSize: 21, fontWeight: 800, lineHeight: 1.35 }, 4: { fontSize: 18, fontWeight: 800, lineHeight: 1.4 } };

// Ô chữ sửa trực tiếp; chỉ ghi lại innerHTML khi giá trị đổi từ ngoài (không làm nhảy con trỏ khi gõ)
export function Rich({ html, onChange, style, placeholder, as: Tag = "div", elRef, onKeyDown, onFocus, onPaste, testid }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el && el.innerHTML !== (html || "")) el.innerHTML = html || ""; }, [html]);
  return (
    <Tag ref={(el) => { ref.current = el; if (elRef) elRef(el); }} contentEditable suppressContentEditableWarning data-ph={placeholder} data-testid={testid} className="web-rich"
      onInput={(e) => onChange(e.currentTarget.innerHTML)} onKeyDown={onKeyDown} onFocus={onFocus} onPaste={onPaste}
      style={{ ...P, ...style }} />
  );
}

// Danh sách: 1 ô <ul>/<ol> sửa trực tiếp, mỗi <li> là 1 ý
export function ListEdit({ b, set, elRef, onFocus, onKeyDown, onPaste }) {
  const ref = useRef(null);
  const html = (b.items || [""]).map((x) => `<li>${x || "<br>"}</li>`).join("");
  useEffect(() => { const el = ref.current; if (el && el.dataset.v !== html) { el.innerHTML = html; el.dataset.v = html; } }, [html]);
  const Tag = b.ordered ? "ol" : "ul";
  const read = (el) => { const items = [...el.querySelectorAll(":scope > li")].map((li) => li.innerHTML.replace(/^<br>$/, "")); el.dataset.v = (items.length ? items : [""]).map((x) => `<li>${x || "<br>"}</li>`).join(""); set({ items: items.length ? items : [""] }); };
  return <Tag ref={(el) => { ref.current = el; elRef?.(el); }} contentEditable suppressContentEditableWarning className="web-rich" onInput={(e) => read(e.currentTarget)} onFocus={onFocus} onKeyDown={onKeyDown} onPaste={onPaste} style={{ ...P, paddingLeft: 24, margin: 0, display: "flex", flexDirection: "column", gap: 6 }} />;
}

const Box = ({ label, children, testid }) => (
  <div data-testid={testid} style={{ borderRadius: 14, border: "1.5px dashed #BFD4FF", background: "#F5F9FF", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
    {label && <span style={{ fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: ".04em" }}>{label}</span>}
    {children}
  </div>
);
const In = ({ v, on, ph, w, mono, testid, type = "text" }) => <input type={type} value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} data-testid={testid} className="pc-input" style={{ ...inpStyle(34), width: w || "100%", fontFamily: mono ? "ui-monospace, Menlo, monospace" : "inherit" }} />;
const Ta = ({ v, on, ph, h = 70, mono }) => <textarea value={v || ""} onChange={(e) => on(e.target.value)} placeholder={ph} className="pc-input" style={{ ...inpStyle(h), height: h, padding: "8px 12px", resize: "vertical", lineHeight: 1.55, fontFamily: mono ? "ui-monospace, Menlo, monospace" : "inherit" }} />;
const THUMB = "https://fipilotai.com/img/bowl-1.jpg";
const small = { height: 28, fontSize: 12, padding: "0 10px" };

// Kho món Việt có khẩu phần (giống trang /calo/… của web)
const r1 = (n) => Math.round(n * 10) / 10;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const FOODS = Object.entries(LOCAL_FOODS).filter(([k, f]) => (UNIT_MAP[k] || []).length).map(([k, f]) => ({ key: k, slug: F_SLUG[k], name: cap(k), vn: f.region === "vn", portions: UNIT_MAP[k].map((u) => ({ name: u.name, gram: u.gram, cal: Math.round((f.cal * u.gram) / 100), p: r1((f.p * u.gram) / 100), c: r1((f.c * u.gram) / 100), f: r1((f.f * u.gram) / 100) })) })).sort((a, b) => (b.vn - a.vn) || a.name.localeCompare(b.name, "vi"));
const FOOD = Object.fromEntries(FOODS.map((f) => [f.key, f]));
function FoodPick({ value, onPick, testid }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = useMemo(() => { const s = slugify(q.trim()); return (s ? FOODS.filter((f) => slugify(f.key).includes(s) || slugify(f.name).includes(s)) : FOODS).slice(0, 8); }, [q]); // gõ không dấu vẫn ra ("pho bo")
  return (
    <span style={{ position: "relative", width: 130 }}>
      <input value={open ? q : (FOOD[value]?.name || "")} onFocus={() => { setOpen(true); setQ(""); }} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món: phở bò…" data-testid={testid} className="pc-input" style={inpStyle(36)} />
      {open && <span style={{ position: "absolute", top: 38, left: 0, width: 260, zIndex: 6, background: "#FFF", borderRadius: 10, border: `1px solid ${PC.line}`, boxShadow: "0 8px 22px rgba(15,23,42,.12)", padding: 4, display: "flex", flexDirection: "column" }}>
        {list.map((f) => <button key={f.key} type="button" onMouseDown={(e) => { e.preventDefault(); onPick(f.key); setOpen(false); }} style={{ textAlign: "left", border: 0, background: "none", padding: "6px 8px", borderRadius: 7, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}><b>{f.name}</b> <span style={{ color: PC.t4 }}>{f.portions[0].cal} kcal / {f.portions[0].name}</span></button>)}
        {!list.length && <span style={{ padding: 8, fontSize: 12, color: PC.t4 }}>Không có món này trong kho</span>}
      </span>}
    </span>
  );
}

function Upload({ onDone, label = "Chọn ảnh từ máy", name, showToast, testid, box, link, big }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return showToast?.("Chỉ nhận file ảnh.");
    setBusy(true);
    try { onDone(await uploadImage(file, name || file.name.replace(/\.\w+$/, ""), { big })); } catch (e) { showToast?.("Chưa tải ảnh lên được: " + (e.message || "")); }
    setBusy(false);
  };
  return (
    <label style={{ display: box ? "flex" : "inline-flex" }}>
      <input type="file" accept="image/*" data-testid={testid} style={{ display: "none" }} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {link ? <span style={{ color: BLUE, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{busy ? "Đang tải…" : label}</span> : box ? <span style={{ width: "100%", height: 70, borderRadius: 10, border: "1.5px dashed #BFD4FF", background: "#F5F9FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: BLUE, fontWeight: 700, cursor: "pointer" }}>{busy ? "Đang tải…" : label}</span>
        : <span className="pc-btn" style={{ ...small, borderRadius: 10, background: "#F1F5F9", display: "inline-flex", alignItems: "center", fontWeight: 800, cursor: "pointer" }}>{busy ? "Đang tải…" : label}</span>}
    </label>
  );
}
export { Upload };
export const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1024)} KB`);

// Chọn ảnh có sẵn trong Thư viện ảnh
function LibBtn({ onPick }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} data-testid="web-blk-img-lib" className="pc-btn" style={{ ...small, borderRadius: 10, background: "#E8F1FF", color: BLUE, border: 0, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Chọn từ thư viện</button>
    {open && <MediaPick onClose={() => setOpen(false)} onPick={(r) => { onPick(r); setOpen(false); }} />}
  </>;
}
// "✦ Vẽ bằng AI / Vẽ lại": vẽ ảnh theo mô tả (alt) bằng Flux (hàm web-writer, khoá fal.ai ở Kết nối AI); tiền cộng vào bài AI nếu có
export function AiDrawBtn({ alt, slug, postId, cover, has, onDone, showToast, testid }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!String(alt || "").trim()) return showToast?.("Nhập mô tả ảnh (alt) trước, AI vẽ theo câu đó.");
    setBusy(true);
    const d = await authFetch("web-writer", { action: "redraw", alt, slug, post_id: postId || null, cover: !!cover }).catch((e) => ({ error: e.message }));
    setBusy(false);
    if (d?.url) { onDone(d.url); showToast?.("Đã vẽ ảnh mới (đã lưu vào Thư viện ảnh)."); } else showToast?.("Chưa vẽ được: " + (d?.error || "lỗi không rõ"));
  };
  return <Btn kind="soft" style={{ height: 28, fontSize: 12 }} disabled={busy} onClick={run} testid={testid} title="AI vẽ ảnh theo mô tả (alt) · ~0,003 USD/ảnh">{busy ? "Đang vẽ…" : has ? "✦ Vẽ lại" : "✦ Vẽ bằng AI"}</Btn>;
}

// Khối không phải chữ
export function OtherBlock({ b, set, showToast, slug, postId }) {
  switch (b.type) {
    case "img": return (
      <Box label="ẢNH · tự nén WebP" testid="web-blk-img">
        {b.url ? <img src={b.url} alt={b.alt || ""} style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 12, objectFit: "contain", alignSelf: "flex-start" }} /> : <span style={{ fontSize: 12.5, color: PC.t3 }}>Chọn ảnh từ máy (tự đổi WebP, rộng tối đa 1200 px, dưới 150 KB) hoặc dán đường dẫn ảnh.</span>}
        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><Upload name={b.alt || slug} showToast={showToast} onDone={(r) => { set({ url: r.url, width: r.width, height: r.height }); showToast?.(`Đã tải ảnh · ${kb(r.size)} (gốc ${kb(r.orig)})`); }} label={b.url ? "Thay ảnh" : "Chọn ảnh từ máy"} /><LibBtn onPick={(r) => set({ url: r.url, alt: b.alt || r.alt || "", width: r.width || undefined, height: r.height || undefined })} /><In v={b.url} on={(v) => set({ url: v })} ph="hoặc dán đường dẫn ảnh https://…" w={320} /></span>
        <In v={b.alt} on={(v) => set({ alt: v })} ph="Mô tả ảnh (alt) — giúp Google hiểu ảnh, VD: Tô phở bò tái chín" testid="web-blk-img-alt" />
        <span style={{ display: "flex", gap: 8 }}><AiDrawBtn alt={b.alt} slug={slug} postId={postId} has={!!b.url} onDone={(url) => set({ url, width: undefined, height: undefined })} showToast={showToast} testid="web-blk-img-ai" /></span>
        <In v={b.caption} on={(v) => set({ caption: v })} ph="Chú thích dưới ảnh (không bắt buộc)" />
      </Box>
    );
    case "gallery": return (
      <Box label="BỘ ẢNH">
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(b.images || []).map((im, i) => <span key={i} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4, width: 120 }}><img src={im.url} alt={im.alt || ""} style={{ width: 120, height: 96, borderRadius: 10, objectFit: "cover" }} /><input value={im.alt || ""} onChange={(e) => set({ images: b.images.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)) })} placeholder="Mô tả ảnh (alt)" className="pc-input" data-testid="web-blk-gal-alt" style={{ ...inpStyle(28), fontSize: 11.5, padding: "0 8px", borderColor: im.alt ? undefined : "#FCA5A5" }} /><button type="button" aria-label="Bỏ ảnh" onClick={() => set({ images: b.images.filter((_, k) => k !== i) })} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, border: 0, background: "rgba(15,23,42,.6)", color: "#FFF", cursor: "pointer" }}>×</button></span>)}</span>
        <Upload showToast={showToast} name={slug} label="+ Thêm ảnh" onDone={(r) => set({ images: [...(b.images || []), { url: r.url, alt: "", width: r.width, height: r.height }] })} />
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={b.shape === "phone"} onChange={(e) => set({ shape: e.target.checked ? "phone" : undefined })} data-testid="web-blk-gal-phone" /> Ảnh màn hình điện thoại (giữ nguyên tỉ lệ, có chú thích dưới ảnh)</label>
        {b.shape === "phone" && (b.images || []).map((im, i) => <In key={i} v={im.caption} on={(v) => set({ images: b.images.map((x, k) => (k === i ? { ...x, caption: v } : x)) })} ph={`Chú thích ảnh ${i + 1}`} />)}
      </Box>
    );
    case "youtube": { const id = b.id; return (
      <Box label="VIDEO YOUTUBE">
        <In v={b._raw ?? id} on={(v) => set({ _raw: v, id: youtubeId(v) })} ph="Dán link YouTube, VD: https://www.youtube.com/watch?v=…" testid="web-blk-yt" />
        {id ? <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="" style={{ width: 320, borderRadius: 10 }} /> : <span style={{ fontSize: 12, color: PC.t4 }}>Chưa nhận ra mã video.</span>}
        <In v={b.title} on={(v) => set({ title: v })} ph="Tên video (cho người dùng trình đọc màn hình)" />
      </Box>
    ); }
    case "video": return ( // 26/10: video .mp4 (VD video giới thiệu Pi ở /video/…) — dán link; ảnh bìa chọn như ảnh thường
      <Box label="VIDEO .MP4" testid="web-blk-video">
        <In v={b.url} on={(v) => set({ url: v.trim() })} ph="Đường dẫn video .mp4, VD: /video/pi-gioi-thieu.mp4" testid="web-blk-video-url" />
        {b.url ? <video src={b.url} poster={b.poster || undefined} controls playsInline preload="metadata" style={{ width: b.vertical ? 220 : 360, borderRadius: 12, background: "#000" }} /> : <span style={{ fontSize: 12, color: PC.t4 }}>Chưa có video.</span>}
        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 12.5, color: PC.t3 }}>Ảnh bìa:</span><Upload name={slug} showToast={showToast} onDone={(r) => set({ poster: r.url })} label={b.poster ? "Thay ảnh bìa" : "Chọn ảnh bìa"} /><LibBtn onPick={(r) => set({ poster: r.url })} /><In v={b.poster} on={(v) => set({ poster: v })} ph="hoặc dán đường dẫn ảnh" w={260} /></span>
        <In v={b.title} on={(v) => set({ title: v })} ph="Tên video (Google + trình đọc màn hình)" testid="web-blk-video-title" />
        <In v={b.caption} on={(v) => set({ caption: v })} ph="Chú thích dưới video (không bắt buộc)" />
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={!!b.vertical} onChange={(e) => set({ vertical: e.target.checked })} /> Video dọc (điện thoại 9:16)</label>
      </Box>
    );
    case "cols": return (
      <Box label={`CHIA ${b.cols.length} CỘT`}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${b.cols.length},1fr)`, gap: 12 }}>{b.cols.map((c, i) => <Rich key={i} html={c} onChange={(v) => set({ cols: b.cols.map((x, k) => (k === i ? v : x)) })} placeholder={`Cột ${i + 1}`} style={{ background: "#FFF", borderRadius: 10, padding: 10, fontSize: 14.5 }} />)}</div>
        <span style={{ display: "flex", gap: 8 }}><Btn kind="light" style={small} onClick={() => set({ cols: b.cols.length === 2 ? [...b.cols, ""] : b.cols.slice(0, 2) })}>{b.cols.length === 2 ? "Thành 3 cột" : "Thành 2 cột"}</Btn></span>
      </Box>
    );
    case "button": return (
      <Box label="NÚT BẤM">
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><In v={b.label} on={(v) => set({ label: v })} ph="Chữ trên nút" w={220} /><In v={b.url} on={(v) => set({ url: v })} ph="Đường dẫn https://…" w={320} /></span>
        <span style={{ display: "flex", gap: 8, fontSize: 12.5, alignItems: "center" }}>Kiểu:{[["solid", "Nền xanh"], ["outline", "Viền"]].map(([v, l]) => <Btn key={v} kind={b.style === v ? "soft" : "light"} style={small} onClick={() => set({ style: v })}>{l}</Btn>)}<span style={{ width: 10 }} />Căn:{[["left", "Trái"], ["center", "Giữa"]].map(([v, l]) => <Btn key={v} kind={b.align === v ? "soft" : "light"} style={small} onClick={() => set({ align: v })}>{l}</Btn>)}</span>
      </Box>
    );
    case "hr": return <hr style={{ border: 0, borderTop: `2px solid ${PC.line}`, margin: "10px 0" }} />;
    case "toc": return <Box label="MỤC LỤC TỰ ĐỘNG"><span style={{ fontSize: 13, color: PC.t2 }}>Web tự lấy các tiêu đề H2 / H3 trong bài làm mục lục ở chỗ này.</span></Box>;
    case "calo": { const f = FOOD[b.food]; const por = f?.portions.find((p) => p.name === b.portion) || f?.portions.find((p) => /vừa/.test(p.name)) || f?.portions[0]; return (
      <Box testid="web-blk-calo">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={THUMB} alt="" style={{ width: 52, height: 52, borderRadius: 26, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 6px rgba(15,23,42,.12)" }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: ".04em" }}>KHỐI CALO MÓN · lấy từ kho món</span>
            {f && por ? <><b style={{ fontSize: 15 }}>{f.name} · {por.name} {por.gram} g — {por.cal} kcal</b><span style={{ fontSize: 12, color: PC.t3 }}>Đạm {String(por.p).replace(".", ",")} g · Tinh bột {String(por.c).replace(".", ",")} g · Chất béo {String(por.f).replace(".", ",")} g</span></> : <b style={{ fontSize: 14, color: PC.t3 }}>Chọn món trong kho</b>}
          </span>
          <FoodPick value={b.food} onPick={(k) => set({ food: k, portion: "" })} testid="web-blk-calo-food" />
          {f && <select value={por?.name || ""} onChange={(e) => set({ portion: e.target.value })} aria-label="Khẩu phần" className="pc-input" style={{ ...inpStyle(36), width: 130 }}>{f.portions.map((p) => <option key={p.name} value={p.name}>{p.name.charAt(0).toUpperCase() + p.name.slice(1)} {p.gram} g</option>)}</select>}
        </div>
      </Box>
    ); }
    case "calo_table": return (
      <Box label="BẢNG CALO NHIỀU MÓN · lấy từ kho món">
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(b.foods || []).map((k) => <span key={k} style={{ fontSize: 12.5, background: "#E8F1FF", color: BLUE, fontWeight: 700, borderRadius: 7, padding: "4px 8px", display: "inline-flex", gap: 6 }}>{FOOD[k]?.name || k}<button type="button" aria-label="Bỏ món" onClick={() => set({ foods: b.foods.filter((x) => x !== k) })} style={{ border: 0, background: "none", color: BLUE, cursor: "pointer", padding: 0 }}>×</button></span>)}</span>
        <FoodPick value="" onPick={(k) => !b.foods.includes(k) && set({ foods: [...b.foods, k] })} />
      </Box>
    );
    case "faq": return (
      <Box label="HỎI ĐÁP · web tự sinh schema FAQ" testid="web-blk-faq">
        <In v={b.title} on={(v) => set({ title: v })} ph="Tiêu đề phần hỏi đáp (để trống nếu không cần)" />
        {(b.items || []).map((x, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, background: "#FFF", borderRadius: 10, padding: 10 }}>
            <span style={{ display: "flex", gap: 8 }}><In v={x.q} on={(v) => set({ items: b.items.map((y, k) => (k === i ? { ...y, q: v } : y)) })} ph={`Câu hỏi ${i + 1}`} /><Btn kind="light" style={small} onClick={() => set({ items: b.items.filter((_, k) => k !== i) })}>Bỏ</Btn></span>
            <Ta v={x.a} on={(v) => set({ items: b.items.map((y, k) => (k === i ? { ...y, a: v } : y)) })} ph="Trả lời ngắn, đúng trọng tâm" h={60} />
          </div>
        ))}
        <Btn kind="light" style={{ ...small, alignSelf: "flex-start" }} onClick={() => set({ items: [...(b.items || []), { q: "", a: "" }] })}>+ Thêm câu hỏi</Btn>
      </Box>
    );
    case "app": return (
      <Box label="HỘP MỜI MỞ APP · để trống dùng chữ mặc định">
        <In v={b.title} on={(v) => set({ title: v })} ph="Muốn app lên sẵn thực đơn đúng calo?" />
        <In v={b.text} on={(v) => set({ text: v })} ph="Fipilot AI tự lên thực đơn món Việt đúng calo cho bạn — miễn phí." />
        <span style={{ display: "flex", gap: 8 }}><In v={b.button} on={(v) => set({ button: v })} ph="Mở app" w={160} /><In v={b.url} on={(v) => set({ url: v })} ph="Đường dẫn (để trống = app.fipilotai.com)" /></span>
      </Box>
    );
    case "table": { const nc = Math.max(1, b.head.length); const cellIn = (v, on, head) => <input value={v || ""} onChange={(e) => on(e.target.value)} className="pc-input" style={{ ...inpStyle(32), fontWeight: head ? 800 : 500, background: head ? "#F5F8FD" : "#FFF" }} placeholder={head ? "Tiêu đề cột" : ""} />; return (
      <Box label="BẢNG">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${nc},1fr)`, gap: 6 }}>
          {b.head.map((h, j) => <span key={`h${j}`}>{cellIn(h, (v) => set({ head: b.head.map((x, k) => (k === j ? v : x)) }), true)}</span>)}
          {b.rows.map((r, i) => r.map((c, j) => <span key={`${i}-${j}`}>{cellIn(c, (v) => set({ rows: b.rows.map((rr, ii) => (ii === i ? rr.map((x, k) => (k === j ? v : x)) : rr)) }))}</span>))}
        </div>
        <span style={{ display: "flex", gap: 8 }}>
          <Btn kind="light" style={small} onClick={() => set({ rows: [...b.rows, Array(nc).fill("")] })}>+ Hàng</Btn>
          <Btn kind="light" style={small} onClick={() => set({ head: [...b.head, ""], rows: b.rows.map((r) => [...r, ""]) })}>+ Cột</Btn>
          <Btn kind="light" style={small} disabled={b.rows.length < 2} onClick={() => set({ rows: b.rows.slice(0, -1) })}>− Hàng</Btn>
          <Btn kind="light" style={small} disabled={nc < 2} onClick={() => set({ head: b.head.slice(0, -1), rows: b.rows.map((r) => r.slice(0, -1)) })}>− Cột</Btn>
        </span>
      </Box>
    ); }
    case "html": return <Box label="ĐOẠN HTML · web lọc bỏ mã chạy (script)"><Ta v={b.html} on={(v) => set({ html: v })} ph="<p>…</p>" h={120} mono /></Box>;
    default: return /^lp_/.test(b.type) ? <LpEdit b={b} set={set} showToast={showToast} /> : null;
  }
}

// Dán chữ thường vào khối chữ: giữ đậm/nghiêng/link, bỏ định dạng thừa
export const inlineClean = (html) => clean(html).replace(/<\/?(p|div|h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|figure|figcaption|blockquote|hr|img)[^>]*>/gi, " ").replace(/\s+/g, " ").trim();
export { P as TEXT_STYLE, H as H_STYLE };
