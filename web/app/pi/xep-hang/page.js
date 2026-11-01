// 01/11 (chủ dự án chốt bản vẽ "Pi và Bài tập trên web", mục 1): bảng xếp hạng Pi tuần này — 3 bảng như app, top 50.
// Riêng tư: chỉ Pi đã bật "Khoe Pi lên web" mới có tên + link trang riêng + nút ♥ (mở app vào thẻ Pi đó); Pi khác hiện "Pi ẩn danh".
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import { PiStack } from "@/components/PiStack";
import { rpc } from "@/lib/sb";
import { getSettings, alt, withOg, appLink } from "@/lib/site";
import { breadcrumb, ld } from "@/lib/schema";
import { todayVN, addDays, diffDays } from "@/lib/app/dateVN.js";

export const dynamic = "force-dynamic"; // rpc "no-store", số đổi liên tục

const BOARDS = [["cham", "Chăm chỉ"], ["vandong", "Vận động"], ["hanhtrinh", "Hành trình cân"]];
const HOW = {
  cham: { t: "Cách tính bảng Chăm chỉ", s: ["Hạt kiếm được từ thứ Hai: ăn đúng bữa, uống đủ nước, cân tuần, tập luyện.", "Hạt mua đồ, quà mời bạn, thưởng hạng không tính.", "Bằng điểm thì ai đạt trước xếp trên."] },
  vandong: { t: "Cách tính bảng Vận động", s: ["Phút Vận động thêm và buổi Tập luyện ghi đúng ngày, từ thứ Hai.", "Tối đa 90 phút mỗi ngày.", "Bằng phút thì ai đạt trước xếp trên."] },
  hanhtrinh: { t: "Cách tính Hành trình cân", s: ["% chặng đường tới cân mục tiêu (giảm hoặc tăng cân).", "Chỉ khách tự bật \"Khoe tiến độ cân\" mới có trên bảng; không hiện số kg.", "Tốc độ an toàn: tối đa 1% cân nặng mỗi tuần được tính."] },
};
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
const valueOf = (k, r) => (k === "cham" ? `${fmt(r.value)} Hạt` : k === "vandong" ? `${fmt(r.value)} phút` : `${fmt(r.value)}%`);
const subOf = (k, r) => (k === "hanhtrinh" ? r.sub || `Cấp ${r.level}` : `Cấp ${r.level || 1}${r.streak >= 2 ? ` · ${r.streak} ngày liền` : ""}`);
const ddmm = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export async function generateMetadata({ searchParams }) {
  const s = await getSettings();
  const b = BOARDS.find(([k]) => k === searchParams?.b) || BOARDS[0];
  return withOg({ title: `Bảng xếp hạng Pi tuần này · ${b[1]}`, description: "Pi của khách Fipilot AI thi chăm chỉ mỗi tuần: ăn đúng bữa, uống đủ nước, tập luyện. Top 3 mỗi bảng nhận Hạt sáng thứ Hai.", alternates: alt("/pi/xep-hang") }, s);
}

export default async function PiBoard({ searchParams }) {
  const kind = BOARDS.some(([k]) => k === searchParams?.b) ? searchParams.b : "cham";
  const [s, d] = await Promise.all([getSettings(), rpc("web_pi_board", { p_kind: kind })]);
  const app = (s?.site?.app_url || "https://app.fipilotai.com").replace(/\/$/, "");
  const rows = d?.rows || [];
  const w0 = d?.week || todayVN();
  const left = Math.max(0, diffDays(todayVN(), addDays(w0, 6)));
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Pi", path: "/pi" }, { name: "Bảng xếp hạng", path: "/pi/xep-hang" }];
  const heartUrl = (r) => `${app}/?pi=card&nick=${encodeURIComponent(r.nick)}&ref=web-rank`;
  const top = [rows[1], rows[0], rows[2]];
  const Heart = ({ r }) => (r.web && r.nick
    ? <a className="pht" href={heartUrl(r)} data-testid="prank-heart" aria-label={`Thả tim cho Pi ${r.name}`}>♥ {fmt(r.hearts)}</a>
    : <span className="pht" title="Tim nhận tuần này">♥ {fmt(r.hearts)}</span>);
  const name = (r) => (r.web && r.nick ? <a href={`/pi/${r.nick}`}>{r.name}</a> : r.name);
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs))} />
      <PageHead crumb={crumbs} eye={`Tuần ${ddmm(w0)} – ${ddmm(addDays(w0, 6))}${left ? ` · còn ${left} ngày` : " · ngày cuối"}`} h1="Bảng xếp hạng Pi tuần này"
        sub="Khách Fipilot AI nuôi Pi bằng việc ăn đúng bữa, uống đủ nước, tập luyện. Top 3 mỗi bảng nhận 50 / 30 / 20 Hạt vào sáng thứ Hai." />
      <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 8 }}>
        <nav className="chips" aria-label="Chọn bảng" data-testid="prank-tabs">{BOARDS.map(([k, t]) => <a key={k} className={`chip${k === kind ? " on" : ""}`} href={k === "cham" ? "/pi/xep-hang" : `/pi/xep-hang?b=${k}`} aria-current={k === kind ? "page" : undefined}>{t}</a>)}</nav>
        <div className="pbd">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            {!rows.length && <div className="card pempty" data-testid="prank-empty">{kind === "hanhtrinh" ? "Chưa ai khoe tiến độ cân tuần này." : "Tuần này chưa có Pi nào trên bảng. Bạn là người đầu tiên nha!"}</div>}
            {rows.length > 0 && (
              <div className="card ppod" data-testid="prank-podium">
                {top.map((r, i) => r ? (
                  <div key={r.rank} className={`ppd${r.rank === 1 ? " n1" : ""}`}>
                    <span className="av"><PiStack p={r} size={r.rank === 1 ? 140 : 112} label={`Pi ${r.name}`} lazy={false} style={{ bottom: -8 }} /></span>
                    <span className="md" style={{ background: ["#F59E0B", "#94A3B8", "#C2410C"][r.rank - 1] }}>{r.rank}</span>
                    <b>{name(r)}</b><small>{subOf(kind, r)}</small>
                    <span className={`pval${kind === "hanhtrinh" ? " g" : ""}`}>{valueOf(kind, r)}</span>
                    <Heart r={r} />
                  </div>) : <span key={`e${i}`} />)}
              </div>
            )}
            {rows.length > 3 && (
              <div className="card prl" data-testid="prank-list">
                {rows.slice(3).map((r) => (
                  <div key={r.rank} className={`prr${r.web ? "" : " anon"}`} data-testid="prank-row">
                    <span className="rk">{r.rank}</span>
                    <span className="av"><PiStack p={r} size={46} label={`Pi ${r.name}`} style={{ bottom: -4 }} /></span>
                    <span className="nm"><b>{name(r)}</b><span>{subOf(kind, r)}</span></span>
                    <span className={`pval${kind === "hanhtrinh" ? " g" : ""}`}>{valueOf(kind, r)}</span>
                    <Heart r={r} />
                    <span className="pgo">{r.web && r.nick ? <a className="go" href={`/pi/${r.nick}`}>Xem Pi ›</a> : null}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <aside className="pside">
            <div className="card pcta">
              <b>Đưa Pi của bạn lên bảng</b><p>Cài app miễn phí, nhận Pi ngay. Ăn đúng bữa, uống đủ nước là Pi lớn và có Hạt.</p>
              <a className="btn" href={appLink(s, "web-rank")} data-testid="prank-cta">Nuôi Pi miễn phí</a>
              <span className="av"><PiStack p={{ variant: "nu", color: null, equipped: {} }} size={128} label="Pi" className="pi-stack" style={{ position: "absolute", left: 0, top: 0, transform: "none" }} /></span>
            </div>
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <b style={{ fontSize: 17 }}>{HOW[kind].t}</b>
              {HOW[kind].s.map((t, i) => <div key={i} className="pstp"><i>{i + 1}</i>{t}</div>)}
            </div>
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <b style={{ fontSize: 17 }}>Thả tim, kết bạn với Pi khác</b>
              <p className="mut" style={{ fontSize: 14.5, lineHeight: 1.55, margin: 0 }}>Bấm ♥ hoặc Xem Pi → Kết bạn, app mở đúng thẻ Pi đó. Pi "ẩn danh" là Pi chưa bật Khoe Pi lên web.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
