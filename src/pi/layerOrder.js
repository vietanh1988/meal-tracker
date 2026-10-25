// 24/10 (chủ dự án: "mũ nón mà trùm cả đầu thì đè hẳn lá cho đỡ lỗi"):
// - món ô Đầu vẽ riêng trùm đầu (it.cover, scripts/pi/build.py — chỉ món STANDALONE) → BỎ hẳn lớp lá
// - mọi món khác (mũ cũ có chỗ khoét lá, băng đô, vương miện…) → giữ thứ tự manifest: lá đè lên, che đúng chỗ khoét
export const layerOrder = (eq, order) => (eq && eq.dau && eq.dau.cover ? order.filter((L) => L !== "la") : order);
