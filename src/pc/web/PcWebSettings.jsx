// Quản trị PC › WEB & BÀI VIẾT › Cài đặt web (bản vẽ 138k): Chung · Logo & biểu tượng · Thanh thông báo · Liên hệ & mạng xã hội ·
// Chân trang (dải calo món phổ biến, thẻ mời app) · Nút "Dùng thử" & bảo trì (503). Lưu → web_settings (web đổi theo ~1 phút).
// Ô liên hệ để trống: web lấy từ trang Giới thiệu của app (email, hotline, Zalo, Facebook) — không phải nhập 2 nơi.
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { Btn, Card, ErrorBox, Loading } from "../pcUI";
import { Tog, Field, Lnk, Modal, inpStyle, BLUE } from "./webUI";
import { Upload, FOODS } from "./BlockEdit";

const must = ({ data, error }) => { if (error) throw error; return data; };
const KEYS = ["site", "contact", "footer", "notice_bar", "maintenance"];
const H = ({ t, r }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>{t}</b><span style={{ marginLeft: "auto" }}>{r}</span></div>;
const In = ({ v, on, ph, mono, testid, type = "text", disabled }) => <input type={type} value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={ph} disabled={disabled} data-testid={testid} className="pc-input" style={{ ...inpStyle(), fontFamily: mono ? "ui-monospace, Menlo, monospace" : "inherit", background: disabled ? "#F8FAFC" : "#FFF" }} />;
const toDate = (iso) => (iso ? new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 10) : "");
const fromDate = (v, end) => (v ? new Date(`${v}T${end ? "23:59:59" : "00:00:00"}+07:00`).toISOString() : null);

export function PcWebSettings({ top, showToast, appSettings, go }) {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [foodsOpen, setFoodsOpen] = useState(false);
  let about = {}; try { about = JSON.parse(appSettings?.about_page || "{}"); } catch (e) { /* */ }

  useEffect(() => { (async () => { try { const rows = await supabase.from("web_settings").select("key,value").in("key", KEYS).then(must); const o = Object.fromEntries(KEYS.map((k) => [k, {}])); for (const r of rows) o[r.key] = r.value || {}; setS(o); } catch (e) { setErr("Chưa tải được cài đặt. " + (e.message || "")); } })(); }, []);
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);
  const set = (k, patch) => { setS((x) => ({ ...x, [k]: { ...x[k], ...patch } })); setDirty(true); };

  const save = async () => {
    if (s.maintenance?.enabled && !(await appConfirm("Đang bật chế độ bảo trì: khách vào fipilotai.com chỉ thấy trang “Đang nâng cấp”. Vẫn lưu?", { danger: true }))) return;
    const n = parseInt(s.site.posts_per_page, 10);
    if (!(n >= 3 && n <= 48)) return showToast?.("Số bài mỗi trang từ 3 đến 48.");
    setBusy(true);
    try { await supabase.from("web_settings").upsert(KEYS.map((k) => ({ key: k, value: k === "site" ? { ...s.site, posts_per_page: n } : s[k], updated_at: new Date().toISOString() })), { onConflict: "key" }).then(must); setDirty(false); showToast?.("Đã lưu cài đặt web. Web đổi theo trong khoảng 1 phút."); }
    catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };

  if (err) return <>{top(null)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!s) return <>{top(null)}<Loading /></>;
  const site = s.site, c = s.contact, f = s.footer, nb = s.notice_bar, mt = s.maintenance;
  const pop = f.popular_foods || ["phở bò", "cơm tấm", "bánh mì thịt", "bún chả", "bún bò huế", "bánh cuốn", "cháo gà"];
  const tile = (t, sub, key, el, name) => (
    <div style={{ borderRadius: 12, border: `1px solid ${PC.line}`, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ height: 64, borderRadius: 8, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, overflow: "hidden" }}>{el}</div>
      <b style={{ fontSize: 12.5 }}>{t}</b><span style={{ fontSize: 11, color: PC.t3 }}>{sub}</span>
      <span style={{ display: "flex", gap: 10, alignItems: "center" }}><Upload link showToast={showToast} name={name} label="Đổi" onDone={(r) => set("site", { [key]: r.url })} />{site[key] && <Lnk red onClick={() => set("site", { [key]: "" })}>Về mặc định</Lnk>}</span>
    </div>
  );
  return (
    <>
      {top(<Btn kind="blue" onClick={save} disabled={busy || !dirty} testid="web-set-save">{busy ? "Đang lưu…" : "Lưu thay đổi"}</Btn>, "Cài đặt web", "Thông tin chung của fipilotai.com — đổi ở đây, mọi trang tự đổi theo")}
      <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 0 }}><H t="Chung" />
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Tên web"><In v={site.name} on={(v) => set("site", { name: v })} testid="web-set-name" /></Field>
              <Field label="Khẩu hiệu"><In v={site.tagline} on={(v) => set("site", { tagline: v })} /></Field>
              <Field label="Trang chủ là"><In v="Trang chủ (bản vẽ 137)" on={() => {}} disabled /></Field>
              <Field label="Trang danh sách bài"><In v="/bai-viet" on={() => {}} mono disabled /></Field>
              <Field label="Số bài mỗi trang"><In v={site.posts_per_page ?? 12} on={(v) => set("site", { posts_per_page: v.replace(/\D/g, "") })} type="text" /></Field>
              <Field label="Ngôn ngữ · giờ"><In v="Tiếng Việt · giờ Việt Nam" on={() => {}} disabled /></Field>
            </div>
          </Card>
          <Card style={{ padding: 0 }}><H t="Logo & biểu tượng" />
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {tile("Logo", "SVG hoặc PNG nền trong", "logo_url", site.logo_url ? <img src={site.logo_url} alt="" style={{ maxHeight: 52, maxWidth: "100%" }} /> : <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#1A7CFF,#0050E6)", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>F</span><b>{site.name || "Fipilot AI"}</b></span>, "logo")}
              {tile("Biểu tượng tab (favicon)", "Vuông 512 × 512", "favicon_url", <img src={site.favicon_url || "/icon-192.png"} alt="" style={{ width: 40, height: 40, borderRadius: 10 }} />, "favicon")}
              {tile("Ảnh chia sẻ mặc định", "1200 × 630", "og_image", <img src={site.og_image || "https://fipilotai.com/og-image.jpg"} alt="" style={{ width: "100%", height: 52, objectFit: "cover", borderRadius: 6 }} />, "anh-chia-se")}
            </div>
          </Card>
          <Card style={{ padding: 0 }}><H t="Thanh thông báo đầu trang" r={<Tog on={!!nb.enabled} onChange={(v) => set("notice_bar", { enabled: v })} testid="web-set-bar" />} />
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
              <Field label="Chữ"><In v={nb.text} on={(v) => set("notice_bar", { text: v })} ph="Dùng thử 7 ngày miễn phí — không cần thẻ" /></Field>
              <Field label="Bấm vào dẫn tới"><In v={nb.url} on={(v) => set("notice_bar", { url: v.trim() })} ph="https://app.fipilotai.com/?ref=bar" mono /></Field>
              <Field label="Hiện từ ngày"><In type="date" v={toDate(nb.from)} on={(v) => set("notice_bar", { from: fromDate(v) })} /></Field>
              <Field label="Đến ngày"><In type="date" v={toDate(nb.to)} on={(v) => set("notice_bar", { to: fromDate(v, true) })} /></Field>
            </div>
          </Card>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 0 }}><H t="Liên hệ & mạng xã hội" />
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Email"><In v={c.email} on={(v) => set("contact", { email: v.trim() })} ph={about.contact || "email@…"} /></Field>
              <Field label="Điện thoại / Zalo"><In v={c.phone} on={(v) => set("contact", { phone: v })} ph={about.hotline || "09…"} /></Field>
              <Field label="Trang Facebook"><In v={c.facebook} on={(v) => set("contact", { facebook: v.trim() })} ph={about.facebook || "https://facebook.com/…"} testid="web-set-fb" /></Field>
              <Field label="Zalo OA"><In v={c.zalo} on={(v) => set("contact", { zalo: v.trim() })} ph={about.zalo ? `https://zalo.me/${about.zalo}` : "https://zalo.me/…"} /></Field>
              <Field label="TikTok"><In v={c.tiktok} on={(v) => set("contact", { tiktok: v.trim() })} ph="Không bắt buộc" /></Field>
              <Field label="YouTube"><In v={c.youtube} on={(v) => set("contact", { youtube: v.trim() })} ph="Không bắt buộc" /></Field>
              <span style={{ gridColumn: "1/-1", fontSize: 11.5, color: PC.t3 }}>Các link này dùng ở chân trang, trang Liên hệ và schema tổ chức (sameAs).</span>
            </div>
          </Card>
          <Card style={{ padding: 0 }}><H t="Chân trang" />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Dòng giới thiệu"><In v={f.about} on={(v) => set("footer", { about: v })} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Chữ bản quyền"><In v={f.copyright} on={(v) => set("footer", { copyright: v })} ph="© %nam% Fipilot AI" mono /></Field>
                <Field label="Dòng lưu ý"><In v={f.note} on={(v) => set("footer", { note: v })} /></Field>
              </div>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Tog on={f.show_calo !== false} onChange={(v) => set("footer", { show_calo: v })} label="Hiện dải “Calo món phổ biến”" /><span style={{ marginLeft: "auto" }}><Lnk onClick={() => setFoodsOpen(true)} testid="web-set-foods">Chọn món ({pop.length})</Lnk></span></span>
              <Tog on={f.show_app_card !== false} onChange={(v) => set("footer", { show_app_card: v })} label="Hiện thẻ mời dùng app trên chân trang" />
              <span style={{ fontSize: 11.5, color: PC.t3 }}>Các cột link ở chân trang sửa trong <Lnk onClick={() => go?.("web_menu")}>Menu</Lnk>.</span>
            </div>
          </Card>
          <Card style={{ padding: 0 }}><H t="Nút “Dùng thử” & bảo trì" />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Nút dùng thử dẫn tới" hint="Mỗi trang tự gắn thêm ?ref=<trang> để biết khách đến từ đâu"><In v={site.app_url} on={(v) => set("site", { app_url: v.trim() })} ph="https://app.fipilotai.com" mono /></Field>
              <Tog on={!!mt.enabled} onChange={(v) => set("maintenance", { enabled: v })} label="Bật chế độ bảo trì (khách thấy trang “Đang nâng cấp”, Google nhận mã 503)" testid="web-set-maint" />
            </div>
          </Card>
        </div>
      </div>
      {foodsOpen && <FoodsModal value={pop} onClose={() => setFoodsOpen(false)} onSave={(v) => { set("footer", { popular_foods: v }); setFoodsOpen(false); }} />}
    </>
  );
}

function FoodsModal({ value, onClose, onSave }) {
  const [list, setList] = useState(value);
  const [q, setQ] = useState("");
  const res = q.trim() ? FOODS.filter((x) => x.key.includes(q.trim().toLowerCase()) && !list.includes(x.key)).slice(0, 8) : [];
  return (
    <Modal title="Món hiện ở dải “Calo món phổ biến”" onClose={onClose} width={520} foot={<><Btn kind="light" onClick={onClose}>Huỷ</Btn><Btn kind="blue" onClick={() => onSave(list)}>Xong</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{list.map((k, i) => <span key={k} style={{ fontSize: 12.5, background: "#E8F1FF", color: BLUE, fontWeight: 700, borderRadius: 7, padding: "4px 8px", display: "inline-flex", gap: 6 }}>{i + 1}. {k}<button type="button" aria-label={`Bỏ ${k}`} onClick={() => setList(list.filter((x) => x !== k))} style={{ border: 0, background: "none", color: BLUE, cursor: "pointer", padding: 0 }}>×</button></span>)}</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm món trong kho để thêm…" className="pc-input" style={inpStyle()} />
        {res.map((x) => <button key={x.key} type="button" onClick={() => { setList([...list, x.key].slice(0, 10)); setQ(""); }} style={{ textAlign: "left", border: 0, background: "none", padding: "6px 8px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}><b>{x.name}</b> <span style={{ color: PC.t4 }}>{x.portions[0].cal} kcal / {x.portions[0].name}</span></button>)}
        <span style={{ fontSize: 11.5, color: PC.t3 }}>Tối đa 10 món. Số calo lấy từ kho món của app.</span>
      </div>
    </Modal>
  );
}
