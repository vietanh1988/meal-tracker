// Quản trị › Sao lưu & khôi phục (bản vẽ 108, nền tối, chỉ Super Admin). Thay tab cũ src/adminTabs/BackupTab.jsx — cùng Edge Function "backup-restore":
//  - Sao lưu: { action: "backup" } → tải file fipilot_backup_<ngày VN>.json (toàn bộ 23 bảng)
//  - Khôi phục gộp: chọn file → chọn bảng (bảng 0 dòng mờ, không chọn được) → hỏi bằng hộp thoại app
//    → { action: "restore", tables, data } → từng bảng hiện ✓ số dòng / lỗi
//  - "Lần gần nhất": chỉ có sau khi sao lưu trong phiên này (bản cũ không lưu lịch sử sao lưu ở đâu cả)
import { useState } from "react";
import { DK } from "../../theme";
import { SubPage, Icon } from "../ui";
import { Sec, Card, Btn, ReadOnly, Empty, useConfirm } from "./adminUI";
import { authFetch } from "../../lib/authFetch";
import { todayVN, toVNDate, fmtVN } from "../../lib/dateVN";

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
  food_cache: "Food cache", food_cache_pending: "Food cache pending", food_overrides: "Food overrides",
  ai_usage_log: "AI usage log", ai_chat_history: "AI chat history", ai_menu_cache: "AI menu cache",
  app_settings: "Cài đặt app", subscription_settings: "Cài đặt gói", orders: "Đơn hàng",
  notifications: "Thông báo", notification_batches: "Batch thông báo", push_subscriptions: "Push đăng ký",
  user_feedback: "Phản hồi", feature_ratings: "Đánh giá", admin_audit_log: "Audit log",
  admin_stats_snapshots: "Stats snapshots", client_errors: "Client errors",
};
const COLLAPSED = 6;
const vn = (n) => (Number(n) || 0).toLocaleString("vi-VN");
const sumRows = (meta) => Object.values(meta || {}).reduce((a, b) => a + (Number(b) || 0), 0);
// created_at (ISO) → "dd/mm/yyyy" theo giờ VN
const backupDay = (iso) => {
  if (!iso) return "?";
  const d = new Date(iso);
  return isNaN(d) ? String(iso).slice(0, 10) : fmtVN(toVNDate(d), true);
};

const saveIcon = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></svg>;
const fileIcon = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h5" /></svg>;

const Check = ({ on }) => on
  ? <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6, background: "#FFFFFF", color: "#0040E0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.check(14, 3)}</span>
  : <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6, border: "2px solid rgba(255,255,255,0.35)", boxSizing: "border-box", flexShrink: 0 }} />;

export function BackupScreen({ onBack, isSuperAdmin, showToast }) {
  const toast = (text) => showToast?.({ text });
  const [confirm, dialog] = useConfirm();
  const [progress, setProgress] = useState(null); // "backup" | "restore" | null
  const [last, setLast] = useState(null); // { day, rows } — lần sao lưu trong phiên này
  const [backupErr, setBackupErr] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileErr, setFileErr] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreMeta, setRestoreMeta] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [results, setResults] = useState(null);
  const [restoreErr, setRestoreErr] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const busy = !!progress;

  // ===== SAO LƯU =====
  const doBackup = async () => {
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
      setLast({ day, rows });
      toast(`Đã sao lưu ${vn(rows)} dòng — ${ALL_TABLES.length} bảng`);
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
        setExpanded(false);
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
  const toggle = (t) => setSelected((prev) => { const s = new Set(prev); s.has(t) ? s.delete(t) : s.add(t); return s; });
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(selectable));

  // ===== KHÔI PHỤC =====
  const doRestore = async () => {
    if (!restoreFile || selected.size === 0) return;
    const ok = await confirm({
      title: `Khôi phục ${selected.size} bảng?`,
      text: "Dữ liệu sẽ được GỘP: có thì cập nhật, chưa có thì thêm, không xoá dữ liệu cũ.",
      ok: "Khôi phục",
    });
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
      setExpanded(true);
      const okN = Object.values(r).filter((x) => x.success).length;
      const failN = Object.values(r).filter((x) => !x.success).length;
      toast(failN === 0 ? `Đã khôi phục ${okN} bảng` : `Khôi phục xong: ${okN} bảng thành công, ${failN} bảng lỗi`);
    } catch (e) {
      setRestoreErr(e.message);
      toast("Lỗi khôi phục: " + e.message);
    }
    setProgress(null);
  };

  const shownTables = expanded ? ALL_TABLES : ALL_TABLES.slice(0, COLLAPSED);
  const hiddenN = ALL_TABLES.length - shownTables.length;

  return (
    <SubPage dark title="Sao lưu & khôi phục" subtitle="Chỉ Super Admin" onBack={onBack}>
      <div data-testid="adm-backup" style={{ paddingBottom: 32 }}>
        {!isSuperAdmin ? (<>
          <ReadOnly />
          <Empty testid="adm-backup-denied">Sao lưu & khôi phục chỉ dành cho Super Admin.</Empty>
        </>) : (<>
          <Sec>Sao lưu</Sec>
          <Card style={{ borderRadius: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0" }}>
              <span style={{ fontSize: 13, color: DK.t2, lineHeight: 1.5, overflowWrap: "anywhere" }}>Tải toàn bộ {ALL_TABLES.length} bảng ra 1 file JSON (fipilot_backup_{todayVN()}.json).</span>
              <Btn kind="blue" h={48} flex="none" disabled={busy} onClick={doBackup} testid="adm-backup-run" style={{ width: "100%" }}>
                {saveIcon}{progress === "backup" ? "Đang sao lưu…" : "Sao lưu toàn bộ"}
              </Btn>
              {last && <span data-testid="adm-backup-last" style={{ fontSize: 12, color: DK.green }}>✓ Lần gần nhất: {fmtVN(last.day, true)} · {vn(last.rows)} dòng</span>}
              {backupErr && <span style={{ fontSize: 12, color: DK.red, overflowWrap: "anywhere" }}>Lỗi: {backupErr}</span>}
            </div>
          </Card>

          <Sec>Khôi phục (gộp, không xoá dữ liệu cũ)</Sec>
          <Card style={{ borderRadius: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: restoreMeta ? "14px 0 6px 0" : "14px 0" }}>
              <label className="tap" style={{ position: "relative", height: 52, borderRadius: 14, border: "1.5px dashed rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 700, padding: "0 12px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1, minWidth: 0 }}>
                {fileIcon}
                <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName || "Chọn file sao lưu (.json)"}</span>
                <input data-testid="adm-backup-file" type="file" accept=".json,application/json" disabled={busy} onChange={onFile}
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} />
              </label>
              {!restoreMeta && !fileErr && <span style={{ fontSize: 12, color: DK.t3, lineHeight: 1.5 }}>Chọn file sao lưu JSON → chọn bảng cần khôi phục → gộp vào dữ liệu hiện tại.</span>}
              {fileErr && <span data-testid="adm-backup-file-err" style={{ fontSize: 12, color: DK.red, overflowWrap: "anywhere" }}>{fileErr}</span>}
              {restoreMeta && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12, color: DK.t3 }}>
                  <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Bản sao lưu ngày {backupDay(restoreFile?.created_at)} · chọn bảng</span>
                  <button data-testid="adm-backup-all" onClick={toggleAll} disabled={busy || selectable.length === 0}
                    style={{ border: "none", background: "transparent", padding: "6px 0", color: DK.link, fontFamily: "inherit", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {allOn ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
              )}
            </div>
            {restoreMeta && (<>
              {shownTables.map((t, i) => {
                const count = restoreMeta[t] || 0;
                const on = selected.has(t);
                const r = results?.[t];
                const can = count > 0 && !busy;
                return (
                  <button key={t} data-testid="adm-backup-table" data-table={t} aria-pressed={on} disabled={!can} onClick={() => toggle(t)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 46, padding: "6px 0", border: "none", borderBottom: i === shownTables.length - 1 && hiddenN === 0 ? "none" : `1px solid ${DK.line}`, background: "transparent", color: DK.t1, fontFamily: "inherit", textAlign: "left", opacity: count === 0 ? 0.4 : 1, cursor: can ? "pointer" : "default" }}>
                    <Check on={on} />
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TABLE_LABELS[t] || t}</span>
                      {r && <span data-testid="adm-backup-result" style={{ fontSize: 12, fontWeight: 700, color: r.success ? DK.green : DK.red, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.success ? `✓ ${vn(r.count)} dòng` : `Lỗi: ${r.error}`}</span>}
                    </span>
                    <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", flexShrink: 0 }}>{vn(count)} dòng</span>
                  </button>
                );
              })}
              {hiddenN > 0 ? (
                <button data-testid="adm-backup-expand" onClick={() => setExpanded(true)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 0 12px 0", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, color: DK.t3 }}>
                  … {hiddenN} bảng khác
                </button>
              ) : <span style={{ display: "block", height: 6 }} />}
            </>)}
          </Card>

          {restoreErr && <div style={{ margin: "10px 12px 0 12px", fontSize: 12, color: DK.red, overflowWrap: "anywhere" }}>Lỗi: {restoreErr}</div>}
          {restoreMeta && (
            <div style={{ margin: "14px 12px 0 12px", display: "flex" }}>
              <Btn kind="blue" h={50} disabled={busy || selected.size === 0} onClick={doRestore} testid="adm-backup-restore">
                {progress === "restore" ? "Đang khôi phục…" : `Khôi phục ${selected.size} bảng`}
              </Btn>
            </div>
          )}
        </>)}
      </div>
      {dialog}
    </SubPage>
  );
}

export default BackupScreen;
