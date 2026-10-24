// 24/10 (chủ dự án: "mũ nón mà trùm cả đầu thì đè hẳn lá cho đỡ lỗi"):
// - món ô Đầu trùm đầu (it.cover, scripts/pi/build.py) → BỎ hẳn lớp lá
// - món ô Đầu khác (vương miện, băng đô, kẹp…) → lá xếp ngay dưới món
// - không đội gì → giữ thứ tự manifest
export const layerOrder = (eq, order) => {
  const d = eq && eq.dau;
  if (!d) return order;
  if (d.cover) return order.filter((L) => L !== "la");
  return order.filter((L) => L !== "la").flatMap((L) => (L === "dau" ? ["la", "dau"] : [L]));
};
