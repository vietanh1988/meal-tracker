import Crumb from "./Crumb";
export default function PageHead({ eye, h1, sub, crumb, right }) {
  return (
    <section className="phead">
      <div className="wrap phead-in" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 760 }}>
          {crumb && <Crumb items={crumb} />}
          {eye && <span className="eye">{eye}</span>}
          <h1 className="h1">{h1}</h1>
          {sub && <p className="lead">{sub}</p>}
        </div>
        {right}
      </div>
      <style>{`@media(max-width:720px){.phead-in{flex-direction:column;align-items:stretch!important;gap:20px!important}}`}</style>
    </section>
  );
}
