import { useState } from "react";
import { C, card, redBtn } from "../theme";

const ALL_TABLES = [
  "profiles", "meal_logs", "daily_logs", "weekly_templates", "weekly_bundles",
  "weight_logs", "food_cache", "food_cache_pending", "food_overrides",
  "ai_usage_log", "ai_chat_history", "ai_menu_cache",
  "app_settings", "subscription_settings", "orders",
  "notifications", "notification_batches", "push_subscriptions",
  "user_feedback", "feature_ratings", "admin_audit_log", "admin_stats_snapshots", "client_errors",
];

const TABLE_LABELS = {
  profiles: "👤 Hồ sơ người dùng", meal_logs: "🍽 Bữa ăn", daily_logs: "📅 Nhật ký ngày",
  weekly_templates: "📋 Mẫu tuần", weekly_bundles: "📦 Gói tuần", weight_logs: "⚖️ Cân nặng",
  food_cache: "🗄 Food cache", food_cache_pending: "🗄 Food cache pending", food_overrides: "🗄 Food overrides",
  ai_usage_log: "🤖 AI usage log", ai_chat_history: "💬 AI chat history", ai_menu_cache: "📝 AI menu cache",
  app_settings: "⚙️ Cài đặt app", subscription_settings: "💎 Cài đặt gói", orders: "🛒 Đơn hàng",
  notifications: "🔔 Thông báo", notification_batches: "📨 Batch thông báo", push_subscriptions: "📲 Push đăng ký",
  user_feedback: "💬 Phản hồi", feature_ratings: "⭐ Đánh giá", admin_audit_log: "📜 Audit log",
  admin_stats_snapshots: "📊 Stats snapshots", client_errors: "🐛 Client errors",
};

export default function BackupTab({ authFetch }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [meta, setMeta] = useState(null); // { table: rowCount }
  const [restoreFile, setRestoreFile] = useState(null); // parsed JSON
  const [restoreMeta, setRestoreMeta] = useState(null);
  const [selectedTables, setSelectedTables] = useState(new Set());
  const [restoreResults, setRestoreResults] = useState(null);
  const [progress, setProgress] = useState(null); // "backup" | "restore" | null

  const callEdge = async (body) => {
    const res = await authFetch("backup-restore", body);
    return res;
  };

  // ===== SAO LƯU =====
  const doBackup = async () => {
    setLoading(true); setStatus(null); setProgress("backup");
    try {
      const res = await callEdge({ action: "backup" });
      if (res.error) throw new Error(res.error);
      // Download file
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url; a.download = `fipilot_backup_${date}.json`; a.click();
      URL.revokeObjectURL(url);
      setMeta(res.meta);
      setStatus({ ok: true, msg: `✅ Sao lưu thành công! ${Object.values(res.meta).reduce((a, b) => a + b, 0)} rows — ${ALL_TABLES.length} bảng` });
    } catch (e) {
      setStatus({ ok: false, msg: `❌ Lỗi: ${e.message}` });
    }
    setLoading(false); setProgress(null);
  };

  // ===== CHỌN FILE KHÔI PHỤC =====
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreResults(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (!json.backup || !json.meta) throw new Error("File không đúng format backup FipilotAI");
        setRestoreFile(json);
        setRestoreMeta(json.meta);
        setSelectedTables(new Set(Object.keys(json.meta).filter(t => (json.meta[t] || 0) > 0)));
        setStatus({ ok: true, msg: `📁 Đã chọn file — backup ngày ${json.created_at?.slice(0, 10) || "?"}` });
      } catch (err) {
        setStatus({ ok: false, msg: `❌ File không hợp lệ: ${err.message}` });
        setRestoreFile(null); setRestoreMeta(null);
      }
    };
    reader.readAsText(file);
  };

  const toggleTable = (t) => {
    const s = new Set(selectedTables);
    s.has(t) ? s.delete(t) : s.add(t);
    setSelectedTables(s);
  };
  const toggleAll = () => {
    if (selectedTables.size === ALL_TABLES.length) setSelectedTables(new Set());
    else setSelectedTables(new Set(ALL_TABLES.filter(t => (restoreMeta?.[t] || 0) > 0)));
  };

  // ===== KHÔI PHỤC =====
  const doRestore = async () => {
    if (!restoreFile || selectedTables.size === 0) return;
    if (!confirm(`Khôi phục ${selectedTables.size} bảng? Data sẽ được MERGE (có thì update, chưa có thì thêm, không xoá data cũ).`)) return;
    setLoading(true); setStatus(null); setProgress("restore"); setRestoreResults(null);
    try {
      const tables = [...selectedTables];
      const data = {};
      for (const t of tables) data[t] = restoreFile.backup[t] || [];
      const res = await callEdge({ action: "restore", tables, data });
      if (res.error) throw new Error(res.error);
      setRestoreResults(res.results);
      const ok = Object.values(res.results).filter(r => r.success).length;
      const fail = Object.values(res.results).filter(r => !r.success).length;
      setStatus({ ok: fail === 0, msg: `${fail === 0 ? "✅" : "⚠️"} Khôi phục xong: ${ok} bảng thành công${fail > 0 ? `, ${fail} bảng lỗi` : ""}` });
    } catch (e) {
      setStatus({ ok: false, msg: `❌ Lỗi: ${e.message}` });
    }
    setLoading(false); setProgress(null);
  };

  const inp = { padding: "8px 12px", fontSize: 13, borderRadius: 8, border: `1.5px solid ${C.border}`, fontFamily: "inherit", width: "100%" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>💾 Sao lưu & Khôi phục</div>
        <div style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Sao lưu toàn bộ dữ liệu ra file JSON. Khôi phục bằng merge (không xoá data cũ).</div>
      </div>

      {/* Status */}
      {status && <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: status.ok ? "#F0FDF4" : "#FEF2F2", color: status.ok ? "#15803D" : "#B91C1C", border: `1px solid ${status.ok ? "#BBF7D0" : "#FECACA"}` }}>{status.msg}</div>}

      {/* Sao lưu */}
      <div style={{ ...card, padding: "16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, marginBottom: 12 }}>📥 Sao lưu dữ liệu</div>
        <button onClick={doBackup} disabled={loading} style={{ ...redBtn, width: "100%", background: loading ? "#94A3B8" : "linear-gradient(135deg,#3B82F6,#1D4ED8)", opacity: loading ? 0.7 : 1 }}>
          {progress === "backup" ? "⏳ Đang sao lưu..." : "💾 Sao lưu toàn bộ (JSON)"}
        </button>
        {meta && <div style={{ marginTop: 12, fontSize: 11, color: C.t3, lineHeight: 1.8 }}>
          {ALL_TABLES.map(t => <span key={t} style={{ display: "inline-block", padding: "2px 8px", margin: "2px 4px 2px 0", background: "#F1F5F9", borderRadius: 6 }}>{TABLE_LABELS[t] || t}: <b>{meta[t] || 0}</b></span>)}
        </div>}
      </div>

      {/* Khôi phục */}
      <div style={{ ...card, padding: "16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.t1, marginBottom: 12 }}>📤 Khôi phục dữ liệu</div>
        <div style={{ fontSize: 12, color: C.t3, marginBottom: 10 }}>Chọn file backup JSON → chọn bảng cần khôi phục → merge vào DB hiện tại.</div>
        <input type="file" accept=".json" onChange={handleFileSelect} style={inp} />

        {restoreMeta && <>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>Chọn bảng khôi phục:</div>
            <button onClick={toggleAll} style={{ background: "none", border: "none", color: "#3B82F6", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {selectedTables.size === ALL_TABLES.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {ALL_TABLES.map(t => {
              const count = restoreMeta[t] || 0;
              const checked = selectedTables.has(t);
              const result = restoreResults?.[t];
              return (
                <div key={t} onClick={() => count > 0 && toggleTable(t)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: checked ? "#EFF6FF" : "#F8FAFC", border: `1px solid ${checked ? "#93C5FD" : C.border}`, cursor: count > 0 ? "pointer" : "default", opacity: count === 0 ? 0.4 : 1 }}>
                  <input type="checkbox" checked={checked} readOnly style={{ accentColor: "#3B82F6" }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.t1 }}>{TABLE_LABELS[t] || t}</span>
                  <span style={{ fontSize: 11, color: C.t3 }}>{count} rows</span>
                  {result && <span style={{ fontSize: 10, fontWeight: 700, color: result.success ? "#16A34A" : "#EF4444" }}>{result.success ? `✅ ${result.count}` : `❌ ${result.error}`}</span>}
                </div>
              );
            })}
          </div>
          <button onClick={doRestore} disabled={loading || selectedTables.size === 0} style={{ ...redBtn, width: "100%", marginTop: 14, background: loading ? "#94A3B8" : selectedTables.size === 0 ? "#CBD5E1" : "linear-gradient(135deg,#F97316,#EA580C)", opacity: loading ? 0.7 : 1 }}>
            {progress === "restore" ? "⏳ Đang khôi phục..." : `🔄 Khôi phục ${selectedTables.size} bảng (merge)`}
          </button>
        </>}
      </div>
    </div>
  );
}
