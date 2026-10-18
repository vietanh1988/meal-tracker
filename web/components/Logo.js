export default function Logo({ size = 30, label = true }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span style={{ width: size, height: size, borderRadius: 8, background: "linear-gradient(135deg,#1A7CFF,#0050E6)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.57 }}>F</span>
      {label && <b style={{ fontSize: 17 }}>Fipilot AI</b>}
    </span>
  );
}
