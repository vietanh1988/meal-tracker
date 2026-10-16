// Quản trị PC › Sao lưu (chỉ Super Admin). Cùng Edge Function "backup-restore" với src/mobile/admin/BackupScreen.jsx (+ tab cũ BackupTab):
//  - Sao lưu: authFetch("backup-restore", { action: "backup" }) → tải file fipilot_backup_<ngày VN>.json (23 bảng);
//    sau khi sao lưu hiện số dòng từng bảng (như tab cũ) + "Lần gần nhất" (chỉ trong phiên này — không có lịch sử sao lưu ở đâu cả).
//  - Khôi phục gộp: chọn file → bảng chọn bảng (bảng 0 dòng mờ, không chọn được) → hỏi bằng hộp thoại app
//    → { action: "restore", tables, data } → mỗi bảng hiện kết quả số dòng / lỗi.
//  - Admin thường: dải chỉ xem + báo chỉ Super Admin dùng được, không gọi Edge Function.
import { useState } from "react";
import { appConfirm } from "../lib/dialog";
import { authFetch } from "../lib/authFetch";
import { todayVN, toVNDate, fmtVN } from "../lib/dateVN";
import { PC } from "../theme";
import { Btn, Pill, Card, ErrorBox, headRow, bodyRow, cell, vnInt } from "./pcUI";

const ALL_TABLES = [
  "profiles", "meal_logs", "daily_logs", "weekly_templates", "weekly_bundles",
  "weight_logs", "food_cache", "food_cache_pending", "food_overrides",
  "ai_usage_log", "ai_chat_history", "ai_menu_cache",
  "app_settings", "subscription_settings", "orders",
  "notifications", "notification_batches", "push_subscriptions",
  "user_feedback", "feature_ratings", "admin_audit_log", "admin_stats_snapshots", "client_errors",
];
const TABLE_LABELS = {
  profiles: "Hồ sơ người dùng", meal_logs: "Bữa ăn", daily_logs: "Nhật ký ngày",
  weekly_templates: "Mẫu tuần", weekly_bundles: "Gói tuần", weight_logs: "Cân nặng",
  food_cache: "Món AI đã tính", food_cache_pending: "Món AI chờ duyệt", food_overrides: "Số món đã sửa",
  ai_usage_log: "Nhật ký gọi AI", ai_chat_history: "Lịch sử chat AI", ai_menu_cache: "Thực đơn AI đã tạo",
  app_settings: "Cài đặt app", subscription_settings: "Cài đặt gói", orders: "Đơn hàng",
  notifications: "Thông báo", notification_batches: "Đợt gửi thông báo", push_subscriptions: "Thiết bị nhận push",
  user_feedback: "Góp ý", feature_ratings: "Đánh giá tính năng", admin_audit_log: "Nhật ký admin",
  admin_stats_snapshots: "Ảnh chụp số liệu", client_errors: "Lỗi app",
};
const R_COLS = "28px 1.6fr 1.2fr 0.8fr 1.4fr";
const M_COLS = "1fr 90px";
const sumRows = (meta) => Object.values(meta || {}).reduce((a, b) => a + (Number(b) || 0), 0);
const backupDay = (iso) => {
  if (!iso) return "?";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso).slice(0, 10) : fmtVN(toVNDate(d), true);
};

function Box({ on, disabled }) {
  return (
    <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", background: on ? "#0062F0" : "#FFFFFF", border: on ? "none" : `1.5px solid ${disabled ? PC.field : "#94A3B8"}` }}>
      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}
    </span>
  );
}

export function PcBackup({ top, isSuperAdmin, showToast }) {
  const toast = (text) => showToast?.({ text }, 3500);
  const [progress, setProgress] = useState(null); // "backup" | "restore" | null
  const [last, setLast] = useState(null); // { day, rows, meta } — lần sao lưu trong phiên này
  const [backupErr, setBackupErr] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileErr, setFileErr] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreMeta, setRestoreMeta] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [results, setResults] = useState(null);
  const [restoreErr, setRestoreErr] = useState(null);
  const busy = !!progress;

  // ===== SAO LƯU =====
  const doBackup = async () => {
    if (!isSuperAdmin || busy) return;
    setProgress("backup"); setBackupErr(null);
    try {
      const res = await authFetch("backup-restore", { action: "backup" });
      if (!res || res.error) throw new Error(res?.error || "Không có phản hồi");
      const day = todayVN();
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `fipilot_backup_${day}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const rows = sumRows(res.meta);
      setLast({ day, rows, meta: res.meta || {} });
      toast(`Đã sao lưu ${vnInt(rows)} dòng — ${ALL_TABLES.length} bảng`);
    } catch (e) {
      setBackupErr(e.message);
      toast("Lỗi sao lưu: " + e.message);
    }
    setProgress(null);
  };

  // ===== CHỌN FILE =====
  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResults(null); setRestoreErr(null); setFileErr(null); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (!json.backup || !json.meta) throw new Error("File không đúng định dạng sao lưu Fipilot AI");
        setRestoreFile(json);
        setRestoreMeta(json.meta);
        setSelected(new Set(Object.keys(json.meta).filter((t) => (json.meta[t] || 0) > 0)));
      } catch (err) {
        setRestoreFile(null); setRestoreMeta(null); setSelected(new Set());
        setFileErr(`File không hợp lệ: ${err.message}`);
      }
    };
    reader.onerror = () => setFileErr("Không đọc được file.");
    reader.readAsText(file);
  };

  const selectable = ALL_TABLES.filter((t) => (restoreMeta?.[t] || 0) > 0);
  const allOn = selectable.length > 0 && selectable.every((t) => selected.has(t));
  const toggle = (t) => setSelected((prev) => { const s = new Set(prev); if (s.has(t)) s.delete(t); else s.add(t); return s; });
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(selectable));
  const selRows = [...selected].reduce((a, t) => a + (Number(restoreMeta?.[t]) || 0), 0);

  // ===== KHÔI PHỤC =====
  const doRestore = async () => {
    if (!isSuperAdmin || !restoreFile || selected.size === 0 || busy) return;
    const ok = await appConfirm("Dữ liệu sẽ được GỘP: có thì cập nhật, chưa có thì thêm, không xoá dữ liệu cũ.", { title: `Khôi phục ${selected.size} bảng?`, confirmText: "Khôi phục" });
    if (!ok) return;
    setProgress("restore"); setResults(null); setRestoreErr(null);
    try {
      const tables = [...selected];
      const data = {};
      for (const t of tables) data[t] = restoreFile.backup[t] || [];
      const res = await authFetch("backup-restore", { action: "restore", tables, data });
      if (!res || res.error) throw new Error(res?.error || "Không có phản hồi");
      const r = res.results || {};
      setResults(r);
      const okN = Object.values(r).filter((x) => x.success).length;
      const failN = Object.values(r).filter((x) => !x.success).length;
      toast(failN === 0 ? `Đã khôi phục ${okN} bảng` : `Khôi phục xong: ${okN} bảng thành công, ${failN} bảng lỗi`);
    } catch (e) {
      setRestoreErr(e.message);
      toast("Lỗi khôi phục: " + e.message);
    }
    setProgress(null);
  };

  if (!isSuperAdmin) return (
    <>
      {top(null)}
      <div data-testid="pc-backup" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường không dùng được trang này.</div>
        <Card><div data-testid="pc-backup-denied" style={{ padding: 24, textAlign: "center", fontSize: 13, color: PC.t3 }}>Sao lưu & khôi phục chỉ dành cho Super Admin.</div></Card>
      </div>
    </>
  );

  const okN = results ? Object.values(results).filter((x) => x.success).length : 0;
  const failN = results ? Object.values(results).filter((x) => !x.success).length : 0;

  return (
    <>
      {top(<Btn kind="blue" onClick={doBackup} disabled={busy} testid="pc-backup-run">{progress === "backup" ? "Đang sao lưu…" : "Sao lưu toàn bộ"}</Btn>)}
      <div data-testid="pc-backup" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* SAO LƯU */}
          <Card testid="pc-backup-card" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>Sao lưu</span>
              <span style={{ fontSize: 13, color: PC.t2, lineHeight: 1.5, overflowWrap: "anywhere" }}>Tải toàn bộ {ALL_TABLES.length} bảng ra 1 file JSON <b>fipilot_backup_{todayVN()}.json</b>. Nút "Sao lưu toàn bộ" ở góc trên.</span>
              {last
                ? <span data-testid="pc-backup-last" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: PC.t2 }}><Pill tone="green">đã sao lưu</Pill>Lần gần nhất (phiên này): {fmtVN(last.day, true)} · {vnInt(last.rows)} dòng</span>
                : <span style={{ fontSize: 12, color: PC.t4 }}>Chưa sao lưu trong phiên này (app không lưu lịch sử sao lưu).</span>}
              {backupErr && <ErrorBox text={`Lỗi sao lưu: ${backupErr}`} onRetry={doBackup} />}
            </div>
            {last && (<>
              <div style={{ ...headRow(M_COLS), borderRadius: 0, borderTop: `1px solid ${PC.headLine}` }}><span>BẢNG</span><span style={{ textAlign: "right" }}>SỐ DÒNG</span></div>
              <div data-testid="pc-backup-meta" style={{ maxHeight: 420, overflowY: "auto" }}>
                {ALL_TABLES.map((t, i) => {
                  const lastRow = i === ALL_TABLES.length - 1;
                  return (
                    <div key={t} style={{ ...bodyRow(M_COLS), minHeight: 36, borderBottom: lastRow ? "none" : bodyRow(M_COLS).borderBottom, borderRadius: lastRow ? "0 0 14px 14px" : 0 }}>
                      <span style={cell} title={t}>{TABLE_LABELS[t] || t}</span>
                      <span style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{vnInt(last.meta[t] || 0)}</span>
                    </div>
                  );
                })}
              </div>
            </>)}
          </Card>

          {/* KHÔI PHỤC */}
          <Card testid="pc-backup-restore-card" style={{ flex: 1.5, minWidth: 0 }}>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>Khôi phục <span style={{ fontWeight: 600, color: PC.t3, fontSize: 12 }}>· gộp, không xoá dữ liệu cũ</span></span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label className="pc-field" style={{ position: "relative", flex: 1, minWidth: 0, height: 36, borderRadius: 10, border: `1.5px dashed ${busy ? PC.field : "#94A3B8"}`, background: "#FFFFFF", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", fontSize: 13, fontWeight: 700, color: fileName ? PC.t1 : PC.t3, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                  <span style={{ minWidth: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={fileName}>{fileName || "Chọn file sao lưu (.json)…"}</span>
                  <span style={{ fontSize: 12, color: PC.softFg, fontWeight: 800, flexShrink: 0 }}>Chọn file</span>
                  <input data-testid="pc-backup-file" type="file" accept=".json,application/json" disabled={busy} onChange={onFile}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: busy ? "default" : "pointer" }} />
                </label>
                {restoreMeta && <Btn kind="blue" disabled={busy || selected.size === 0} onClick={doRestore} testid="pc-backup-restore">{progress === "restore" ? "Đang khôi phục…" : `Khôi phục ${selected.size} bảng`}</Btn>}
              </div>
              {!restoreMeta && !fileErr && <span style={{ fontSize: 12, color: PC.t4, lineHeight: 1.5 }}>Chọn file sao lưu JSON → chọn bảng cần khôi phục → gộp vào dữ liệu hiện tại.</span>}
              {fileErr && <ErrorBox text={fileErr} />}
              {restoreErr && <ErrorBox text={`Lỗi khôi phục: ${restoreErr}`} />}
              {restoreMeta && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: PC.t3 }}>
                  <span data-testid="pc-backup-file-info" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    Bản sao lưu ngày {backupDay(restoreFile?.created_at)} · đã chọn {vnInt(selected.size)}/{vnInt(selectable.length)} bảng · {vnInt(selRows)} dòng
                  </span>
                  {results && <span data-testid="pc-backup-summary" style={{ display: "inline-flex", gap: 6 }}><Pill tone="green">{okN} thành công</Pill>{failN > 0 && <Pill tone="red">{failN} lỗi</Pill>}</span>}
                  <Btn kind="light" style={{ height: 28, padding: "0 10px", fontSize: 12 }} onClick={toggleAll} disabled={busy || selectable.length === 0} testid="pc-backup-all">{allOn ? "Bỏ chọn tất cả" : "Chọn tất cả"}</Btn>
                </div>
              )}
            </div>
            {restoreMeta && (<>
              <div style={{ ...headRow(R_COLS), borderRadius: 0, borderTop: `1px solid ${PC.headLine}` }}><span /><span>BẢNG</span><span>TÊN TRONG DB</span><span style={{ textAlign: "right" }}>SỐ DÒNG</span><span>KẾT QUẢ</span></div>
              {ALL_TABLES.map((t, i) => {
                const count = restoreMeta[t] || 0;
                const on = selected.has(t);
                const r = results?.[t];
                const can = count > 0 && !busy;
                const lastRow = i === ALL_TABLES.length - 1;
                return (
                  <button key={t} data-testid="pc-backup-table" data-table={t} aria-pressed={on} disabled={!can} onClick={() => toggle(t)} className={can ? "pc-row pc-click" : "pc-row"}
                    style={{ ...bodyRow(R_COLS, on && count > 0), minHeight: 40, cursor: can ? "pointer" : "default", opacity: count === 0 ? 0.45 : 1, borderBottom: lastRow ? "none" : bodyRow(R_COLS).borderBottom, borderRadius: lastRow ? "0 0 14px 14px" : 0 }}>
                    <Box on={on} disabled={count === 0} />
                    <span style={{ ...cell, fontWeight: on ? 700 : 500 }}>{TABLE_LABELS[t] || t}</span>
                    <span style={{ ...cell, color: PC.t3, fontSize: 12 }}>{t}</span>
                    <span style={{ ...cell, textAlign: "right" }}>{vnInt(count)}</span>
                    <span style={cell} title={r && !r.success ? r.error : ""}>
                      {r && <span data-testid="pc-backup-result">{r.success ? <Pill tone="green">{vnInt(r.count)} dòng</Pill> : <span style={{ color: PC.danger, fontWeight: 700, fontSize: 12 }}>Lỗi: {r.error}</span>}</span>}
                    </span>
                  </button>
                );
              })}
            </>)}
          </Card>
        </div>
      </div>
    </>
  );
}
