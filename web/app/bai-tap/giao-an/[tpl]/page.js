// 01/11 (bản vẽ "Pi và Bài tập trên web", mục 5): giáo án mẫu — từng buổi, từng bài kèm ảnh nhỏ và số hiệp × lần, đúng như app xếp (plan.js).
import { notFound } from "next/navigation";
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import { ExPhoto } from "@/components/Ex";
import { getSettings, alt, withOg } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";
import { TEMPLATES, tplOf, tplSessions, TPL_INTRO, exById, exUrl, setsText } from "@/lib/workout";

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => TEMPLATES.map((t) => ({ tpl: t.id }));

export async function generateMetadata({ params }) {
  const t = tplOf(params.tpl); if (!t) return {};
  const s = await getSettings();
  return withOg({ title: `Giáo án ${t.name}: lịch tập ${t.hint}`, description: `${TPL_INTRO[t.id]} Từng buổi, từng bài kèm số hiệp × lần và ảnh động tác.`, alternates: alt(`/bai-tap/giao-an/${t.id}`) }, s);
}
export default async function GiaoAn({ params }) {
  const t = tplOf(params.tpl); if (!t) notFound();
  const s = await getSettings();
  const app = (s?.site?.app_url || "https://app.fipilotai.com").replace(/\/$/, "");
  const ses = tplSessions(t.id);
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bài tập", path: "/bai-tap" }, { name: `Giáo án ${t.name}`, path: `/bai-tap/giao-an/${t.id}` }];
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs))} />
      <PageHead crumb={crumbs} eye={t.hint} h1={`Giáo án ${t.name}`} sub={TPL_INTRO[t.id]} right={<a className="btn b1 big" href={`${app}/?wk=${t.id}&ref=giao-an-${t.id}`} data-testid="tpl-app">Dùng giáo án này trong app</a>} />
      <div className="wrap" style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: 20 }}>
        {ses.map((x, i) => (
          <section key={i} className="card exday" data-testid="tpl-day">
            <h2><i>{i + 1}</i>{x.title}</h2>
            {x.items.map((it, k) => { const e = exById(it.ex); if (!e) return null; return (
              <a key={k} className="exrow" href={exUrl(e.id)}><ExPhoto ex={e} big={false} /><span className="t"><b>{e.vi}</b><small>{e.en}</small></span><em>{setsText(it.sets, it.reps, e)}</em></a>); })}
          </section>
        ))}
      </div>
      <div className="wrap" style={{ marginTop: 28 }}><p className="mut" style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 760, margin: 0 }}>Trong app, giáo án tự xếp các buổi vào đúng ngày tập của bạn; bạn đổi bài, đổi ngày, thêm bớt buổi tuỳ ý. Mỗi buổi app điền sẵn mức tạ lần trước và báo khi lên kỷ lục.</p></div>
    </main>
  );
}
