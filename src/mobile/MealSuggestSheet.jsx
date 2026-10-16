// Sheet gợi ý món cho 1 bữa (16/10): mở từ thẻ bữa đến giờ ở Hôm nay — thay nút "Ăn lại …" tự áp vào bữa.
// Hiện tối đa 5 lựa chọn (lib/mealSuggest: bữa đã ăn, thực đơn mẫu, thực đơn AI) theo calo bữa + món không ăn;
// người dùng chọn 1 rồi mới ghi vào bữa. Cùng kiểu sheet Đổi món (bản vẽ 94).
import { useState } from "react";
import { fmtInt } from "../lib/mobileView";
import { fmtVN } from "../lib/dateVN";
import { Icon, Seg } from "./ui";
import { GREEN, DT, fbtn, pill, Sheet, CloseX, OptRow, foodName, portionText } from "./menuUI";
import { MealIcon } from "./icons";
import { scaleSuggestion } from "../lib/mealSuggest";

const GOAL = { bulk: "Tăng cơ", cut: "Giảm mỡ", maintain: "Giữ cân" };
const SRC = { history: ["Đã ăn", GREEN, "rgba(5,150,105,0.12)"], template: ["Mẫu", "#0062F0", "#EEF4FF"], ai: ["AI", "#6D28D9", "#F3EEFF"] };

const PORTION = [[0.8, "Ít hơn"], [1, "Vừa"], [1.2, "Nhiều hơn"]];

export function MealSuggestSheet({ mealId, mealName, list, target, rt, goal, dayType, avoidText, onPick, onSearch, onClose }) {
  const [sel, setSel] = useState(list[0]?.id || null);
  const [k, setK] = useState(1);
  const [busy, setBusy] = useState(false);
  const base = list.find((s) => s.id === sel);
  const chosen = base ? scaleSuggestion(base, k) : null;
  const need = rt ? Math.round(rt.remain.p) : null;
  const avoid = String(avoidText || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  const pick = async () => { if (!chosen || busy) return; setBusy(true); try { await onPick(chosen); } finally { setBusy(false); } };
  return (
    <Sheet testid="suggest-sheet" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <MealIcon id={mealId} size={40} />
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{mealName} · gợi ý món</span>
          <span style={{ fontSize: 20, fontWeight: 900 }}>Chọn 1 trong {list.length}</span>
        </span>
        <CloseX onClick={onClose} />
      </div>
      <div data-testid="suggest-day" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {rt && <span style={pill("#EEF4FF", "#0062F0")}>Còn {fmtInt(Math.max(0, rt.remain.cal))} kcal · {need > 0 ? `thiếu ${fmtInt(need)} g đạm` : "đủ đạm"}</span>}
        {rt && rt.over.f && <span style={pill("#FFF7E6", "#B45309")}>Béo đã vượt · ưu tiên món ít béo</span>}
        {target ? <span style={pill("#F1F5F9", "#334155")}>Bữa này ≈ {fmtInt(target)} kcal</span> : null}
        <span style={pill("#F1F5F9", "#334155")}>{GOAL[goal] || "Giữ cân"} · {DT[dayType] || "Ngày tập"}</span>
        {avoid.length > 0 && <span style={pill("#F3EEFF", "#6D28D9")}>Không ăn: {avoid.slice(0, 2).join(", ")}{avoid.length > 2 ? ` +${avoid.length - 2}` : ""}</span>}
      </div>
      <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>Khẩu phần đã chỉnh theo calo còn lại trong ngày. Chọn xong vẫn sửa được món ở bữa.</span>
      {list.map((s) => {
        const [t, c, bg] = SRC[s.kind] || SRC.history;
        const v = s.id === sel && chosen ? chosen : s; // lựa chọn đang chọn hiện theo khẩu phần đã chỉnh
        const d = Math.round(v.cal - (s.target || 0));
        const dc = !s.target || Math.abs(d) <= s.target * 0.1 ? "#64748B" : "#B45309";
        const src = s.kind === "history" ? `${t} ${fmtVN(s.date)}` : s.kind === "ai" ? `${t}${s.date ? ` ${fmtVN(s.date)}` : ""}` : `${t} · ${s.title}`;
        return (
          <OptRow key={s.id} testid="suggest-opt" on={s.id === sel} onClick={() => { setSel(s.id); setK(1); }}
            title={<span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.items.map(foodName).join(", ")}</span>}
            sub={<span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                {s.best && <span data-testid="suggest-best" style={{ fontSize: 10, fontWeight: 800, color: "#FFFFFF", background: "#0062F0", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0 }}>Hợp nhất</span>}
                <span style={{ fontSize: 10, fontWeight: 800, color: c, background: bg, padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0 }}>{src}</span>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.items.map(portionText).filter(Boolean).join(" · ")}</span>
              </span>
              <span data-testid="suggest-macro" style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Đ {fmtInt(v.p)} · TB {fmtInt(v.c)} · B {fmtInt(v.f)} g</span>
            </span>}
            right={<span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}><span style={{ fontSize: 15, fontWeight: 900 }}>{fmtInt(v.cal)}</span><span style={{ fontSize: 11, fontWeight: 800, color: dc }}>{s.target ? `${d > 0 ? "+" : d < 0 ? "−" : "±"}${fmtInt(Math.abs(d))}` : "kcal"}</span></span>} />
        );
      })}
      {chosen && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Khẩu phần</span>
          <Seg ariaLabel="Khẩu phần" style={{ flex: 1 }} value={k} onChange={setK} opts={PORTION.map(([x, l]) => ({ value: x, label: l, testid: `suggest-k-${x}` }))} />
        </div>
      )}
      {onSearch && <button data-testid="suggest-search" onClick={onSearch} style={{ height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0 }}>{Icon.search(15)} Tìm món khác</button>}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onClose} style={{ ...fbtn("grey"), flex: 1 }}>Huỷ</button>
        <button data-testid="suggest-apply" disabled={!chosen || busy} onClick={pick} style={{ ...fbtn("primary", !chosen || busy), flex: 2 }}>{Icon.check(18, 2.8)} {chosen ? `Ghi · ${fmtInt(chosen.cal)} kcal` : "Chọn món"}</button>
      </div>
    </Sheet>
  );
}
