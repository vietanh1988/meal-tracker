// Ảnh tải qua Thư viện ảnh: <ten>_<rong>w.webp + bản nhỏ _400w/_800w/_1200w (chỉ bản nhỏ hơn ảnh gốc) → srcset
// Ảnh AI vẽ (hàm web-writer): <ten>_<rong>w.jpg + bản nhỏ _400w/_800w cùng đuôi .jpg
const W = [400, 800, 1200];
export function srcSet(url) {
  const m = String(url || "").match(/^(.*)_(\d{2,4})w\.(webp|jpg)$/);
  if (!m) return undefined;
  const max = +m[2];
  const list = W.filter((w) => w < max).map((w) => `${m[1]}_${w}w.${m[3]} ${w}w`);
  return list.length ? [...list, `${url} ${max}w`].join(", ") : undefined;
}
// Thuộc tính ảnh gắn sẵn srcset + sizes
export const imgAttrs = (url, sizes = "(max-width: 720px) 100vw, 760px") => { const s = srcSet(url); return s ? { src: url, srcSet: s, sizes } : { src: url }; };
