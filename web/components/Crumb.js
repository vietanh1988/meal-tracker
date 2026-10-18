export default function Crumb({ items, last = false }) {
  // last: phần tử cuối vẫn là link (bài viết chỉ hiện tới chuyên mục, như bản vẽ 137c)
  return (
    <nav aria-label="Breadcrumb" className="crumb">
      {items.map((it, i) => (
        <span key={i}>{i > 0 && <span aria-hidden="true">&nbsp; › &nbsp;</span>}{i === items.length - 1 && !last ? <b aria-current="page">{it.name}</b> : i === items.length - 1 ? <a href={it.path} style={{ color: "#0F172A", fontWeight: 600 }}>{it.name}</a> : <a href={it.path}>{it.name}</a>}</span>
      ))}
    </nav>
  );
}
