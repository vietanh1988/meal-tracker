// Bảng giá (139k/l) — giá lấy từ Cài đặt web › pricing (99.000đ là số tạm)
import PageHead from "@/components/PageHead";
import SecHead from "@/components/SecHead";
import JsonLd from "@/components/JsonLd";
import { getSettings, appLink } from "@/lib/site";
import { breadcrumb, faqGraph, ld } from "@/lib/schema";

export const revalidate = 300;
export const metadata = { title: "Bảng giá", description: "Gói Miễn phí đủ để giảm cân bằng thực đơn món Việt. Premium thêm chụp ảnh tính calo và hỏi AI — dùng thử 7 ngày.", alternates: { canonical: "/bang-gia" } };
const ROWS = [["Thực đơn món Việt tự lên mỗi ngày", 1, 1], ["Đổi món giữ gần bằng calo", 1, 1], ["Ghi bữa, nhắc giờ ăn", 1, 1], ["Theo dõi cân, tổng kết tháng", 1, 1], ["Chụp ảnh món, app tính calo", 0, 1], ["Hỏi AI về ăn uống", 0, 1], ["AI lên thực đơn theo ý", 0, 1]];
const FAQ = [{ q: "Hết 7 ngày dùng thử có tự trừ tiền không?", a: "Không. Hết dùng thử app tự về gói Miễn phí, bạn chọn nâng cấp mới phải trả." }];
export default async function Price() {
  const s = await getSettings();
  const pr = s.pricing || {};
  const faq = [...FAQ, ...(pr.faq || [])].filter((x) => x?.q && x?.a);
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bảng giá", path: "/bang-gia" }];
  const tick = (v) => (v ? <span className="chk" style={{ width: 24, height: 24, borderRadius: 12 }} aria-label="Có">✓</span> : <span style={{ color: "#CBD5E1", fontSize: 18 }} aria-label="Không">—</span>);
  const plans = [[pr.free?.name || "Miễn phí", pr.free?.price || "0đ", "", "Cho người mới bắt đầu", ["Thực đơn tự lên mỗi ngày", "Đổi món 1 chạm", "Ghi bữa, nhắc giờ ăn", "Theo dõi cân, tổng kết tháng"], "Bắt đầu miễn phí", false], [pr.premium?.name || "Premium", pr.premium?.price || "99.000đ", pr.premium?.unit || " / tháng", pr.premium?.trial || "Dùng thử 7 ngày, không cần thẻ", ["Mọi thứ của gói Miễn phí", "Chụp ảnh món, app tính calo", "Hỏi AI về ăn uống", "AI lên thực đơn theo ý bạn"], "Dùng thử 7 ngày", true]];
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), faqGraph(faq))} />
      <PageHead eye="Bảng giá" h1="Bắt đầu miễn phí, nâng cấp khi cần" sub="Gói Miễn phí đủ để giảm cân bằng thực đơn món Việt. Premium thêm chụp ảnh tính calo và hỏi AI." crumb={crumbs} />
      <div className="wrap" style={{ paddingTop: 48 }}>
        <div className="grid2" style={{ gap: 28, maxWidth: 960 }}>
          {plans.map(([n, p, u, sub, l, c, hi]) => (
            <div key={n} className="card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16, position: "relative", ...(hi ? { border: "2px solid #0062F0", boxShadow: "0 20px 40px rgba(0,98,240,.12)" } : {}) }}>
              {hi && <span className="pill" style={{ position: "absolute", top: -13, left: 32, background: "#0062F0", color: "#fff" }}>Nhiều người chọn</span>}
              <span style={{ fontSize: 18, fontWeight: 800 }}>{n}</span>
              <span><b style={{ fontSize: 44, letterSpacing: "-.03em" }}>{p}</b><span className="mut" style={{ fontSize: 16 }}>{u}</span></span>
              <span style={{ fontSize: 14.5, color: "#64748B" }}>{sub}</span>
              <div style={{ height: 1, background: "#EEF2F7" }} />
              {l.map((x) => <span key={x} style={{ display: "flex", gap: 10, fontSize: 15.5, lineHeight: 1.45 }}><span className="chk">✓</span>{x}</span>)}
              <a className={`btn big ${hi ? "b1" : "b2"}`} href={appLink(s, hi ? "price-premium" : "price-free")} style={{ marginTop: 8 }}>{c}</a>
            </div>
          ))}
        </div>
      </div>
      <section className="wrap sec">
        <SecHead eye="So sánh" title="Hai gói khác nhau ở đâu?" />
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#F5F8FD" }}><th style={{ padding: "14px 20px", textAlign: "left", fontSize: 14, color: "#475569" }}>Tính năng</th><th style={{ padding: "14px 12px", fontSize: 14, color: "#475569", width: 140 }}>Miễn phí</th><th style={{ padding: "14px 12px", fontSize: 14, color: "#0062F0", width: 140 }}>Premium</th></tr></thead>
            <tbody>{ROWS.map(([t, a, b]) => <tr key={t} style={{ borderTop: "1px solid #EEF2F7" }}><td style={{ padding: "14px 20px", fontSize: 16 }}>{t}</td><td style={{ textAlign: "center" }}>{tick(a)}</td><td style={{ textAlign: "center" }}>{tick(b)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="wrap sec" style={{ maxWidth: 860 }}>
        <SecHead eye="Hỏi đáp" title="Câu hỏi về thanh toán" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{faq.map((x, i) => <details key={x.q} className="faq" open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>
      </section>
    </main>
  );
}
