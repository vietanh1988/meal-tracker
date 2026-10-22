// Bảng giá (139k/l) — giá, số ngày dùng thử, số lượt AI lấy thẳng từ app (Quản trị › Gói cước & giới hạn); tên gói + hỏi đáp thanh toán ở Cài đặt web › Bảng giá
import PageHead from "@/components/PageHead";
import SecHead from "@/components/SecHead";
import JsonLd from "@/components/JsonLd";
import { getSettings, appLink, alt, withOg } from "@/lib/site";
import { vnd, fillTrial, premiumPoints, LIMIT_NAME, limitText } from "@/lib/plans";
import { breadcrumb, faqGraph, ld, schemaOn, appGraph } from "@/lib/schema";

export const revalidate = 300;
export async function generateMetadata() {
  const s = await getSettings(); const m = s.plan?.month;
  return withOg({ title: "Bảng giá", description: `Gói Miễn phí đủ để giảm cân bằng thực đơn món Việt. Premium${m ? ` từ ${vnd(m.per)}/tháng` : ""} thêm nhiều lượt AI chụp ảnh tính calo, hỏi AI${s.plan?.trial ? ` — dùng thử ${s.plan.trial} ngày, không cần thẻ` : ""}.`, alternates: alt("/bang-gia") }, typeof s !== "undefined" ? s : undefined);
}
const ROWS = [["Thực đơn món Việt tự lên mỗi ngày", 1, 1], ["Đổi món giữ gần bằng calo", 1, 1], ["Ghi bữa, nhắc giờ ăn", 1, 1], ["Theo dõi cân, tổng kết tháng", 1, 1]];
const FAQ = [{ q: "Hết %trial% ngày dùng thử có tự trừ tiền không?", a: "Không. Hết dùng thử app tự về gói Miễn phí, bạn chọn nâng cấp mới phải trả." }];
export default async function Price() {
  const s = await getSettings();
  const pr = s.pricing || {};
  const P = s.plan || {};
  const faq = [...FAQ, ...(pr.faq || [])].filter((x) => x?.q && x?.a).map((x) => ({ q: fillTrial(x.q, P), a: fillTrial(x.a, P) }));
  // Dòng so sánh lượt AI: số thật của từng gói trong app (0 = không có)
  const aiRows = (P.limits || []).filter((x) => x.free != null || x.premium != null).map((x) => [LIMIT_NAME[x.k][0], limitText(x.free, LIMIT_NAME[x.k][1]), limitText(x.premium, LIMIT_NAME[x.k][1])]);
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bảng giá", path: "/bang-gia" }];
  const tick = (v) => (v ? <span className="chk" style={{ width: 22, height: 22, borderRadius: 11 }} aria-label="Có">✓</span> : <span style={{ color: "#CBD5E1", fontSize: 18 }} aria-label="Không">—</span>);
  const plans = [[pr.free?.name || "Miễn phí", "0đ", "", "Cho người mới bắt đầu", ["Thực đơn tự lên mỗi ngày", "Đổi món 1 chạm", "Ghi bữa, nhắc giờ ăn", "Theo dõi cân, tổng kết tháng"], "Bắt đầu miễn phí", false], [pr.premium?.name || "Premium", P.month ? vnd(P.month.per) : "Liên hệ", P.month ? " / tháng" : "", P.trial ? `Dùng thử ${P.trial} ngày, không cần thẻ` : "Mở khoá nhiều lượt AI hơn", premiumPoints(P), P.trial ? `Dùng thử ${P.trial} ngày` : "Nâng cấp Premium", true]];
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), faqGraph(faq, s), schemaOn(s, "price") ? appGraph(s) : null)} />
      <PageHead eye="Bảng giá" h1="Bắt đầu miễn phí, nâng cấp khi cần" sub="Gói Miễn phí đủ để giảm cân bằng thực đơn món Việt. Premium thêm chụp ảnh tính calo và hỏi AI." crumb={crumbs} />
      <div className="wrap pricew" style={{ paddingTop: 48, maxWidth: 960 }}>
        <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.pricew{padding-top:28px!important}.plans{gap:20px!important}.plan{padding:24px!important}.plan-p{font-size:36px!important}.cmp-c{width:90px!important}.durs{padding:18px!important}.durs-g{grid-template-columns:1fr 1fr!important;gap:16px 10px!important}.cmp-t{font-size:15px!important}}` }} />
        <div className="grid2 plans" style={{ gap: 28 }}>
          {plans.map(([n, p, u, sub, l, c, hi]) => (
            <div key={n} className="card plan" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 16, position: "relative", ...(hi ? { border: "2px solid #0062F0", boxShadow: "0 20px 40px rgba(0,98,240,.12)" } : {}) }}>
              {hi && <span className="pill" style={{ position: "absolute", top: -12, left: 32, background: "#0062F0", color: "#fff" }}>Nhiều người chọn</span>}
              <span style={{ fontSize: 18, fontWeight: 800 }}>{n}</span>
              <span><b className="plan-p" style={{ fontSize: 44 }}>{p}</b><span className="mut" style={{ fontSize: 16 }}>{u}</span></span>
              <span style={{ fontSize: 14.5, color: "#64748B" }}>{sub}</span>
              <div style={{ height: 1, background: "#EEF2F7" }} />
              {l.map((x) => <span key={x} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 15.5, lineHeight: 1.45 }}><span className="chk">✓</span>{x}</span>)}
              <a className={`btn ${hi ? "b1" : "b2"}`} href={appLink(s, hi ? "price-premium" : "price-free")} style={{ height: 52, fontSize: 16, borderRadius: 12, marginTop: 8 }}>{c}</a>
            </div>
          ))}
        </div>
        {P.durs?.length > 1 && (
          <div className="card durs" style={{ marginTop: 24, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <b style={{ fontSize: 17 }}>Premium mua dài, rẻ hơn mỗi tháng</b>
            <div className="durs-g" style={{ display: "grid", gridTemplateColumns: `repeat(${P.durs.length},1fr)`, gap: 12 }}>
              {P.durs.map((d) => <div key={d.m} style={{ borderRadius: 14, border: `1.5px solid ${d === P.cheapest && d.m > 1 ? "#0062F0" : "#E6ECF5"}`, background: d === P.cheapest && d.m > 1 ? "#F5F9FF" : "#fff", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
                {d.save > 0 && <span className="pill" style={{ position: "absolute", top: -11, right: 12, background: "#16A34A", color: "#fff", fontSize: 12 }}>Tiết kiệm {d.save}%</span>}
                <span style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>Gói {d.m} tháng</span>
                <b style={{ fontSize: 22 }}>{vnd(d.price)}</b>
                <span className="mut" style={{ fontSize: 13.5 }}>{d.m > 1 ? `≈ ${vnd(d.per)} / tháng` : "trả theo tháng"}</span>
              </div>)}
            </div>
            <span className="mut" style={{ fontSize: 13.5, lineHeight: 1.5 }}>Thanh toán chuyển khoản trong app · gói hết hạn tự về Miễn phí, không tự gia hạn.</span>
          </div>
        )}
      </div>
      <section className="wrap sec">
        <SecHead eye="So sánh" title="Hai gói khác nhau ở đâu?" />
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#F5F8FD" }}><th style={{ padding: "14px 20px", textAlign: "left", fontSize: 14, color: "#475569" }}>Tính năng</th><th style={{ padding: "14px 12px", fontSize: 14, color: "#475569", width: 160 }} className="cmp-c">Miễn phí</th><th style={{ padding: "14px 12px", fontSize: 14, color: "#0062F0", width: 160 }} className="cmp-c">Premium</th></tr></thead>
            <tbody>{ROWS.map(([t, a, b]) => <tr key={t} style={{ borderTop: "1px solid #EEF2F7" }}><td className="cmp-t" style={{ padding: "14px 20px", fontSize: 16 }}>{t}</td><td style={{ textAlign: "center" }}>{tick(a)}</td><td style={{ textAlign: "center" }}>{tick(b)}</td></tr>)}
              {aiRows.map(([t, a, b]) => <tr key={t} style={{ borderTop: "1px solid #EEF2F7" }}><td className="cmp-t" style={{ padding: "14px 20px", fontSize: 16 }}>{t}</td><td style={{ textAlign: "center", fontSize: 14, color: "#475569" }}>{a || tick(0)}</td><td style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "#0062F0" }}>{b || tick(0)}</td></tr>)}</tbody>
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
