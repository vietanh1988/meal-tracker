"use client";
// 01/11: lưới thư viện bài tập — tìm (không dấu, tên Việt / tên Anh), lọc dụng cụ, xem thêm. Dữ liệu nhẹ do trang server truyền vào.
import { useMemo, useState } from "react";

const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();

export function ExCardC({ e }) {
  return (
    <a className="card excard" href={e.url} data-testid="ex-card" data-id={e.id}>
      {e.ph ? (
        <span className="exph"><img src={e.ph[0]} alt={`${e.vi} (${e.en}) — tư thế bắt đầu`} width={480} height={320} loading="lazy" decoding="async" /><img src={e.ph[1]} alt={`${e.vi} — tư thế kết thúc`} width={480} height={320} loading="lazy" decoding="async" /></span>
      ) : <span className="exph exph-no" style={{ background: e.tone[0], color: e.tone[1] }} aria-hidden="true">{e.mn}</span>}
      <span className="tx"><b>{e.en || e.vi}</b>{e.en && <span className="en">{e.vi}</span>}<span className="tg">{e.tg}</span></span>
    </a>
  );
}

export default function ExLib({ list, equips, per = 24, placeholder = "Ví dụ: gánh tạ, bench press, hit dat" }) {
  const [q, setQ] = useState("");
  const [eq, setEq] = useState("");
  const [n, setN] = useState(per);
  const f = fold(q);
  const out = useMemo(() => list.filter((e) => (!eq || e.equip === eq) && (!f || e.k.includes(f))), [list, eq, f]);
  const shown = per ? out.slice(0, f || eq ? out.length : n) : out;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="exsearch"><input className="inp" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Tìm bài tập" data-testid="ex-search" /></div>
      <div className="chips chips-wrap exchip-s" role="group" aria-label="Lọc theo dụng cụ">
        {equips.map(([k, t]) => <button key={k || "all"} type="button" className={`chip${eq === k ? " on" : ""}`} aria-pressed={eq === k} onClick={() => setEq(k)} data-testid={`ex-eq-${k || "all"}`}>{t}</button>)}
      </div>
      {(f || eq) && <p className="mut" style={{ fontSize: 15, margin: 0 }} data-testid="ex-count">{out.length} bài{f ? ` khớp “${q.trim()}”` : ""}</p>}
      {!out.length && <p className="mut" style={{ fontSize: 15, margin: 0 }}>Không thấy bài này. Thử tên tiếng Anh hoặc bỏ bớt chữ.</p>}
      <div className="exlib" data-testid="ex-grid">{shown.map((e) => <ExCardC key={e.id} e={e} />)}</div>
      {shown.length < out.length && <div style={{ display: "flex", justifyContent: "center" }}><button type="button" className="btn b2" onClick={() => setN((x) => x + 24)} data-testid="ex-more">Xem thêm {out.length - shown.length} bài</button></div>}
    </div>
  );
}
