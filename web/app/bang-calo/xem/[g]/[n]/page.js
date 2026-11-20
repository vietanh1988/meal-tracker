// 14/11: /bang-calo, ?nhom=…, ?trang=… (không có ô tìm q) được middleware chuyển thầm vào đây → lưu đệm 1 giờ.
// Có ?q= (tìm món) vẫn vào trang gốc dựng mới (ít người dùng). g = "_" là Tất cả.
import Index, { generateMetadata as meta } from "../../../page";
export const revalidate = 604800; // 20/11: 7 ngày (bot vào lại sau 1 giờ làm web dựng lại trang → tốn CPU); sửa nội dung → /api/revalidate làm mới ngay
export const dynamicParams = true;
export async function generateStaticParams() { return []; }
const sp = (p) => ({ nhom: p.g === "_" ? "" : p.g, trang: p.n });
export async function generateMetadata({ params }) { return meta({ searchParams: sp(params) }); }
export default function Page({ params }) { return Index({ searchParams: sp(params) }); }
