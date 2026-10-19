// Trang calo món (137e/f) — số liệu từ kho món app; phần viết thêm từ Quản trị › Trang calo món
import { notFound } from "next/navigation";
import Crumb from "@/components/Crumb";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import Portions from "@/components/Portions";
import { getSettings, appLink, alt } from "@/lib/site";
import { caloBySlug, caloFoods } from "@/lib/calo";
import { q, enc } from "@/lib/sb";
import { mainPortion } from "@/lib/foods";
import { breadcrumb, faqGraph, foodGraph, ld, schemaOn } from "@/lib/schema";

export const revalidate = 300;
const vn = (n) => String(n).replace(".", ",");

export async function generateMetadata({ params }) {
  const r = await caloBySlug(params.slug);
  if (!r?.food) return { robots: { index: false } };
  const fd = r.food, por = mainPortion(fd);
  const desc = `${por ? `${por.name.charAt(0).toUpperCase() + por.name.slice(1)} ${fd.name.toLowerCase()} (${por.gram} g) khoảng ${por.cal} kcal. ` : ""}100 g ${fd.name.toLowerCase()} có ${fd.per100.cal} kcal, đạm ${vn(fd.per100.p)} g, tinh bột ${vn(fd.per100.c)} g, chất béo ${vn(fd.per100.f)} g. Cách ăn khi giảm cân.`;
  return { title: `${fd.name} bao nhiêu calo?`, description: desc.slice(0, 160), alternates: alt(`/calo/${fd.slug}`), robots: { index: !r.page?.noindex, follow: true }, openGraph: { images: r.page?.image_url ? [{ url: r.page.image_url }] : undefined } };
}

export default async function Calo({ params }) {
  const r = await caloBySlug(params.slug);
  if (!r) notFound();
  if (r.gone) notFound();
  const s = await getSettings();
  let fd = r.food; const pg = r.page || {};
  // Quản trị › Trang calo món › Khẩu phần hiện trên trang (null = hiện hết; "100 g" = thêm ô 100 g)
  if (Array.isArray(pg.portions) && pg.portions.length) { const keep = fd.portions.filter((x) => pg.portions.includes(x.name)); fd = { ...fd, portions: [...(pg.portions.includes("100 g") ? [{ name: "100 g", gram: 100, ...fd.per100 }] : []), ...(keep.length ? keep : fd.portions)] }; }
  const por = mainPortion(fd);
  const relIds = (Array.isArray(pg.related) ? pg.related : []).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 6);
  const rel = relIds.length ? ((await q(`web_posts?id=in.(${relIds.map(enc).join(",")})&status=eq.published&select=id,title,slug,cover_url`)) || []).sort((a, b) => relIds.indexOf(a.id) - relIds.indexOf(b.id)) : [];
  const path = `/calo/${fd.slug}`;
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bảng calo món", path: "/bang-calo" }, { name: fd.name, path }];
  const same = (await caloFoods()).filter((x) => x.cat === fd.cat && x.key !== fd.key).map((x) => ({ x, p: mainPortion(x) })).filter((y) => y.p).sort((a, b) => Math.abs(a.p.cal - (por?.cal || 0)) - Math.abs(b.p.cal - (por?.cal || 0))).slice(0, 3);
  const faq = (pg.faq || []).filter((x) => x?.q && x?.a);
  const kcalLine = por ? `${por.name.charAt(0).toUpperCase() + por.name.slice(1)} ${fd.name.toLowerCase()} (${por.gram} g) khoảng ${por.cal} kcal.` : `100 g ${fd.name.toLowerCase()} có ${fd.per100.cal} kcal.`;
  const intro = pg.intro || `${kcalLine} Xem calo theo từng khẩu phần, lượng đạm, tinh bột, chất béo và so với món tương tự.`;
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), schemaOn(s, "calo") ? foodGraph(s, fd, por, path) : null, faqGraph(faq, s))} />
      <div className="wrap calowrap" style={{ paddingTop: 48, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
          <Crumb items={crumbs} />
          <h1 className="h1">{fd.name} bao nhiêu calo?</h1>
          <p className="lead" style={{ maxWidth: 680 }}>{intro}</p>
        </div>
        <div className="calo-cols" style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div className="calo-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="o1"><Portions fd={fd} /></div>
            <div className="card verdict o2" style={{ padding: 24, display: "flex", gap: 14, background: "#F2FBF5", borderColor: "#C9EED6" }}>
              <span style={{ width: 30, height: 30, borderRadius: 15, background: "#16A34A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}>✓</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 18, color: "#15803D" }}>Ăn {fd.name.toLowerCase()} khi giảm cân: được</b><span style={{ fontSize: 15.5, lineHeight: 1.6, color: "#334155" }}>Chọn khẩu phần vừa, thêm rau.<br />Cân lại các bữa khác cho đúng calo.</span></span>
            </div>
            {faq.length > 0 && <div className="o5 calofaq" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}><h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Câu hỏi thường gặp</h2>{faq.map((x, i) => <details key={i} className="faq" open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>}
          </div>
          <div className="calo-side" style={{ width: 360, display: "flex", flexDirection: "column", gap: 20 }}>
            <form action="/tim-kiem" className="card o6" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <label htmlFor="cq" style={{ fontSize: 16, fontWeight: 700 }}>Tìm món khác: bún chả, cơm tấm…</label>
              <div style={{ display: "flex", gap: 6 }}><input id="cq" name="q" className="inp" placeholder="Nhập tên món ăn…" style={{ height: 46 }} /><button className="btn b2" style={{ width: 46, padding: 0, height: 46 }} aria-label="Tìm">⌕</button></div>
            </form>
            {same.length > 0 && (
              <div className="card o3" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                <b style={{ fontSize: 16, marginBottom: 6 }}>So với món tương tự (khẩu phần vừa)</b>
                {same.map(({ x, p }, i) => { const d = p.cal - (por?.cal || 0); return (
                  <a key={x.key} href={`/calo/${x.slug}`} title={`${x.name} · ${p.name} ${p.gram} g`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: i ? "1px solid #EEF2F7" : 0 }}>
                    <img className="th" src={x.page?.image_url || ["/img/bowl-1.jpg", "/img/bowl-2.jpg", "/img/bowl-3.jpg"][i % 3]} alt="" width={46} height={46} loading="lazy" style={{ width: 46, height: 46 }} />
                    <span style={{ flex: 1, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14.5, fontWeight: 600 }}>{x.name}</span><b style={{ fontSize: 16 }}>{p.cal} <span style={{ fontSize: 13, fontWeight: 600 }}>kcal</span></b></span>
                    {por && <span style={{ fontSize: 12, fontWeight: 800, borderRadius: 8, padding: "3px 8px", ...(d <= 0 ? { background: "#DCFCE7", color: "#15803D" } : { background: "#FFEDD5", color: "#C2410C" }) }}>{d > 0 ? "+" : d < 0 ? "−" : "±"}{Math.abs(d)}</span>}
                  </a>); })}
              </div>
            )}
            {rel.length > 0 && (
              <div className="card o3" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                <b style={{ fontSize: 16, marginBottom: 6 }}>Bài liên quan</b>
                {rel.map((x, i) => <a key={x.id} href={`/${x.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: i ? "1px solid #EEF2F7" : 0 }}>{x.cover_url && <img className="th" src={x.cover_url} alt="" width={46} height={46} loading="lazy" style={{ width: 46, height: 46, objectFit: "cover" }} />}<span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4 }}>{x.title}</span></a>)}
              </div>
            )}
            <div className="o4 calocta" style={{ borderRadius: 18, background: "linear-gradient(160deg,#1A7CFF,#0050E6)", color: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <b style={{ fontSize: 19, lineHeight: 1.35 }}>Hôm nay ăn {fd.name.toLowerCase()} thì các bữa khác ăn gì?</b>
              <span style={{ fontSize: 14.5, opacity: 0.88, lineHeight: 1.5 }}>Fipilot AI tự cân lại cả ngày cho đúng calo.</span>
              <img src={pg.image_url || "/img/food-cta.jpg"} alt="" loading="lazy" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 12 }} />
              <a className="btn b3" href={appLink(s, `calo-${fd.slug}`)}>Lên thực đơn miễn phí</a>
            </div>
          </div>
        </div>
      </div>
      <Sticky s={s} ref_={`calo-${fd.slug}`} />
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.calowrap{padding-top:24px!important;gap:20px!important}.calo-cols{flex-direction:column;gap:20px!important}.calo-main,.calo-side{display:contents!important}.o1{order:1}.o2{order:2}.o3{order:3}.o4{order:4}.o5{order:5;margin-top:0!important}.o6{order:6}.verdict{padding:18px!important}.calo-cols>*>*{width:100%}}` }} />
    </main>
  );
}
