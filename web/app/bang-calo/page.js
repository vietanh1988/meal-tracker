// Bảng calo món (139g/h). 07/11: tra được đủ món của app (chủ dự án chốt bản vẽ "Bảng calo đủ món"): món có trang /calo có ảnh + link,
// món chỉ tra cứu không link, không ảnh (chừa chỗ cho thẳng cột); thêm nhóm Trái cây, Rau, Thịt cá trứng, Sữa hạt, Khác.
import { notFound } from "next/navigation";
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import { Pager } from "@/components/PostCard";
import { getSettings, alt, withOg } from "@/lib/site";
import { caloFoods, caloRows } from "@/lib/calo";
import { withAliases, thumbOf } from "@/lib/app/foodImgMap";
import { mainPortion, allFoods, porName } from "@/lib/foods";
import { caloTable, TABLE_GROUPS } from "@/lib/caloTable";
import { slugify } from "@/lib/slug";
import { breadcrumb, ld } from "@/lib/schema";
import { vnInt } from "@/lib/slug";
const PH = ["/img/bowl-1.jpg", "/img/bowl-2.jpg", "/img/bowl-3.jpg"];
// ảnh: trang riêng → ảnh trang; không có thì ảnh món / món đồng nghĩa (07/11); món có trang mà chưa có ảnh → bát mẫu
const imgOf = (f, i, im) => thumbOf(f.page?.image_url || im[f.key]) || (f.hasPage ? PH[i % 3] : null);

export const revalidate = 3600; // 14/11: 1 giờ, sửa nội dung → /api/revalidate làm mới ngay
const PER = 40;
export async function generateMetadata({ searchParams }) {
  const g = searchParams?.nhom; const page = +searchParams?.trang || 1;
  return withOg({ title: "Bảng calo món ăn Việt Nam", description: "Calo theo 100 g và theo khẩu phần thường gặp của hơn 1.400 món: món Việt, trái cây, rau, thịt cá, đồ uống. Kèm đạm, tinh bột, chất béo.", alternates: alt(`/bang-calo${g ? `?nhom=${g}` : ""}${page > 1 ? `${g ? "&" : "?"}trang=${page}` : ""}`) }, typeof s !== "undefined" ? s : undefined);
}
export default async function Index({ searchParams }) {
  const s = await getSettings();
  const g = searchParams?.nhom || "";
  const qs = String(searchParams?.q || "").trim().toLowerCase();
  const page = Math.max(1, +searchParams?.trang || 1);
  const foods = await allFoods();
  const t = caloTable(foods, await caloFoods(), { g, q: qs });
  const im = withAliases(Object.fromEntries((await caloRows()).filter((r) => r.image_url).map((r) => [r.food_key, r.image_url])), foods.map((f) => f.key));
  if (!t) notFound();
  const { list, groups, all, withPage } = t;
  const total = list.length;
  const rows = list.slice((page - 1) * PER, page * PER);
  if (page > 1 && !rows.length) notFound(); // ?trang=999 → 404, không để Google lập chỉ mục trang rỗng
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bảng calo món", path: "/bang-calo" }];
  const base = `/bang-calo${g ? `?nhom=${g}` : ""}`;
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs))} />
      <PageHead eye="Bảng calo món Việt" h1="Bảng calo món ăn Việt Nam" sub={`Calo theo 100 g và theo khẩu phần thường gặp của ${vnInt(all)} món: món Việt, trái cây, rau, thịt cá, đồ uống. Bấm vào món để xem đạm, tinh bột, chất béo và cách ăn khi giảm cân.`} crumb={crumbs}
        right={<form action="/bang-calo" className="bc-q" style={{ display: "flex", gap: 8, width: 420, maxWidth: "100%" }}><input name="q" defaultValue={qs} className="inp" placeholder="Tìm món: phở, chuối, ức gà…" aria-label="Tìm món" />{g && <input type="hidden" name="nhom" value={g} />}<button className="btn b1" style={{ height: 52, width: 52, padding: 0, borderRadius: 14 }} aria-label="Tìm"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></button></form>} />
      <div className="wrap bcw" style={{ paddingTop: 40 }}>
        <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.bcw{padding-top:24px!important}.bc-q{width:100%!important}}` }} />
        <div className="chips"><a className={`chip${g ? "" : " on"}`} href="/bang-calo" data-testid="bc-chip-all">Tất cả <small className="bc-n">{vnInt(all)}</small></a>{groups.map(([k, n, c]) => <a key={k} className={`chip${g === k ? " on" : ""}`} href={`/bang-calo?nhom=${k}`} data-testid={`bc-chip-${k}`}>{n} <small className="bc-n">{vnInt(c)}</small></a>)}</div>
        <style dangerouslySetInnerHTML={{ __html: `.bc-n{font-weight:600;font-size:13px;color:#64748B;margin-left:6px}.chip.on .bc-n{color:#CFE0FF}.bc-sp{width:44px;height:44px;flex-shrink:0}.bc-m .bc-sp{width:52px;height:52px}` }} />
        <p className="mut" data-testid="bc-count" style={{ marginTop: 20, fontSize: 15 }}>{qs ? <><b style={{ color: "#0F172A" }}>{vnInt(total)} món</b> khớp “{qs}”</> : <><b style={{ color: "#0F172A" }}>{vnInt(total)} món</b>{g ? ` trong nhóm ${TABLE_GROUPS[t.gi]}` : ""} · {vnInt(withPage)} món có trang chi tiết</>}</p>
        <div className="card only-pc" style={{ overflow: "hidden", padding: 0, marginTop: 28 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#F5F8FD" }}>{[["Món", "left"], ["Nhóm", "left"], ["Calo / 100 g", "right"], ["Khẩu phần thường gặp", "left"], ["Calo khẩu phần", "right"], ["", "right"]].map(([h, al]) => <th key={h} style={{ padding: "14px 20px", fontSize: 13.5, color: "#475569", fontWeight: 700, textAlign: al }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((f, i) => { const p = mainPortion(f); const src = imgOf(f, i, im); const nm = <>{src ? <img className="th" src={src} alt={f.name} width={44} height={44} loading="lazy" style={{ width: 44, height: 44 }} /> : <span className="bc-sp" />}<b style={{ fontSize: 16 }}>{f.name}</b></>; return (
              <tr key={f.key} data-testid="bc-row" data-page={f.hasPage ? "1" : "0"} style={{ borderTop: "1px solid #EEF2F7" }}>
                <td style={{ padding: "12px 20px" }}>{f.hasPage ? <a href={`/calo/${f.slug}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>{nm}</a> : <span style={{ display: "flex", alignItems: "center", gap: 12 }}>{nm}</span>}</td>
                <td style={{ padding: "12px 20px", fontSize: 14.5, color: "#64748B" }}>{TABLE_GROUPS[f.tg]}</td>
                <td style={{ padding: "12px 20px", textAlign: "right", fontSize: 15 }}>{f.per100.cal} kcal</td>
                <td style={{ padding: "12px 20px", fontSize: 14.5, color: "#475569" }}>{p ? `${porName(p, true)} ${p.gram} g` : "—"}</td>
                <td style={{ padding: "12px 20px", textAlign: "right" }}>{p ? <b style={{ fontSize: 17 }}>{p.cal} kcal</b> : <span style={{ color: "#475569" }}>—</span>}</td>
                <td style={{ padding: "12px 20px", textAlign: "right" }}>{f.hasPage && <a href={`/calo/${f.slug}`} style={{ fontSize: 14, fontWeight: 700, color: "#0062F0" }}>Chi tiết →</a>}</td>
              </tr>); })}</tbody>
          </table>
        </div>
        <div className="card only-m bc-m" style={{ padding: "4px 16px", marginTop: 20 }}>
          {rows.map((f, k) => { const p = mainPortion(f); const st = { display: "flex", gap: 12, alignItems: "center", padding: "14px 0", borderTop: k ? "1px solid #EEF2F7" : 0 }; const inner = <>
              {imgOf(f, k, im) ? <img className="th" src={imgOf(f, k, im)} alt={f.name} width={52} height={52} loading="lazy" style={{ width: 52, height: 52 }} /> : <span className="bc-sp" />}
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><b style={{ fontSize: 16 }}>{f.name}</b><span style={{ fontSize: 13, color: "#64748B" }}>{p ? `${porName(p, true)} ${p.gram} g` : TABLE_GROUPS[f.tg]}</span></span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}><b style={{ fontSize: 18 }}>{p ? p.cal : f.per100.cal}</b><span style={{ fontSize: 12, color: "#64748B" }}>{p ? `kcal · ${f.per100.cal}/100 g` : "kcal / 100 g"}</span></span>
              <span aria-hidden="true" style={{ width: 10, color: "#CBD5E1", fontSize: 18, visibility: f.hasPage ? "visible" : "hidden" }}>›</span></>;
            return f.hasPage ? <a key={f.key} data-testid="bc-mrow" data-page="1" href={`/calo/${f.slug}`} style={st}>{inner}</a> : <div key={f.key} data-testid="bc-mrow" data-page="0" style={st}>{inner}</div>; })}
        </div>
        {!rows.length && <p className="lead" style={{ padding: "32px 0" }}>Chưa tìm thấy món này. Thử tên khác, ví dụ “bún”, “chuối”.</p>}
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 16, lineHeight: 1.6 }}>Số liệu từ kho món Fipilot AI ({vnInt(all)} món). Calo thực tế đổi theo quán, cách nấu và lượng dầu mỡ.</p>
        <Pager page={page} total={total} per={PER} base={base + (qs ? `${g ? "&" : "?"}q=${encodeURIComponent(qs)}` : "")} />
      </div>
      <Sticky s={s} ref_="bang-calo" />
    </main>
  );
}
