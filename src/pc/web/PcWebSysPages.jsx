// Quản trị PC › WEB › Trang — khung "Trang có sẵn của web": các trang web không tạo trong danh sách bên dưới mà lấy dữ liệu chỗ khác.
// Dùng chung dữ liệu với app (không nhập 2 lần): Điều khoản / Chính sách = app_settings.terms_content, Giới thiệu = app_settings.about_page.
// Sửa ở đây là app + web cùng đổi. Muốn web khác app: "Tách riêng cho web" → tạo trang web cùng đường dẫn (đè lên bản của app).
import { useMemo } from "react";
import { PC } from "../../theme";
import { Btn, Pill, Card, headRow, bodyRow, cell } from "../pcUI";
import { BLUE } from "./webUI";
import { TermsPage } from "../../TermsPage";
import { AboutPage } from "../../AboutPage";
import { legalList, legalToBlocks } from "../../../web/lib/legal.js";
import { savePost, freeSlug } from "./webApi";

const WEB = "https://fipilotai.com";
const parse = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v || null; } catch (e) { return null; } };

export function PcWebSysPages({ rows, appSettings, go, onBuilder, onEdit, onSub: setSub, showToast, user, reload }) {
  const legal = useMemo(() => legalList(parse(appSettings?.terms_content)), [appSettings?.terms_content]);
  const about = parse(appSettings?.about_page) || {};
  const own = (slug) => (rows || []).find((p) => p.slug === slug && p.status !== "trash");
  // Tách riêng cho web: chép nội dung app sang 1 trang web cùng đường dẫn rồi mở trình soạn
  const fork = async (slug, title, blocks, template) => {
    try { const saved = await savePost({ kind: "page", title, slug: await freeSlug(slug), status: "draft", blocks, template, seo: {}, terms: [] }, { reason: "draft", uid: user?.id }); showToast?.("Đã chép sang trang web (bản nháp) — sửa xong bấm Đăng thì web dùng bản này thay cho bản của app."); await reload?.(); onEdit(saved.id); }
    catch (e) { showToast?.("Chưa tạo được: " + (e.message || "")); }
  };
  const list = [
    { t: "Trang chủ", u: "/", src: "Sửa trực tiếp trên trang (banner, nút, ảnh, ẩn / hiện khối)", act: <Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={onBuilder}>✎ Sửa tại chỗ</Btn> },
    own("gioi-thieu")
      ? { t: "Giới thiệu", u: "/gioi-thieu", src: <>Trang web riêng <Pill tone="blue">đè lên bản của app</Pill></>, act: <Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={() => onEdit(own("gioi-thieu").id)}>Sửa</Btn> }
      : { t: "Giới thiệu", u: "/gioi-thieu", src: `Giới thiệu của app${about.devName ? ` (${about.devName})` : ""} — dùng chung app + web`, act: <span style={{ display: "flex", gap: 6 }}><Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={() => setSub("about")} testid="web-sys-about">Sửa</Btn><Btn kind="light" style={{ height: 30, fontSize: 12 }} title="Viết câu chuyện riêng cho web bằng trình soạn (khác bản trong app)" onClick={() => fork("gioi-thieu", "Giới thiệu Fipilot AI", [about.devBio, about.description].filter(Boolean).map((x) => ({ type: "p", html: String(x).replace(/[<>]/g, "") })), null)}>Tách riêng cho web</Btn></span> },
    ...legal.map((p) => { const o = own(p.slug); return o
      ? { t: p.label, u: `/${p.slug}`, src: <>Trang web riêng <Pill tone="blue">đè lên bản của app</Pill></>, act: <Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={() => onEdit(o.id)}>Sửa</Btn> }
      : { t: p.label, u: `/${p.slug}`, src: "Điều khoản của app — dùng chung app + web", act: <span style={{ display: "flex", gap: 6 }}><Btn kind="soft" style={{ height: 30, fontSize: 12 }} onClick={() => setSub("terms")} testid="web-sys-terms">Sửa</Btn><Btn kind="light" style={{ height: 30, fontSize: 12 }} title="Chép sang trang web để sửa riêng (khác bản trong app)" onClick={() => { const b = legalToBlocks(p.html); fork(p.slug, b.title || p.label, b.blocks, "legal"); }}>Tách riêng cho web</Btn></span> }; }),
    { t: "Liên hệ", u: "/lien-he", src: "Cài đặt web › Liên hệ (ô trống lấy từ Giới thiệu của app) · thư khách gửi → Góp ý", act: <Btn kind="light" style={{ height: 30, fontSize: 12 }} onClick={() => go?.("web_settings")}>Mở Cài đặt web</Btn> },
    { t: "Bảng giá", u: "/bang-gia", src: "Cài đặt web › Bảng giá (tên gói, giá, câu hỏi thanh toán)", act: <Btn kind="light" style={{ height: 30, fontSize: 12 }} onClick={() => go?.("web_settings")}>Mở Cài đặt web</Btn> },
    { t: "Bảng calo · trang calo món", u: "/bang-calo", src: "Tự sinh từ Kho thực phẩm của app", act: <Btn kind="light" style={{ height: 30, fontSize: 12 }} onClick={() => go?.("web_calo")}>Mở Trang calo món</Btn> },
    { t: "Tính calo", u: "/tinh-calo", src: "Công cụ tính — chạy đúng công thức của app, không có chữ để sửa", act: null },
  ];
  const C = "minmax(0,1.2fr) minmax(0,0.9fr) minmax(0,2fr) auto";
  return (
    <Card style={{ padding: 0 }} testid="web-sys-pages">
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>Trang có sẵn của web</b><span style={{ marginLeft: 10, fontSize: 12, color: PC.t3 }}>Không nằm trong danh sách bên dưới — nội dung lấy từ chỗ khác, sửa 1 lần dùng chung</span></div>
      <div style={{ ...headRow(C), background: PC.headBg }}><span>TRANG</span><span>ĐƯỜNG DẪN</span><span>NỘI DUNG LẤY TỪ</span><span /></div>
      {list.map((x) => (
        <div key={x.u + x.t} data-testid="web-sys-row" style={{ ...bodyRow(C), minHeight: 52 }}>
          <b style={{ ...cell, fontSize: 13, color: PC.t1 }}>{x.t}</b>
          <a href={WEB + x.u} target="_blank" rel="noopener" style={{ ...cell, fontFamily: "ui-monospace, Menlo, monospace", color: BLUE, textDecoration: "none" }}>{x.u} ↗</a>
          <span style={{ ...cell, color: PC.t3, display: "flex", alignItems: "center", gap: 6 }}>{x.src}</span>
          <span>{x.act}</span>
        </div>
      ))}
      {!legal.length && <div style={{ padding: "10px 16px", fontSize: 12, color: PC.t3 }}>Chưa có trang điều khoản nào — viết ở nút Sửa của Điều khoản (dùng chung app). <Btn kind="light" style={{ height: 28, fontSize: 12, marginLeft: 8 }} onClick={() => setSub("terms")}>Viết điều khoản</Btn></div>}
    </Card>
  );
}

// Màn sửa nội dung dùng chung app + web (Điều khoản / Giới thiệu) ngay trong Quản trị PC
export function PcWebSysEdit({ top, sub, appSettings, saveSetting, onBack }) {
  return (
    <>
      {top(<Btn kind="light" onClick={onBack} testid="web-sys-back">‹ Danh sách trang</Btn>, sub === "terms" ? "Điều khoản & chính sách" : "Giới thiệu", "Dùng chung app + web · sửa ở đây là cả hai cùng đổi (web đổi trong khoảng 5 phút)")}
      <div style={{ padding: "18px 24px" }}><Card style={{ maxWidth: 860, padding: 20 }}>{sub === "terms" ? <TermsPage appSettings={appSettings} isAdmin saveSetting={saveSetting} /> : <AboutPage appSettings={appSettings} isAdmin saveSetting={saveSetting} />}</Card></div>
    </>
  );
}
