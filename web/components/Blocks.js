// Hiển thị khối nội dung bài (đã qua lib/blocks.prepare)
import { clean } from "@/lib/sanitize";
import { appLink } from "@/lib/site";
import CaloBox from "./CaloBox";

const H = ({ html, as: T = "p", ...r }) => <T {...r} dangerouslySetInnerHTML={{ __html: clean(html) }} />;

export default function Blocks({ blocks, s, toc }) {
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        switch (b?.type) {
          case "p": return <H key={i} html={b.html} />;
          case "h": { const T = `h${Math.min(4, Math.max(2, b.level || 2))}`; return <H key={i} as={T} id={b.id} html={b.text} />; }
          case "list": { const T = b.ordered ? "ol" : "ul"; return <T key={i}>{(b.items || []).map((x, k) => <H key={k} as="li" html={x} />)}</T>; }
          case "quote": return <blockquote key={i}><H html={b.html} /></blockquote>;
          case "tip": return <div key={i} className="tip"><H as="div" html={b.html} /></div>;
          case "img": return b.url ? <figure key={i}><img src={b.url} alt={b.alt || ""} width={b.width} height={b.height} loading={i < 3 ? "eager" : "lazy"} />{b.caption && <figcaption>{b.caption}</figcaption>}</figure> : null;
          case "gallery": return <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>{(b.images || []).map((im, k) => <img key={k} src={im.url} alt={im.alt || ""} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12 }} />)}</div>;
          case "youtube": return /^[\w-]{6,20}$/.test(b.id || "") ? <div key={i} className="yt"><iframe src={`https://www.youtube-nocookie.com/embed/${b.id}`} title={b.title || "Video"} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen /></div> : null;
          case "table": return (
            <div key={i} className="card" style={{ overflowX: "auto", padding: 0 }}>
              <table><thead><tr>{(b.head || []).map((h, k) => <th key={k}>{h}</th>)}</tr></thead><tbody>{(b.rows || []).map((r, k) => <tr key={k}>{r.map((c, j) => <H key={j} as="td" html={c} />)}</tr>)}</tbody></table>
            </div>
          );
          case "calo": return <CaloBox key={i} fd={b._food} por={b._portion} />;
          case "calo_table": return (
            <div key={i} className="card" style={{ overflowX: "auto", padding: 0 }}>
              <table><thead><tr><th>Món</th><th>Khẩu phần</th><th style={{ textAlign: "right" }}>Calo (kcal)</th><th style={{ textAlign: "right" }}>Đạm (g)</th></tr></thead>
                <tbody>{(b._rows || []).map(({ fd, por }) => <tr key={fd.key}><td><a href={`/calo/${fd.slug}`}>{fd.name}</a></td><td>{por ? `${por.name} ${por.gram} g` : "100 g"}</td><td style={{ textAlign: "right" }}>{por ? por.cal : fd.per100.cal}</td><td style={{ textAlign: "right" }}>{String(por ? por.p : fd.per100.p).replace(".", ",")}</td></tr>)}</tbody></table>
            </div>
          );
          case "faq": return <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>{b.title && <h2 id={b.id || "hoi-dap"}>{b.title}</h2>}{(b.items || []).map((x, k) => <details key={k} className="faq" open={k === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>;
          case "app": return (
            <aside key={i} className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", background: "linear-gradient(90deg,#EEF4FF,#F8FBFF)", borderColor: "#DCE7FF" }}>
              <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 17, color: "#0B3B91" }}>{b.title || "Muốn app lên sẵn thực đơn đúng calo?"}</b><span style={{ fontSize: 14.5, color: "#475569", lineHeight: 1.5 }}>{b.text || "Fipilot AI tự lên thực đơn món Việt đúng calo cho bạn — miễn phí."}</span></span>
              <a className="btn b1" href={b.url || appLink(s, "post-box")}>{b.button || "Mở app"}</a>
            </aside>
          );
          case "button": return b.url ? <div key={i} style={{ textAlign: b.align || "left" }}><a className={`btn ${b.style === "outline" ? "b2" : "b1"}`} href={b.url}>{b.label || "Xem thêm"}</a></div> : null;
          case "hr": return <hr key={i} style={{ border: 0, borderTop: "1px solid #E6ECF5", margin: "8px 0" }} />;
          case "toc": return toc?.length ? <nav key={i} aria-label="Mục lục" className="card" style={{ padding: 18 }}><b style={{ fontSize: 16 }}>Mục lục</b><ol style={{ marginTop: 10 }}>{toc.map((t) => <li key={t.id} style={{ fontSize: 15.5, marginLeft: t.level === 3 ? 16 : 0 }}><a href={`#${t.id}`}>{t.text}</a></li>)}</ol></nav> : null;
          case "html": return <H key={i} as="div" html={b.html} />;
          default: return null;
        }
      })}
    </div>
  );
}
