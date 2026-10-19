// Cài app lên điện thoại — Fipilot AI là web app (PWA): không cần CH Play / App Store, thêm vào màn hình chính là dùng như app.
// Có trong danh sách trang của bản vẽ 138d. Bước cài theo đúng cách app hướng dẫn (iPhone: Safari › Chia sẻ; Android: Chrome › ⋮).
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import { getSettings, appLink, alt, siteUrl } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";

export const revalidate = 300;
export const metadata = { title: "Cài app Fipilot AI lên điện thoại", description: "Không cần CH Play hay App Store: mở app.fipilotai.com rồi thêm vào màn hình chính — 3 bước trên iPhone và Android, dùng như app thật.", alternates: alt("/cai-app") };
const IOS = [["Mở bằng Safari", "Vào app.fipilotai.com bằng Safari (trình duyệt la bàn xanh có sẵn trên iPhone)."], ["Bấm nút Chia sẻ", "Nút hình vuông có mũi tên lên, ở thanh dưới cùng (iPad: góc trên bên phải)."], ["Chọn “Thêm vào MH chính”", "Kéo xuống, bấm “Thêm vào Màn hình chính” rồi bấm Thêm. Biểu tượng Fipilot AI hiện như app."]];
const AND = [["Mở bằng Chrome", "Vào app.fipilotai.com bằng Chrome."], ["Bấm nút ⋮", "Ba chấm ở góc trên bên phải."], ["Chọn “Cài đặt ứng dụng”", "Hoặc “Thêm vào màn hình chính” → Cài đặt. Mở từ biểu tượng là dùng toàn màn hình như app."]];

export default async function InstallApp() {
  const s = await getSettings();
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Cài app lên điện thoại", path: "/cai-app" }];
  const howto = (name, steps) => ({ "@type": "HowTo", name, step: steps.map(([t, x], i) => ({ "@type": "HowToStep", position: i + 1, name: t, text: x })) });
  const Col = ({ title, steps, tone }) => (
    <div className="card ia-c" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
      <b style={{ fontSize: 20 }}>{title}</b>
      {steps.map(([t, x], i) => (
        <div key={t} style={{ display: "flex", gap: 14 }}>
          <span style={{ width: 36, height: 36, borderRadius: 18, background: tone, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 17 }}>{t}</b><span style={{ fontSize: 15.5, lineHeight: 1.6, color: "#475569" }}>{x}</span></span>
        </div>
      ))}
    </div>
  );
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), howto("Cài Fipilot AI trên iPhone", IOS), howto("Cài Fipilot AI trên Android", AND))} />
      <PageHead eye="Cài app" h1="Cài Fipilot AI lên điện thoại trong 30 giây" sub="Không cần CH Play hay App Store, không tốn dung lượng. Thêm vào màn hình chính là mở như app thật." crumb={crumbs} right={<a className="btn b1 big" href={appLink(s, "cai-app")}>Mở app.fipilotai.com</a>} />
      <div className="wrap ia-w" style={{ paddingTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Col title="iPhone / iPad" steps={IOS} tone="#0F172A" />
        <Col title="Android" steps={AND} tone="#16A34A" />
      </div>
      <section className="wrap sec" style={{ maxWidth: 860 }}>
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, background: "#F5F9FF", borderColor: "#DCE7FF" }}>
          <b style={{ fontSize: 17 }}>Vì sao không có trên kho ứng dụng?</b>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#334155" }}>Fipilot AI chạy trên trình duyệt nên luôn là bản mới nhất, không phải chờ cập nhật, và dùng được trên mọi điện thoại. Dữ liệu của bạn lưu theo tài khoản, đổi máy vẫn còn nguyên.</p>
          <a href={siteUrl(s, "/lien-he")} style={{ fontSize: 15, fontWeight: 700, color: "#0062F0" }}>Cài không được? Nhắn cho chúng tôi →</a>
        </div>
      </section>
      <Sticky s={s} ref_="cai-app" />
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.ia-w{padding-top:28px!important;grid-template-columns:1fr!important;gap:16px!important}.ia-c{padding:20px!important}}` }} />
    </main>
  );
}
