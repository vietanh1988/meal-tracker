// Quản trị PC › WEB & BÀI VIẾT › Thống kê web (bản vẽ 138u · phương án 1: web tự đếm).
// Số liệu: bảng web_stats_daily (gộp theo ngày giờ VN × đường dẫn × nguồn khách). Từ khoá Google: chỉ có trong Search Console.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { todayVN, addDays, dateList } from "../../lib/dateVN";
import { Btn, Pill, Card, ErrorBox, Loading, headRow, bodyRow, cell, vnInt } from "../pcUI";
import { BLUE } from "./webUI";
import { FOODS } from "./BlockEdit";
import { readAll } from "./webApi";

const must = ({ data, error }) => { if (error) throw error; return data; };
const H = ({ t, r }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>{t}</b><span style={{ marginLeft: "auto" }}>{r}</span></div>;
const Stat = ({ n, l, s, c = PC.t1 }) => <Card style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{l}</span><b style={{ fontSize: 24, fontWeight: 900, color: c }}>{n}</b>{s && <span style={{ fontSize: 11.5, color: PC.t4 }}>{s}</span>}</Card>;
const pct = (a, b) => (b ? `${String(Math.round((a / b) * 1000) / 10).replace(".", ",")}%` : "—");
const SRC = [["google", "Google", "#0062F0"], ["facebook", "Facebook", "#1877F2"], ["direct", "Gõ thẳng / lưu sẵn", "#64748B"], ["zalo", "Zalo", "#0068FF"], ["other", "Khác", "#CBD5E1"]];
const STATIC = { "/": "Trang chủ", "/bai-viet": "Tất cả bài viết", "/bang-calo": "Bảng calo món", "/tinh-calo": "Tính calo", "/bang-gia": "Bảng giá", "/gioi-thieu": "Giới thiệu", "/lien-he": "Liên hệ", "/tim-kiem": "Tìm kiếm", "/cai-app": "Cài app lên điện thoại" };
const RANGES = [[7, "7 ngày qua"], [30, "30 ngày qua"], [90, "90 ngày qua"]];

// Lượt xem 30 ngày theo đường dẫn (dùng cho Trang calo món); null = chưa có bảng thống kê
export async function views30(prefix = "/calo/") {
  let data; try { data = await readAll(() => supabase.from("web_stats_daily").select("path,views").gte("day", addDays(todayVN(), -29)).like("path", `${prefix}%`).order("day").order("path").order("src")); } catch (e) { return null; }
  const m = {}; for (const r of data || []) m[r.path] = (m[r.path] || 0) + r.views; return m;
}

export function PcWebStats({ top }) {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState(null);
  const [prev, setPrev] = useState(null);
  const [titles, setTitles] = useState({});
  const [err, setErr] = useState("");
  const [noTable, setNoTable] = useState(false);
  const today = todayVN(); const from = addDays(today, -(days - 1)); const pfrom = addDays(from, -days);

  useEffect(() => { (async () => {
    setRows(null);
    try {
      const r = await readAll(() => supabase.from("web_stats_daily").select("day,path,src,views,visitors,app").gte("day", pfrom).order("day").order("path").order("src")).then((data) => ({ data }), (error) => ({ error }));
      if (r.error) { if (/web_stats_daily|relation|schema cache/i.test(r.error.message || "")) { setNoTable(true); setRows([]); setPrev([]); return; } throw r.error; }
      setRows(r.data.filter((x) => x.day >= from)); setPrev(r.data.filter((x) => x.day < from));
    } catch (e) { setErr("Chưa tải được thống kê. " + (e.message || "")); }
  })(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { readAll(() => supabase.from("web_posts").select("slug,title").neq("status", "trash").order("id")).then((ps) => setTitles(Object.fromEntries(ps.map((p) => [`/${p.slug}`, p.title])))).catch(() => {}); }, []);

  const S = useMemo(() => {
    if (!rows) return null;
    const sum = (l, k) => l.reduce((n, r) => n + (r[k] || 0), 0);
    const byDay = Object.fromEntries(dateList(from, today).map((d) => [d, 0])); for (const r of rows) if (r.day in byDay) byDay[r.day] += r.views;
    const bySrc = {}; for (const r of rows) bySrc[r.src] = (bySrc[r.src] || 0) + r.views;
    const byPath = {}; for (const r of rows) { const x = (byPath[r.path] ||= { path: r.path, views: 0, app: 0 }); x.views += r.views; x.app += r.app; }
    return { views: sum(rows, "views"), vis: sum(rows, "visitors"), app: sum(rows, "app"), pviews: sum(prev || [], "views"), byDay: Object.entries(byDay), bySrc, top: Object.values(byPath).sort((a, b) => b.views - a.views).slice(0, 8) };
  }, [rows, prev]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = (p) => STATIC[p] || titles[p] || (p.startsWith("/calo/") ? `Calo ${FOODS.find((f) => f.slug === p.slice(6))?.name.toLowerCase() || p.slice(6)}` : p);
  const range = <select value={days} onChange={(e) => setDays(+e.target.value)} data-testid="web-stats-range" className="pc-input" style={{ height: 34, borderRadius: 10, border: `1px solid ${PC.field}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", background: "#FFF", width: 150 }}>{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  const sub = "Web tự đếm: lượt xem, nguồn khách, bấm sang app · không lưu IP, không cookie · từ khoá xem ở Google Search Console";
  if (err) return <>{top(range, "Thống kê web", sub)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!S) return <>{top(range, "Thống kê web", sub)}<Loading /></>;
  const max = Math.max(1, ...S.byDay.map(([, v]) => v));
  const totSrc = Object.values(S.bySrc).reduce((a, b) => a + b, 0);
  const delta = S.pviews ? Math.round(((S.views - S.pviews) / S.pviews) * 100) : null;
  const C = "2.2fr 0.6fr 0.7fr 0.6fr";
  const dm = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return (
    <>
      {top(range, "Thống kê web", sub)}
      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {noTable && <div style={{ borderRadius: 12, background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 14px", fontSize: 12.5, color: "#92400E" }}>Chưa có bảng thống kê — chạy SQL <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>supabase/migrations/20261019130000_web_stats.sql</span> trên Supabase. Chạy xong web bắt đầu đếm từ lúc đó.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <Stat l="Lượt xem trang" n={vnInt(S.views)} s={delta == null ? `${days} ngày qua` : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}% so với ${days} ngày trước`} />
          <Stat l="Khách" n={vnInt(S.vis)} s="mỗi trình duyệt đếm 1 lần / ngày" />
          <Stat l="Bấm sang app" n={vnInt(S.app)} c={BLUE} s="mọi nút / link tới app.fipilotai.com" />
          <Stat l="Tỉ lệ bấm sang app" n={pct(S.app, S.vis)} c="#15803D" s="bấm app / khách" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
          <Card style={{ padding: 0 }}>
            <H t="Lượt xem theo ngày" />
            <div style={{ padding: "16px 16px 10px", height: 170, display: "flex", alignItems: "flex-end", gap: days > 30 ? 2 : days > 7 ? 4 : 8 }}>
              {S.byDay.map(([d, v], i) => <span key={d} title={`${dm(d)}: ${vnInt(v)} lượt xem`} style={{ flex: 1, height: `${Math.max(2, (v / max) * 100)}%`, borderRadius: days > 30 ? "3px 3px 1px 1px" : "6px 6px 2px 2px", background: i === S.byDay.length - 1 ? "#0062F0" : v ? "#BFD4FF" : "#EEF2F7" }} />)}
            </div>
            <div style={{ display: "flex", padding: "0 16px 14px", justifyContent: "space-between", fontSize: 11, color: PC.t4 }}><span>{dm(from)}</span><span>{dm(today)}</span></div>
          </Card>
          <Card style={{ padding: 0 }}>
            <H t="Khách đến từ" />
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {SRC.map(([k, t, c]) => { const p = totSrc ? Math.round(((S.bySrc[k] || 0) / totSrc) * 100) : 0; return (
                <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ display: "flex", fontSize: 12.5, justifyContent: "space-between" }}><b style={{ fontWeight: 700 }}>{t}</b><span style={{ color: PC.t3 }}>{totSrc ? `${p}%` : "—"}</span></span><span style={{ height: 8, borderRadius: 4, background: "#F1F5F9" }}><span style={{ display: "block", height: 8, width: `${p}%`, borderRadius: 4, background: c }} /></span></div>); })}
            </div>
          </Card>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
          <Card style={{ padding: 0 }}>
            <H t="Bài / trang xem nhiều" />
            <div style={{ ...headRow(C), background: PC.headBg }}><span>TRANG</span><span>XEM</span><span>BẤM APP</span><span>TỈ LỆ</span></div>
            {S.top.map((x) => <div key={x.path} data-testid="web-stats-row" style={{ ...bodyRow(C), minHeight: 52 }}><a href={`https://fipilotai.com${x.path}`} target="_blank" rel="noopener" title={x.path} style={{ ...cell, fontSize: 13, color: PC.t1, textDecoration: "none" }}>{name(x.path)}</a><span style={cell}>{vnInt(x.views)}</span><span style={cell}>{vnInt(x.app)}</span><span style={cell}>{pct(x.app, x.views)}</span></div>)}
            {!S.top.length && <div style={{ padding: 20, fontSize: 12.5, color: PC.t3 }}>Chưa có lượt xem nào trong {days} ngày qua.</div>}
          </Card>
          <Card style={{ padding: 0 }}>
            <H t="Từ khoá trên Google" r={<Pill tone="amber">Xem ở Search Console</Pill>} />
            <div style={{ ...headRow("1.8fr 0.6fr 0.6fr"), background: PC.headBg }}><span>TỪ KHOÁ</span><span>BẤM</span><span>HẠNG</span></div>
            <div style={{ padding: "14px 16px", fontSize: 12.5, color: PC.t3, lineHeight: 1.55, borderBottom: `1px solid ${PC.rowLine}` }}>Từ khoá, lượt bấm và hạng trung bình chỉ Google có — xem trong Search Console. Chưa xác minh web thì dán mã ở Cài đặt SEO › Mã theo dõi rồi nộp sitemap.xml.</div>
            <div style={{ padding: 14 }}><Btn kind="soft" onClick={() => window.open("https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2Ffipilotai.com%2F", "_blank", "noopener")}>Mở Google Search Console ↗</Btn></div>
          </Card>
        </div>
      </div>
    </>
  );
}
