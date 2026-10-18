export default function CaloBox({ fd, por, link = true }) {
  if (!fd) return null;
  const n = por || { name: "100 g", gram: 100, ...fd.per100 };
  return (
    <figure className="card" style={{ margin: 0, overflow: "hidden" }}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, background: "linear-gradient(180deg,#F5F9FF,#FFFFFF)" }}>
        <b style={{ fontSize: 17 }}>{fd.name} · {n.name}{n.gram ? ` ${n.gram} g` : ""}</b>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <b style={{ fontSize: 34, letterSpacing: "-.02em" }}>{n.cal} kcal</b>
          <span style={{ display: "flex", gap: 18 }}>{[["Đạm", n.p], ["Tinh bột", n.c], ["Chất béo", n.f]].map(([a, b]) => <span key={a} style={{ display: "flex", flexDirection: "column" }}><span className="lbl">{a}</span><b style={{ fontSize: 16 }}>{String(b).replace(".", ",")} g</b></span>)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span className="mut" style={{ fontSize: 13.5 }}>Số liệu từ kho món Fipilot AI · 100 g = {fd.per100.cal} kcal</span>
          {link && <a className="btn b2" href={`/calo/${fd.slug}`} style={{ height: 38, fontSize: 14 }}>Xem đủ các khẩu phần</a>}
        </div>
      </div>
    </figure>
  );
}
