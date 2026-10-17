// Sheet "Số đo cơ thể" (bản vẽ 123b, 17/10). Mở từ "+ Đo" (hôm nay) hoặc chạm 1 dòng lịch sử (ngày đó, sửa / xoá).
// Hình 3D nam/nữ theo hồ sơ; ô đang nhập → vòng thước đó sáng. Số mờ = lần đo trước để so; ô trống không lưu.
// 1 lần đo / ngày: lưu ngày đã có → thay số của ngày đó.
import { useMemo, useState } from "react";
import { Icon, FONT, GRAD_BLUE, SR, useLockScroll, useSwipeClose, SheetHandle } from "./ui";
import { BodyFigure } from "./BodyFigure";
import { FIELDS, cleanValues, countValues, parseCm, parseFat, sortRows } from "../lib/bodyMeasure";
import { addDays, fmtVN } from "../lib/dateVN";
import { fmtDec, weekdayFull } from "../lib/mobileView";
import { appConfirm } from "../lib/dialog";

const str = (v) => (v == null ? "" : fmtDec(v));

export function MeasureSheet({ today, date: initDate, rows, gender, onSave, onDelete, onClose }) {
  useLockScroll(true);
  const [date, setDate] = useState(initDate || today);
  const all = sortRows(rows);
  const existing = all.find((r) => r.log_date === date) || null;
  const prev = [...all].reverse().find((r) => r.log_date < date) || null;
  const init = (r) => Object.fromEntries([...FIELDS.map((f) => [f.k, str(r?.[f.k])]), ["body_fat", str(r?.body_fat)]]);
  const [form, setForm] = useState(() => init(existing));
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const vals = useMemo(() => cleanValues(form), [form]);
  const n = countValues(vals);
  const dateOpts = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((d) => addDays(today, -d)), [today]);

  const pickDate = (d) => { setDate(d); setForm(init(all.find((r) => r.log_date === d))); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value.replace(/[^\d.,]/g, "").replace(/\./g, ",").slice(0, 5) }));
  const bad = (k) => form[k] && (k === "body_fat" ? parseFat(form[k]) == null : parseCm(form[k]) == null);
  const anyBad = [...FIELDS.map((f) => f.k), "body_fat"].some(bad);

  const save = async () => {
    if (busy || anyBad || (!n && !existing)) return;
    setBusy(true);
    const ok = n ? await onSave(date, vals) : await onDelete(date);
    setBusy(false);
    if (ok !== false) onClose();
  };
  const del = async () => {
    if (!existing || busy) return;
    if (!(await appConfirm(`Xoá lần đo ${weekdayFull(date)} ${fmtVN(date)}?`, { title: "Xoá lần đo?", confirmText: "Xoá", danger: true }))) return;
    setBusy(true);
    const ok = await onDelete(date);
    setBusy(false);
    if (ok !== false) onClose();
  };

  const sw = useSwipeClose(onClose);
  const inBox = (k, unit, ph, label) => (
    <label style={{ width: 96, height: 44, borderRadius: 12, background: active === k ? "#FFFFFF" : "#F1F5F9", boxShadow: bad(k) ? "inset 0 0 0 2px #DC2626" : active === k ? "inset 0 0 0 2px #1A7CFF" : "none", display: "flex", alignItems: "center", gap: 4, padding: "0 10px", boxSizing: "border-box", flexShrink: 0 }}>
      <span style={SR}>{label} ({unit})</span>
      <input data-testid={`measure-in-${k}`} type="text" inputMode="decimal" enterKeyHint="next" value={form[k]} placeholder={ph}
        onFocus={() => setActive(k === "body_fat" ? null : k)} onBlur={() => setActive((a) => (a === k ? null : a))} onChange={set(k)}
        style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#0F172A", outline: "none", padding: 0 }} />
      <span style={{ fontSize: 12, color: "#64748B" }}>{unit}</span>
    </label>
  );

  return (
    <div className="fpm" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(15,23,42,0.45)", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div ref={sw.ref} {...sw.swipe} data-testid="measure-sheet" role="dialog" aria-modal="true" aria-label="Số đo cơ thể" onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: "max(24px, env(safe-area-inset-top, 0px))", maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column", animation: "fpmSheetUp .2s ease", overflow: "hidden" }}>
        <div style={{ padding: "8px 16px 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <SheetHandle />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontSize: 20, fontWeight: 900 }}>Số đo cơ thể</span>
            <label style={{ position: "relative", height: 34, padding: "0 12px", borderRadius: 17, background: "#EEF4FF", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#0062F0" }}>
              {Icon.calendar ? Icon.calendar(14) : null}{date === today ? "Hôm nay" : `${weekdayFull(date)} ${fmtVN(date)}`} ▾
              <select data-testid="measure-date" aria-label="Ngày đo" value={date} onChange={(e) => pickDate(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%" }}>
                {!dateOpts.includes(date) && <option value={date}>{fmtVN(date)}</option>}
                {dateOpts.map((d) => <option key={d} value={d}>{d === today ? "Hôm nay" : `${weekdayFull(d)} ${fmtVN(d)}`}</option>)}
              </select>
            </label>
            <button onClick={onClose} aria-label="Đóng" style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "#F1F5F9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.close(16)}</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px 16px", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <BodyFigure gender={gender} active={active} width={124} />
            <span style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5, lineHeight: 1.45, color: "#475569" }}>
              <b style={{ fontSize: 14, color: "#0F172A" }}>Đo đúng để so được</b>
              <span>• Sáng, trước khi ăn, sau đi vệ sinh</span>
              <span>• Thước dây sát da, không siết</span>
              <span>• Mỗi tuần 1 lần, cùng giờ</span>
              <span>• Không cần đo đủ — đo chỗ nào ghi chỗ đó</span>
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            {FIELDS.map((f, i) => (
              <div key={f.k} data-testid={`measure-row-${f.k}`} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 60, borderBottom: i < FIELDS.length - 1 ? "1px solid #EEF2FA" : "none" }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, background: f.color, color: "#FFFFFF", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.n}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{f.label}</span>
                  <span style={{ fontSize: 11.5, color: bad(f.k) ? "#DC2626" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bad(f.k) ? "Số đo 10–250 cm" : f.hint}</span>
                </span>
                {inBox(f.k, "cm", prev?.[f.k] != null ? fmtDec(prev[f.k]) : "", f.label)}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, borderRadius: 12, background: "#F6F8FC", padding: "8px 8px 8px 12px" }}>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>% mỡ <span style={{ fontWeight: 600, color: "#64748B" }}>(không bắt buộc)</span></span>
              <span style={{ fontSize: 11.5, color: bad("body_fat") ? "#DC2626" : "#64748B" }}>{bad("body_fat") ? "% mỡ 3–60" : "Từ cân điện tử / máy đo InBody"}</span>
            </span>
            {inBox("body_fat", "%", prev?.body_fat != null ? fmtDec(prev.body_fat) : "", "% mỡ")}
          </div>
          {existing && <button data-testid="measure-delete" onClick={del} disabled={busy} style={{ display: "block", margin: "10px auto 0 auto", height: 36, padding: "0 12px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#DC2626" }}>Xoá lần đo này</button>}
        </div>
        <div style={{ borderTop: "1px solid rgba(30,64,175,0.08)", padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 14px) 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>{prev ? `Số mờ = lần đo trước (${fmtVN(prev.log_date)}) · ô để trống không lưu` : "Ô để trống không lưu"}</span>
          <button data-testid="measure-save" onClick={save} disabled={busy || anyBad || (!n && !existing)}
            style={{ height: 52, borderRadius: 14, border: "none", background: anyBad || (!n && !existing) ? "#E2E8F0" : GRAD_BLUE, color: anyBad || (!n && !existing) ? "#64748B" : "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {Icon.check(18)}{busy ? "Đang lưu…" : n ? `Lưu ${n} số đo` : existing ? "Lưu (xoá lần đo này)" : "Nhập ít nhất 1 số"}
          </button>
        </div>
      </div>
    </div>
  );
}
