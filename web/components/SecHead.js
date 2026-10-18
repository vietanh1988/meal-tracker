export default function SecHead({ eye, title, sub, right, as: H = "h2" }) {
  return (
    <div className="sechead" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 36 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {eye && <span className="eye">{eye}</span>}
        <H className="h2">{title}</H>
        {sub && <p className="sec-sub" style={{ maxWidth: 620, fontSize: 17, lineHeight: 1.6, color: "#64748B" }}>{sub}</p>}
      </div>
      {right}
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.sechead{margin-bottom:24px!important}.sec-sub{font-size:15px!important}}` }} />
    </div>
  );
}
