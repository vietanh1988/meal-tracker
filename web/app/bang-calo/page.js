// Bảng calo món (139g/h)
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import { Pager } from "@/components/PostCard";
import { getSettings, alt } from "@/lib/site";
import { caloFoods } from "@/lib/calo";
import { mainPortion, allFoods, porName, DISH_GROUPS, dishGroup } from "@/lib/foods";
import { slugify } from "@/lib/slug";
import { breadcrumb, ld } from "@/lib/schema";
import { vnInt } from "@/lib/slug";
const PH = ["/img/bowl-1.jpg", "/img/bowl-2.jpg", "/img/bowl-3.jpg"];
const imgOf = (f, i) => f.page?.image_url || PH[i % 3];

export const revalidate = 300;
const PER = 40;
export async function generateMetadata({ searchParams }) {
  const g = searchParams?.nhom; const page = +searchParams?.trang || 1;
  return { title: "Bảng calo món ăn Việt Nam", description: "Calo theo 100 g và theo khẩu phần thường gặp của món Việt: phở, bún, cơm tấm, bánh mì… Kèm đạm, tinh bột, chất béo.", alternates: alt(`/bang-calo${g ? `?nhom=${g}` : ""}${page > 1 ? `${g ? "&" : "?"}trang=${page}` : ""}`) };
}
export default async function Index({ searchParams }) {
  const s = await getSettings();
  const g = searchParams?.nhom || "";
  const qs = String(searchParams?.q || "").trim().toLowerCase();
  const page = Math.max(1, +searchParams?.trang || 1);
  // thứ tự: theo nhóm món (bản vẽ), trong nhóm giữ thứ tự kho món (món phổ biến trước); món ngoài 5 nhóm xếp cuối
  const gi = (f) => { const i = dishGroup(f); return i < 0 ? 99 : i; };
  let list = (await caloFoods()).map((f, i) => ({ ...f, _i: i, dg: dishGroup(f) })).sort((a, b) => gi(a) - gi(b) || a._i - b._i);
  const all = (await allFoods()).length;
  const groups = DISH_GROUPS.map(([n], i) => [i, n]).filter(([i]) => list.some((x) => x.dg === i));
  if (g) { const i = DISH_GROUPS.findIndex(([n]) => slugify(n) === g); list = list.filter((x) => x.dg === i); }
  if (qs) list = list.filter((x) => slugify(x.name).includes(slugify(qs)));
  const total = list.length;
  const rows = list.slice((page - 1) * PER, page * PER);
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bảng calo món", path: "/bang-calo" }];
  const base = `/bang-calo${g ? `?nhom=${g}` : ""}`;
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs))} />
      <PageHead eye="Bảng calo món Việt" h1="Bảng calo món ăn Việt Nam" sub="Calo theo 100 g và theo khẩu phần thường gặp. Bấm vào món để xem đạm, tinh bột, chất béo và cách ăn khi giảm cân." crumb={crumbs}
        right={<form action="/bang-calo" className="bc-q" style={{ display: "flex", gap: 8, width: 420, maxWidth: "100%" }}><input name="q" defaultValue={qs} className="inp" placeholder="Tìm món: phở, cơm tấm, trà sữa…" aria-label="Tìm món" />{g && <input type="hidden" name="nhom" value={g} />}<button className="btn b1" style={{ height: 52, width: 52, padding: 0, borderRadius: 14 }} aria-label="Tìm"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></button></form>} />
      <div className="wrap bcw" style={{ paddingTop: 40 }}>
        <style>{`@media(max-width:720px){.bcw{padding-top:24px!important}.bc-q{width:100%!important}}`}</style>
        <div className="chips"><a className={`chip${g ? "" : " on"}`} href="/bang-calo">Tất cả</a>{groups.map(([k, n]) => <a key={k} className={`chip${g === slugify(n) ? " on" : ""}`} href={`/bang-calo?nhom=${slugify(n)}`}>{n}</a>)}</div>
        {qs && <p className="mut" style={{ marginTop: 20, fontSize: 15 }}>{total} món khớp “{qs}”</p>}
        <div className="card only-pc" style={{ overflow: "hidden", padding: 0, marginTop: 28 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#F5F8FD" }}>{[["Món", "left"], ["Nhóm", "left"], ["Calo / 100 g", "right"], ["Khẩu phần thường gặp", "left"], ["Calo khẩu phần", "right"], ["", "right"]].map(([h, al]) => <th key={h} style={{ padding: "14px 20px", fontSize: 13.5, color: "#475569", fontWeight: 700, textAlign: al }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((f, i) => { const p = mainPortion(f); return (
              <tr key={f.key} style={{ borderTop: "1px solid #EEF2F7" }}>
                <td style={{ padding: "12px 20px" }}><a href={`/calo/${f.slug}`} style={{ display: "flex", alignItems: "center", gap: 12 }}><img className="th" src={imgOf(f, i)} alt="" width={44} height={44} loading="lazy" style={{ width: 44, height: 44 }} /><b style={{ fontSize: 16 }}>{f.name}</b></a></td>
                <td style={{ padding: "12px 20px", fontSize: 14.5, color: "#64748B" }}>{f.dg >= 0 ? DISH_GROUPS[f.dg][0] : f.group}</td>
                <td style={{ padding: "12px 20px", textAlign: "right", fontSize: 15 }}>{f.per100.cal} kcal</td>
                <td style={{ padding: "12px 20px", fontSize: 14.5, color: "#475569" }}>{p ? `${porName(p, true)} ${p.gram} g` : "—"}</td>
                <td style={{ padding: "12px 20px", textAlign: "right" }}><b style={{ fontSize: 17 }}>{p ? `${p.cal} kcal` : "—"}</b></td>
                <td style={{ padding: "12px 20px", textAlign: "right" }}><a href={`/calo/${f.slug}`} style={{ fontSize: 14, fontWeight: 700, color: "#0062F0" }}>Chi tiết →</a></td>
              </tr>); })}</tbody>
          </table>
        </div>
        <div className="card only-m" style={{ padding: "4px 16px", marginTop: 20 }}>
          {rows.map((f, k) => { const p = mainPortion(f); return (
            <a key={f.key} href={`/calo/${f.slug}`} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 0", borderTop: k ? "1px solid #EEF2F7" : 0 }}>
              <img className="th" src={imgOf(f, k)} alt="" width={52} height={52} loading="lazy" style={{ width: 52, height: 52 }} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><b style={{ fontSize: 16 }}>{f.name}</b><span style={{ fontSize: 13, color: "#64748B" }}>{p ? `${porName(p, true)} ${p.gram} g` : f.group}</span></span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}><b style={{ fontSize: 18 }}>{p ? p.cal : f.per100.cal}</b><span style={{ fontSize: 12, color: "#94A3B8" }}>kcal · {f.per100.cal}/100 g</span></span>
            </a>); })}
        </div>
        {!rows.length && <p className="lead" style={{ padding: "32px 0" }}>Chưa tìm thấy món này. Thử tên khác, ví dụ “bún”, “cơm”.</p>}
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 16, lineHeight: 1.6 }}>Số liệu từ kho món Fipilot AI ({vnInt(all)} món). Calo thực tế đổi theo quán, cách nấu và lượng dầu mỡ.</p>
        <Pager page={page} total={total} per={PER} base={base + (qs ? `${g ? "&" : "?"}q=${encodeURIComponent(qs)}` : "")} />
      </div>
      <Sticky s={s} ref_="bang-calo" />
    </main>
  );
}
