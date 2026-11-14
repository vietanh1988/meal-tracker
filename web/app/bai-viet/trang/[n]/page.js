// 14/11 (Vercel sắp hết CPU free): /bai-viet và /bai-viet?trang=N được middleware chuyển thầm vào đây (URL khách thấy không đổi)
// → trang lưu đệm 1 giờ thay vì dựng lại mỗi lượt mở (đọc searchParams làm trang gốc luôn dựng mới).
import Blog, { generateMetadata as meta } from "../../page";
export const revalidate = 3600;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }
const sp = (p) => ({ trang: p.n });
export async function generateMetadata({ params }) { return meta({ searchParams: sp(params) }); }
export default function Page({ params }) { return Blog({ searchParams: sp(params) }); }
