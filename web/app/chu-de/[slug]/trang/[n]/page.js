// 14/11: /chu-de/<mục> và ?trang=N được middleware chuyển thầm vào đây → lưu đệm 1 giờ (xem app/bai-viet/trang/[n])
import Cat, { generateMetadata as meta } from "../../page";
export const revalidate = 604800; // 20/11: 7 ngày (bot vào lại sau 1 giờ làm web dựng lại trang → tốn CPU); sửa nội dung → /api/revalidate làm mới ngay
export const dynamicParams = true;
export async function generateStaticParams() { return []; }
const args = (p) => ({ params: { slug: p.slug }, searchParams: { trang: p.n } });
export async function generateMetadata({ params }) { return meta(args(params)); }
export default function Page({ params }) { return Cat(args(params)); }
