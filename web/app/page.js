// Trang chủ — bản vẽ 137a/b
import Calc from "@/components/Calc";
import SecHead from "@/components/SecHead";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import { PostList } from "@/components/PostCard";
import { getSettings, appLink } from "@/lib/site";
import { latestPosts } from "@/lib/content";
import { getFood, mainPortion } from "@/lib/foods";
import { orgGraph, websiteGraph, appGraph, faqGraph, ld } from "@/lib/schema";

export const revalidate = 60;
const STEPS = [["1", "Nhập cân nặng, chiều cao", "30 giây là xong."], ["2", "App tự lên thực đơn mỗi ngày", "Món Việt, đúng calo, đổi món 1 chạm."], ["3", "Ăn theo, bấm “Đã ăn”", "App nhắc đúng giờ, tự chỉnh calo theo cân mỗi tuần."]];
// Thẻ tính năng (bản vẽ 137a): giao diện thu nhỏ — số calo lấy từ kho món app (khẩu phần vừa)
const MENU_ROWS = [["phở bò", "Sáng", "/img/bowl-1.jpg"], ["cơm gà", "Trưa", "/img/bowl-2.jpg"], ["bún chả", "Tối", "/img/bowl-3.jpg"]];
const SWAP = ["phở bò", "bún bò huế", "bánh mì trứng"];
function FoodRow({ img, name, kcal, extra }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, background: "#F8FAFD", border: "1px solid #EEF2F7" }}><img className="th" src={img} alt="" width={40} height={40} loading="lazy" style={{ width: 40, height: 40 }} /><span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}><b style={{ fontSize: 14.5 }}>{name}</b><span style={{ fontSize: 13, color: "#64748B" }}>{kcal}</span></span>{extra}</div>;
}
const Chk = ({ t }) => <span style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, lineHeight: 1.45 }}><span className="chk">✓</span>{t}</span>;
const FAQ = [{ q: "Ăn phở, bún có giảm cân được không?", a: "Được. Quan trọng là tổng calo cả ngày — app tính sẵn khẩu phần để bạn vẫn ăn món quen." }, { q: "Có phải cài app từ CH Play / App Store không?", a: "Không cần. Mở app.fipilotai.com trên điện thoại rồi bấm “Thêm vào màn hình chính” là dùng như app." }, { q: "Tôi không tập gym thì sao?", a: "Vẫn dùng được. App tính calo theo mức vận động bạn chọn, kể cả ít vận động." }, { q: "App có miễn phí không?", a: "Có gói Miễn phí với thực đơn tự lên mỗi ngày. Premium thêm chụp ảnh tính calo và hỏi AI, dùng thử 7 ngày." }];

export default async function Home() {
  const s = await getSettings();
  const posts = await latestPosts({ limit: 3 });
  const pr = s.pricing || {};
  const pick = async (k) => { const fd = await getFood(k); const p = mainPortion(fd); return fd && p ? { name: fd.name, cal: p.cal, por: p.name } : null; };
  const menu = (await Promise.all(MENU_ROWS.map(async ([k, meal, img]) => ({ f: await pick(k), meal, img })))).filter((x) => x.f);
  const sw = (await Promise.all(SWAP.map(pick))).filter(Boolean);
  const spark = <svg viewBox="0 0 200 60" width="100%" height="60" aria-hidden="true"><path d="M4 10 L36 16 L70 22 L104 30 L140 40 L196 50 L196 60 L4 60Z" fill="rgba(22,163,74,.08)" /><path d="M4 10 L36 16 L70 22 L104 30 L140 40 L196 50" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />{[[4, 10], [36, 16], [70, 22], [104, 30], [140, 40], [196, 50]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" fill="#fff" stroke="#16A34A" strokeWidth="2" />)}</svg>;
  const FEATS = [
    ["Thực đơn tự lên mỗi ngày", "Sáng phở, trưa cơm gà, tối bún chả — đúng calo cho bạn.", <>{menu.map(({ f, meal, img }) => <FoodRow key={f.name} img={img} name={f.name} kcal={`${meal} · ${f.por} · ${f.cal} kcal`} extra={<span style={{ color: "#94A3B8" }}>›</span>} />)}</>],
    ["Không thích món nào? Đổi 1 chạm", "Gợi ý món giữ bữa gần bằng calo.", sw.length === 3 ? <><FoodRow img="/img/bowl-1.jpg" name={sw[0].name} kcal={`${sw[0].cal} kcal`} /><span style={{ textAlign: "center", color: "#0062F0", fontSize: 13, fontWeight: 700 }}>⇅ đổi sang</span>{sw.slice(1).map((x, i) => { const d = x.cal - sw[0].cal; return <FoodRow key={x.name} img={i ? "/img/bowl-3.jpg" : "/img/bowl-2.jpg"} name={x.name} kcal={`${x.cal} kcal`} extra={<span className="pill" style={{ height: 22, ...(d <= 0 ? { background: "#DCFCE7", color: "#15803D" } : {}) }}>{d > 0 ? "+" : "−"}{Math.abs(d)}</span>} />; })}</> : null],
    ["Thấy rõ kết quả mỗi tháng", "Kg đã giảm, ngày ghi bữa, so tháng trước.", <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span className="mut" style={{ fontSize: 13 }}>Ví dụ: tháng 10 của bạn</span><b style={{ fontSize: 30, color: "#16A34A" }}>−2,4 kg</b><Chk t="ghi bữa 24/31 ngày" /><Chk t="chuỗi 9 ngày liên tục" />{spark}</div>],
  ];
  return (
    <main>
      <JsonLd data={ld(orgGraph(s), websiteGraph(s), appGraph(s), faqGraph(FAQ))} />
      <section style={{ background: "linear-gradient(180deg,#EAF1FF 0%,#F3F6FB 100%)", padding: "72px 0 64px" }} className="hero">
        <div className="wrap hero-in" style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div className="hero-l" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
            <span className="pill" style={{ alignSelf: "flex-start" }}>Miễn phí 7 ngày · không cần thẻ</span>
            <h1 className="h1home">Giảm cân bằng<br />món Việt quen thuộc</h1>
            <p className="lead hero-p" style={{ fontSize: 19, maxWidth: 520 }}>Phở, bún, cơm tấm vẫn ăn được. App tự lên thực đơn đúng calo mỗi ngày — bạn chỉ việc ăn theo và bấm “Đã ăn”.</p>
            <div className="hero-btn" style={{ display: "flex", gap: 12, marginTop: 6 }}><a className="btn b1 big" href={appLink(s, "home-hero")}>Dùng thử miễn phí</a><a className="btn b2 big" href="#cach-hoat-dong">Xem cách hoạt động</a></div>
            <span style={{ fontSize: 13.5, color: "#64748B" }}>Không cần cài từ kho ứng dụng · Chạy trên mọi điện thoại</span>
          </div>
          <div className="hero-ph" style={{ position: "relative", width: 430, height: 430, flexShrink: 0 }}>
            <img src="/img/app-menu.png" alt="Màn thực đơn trong ngày của app Fipilot AI" width={175} height={360} style={{ position: "absolute", right: 10, top: 40, width: 175, height: "auto", borderRadius: 26, border: "7px solid #0F172A", transform: "rotate(4deg)", boxShadow: "0 24px 48px rgba(15,23,42,.22)" }} />
            <img src="/img/app-today.png" alt="Màn Hôm nay của app Fipilot AI: calo còn lại trong ngày" width={195} height={400} fetchPriority="high" style={{ position: "absolute", left: 50, top: 0, width: 195, height: "auto", borderRadius: 26, border: "7px solid #0F172A", transform: "rotate(-4deg)", boxShadow: "0 24px 48px rgba(15,23,42,.22)" }} />
          </div>
        </div>
      </section>
      <section className="wrap">
        <div className="card calc-card" style={{ padding: 36, display: "flex", flexDirection: "column", gap: 20, borderRadius: 24, boxShadow: "0 20px 40px rgba(15,23,42,.08)" }}>
          <span className="eye">Tính thử trong 10 giây</span>
          <h2 className="calc-h" style={{ fontSize: 30, lineHeight: 1.25, fontWeight: 700 }}>Bạn cần ăn bao nhiêu để giảm cân?</h2>
          <Calc appUrl={s.site.app_url} />
        </div>
      </section>
      <section className="wrap sec" id="cach-hoat-dong">
        <SecHead eye="Cách hoạt động" title="3 bước, không phải tự tính" sub="Bạn chỉ nhập số đo một lần — phần còn lại app lo." />
        <div className="grid3 g12" style={{ gap: 20 }}>{STEPS.map(([n, t, x]) => <div key={n} className="card step" style={{ display: "flex", gap: 16, padding: 24 }}><span style={{ width: 44, height: 44, borderRadius: 22, background: "linear-gradient(180deg,#1A7CFF,#0062F0)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{n}</span><span style={{ display: "flex", flexDirection: "column", gap: 4 }}><h3 style={{ fontSize: 19 }}>{t}</h3><span className="step-x" style={{ fontSize: 16, color: "#64748B", lineHeight: 1.55 }}>{x}</span></span></div>)}</div>
      </section>
      <section className="wrap sec">
        <SecHead eye="Tính năng" title="3 tính năng giúp bạn giảm cân dễ hơn" />
        <div className="grid3 g12" style={{ gap: 20 }}>{FEATS.map(([t, x, ui]) => <div key={t} className="card feat" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}><span style={{ display: "flex", flexDirection: "column", gap: 6 }}><h3 style={{ fontSize: 20, lineHeight: 1.3 }}>{t}</h3><span className="ui-t" style={{ fontSize: 15.5, color: "#64748B", lineHeight: 1.55 }}>{x}</span></span><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{ui}</div></div>)}</div>
      </section>
      <section className="wrap sec grid2 pf" style={{ gap: 48 }}>
        <div>
          <SecHead eye="Bảng giá" title="Bắt đầu miễn phí" />
          <div className="grid2 plans" style={{ gap: 16 }}>
            {[[pr.free?.name || "Miễn phí", pr.free?.price || "0đ", "", ["Thực đơn tự lên mỗi ngày", "Đổi món, ghi bữa, nhắc giờ", "Tổng kết tháng"], "Bắt đầu miễn phí", false], [pr.premium?.name || "Premium", pr.premium?.price || "99.000đ", pr.premium?.unit || " / tháng", ["Mọi thứ của gói Miễn phí", "Chụp ảnh tính calo", "Hỏi AI về ăn uống", "AI lên thực đơn theo ý"], "Dùng thử 7 ngày", true]].map(([n, p, u, l, c, hi]) => (
              <div key={n} className="card plan" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, position: "relative", ...(hi ? { border: "1.5px solid #0062F0" } : {}) }}>
                {hi && <span className="pill" style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#0062F0", color: "#fff" }}>Phổ biến</span>}
                <span style={{ fontSize: 15, fontWeight: 800, color: "#334155" }}>{n}</span>
                <span><b className="plan-p" style={{ fontSize: 32 }}>{p}</b><span className="mut" style={{ fontSize: 14 }}>{u}</span></span>
                {l.map((x) => <span key={x} style={{ display: "flex", gap: 8, fontSize: 14.5, lineHeight: 1.45 }}><span className="chk">✓</span>{x}</span>)}
                <a className={`btn ${hi ? "b1" : "b2"}`} href={appLink(s, hi ? "home-premium" : "home-free")} style={{ marginTop: 6 }}>{c}</a>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SecHead eye="Hỏi đáp" title="Câu hỏi thường gặp" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{FAQ.map((x, i) => <details key={x.q} className="faq" open={i === 0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>
        </div>
      </section>
      {posts.length > 0 && (
        <section className="wrap sec">
          <SecHead eye="Blog" title="Bài viết mới" right={<a href="/bai-viet" style={{ fontSize: 15, fontWeight: 700, color: "#0062F0", whiteSpace: "nowrap" }}>Xem tất cả →</a>} />
          <PostList posts={posts} gap={20} />
        </section>
      )}
      <Sticky s={s} ref_="home-sticky" />
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.hero{padding:40px 0!important}.hero-in{flex-direction:column;gap:18px!important}.hero-btn{flex-direction:column}.hero-btn .btn{height:50px!important}.hero-ph{width:100%!important;height:390px!important}.hero-ph img:first-child{right:8%!important;width:150px!important}.hero-ph img:last-child{left:8%!important;width:170px!important}.hero-l{gap:14px!important}.hero-p{font-size:17px!important}.calc-card{padding:20px!important;gap:16px!important}.g12{gap:12px!important}.step{padding:20px!important}.step h3{font-size:17px!important}.step-x{font-size:15px!important}.feat .ui-t{font-size:15px!important}.pf{gap:64px!important}.plans{gap:20px!important}.plan{padding:20px!important}.plan-p{font-size:26px!important}details.faq{padding:16px!important}details.faq summary{font-size:15.5px!important}details.faq p{font-size:15px!important;line-height:1.6!important;margin-top:8px!important}.calc-h{font-size:24px!important}.feat{padding:20px!important}.feat h3{font-size:18px!important}.calc .calc-in{grid-template-columns:1fr 1fr!important}}` }} />
    </main>
  );
}
