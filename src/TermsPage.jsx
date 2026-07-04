import { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { C, card } from "./theme";

const TABS = [
  { key: "tos", label: "Điều khoản dịch vụ" },
  { key: "privacy", label: "Chính sách bảo mật" },
  { key: "refund", label: "Chính sách hoàn tiền" },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const stripEmptyParagraphs = (html) => (html || "").replace(/<p>(\s*<br\s*\/?>\s*)?<\/p>/g, "");

// Trang Điều khoản dịch vụ / Chính sách bảo mật / Chính sách hoàn tiền.
// Nội dung lưu trong appSettings.terms_content (JSON: {tos, privacy, refund} — mỗi field là HTML từ Quill),
// dùng chung cơ chế saveSetting() như AboutPage.jsx, không cần bảng DB riêng.
// Soạn thảo (Quill) CHỈ hiện cho Admin trên PC — mobile chỉ xem, kể cả Admin.
export function TermsPage({ appSettings, isAdmin, saveSetting, mob }) {
  const [activeTab, setActiveTab] = useState("tos");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const content = (() => {
    try { return appSettings?.terms_content ? JSON.parse(appSettings.terms_content) : {}; } catch (e) { return {}; }
  })();

  useEffect(() => { setEditing(false); }, [activeTab]);

  const startEdit = () => {
    setDraft(content[activeTab] || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const next = { ...content, [activeTab]: draft };
    try { await saveSetting("terms_content", JSON.stringify(next)); } catch (e) { console.error(e); alert("Lưu thất bại"); setSaving(false); return; }
    setEditing(false);
    setSaving(false);
  };

  const activeLabel = TABS.find(t => t.key === activeTab)?.label || "";

  return (
    <div style={{ ...card, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginBottom: 16 }}>Điều khoản và chính sách</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none", borderBottom: `1.5px solid ${C.border}`, paddingBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
            background: activeTab === t.key ? C.primary : C.surface, color: activeTab === t.key ? "#fff" : C.t2,
          }}>{t.label}</button>
        ))}
      </div>

      {!editing && (
        <>
          {content[activeTab]
            ? <>
                <style>{`.terms-content p{margin:0 0 12px;}.terms-content h1{font-size:20px;margin:18px 0 10px;font-weight:800;}.terms-content h2{font-size:17px;margin:16px 0 8px;font-weight:800;}.terms-content ul,.terms-content ol{margin:0 0 12px;padding-left:20px;}.terms-content li{margin-bottom:4px;}`}</style>
                <div className="terms-content" style={{ fontSize: 14, color: C.t1, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: stripEmptyParagraphs(content[activeTab]) }} />
              </>
            : <div style={{ fontSize: 13, color: C.t3, textAlign: "center", padding: "40px 0" }}>Nội dung đang được cập nhật.</div>}

          {isAdmin && !mob && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button onClick={startEdit} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer", fontFamily: "inherit" }}>✏️ Chỉnh sửa {activeLabel}</button>
            </div>
          )}
          {isAdmin && mob && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, padding: "10px 14px", background: C.surface, borderRadius: 10 }}>
              <span style={{ fontSize: 15 }}>💻</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>Vào máy tính để chỉnh sửa nội dung này</span>
            </div>
          )}
        </>
      )}

      {editing && !mob && (
        <div>
          <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: `1.5px solid ${C.primary}`, marginBottom: 14 }}>
            <style>{`.ql-editor{min-height:220px;font-size:14px;}`}</style>
            <ReactQuill theme="snow" value={draft} onChange={setDraft} modules={QUILL_MODULES} style={{ minHeight: 260 }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer", fontFamily: "inherit" }}>Hủy</button>
            <button onClick={saveEdit} disabled={saving} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#15803D,#166534)", color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>{saving ? "Đang lưu..." : "💾 Lưu"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
