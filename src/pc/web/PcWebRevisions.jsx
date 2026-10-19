// Lịch sử bản sửa — so sánh 2 bản, khôi phục (bản vẽ 138m). Mở từ nút "↶ Lịch sử" của trình soạn.
// Trái: các bản đã lưu (giữ 30 bản). Phải: so bản đang xem với bản hiện tại trong trình soạn — tiêu đề, tiêu đề SEO, mô tả, đường dẫn, nội dung (theo từ), thẻ.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { toVNDate, todayVN, addDays } from "../../lib/dateVN";
import { Btn, Pill, Card } from "../pcUI";
import { BLUE } from "./webUI";
import { wordDiff, blockDiff, blockText } from "./webLib";
import { BLOCK_NAME } from "./blocksMeta";

const DEL = { background: "#FEE2E2", color: "#991B1B", textDecoration: "line-through" };
const ADD = { background: "#DCFCE7", color: "#166534" };
const REASON = { autosave: "Tự lưu", draft: "Lưu nháp", update: "Bấm Cập nhật", publish: "Đăng bài", restore: "Khôi phục", replace: "Tìm & thay", import: "Nhập bài", ai: "AI viết" };
const when = (iso) => { const d = toVNDate(iso), t = todayVN(); const hm = new Date(new Date(iso).getTime() + 7 * 36e5).toISOString().slice(11, 16); return d === t ? `Hôm nay ${hm}` : d === addDays(t, -1) ? `Hôm qua ${hm}` : `${d.slice(8, 10)}/${d.slice(5, 7)} ${hm}`; };
const H = ({ children }) => <b style={{ fontSize: 13, color: PC.t3 }}>{children}</b>;

// Một dòng chữ có tô phần bỏ / thêm; side 0 = bản cũ (chỉ hiện phần bỏ), 1 = bản mới (chỉ hiện phần thêm), null = 1 cột (hiện cả hai)
function Diff({ a, b, side }) {
  const parts = wordDiff(a, b);
  return <span>{parts.map(([op, t], i) => op === "=" ? <span key={i}>{t}</span> : op === "-" ? (side === 1 ? null : <span key={i} style={DEL}>{t}</span>) : (side === 0 ? null : <span key={i} style={ADD}>{t}</span>))}</span>;
}

export function PcWebRevisions({ top, revs, post, termName, onBack, onRestore }) {
  const [sel, setSel] = useState(revs[1] || revs[0] || null);
  const [cols, setCols] = useState(2);
  const [who, setWho] = useState({});
  useEffect(() => { const ids = [...new Set(revs.map((r) => r.created_by).filter(Boolean))]; if (ids.length) supabase.from("profiles").select("id,username").in("id", ids).then(({ data }) => setWho(Object.fromEntries((data || []).map((p) => [p.id, p.username])))).catch(() => {}); }, [revs]);
  const n = revs.length;
  const num = (r) => n - revs.indexOf(r);
  const old = sel?.snapshot || {};
  const cur = post;
  const seoT = (p) => p.seo?.title || `${p.title || ""}${p.title ? " | Fipilot AI" : ""}`;
  const tags = (p) => [...new Set((p.terms || []).map(termName).filter(Boolean))];
  const clean = (l) => (l || []).filter((b) => b && !(b.type === "p" && !blockText(b).trim()));
  const bd = useMemo(() => blockDiff(clean(old.blocks), clean(cur.blocks)), [sel, cur.blocks]); // eslint-disable-line react-hooks/exhaustive-deps
  const words = (l) => l.reduce((s, b) => s + blockText(b).split(/\s+/).filter(Boolean).length, 0);
  let plus = 0, minus = 0;
  for (const [op, x, y] of bd) { if (op === "+") plus += words([y]); else if (op === "-") minus += words([x]); else if (op === "~") for (const [o, t] of wordDiff(blockText(x), blockText(y))) { const w = t.split(/\s+/).filter(Boolean).length; if (o === "+") plus += w; if (o === "-") minus += w; } }
  const fields = [["Tiêu đề", old.title, cur.title], ["Tiêu đề SEO", seoT(old), seoT(cur)], ["Mô tả SEO", old.seo?.desc || "", cur.seo?.desc || ""], ["Đường dẫn", old.slug ? `/${old.slug}` : "", cur.slug ? `/${cur.slug}` : ""]].filter(([l, a, b], i) => (i === 1 ? true : i === 0 ? a !== b && (old.seo?.title || cur.seo?.title) : a !== b));
  const Side = ({ side }) => (
    <div style={{ padding: 20, borderRight: side === 0 ? `1px solid ${PC.headLine}` : "none", display: "flex", flexDirection: "column", gap: 14, fontSize: 14.5, lineHeight: 1.7, minWidth: 0 }}>
      {side != null && <span style={{ fontSize: 11, fontWeight: 800, color: side ? BLUE : "#C2410C", letterSpacing: ".06em" }}>{side ? "ĐANG SỬA (HIỆN TẠI)" : `BẢN ${num(sel)}`}</span>}
      {fields.map(([l, a, b]) => <div key={l} style={{ display: "flex", flexDirection: "column", gap: 4 }}><H>{l}</H><Diff a={a} b={b} side={side} /></div>)}
      <H>Nội dung</H>
      {bd.map(([op, x, y], i) => {
        const b = op === "+" ? y : x; const label = b.type === "p" ? null : b.type === "h" ? `H${b.level || 2}` : BLOCK_NAME[b.type];
        const head = label && <span style={{ fontSize: 11, fontWeight: 800, color: PC.t4, marginRight: 6 }}>{label.toUpperCase()}</span>;
        const st = b.type === "h" ? { fontWeight: 800, fontSize: 16 } : {};
        if (op === "=") return <span key={i} style={st}>{head}{blockText(x)}</span>;
        if (op === "~") return <span key={i} style={st}>{head}<Diff a={blockText(x)} b={blockText(y)} side={side} /></span>;
        if (op === "-") return side === 1 ? <span key={i} style={{ height: 8 }} /> : <span key={i} style={{ ...DEL, display: "block", borderRadius: 8, padding: "6px 10px", ...st }}>− {head}{blockText(x)}</span>;
        return side === 0 ? <span key={i} style={{ height: 8 }} /> : <span key={i} style={{ ...ADD, display: "block", borderRadius: 8, padding: "6px 10px", ...st }}>+ {head}{blockText(y)}</span>;
      })}
      <H>Thẻ & chuyên mục</H>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{(() => { const a = tags(old), b = tags(cur); const all = [...a, ...b.filter((x) => !a.includes(x))]; return all.map((t) => { const gone = !b.includes(t), neu = !a.includes(t); if ((side === 1 && gone) || (side === 0 && neu)) return null; return <span key={t} style={{ fontSize: 13, borderRadius: 6, padding: "1px 8px", background: "#F1F5F9", ...(gone ? DEL : neu ? ADD : {}) }}>{t}</span>; }); })()}</span>
    </div>
  );
  return (
    <>
      {top(<span style={{ display: "flex", gap: 8 }}><Btn kind="light" onClick={onBack} testid="web-rev-back">← Về trình soạn</Btn><Btn kind="blue" disabled={!sel} onClick={() => onRestore(sel.snapshot)} testid="web-rev-restore">{sel ? `Khôi phục bản ${num(sel)}` : "Khôi phục"}</Btn></span>, "Lịch sử bản sửa", `${cur.title || "Bài chưa có tiêu đề"} · ${n} bản`)}
      <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>Các bản đã lưu</b></div>
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            {revs.map((r, i) => { const a = r === sel, c = i === 0; return (
              <button key={r.id} type="button" onClick={() => setSel(r)} data-testid="web-rev-item" style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 10px", borderRadius: 10, border: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", background: a ? "#FFF7ED" : c ? PC.rowSel : "transparent", boxShadow: a ? "inset 0 0 0 1.5px #FDBA74" : c ? "inset 0 0 0 1.5px #BFD4FF" : "none" }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: a ? "#F97316" : c ? BLUE : "#CBD5E1", flexShrink: 0 }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>Bản {num(r)} <span style={{ fontWeight: 600, color: PC.t3 }}>· {REASON[r.reason] || r.reason}</span></b><span style={{ fontSize: 11.5, color: PC.t3 }}>{when(r.created_at)}{who[r.created_by] ? ` · ${who[r.created_by]}` : ""}</span></span>
                <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 800, color: a ? "#C2410C" : BLUE }}>{a ? "ĐANG XEM" : c ? "MỚI NHẤT" : ""}</span>
              </button>); })}
            <span style={{ padding: 10, fontSize: 11.5, lineHeight: 1.45, color: PC.t3 }}>Giữ 30 bản gần nhất mỗi bài. Khôi phục chỉ mở bản cũ vào trình soạn — bấm Cập nhật / Lưu nháp mới lưu, và lần lưu đó cũng thành 1 bản mới nên luôn quay lại được.</span>
          </div>
        </Card>
        {sel ? (
          <Card style={{ padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}>
              <b style={{ fontSize: 13.5 }}>So sánh</b><Pill tone="amber">Bản {num(sel)} · {when(sel.created_at)}</Pill><span style={{ color: PC.t4 }}>→</span><Pill tone="blue">Đang sửa · hiện tại</Pill>
              <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ ...ADD, padding: "0 6px", borderRadius: 4 }}>+ {plus} chữ</span><span style={{ ...DEL, textDecoration: "none", padding: "0 6px", borderRadius: 4 }}>− {minus} chữ</span>
                {[[2, "Hai cột"], [1, "Một cột"]].map(([v, l], k) => <span key={v} style={{ display: "flex", gap: 12 }}>{k > 0 && <span>·</span>}<button type="button" onClick={() => setCols(v)} data-testid={`web-rev-cols-${v}`} style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: cols === v ? 800 : 500, color: cols === v ? BLUE : PC.t3 }}>{l}</button></span>)}
              </span>
            </div>
            {cols === 2 ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}><Side side={0} /><Side side={1} /></div> : <Side side={null} />}
          </Card>
        ) : <Card style={{ padding: 24, fontSize: 13, color: PC.t3 }}>Bài này chưa có bản sửa nào.</Card>}
      </div>
    </>
  );
}
