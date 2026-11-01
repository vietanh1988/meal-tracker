// 01/11: mảnh dùng chung của Thư viện bài tập (server): chip nhóm cơ (link riêng từng nhóm), thẻ giáo án mẫu
import { ExPhoto } from "./Ex";
import { MUSCLES, MUSCLE_SLUG, TEMPLATES, tplSessions, exById, countBy } from "@/lib/workout";

export function MuscleChips({ active }) {
  const n = countBy("muscle"), all = Object.values(n).reduce((a, b) => a + b, 0);
  return (
    <nav className="chips" aria-label="Nhóm cơ" data-testid="ex-muscles">
      <a className={`chip${active ? "" : " on"}`} href="/bai-tap" aria-current={active ? undefined : "page"}>Tất cả<em>{all}</em></a>
      {MUSCLES.filter(([k]) => n[k]).map(([k, t]) => <a key={k} className={`chip${active === k ? " on" : ""}`} href={`/bai-tap/nhom/${MUSCLE_SLUG[k]}`} aria-current={active === k ? "page" : undefined}>{t}<em>{n[k]}</em></a>)}
    </nav>
  );
}

export function ExTplCards() {
  return (
    <div className="extpl" data-testid="ex-tpls">
      {TEMPLATES.map((t) => {
        const ex = [...new Set(tplSessions(t.id).flatMap((s) => s.items.map((i) => i.ex)))].map(exById).filter(Boolean).slice(0, 3);
        return (
          <a key={t.id} className="card" href={`/bai-tap/giao-an/${t.id}`}>
            <b>{t.name}</b><span className="mut">{t.hint}</span>
            <span className="th">{ex.map((e) => <ExPhoto key={e.id} ex={e} big={false} />)}</span>
            <span className="go">Xem giáo án ›</span>
          </a>
        );
      })}
    </div>
  );
}
