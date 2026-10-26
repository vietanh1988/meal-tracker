// 26/10: trang giới thiệu kiểu landing (mẫu trang "landing"). Khối lp_* soạn ở Quản trị › Trang › Sửa (nhóm "TRANG GIỚI THIỆU").
import { clean, safeUrl } from "@/lib/sanitize";
import { imgAttrs } from "@/lib/img";
import { tidy } from "@/lib/typo";
import { emLines, steps, rows, isLp } from "@/lib/landing";
import Blocks from "./Blocks";

const H = ({ html, as: T = "p", ...r }) => (html ? <T {...r} dangerouslySetInnerHTML={{ __html: clean(tidy(html)) }} /> : null);
const Coin = () => <i className="cn" aria-hidden="true" />;
const u = (x) => safeUrl(x || "", "");
function Title({ s, as: T = "h2", className }) {
  const L = emLines(s);
  return <T className={className}>{L.map((line, k) => <span key={k}>{k > 0 && <br />}{line.map((x, j) => (x.em ? <em key={j}>{x.t}</em> : <span key={j}>{x.t}</span>))}</span>)}</T>;
}
const Img = ({ src, alt, className, style, sizes }) => (u(src) ? <img {...imgAttrs(u(src), sizes || "(max-width: 900px) 100vw, 560px")} alt={alt || ""} className={className} style={style} loading="lazy" decoding="async" /> : null);
const Btn = ({ label, url, kind = "b1" }) => (label && url ? <a className={`btn ${kind} lp-btn`} href={u(url)}>{label}</a> : null);
const Shots = ({ list, alt }) => rows(list, "url").map((x, k) => <Img key={k} src={x.url || x} alt={x.alt || alt} className="shot" sizes="240px" />);

export function LpBlock({ b, all, first }) {
  switch (b.type) {
    case "lp_hero": {
      const imgs = rows(b.images, "url");
      const nav = b.nav ? steps(all) : [];
      return (
        <section className="lp-hero" data-testid="lp-hero"><div className="wrap">
          <div>
            {b.eye && <span className="lp-eye">{b.eye}</span>}
            <Title s={b.title} as="h1" className="lp-h1" />
            <H html={b.sub} className="lp-sub" />
            {(b.btn1_label || b.btn2_label) && <div className="lp-btns"><Btn label={b.btn1_label} url={b.btn1_url} /><Btn label={b.btn2_label} url={b.btn2_url} kind="b2" /></div>}
            {nav.length > 0 && <nav className="g-nav" aria-label="Các bước">{nav.map((x) => <a key={x.id} href={`#${x.id}`}><i>{x.n}</i>{x.short}</a>)}</nav>}
          </div>
          {imgs.length > 1 ? <div className="lp-art lp-art2"><Shots list={imgs.slice(0, 2)} alt={b.title} /></div>
            : imgs.length === 1 ? <div className="lp-art"><img src={u(imgs[0].url)} alt={imgs[0].alt || ""} fetchPriority={first ? "high" : undefined} />
              {rows(b.chips).slice(0, 3).map((c, k) => <span key={k} className={`lp-chip c${k + 1}`}>{c.icon === "coin" ? <Coin /> : c.icon ? <span>{c.icon}</span> : null}<span>{c.title}{c.sub && <small>{c.sub}</small>}</span></span>)}</div> : null}
        </div></section>
      );
    }
    case "lp_head": return <div className="h-head lp-head" id={b.anchor || undefined}>{b.eye && <span className="eye">{b.eye}</span>}<Title s={b.title} className="h2" />{b.sub && <p className="h-sub">{b.sub}</p>}</div>;
    case "lp_cards": return (
      <div className="lp-cards">
        <div className="lp-steps">{rows(b.items).map((x, k) => <div key={k} className="lp-step"><span className="num">{k + 1}</span><b>{x.title}</b>{x.text && <span>{x.text}</span>}{x.badge && <span className="pts"><Coin />{x.badge}</span>}</div>)}</div>
        <H html={b.note} className="lp-cap" />
      </div>
    );
    case "lp_feature": {
      const tiles = rows(b.tiles);
      const imgs = rows(b.images, "url");
      return (
        <div className={`lp-row${b.rev ? " rev" : ""}`}>
          <div className={`lp-media${tiles.length ? " lp-moods" : ""}`}>
            {tiles.length ? tiles.map((x, k) => <div key={k} className="lp-mood"><Img src={x.img} alt={x.title} sizes="120px" /><b>{x.title}</b>{x.sub && <span>{x.sub}</span>}</div>)
              : b.phone ? <Shots list={imgs} alt={b.title} /> : imgs.map((x, k) => <Img key={k} src={x.url} alt={x.alt || b.title} style={{ width: `${Math.min(100, Math.max(30, +b.width || 100))}%` }} />)}
          </div>
          <div className="lp-txt">{b.eye && <span className="eye">{b.eye}</span>}<Title s={b.title} as="h3" /><H html={b.text} />{rows(b.bullets, "text").length > 0 && <ul className="lp-ok">{rows(b.bullets, "text").map((x, k) => <H key={k} as="li" html={`<span>${x.text ?? x}</span>`} />)}</ul>}</div>
        </div>
      );
    }
    case "lp_tiles": return <div className={`lp-troph${+b.cols === 4 ? " c4" : ""}`}>{rows(b.items).map((x, k) => <div key={k} className="lp-tr"><Img src={x.img} alt={x.title} sizes="64px" /><b>{x.title}</b>{x.sub && <span>{x.sub}</span>}</div>)}</div>;
    case "lp_step": {
      const st = steps(all)[all.filter((y) => y?.type === "lp_step").indexOf(b)] || { n: 1, id: "buoc-1" };
      return (
        <section className={`g-step${st.n % 2 === 0 ? " rev" : ""}`} id={st.id} data-testid="lp-step">
          <div className="lp-txt"><span className="g-n"><i>{st.n}</i>Bước {st.n}</span><h2>{b.title}</h2><H html={b.text} />
            {rows(b.ways).length > 0 && <div className="g-ways">{rows(b.ways).map((x, k) => <div key={k} className="g-way"><i>{x.icon || k + 1}</i><span><b>{x.title}</b>{x.text && <><br /><H as="span" html={x.text} /></>}</span></div>)}</div>}
            <H as="div" html={b.tip} className="g-tip" />
            {b.btn_label && <div className="lp-btns"><Btn label={b.btn_label} url={b.btn_url} kind="b2" /></div>}
          </div>
          <div className="lp-media"><Shots list={b.images} alt={b.title} /></div>
        </section>
      );
    }
    default: return null;
  }
}

// Cả trang: khối hero chiếm hết bề ngang; khối khác trong .wrap; khối thường (đoạn, hỏi đáp, video…) dùng Blocks
export default function Landing({ blocks, s, toc, slug }) {
  return (
    <div className="lp">
      {blocks.map((b, i) => {
        if (b?.type === "lp_hero") return <LpBlock key={i} b={b} all={blocks} first={i === 0} />;
        if (isLp(b)) return <div key={i} className={`wrap lp-${b.type.slice(3)}-w`}><LpBlock b={b} all={blocks} /></div>;
        if (b?.type === "video" && !b.vertical && u(b.url)) return <div key={i} className="wrap" id="video"><div className="lp-video"><video src={u(b.url)} poster={u(b.poster) || undefined} controls preload="none" playsInline title={b.title || undefined} /></div>{b.caption && <p className="lp-cap">{b.caption}</p>}</div>;
        return <div key={i} className="wrap lp-std"><Blocks blocks={[b]} s={s} toc={toc} slug={slug} /></div>;
      })}
      <div style={{ height: 80 }} />
    </div>
  );
}
