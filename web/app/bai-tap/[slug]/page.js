// 01/11 (bản vẽ "Pi và Bài tập trên web", mục 4): trang 1 bài tập — ảnh 2 khung, thông tin nhanh, cách tập, lưu ý, giáo án mẫu có bài này, bài cùng nhóm cơ.
// Dữ liệu cấu trúc HowTo (từng bước) để Google hiện các bước. Link theo tên Việt (lib/workout.js exSlug).
import { notFound } from "next/navigation";
import Crumb from "@/components/Crumb";
import JsonLd from "@/components/JsonLd";
import { ExPhoto, ExCard } from "@/components/Ex";
import { getSettings, alt, withOg, appLink, siteUrl } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";
import RelPosts from "@/components/RelPosts";
import { rpcRead } from "@/lib/sb";
import { exPats } from "@/lib/mentions";
import { EXERCISES, exSlug, exBySlug, MUSCLE_NAME, MUSCLE_SLUG, MUSCLE_TONE, EQUIPS, LEVEL_NAME, inTemplates, related, photoUrls, setsText, targetsOf } from "@/lib/workout";

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => EXERCISES.map((e) => ({ slug: exSlug(e.id) }));

const desc = (e) => { const t = targetsOf(e.id); return `Cách tập ${e.vi} (${e.en}) đúng kỹ thuật: ${(e.steps || []).length} bước, có ảnh động tác. Tác động vào ${t ? t.main.join(", ").toLowerCase() : MUSCLE_NAME[e.muscle]?.toLowerCase()}${t?.sub.length ? `; phụ ${t.sub.join(", ").toLowerCase()}` : ""} · ${EQUIPS[e.equip]?.toLowerCase()}.`; };
export async function generateMetadata({ params }) {
  const e = exBySlug(params.slug); if (!e) return {};
  const s = await getSettings();
  const ph = photoUrls(e.id, true);
  const m = withOg({ title: `${e.vi} (${e.en}): cách tập đúng, có ảnh`, description: desc(e), alternates: alt(`/bai-tap/${params.slug}`) }, s);
  if (ph) m.openGraph = { ...(m.openGraph || {}), images: [{ url: ph[1], width: 480, height: 320 }] };
  return m;
}

export default async function BaiTapChiTiet({ params }) {
  const e = exBySlug(params.slug); if (!e) notFound();
  const s = await getSettings();
  const tpls = inTemplates(e.id);
  const tg = targetsOf(e.id); // 01/11: cơ tác động
  const rel = related(e, 4);
  // 06/11 (bản vẽ "Cụm chủ đề", phần 4): bài viết có khối Bài tập này hoặc nhắc tên bài tập
  const posts = ((await rpcRead("web_mentions", { p_pats: exPats(e), p_limit: 3 }, { revalidate: 3600 })) || []);
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bài tập", path: "/bai-tap" }, { name: MUSCLE_NAME[e.muscle], path: `/bai-tap/nhom/${MUSCLE_SLUG[e.muscle]}` }, { name: e.vi, path: `/bai-tap/${params.slug}` }];
  const tone = (m) => MUSCLE_TONE[m] || ["#F1F5F9", "#475569"];
  const sug = tpls[0] ? `${setsText(tpls[0].sets, tpls[0].reps, e)}, nghỉ ${e.pattern === "cardio" || e.pattern === "core" ? "30–60" : "60–90"} giây` : "3 × 10–12";
  const ph = photoUrls(e.id, true);
  const howto = { "@type": "HowTo", name: `Cách tập ${e.vi} (${e.en})`, description: desc(e), ...(ph ? { image: ph } : {}), step: (e.steps || []).map((t, i) => ({ "@type": "HowToStep", position: i + 1, text: t })), tool: [{ "@type": "HowToTool", name: EQUIPS[e.equip] }] };
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), howto)} />
      <div className="wrap" style={{ paddingTop: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <Crumb items={crumbs} />
        <div className="exdet">
          <ExPhoto ex={e} labels className="hero" eager />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><h1 className="h1" style={{ fontSize: 40 }} data-testid="ex-en">{e.en || e.vi}{e.en && <span data-testid="ex-vi" style={{ display: "block", fontSize: 21, color: "#475569", fontWeight: 700, lineHeight: 1.4, marginTop: 6 }}>{e.vi}</span>}</h1></div>
            <div className="chips">
              <span className="pill" style={{ background: tone(e.muscle)[0], color: tone(e.muscle)[1] }}>{MUSCLE_NAME[e.muscle]}</span>
              {(e.sub || []).map((m) => <span key={m} className="pill" style={{ background: "#F1F5F9", color: "#475569" }}>{MUSCLE_NAME[m]}</span>)}
              <span className="pill">{EQUIPS[e.equip]}</span>
              <span className="pill" style={{ background: "#ECFDF5", color: "#047857" }}>{LEVEL_NAME[e.level]}</span>
            </div>
            <table className="exft"><tbody>
              <tr><td>Dụng cụ</td><td>{EQUIPS[e.equip]}</td></tr>
              <tr><td>Mức độ</td><td>{LEVEL_NAME[e.level]}</td></tr>
              <tr><td>Gợi ý</td><td>{sug}</td></tr>
            </tbody></table>
            {tg && (
              <div className="card extg" data-testid="ex-targets">
                <b>Tác động vào</b>
                {[["Chính", tg.main, "c1"], ["Phụ", tg.sub, "c2"]].filter(([, l]) => l.length).map(([lb, l, c]) => <div key={lb} className="tr"><span className="lb">{lb}</span><span className="ch">{l.map((m) => <span key={m} className={c}>{m}</span>)}</span></div>)}
                {tg.note && <p>{tg.note}</p>}
              </div>
            )}
            <div className="card exapp"><div><b>Ghi buổi tập trong app</b><span>App điền sẵn mức tạ lần trước, báo khi lên kỷ lục, Pi thưởng 20 Hạt mỗi buổi.</span></div><a className="btn b1" href={appLink(s, `bai-tap-${e.id}`)} data-testid="ex-app">Mở app</a></div>
          </div>
        </div>
        <div className="exdet" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(e.steps || []).length > 0 && <><h2 className="h2" style={{ fontSize: 26 }}>Cách tập</h2><ol className="exsteps">{e.steps.map((t, i) => <li key={i}>{t}</li>)}</ol></>}
            {e.tip && <div className="tip"><b>Lưu ý:</b> {e.tip}</div>}
          </div>
          {tpls.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 className="h2" style={{ fontSize: 22 }}>Có trong giáo án mẫu</h2>
              <div className="card" style={{ padding: "4px 18px" }}>
                {tpls.map((t, i) => <a key={i} className="exrow" href={`/bai-tap/giao-an/${t.tpl}`}><span className="t"><b>{t.name}</b><small style={{ fontStyle: "normal" }}>Buổi {t.title}</small></span><em>{setsText(t.sets, t.reps, e)}</em></a>)}
              </div>
            </div>
          )}
        </div>
        <RelPosts posts={posts} title="Bài viết có bài tập này" more={{ url: "/chu-de/tap-luyen", label: "Cụm Tập luyện giảm mỡ" }} testid="ex-posts" />
        {rel.length > 0 && <><h2 className="h2" style={{ fontSize: 26, marginTop: 16 }}>Bài cùng nhóm cơ {MUSCLE_NAME[e.muscle]?.toLowerCase()}</h2><div className="exlib">{rel.map((x) => <ExCard key={x.id} e={x} />)}</div></>}
      </div>
    </main>
  );
}
