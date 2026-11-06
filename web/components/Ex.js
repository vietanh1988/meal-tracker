// 01/11: ảnh bài tập 2 khung tự đổi (CSS .exph trong globals.css), thẻ bài, khối "Bài tập" trong bài viết. Dùng chung dữ liệu app (lib/workout.js).
import { photoUrls, exUrl, MUSCLE_NAME, MUSCLE_TONE, EQUIPS, LEVEL_NAME } from "@/lib/workout";

export function ExPhoto({ ex, big = true, labels = false, className = "", eager = false }) {
  const u = photoUrls(ex.id, big);
  if (!u) {
    const [bg, fg] = MUSCLE_TONE[ex.muscle] || ["#F1F5F9", "#475569"];
    return <span className={`exph exph-no ${className}`} style={{ background: bg, color: fg }} aria-hidden="true">{MUSCLE_NAME[ex.muscle] || "Bài tập"}</span>;
  }
  return (
    <span className={`exph ${className}`}>
      <img src={u[0]} alt={`${ex.vi} (${ex.en}) — tư thế bắt đầu`} width={big ? 480 : 128} height={big ? 320 : 96} loading={eager ? "eager" : "lazy"} decoding="async" />
      <img src={u[1]} alt={`${ex.vi} — tư thế kết thúc`} width={big ? 480 : 128} height={big ? 320 : 96} loading={eager ? "eager" : "lazy"} decoding="async" />
      {labels && <span className="exlb" aria-hidden="true"><i>Bắt đầu</i><i>Kết thúc</i></span>}
    </span>
  );
}

export const exTags = (e) => [MUSCLE_NAME[e.muscle], EQUIPS[e.equip], LEVEL_NAME[e.level]].filter(Boolean).join(" · ");

export function ExCard({ e, attrs }) {
  return (
    <a className="card excard" href={exUrl(e.id)} {...attrs}>
      <ExPhoto ex={e} />
      <span className="tx"><b>{e.en || e.vi}</b>{e.en && <span className="en">{e.vi}</span>}<span className="tg">{exTags(e)}</span></span>
    </a>
  );
}

/** khối "Bài tập" trong bài viết: ảnh động + 3 bước đầu + link */
export function ExBlock({ e }) {
  if (!e) return null;
  return (
    <div className="card exblk" data-ex={e.id}>
      <ExPhoto ex={e} />
      <div className="in">
        <span className="eye">Bài tập</span>
        <a href={exUrl(e.id)} className="nm">{e.en || e.vi}</a>
        <span className="sub">{e.en ? `${e.vi} · ` : ""}{MUSCLE_NAME[e.muscle]} · {EQUIPS[e.equip]}</span>
        {(e.steps || []).length > 0 && <ol>{e.steps.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}</ol>}
        <a className="go" href={exUrl(e.id)}>Xem cách tập đầy đủ ›</a>
      </div>
    </div>
  );
}
