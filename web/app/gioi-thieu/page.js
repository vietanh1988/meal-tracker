// Giới thiệu (139o/p) — câu chuyện lấy từ Quản trị › Trang › "gioi-thieu" (khối nội dung); trống thì không hiện gì thêm
import PageHead from "@/components/PageHead";
import SecHead from "@/components/SecHead";
import Blocks from "@/components/Blocks";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import { getSettings, alt, withOg } from "@/lib/site";
import { getPostBySlug } from "@/lib/content";
import { prepare } from "@/lib/blocks";
import { allFoods } from "@/lib/foods";
import { vnInt } from "@/lib/slug";
import { EXERCISES, TEMPLATES } from "@/lib/workout";
import { breadcrumb, ld } from "@/lib/schema";
import { aboutApp } from "@/lib/appdata";

export const revalidate = 3600; // 14/11: 1 giờ, sửa nội dung → /api/revalidate làm mới ngay
const H1 = "Fipilot AI giúp người Việt giảm cân bằng chính món mình ăn hằng ngày";
export async function generateMetadata() {
  const p = await getPostBySlug("gioi-thieu");
  return withOg({ title: p?.seo?.title || "Giới thiệu Fipilot AI", description: p?.seo?.desc || p?.excerpt || H1, alternates: alt("/gioi-thieu") }, typeof s !== "undefined" ? s : undefined);
}

export default async function About() {
  const s = await getSettings();
  const p = await getPostBySlug("gioi-thieu");
  let blocks = p?.kind === "page" ? await prepare(p.blocks || []) : [];
  // chưa viết trang Giới thiệu cho web → dùng lời giới thiệu anh viết trong app (Quản trị app › Giới thiệu)
  if (!blocks.length) { const a = await aboutApp(); blocks = [a.devBio, a.description].filter(Boolean).map((x) => ({ type: "p", html: String(x).replace(/[<>]/g, "") })); }
  const n = (await allFoods()).length;
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Giới thiệu", path: "/gioi-thieu" }];
  const RULES = [["🍜", "Món Việt là gốc", `${vnInt(n)} món trong kho, khẩu phần theo cách người Việt ăn: tô, đĩa, ổ, bát.`], ["🧮", "App tính, bạn ăn", "Không bắt đếm calo bằng tay. Thực đơn lên sẵn, đổi món 1 chạm."], ["📉", "Giảm đều, không ép", "Không xuống dưới 1.200 kcal/ngày. Tự chỉnh theo cân mỗi tuần."]];
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), { "@type": "AboutPage", name: "Giới thiệu Fipilot AI" })} />
      <PageHead eye="Giới thiệu" h1={H1} crumb={crumbs} />
      <section className="wrap ab-s" style={{ paddingTop: 56, display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="eye">Vì sao có Fipilot AI</span>
          <h2 className="ab-h2" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.2 }}>Ứng dụng giảm cân nước ngoài không hiểu bát phở</h2>
          {blocks.length > 0 && <div className="ab-story"><Blocks blocks={blocks} s={s} /></div>}
        </div>
        <div className="ab-art" style={{ position: "relative", height: 380 }}>
          <img className="ab-bowl" src="/img/bowl-pho.jpg" alt="Tô phở bò" width={300} height={300} style={{ position: "absolute", left: 0, top: 30, width: 300, height: 300, borderRadius: 24, objectFit: "cover" }} />
          <div className="ph ab-ph" style={{ width: 180, transform: "rotate(4deg)", position: "absolute", right: 40, top: 0 }}><img src="/img/app-today.webp" alt="Màn Hôm nay của app Fipilot AI" /></div>
        </div>
      </section>
      <section className="wrap sec">
        <SecHead eye="Điều chúng tôi tin" title="3 nguyên tắc khi làm app" />
        <div className="grid3 ab-g" style={{ gap: 20 }}>
          {RULES.map(([e, t, x]) => (
            <div key={t} className="card ab-c" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10 }}><span style={{ fontSize: 30 }} aria-hidden="true">{e}</span><h3 className="ab-t" style={{ fontSize: 20 }}>{t}</h3><p style={{ fontSize: 15.5, color: "#64748B", lineHeight: 1.6 }}>{x}</p></div>
          ))}
        </div>
      </section>
      {/* 06/11 (chủ dự án chốt bản vẽ): app giờ lo cả tập luyện và thói quen — giữ nguyên câu chuyện ở trên */}
      <section className="wrap sec" data-testid="ab-now">
        <SecHead eye="Fipilot AI bây giờ" title="Không chỉ ăn đúng, còn tập đúng và giữ được thói quen" />
        <div className="grid3 ab-g" style={{ gap: 20 }}>
          {[["🏋️", "Tập luyện", `${EXERCISES.length} bài tập có ảnh động tác, ${TEMPLATES.length} giáo án mẫu 2–6 buổi mỗi tuần. App ghi tạ từng hiệp, điền sẵn mức lần trước, báo khi lên kỷ lục.`, "/bai-tap", "Xem thư viện bài tập"],
            ["💙", "Pi", "Bạn đồng hành nhận Hạt khi bạn ăn đúng bữa, uống đủ nước, tập xong buổi. Kết bạn, xếp hạng tuần để có động lực.", "/pi", "Gặp Pi"],
            ["📚", "Đọc theo chủ đề", "Bài viết chia 6 cụm: giảm cân, món có béo không, thực đơn, dinh dưỡng, tập luyện, thói quen. Mỗi bài nối thẳng với bảng calo món và thư viện bài tập.", "/bai-viet", "Xem bài viết"]].map(([e, t, x, u, l]) => (
            <div key={t} className="card ab-c" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10 }}><span style={{ fontSize: 30 }} aria-hidden="true">{e}</span><h3 className="ab-t" style={{ fontSize: 20 }}>{t}</h3><p style={{ fontSize: 15.5, color: "#64748B", lineHeight: 1.6 }}>{x}</p><a href={u} style={{ marginTop: "auto", fontWeight: 700, color: "#0062F0", fontSize: 15 }}>{l} ›</a></div>
          ))}
        </div>
      </section>
      <Sticky s={s} ref_="gioi-thieu" />
      <style dangerouslySetInnerHTML={{ __html: `.ph{border-radius:30px;background:#0F172A;padding:7px;box-shadow:0 24px 48px rgba(15,23,42,.22)}.ph img{display:block;border-radius:24px;width:100%;height:auto}.ab-story .prose p{font-size:18px;line-height:1.75;color:#334155}
@media(max-width:720px){.ab-s{padding-top:32px!important;grid-template-columns:1fr!important;gap:24px!important}.ab-h2{font-size:26px!important}.ab-story .prose p{font-size:16px}.ab-art{height:300px!important}.ab-bowl{width:220px!important;height:220px!important}.ab-ph{width:150px!important;right:4%!important}.ab-g{gap:12px!important}.ab-c{padding:20px!important}.ab-t{font-size:18px!important}}` }} />
    </main>
  );
}
