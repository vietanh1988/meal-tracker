// 06/11 (chủ dự án: "bài viết thêm không được trùng intent với bài và trang đã có"): danh sách MỌI trang đang có + ý định ngắn của trang,
// cho bộ chặn trùng (intentClash trong aiWrite.js) ở màn AI viết bài (app) và hàm web-writer. Chỉ dữ liệu công khai, chỉ đọc. Làm mới 10 phút.
import { q } from "./sb.js";
import { caloFoods } from "./calo.js";
import { EXERCISES, exSlug, MUSCLES, MUSCLE_SLUG, TEMPLATES } from "./workout.js";

const short = (t) => String(t || "").split(/[:?(]/)[0].trim();

export async function intentDocs() {
  const [posts, cats, foods] = await Promise.all([
    q("web_posts?kind=eq.post&status=in.(published,scheduled)&select=slug,title,kw:seo->>keyword&limit=3000", { revalidate: 600 }),
    q("web_terms?kind=eq.category&select=slug,name,seo", { revalidate: 600 }),
    caloFoods(),
  ]);
  return [
    ...(posts || []).map((p) => ({ url: `/${p.slug}`, kind: "post", text: p.kw || short(p.title), title: p.title })),
    ...(cats || []).map((c) => ({ url: `/chu-de/${c.slug}`, kind: "cat", text: `${c.name} ${short(c.seo?.title)}`, title: c.name })),
    ...foods.map((f) => ({ url: `/calo/${f.slug}`, kind: "calo", text: `${f.name} bao nhiêu calo`, title: `${f.name} bao nhiêu calo?` })),
    ...EXERCISES.map((e) => ({ url: `/bai-tap/${exSlug(e.id)}`, kind: "ex", text: `cách tập ${e.vi} ${e.en}`, title: e.vi })),
    ...MUSCLES.map(([k, n]) => ({ url: `/bai-tap/nhom/${MUSCLE_SLUG[k]}`, kind: "ex", text: `bài tập ${n}`, title: `Bài tập ${n.toLowerCase()}` })),
    ...TEMPLATES.map((t) => ({ url: `/bai-tap/giao-an/${t.id}`, kind: "ex", text: `giáo án ${t.name} lịch tập ${t.hint}`, title: `Giáo án ${t.name}` })),
    { url: "/tinh-calo", kind: "page", text: "tính calo cần ăn mỗi ngày để giảm cân", title: "Tính calo cần ăn mỗi ngày" },
    { url: "/bang-calo", kind: "page", text: "bảng calo món ăn việt nam", title: "Bảng calo món Việt" },
    { url: "/bai-tap", kind: "page", text: "thư viện bài tập gym tại nhà", title: "Thư viện bài tập" },
  ];
}

