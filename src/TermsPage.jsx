import { useState, useEffect } from "react";
import { appAlert, appConfirm } from "./lib/dialog";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { C, card } from "./theme";

const DEFAULT_PAGES = [
  { id: "tos", label: "Điều khoản dịch vụ", html: "" },
  { id: "privacy", label: "Chính sách bảo mật", html: "" },
  { id: "refund", label: "Chính sách hoàn tiền", html: "" },
];

const PAGE_ICONS = { tos: "📄", privacy: "🔒", refund: "💰", privacy_policy: "👁️", disclaimer: "🛡️", ai_policy: "🤖", shipping: "🚚", payment: "💳", cookie: "🍪" };
const getIcon = (id, label) => PAGE_ICONS[id] || (label.match(/bảo mật|privacy/i) ? "🔒" : label.match(/hoàn|refund/i) ? "💰" : label.match(/AI/i) ? "🤖" : label.match(/miễn trừ|disclaimer/i) ? "🛡️" : label.match(/riêng tư/i) ? "👁️" : label.match(/thanh toán|payment/i) ? "💳" : "📋");

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

export const stripEmptyParagraphs = (html) => (html || "").replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/g, "");

// Đọc appSettings.terms_content, tự chuyển định dạng cũ ({tos,privacy,refund})
// sang định dạng mới (mảng pages động) nếu gặp — không mất dữ liệu cũ đã lưu.
export function parseContent(appSettings) {
  try {
    const raw = appSettings?.terms_content ? JSON.parse(appSettings.terms_content) : null;
    if (raw && Array.isArray(raw.pages) && raw.pages.length > 0) return raw.pages;
    if (raw && (raw.tos || raw.privacy || raw.refund)) {
      return [
        { id: "tos", label: "Điều khoản dịch vụ", html: raw.tos || "" },
        { id: "privacy", label: "Chính sách bảo mật", html: raw.privacy || "" },
        { id: "refund", label: "Chính sách hoàn tiền", html: raw.refund || "" },
      ];
    }
    return DEFAULT_PAGES;
  } catch (e) { return DEFAULT_PAGES; }
}

// Trang Điều khoản / Chính sách — danh sách trang ĐỘNG (thêm/xoá tuỳ ý), lưu trong
// appSettings.terms_content (JSON: {pages:[{id,label,html}]}), dùng chung cơ chế
// saveSetting() như AboutPage.jsx, không cần bảng DB riêng.
// Soạn thảo (Quill) CHỈ hiện cho Admin trên PC — mobile chỉ xem, kể cả Admin.
export function TermsPage({ appSettings, isAdmin, saveSetting, mob }) {
  const pages = parseContent(appSettings);
  const [activeId, setActiveId] = useState(pages[0]?.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [htmlMode, setHtmlMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pages.find(p => p.id === activeId) && pages.length > 0) setActiveId(pages[0].id);
  }, [appSettings?.terms_content]);

  useEffect(() => { setEditing(false); }, [activeId]);

  const activePage = pages.find(p => p.id === activeId);

  const savePages = async (nextPages) => {
    try { await saveSetting("terms_content", JSON.stringify({ pages: nextPages })); } catch (e) { console.error(e); appAlert("Lưu thất bại"); }
  };

  const startEdit = () => {
    setDraft(activePage?.html || "");
    setHtmlMode(false);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const next = pages.map(p => p.id === activeId ? { ...p, html: draft } : p);
    await savePages(next);
    setEditing(false);
    setSaving(false);
  };

  const addPage = async () => {
    const label = window.prompt("Tên trang mới (VD: Chính sách vận chuyển):");
    if (!label || !label.trim()) return;
    const newPage = { id: `page_${Date.now()}`, label: label.trim(), html: "" };
    const next = [...pages, newPage];
    await savePages(next);
    setActiveId(newPage.id);
  };

  const removePage = async (id, label) => {
    if (pages.length <= 1) { appAlert("Phải giữ lại ít nhất 1 trang."); return; }
    if (!await appConfirm(`Xóa trang "${label}"? Không thể hoàn tác.`, { danger: true })) return;
    const next = pages.filter(p => p.id !== id);
    await savePages(next);
    if (activeId === id) setActiveId(next[0]?.id);
  };

  const [managing, setManaging] = useState(false);

  const movePage = async (idx, dir) => {
    const next = [...pages];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    await savePages(next);
  };

  return (
    <div style={{ ...card, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.t1 }}>Điều khoản và chính sách</div>
        {isAdmin && !mob && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setManaging(v => !v)} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: managing ? C.primaryBg : "#fff", color: managing ? C.primary : C.t2, cursor: "pointer", fontFamily: "inherit" }}>{managing ? "✓ Xong" : "⚙ Quản lý"}</button>
            <button onClick={addPage} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.primary, cursor: "pointer", fontFamily: "inherit" }}>+ Thêm trang</button>
          </div>
        )}
      </div>

      {/* Manage mode: reorder + delete */}
      {managing && isAdmin && !mob && (
        <div style={{ marginBottom: 16, padding: 12, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 8 }}>Kéo thứ tự / xóa trang:</div>
          {pages.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < pages.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button onClick={() => movePage(i, -1)} disabled={i === 0} style={{ width: 22, height: 16, padding: 0, border: "none", background: "none", cursor: i === 0 ? "default" : "pointer", fontSize: 10, color: i === 0 ? C.border : C.t2, fontFamily: "inherit" }}>▲</button>
                <button onClick={() => movePage(i, 1)} disabled={i === pages.length - 1} style={{ width: 22, height: 16, padding: 0, border: "none", background: "none", cursor: i === pages.length - 1 ? "default" : "pointer", fontSize: 10, color: i === pages.length - 1 ? C.border : C.t2, fontFamily: "inherit" }}>▼</button>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.t1, flex: 1 }}>{p.label}</span>
              {pages.length > 1 && <button onClick={() => removePage(p.id, p.label)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.red}`, background: "#fff", color: C.red, cursor: "pointer", fontFamily: "inherit" }}>Xóa</button>}
            </div>
          ))}
        </div>
      )}

      {/* Mobile: accordion — PC: underline tabs */}
      {mob ? (
        <>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            {pages.map((p, i) => {
              const active = activeId === p.id;
              const icon = getIcon(p.id, p.label);
              return <div key={p.id}>
                {i > 0 && <div style={{ borderTop: `1px solid ${C.border}` }} />}
                <button onClick={() => setActiveId(active ? null : p.id)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", width: "100%", fontSize: 13, fontWeight: active ? 700 : 500, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  background: active ? "rgba(0,122,255,0.06)" : "#fff", color: active ? C.primary : C.t2, borderLeft: active ? `3px solid ${C.primary}` : "3px solid transparent",
                }}>
                  <span>{icon} {p.label}</span>
                  <span style={{ fontSize: 12, color: active ? C.primary : C.border, transition: "transform .2s", display: "inline-block", transform: active ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {active && <div style={{ padding: "0 14px 14px", borderLeft: `3px solid ${C.primary}`, background: "rgba(0,122,255,0.02)" }}>
                  {p.html ? <>
                    <style>{`.terms-content p{margin:0 0 12px;}.terms-content h1{font-size:18px;margin:14px 0 8px;font-weight:800;}.terms-content h2{font-size:15px;margin:12px 0 6px;font-weight:800;}.terms-content ul,.terms-content ol{margin:0 0 12px;padding-left:20px;}.terms-content li{margin-bottom:4px;}`}</style>
                    <div className="terms-content" style={{ fontSize: 13, color: C.t1, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: stripEmptyParagraphs(p.html) }} />
                  </> : <div style={{ fontSize: 13, color: C.t3, padding: "16px 0", textAlign: "center" }}>Nội dung đang được cập nhật.</div>}
                </div>}
              </div>;
            })}
          </div>
          {isAdmin && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", background: C.surface, borderRadius: 10 }}>
            <span style={{ fontSize: 15 }}>💻</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>Vào máy tính để chỉnh sửa nội dung này</span>
          </div>}
        </>
      ) : (<>
        <div className="terms-tabs" style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.border}`, marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <style>{`.terms-tabs::-webkit-scrollbar{height:0;}.terms-tabs{scrollbar-width:none;}`}</style>
          {pages.map(p => (
            <button key={p.id} onClick={() => setActiveId(p.id)} style={{
              padding: "10px 16px", fontSize: 13, fontWeight: activeId === p.id ? 700 : 500, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s",
              background: "transparent", color: activeId === p.id ? C.primary : C.t2, borderBottom: activeId === p.id ? `2.5px solid ${C.primary}` : "2.5px solid transparent", marginBottom: -2,
            }}>{getIcon(p.id, p.label)} {p.label}</button>
          ))}
        </div>

      {!editing && (
        <>
          {activePage?.html
            ? <>
                <style>{`.terms-content p{margin:0 0 12px;}.terms-content h1{font-size:20px;margin:18px 0 10px;font-weight:800;}.terms-content h2{font-size:17px;margin:16px 0 8px;font-weight:800;}.terms-content ul,.terms-content ol{margin:0 0 12px;padding-left:20px;}.terms-content li{margin-bottom:4px;}.terms-content{word-wrap:break-word;overflow-wrap:break-word;overflow:hidden;}`}</style>
                <div className="terms-content" style={{ fontSize: 14, color: C.t1, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: stripEmptyParagraphs(activePage.html) }} />
              </>
            : <div style={{ fontSize: 13, color: C.t3, textAlign: "center", padding: "40px 0" }}>Nội dung đang được cập nhật.</div>}

          {isAdmin && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
              <button onClick={startEdit} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer", fontFamily: "inherit" }}>✏️ Chỉnh sửa {activePage?.label}</button>
            </div>
          )}
        </>
      )}

      {editing && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => setHtmlMode(v => !v)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: `1px solid ${C.border}`, background: htmlMode ? C.blueBg : "#fff", color: htmlMode ? C.primary : C.t2, cursor: "pointer", fontFamily: "inherit" }}>{htmlMode ? "🎨 Chuyển sang trực quan" : "🔤 Chuyển sang mã HTML"}</button>
          </div>
          {htmlMode ? (
            <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Dán mã HTML từ WordPress vào đây..." style={{ width: "100%", minHeight: 300, boxSizing: "border-box", padding: 14, fontSize: 12, fontFamily: "monospace", border: `1.5px solid ${C.primary}`, borderRadius: 10, color: C.t1, resize: "vertical", marginBottom: 14 }} />
          ) : (
            <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: `1.5px solid ${C.primary}`, marginBottom: 14 }}>
              <style>{`.ql-editor{min-height:220px;font-size:14px;}`}</style>
              <ReactQuill theme="snow" value={draft} onChange={setDraft} modules={QUILL_MODULES} style={{ minHeight: 260 }} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer", fontFamily: "inherit" }}>Hủy</button>
            <button onClick={saveEdit} disabled={saving} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#15803D,#166534)", color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>{saving ? "Đang lưu..." : "💾 Lưu"}</button>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
