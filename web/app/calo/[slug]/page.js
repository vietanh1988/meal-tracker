// Trang calo món (137e/f) — số liệu từ kho món app; phần viết thêm từ Quản trị › Trang calo món
import { notFound } from "next/navigation";
import Crumb from "@/components/Crumb";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import Portions from "@/components/Portions";
import { getSettings, appLink } from "@/lib/site";
import { caloBySlug, caloFoods } from "@/lib/calo";
import { mainPortion } from "@/lib/foods";
import { breadcrumb, faqGraph, foodGraph, ld } from "@/lib/schema";

export const revalidate = 300;
const vn = (n) => String(n).replace(".", ",");

export async function generateMetadata({ params }) {
  const r = await caloBySlug(params.slug);
  if (!r?.food) return { robots: { index: false } };
  const fd = r.food, por = mainPortion(fd);
  const desc = `${por ? `${por.name.charAt(0).toUpperCase() + por.name.slice(1)} ${fd.name.toLowerCase()} (${por.gram} g) khoảng ${por.cal} kcal. ` : ""}100 g ${fd.name.toLowerCase()} có ${fd.per100.cal} kcal, đạm ${vn(fd.per100.p)} g, tinh bột ${vn(fd.per100.c)} g, chất béo ${vn(fd.per100.f)} g. Cách ăn khi giảm cân.`;
  return { title: `${fd.name} bao nhiêu calo?`, description: desc.slice(0, 160), alternates: { canonical: `/calo/${fd.slug}` }, robots: { index: !r.page?.noindex, follow: true }, openGraph: { images: r.page?.image_url ? [{ url: r.page.image_url }] : undefined } };
}

export default async function Calo({ params }) {
  const r = await caloBySlug(params.slug);
  if (!r) notFound();
  if (r.gone) notFound();
  const s = await getSettings();
  const fd = r.food, pg = r.page || {};
  const por = mainPortion(fd);
  const path = `/calo/${fd.slug}`;
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bảng calo món", path: "/bang-calo" }, { name: fd.name, path }];
  const same = (await caloFoods()).filter((x) => x.cat === fd.cat && x.key !== fd.key).map((x) => ({ x, p: mainPortion(x) })).filter((y) => y.p).sort((a, b) => Math.abs(a.p.cal - (por?.cal || 0)) - Math.abs(b.p.cal - (por?.cal || 0))).slice(0, 4);
  const faq = (pg.faq || []).filter((x) => x?.q && x?.a);
  const kcalLine = por ? `${por.name.charAt(0).toUpperCase() + por.name.slice(1)} ${fd.name.toLowerCase()} (${por.gram} g) khoảng ${por.cal} kcal.` : `100 g ${fd.name.toLowerCase()} có ${fd.per100.cal} kcal.`;
  const intro = pg.intro || `${kcalLine} Xem calo theo từng khẩu phần, lượng đạm, tinh bột, chất béo và so với món tương tự.`;
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), foodGraph(s, fd, por, path), faqGraph(faq))} />
      <div className="wrap" style={{ paddingTop: 48, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
          <Crumb items={crumbs} />
          <h1 className="h1">{fd.name} bao nhiêu calo?</h1>
          <p className="lead" style={{ maxWidth: 680 }}>{intro}</p>
        </div>
        <div className="calo-cols" style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
            <Portions fd={fd} />
            <div className="card" style={{ padding: 24, display: "flex", gap: 14, background: "#F2FBF5", borderColor: "#C9EED6" }}>
              <span style={{ width: 30, height: 30, borderRadius: 15, background: "#16A34A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}>✓</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 18, color: "#15803D" }}>Ăn {fd.name.toLowerCase()} khi giảm cân: được</b><span style={{ fontSize: 15.5, lineHeight: 1.6, color: "#334155" }}>Miễn tổng calo cả ngày nằm trong mục tiêu. Chọn khẩu phần vừa, ưu tiên thêm rau và đạm.</span></span>
            </div>
            {faq.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}><h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Câu hỏi thường gặp</h2>{faq.map((x, i) => <details key={i} className="faq" open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>}
          </div>
          <div className="calo-side" style={{ width: 360, display: "flex", flexDirection: "column", gap: 20 }}>
            <form action="/tim-kiem" className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <label htmlFor="cq" style={{ fontSize: 16, fontWeight: 700 }}>Tìm món khác: bún chả, cơm tấm…</label>
              <div style={{ display: "flex", gap: 6 }}><input id="cq" name="q" className="inp" placeholder="Nhập tên món ăn…" style={{ height: 46 }} /><button className="btn b2" style={{ width: 46, padding: 0, height: 46 }} aria-label="Tìm">⌕</button></div>
            </form>
            {same.length > 0 && (
              <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                <b style={{ fontSize: 16, marginBottom: 6 }}>So với món tương tự</b>
                {same.map(({ x, p }, i) => { const d = p.cal - (por?.cal || 0); return (
                  <a key={x.key} href={`/calo/${x.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid #EEF2F7" : 0 }}>
                    <span style={{ flex: 1, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>{x.name}</span><span style={{ fontSize: 13, color: "#64748B" }}>{p.name} {p.gram} g</span></span>
                    <b style={{ fontSize: 16 }}>{p.cal} <span style={{ fontSize: 13 }}>kcal</span></b>
                    {por && <span style={{ fontSize: 12.5, fontWeight: 800, borderRadius: 8, padding: "3px 8px", ...(d <= 0 ? { background: "#DCFCE7", color: "#15803D" } : { background: "#FFEDD5", color: "#C2410C" }) }}>{d > 0 ? "+" : d < 0 ? "−" : "±"}{Math.abs(d)}</span>}
                  </a>); })}
              </div>
            )}
            <div style={{ borderRadius: 18, background: "linear-gradient(160deg,#1A7CFF,#0050E6)", color: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <b style={{ fontSize: 19, lineHeight: 1.35 }}>Hôm nay ăn {fd.name.toLowerCase()} thì các bữa khác ăn gì?</b>
              <span style={{ fontSize: 14.5, opacity: 0.88, lineHeight: 1.5 }}>Fipilot AI tự cân lại cả ngày cho đúng calo.</span>
              <a className="btn b3" href={appLink(s, `calo-${fd.slug}`)}>Lên thực đơn miễn phí</a>
            </div>
          </div>
        </div>
      </div>
      <Sticky s={s} ref_={`calo-${fd.slug}`} />
      <style>{`@media(max-width:720px){.calo-cols{flex-direction:column}.calo-side{width:100%!important}}`}</style>
    </main>
  );
}
