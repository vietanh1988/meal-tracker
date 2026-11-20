// /pi = trang giới thiệu Pi (mẫu "landing", soạn ở Quản trị › Trang) — thư mục app/pi có thêm /pi/<biệt danh> nên cần trang này để /pi không bị 404.
import SlugPage, { generateMetadata as slugMeta } from "../[slug]/page";
export const revalidate = 604800; // 20/11: 7 ngày (bot vào lại sau 1 giờ làm web dựng lại trang → tốn CPU); sửa nội dung → /api/revalidate làm mới ngay
export const generateMetadata = () => slugMeta({ params: { slug: "pi" } });
export default function PiLanding() { return SlugPage({ params: { slug: "pi" } }); }
