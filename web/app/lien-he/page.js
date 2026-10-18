// Liên hệ (139q/r) — email / điện thoại lấy từ Cài đặt web › contact; form gửi về Quản trị › Góp ý
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import Icon from "@/components/Icon";
import ContactForm from "@/components/ContactForm";
import { getSettings, alt } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";

export const revalidate = 300;
export const metadata = { title: "Liên hệ", description: "Cần hỗ trợ? Nhắn cho Fipilot AI qua email, Zalo hoặc form — thường trả lời trong ngày làm việc.", alternates: alt("/lien-he") };

export default async function Contact() {
  const s = await getSettings();
  const c = s.contact || {};
  const tel = (c.phone || "").replace(/\s/g, "");
  const zalo = c.zalo || (tel ? `https://zalo.me/${tel}` : "");
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Liên hệ", path: "/lien-he" }];
  const items = [
    c.email && ["mail", "#E8F0FF", "#0062F0", "Email", c.email, `mailto:${c.email}`],
    c.phone && ["call", "#DCFCE7", "#16A34A", "Điện thoại / Zalo", c.phone, zalo || `tel:${tel}`],
    c.facebook && ["chat", "#EDE9FE", "#7C3AED", "Facebook", "Nhắn tin trang Fipilot AI", c.facebook],
  ].filter(Boolean);
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), { "@type": "ContactPage", name: "Liên hệ Fipilot AI" })} />
      <PageHead eye="Liên hệ" h1="Cần hỗ trợ? Nhắn cho Fipilot AI" sub="Thường trả lời trong ngày làm việc." crumb={crumbs} />
      <div className="wrap ct-w" style={{ paddingTop: 48, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 32, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map(([ic, bg, fg, l, v, href]) => (
            <a key={l} className="card ct-c" href={href} {...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener" } : {})} style={{ padding: 24, display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ width: 52, height: 52, borderRadius: 16, background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={ic} size={24} /></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}><span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>{l}</span><b style={{ fontSize: 18, overflowWrap: "anywhere" }}>{v}</b></span>
            </a>
          ))}
        </div>
        <ContactForm fallback={c.phone ? `Zalo ${c.phone}` : c.email || "qua email"} />
      </div>
      <style>{`@media(max-width:720px){.ct-w{padding-top:28px!important;grid-template-columns:1fr!important;gap:20px!important}.ct-c{padding:20px!important}}`}</style>
    </main>
  );
}
