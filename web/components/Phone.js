// Khung điện thoại đời mới (bản vẽ 19/10, kiểu ảnh ChatGPT · mẫu B titan đen): viền kim loại bóng, viền màn mỏng,
// đảo camera, thanh trạng thái 9:41, nút cạnh máy, bóng phản chiếu dưới sàn. Kích thước theo --w (CSS) — kiểu ở globals.css (.ph…).
// dark = thanh trạng thái chữ trắng (ảnh màn có đầu màu xanh), ngược lại chữ đen.
export default function Phone({ src, mSrc, alt = "", dark = false, className = "", style, priority = false, w = 312, h = 675 }) {
  return (
    <div className={`ph ${className}`} style={style}>
      <span className="ph-btn ph-act" /><span className="ph-btn ph-v1" /><span className="ph-btn ph-v2" /><span className="ph-btn ph-pw" /><span className="ph-btn ph-cam" />
      <div className="ph-bz">
        <div className={`ph-sc${dark ? " ph-sc-d" : ""}`}>
          <div className={`ph-sb${dark ? " ph-sb-d" : ""}`} aria-hidden="true">
            <b>9:41</b>
            <span className="ph-ic">
              <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
              <svg viewBox="0 0 16 12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .4C5.3.4 2.7 1.4.8 3.3L2 4.6a8.5 8.5 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.3-1.3A6.7 6.7 0 0 0 8 4c-1.8 0-3.4.7-4.7 1.8l1.3 1.3A4.9 4.9 0 0 1 8 5.8Zm0 3.6c-.6 0-1.2.2-1.6.6L8 11.6 9.6 10c-.4-.4-1-.6-1.6-.6Z" /></svg>
              <i className="ph-bat"><i /></i>
            </span>
          </div>
          <span className="ph-di" aria-hidden="true"><i /></span>
          <picture>{mSrc && <source media="(max-width: 720px)" srcSet={mSrc} />}<img src={src} alt={alt} width={w} height={h} {...(priority ? { fetchPriority: "high" } : { loading: "lazy", decoding: "async" })} /></picture>
          <span className="ph-gl" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
