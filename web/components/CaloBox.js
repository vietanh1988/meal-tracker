export default function CaloBox({ fd, por, link = true, img }) {
  if (!fd) return null;
  const n = por || { name: "100 g", gram: 100, ...fd.per100 };
  return (
    <figure className="card cbox" style={{ margin: 0, overflow: "hidden" }}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, background: "linear-gradient(180deg,#F5F9FF,#FFFFFF)" }}>
        <b style={{ fontSize: 17 }}>{fd.name} · {n.name}{n.gram ? ` ${n.gram} g` : ""}</b>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <img className="th" src={img || "/img/bowl-1.jpg"} alt="" width={64} height={64} loading="lazy" style={{ width: 64, height: 64 }} />
          <b style={{ fontSize: 34 }}>{n.cal} kcal</b>
          <span className="cbox-m" style={{ display: "flex", gap: 16, marginLeft: 8 }}>{[["Đạm", n.p], ["Tinh bột", n.c], ["Chất béo", n.f]].map(([a, b]) => <span key={a} style={{ display: "flex", flexDirection: "column" }}><span className="lbl">{a}</span><b style={{ fontSize: 16 }}>{String(b).replace(".", ",")} g</b></span>)}</span>
        </div>
        <div className="cbox-f" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span className="mut" style={{ fontSize: 13.5 }}>Số liệu từ kho món Fipilot AI · 100 g = {fd.per100.cal} kcal</span>
          {link && <a className="btn b2" href={`/calo/${fd.slug}`} style={{ height: 36, fontSize: 13 }}>Xem đủ các khẩu phần</a>}
        </div>
        <style>{`@media(max-width:720px){.cbox>div{padding:16px!important}.cbox-m{margin-left:0!important}.cbox-f{flex-direction:column!important;align-items:stretch!important;gap:8px!important}}`}</style>
      </div>
    </figure>
  );
}
