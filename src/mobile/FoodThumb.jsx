// 07/11: ô ảnh món (Ghi bữa, món trong bài Tin giảm cân). Có ảnh web → ảnh 400w bo góc.
// Chưa có ảnh / lỗi tải → không hiện gì (chủ dự án chốt 07/11: bỏ ô xám, dòng chỉ còn tên như cũ).
import { useState } from "react";
import { thumbOf } from "../lib/foodImages";

export function FoodThumb({ url, size = 44, radius = 12, name = "" }) {
  const [bad, setBad] = useState(false);
  const box = { width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: "hidden", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" };
  if (url && !bad) {
    return (
      <span data-testid="food-thumb" data-has="1" style={box}>
        <img src={thumbOf(url)} alt={name} width={size} height={size} loading="lazy" decoding="async" onError={() => setBad(true)} style={{ width: size, height: size, objectFit: "cover", display: "block" }} />
      </span>
    );
  }
  return null;
}
