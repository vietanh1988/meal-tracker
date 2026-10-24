// 24/10 (chủ dự án: "đội mũ nón thì đè mẹ lá đi cho đỡ lỗi"): có món ô Đầu → lá Pi xếp DƯỚI mũ
// (mũ trùm che lá; vương miện / băng đô / kẹp vẫn lộ lá). Không đội gì thì giữ thứ tự manifest (lá trên cùng phần đầu).
export const layerOrder = (eq, order) => (eq && eq.dau ? order.filter((L) => L !== "la").flatMap((L) => (L === "dau" ? ["la", "dau"] : [L])) : order);
