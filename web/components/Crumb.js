export default function Crumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="crumb">
      {items.map((it, i) => (
        <span key={i}>{i > 0 && <span aria-hidden="true">&nbsp; › &nbsp;</span>}{i === items.length - 1 ? <b aria-current="page">{it.name}</b> : <a href={it.path}>{it.name}</a>}</span>
      ))}
    </nav>
  );
}
