// 01/11: Thư viện bài tập theo nhóm cơ (/bai-tap/nhom/nguc…) — trang riêng để Google lập chỉ mục từng nhóm
import { notFound } from "next/navigation";
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import ExLib from "@/components/ExLib";
import { MuscleChips } from "@/components/ExParts";
import { getSettings, alt, withOg, siteUrl } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";
import { EXERCISES, EQUIP_CHIPS, MUSCLE_SLUG, MUSCLE_NAME, muscleOfSlug, exUrl } from "@/lib/workout";
import { exLite } from "@/lib/exLite";

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => Object.values(MUSCLE_SLUG).map((m) => ({ m }));
const intro = (k, n) => (k === "cardio" ? `${n} bài cardio đốt mỡ: máy chạy bộ, đạp xe, nhảy dây, bài tại nhà không cần dụng cụ.` : `${n} bài tập ${MUSCLE_NAME[k].toLowerCase()} ở phòng gym và tại nhà, có ảnh động tác, tên tiếng Anh và cách tập từng bước.`);

export async function generateMetadata({ params }) {
  const k = muscleOfSlug(params.m); if (!k) return {};
  const s = await getSettings();
  const n = EXERCISES.filter((e) => e.muscle === k).length;
  return withOg({ title: `${n} bài tập ${MUSCLE_NAME[k].toLowerCase()} có ảnh động tác`, description: intro(k, n), alternates: alt(`/bai-tap/nhom/${params.m}`) }, s);
}
export default async function Nhom({ params }) {
  const k = muscleOfSlug(params.m); if (!k) notFound();
  const s = await getSettings();
  const list = EXERCISES.filter((e) => e.muscle === k);
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bài tập", path: "/bai-tap" }, { name: MUSCLE_NAME[k], path: `/bai-tap/nhom/${params.m}` }];
  const eqs = new Set(list.map((e) => e.equip));
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), { "@type": "ItemList", name: `Bài tập ${MUSCLE_NAME[k]}`, itemListElement: list.map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.vi, url: siteUrl(s, exUrl(e.id)) })) })} />
      <PageHead crumb={crumbs} h1={`Bài tập ${MUSCLE_NAME[k].toLowerCase()}`} sub={intro(k, list.length)} />
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <MuscleChips active={k} />
        <ExLib list={exLite(list)} equips={EQUIP_CHIPS.filter(([e]) => !e || eqs.has(e))} per={0} />
      </div>
    </main>
  );
}
