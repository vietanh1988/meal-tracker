// /pi = trang giới thiệu Pi (mẫu "landing", soạn ở Quản trị › Trang) — thư mục app/pi có thêm /pi/<biệt danh> nên cần trang này để /pi không bị 404.
import SlugPage, { generateMetadata as slugMeta } from "../[slug]/page";
export const revalidate = 60;
export const generateMetadata = () => slugMeta({ params: { slug: "pi" } });
export default function PiLanding() { return SlugPage({ params: { slug: "pi" } }); }
