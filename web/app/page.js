// Trang chủ — bản vẽ 19/10 (dựng lại theo ảnh ChatGPT chủ dự án gửi; kiểu ở globals.css mục "Trang chủ")
import { Fragment } from "react";
import Calc from "@/components/Calc";
import { HOME_HERO, HOME_SECTIONS, HOME_FAQ, HOME_TEXT } from "@/lib/home";
import { fillTrial, vnd, premiumPoints } from "@/lib/plans";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import Phone from "@/components/Phone";
import { imgAttrs } from "@/lib/img";
import { getSettings, appLink, alt, withOg } from "@/lib/site";
import { latestPosts, catOf, fmtDate, readMin } from "@/lib/content";
import { getFood, mainPortion } from "@/lib/foods";
import { orgGraph, websiteGraph, appGraph, faqGraph, ld, schemaOn } from "@/lib/schema";

export const revalidate = 60;
export async function generateMetadata() {
  const s = await getSettings();
  return withOg({ title: { absolute: `${s.site.name} — ${s.site.tagline}, thực đơn đúng calo` }, description: "Giảm cân bằng món Việt quen thuộc. App tự lên thực đơn đúng calo mỗi ngày — phở, bún, cơm tấm vẫn ăn được.", alternates: alt("/") }, s);
}
// Bản vẽ trang chủ 19/10 (theo ảnh ChatGPT, giữ decor): ảnh món nhìn từ trên (public/img/home), số calo lấy từ kho món app
const DISH = { "phở bò": "pho-bo", "cơm gà": "com-ga", "bún chả": "bun-cha", "bún bò huế": "bun-bo-hue", "bánh mì trứng": "banh-mi-trung", "sữa chua": "sua-chua" };
const dimg = (k) => `/img/home/${DISH[k] || "pho-bo"}.webp`;
const MENU_ROWS = [["phở bò", "Bữa sáng"], ["cơm gà", "Bữa trưa"], ["bún chả", "Bữa tối"]];
const SWAPS = [["phở bò", "bún bò huế"], ["cơm gà", "bánh mì trứng"]];
const STEP_IC = [["b-can", "#EAF2FF"], ["b-thuc-don", "#FFF6EC"], ["b-xong", "#E9F9EF"]];
// Tiêu đề banner: *chữ* = tô xanh (VD "Giảm cân bằng\n*món Việt* quen thuộc")
const hlTitle = (t) => String(t || "").split("\n").map((line, i) => <span key={i}>{i > 0 && <br />}{line.split(/(\*[^*]+\*)/).map((x, j) => (/^\*[^*]+\*$/.test(x) ? <span key={j} className="hl">{x.slice(1, -1)}</span> : x))}</span>);
export default async function Home() {
  const s = await getSettings();
  const posts = await latestPosts({ limit: 3 });
  const pr = s.pricing || {};
  const pick = async (k) => { const fd = await getFood(k); const p = mainPortion(fd); return fd && p ? { name: fd.name, cal: p.cal, por: p.name } : null; };
  const menu = (await Promise.all(MENU_ROWS.map(async ([k, meal]) => ({ f: await pick(k), meal, img: dimg(k) })))).filter((x) => x.f);
  const sw = (await Promise.all(SWAPS.map(async (pr2) => (await Promise.all(pr2.map(async (k) => ({ f: await pick(k), img: dimg(k) })))).filter((x) => x.f)))).filter((x) => x.length === 2);
  const spark = <svg viewBox="0 0 200 40" width="100%" height="40" aria-hidden="true"><path d="M4 8 L40 14 L76 18 L112 24 L150 30 L196 34" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />{[[4, 8], [40, 14], [76, 18], [112, 24], [150, 30], [196, 34]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.5" fill="#fff" stroke="#16A34A" strokeWidth="2" />)}</svg>;
  // Trang chủ sửa được ở Quản trị › Trang › Sửa trang tại chỗ (web_settings.page_home): chữ / ảnh / nút banner, ẩn hiện + thứ tự khối
  const FAQ = (s.page_home?.faq?.length ? s.page_home.faq : HOME_FAQ).filter((x) => x?.q && x?.a).map((x) => ({ q: fillTrial(x.q, s.plan), a: fillTrial(x.a, s.plan) }));
  const H = Object.fromEntries(Object.entries({ ...HOME_HERO, ...(s.page_home?.hero || {}) }).map(([k, v]) => [k, typeof v === "string" ? fillTrial(v, s.plan) : v]));
  const order = (s.page_home?.sections?.length ? s.page_home.sections : HOME_SECTIONS.map((id) => ({ id, on: true }))).filter((x) => x.on !== false && HOME_SECTIONS.includes(x.id)).map((x) => x.id);
  for (const id of HOME_SECTIONS) if (!(s.page_home?.sections || []).some((x) => x.id === id) && s.page_home?.sections?.length) order.push(id); // khối mới thêm sau: mặc định hiện
  const P = s.plan || {};
  const T = Object.fromEntries(Object.entries({ ...HOME_TEXT, ...Object.fromEntries(Object.entries(s.page_home?.text || {}).filter(([, v]) => String(v || "").trim())) }).map(([k, v]) => [k, fillTrial(v, s.plan)])); // ô để trống = chữ mặc định
  const SEC = {
    calc: <Fragment key="calc">
      <section className="wrap h-calcw">
        <div className="h-calc">
          <div className="h-calc-l"><span className="eye">{T.calc_eye}</span><h2 className="h-h2s">{T.calc_title}</h2><Calc appUrl={s.site.app_url} /></div>
          <span className="h-calc-ic" aria-hidden="true"><svg viewBox="0 0 64 64"><defs><linearGradient id="hcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7CB6FF" /><stop offset="1" stopColor="#1A6BFF" /></linearGradient></defs><rect x="10" y="6" width="44" height="54" rx="10" fill="url(#hcg)" /><rect x="16" y="12" width="32" height="12" rx="4" fill="#E8F2FF" />{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={16 + c * 11.5} y={29 + r * 9.5} width="9" height="7" rx="2.5" fill={c === 2 && r === 2 ? "#FFB020" : "#FFFFFF"} fillOpacity={c === 2 && r === 2 ? 1 : 0.85} />))}</svg></span>
        </div>
      </section>
    </Fragment>,
    steps: <Fragment key="steps">
      <section className="wrap h-sec" id="cach-hoat-dong">
        <div className="h-head"><span className="eye">{T.steps_eye}</span><h2 className="h2">{T.steps_title}</h2>{T.steps_sub && <p className="h-sub">{T.steps_sub}</p>}</div>
        <div className="h-steps">{[1, 2, 3].map((n) => [String(n), T[`step${n}_t`], T[`step${n}_x`]]).map(([n, t, x], i) => <div key={n} className="h-step"><span className="h-num">{n}</span><span className="h-sic" style={{ background: STEP_IC[i][1] }}><img src={`/img/home/${STEP_IC[i][0]}.webp`} alt={`Bước ${n}: ${t}`} width={56} height={56} loading="lazy" /></span><span className="h-stx"><b>{t}</b><span>{x}</span></span>{i < 2 && <span className="h-arr" aria-hidden="true">›</span>}</div>)}</div>
      </section>
    </Fragment>,
    feats: <Fragment key="feats">
      <section className="wrap h-sec">
        <img className="dc lf5" src="/img/home/canh-hung.webp" alt="" aria-hidden="true" width={120} height={84} loading="lazy" /><img className="dc lf6" src="/img/home/ot.webp" alt="" aria-hidden="true" width={40} height={90} loading="lazy" />
        <div className="h-head"><span className="eye">{T.feats_eye}</span><h2 className="h2">{T.feats_title}</h2></div>
        <div className="h-feats">
          <div className="h-feat f1"><h3>{T.feat1_t}</h3><span className="fsub">{T.feat1_x}</span>
            <div className="f1-ui"><div className="f1-list">{menu.map(({ f, meal, img }) => <div key={f.name} className="frow"><img src={img} alt={`${f.name} – ${meal}, ${f.por} ${f.cal} kcal`} width={46} height={46} loading="lazy" /><span><b>{f.name}</b><i>{meal} · {f.por}</i></span><em>{f.cal} kcal</em></div>)}</div><span className="f1-ph" aria-hidden="true"><span /></span></div></div>
          <div className="h-feat f2"><h3>{T.feat2_t}</h3><span className="fsub">{T.feat2_x}</span>
            <div className="f2-ui">{sw.map((pr2, i) => <div key={i} className="f2-row">{pr2.map(({ f, img }, j) => [<div key={f.name} className="f2-c"><img src={img} alt={`${f.name} ${f.cal} kcal`} width={46} height={46} loading="lazy" /><span><b>{f.name}</b><i>{f.cal} kcal</i></span></div>, j === 0 ? <span key="x" className="f2-x" aria-label="đổi sang">⇄</span> : null])}</div>)}{T.feat2_tip && <span className="f2-tip">{T.feat2_tip}</span>}</div></div>
          <div className="h-feat f3"><h3>{T.feat3_t}</h3><span className="fsub">{T.feat3_x}</span>
            <div className="f3-ui"><span className="f3-ph" aria-hidden="true"><span className="f3-bars">{[34, 52, 40, 70, 58, 86, 64].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</span></span>
              <div className="f3-card"><span className="mut" style={{ fontSize: 13 }}>Ví dụ: tháng 10 của bạn</span><b className="f3-kg">−2,4 kg</b><span className="ck">✓ Ghi bữa 24/31 ngày</span><span className="ck">✓ Chuỗi 9 ngày liên tục</span>{spark}</div></div></div>
        </div>
      </section>
    </Fragment>,
    pricing: <Fragment key="pricing">
      <section className="wrap h-sec h-price">
        <div>
          <div className="h-head"><span className="eye">{T.price_eye}</span><h2 className="h2">{T.price_title}</h2></div>
          <div className="h-plans">
            <div className="h-plan"><span className="pn">{pr.free?.name || "Miễn phí"}</span><b className="pp">0đ</b>{["Thực đơn tự lên mỗi ngày", "Đổi món, ghi bữa, nhắc giờ", "Tổng kết tháng"].map((x) => <span key={x} className="ck2"><i>✓</i>{x}</span>)}<a className="btn b2" href={appLink(s, "home-free")} style={{ marginTop: "auto" }}>Bắt đầu miễn phí</a></div>
            <div className="h-plan hi"><span className="ptag">Phổ biến</span><span className="pn">{pr.premium?.name || "Premium"}</span><b className="pp">{P.month ? vnd(P.month.per) : "Liên hệ"}{P.month && <small> / tháng</small>}</b>{premiumPoints(P).filter((x) => !/^Chỉ từ/.test(x)).map((x) => <span key={x} className="ck2"><i>✓</i>{x}</span>)}{P.cheapest && P.cheapest.m > 1 && <span className="psave">Chỉ từ {vnd(P.cheapest.per)} / tháng khi mua {P.cheapest.m} tháng</span>}<a className="btn b1" href={appLink(s, "home-premium")} style={{ marginTop: "auto" }}>{P.trial ? `Dùng thử ${P.trial} ngày` : "Nâng cấp Premium"}</a></div>
          </div>
        </div>
        <div>
          <div className="h-head"><span className="eye">{T.faq_eye}</span><h2 className="h2">{T.faq_title}</h2></div>
          <div className="h-faq">{FAQ.map((x, i) => <details key={x.q} className="faq" open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>
        </div>
      </section>
    </Fragment>,
    posts: <Fragment key="posts">
      {posts.length > 0 && (
        <section className="wrap h-sec">
          <div className="h-head h-row"><div><span className="eye">{T.posts_eye}</span><h2 className="h2">{T.posts_title}</h2></div><a className="h-all" href="/bai-viet">{T.posts_all}</a></div>
          <div className="h-posts">{posts.map((p) => { const c = catOf(p); return (
            <a key={p.id} className="h-post" href={`/${p.slug}`}>
              <span className="h-pimg">{p.cover_url ? <img {...imgAttrs(p.cover_url, "(max-width: 720px) 96px, 420px")} alt={p.cover_alt || ""} loading="lazy" /> : <span className="h-pnone" />}{c && <span className="h-pcat">{c.name}</span>}</span>
              <span className="h-pbody">{c && <span className="h-pcat2">{c.name}</span>}<b>{p.title}</b><span className="mut">{fmtDate(p.published_at)} · {readMin(p.word_count)} phút đọc</span></span>
            </a>); })}</div>
        </section>
      )}
    </Fragment>,
  };
  return (
    <main className="home">
      <JsonLd data={ld(orgGraph(s), websiteGraph(s), schemaOn(s, "home") ? appGraph(s) : null, faqGraph(FAQ, s))} />
      <section className={`h-hero${order[0] === "calc" ? " h-hero-c" : ""}`} style={{ "--hbg": `url(${H.bg || "/img/home/hero-bg.webp"})`, "--hbgm": `url(${H.bg_m || H.bg || "/img/home/hero-bg-900.webp"})` }}>
        <span className="h-bg" aria-hidden="true" />
        <img className="dc lf1" src="/img/home/la-hung.webp" alt="" aria-hidden="true" width={120} height={98} /><img className="dc lf2" src="/img/home/chanh-xanh.webp" alt="" aria-hidden="true" width={92} height={92} />
        <div className="wrap h-in">
          <div className="h-l">
            {H.badge && <span className="pill" style={{ alignSelf: "flex-start" }}>{H.badge}</span>}
            <h1 className="h1home">{hlTitle(H.title)}</h1>
            <p className="lead h-p">{H.sub}</p>
            <div className="h-btn"><a className="btn b1 big" href={H.btn1_url || appLink(s, "home-hero")}>{H.btn1}</a>{H.btn2 && <a className="btn b2 big" href={H.btn2_url || "#cach-hoat-dong"}>{H.btn2}</a>}</div>
            {H.note && <span className="h-note">{H.note}</span>}
          </div>
          <div className="hero-ph2">
            <Phone className="ph-back" src={H.img2 || "/img/app-menu.webp"} alt={H.img2_alt} />
            <Phone className="ph-front" dark src={H.img1 || "/img/app-today.webp"} mSrc={H.img1_m} alt={H.img1_alt} priority />
          </div>
        </div>
      </section>
      {order.map((id) => SEC[id])}
      <Sticky s={s} ref_="home-sticky" />
      <span className="h-end" />
    </main>
  );
}
