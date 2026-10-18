// Công cụ tính calo (139i/j)
import PageHead from "@/components/PageHead";
import SecHead from "@/components/SecHead";
import Calc from "@/components/Calc";
import JsonLd from "@/components/JsonLd";
import { getSettings, alt } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";

export const revalidate = 3600;
export const metadata = { title: "Tính calo cần ăn mỗi ngày để giảm cân", description: "Công cụ tính calo miễn phí: nhập cân nặng, chiều cao, mức vận động — biết ngay cần ăn bao nhiêu kcal mỗi ngày để giảm cân an toàn.", alternates: alt("/tinh-calo") };
export default async function Tool() {
  const s = await getSettings();
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Tính calo", path: "/tinh-calo" }];
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), { "@type": "WebApplication", name: "Tính calo cần ăn mỗi ngày", applicationCategory: "HealthApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } })} />
      <PageHead eye="Công cụ miễn phí" h1="Tính calo cần ăn mỗi ngày để giảm cân" sub="Nhập số đo — công cụ tính theo đúng công thức app Fipilot AI đang dùng (Mifflin-St Jeor + mức vận động)." crumb={crumbs} />
      <div className="wrap" style={{ paddingTop: 40 }}><Calc full appUrl={s.site.app_url} /></div>
      <section className="wrap sec">
        <SecHead eye="Cách tính" title="Con số này từ đâu ra?" />
        <div className="grid3" style={{ gap: 20 }}>
          {[["1", "Năng lượng nghỉ", "Tính từ cân nặng, chiều cao, tuổi, giới tính (công thức Mifflin-St Jeor)."], ["2", "Nhân mức vận động", "Ít vận động × 1,2 · tập 1–2 buổi × 1,375 · 3–4 buổi × 1,55 · 5–6 buổi × 1,725."], ["3", "Trừ phần thiếu hụt", "Theo tốc độ bạn chọn, tối đa 25% năng lượng cả ngày, không xuống dưới mức an toàn."]].map(([n, t, x]) => (
            <div key={n} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}><span style={{ width: 40, height: 40, borderRadius: 20, background: "#E8F0FF", color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{n}</span><h3 style={{ fontSize: 18 }}>{t}</h3><p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.6 }}>{x}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
