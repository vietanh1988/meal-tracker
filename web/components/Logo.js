// Logo web: ảnh tải lên ở Quản trị › Cài đặt web (site.logo_url) hoặc chữ F mặc định
export default function Logo({ size = 30, label = true, src, name = "Fipilot AI" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      {src ? <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: 8, objectFit: "contain" }} /> : <span style={{ width: size, height: size, borderRadius: 8, background: "linear-gradient(135deg,#1A7CFF,#0050E6)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.57 }}>F</span>}
      {label && <b style={{ fontSize: 17 }}>{name}</b>}
    </span>
  );
}
