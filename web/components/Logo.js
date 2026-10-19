// Logo web: ảnh tải lên ở Quản trị › Cài đặt web (site.logo_url); chưa tải thì dùng logo app (chữ F trên nền xanh, giống icon app)
export default function Logo({ size = 30, label = true, src, name = "Fipilot AI" }) {
  const img = src ? { src } : { src: "/logo-64.webp", srcSet: "/logo-64.webp 1x, /logo-128.webp 2x" };
  return (
    <span className="logo" style={{ display: "inline-flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
      <img {...img} alt="" width={size} height={size} decoding="async" style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), objectFit: "contain", flexShrink: 0, display: "block" }} />
      {label && <b style={{ fontSize: 17, whiteSpace: "nowrap", letterSpacing: "-.01em" }}>{name}</b>}
    </span>
  );
}
