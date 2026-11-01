// 01/11 (chủ dự án chốt bản vẽ "Pi và Bài tập trên web", mục 3): Thư viện bài tập — cùng dữ liệu với app (lib/workout.js).
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import ExLib from "@/components/ExLib";
import { ExTplCards, MuscleChips } from "@/components/ExParts";
import { getSettings, alt, withOg } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";
import { EXERCISES, EQUIP_CHIPS, countBy } from "@/lib/workout";
import { exLite } from "@/lib/exLite";

export const revalidate = 3600;
const N = EXERCISES.length;
export async function generateMetadata() {
  const s = await getSettings();
  return withOg({ title: "Thư viện bài tập gym và tại nhà có ảnh động tác", description: `${N} bài tập có ảnh động tác, tên tiếng Việt kèm tên tiếng Anh, cách tập từng bước: ngực, lưng, vai, tay, chân, mông, bụng, cardio. Kèm giáo án mẫu.`, alternates: alt("/bai-tap") }, s);
}
export default async function BaiTap() {
  const s = await getSettings();
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Bài tập", path: "/bai-tap" }];
  const eqN = countBy("equip");
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs))} />
      <PageHead crumb={crumbs} h1="Thư viện bài tập gym và tại nhà" sub={`${N} bài có ảnh động tác, tên tiếng Việt kèm tên tiếng Anh, cách tập từng bước và lỗi hay gặp. Cùng dữ liệu với phần Tập luyện trong app Fipilot AI.`} />
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <MuscleChips active="" />
        <ExLib list={exLite()} equips={EQUIP_CHIPS.filter(([k]) => !k || eqN[k])} />
        <h2 className="h2" style={{ marginTop: 40 }}>Giáo án mẫu</h2>
        <ExTplCards />
      </div>
    </main>
  );
}
